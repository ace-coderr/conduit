import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidAddress } from "@/lib/utils";
import { sendPaymentRequestEmail } from "@/lib/email";

// GET /api/requests?address=0x... — returns sent + received for a wallet
export async function GET(req: NextRequest) {
    const address = req.nextUrl.searchParams.get("address")?.toLowerCase();
    if (!address) return NextResponse.json({ error: "Address required." }, { status: 400 });

    const [sent, received] = await Promise.all([
        db.paymentRequest.findMany({
            where: { requesterAddress: address },
            orderBy: { createdAt: "desc" },
        }),
        db.paymentRequest.findMany({
            where: { recipientAddress: address },
            orderBy: { createdAt: "desc" },
        }),
    ]);

    return NextResponse.json({ sent, received });
}

// POST /api/requests — create a new payment request
export async function POST(req: NextRequest) {
    let body: any;
    try { body = await req.json(); } catch {
        return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    const { requesterAddress, recipientAddress, amount, title, note, expiresAt, recipientEmail } = body;

    if (!requesterAddress || !isValidAddress(requesterAddress))
        return NextResponse.json({ error: "Valid requester address required." }, { status: 400 });
    if (!recipientAddress || !isValidAddress(recipientAddress))
        return NextResponse.json({ error: "Valid recipient address required." }, { status: 400 });
    if (requesterAddress.toLowerCase() === recipientAddress.toLowerCase())
        return NextResponse.json({ error: "Cannot request payment from yourself." }, { status: 400 });

    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0)
        return NextResponse.json({ error: "Enter a valid amount greater than 0." }, { status: 400 });
    if (!title?.trim())
        return NextResponse.json({ error: "Title is required." }, { status: 400 });

    // Rate limit: 10 requests per hour per requester
    const windowStart = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await db.paymentRequest.count({
        where: { requesterAddress: requesterAddress.toLowerCase(), createdAt: { gte: windowStart } },
    });
    if (recentCount >= 10)
        return NextResponse.json({ error: "Too many requests created. Limit is 10 per hour." }, { status: 429 });

    const request = await db.paymentRequest.create({
        data: {
            requesterAddress: requesterAddress.toLowerCase(),
            recipientAddress: recipientAddress.toLowerCase(),
            amount: parsed.toString(),
            title: title.trim(),
            note: note?.trim() || null,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            status: "PENDING",
        },
    });

    // Send email notification if recipient has a profile email
    const recipientProfile = await db.userProfile.findUnique({
        where: { address: recipientAddress.toLowerCase() },
    });
    const requesterProfile = await db.userProfile.findUnique({
        where: { address: requesterAddress.toLowerCase() },
    });

    const emailTo = recipientEmail || recipientProfile?.email;
    if (emailTo) {
        await sendPaymentRequestEmail({
            to: emailTo,
            requesterUsername: requesterProfile?.username || requesterProfile?.displayName,
            requesterAddress: requesterAddress,
            recipientUsername: recipientProfile?.username,
            title: request.title,
            amount: request.amount,
            note: request.note ?? undefined,
            requestId: request.id,
            expiresAt: request.expiresAt?.toISOString(),
        });
        await db.paymentRequest.update({ where: { id: request.id }, data: { notifiedAt: new Date() } });
    }

    return NextResponse.json({ request }, { status: 201 });
}