import { NextRequest, NextResponse } from "next/server";
import { getReputation } from "@/lib/reputation";

/**
 * GET /api/reputation?address=0x...
 * Returns the trust score and escrow stats for a wallet.
 */
export async function GET(req: NextRequest) {
    const address = req.nextUrl.searchParams.get("address");

    if (!address) {
        return NextResponse.json({ error: "address is required" }, { status: 400 });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return NextResponse.json({ error: "invalid address" }, { status: 400 });
    }

    try {
        const reputation = await getReputation(address);
        return NextResponse.json({ reputation });
    } catch (err) {
        console.error("reputation fetch failed:", err);
        return NextResponse.json({ error: "failed to fetch reputation" }, { status: 500 });
    }
}