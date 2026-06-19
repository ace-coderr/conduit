import type {
    ConduitConfig,
    PaymentLink, CreatePaymentLinkInput,
    EscrowLink, CreateEscrowInput,
    SplitLink, CreateSplitInput,
    Webhook, CreateWebhookInput, WebhookEvent,
} from "./types";

const DEFAULT_BASE_URL = "https://conduitpay.xyz";

/** Thrown when the Conduit API returns a non-2xx response. */
export class ConduitApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.name = "ConduitApiError";
        this.status = status;
    }
}

class HttpClient {
    private baseUrl: string;
    private fetchImpl: typeof fetch;

    constructor(baseUrl: string, fetchImpl?: typeof fetch) {
        this.baseUrl = baseUrl.replace(/\/$/, "");
        this.fetchImpl = fetchImpl ?? globalThis.fetch;
        if (!this.fetchImpl) {
            throw new Error("No fetch implementation found. Pass `fetch` in the config (Node <18).");
        }
    }

    async request<T>(method: string, path: string, body?: any): Promise<T> {
        const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
            method,
            headers: { "Content-Type": "application/json" },
            body: body ? JSON.stringify(body) : undefined,
        });

        let data: any;
        try { data = await res.json(); } catch { data = {}; }

        if (!res.ok) {
            throw new ConduitApiError(data?.error ?? `Request failed (${res.status})`, res.status);
        }
        return data as T;
    }
}

// ─── Resource: Payment Links ─────────────────────────────────────────────────

class LinksResource {
    constructor(private http: HttpClient, private cfg: ConduitConfig) { }

    /** Create a payment link. */
    async create(input: CreatePaymentLinkInput): Promise<PaymentLink> {
        const recipientAddress = input.recipientAddress ?? this.cfg.address;
        if (!recipientAddress) throw new Error("recipientAddress required (set it in config or the call).");
        const res = await this.http.request<{ link: PaymentLink }>("POST", "/api/links", {
            title: input.title,
            amount: String(input.amount),
            description: input.description,
            recipientAddress,
            expiresAt: input.expiresAt,
            stealthMode: input.stealth,
        });
        return res.link;
    }

    /** List payment links for an address (defaults to config.address). */
    async list(address?: string): Promise<PaymentLink[]> {
        const addr = address ?? this.cfg.address;
        if (!addr) throw new Error("address required (set it in config or the call).");
        const res = await this.http.request<{ links: PaymentLink[] }>("GET", `/api/links?address=${addr}`);
        return res.links ?? [];
    }

    /** Fetch a single payment link by id. */
    async get(linkId: string): Promise<PaymentLink> {
        const res = await this.http.request<{ link: PaymentLink }>("GET", `/api/links/${linkId}`);
        return res.link;
    }

    /** Full hosted pay URL for a link. */
    payUrl(linkId: string): string {
        return `${(this.cfg.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "")}/pay/${linkId}`;
    }
}

// ─── Resource: Escrow ────────────────────────────────────────────────────────

class EscrowResource {
    constructor(private http: HttpClient, private cfg: ConduitConfig) { }

    /** Create an escrow link. */
    async create(input: CreateEscrowInput): Promise<EscrowLink> {
        const sellerAddress = input.sellerAddress ?? this.cfg.address;
        if (!sellerAddress) throw new Error("sellerAddress required (set it in config or the call).");
        const res = await this.http.request<{ escrow: EscrowLink }>("POST", "/api/escrow", {
            title: input.title,
            amount: String(input.amount),
            description: input.description,
            sellerAddress,
            sellerContact: input.sellerContact,
            deliveryDays: input.deliveryDays,
        });
        return res.escrow;
    }

    /** List escrows for an address (as seller). */
    async list(address?: string): Promise<EscrowLink[]> {
        const addr = address ?? this.cfg.address;
        if (!addr) throw new Error("address required (set it in config or the call).");
        const res = await this.http.request<{ escrows: EscrowLink[] }>("GET", `/api/escrow?address=${addr}`);
        return res.escrows ?? [];
    }

    /** Fetch a single escrow by id. */
    async get(escrowId: string): Promise<EscrowLink> {
        const res = await this.http.request<{ escrow: EscrowLink }>("GET", `/api/escrow/${escrowId}`);
        return res.escrow;
    }

    /** Hosted pay URL for an escrow. */
    payUrl(escrowId: string): string {
        return `${(this.cfg.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "")}/escrow/${escrowId}`;
    }
}

// ─── Resource: Splits ────────────────────────────────────────────────────────

class SplitsResource {
    constructor(private http: HttpClient, private cfg: ConduitConfig) { }

    /** Create a split payment link. Percentages must sum to 100. */
    async create(input: CreateSplitInput): Promise<SplitLink> {
        const creatorAddress = input.creatorAddress ?? this.cfg.address;
        if (!creatorAddress) throw new Error("creatorAddress required (set it in config or the call).");

        const sum = input.recipients.reduce((s, r) => s + r.percentage, 0);
        if (Math.abs(sum - 100) > 0.05) {
            throw new Error(`Recipient percentages must sum to 100 (got ${sum}).`);
        }

        const res = await this.http.request<{ split: SplitLink }>("POST", "/api/splits", {
            title: input.title,
            amount: String(input.amount),
            description: input.description,
            creatorAddress,
            recipients: input.recipients,
        });
        return res.split;
    }

    /** List splits created by an address. */
    async list(address?: string): Promise<SplitLink[]> {
        const addr = address ?? this.cfg.address;
        if (!addr) throw new Error("address required (set it in config or the call).");
        const res = await this.http.request<{ splits: SplitLink[] }>("GET", `/api/splits?address=${addr}`);
        return res.splits ?? [];
    }

    /** Fetch a single split by id. */
    async get(splitId: string): Promise<SplitLink> {
        const res = await this.http.request<{ split: SplitLink }>("GET", `/api/splits/${splitId}`);
        return res.split;
    }

    /** Hosted pay URL for a split. */
    payUrl(splitId: string): string {
        return `${(this.cfg.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "")}/pay/split/${splitId}`;
    }
}

// ─── Resource: Webhooks ──────────────────────────────────────────────────────

class WebhooksResource {
    constructor(private http: HttpClient, private cfg: ConduitConfig) { }

    /** Register a webhook endpoint. Returns the webhook including its signing secret (shown once). */
    async create(input: CreateWebhookInput): Promise<Webhook> {
        const ownerAddress = input.ownerAddress ?? this.cfg.address;
        if (!ownerAddress) throw new Error("ownerAddress required (set it in config or the call).");
        const res = await this.http.request<{ webhook: Webhook }>("POST", "/api/webhooks", {
            ownerAddress,
            url: input.url,
            events: input.events,
        });
        return res.webhook;
    }

    /** List webhooks for an address. */
    async list(address?: string): Promise<Webhook[]> {
        const addr = address ?? this.cfg.address;
        if (!addr) throw new Error("address required (set it in config or the call).");
        const res = await this.http.request<{ webhooks: Webhook[] }>("GET", `/api/webhooks?address=${addr}`);
        return res.webhooks ?? [];
    }

    /** Update a webhook's events, url, or active state. */
    async update(
        webhookId: string,
        changes: { url?: string; events?: WebhookEvent[]; active?: boolean },
        callerAddress?: string
    ): Promise<Webhook> {
        const addr = callerAddress ?? this.cfg.address;
        if (!addr) throw new Error("callerAddress required.");
        const res = await this.http.request<{ webhook: Webhook }>("PATCH", `/api/webhooks/${webhookId}`, {
            callerAddress: addr, ...changes,
        });
        return res.webhook;
    }

    /** Send a test ping to a webhook. */
    async test(webhookId: string, callerAddress?: string): Promise<{ success: boolean; statusCode?: number; error?: string }> {
        const addr = callerAddress ?? this.cfg.address;
        if (!addr) throw new Error("callerAddress required.");
        return this.http.request("PATCH", `/api/webhooks/${webhookId}`, { callerAddress: addr, action: "test" });
    }

    /** Delete a webhook. */
    async delete(webhookId: string, callerAddress?: string): Promise<void> {
        const addr = callerAddress ?? this.cfg.address;
        if (!addr) throw new Error("callerAddress required.");
        await this.http.request("DELETE", `/api/webhooks/${webhookId}?address=${addr}`);
    }
}

// ─── Main client ─────────────────────────────────────────────────────────────

export class ConduitClient {
    readonly links: LinksResource;
    readonly escrow: EscrowResource;
    readonly splits: SplitsResource;
    readonly webhooks: WebhooksResource;

    constructor(config: ConduitConfig = {}) {
        const cfg: ConduitConfig = { baseUrl: DEFAULT_BASE_URL, ...config };
        const http = new HttpClient(cfg.baseUrl!, cfg.fetch);
        this.links = new LinksResource(http, cfg);
        this.escrow = new EscrowResource(http, cfg);
        this.splits = new SplitsResource(http, cfg);
        this.webhooks = new WebhooksResource(http, cfg);
    }
}