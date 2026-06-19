import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSplitWallet } from "@/lib/circle";
import { isValidAddress } from "@/lib/utils";

interface RecipientInput {
    address: string;
    percentage: number;
    label?: string;
}

// GET /api/splits?address= — list splits created by a wallet
export async function GET(req: NextRequest) {
    const address = req.nextUrl.searchParams.get("address")?.toLowerCase();
    if (!address) return NextResponse.json({ error: "Address required." }, { status: 400 });

    const splits = await db.splitLink.findMany({
        where: { creatorAddress: address },
        orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ splits });
}

// POST /api/splits — create a split link
export async function POST(req: NextRequest) {
    let body: any;
    try { body = await req.json(); } catch {
        return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    const { title, description, amount, creatorAddress, recipients } = body;

    if (!title?.trim()) return NextResponse.json({ error: "Title is required." }, { status: 400 });
    if (!creatorAddress || !isValidAddress(creatorAddress))
        return NextResponse.json({ error: "Valid creator address required." }, { status: 400 });

    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0)
        return NextResponse.json({ error: "Enter a valid amount greater than 0." }, { status: 400 });

    // Validate recipients
    if (!Array.isArray(recipients) || recipients.length < 2)
        return NextResponse.json({ error: "At least 2 recipients are required." }, { status: 400 });
    if (recipients.length > 10)
        return NextResponse.json({ error: "Maximum 10 recipients per split." }, { status: 400 });

    const cleaned: RecipientInput[] = [];
    let pctSum = 0;
    for (const r of recipients) {
        if (!isValidAddress(r.address))
            return NextResponse.json({ error: `Invalid recipient address: ${r.address}` }, { status: 400 });
        const pct = parseFloat(r.percentage);
        if (isNaN(pct) || pct <= 0 || pct > 100)
            return NextResponse.json({ error: "Each percentage must be between 0 and 100." }, { status: 400 });
        pctSum += pct;
        cleaned.push({ address: r.address.toLowerCase(), percentage: pct, label: r.label?.trim() || undefined });
    }

    // Percentages must sum to 100 (allow tiny float tolerance)
    if (Math.abs(pctSum - 100) > 0.05)
        return NextResponse.json({ error: `Percentages must sum to 100% (currently ${pctSum.toFixed(2)}%).` }, { status: 400 });

    // Rate limit: 20 splits/hour per creator
    const windowStart = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await db.splitLink.count({
        where: { creatorAddress: creatorAddress.toLowerCase(), createdAt: { gte: windowStart } },
    });
    if (recentCount >= 20)
        return NextResponse.json({ error: "Too many splits created. Limit is 20 per hour." }, { status: 429 });

    // Create placeholder to get ID
    const placeholder = await db.splitLink.create({
        data: {
            title: title.trim(),
            description: description?.trim() || null,
            amount: parsed.toString(),
            creatorAddress: creatorAddress.toLowerCase(),
            recipients: cleaned as any,
            splitAddress: "pending",
            status: "ACTIVE",
        },
    });

    // Create the Circle SCA wallet that will receive funds
    let wallet: { walletId: string; address: string };
    try {
        wallet = await createSplitWallet(placeholder.id);
    } catch (err: any) {
        await db.splitLink.delete({ where: { id: placeholder.id } });
        console.error("[split create] Circle wallet creation failed:", err.message);
        return NextResponse.json({ error: "Failed to create split wallet. Please try again." }, { status: 500 });
    }

    const split = await db.splitLink.update({
        where: { id: placeholder.id },
        data: { circleWalletId: wallet.walletId, splitAddress: wallet.address },
    });

    return NextResponse.json({ split }, { status: 201 });
}