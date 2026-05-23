import { NextRequest, NextResponse } from "next/server";
import { BatchFacilitatorClient } from "@circle-fin/x402-batching/server";
import { db } from "@/lib/db";

const PAYMENT_ADDRESS = "0x2d2eba8c0da5879ab25b5bd37e211d230aabbb5c";
const USDC = "0x3600000000000000000000000000000000000000";
const NETWORK = "eip155:5042002";

const facilitator = new BatchFacilitatorClient({
    url: "https://gateway-api-testnet.circle.com",
});

const baseRequirements = {
    scheme: "exact",
    network: NETWORK,
    asset: USDC,
    maxTimeoutSeconds: 604900,
    payTo: PAYMENT_ADDRESS,
    extra: {
        name: "GatewayWalletBatched",
        version: "1",
    },
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { payload, paymentDetails } = body;

        if (!payload || !paymentDetails) {
            return NextResponse.json({ success: false, error: "Missing payload or paymentDetails" }, { status: 400 });
        }

        let paymentData: any;
        try {
            paymentData = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
        } catch {
            return NextResponse.json({ success: false, error: "Invalid payment payload encoding" }, { status: 400 });
        }

        const settlement = await facilitator.settle(paymentData, {
            ...baseRequirements,
            amount: paymentDetails.maxAmountRequired ?? "1000",
            resource: paymentDetails.resource ?? "unknown",
        } as any);

        if (!settlement.success) {
            console.error("[x402/settle] Settlement failed:", settlement);
            return NextResponse.json({ success: false, error: "Settlement failed" }, { status: 400 });
        }

        // Save to DB for admin dashboard
        try {
            await db.x402Payment.create({
                data: {
                    txHash: (settlement as any).transaction ?? `batch-${Date.now()}`,
                    payer: (paymentData.from ?? "unknown").toLowerCase(),
                    payTo: PAYMENT_ADDRESS.toLowerCase(),
                    amount: (parseInt(paymentDetails.maxAmountRequired ?? "1000") / 1_000_000).toFixed(6),
                    network: NETWORK,
                    resource: paymentDetails.resource ?? "unknown",
                    nonce: paymentData.nonce ?? `${Date.now()}`,
                    settledAt: new Date(),
                },
            });
        } catch { }

        return NextResponse.json({
            success: true,
            transaction: (settlement as any).transaction,
            network: NETWORK,
            payer: paymentData.from,
        });

    } catch (err: any) {
        console.error("[x402/settle] Error:", err.message);
        return NextResponse.json({
            success: false,
            error: err.message ?? "Settlement failed",
        }, { status: 500 });
    }
}