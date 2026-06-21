import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateAgent, agentSpend } from "@/lib/agentWallet";

export async function POST(req: NextRequest) {
    // 1. Authenticate the agent
    const auth = req.headers.get("authorization") ?? "";
    const apiKey = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const agent = await authenticateAgent(apiKey);
    if (!agent) {
        return NextResponse.json({ error: "Invalid or inactive API key." }, { status: 401 });
    }

    let body: any;
    try { body = await req.json(); } catch {
        return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    // 2. Resolve the target endpoint
    let targetUrl: string | null = null;
    let listingName: string | null = null;

    if (body.listingId) {
        const listing = await db.marketplaceListing.findUnique({ where: { id: body.listingId } });
        if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
        if (listing.status !== "APPROVED") return NextResponse.json({ error: "Listing not active." }, { status: 400 });
        targetUrl = listing.endpoint;
        listingName = listing.name;
    } else if (body.url) {
        targetUrl = body.url;
    } else {
        return NextResponse.json({ error: "Provide a listingId or url." }, { status: 400 });
    }

    if (!targetUrl || !/^https?:\/\//.test(targetUrl)) {
        return NextResponse.json({ error: "Invalid target URL." }, { status: 400 });
    }

    try {
        // 3. Read the x402 paywall (unpaid request → 402 with PAYMENT-REQUIRED)
        const probe = await fetch(targetUrl, { method: "GET", headers: { Accept: "application/json" } });

        // Already free / open — just return it
        if (probe.status === 200) {
            const data = await safeJson(probe);
            return NextResponse.json({ paid: false, source: listingName ?? targetUrl, data });
        }

        if (probe.status !== 402) {
            return NextResponse.json({ error: `Endpoint returned ${probe.status}, expected 402 paywall.` }, { status: 502 });
        }

        const challenge = parsePaymentRequired(probe);
        if (!challenge) {
            return NextResponse.json({ error: "Could not parse x402 payment challenge." }, { status: 502 });
        }

        const { payTo, amountAtomic, decimals } = challenge;
        const amountHuman = (Number(amountAtomic) / Math.pow(10, decimals)).toString();

        // 4. Pay from the agent wallet — guardrails enforced here (allowlist + daily limit)
        const spend = await agentSpend(agent.id, payTo, amountHuman);
        if (!spend.success) {
            return NextResponse.json({
                error: spend.blocked ? `Payment blocked by guardrails: ${spend.error}` : `Payment failed: ${spend.error}`,
                blocked: spend.blocked ?? false,
            }, { status: spend.blocked ? 403 : 502 });
        }

        // 5. Re-request with the on-chain payment proof
        const paidRes = await fetch(targetUrl, {
            method: "GET",
            headers: {
                Accept: "application/json",
                "PAYMENT-SIGNATURE": `tx:${spend.txHash}`,   // Conduit x402 tx-proof format
            },
        });

        if (paidRes.status !== 200) {
            // Payment went through but data fetch failed — report honestly with the tx for reconciliation
            return NextResponse.json({
                error: `Paid ${amountHuman} USDC but endpoint returned ${paidRes.status}.`,
                txHash: spend.txHash,
                paidAmount: amountHuman,
            }, { status: 502 });
        }

        const data = await safeJson(paidRes);

        // 6. Return data + receipt to the agent
        return NextResponse.json({
            paid: true,
            source: listingName ?? targetUrl,
            amountPaid: amountHuman,
            txHash: spend.txHash,
            data,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message ?? "Autonomous fetch failed." }, { status: 500 });
    }
}

async function safeJson(res: Response): Promise<any> {
    const text = await res.text();
    try { return JSON.parse(text); } catch { return text; }
}

/** Parse the x402 PAYMENT-REQUIRED header (base64 JSON) into payTo + amount. */
function parsePaymentRequired(res: Response): { payTo: string; amountAtomic: string; decimals: number } | null {
    try {
        const header = res.headers.get("PAYMENT-REQUIRED") ?? res.headers.get("payment-required");
        if (!header) return null;
        const decoded = JSON.parse(Buffer.from(header, "base64").toString("utf-8"));
        const accept = decoded?.accepts?.[0];
        if (!accept) return null;
        return {
            payTo: accept.payTo,
            amountAtomic: String(accept.maxAmountRequired),
            decimals: 6, // USDC
        };
    } catch {
        return null;
    }
}