import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/transactions/all?address=0x...
// Returns sent + received for payments, escrow, and splits.
export async function GET(req: NextRequest) {
    const address = req.nextUrl.searchParams.get("address")?.toLowerCase();
    if (!address) return NextResponse.json({ error: "Address required." }, { status: 400 });

    try {
        // ── PAYMENTS ──────────────────────────────────────────────────────────────
        // Received: links where you are the recipient and they're paid.
        // Sent: links you paid (paidBy === you).
        // Match the working /api/links approach: fetch all, then filter completed in JS
        // (avoids any status-value mismatch like "PAID" vs "COMPLETED").
        const [allReceived, allSentRaw] = await Promise.all([
            db.paymentLink.findMany({
                where: { recipientAddress: address },
                orderBy: { createdAt: "desc" },
            }),
            db.paymentLink.findMany({
                where: { paidBy: address },
                orderBy: { createdAt: "desc" },
            }),
        ]);

        const isPaidStatus = (s: string) => s === "PAID" || s === "COMPLETED";
        const paymentsReceived = allReceived.filter(l => isPaidStatus(l.status));
        const paymentsSent = allSentRaw.filter(l => isPaidStatus(l.status));

        const mapPayment = (l: any, direction: "sent" | "received") => ({
            id: l.id,
            title: l.title,
            amount: l.amount,
            status: l.status === "PAID" ? "COMPLETED" : l.status,
            txHash: l.txHash ?? undefined,
            counterparty: direction === "received" ? (l.paidBy ?? undefined) : (l.recipientAddress ?? undefined),
            paidAt: l.paidAt?.toISOString() ?? undefined,
            createdAt: l.createdAt.toISOString(),
            direction,
        });

        // ── ESCROW ──────────────────────────────────────────────────────────────
        // Received (you sold): sellerAddress === you, funded.
        // Sent (you bought): buyerAddress === you.
        const [escrowSold, escrowBought] = await Promise.all([
            db.escrowLink.findMany({
                where: { sellerAddress: address, txHash: { not: null } },
                orderBy: { createdAt: "desc" },
            }),
            db.escrowLink.findMany({
                where: { buyerAddress: address, txHash: { not: null } },
                orderBy: { createdAt: "desc" },
            }),
        ]);

        const mapEscrow = (e: any, direction: "sent" | "received") => ({
            id: e.id,
            title: e.title,
            amount: e.amount,
            status: e.status,
            isRefunded: e.status === "CANCELLED",
            txHash: e.txHash ?? undefined,
            releaseTxHash: e.releaseTxHash ?? undefined,
            counterparty: direction === "received" ? (e.buyerAddress ?? undefined) : (e.sellerAddress ?? undefined),
            deliveryDays: e.deliveryDays ?? undefined,
            paidAt: e.paidAt?.toISOString() ?? undefined,
            createdAt: e.createdAt.toISOString(),
            direction,
        });

        // ── SPLITS ──────────────────────────────────────────────────────────────
        // Sent (you funded): paidBy === you.
        // Received (you're a recipient): recipients JSON contains your address.
        const splitsFunded = await db.splitLink.findMany({
            where: { paidBy: address, txHash: { not: null } },
            orderBy: { createdAt: "desc" },
        });

        const fundedSplits = await db.splitLink.findMany({
            where: { txHash: { not: null }, status: { in: ["DISTRIBUTING", "COMPLETED", "FAILED"] } },
            orderBy: { createdAt: "desc" },
            take: 200,
        });
        const splitsReceived = fundedSplits.filter((s: any) => {
            const recips = (s.recipients as any[]) ?? [];
            return recips.some(r => r.address?.toLowerCase() === address);
        });

        const mapSplitSent = (s: any) => ({
            id: s.id,
            title: s.title,
            amount: s.amount,
            status: s.status,
            txHash: s.txHash ?? undefined,
            recipientCount: ((s.recipients as any[]) ?? []).length,
            sentLegs: ((s.payouts as any[]) ?? []).filter(p => p.status === "SENT").length,
            distributedAt: s.distributedAt?.toISOString() ?? undefined,
            createdAt: s.createdAt.toISOString(),
            direction: "sent" as const,
        });

        const mapSplitReceived = (s: any) => {
            const recips = (s.recipients as any[]) ?? [];
            const mine = recips.find(r => r.address?.toLowerCase() === address);
            const payout = ((s.payouts as any[]) ?? []).find(p => p.address?.toLowerCase() === address);
            // Amount this user receives = their leg's payout amount if computed, else % of total
            const myAmount = payout?.amount
                ?? (mine ? ((parseFloat(s.amount) * (mine.percentage ?? 0)) / 100).toFixed(2) : "0");
            return {
                id: s.id,
                title: s.title,
                amount: myAmount,
                totalAmount: s.amount,
                percentage: mine?.percentage ?? 0,
                status: s.status,
                payoutStatus: payout?.status ?? "PENDING",
                txHash: payout?.txHash ?? undefined,
                distributedAt: s.distributedAt?.toISOString() ?? undefined,
                createdAt: s.createdAt.toISOString(),
                direction: "received" as const,
            };
        };

        return NextResponse.json({
            payments: {
                received: paymentsReceived.map(l => mapPayment(l, "received")),
                sent: paymentsSent.map(l => mapPayment(l, "sent")),
            },
            escrow: {
                received: escrowSold.map(e => mapEscrow(e, "received")),
                sent: escrowBought.map(e => mapEscrow(e, "sent")),
            },
            splits: {
                sent: splitsFunded.map(mapSplitSent),
                received: splitsReceived.map(mapSplitReceived),
            },
        });
    } catch (err: any) {
        console.error("[/api/transactions/all] error:", err?.message, err);
        return NextResponse.json({ error: "Failed to load transactions." }, { status: 500 });
    }
}