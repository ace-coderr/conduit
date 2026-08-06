import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transferFromWallet } from "@/lib/circle";
import { collectEscrowFee } from "@/lib/escrowFee";
import { verifyAdminQuery } from "@/lib/adminAuth";
import { recordReputationEvent } from "@/lib/reputation";

/**
 * POST /api/escrow/retry-release   (admin only)
 *
 * Finds escrows that are stuck — status CONFIRMED but releaseTxHash is null
 * (the confirm fired but the release transfer never completed) — and re-runs
 * the release for each one.
 *
 * Body (optional): { escrowId } to retry a single escrow.
 * If no escrowId is given, it sweeps ALL stuck escrows.
 *
 * Requires admin auth (x-wallet-address header matching the admin wallet),
 * the same guard used by the refund route. Safe to call repeatedly —
 * escrows that already have a releaseTxHash are skipped.
 */
export async function POST(req: NextRequest) {
    const { ok, error } = verifyAdminQuery(req);
    if (!ok) return NextResponse.json({ error }, { status: 401 });

    let body: any = {};
    try { body = await req.json(); } catch { /* no body is fine */ }

    const singleId: string | undefined = body?.escrowId;

    // Find stuck escrows
    const stuck = await db.escrowLink.findMany({
        where: singleId
            ? { id: singleId }
            : { status: "CONFIRMED", releaseTxHash: null },
    });

    if (stuck.length === 0) {
        return NextResponse.json({ success: true, message: "No stuck escrows found.", processed: [] });
    }

    const results: any[] = [];

    for (const escrow of stuck) {
        if (escrow.releaseTxHash) {
            results.push({ id: escrow.id, skipped: "already released" });
            continue;
        }
        if (!escrow.circleWalletId) {
            results.push({ id: escrow.id, error: "no circleWalletId" });
            continue;
        }
        if (escrow.status !== "CONFIRMED") {
            results.push({ id: escrow.id, skipped: `status is ${escrow.status}` });
            continue;
        }

        try {
            const result = await transferFromWallet(escrow.circleWalletId, escrow.sellerAddress, escrow.amount);
            if (result.success && result.txHash) {
                await db.escrowLink.update({
                    where: { id: escrow.id },
                    data: { status: "RELEASED", releaseTxHash: result.txHash },
                });
                await recordReputationEvent(escrow.sellerAddress, "COMPLETED", escrow.amount);
                // Fallback sweep — no-op if the fee was already taken at pay time.
                const fee = await collectEscrowFee(escrow.id).catch(() => null);
                results.push({ id: escrow.id, released: true, txHash: result.txHash, feeTxHash: fee?.txHash ?? null });
            } else {
                results.push({ id: escrow.id, error: result.error ?? "transfer failed" });
            }
        } catch (err: any) {
            results.push({ id: escrow.id, error: err?.message ?? "exception during release" });
        }
    }

    return NextResponse.json({ success: true, processed: results });
}