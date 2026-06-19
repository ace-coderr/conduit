interface ConduitConfig {
    /** Base URL of your Conduit instance. Defaults to https://conduitpay.xyz */
    baseUrl?: string;
    /** Default wallet address used for owner-scoped calls (creating links, listing, etc.). */
    address?: string;
    /** Optional fetch implementation (for non-browser environments). */
    fetch?: typeof fetch;
}
interface PaymentLink {
    id: string;
    title: string;
    description?: string | null;
    amount: string;
    recipientAddress: string;
    status: string;
    txHash?: string | null;
    paidBy?: string | null;
    paidAt?: string | null;
    expiresAt?: string | null;
    createdAt: string;
}
interface CreatePaymentLinkInput {
    title: string;
    amount: string | number;
    description?: string;
    recipientAddress?: string;
    expiresAt?: string;
    stealth?: boolean;
}
interface EscrowLink {
    id: string;
    title: string;
    description?: string | null;
    amount: string;
    sellerAddress: string;
    buyerAddress?: string | null;
    status: string;
    deliveryDays?: number | null;
    txHash?: string | null;
    releaseTxHash?: string | null;
    createdAt: string;
}
interface CreateEscrowInput {
    title: string;
    amount: string | number;
    description?: string;
    sellerAddress?: string;
    sellerContact: string;
    deliveryDays: number;
}
interface SplitRecipient {
    address: string;
    percentage: number;
    label?: string;
}
interface SplitPayout {
    address: string;
    amount: string;
    txHash?: string;
    status: string;
}
interface SplitLink {
    id: string;
    title: string;
    description?: string | null;
    amount: string;
    creatorAddress: string;
    splitAddress: string;
    recipients: SplitRecipient[];
    status: string;
    txHash?: string | null;
    payouts?: SplitPayout[] | null;
    createdAt: string;
}
interface CreateSplitInput {
    title: string;
    amount: string | number;
    description?: string;
    creatorAddress?: string;
    recipients: SplitRecipient[];
}
type WebhookEvent = "payment.completed" | "escrow.funded" | "escrow.released" | "escrow.disputed" | "escrow.refunded" | "split.funded" | "split.distributed";
interface Webhook {
    id: string;
    url: string;
    secret: string;
    events: WebhookEvent[];
    active: boolean;
    failureCount: number;
    lastFiredAt?: string | null;
    createdAt: string;
}
interface CreateWebhookInput {
    url: string;
    events: WebhookEvent[];
    ownerAddress?: string;
}
interface WebhookEventPayload<T = Record<string, any>> {
    id: string;
    event: WebhookEvent;
    createdAt: string;
    data: T;
}

/** Thrown when the Conduit API returns a non-2xx response. */
declare class ConduitApiError extends Error {
    status: number;
    constructor(message: string, status: number);
}
declare class HttpClient {
    private baseUrl;
    private fetchImpl;
    constructor(baseUrl: string, fetchImpl?: typeof fetch);
    request<T>(method: string, path: string, body?: any): Promise<T>;
}
declare class LinksResource {
    private http;
    private cfg;
    constructor(http: HttpClient, cfg: ConduitConfig);
    /** Create a payment link. */
    create(input: CreatePaymentLinkInput): Promise<PaymentLink>;
    /** List payment links for an address (defaults to config.address). */
    list(address?: string): Promise<PaymentLink[]>;
    /** Fetch a single payment link by id. */
    get(linkId: string): Promise<PaymentLink>;
    /** Full hosted pay URL for a link. */
    payUrl(linkId: string): string;
}
declare class EscrowResource {
    private http;
    private cfg;
    constructor(http: HttpClient, cfg: ConduitConfig);
    /** Create an escrow link. */
    create(input: CreateEscrowInput): Promise<EscrowLink>;
    /** List escrows for an address (as seller). */
    list(address?: string): Promise<EscrowLink[]>;
    /** Fetch a single escrow by id. */
    get(escrowId: string): Promise<EscrowLink>;
    /** Hosted pay URL for an escrow. */
    payUrl(escrowId: string): string;
}
declare class SplitsResource {
    private http;
    private cfg;
    constructor(http: HttpClient, cfg: ConduitConfig);
    /** Create a split payment link. Percentages must sum to 100. */
    create(input: CreateSplitInput): Promise<SplitLink>;
    /** List splits created by an address. */
    list(address?: string): Promise<SplitLink[]>;
    /** Fetch a single split by id. */
    get(splitId: string): Promise<SplitLink>;
    /** Hosted pay URL for a split. */
    payUrl(splitId: string): string;
}
declare class WebhooksResource {
    private http;
    private cfg;
    constructor(http: HttpClient, cfg: ConduitConfig);
    /** Register a webhook endpoint. Returns the webhook including its signing secret (shown once). */
    create(input: CreateWebhookInput): Promise<Webhook>;
    /** List webhooks for an address. */
    list(address?: string): Promise<Webhook[]>;
    /** Update a webhook's events, url, or active state. */
    update(webhookId: string, changes: {
        url?: string;
        events?: WebhookEvent[];
        active?: boolean;
    }, callerAddress?: string): Promise<Webhook>;
    /** Send a test ping to a webhook. */
    test(webhookId: string, callerAddress?: string): Promise<{
        success: boolean;
        statusCode?: number;
        error?: string;
    }>;
    /** Delete a webhook. */
    delete(webhookId: string, callerAddress?: string): Promise<void>;
}
declare class ConduitClient {
    readonly links: LinksResource;
    readonly escrow: EscrowResource;
    readonly splits: SplitsResource;
    readonly webhooks: WebhooksResource;
    constructor(config?: ConduitConfig);
}

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
declare function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean;
/**
 * Verify and parse a webhook payload in one step.
 * Throws if the signature is invalid.
 */
declare function constructWebhookEvent<T = Record<string, any>>(rawBody: string, signature: string, secret: string): WebhookEventPayload<T>;

export { ConduitApiError, ConduitClient, type ConduitConfig, type CreateEscrowInput, type CreatePaymentLinkInput, type CreateSplitInput, type CreateWebhookInput, type EscrowLink, type PaymentLink, type SplitLink, type SplitPayout, type SplitRecipient, type Webhook, type WebhookEvent, type WebhookEventPayload, constructWebhookEvent, verifyWebhookSignature };
