import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAdminQuery } from "@/lib/adminAuth";
import { transferFromWallet } from "@/lib/circle";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

interface RouteParams { params: { linkId: string } }

// ─── Call Gemini API ──────────────────────────────────────────────────────────

async function getGeminiVerdict(prompt: string): Promise<{
    decision: "RELEASE" | "REFUND" | "UNCERTAIN";
    confidence: number;
    reasoning: string;
    summary: string;
}> {
    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 1024,
                responseMimeType: "application/json",
            },
        }),
    });

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error("No response from Gemini");

    try {
        const parsed = JSON.parse(text);
        return {
            decision: parsed.decision ?? "UNCERTAIN",
            confidence: Math.min(100, Math.max(0, parseInt(parsed.confidence ?? "50"))),
            reasoning: parsed.reasoning ?? "No reasoning provided",
            summary: parsed.summary ?? "No summary provided",
        };
    } catch {
        throw new Error("Failed to parse Gemini response");
    }
}

// ─── Build dispute prompt ─────────────────────────────────────────────────────

function buildDisputePrompt(escrow: any, messages: any[]): string {
    const msgThread = messages.map(m => `[${m.sender}]: ${m.message}`).join("\n");

    return `You are an impartial AI mediator for a USDC payment dispute on Conduit Pay. Analyze this escrow dispute and deliver a binding verdict.

## ESCROW DETAILS
- Title: ${escrow.title}
- Description: ${escrow.description ?? "No description"}
- Amount: ${escrow.amount} USDC
- Seller: ${escrow.sellerAddress}
- Buyer: ${escrow.buyerAddress ?? "Unknown"}
- Delivery window: ${escrow.deliveryDays ?? 7} days
- Paid at: ${escrow.paidAt ?? "Unknown"}
- Delivery deadline: ${escrow.deliveryDeadline ?? "Unknown"}
- Dispute opened: ${escrow.disputedAt ?? "Unknown"}
- Dispute reason: ${escrow.disputeReason ?? "No reason given"}

## DISPUTE THREAD
${msgThread || "No messages yet"}

## YOUR TASK
Analyze the evidence above and return a JSON verdict with these exact fields:

{
  "decision": "RELEASE" or "REFUND" or "UNCERTAIN",
  "confidence": <number 0-100>,
  "reasoning": "<detailed explanation of your decision, max 500 chars>",
  "summary": "<one sentence verdict, max 100 chars>"
}

## DECISION RULES
- RELEASE (funds go to seller): Seller provided convincing delivery evidence, buyer's dispute is weak or unsubstantiated, buyer went silent after being challenged
- REFUND (funds go to buyer): Seller failed to deliver, seller ignored dispute, seller has no evidence, delivery clearly failed
- UNCERTAIN (human review needed): Evidence is genuinely ambiguous, both sides have valid claims, insufficient information

## CONFIDENCE RULES
- 90-100: Clear-cut case, strong evidence on one side
- 70-89: Likely correct but some ambiguity
- 50-69: Leaning one way but uncertain
- Below 50: Use UNCERTAIN instead

Return ONLY valid JSON. No markdown, no explanation outside the JSON.`;
}

// ─── Main route ───────────────────────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: RouteParams) {
    // Admin only
    const { ok, error } = verifyAdminQuery(req);
    if (!ok) return NextResponse.json({ error }, { status: 401 });

    const escrow = await db.escrowLink.findUnique({
        where: { id: params.linkId },
        select: {
            id: true, title: true, description: true, amount: true,
            sellerAddress: true, buyerAddress: true, status: true,
            paidAt: true, deliveryDays: true, deliveryDeadline: true,
            disputedAt: true, disputeReason: true, circleWalletId: true,
            releaseTxHash: true,
        },
    });

    if (!escrow) return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
    if (!["DISPUTED", "MEDIATION"].includes(escrow.status)) {
        return NextResponse.json({ error: "Escrow is not in dispute" }, { status: 400 });
    }
    if (escrow.releaseTxHash) {
        return NextResponse.json({ error: "Escrow already resolved" }, { status: 400 });
    }

    // Fetch all messages
    const messages = await db.escrowMessage.findMany({
        where: { escrowId: params.linkId },
        orderBy: { createdAt: "asc" },
    });

    // Get AI verdict
    let verdict: Awaited<ReturnType<typeof getGeminiVerdict>>;
    try {
        const prompt = buildDisputePrompt(escrow, messages);
        verdict = await getGeminiVerdict(prompt);
    } catch (err: any) {
        console.error("[ai-verdict] Gemini error:", err.message);
        return NextResponse.json({ error: `AI analysis failed: ${err.message}` }, { status: 500 });
    }

    // Save verdict to DB
    await db.escrowLink.update({
        where: { id: params.linkId },
        data: {
            aiVerdict: verdict.decision,
            aiConfidence: verdict.confidence,
            aiReasoning: verdict.reasoning,
            aiVerdictAt: new Date(),
        },
    });

    // Add system message to thread
    const verdictEmoji = verdict.decision === "RELEASE" ? "✅" : verdict.decision === "REFUND" ? "🔄" : "⚠️";
    await db.escrowMessage.create({
        data: {
            escrowId: params.linkId,
            sender: "SYSTEM",
            message: `${verdictEmoji} AI Mediator verdict: ${verdict.summary} (Confidence: ${verdict.confidence}%)`,
        },
    });

    // Auto-execute if confidence >= 80 and decision is not UNCERTAIN
    let executed = false;
    let txHash: string | undefined;

    if (verdict.confidence >= 80 && verdict.decision !== "UNCERTAIN" && escrow.circleWalletId) {
        try {
            if (verdict.decision === "RELEASE") {
                // Release to seller
                await db.escrowLink.update({
                    where: { id: params.linkId },
                    data: { status: "CONFIRMED", confirmedAt: new Date() },
                });
                const result = await transferFromWallet(
                    escrow.circleWalletId,
                    escrow.sellerAddress,
                    escrow.amount
                );
                if (result.success && result.txHash) {
                    txHash = result.txHash;
                    await db.escrowLink.update({
                        where: { id: params.linkId },
                        data: { status: "RELEASED", releaseTxHash: result.txHash },
                    });
                    await db.escrowMessage.create({
                        data: {
                            escrowId: params.linkId,
                            sender: "SYSTEM",
                            message: `✅ Funds automatically released to seller by AI Mediator. Transaction: ${result.txHash.slice(0, 10)}...`,
                        },
                    });
                    executed = true;
                }
            } else if (verdict.decision === "REFUND") {
                // Refund to buyer
                if (escrow.buyerAddress) {
                    const result = await transferFromWallet(
                        escrow.circleWalletId,
                        escrow.buyerAddress,
                        escrow.amount
                    );
                    if (result.success && result.txHash) {
                        txHash = result.txHash;
                        await db.escrowLink.update({
                            where: { id: params.linkId },
                            data: { status: "CANCELLED", releaseTxHash: result.txHash },
                        });
                        await db.escrowMessage.create({
                            data: {
                                escrowId: params.linkId,
                                sender: "SYSTEM",
                                message: `🔄 Funds automatically refunded to buyer by AI Mediator. Transaction: ${result.txHash.slice(0, 10)}...`,
                            },
                        });
                        executed = true;
                    }
                }
            }
        } catch (err: any) {
            console.error("[ai-verdict] Auto-execute failed:", err.message);
            // Don't fail the request — verdict was saved, admin can still execute manually
        }
    }

    return NextResponse.json({
        verdict: {
            decision: verdict.decision,
            confidence: verdict.confidence,
            reasoning: verdict.reasoning,
            summary: verdict.summary,
        },
        executed,
        txHash,
        autoExecuted: executed,
        requiresManualReview: !executed && verdict.decision !== "UNCERTAIN",
    });
}