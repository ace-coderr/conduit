import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transferFromWallet } from "@/lib/circle";
import { recordReputationEvent } from "@/lib/reputation";

/**
 * POST /api/escrow/force-release   { escrowId }
 *
 * TESTING UTILITY — releases a specific escrow's funds to the seller
 * regardless of its current status or delivery deadline. Use this to
 * verify gasless (SCA + Gas Station) releases without waiting for the
 * natural confirm/deadline flow.
 *
 * Skips if already released (has releaseTxHash) or no Circle wallet.
 *
 * NOTE: This bypasses normal escrow protections. Keep it for testing,
 * or remove/guard it with admin auth before a real launch.
 */
export async function POST(req: NextRequest) {
    let body: any;
    try { body = await req.json(); } catch {
        return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    const { escrowId } = body;
    if (!escrowId) return NextResponse.json({ error: "escrowId is required." }, { status: 400 });

    const escrow = await db.escrowLink.findUnique({ where: { id: escrowId } });
    if (!escrow) return NextResponse.json({ error: "Escrow not found." }, { status: 404 });

    if (escrow.releaseTxHash) {
        return NextResponse.json({ success: true, alreadyReleased: true, releaseTxHash: escrow.releaseTxHash });
    }
    if (!escrow.circleWalletId) {
        return NextResponse.json({ error: "No Circle wallet associated with this escrow." }, { status: 400 });
    }

    console.log(`[force-release] Releasing ${escrow.amount} USDC from ${escrow.circleWalletId} to ${escrow.sellerAddress}`);

    const result = await transferFromWallet(escrow.circleWalletId, escrow.sellerAddress, escrow.amount);

    if (result.success && result.txHash) {
        await db.escrowLink.update({
            where: { id: escrowId },
            data: { status: "RELEASED", releaseTxHash: result.txHash },
        });
        await recordReputationEvent(escrow.sellerAddress, "COMPLETED", escrow.amount);
        return NextResponse.json({ success: true, releaseTxHash: result.txHash });
    }

    return NextResponse.json({ success: false, error: result.error ?? "Release failed" }, { status: 502 });
}