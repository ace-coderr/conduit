import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");
    if (!address) return NextResponse.json({ error: "Address required" }, { status: 400 });

    const profile = await db.userProfile.findUnique({
        where: { address: address.toLowerCase() },
    });

    return NextResponse.json({ profile });
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { address, username, displayName, bio, avatar } = body;

    if (!address) return NextResponse.json({ error: "Address required" }, { status: 400 });
    if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 });

    const clean = username.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (clean.length < 3) return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 });
    if (clean.length > 20) return NextResponse.json({ error: "Username must be 20 characters or less" }, { status: 400 });

    // Check if username taken by another address
    const existing = await db.userProfile.findUnique({ where: { username: clean } });
    if (existing && existing.address !== address.toLowerCase()) {
        return NextResponse.json({ error: "Username already taken" }, { status: 409 });
    }

    const profile = await db.userProfile.upsert({
        where: { address: address.toLowerCase() },
        update: { username: clean, displayName: displayName?.trim() || null, bio: bio?.trim() || null, avatar: avatar || null },
        create: { address: address.toLowerCase(), username: clean, displayName: displayName?.trim() || null, bio: bio?.trim() || null, avatar: avatar || null },
    });

    return NextResponse.json({ profile });
}