import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/telegram/status?address= — is this wallet linked?
export async function GET(req: NextRequest) {
    const address = req.nextUrl.searchParams.get("address")?.toLowerCase();
    if (!address) return NextResponse.json({ error: "Address required." }, { status: 400 });

    const conn = await db.telegramConnection.findUnique({ where: { ownerAddress: address } });
    return NextResponse.json({
        linked: conn?.linked ?? false,
        username: conn?.username ?? null,
    });
}

// DELETE /api/telegram/status?address= — disconnect
export async function DELETE(req: NextRequest) {
    const address = req.nextUrl.searchParams.get("address")?.toLowerCase();
    if (!address) return NextResponse.json({ error: "Address required." }, { status: 400 });

    await db.telegramConnection.deleteMany({ where: { ownerAddress: address } });
    return NextResponse.json({ success: true });
}