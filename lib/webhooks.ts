import crypto from "crypto";
import { db } from "@/lib/db";

export type WebhookEvent =
    | "payment.completed"
    | "escrow.funded"
    | "escrow.released"
    | "escrow.disputed"
    | "escrow.refunded"
    | "split.funded"
    | "split.distributed";

export const ALL_WEBHOOK_EVENTS: WebhookEvent[] = [
    "payment.completed",
    "escrow.funded",
    "escrow.released",
    "escrow.disputed",
    "escrow.refunded",
    "split.funded",
    "split.distributed",
];

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 500;
const AUTO_DISABLE_THRESHOLD = 15; // consecutive failures before auto-disabling

function sign(secret: string, body: string): string {
    return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

export function generateWebhookSecret(): string {
    return "whsec_" + crypto.randomBytes(24).toString("hex");
}

async function deliver(
    webhook: { id: string; url: string; secret: string },
    event: WebhookEvent,
    payload: Record<string, any>
): Promise<{ success: boolean; statusCode?: number; error?: string; attempts: number }> {
    const envelope = {
        id: crypto.randomUUID(),
        event,
        createdAt: new Date().toISOString(),
        data: payload,
    };
    const body = JSON.stringify(envelope);
    const signature = sign(webhook.secret, body);

    let lastError = "";
    let lastStatus: number | undefined;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10_000);
            const res = await fetch(webhook.url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Conduit-Event": event,
                    "X-Conduit-Signature": signature,
                    "X-Conduit-Delivery": envelope.id,
                    "User-Agent": "Conduit-Webhooks/1.0",
                },
                body,
                signal: controller.signal,
            });
            clearTimeout(timeout);
            lastStatus = res.status;

            if (res.ok) {
                return { success: true, statusCode: res.status, attempts: attempt };
            }
            lastError = `HTTP ${res.status}`;
        } catch (err: any) {
            lastError = err?.name === "AbortError" ? "Timeout (10s)" : (err?.message ?? "Network error");
        }

        if (attempt < MAX_ATTEMPTS) {
            await new Promise(r => setTimeout(r, BASE_DELAY_MS * Math.pow(2, attempt - 1)));
        }
    }

    return { success: false, statusCode: lastStatus, error: lastError, attempts: MAX_ATTEMPTS };
}

/**
 * Fire an event to all active webhooks for an owner that subscribe to it.
 * Fire-and-forget safe: never throws into the caller. Logs each delivery.
 */
export async function fireWebhook(
    ownerAddress: string,
    event: WebhookEvent,
    payload: Record<string, any>
): Promise<void> {
    try {
        const owner = ownerAddress.toLowerCase();
        const hooks = await db.webhook.findMany({
            where: { ownerAddress: owner, active: true, events: { has: event } },
        });
        if (hooks.length === 0) return;

        await Promise.all(hooks.map(async (hook) => {
            const result = await deliver(hook, event, payload);

            await db.webhookDelivery.create({
                data: {
                    webhookId: hook.id,
                    event,
                    payload: payload as any,
                    statusCode: result.statusCode ?? null,
                    success: result.success,
                    errorMessage: result.error ?? null,
                    attempts: result.attempts,
                },
            });

            if (result.success) {
                await db.webhook.update({
                    where: { id: hook.id },
                    data: { failureCount: 0, lastFiredAt: new Date() },
                });
            } else {
                const newCount = hook.failureCount + 1;
                await db.webhook.update({
                    where: { id: hook.id },
                    data: {
                        failureCount: newCount,
                        lastFiredAt: new Date(),
                        active: newCount >= AUTO_DISABLE_THRESHOLD ? false : true,
                    },
                });
            }
        }));
    } catch (err: any) {
        console.error("[fireWebhook] error:", err?.message);
    }
}

/** Send a test ping to a single webhook (used by the dashboard test button). */
export async function testWebhook(webhookId: string): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    const hook = await db.webhook.findUnique({ where: { id: webhookId } });
    if (!hook) return { success: false, error: "Webhook not found" };

    const result = await deliver(hook, "payment.completed", {
        test: true,
        message: "This is a test event from Conduit.",
        timestamp: new Date().toISOString(),
    });

    await db.webhookDelivery.create({
        data: {
            webhookId: hook.id,
            event: "payment.completed",
            payload: { test: true } as any,
            statusCode: result.statusCode ?? null,
            success: result.success,
            errorMessage: result.error ?? null,
            attempts: result.attempts,
        },
    });

    return { success: result.success, statusCode: result.statusCode, error: result.error };
}