import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendRequestPaidEmail } from "@/lib/email";

interface Ctx { params: { requestId: string } }

// GET /api/requests/[requestId] — public, used by the pay page
export async function GET(_req: NextRequest, { params }: Ctx) {
    const request = await db.paymentRequest.findUnique({ where: { id: params.requestId } });
    if (!request) return NextResponse.json({ error: "Not found." }, { status: 404 });

    // Auto-expire
    if (request.status === "PENDING" && request.expiresAt && new Date(request.expiresAt) <= new Date()) {
        await db.paymentRequest.update({ where: { id: request.id }, data: { status: "EXPIRED" } });
        return NextResponse.json({ request: { ...request, status: "EXPIRED" } });
    }

    return NextResponse.json({ request });
}

// PATCH /api/requests/[requestId] — mark paid or cancel
export async function PATCH(req: NextRequest, { params }: Ctx) {
    let body: any;
    try { body = await req.json(); } catch {
        return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    const { action, txHash, callerAddress } = body;
    const request = await db.paymentRequest.findUnique({ where: { id: params.requestId } });
    if (!request) return NextResponse.json({ error: "Not found." }, { status: 404 });

    if (request.status !== "PENDING")
        return NextResponse.json({ error: `Request is already ${request.status.toLowerCase()}.` }, { status: 409 });

    // PAID — called by the recipient after on-chain tx
    if (action === "paid") {
        if (!txHash) return NextResponse.json({ error: "txHash required." }, { status: 400 });

        const updated = await db.paymentRequest.update({
            where: { id: request.id },
            data: { status: "PAID", txHash, paidAt: new Date() },
        });

        // Notify requester if they have an email
        const requesterProfile = await db.userProfile.findUnique({
            where: { address: request.requesterAddress },
        });
        if (requesterProfile?.email) {
            const payerProfile = await db.userProfile.findUnique({
                where: { address: request.recipientAddress },
            });
            await sendRequestPaidEmail({
                to: requesterProfile.email,
                requesterUsername: requesterProfile.username,
                payerAddress: request.recipientAddress,
                payerUsername: payerProfile?.username,
                title: request.title,
                amount: request.amount,
                txHash,
                requestId: request.id,
            });
        }

        return NextResponse.json({ request: updated });
    }

    // CANCEL — only the requester can cancel
    if (action === "cancel") {
        if (!callerAddress || callerAddress.toLowerCase() !== request.requesterAddress)
            return NextResponse.json({ error: "Only the requester can cancel." }, { status: 403 });

        const updated = await db.paymentRequest.update({
            where: { id: request.id },
            data: { status: "CANCELLED" },
        });
        return NextResponse.json({ request: updated });
    }

    return NextResponse.json({ error: "Invalid action. Use 'paid' or 'cancel'." }, { status: 400 });
}