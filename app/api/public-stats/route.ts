import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Free, unauthenticated platform totals for public surfaces (homepage hero, etc).
// Same aggregation as /api/arc-stats, without the x402 payment gate — safe to
// call on every page load.
export async function GET() {
  const [links, escrows, splits, agents, marketplaceListings, x402Payments] = await Promise.all([
    db.paymentLink.findMany({ select: { amount: true, status: true } }),
    db.escrowLink.findMany({ select: { amount: true, status: true } }),
    db.splitLink.count(),
    db.agentWallet.count(),
    db.marketplaceListing.count({ where: { status: "APPROVED" } }),
    db.x402Payment.count(),
  ]);

  const completedLinks = links.filter(l => l.status === "COMPLETED" || l.status === "PAID");
  const releasedEscrows = escrows.filter(e => ["RELEASED", "CONFIRMED"].includes(e.status));
  const totalLinkVolume = completedLinks.reduce((s, l) => s + parseFloat(l.amount), 0);
  const totalEscrowVolume = releasedEscrows.reduce((s, e) => s + parseFloat(e.amount), 0);

  return NextResponse.json({
    totalVolume: totalLinkVolume + totalEscrowVolume,
    transactions: completedLinks.length + releasedEscrows.length,
    paymentLinks: links.length,
    escrows: escrows.length,
    splits,
    agents,
    marketplaceListings,
    x402Payments,
  });
}
