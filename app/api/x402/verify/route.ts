import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, getAddress } from "viem";
import { arcTestnet } from "@/lib/arcChain";

const arcClient = createPublicClient({
    chain: arcTestnet,
    transport: http("https://rpc.testnet.arc.network"),
});

const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

const EIP3009_ABI = [
    {
        name: "transferWithAuthorization",
        type: "function",
        inputs: [
            { name: "from", type: "address" },
            { name: "to", type: "address" },
            { name: "value", type: "uint256" },
            { name: "validAfter", type: "uint256" },
            { name: "validBefore", type: "uint256" },
            { name: "nonce", type: "bytes32" },
            { name: "v", type: "uint8" },
            { name: "r", type: "bytes32" },
            { name: "s", type: "bytes32" },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
    {
        name: "authorizationState",
        type: "function",
        inputs: [
            { name: "authorizer", type: "address" },
            { name: "nonce", type: "bytes32" },
        ],
        outputs: [{ name: "", type: "bool" }],
        stateMutability: "view",
    },
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

        const { from, to, value, validAfter, validBefore, nonce } = paymentData;

        if (!from || !to || !value || !nonce) {
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
            return NextResponse.json({
                isValid: false,
                error: `Insufficient payment. Required ${requiredAmount}, got ${value}`,
            }, { status: 400 });
        }

        const expectedTo = getAddress(paymentDetails.payTo ?? paymentDetails.to);
        const actualTo = getAddress(to);
        if (actualTo.toLowerCase() !== expectedTo.toLowerCase()) {
            return NextResponse.json({
                isValid: false,
                error: `Wrong recipient. Expected ${expectedTo}, got ${actualTo}`,
            }, { status: 400 });
        }

        // Check nonce not already used
        const nonceUsed = await arcClient.readContract({
            address: USDC_ADDRESS as `0x${string}`,
            abi: EIP3009_ABI,
            functionName: "authorizationState",
            args: [from as `0x${string}`, nonce as `0x${string}`],
        });

        if (nonceUsed) {
            return NextResponse.json({ isValid: false, error: "Payment nonce already used" }, { status: 400 });
        }

        // Check balance
        const balance = await arcClient.readContract({
            address: USDC_ADDRESS as `0x${string}`,
            abi: EIP3009_ABI,
            functionName: "balanceOf",
            args: [from as `0x${string}`],
        });

        if (balance < BigInt(value)) {
            return NextResponse.json({
                isValid: false,
                error: `Insufficient USDC balance. Has ${balance}, needs ${value}`,
            }, { status: 400 });
        }

        return NextResponse.json({
            isValid: true,
            networkId: `eip155:${arcTestnet.id}`,
            payer: from,
            amount: value.toString(),
            token: USDC_ADDRESS,
        });

    } catch (err: any) {
        console.error("[x402/verify] Error:", err);
        return NextResponse.json({ isValid: false, error: err.message ?? "Verification failed" }, { status: 500 });
    }
}