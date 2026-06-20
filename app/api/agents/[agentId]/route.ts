import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidAddress } from "@/lib/utils";
import { getWalletBalance } from "@/lib/circle";

interface Ctx { params: { agentId: string } }

// GET /api/agents/[agentId] — detail + live balance
export async function GET(_req: NextRequest, { params }: Ctx) {
    const agent = await db.agentWallet.findUnique({
        where: { id: params.agentId },
        include: { transactions: { orderBy: { createdAt: "desc" }, take: 25 } },
    });
    if (!agent) return NextResponse.json({ error: "Not found." }, { status: 404 });

    let balance = "0";
    if (agent.circleWalletId) {
        try { balance = await getWalletBalance(agent.circleWalletId); } catch { }
    }

    const { apiKeyHash, ...safe } = agent;
    return NextResponse.json({ agent: safe, balance });
}

// PATCH /api/agents/[agentId] — update controls / active state
export async function PATCH(req: NextRequest, { params }: Ctx) {
    let body: any;
    try { body = await req.json(); } catch {
        return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    const { callerAddress, name, dailyLimit, allowedRecipients, active } = body;
    const agent = await db.agentWallet.findUnique({ where: { id: params.agentId } });
    if (!agent) return NextResponse.json({ error: "Not found." }, { status: 404 });

    if (!callerAddress || callerAddress.toLowerCase() !== agent.ownerAddress)
        return NextResponse.json({ error: "Not authorized." }, { status: 403 });

    const data: any = {};
    if (typeof active === "boolean") data.active = active;
    if (name !== undefined) {
        if (!name.trim()) return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
        data.name = name.trim();
    }
    if (dailyLimit !== undefined) {
        const limit = parseFloat(dailyLimit);
        if (isNaN(limit) || limit < 0) return NextResponse.json({ error: "Invalid daily limit." }, { status: 400 });
        data.dailyLimit = limit.toString();
    }
    if (allowedRecipients !== undefined) {
        if (!Array.isArray(allowedRecipients)) return NextResponse.json({ error: "allowedRecipients must be an array." }, { status: 400 });
        const recips: string[] = [];
        for (const r of allowedRecipients) {
            if (!isValidAddress(r)) return NextResponse.json({ error: `Invalid recipient: ${r}` }, { status: 400 });
            recips.push(r.toLowerCase());
        }
        data.allowedRecipients = recips;
    }

    const updated = await db.agentWallet.update({ where: { id: agent.id }, data });
    const { apiKeyHash, ...safe } = updated;
    return NextResponse.json({ agent: safe });
}

// DELETE /api/agents/[agentId]
export async function DELETE(req: NextRequest, { params }: Ctx) {
    const callerAddress = req.nextUrl.searchParams.get("address")?.toLowerCase();
    const agent = await db.agentWallet.findUnique({ where: { id: params.agentId } });
    if (!agent) return NextResponse.json({ error: "Not found." }, { status: 404 });

    if (!callerAddress || callerAddress !== agent.ownerAddress)
        return NextResponse.json({ error: "Not authorized." }, { status: 403 });

    await db.agentWallet.delete({ where: { id: agent.id } });
    return NextResponse.json({ success: true });
}