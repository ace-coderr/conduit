import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAdmin } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
    const { ok, error } = verifyAdmin(req);
    if (!ok) return NextResponse.json({ error }, { status: 401 });

    try {
        const [
            splits,
            webhooks,
            webhookDeliveries,
            agents,
            agentTxs,
            telegramLinked,
        ] = await Promise.all([
            db.splitLink.findMany({
                orderBy: { createdAt: "desc" },
                select: {
                    id: true, title: true, amount: true, status: true,
                    creatorAddress: true, recipients: true, txHash: true,
                    paidBy: true, paidAt: true, distributedAt: true, createdAt: true,
                },
            }),
            db.webhook.findMany({
                select: { id: true, active: true, events: true, failureCount: true, lastFiredAt: true },
            }),
            db.webhookDelivery.findMany({
                select: { success: true },
            }),
            db.agentWallet.findMany({
                select: { id: true, name: true, active: true, totalSpent: true, txCount: true, dailyLimit: true, allowedRecipients: true },
            }),
            db.agentTransaction.findMany({
                select: { status: true, amount: true },
            }),
            db.telegramConnection.count({ where: { linked: true } }),
        ]);

        // ── Splits aggregation ──
        const splitVolume = splits
            .filter(s => s.paidAt)
            .reduce((sum, s) => sum + parseFloat(s.amount || "0"), 0);
        const splitsDistributed = splits.filter(s => s.status === "COMPLETED").length;

        // ── Webhooks aggregation ──
        const activeWebhooks = webhooks.filter(w => w.active).length;
        const deliveriesOk = webhookDeliveries.filter(d => d.success).length;
        const deliveriesFailed = webhookDeliveries.length - deliveriesOk;
        const deliverySuccessRate = webhookDeliveries.length > 0
            ? Math.round((deliveriesOk / webhookDeliveries.length) * 100)
            : null;

        // ── Agents aggregation ──
        const activeAgents = agents.filter(a => a.active).length;
        const agentVolume = agents.reduce((sum, a) => sum + parseFloat(a.totalSpent || "0"), 0);
        const agentTxSent = agentTxs.filter(t => t.status === "SENT").length;
        const agentTxBlocked = agentTxs.filter(t => t.status === "BLOCKED").length;

        return NextResponse.json({
            splits: {
                total: splits.length,
                volume: splitVolume,
                distributed: splitsDistributed,
                list: splits,
            },
            webhooks: {
                total: webhooks.length,
                active: activeWebhooks,
                deliveries: webhookDeliveries.length,
                deliveriesOk,
                deliveriesFailed,
                successRate: deliverySuccessRate,
            },
            agents: {
                total: agents.length,
                active: activeAgents,
                volume: agentVolume,
                txSent: agentTxSent,
                txBlocked: agentTxBlocked,
            },
            telegram: {
                linked: telegramLinked,
            },
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}