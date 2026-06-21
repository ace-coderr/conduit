import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidAddress } from "@/lib/utils";
import crypto from "crypto";

const BOT_USERNAME = "ConduitPayAppBot";

// POST /api/telegram/connect — generate a one-time link code + deep link for a wallet
export async function POST(req: NextRequest) {
    let body: any;
    try { body = await req.json(); } catch {
        return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    const { ownerAddress } = body;
    if (!ownerAddress || !isValidAddress(ownerAddress))
        return NextResponse.json({ error: "Valid address required." }, { status: 400 });

    const addr = ownerAddress.toLowerCase();
    const linkCode = crypto.randomBytes(8).toString("hex");

    // Upsert a pending (unlinked) connection holding the code.
    await db.telegramConnection.upsert({
        where: { ownerAddress: addr },
        create: { ownerAddress: addr, chatId: "", linkCode, linked: false },
        update: { linkCode, linked: false, chatId: "" },
    });

    const deepLink = `https://t.me/${BOT_USERNAME}?start=${linkCode}`;
    return NextResponse.json({ deepLink, linkCode });
}