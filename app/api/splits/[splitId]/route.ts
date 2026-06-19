import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { arcPublicClient } from "@/lib/arcClient";
import { parseEther } from "viem";
import { transferFromWallet } from "@/lib/circle";
import { calculateFee } from "@/lib/fees";
import { fireWebhook } from "@/lib/webhooks";

interface RouteParams { params: { splitId: string } }

interface Recipient { address: string; percentage: number; label?: string; }
interface Payout { address: string; amount: string; txHash?: string; status: string; label?: string; }

/**
 * Distributes the funded amount across recipients by percentage.
 * Idempotent — only sends legs that haven't already succeeded.
 * Platform fee (0.5%) is taken off the total before splitting.
 */
async function distributeSplit(splitId: string): Promise<{ success: boolean; payouts: Payout[]; error?: string }> {
    const split = await db.splitLink.findUnique({ where: { id: splitId } });
    if (!split) return { success: false, payouts: [], error: "Split not found" };
    if (!split.circleWalletId) return { success: false, payouts: [], error: "No Circle wallet" };
    if (split.status === "COMPLETED") {
        return { success: true, payouts: (split.payouts as unknown as Payout[]) ?? [] };
    }

    const recipients = split.recipients as unknown as Recipient[];
    const fee = calculateFee(split.amount);
    const distributable = parseFloat(fee.recipientAmount); // total minus platform fee

    // Build or resume payout ledger.
    // Each leg = distributable * percentage, but the LAST recipient gets whatever
    // remains, so rounding never leaves dust in the wallet or overshoots the balance.
    const existing = (split.payouts as unknown as Payout[]) ?? [];
    let allocated = 0;
    const payouts: Payout[] = recipients.map((r, i) => {
        const prior = existing.find(p => p.address === r.address);
        if (prior?.status === "SENT") {
            allocated += parseFloat(prior.amount);
            return prior;
        }
        const isLast = i === recipients.length - 1;
        const legNum = isLast
            ? Math.max(0, distributable - allocated)
            : (distributable * r.percentage) / 100;
        const legAmount = legNum.toFixed(4);
        allocated += parseFloat(legAmount);
        return { address: r.address, amount: legAmount, status: "PENDING", label: r.label };
    });

    await db.splitLink.update({
        where: { id: splitId },
        data: { status: "DISTRIBUTING", payouts: payouts as any },
    });

    // Distribute to each recipient leg. Fee is sent after, as a separate leg.
    let anyFailed = false;
    for (let i = 0; i < payouts.length; i++) {
        if (payouts[i].status === "SENT") continue;
        const result = await transferFromWallet(split.circleWalletId, payouts[i].address, payouts[i].amount);
        if (result.success && result.txHash) {
            payouts[i] = { ...payouts[i], status: "SENT", txHash: result.txHash };
        } else {
            payouts[i] = { ...payouts[i], status: "FAILED" };
            anyFailed = true;
            console.error(`[split distribute] Leg failed for ${payouts[i].address}: ${result.error}`);
        }
        // Persist progress after each leg so a crash mid-loop is resumable
        await db.splitLink.update({ where: { id: splitId }, data: { payouts: payouts as any } });
    }

    // Send platform fee leg (after recipients, best-effort)
    const FEE_COLLECTOR = "0x2d2eba8c0da5879ab25b5bd37e211d230aabbb5c";
    try {
        if (parseFloat(fee.fee) > 0) {
            await transferFromWallet(split.circleWalletId, FEE_COLLECTOR, fee.fee);
        }
    } catch { /* fee leg is best-effort */ }

    const allSent = payouts.every(p => p.status === "SENT");
    await db.splitLink.update({
        where: { id: splitId },
        data: {
            status: allSent ? "COMPLETED" : "FAILED",
            payouts: payouts as any,
            distributedAt: allSent ? new Date() : null,
        },
    });

    if (allSent) {
        fireWebhook(split.creatorAddress, "split.distributed", {
            id: split.id, title: split.title, amount: split.amount,
            recipientCount: recipients.length,
            payouts: payouts.map(p => ({ address: p.address, amount: p.amount, txHash: p.txHash })),
        }).catch(() => { });
    }

    return { success: allSent, payouts, error: anyFailed ? "One or more payout legs failed." : undefined };
}

// GET /api/splits/[splitId] — public view
export async function GET(_req: NextRequest, { params }: RouteParams) {
    const split = await db.splitLink.findUnique({ where: { id: params.splitId } });
    if (!split) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json({ split });
}

// PATCH /api/splits/[splitId] — actions: pay (funds detected → distribute), retry
export async function PATCH(req: NextRequest, { params }: RouteParams) {
    let body: any;
    try { body = await req.json(); } catch {
        return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    const { action, txHash, paidBy } = body;
    const split = await db.splitLink.findUnique({ where: { id: params.splitId } });
    if (!split) return NextResponse.json({ error: "Not found." }, { status: 404 });

    // ── PAY: payer funded the split wallet → verify + distribute ──
    if (action === "pay") {
        if (split.status !== "ACTIVE")
            return NextResponse.json({ error: "Split is not active." }, { status: 409 });
        if (!txHash) return NextResponse.json({ error: "txHash required." }, { status: 400 });

        // Best-effort on-chain verification (mirrors escrow pay flow)
        try {
            const tx = await arcPublicClient.getTransaction({ hash: txHash as `0x${string}` });
            if (tx && tx.blockNumber) {
                if (tx.to?.toLowerCase() !== split.splitAddress.toLowerCase())
                    return NextResponse.json({ error: "Transaction sent to wrong address." }, { status: 400 });
                if (tx.value < parseEther(split.amount))
                    return NextResponse.json({ error: `Insufficient payment. Required ${split.amount} USDC.` }, { status: 400 });
            }
        } catch (err: any) { console.warn("[split pay] verification skipped:", err.message); }

        await db.splitLink.update({
            where: { id: params.splitId },
            data: { status: "HOLDING", txHash, paidBy: paidBy ? paidBy.toLowerCase() : null, paidAt: new Date() },
        });

        fireWebhook(split.creatorAddress, "split.funded", {
            id: split.id, title: split.title, amount: split.amount,
            txHash, paidBy: paidBy ?? null,
        }).catch(() => { });

        // Distribute immediately (await so the caller gets the result)
        const result = await distributeSplit(params.splitId);
        return NextResponse.json({ success: result.success, payouts: result.payouts, error: result.error });
    }

    // ── RETRY: re-run distribution for failed legs ──
    if (action === "retry") {
        if (!["HOLDING", "DISTRIBUTING", "FAILED"].includes(split.status))
            return NextResponse.json({ error: "Nothing to retry." }, { status: 409 });
        const result = await distributeSplit(params.splitId);
        return NextResponse.json({ success: result.success, payouts: result.payouts, error: result.error });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
}