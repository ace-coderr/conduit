import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transferFromWallet } from "@/lib/circle";
import { verifyAdminQuery } from "@/lib/adminAuth";
import { sendEscrowRefundedEmail } from "@/lib/email";
import { recordReputationEvent } from "@/lib/reputation";
import { fireWebhook } from "@/lib/webhooks";
import { notifyTelegram } from "@/lib/telegram";

export async function POST(req: NextRequest) {
  const { ok, error } = verifyAdminQuery(req);
  if (!ok) return NextResponse.json({ error }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const { escrowId } = body;
  if (!escrowId) return NextResponse.json({ error: "escrowId is required." }, { status: 400 });

  const escrow = await db.escrowLink.findUnique({ where: { id: escrowId } });
  if (!escrow) return NextResponse.json({ error: "Escrow not found." }, { status: 404 });

  if (escrow.status !== "DISPUTED") {
    return NextResponse.json({ error: "Can only refund disputed escrows." }, { status: 400 });
  }

  if (!escrow.buyerAddress) {
    return NextResponse.json({ error: "No buyer address found." }, { status: 400 });
  }

  if (escrow.releaseTxHash) {
    return NextResponse.json({ success: true, alreadyResolved: true });
  }

  if (!escrow.circleWalletId) {
    return NextResponse.json({ error: "No Circle wallet associated with this escrow." }, { status: 400 });
  }

  console.log(`[escrow refund] Refunding ${escrow.amount} USDC to buyer ${escrow.buyerAddress}`);

  const result = await transferFromWallet(escrow.circleWalletId, escrow.buyerAddress, escrow.amount);

  if (result.success && result.txHash) {
    await db.escrowLink.update({
      where: { id: escrowId },
      data: { status: "CANCELLED", releaseTxHash: result.txHash },
    });

    // Record reputation: a refund counts as a refunded escrow for the seller
    // (tracked, but does not lower trust score — a fair refund isn't the seller's fault)
    await recordReputationEvent(escrow.sellerAddress, "REFUNDED", escrow.amount);

    fireWebhook(escrow.sellerAddress, "escrow.refunded", {
      id: escrow.id, title: escrow.title, amount: escrow.amount,
      txHash: result.txHash, sellerAddress: escrow.sellerAddress, buyerAddress: escrow.buyerAddress ?? null,
    }).catch(() => { });
    notifyTelegram(escrow.sellerAddress, "escrow.refunded", { title: escrow.title, amount: escrow.amount, txHash: result.txHash }).catch(() => { });

    // Email buyer
    try {
      const profile = await db.userProfile.findUnique({
        where: { address: escrow.buyerAddress.toLowerCase() },
        select: { email: true },
      });
      if (profile?.email) {
        sendEscrowRefundedEmail({
          to: profile.email,
          title: escrow.title,
          amount: escrow.amount,
          txHash: result.txHash,
          escrowId,
        }).catch(() => { });
      }
    } catch { }

    return NextResponse.json({ success: true, refundTxHash: result.txHash });
  }

  console.error(`[escrow refund] Failed: ${result.error}`);
  return NextResponse.json({ success: false, error: result.error }, { status: 500 });
}