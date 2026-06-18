import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { RequestPayClient } from "./client";
import { calculateFee } from "@/lib/fees";
import type { Metadata } from "next";

interface Props { params: { requestId: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const request = await db.paymentRequest.findUnique({ where: { id: params.requestId } });
    if (!request) return { title: "Payment Request Not Found — Conduit" };
    return { title: `Pay ${request.amount} USDC — ${request.title} | Conduit` };
}

export default async function RequestPayPage({ params }: Props) {
    const request = await db.paymentRequest.findUnique({ where: { id: params.requestId } });
    if (!request) return notFound();

    // Auto-expire
    if (request.status === "PENDING" && request.expiresAt && new Date(request.expiresAt) <= new Date()) {
        await db.paymentRequest.update({ where: { id: request.id }, data: { status: "EXPIRED" } });
        request.status = "EXPIRED";
    }

    // Resolve requester's display name / username
    const requesterProfile = await db.userProfile.findUnique({
        where: { address: request.requesterAddress },
        select: { username: true, displayName: true, avatar: true },
    });

    const fee = calculateFee(request.amount);

    return (
        <RequestPayClient
            request={{
                id: request.id,
                requesterAddress: request.requesterAddress,
                recipientAddress: request.recipientAddress,
                amount: request.amount,
                title: request.title,
                note: request.note ?? undefined,
                status: request.status,
                expiresAt: request.expiresAt?.toISOString() ?? undefined,
                txHash: request.txHash ?? undefined,
                paidAt: request.paidAt?.toISOString() ?? undefined,
            }}
            requesterProfile={requesterProfile ?? undefined}
            fee={fee}
        />
    );
}