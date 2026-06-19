// ─── Shared types for the Conduit SDK ────────────────────────────────────────

export interface ConduitConfig {
    /** Base URL of your Conduit instance. Defaults to https://conduitpay.xyz */
    baseUrl?: string;
    /** Default wallet address used for owner-scoped calls (creating links, listing, etc.). */
    address?: string;
    /** Optional fetch implementation (for non-browser environments). */
    fetch?: typeof fetch;
}

export interface ConduitError {
    error: string;
    status: number;
}

// ─── Payment Links ───────────────────────────────────────────────────────────

export interface PaymentLink {
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

export interface CreatePaymentLinkInput {
    title: string;
    amount: string | number;
    description?: string;
    recipientAddress?: string; // defaults to config.address
    expiresAt?: string;
    stealth?: boolean;
}

// ─── Escrow ──────────────────────────────────────────────────────────────────

export interface EscrowLink {
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

export interface CreateEscrowInput {
    title: string;
    amount: string | number;
    description?: string;
    sellerAddress?: string; // defaults to config.address
    sellerContact: string;
    deliveryDays: number;
}

// ─── Splits ──────────────────────────────────────────────────────────────────

export interface SplitRecipient {
    address: string;
    percentage: number;
    label?: string;
}

export interface SplitPayout {
    address: string;
    amount: string;
    txHash?: string;
    status: string;
}

export interface SplitLink {
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

export interface CreateSplitInput {
    title: string;
    amount: string | number;
    description?: string;
    creatorAddress?: string; // defaults to config.address
    recipients: SplitRecipient[];
}

// ─── Webhooks ────────────────────────────────────────────────────────────────

export type WebhookEvent =
    | "payment.completed"
    | "escrow.funded"
    | "escrow.released"
    | "escrow.disputed"
    | "escrow.refunded"
    | "split.funded"
    | "split.distributed";

export interface Webhook {
    id: string;
    url: string;
    secret: string;
    events: WebhookEvent[];
    active: boolean;
    failureCount: number;
    lastFiredAt?: string | null;
    createdAt: string;
}

export interface CreateWebhookInput {
    url: string;
    events: WebhookEvent[];
    ownerAddress?: string; // defaults to config.address
}

export interface WebhookEventPayload<T = Record<string, any>> {
    id: string;
    event: WebhookEvent;
    createdAt: string;
    data: T;
}