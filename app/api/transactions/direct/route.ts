import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
    const { title, amount, recipientAddress, paidBy, txHash } = await req.json();

    if (!recipientAddress || !amount || !txHash) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const link = await db.paymentLink.create({
        data: {
            title: title ?? "Direct Payment",
            amount: parseFloat(amount).toString(),
            recipientAddress: recipientAddress.toLowerCase(),
            paidBy: paidBy?.toLowerCase() ?? null,
            txHash,
            status: "COMPLETED",
            paidAt: new Date(),
        },
    });

    return NextResponse.json({ link });
}