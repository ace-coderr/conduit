import { NextRequest, NextResponse } from "next/server";
import { BatchFacilitatorClient } from "@circle-fin/x402-batching/server";
import { createPublicClient, http, getAddress } from "viem";
import { arcTestnet } from "@/lib/arcChain";

const PAYMENT_ADDRESS = "0x2d2eba8c0da5879ab25b5bd37e211d230aabbb5c";
const USDC = "0x3600000000000000000000000000000000000000";
const NETWORK = "eip155:5042002";

const facilitator = new BatchFacilitatorClient({
    url: "https://gateway-api-testnet.circle.com",
});

const arcClient = createPublicClient({
    chain: arcTestnet,
    transport: http("https://rpc.testnet.arc.network"),
});

const USDC_ABI = [
    {
        name: "balanceOf",
        type: "function",
        inputs: [{ name: "account", type: "address" }],
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
    },
] as const;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { payload, paymentDetails } = body;

        if (!payload || !paymentDetails) {
            return NextResponse.json({ isValid: false, error: "Missing payload or paymentDetails" }, { status: 400 });
        }

        let paymentData: any;
        try {
            paymentData = JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
        } catch {
            return NextResponse.json({ isValid: false, error: "Invalid payment payload encoding" }, { status: 400 });
        }

        const { from, to, value, validAfter, validBefore } = paymentData;

        if (!from || !to || !value) {
            return NextResponse.json({ isValid: false, error: "Missing required payment fields" }, { status: 400 });
        }

        const now = Math.floor(Date.now() / 1000);
        if (BigInt(validAfter) > BigInt(now)) {
            return NextResponse.json({ isValid: false, error: "Payment not yet valid" }, { status: 400 });
        }
        if (BigInt(validBefore) < BigInt(now)) {
            return NextResponse.json({ isValid: false, error: "Payment authorization expired" }, { status: 400 });
        }

        const requiredAmount = BigInt(paymentDetails.maxAmountRequired ?? paymentDetails.amount ?? 0);
        if (BigInt(value) < requiredAmount) {
            return NextResponse.json({ isValid: false, error: `Insufficient payment: got ${value}, need ${requiredAmount}` }, { status: 400 });
        }

        const expectedTo = getAddress(paymentDetails.payTo ?? paymentDetails.to);
        if (getAddress(to).toLowerCase() !== expectedTo.toLowerCase()) {
            return NextResponse.json({ isValid: false, error: `Wrong recipient: ${to}` }, { status: 400 });
        }

        // Check balance
        const balance = await arcClient.readContract({
            address: USDC as `0x${string}`,
            abi: USDC_ABI,
            functionName: "balanceOf",
            args: [from as `0x${string}`],
        });

        if (balance < BigInt(value)) {
            return NextResponse.json({ isValid: false, error: `Insufficient balance: has ${balance}, needs ${value}` }, { status: 400 });
        }

        return NextResponse.json({
            isValid: true,
            networkId: NETWORK,
            payer: from,
            amount: value.toString(),
            token: USDC,
        });

    } catch (err: any) {
        console.error("[x402/verify] Error:", err.message);
        return NextResponse.json({ isValid: false, error: err.message ?? "Verification failed" }, { status: 500 });
    }
}