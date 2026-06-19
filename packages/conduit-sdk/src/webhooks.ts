import crypto from "crypto";
import type { WebhookEventPayload } from "./types";

/**
 * Verify a Conduit webhook signature.
 *
 * Conduit signs every delivery with HMAC-SHA256 over the raw request body,
 * using your webhook's signing secret. The signature is sent in the
 * `X-Conduit-Signature` header.
 *
 * @param rawBody  The exact raw request body string (do NOT re-stringify parsed JSON).
 * @param signature The value of the `X-Conduit-Signature` header.
 * @param secret    Your webhook signing secret (whsec_...).
 * @returns true if the signature is valid.
 *
 * @example
 * // Next.js route handler
 * export async function POST(req: Request) {
 *   const raw = await req.text();
 *   const sig = req.headers.get("x-conduit-signature") ?? "";
 *   if (!verifyWebhookSignature(raw, sig, process.env.CONDUIT_WEBHOOK_SECRET!)) {
 *     return new Response("Invalid signature", { status: 401 });
 *   }
 *   const event = JSON.parse(raw);
 *   // handle event.event / event.data ...
 *   return new Response("ok");
 * }
 */
export function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
    if (!signature || !secret) return false;
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    // Constant-time comparison to avoid timing attacks
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

/**
 * Verify and parse a webhook payload in one step.
 * Throws if the signature is invalid.
 */
export function constructWebhookEvent<T = Record<string, any>>(
    rawBody: string,
    signature: string,
    secret: string
): WebhookEventPayload<T> {
    if (!verifyWebhookSignature(rawBody, signature, secret)) {
        throw new Error("Invalid webhook signature.");
    }
    return JSON.parse(rawBody) as WebhookEventPayload<T>;
}