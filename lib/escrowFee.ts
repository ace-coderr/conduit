import { db } from "./db";
import { arcPublicClient } from "./arcClient";
import { transferFromWallet } from "./circle";
import { FEE_CONFIG, calculateFeeOnTop } from "./fees";
import { parseEther } from "viem";

/**
 * Sends the platform fee from an escrow's Circle wallet to the fee collector.
 *
 * The buyer signs one transaction for amount + fee into the escrow wallet, so
 * the fee is already sitting there — no second signature, and the seller's
 * `amount` is untouched at release.
 *
 * Safe to call more than once: it is idempotent on `feeTxHash`, and it re-reads
 * the funding transaction on-chain to confirm the buyer really covered the fee
 * before moving anything. If that check can't be made, the fee is left alone
 * rather than risking the seller's principal.
 */
export async function collectEscrowFee(
  escrowId: string
): Promise<{ collected: boolean; txHash?: string; reason?: string }> {
  const escrow = await db.escrowLink.findUnique({ where: { id: escrowId } });
  if (!escrow) return { collected: false, reason: "Escrow not found" };
  if (escrow.feeTxHash) return { collected: true, txHash: escrow.feeTxHash };
  if (!escrow.circleWalletId) return { collected: false, reason: "No Circle wallet" };
  if (!escrow.txHash) return { collected: false, reason: "Escrow not funded yet" };

  const { fee, total } = calculateFeeOnTop(escrow.amount);

  // Confirm on-chain that the funding transaction covered amount + fee.
  // Escrows paid before single-signature checkout only hold `amount`.
  try {
    const tx = await arcPublicClient.getTransaction({ hash: escrow.txHash as `0x${string}` });
    if (!tx || !tx.blockNumber) return { collected: false, reason: "Funding tx not confirmed" };
    if (tx.value < parseEther(total)) {
      return { collected: false, reason: `Funding tx covered ${escrow.amount} USDC without the fee` };
    }
  } catch (err: any) {
    return { collected: false, reason: `Could not verify funding tx: ${err?.message ?? "RPC error"}` };
  }

  const result = await transferFromWallet(escrow.circleWalletId, FEE_CONFIG.collectorAddress, fee);
  if (!result.success || !result.txHash) {
    console.error(`[escrow fee] Transfer failed for ${escrowId}: ${result.error}`);
    return { collected: false, reason: result.error ?? "Transfer failed" };
  }

  await db.escrowLink.update({ where: { id: escrowId }, data: { feeTxHash: result.txHash } });
  console.log(`[escrow fee] Collected ${fee} USDC for ${escrowId}: ${result.txHash}`);
  return { collected: true, txHash: result.txHash };
}
