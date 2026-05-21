import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");
    if (!address) return NextResponse.json({ error: "Address required" }, { status: 400 });

    const contacts = await db.contact.findMany({
        where: { ownerAddress: address.toLowerCase() },
        orderBy: { createdAt: "desc" },
    });

    // Enrich with profiles
    const enriched = await Promise.all(contacts.map(async (c) => {
        const profile = await db.userProfile.findUnique({ where: { address: c.contactAddress } });
        return { ...c, profile };
    }));

    return NextResponse.json({ contacts: enriched });
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { ownerAddress, contactAddress, nickname } = body;

    if (!ownerAddress || !contactAddress) return NextResponse.json({ error: "Addresses required" }, { status: 400 });
    if (ownerAddress.toLowerCase() === contactAddress.toLowerCase()) return NextResponse.json({ error: "Cannot add yourself" }, { status: 400 });

    const contact = await db.contact.upsert({
        where: { ownerAddress_contactAddress: { ownerAddress: ownerAddress.toLowerCase(), contactAddress: contactAddress.toLowerCase() } },
        update: { nickname: nickname?.trim() || null },
        create: { ownerAddress: ownerAddress.toLowerCase(), contactAddress: contactAddress.toLowerCase(), nickname: nickname?.trim() || null },
    });

    return NextResponse.json({ contact });
}

export async function DELETE(req: NextRequest) {
    const body = await req.json();
    const { ownerAddress, contactAddress } = body;

    await db.contact.deleteMany({
        where: { ownerAddress: ownerAddress.toLowerCase(), contactAddress: contactAddress.toLowerCase() },
    });

    return NextResponse.json({ success: true });
}