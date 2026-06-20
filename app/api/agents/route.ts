import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidAddress } from "@/lib/utils";
import { createSplitWallet } from "@/lib/circle";
import { generateAgentApiKey } from "@/lib/agentWallet";

// GET /api/agents?address= — list agent wallets owned by a wallet
export async function GET(req: NextRequest) {
    const address = req.nextUrl.searchParams.get("address")?.toLowerCase();
    if (!address) return NextResponse.json({ error: "Address required." }, { status: 400 });

    const agents = await db.agentWallet.findMany({
        where: { ownerAddress: address },
        orderBy: { createdAt: "desc" },
        include: { transactions: { orderBy: { createdAt: "desc" }, take: 10 } },
    });

    // Never return the key hash
    const safe = agents.map(({ apiKeyHash, ...rest }) => rest);
    return NextResponse.json({ agents: safe });
}

// POST /api/agents — create an agent wallet (returns API key ONCE)
export async function POST(req: NextRequest) {
    let body: any;
    try { body = await req.json(); } catch {
        return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    const { ownerAddress, name, dailyLimit, allowedRecipients } = body;

    if (!ownerAddress || !isValidAddress(ownerAddress))
        return NextResponse.json({ error: "Valid owner address required." }, { status: 400 });
    if (!name?.trim())
        return NextResponse.json({ error: "Agent name is required." }, { status: 400 });

    // Validate daily limit
    const limit = dailyLimit !== undefined && dailyLimit !== "" ? parseFloat(dailyLimit) : 0;
    if (isNaN(limit) || limit < 0)
        return NextResponse.json({ error: "Daily limit must be 0 or greater." }, { status: 400 });

    // Validate allowed recipients
    let recipients: string[] = [];
    if (Array.isArray(allowedRecipients)) {
        for (const r of allowedRecipients) {
            if (!isValidAddress(r)) return NextResponse.json({ error: `Invalid recipient: ${r}` }, { status: 400 });
            recipients.push(r.toLowerCase());
        }
    }

    // Limit: 20 agents per owner
    const count = await db.agentWallet.count({ where: { ownerAddress: ownerAddress.toLowerCase() } });
    if (count >= 20)
        return NextResponse.json({ error: "Maximum 20 agent wallets per owner." }, { status: 429 });

    const { key, hash, preview } = generateAgentApiKey();

    // Placeholder row to get an id for the Circle wallet metadata
    const placeholder = await db.agentWallet.create({
        data: {
            ownerAddress: ownerAddress.toLowerCase(),
            name: name.trim(),
            apiKeyHash: hash,
            apiKeyPreview: preview,
            dailyLimit: limit.toString(),
            allowedRecipients: recipients,
            walletAddress: "pending",
            active: true,
        },
    });

    // Provision a Circle SCA wallet for the agent (reuses split wallet creator)
    let wallet: { walletId: string; address: string };
    try {
        wallet = await createSplitWallet(`agent-${placeholder.id}`);
    } catch (err: any) {
        await db.agentWallet.delete({ where: { id: placeholder.id } });
        console.error("[agent create] Circle wallet failed:", err.message);
        return NextResponse.json({ error: "Failed to provision agent wallet." }, { status: 500 });
    }

    const agent = await db.agentWallet.update({
        where: { id: placeholder.id },
        data: { circleWalletId: wallet.walletId, walletAddress: wallet.address },
    });

    // Return the raw API key exactly once
    const { apiKeyHash, ...safe } = agent;
    return NextResponse.json({ agent: safe, apiKey: key }, { status: 201 });
}