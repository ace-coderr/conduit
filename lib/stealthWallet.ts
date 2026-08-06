import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createWalletClient, createPublicClient, http, formatEther, parseEther } from "viem";
import { arcTestnet } from "./arcChain";
import { FEE_CONFIG, calculateFeeOnTop } from "./fees";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const secret = process.env.STEALTH_SECRET;
  if (!secret) throw new Error("STEALTH_SECRET environment variable is not set.");
  return scryptSync(secret, "arcwave-salt", 32);
}

export function encryptPrivateKey(privateKey: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(privateKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decryptPrivateKey(encryptedData: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encrypted] = encryptedData.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

function formatPrivateKey(key: string): `0x${string}` {
  const cleaned = key.trim().replace(/\s/g, "");
  const stripped = cleaned.startsWith("0x") || cleaned.startsWith("0X")
    ? cleaned.slice(2) : cleaned;
  return `0x${stripped}` as `0x${string}`;
}

export function generateStealthWallet(): {
  address: string;
  encryptedPrivateKey: string;
} {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return {
    address: account.address.toLowerCase(),
    encryptedPrivateKey: encryptPrivateKey(privateKey),
  };
}

/**
 * Moves a stealth-link payment out of the one-time stealth wallet: the full
 * `paymentAmount` to the recipient, then the platform fee to the collector.
 *
 * The payer signs a single transaction for amount + fee, so both legs are
 * funded from that one balance and the recipient still receives the full
 * headline amount. Links paid before that change hold only `paymentAmount` —
 * there the fee leg is skipped rather than taken out of the recipient's share.
 */
export async function forwardFunds(
  encryptedPrivateKey: string,
  recipientAddress: string,
  paymentAmount: string
): Promise<{ success: boolean; txHash?: string; feeTxHash?: string; error?: string }> {
  try {
    const forwarderKey = process.env.FORWARDER_PRIVATE_KEY;
    if (!forwarderKey) return { success: false, error: "FORWARDER_PRIVATE_KEY not configured." };

    const rawPrivateKey = decryptPrivateKey(encryptedPrivateKey);
    const stealthPrivateKey = formatPrivateKey(rawPrivateKey);
    const stealthAccount = privateKeyToAccount(stealthPrivateKey);

    const forwarderPrivateKey = formatPrivateKey(forwarderKey);
    const forwarderAccount = privateKeyToAccount(forwarderPrivateKey);

    console.log(`[forward] Stealth: ${stealthAccount.address}`);
    console.log(`[forward] Recipient: ${recipientAddress}`);
    console.log(`[forward] Amount: ${paymentAmount} USDC`);

    const publicClient = createPublicClient({
      chain: arcTestnet,
      transport: http("https://rpc.testnet.arc.network"),
    });

    const forwarderClient = createWalletClient({
      account: forwarderAccount,
      chain: arcTestnet,
      transport: http("https://rpc.testnet.arc.network"),
    });

    const stealthClient = createWalletClient({
      account: stealthAccount,
      chain: arcTestnet,
      transport: http("https://rpc.testnet.arc.network"),
    });

    // Check stealth balance. Cross-chain payments land here a little after the
    // client reports success, so give a zero balance a few seconds to settle
    // before giving up — /api/recover re-runs anything that still misses.
    let stealthBalance = await publicClient.getBalance({ address: stealthAccount.address });
    for (let attempt = 0; attempt < 3 && stealthBalance === BigInt(0); attempt++) {
      await new Promise(r => setTimeout(r, 4000));
      stealthBalance = await publicClient.getBalance({ address: stealthAccount.address });
    }
    console.log(`[forward] Stealth balance: ${formatEther(stealthBalance)} USDC`);

    if (stealthBalance === BigInt(0)) {
      return { success: false, error: "Stealth wallet balance is 0 — payment not yet confirmed." };
    }

    // The payer covers the fee on top, so the stealth wallet should be holding
    // amount + fee. Only take the fee leg when that is actually true — on a
    // legacy balance the recipient's amount is never touched.
    const recipientWei = parseEther(paymentAmount);
    const { fee } = calculateFeeOnTop(paymentAmount);
    const feeWei = parseEther(fee);
    const collectFee = stealthBalance >= recipientWei + feeWei;

    if (!collectFee) {
      console.warn(`[forward] Balance covers the payment but not the ${fee} USDC fee — forwarding without the fee leg`);
    }

    // Fund stealth wallet with gas from forwarder — enough for every leg we send
    const gasPrice = await publicClient.getGasPrice();
    const gasLimit = BigInt(21000);
    const legs = collectFee ? BigInt(2) : BigInt(1);
    const gasFunding = gasPrice * gasLimit * BigInt(5) * legs;

    const fundTxHash = await forwarderClient.sendTransaction({
      to: stealthAccount.address,
      value: gasFunding,
    });
    await publicClient.waitForTransactionReceipt({ hash: fundTxHash, timeout: 20_000 });
    console.log(`[forward] Gas funded: ${fundTxHash}`);

    // Leg 1 — FULL amount to the recipient. The fee never comes out of this.
    const forwardTxHash = await stealthClient.sendTransaction({
      to: recipientAddress as `0x${string}`,
      value: recipientWei,
      gas: gasLimit,
      gasPrice,
    });

    await publicClient.waitForTransactionReceipt({ hash: forwardTxHash, timeout: 20_000 });
    console.log(`[forward] Forwarded full amount to recipient: ${forwardTxHash}`);

    // Leg 2 — platform fee. Best-effort: the recipient has already been paid,
    // so a failure here must not fail the forward.
    let feeTxHash: string | undefined;
    if (collectFee) {
      try {
        const hash = await stealthClient.sendTransaction({
          to: FEE_CONFIG.collectorAddress as `0x${string}`,
          value: feeWei,
          gas: gasLimit,
          gasPrice,
        });
        await publicClient.waitForTransactionReceipt({ hash, timeout: 20_000 });
        feeTxHash = hash;
        console.log(`[forward] Fee of ${fee} USDC collected: ${hash}`);
      } catch (feeErr: any) {
        console.error(`[forward] Fee leg failed (payment already forwarded): ${feeErr.message}`);
      }
    }

    return { success: true, txHash: forwardTxHash, feeTxHash };
  } catch (err: any) {
    console.error("[forwardFunds] Error:", err.message);
    return { success: false, error: err.message ?? "Forwarding failed" };
  }
}
