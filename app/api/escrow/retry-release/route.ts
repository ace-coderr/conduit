import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transferFromWallet } from "@/lib/circle";
import { recordReputationEvent } from "@/lib/reputation";

/**
 * POST /api/escrow/retry-release
 *
 * Finds escrows that are stuck: status CONFIRMED but releaseTxHash is null
 * (the confirm fired but the release transfer never completed), and re-runs
 * the release for each one.
 *
 * Body (optional): { escrowId } to retry a single escrow.
 * If no escrowId is given, it sweeps ALL stuck escrows.
 *
 * Safe to call repeatedly — escrows that already have a releaseTxHash are skipped.
 */
export async function POST(req: NextRequest) {
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
        // Skip if it already released (race-safety) or has no wallet
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
                results.push({ id: escrow.id, released: true, txHash: result.txHash });
            } else {
                results.push({ id: escrow.id, error: result.error ?? "transfer failed" });
            }
        } catch (err: any) {
            results.push({ id: escrow.id, error: err?.message ?? "exception during release" });
        }
    }

    return NextResponse.json({ success: true, processed: results });
}