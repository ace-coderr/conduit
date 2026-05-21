import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { username: string } }) {
    const username = params.username.toLowerCase().replace(/^@/, "");

    const profile = await db.userProfile.findUnique({
        where: { username },
    });

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    return NextResponse.json({ profile });
}