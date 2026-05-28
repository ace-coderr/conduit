import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAdmin } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const { ok, error } = verifyAdmin(req);
  if (!ok) return NextResponse.json({ error }, { status: 401 });

  try {
    const [links, escrows] = await Promise.all([
      db.paymentLink.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true, title: true, amount: true, status: true,
          recipientAddress: true, stealthAddress: true,
          txHash: true, paidBy: true, paidAt: true, createdAt: true,
        },
      }),
      db.escrowLink.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true, title: true, amount: true, status: true,
          sellerAddress: true, buyerAddress: true, stealthAddress: true,
          txHash: true, releaseTxHash: true, feeTxHash: true,
          paidAt: true, deliveryDays: true, deliveryDeadline: true,
          releaseDeadline: true, confirmedAt: true,
          disputedAt: true, disputeReason: true, disputeDeadline: true,
          sellerContact: true, sellerRespondedAt: true, buyerLastMessageAt: true,
          createdAt: true,
        },
      }),
    ]);
    return NextResponse.json({ links, escrows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}