import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transferFromWallet } from "@/lib/circle";
import { sendEscrowReleasedEmail } from "@/lib/email";
import { recordReputationEvent } from "@/lib/reputation";

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const { escrowId } = body;
  if (!escrowId) return NextResponse.json({ error: "escrowId is required." }, { status: 400 });
  const escrow = await db.escrowLink.findUnique({ where: { id: escrowId } });
  if (!escrow) return NextResponse.json({ error: "Escrow not found." }, { status: 404 });
  if (!["CONFIRMED"].includes(escrow.status)) {
    return NextResponse.json({ error: "Escrow must be CONFIRMED before release." }, { status: 400 });
  }
  if (escrow.releaseTxHash) {
    return NextResponse.json({ success: true, alreadyReleased: true, releaseTxHash: escrow.releaseTxHash });
  }
  if (!escrow.circleWalletId) {
    return NextResponse.json({ error: "No Circle wallet associated with this escrow." }, { status: 400 });
  }
  console.log(`[escrow release] Releasing ${escrow.amount} USDC to ${escrow.sellerAddress}`);
  const result = await transferFromWallet(escrow.circleWalletId, escrow.sellerAddress, escrow.amount);
  if (result.success && result.txHash) {
    await db.escrowLink.update({
      where: { id: escrowId },
      data: { status: "RELEASED", releaseTxHash: result.txHash },
    });

    // Record reputation: a successful release = a completed escrow for the seller
    await recordReputationEvent(escrow.sellerAddress, "COMPLETED", escrow.amount);

    // Email buyer if they have a profile with email
    try {
      if (escrow.buyerAddress) {
        const profile = await db.userProfile.findUnique({
          where: { address: escrow.buyerAddress.toLowerCase() },
          select: { email: true },
        });
        if (profile?.email) {
          sendEscrowReleasedEmail({
            to: profile.email,
            title: escrow.title,
            amount: escrow.amount,
            sellerAddress: escrow.sellerAddress,
            txHash: result.txHash,
            escrowId,
          }).catch(() => { });
        }
      }
    } catch { }
    return NextResponse.json({ success: true, releaseTxHash: result.txHash });
  }
  console.error(`[escrow release] Failed: ${result.error}`);
  return NextResponse.json({ success: false, error: result.error }, { status: 500 });
}