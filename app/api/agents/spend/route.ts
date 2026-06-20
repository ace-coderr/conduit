import { NextRequest, NextResponse } from "next/server";
import { isValidAddress } from "@/lib/utils";
import { authenticateAgent, agentSpend } from "@/lib/agentWallet";

/**
 * POST /api/agents/spend
 * Called BY an AI agent with its API key to send USDC.
 *
 * Auth: Authorization: Bearer cak_live_...
 * Body: { recipient: "0x...", amount: "1.50" }
 */
export async function POST(req: NextRequest) {
    // Extract API key from Authorization header
    const auth = req.headers.get("authorization") ?? "";
    const apiKey = auth.startsWith("Bearer ") ? auth.slice(7) : auth;

    const agent = await authenticateAgent(apiKey);
    if (!agent) {
        return NextResponse.json({ error: "Invalid or inactive API key." }, { status: 401 });
    }

    let body: any;
    try { body = await req.json(); } catch {
        return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    const { recipient, amount } = body;
    if (!recipient || !isValidAddress(recipient))
        return NextResponse.json({ error: "Valid recipient address required." }, { status: 400 });
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)
        return NextResponse.json({ error: "Valid amount required." }, { status: 400 });

    const result = await agentSpend(agent.id, recipient, amount);

    if (result.success) {
        return NextResponse.json({ success: true, txHash: result.txHash });
    }

    // Blocked by a guardrail → 403; other failures → 400
    return NextResponse.json(
        { success: false, error: result.error },
        { status: result.blocked ? 403 : 400 }
    );
}