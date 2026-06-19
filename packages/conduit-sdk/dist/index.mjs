// src/client.ts
var DEFAULT_BASE_URL = "https://conduitpay.xyz";
var ConduitApiError = class extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ConduitApiError";
    this.status = status;
  }
};
var HttpClient = class {
  constructor(baseUrl, fetchImpl) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.fetchImpl = fetchImpl ?? globalThis.fetch;
    if (!this.fetchImpl) {
      throw new Error("No fetch implementation found. Pass `fetch` in the config (Node <18).");
    }
  }
  async request(method, path, body) {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : void 0
    });
    let data;
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    if (!res.ok) {
      throw new ConduitApiError(data?.error ?? `Request failed (${res.status})`, res.status);
    }
    return data;
  }
};
var LinksResource = class {
  constructor(http, cfg) {
    this.http = http;
    this.cfg = cfg;
  }
  /** Create a payment link. */
  async create(input) {
    const recipientAddress = input.recipientAddress ?? this.cfg.address;
    if (!recipientAddress) throw new Error("recipientAddress required (set it in config or the call).");
    const res = await this.http.request("POST", "/api/links", {
      title: input.title,
      amount: String(input.amount),
      description: input.description,
      recipientAddress,
      expiresAt: input.expiresAt,
      stealthMode: input.stealth
    });
    return res.link;
  }
  /** List payment links for an address (defaults to config.address). */
  async list(address) {
    const addr = address ?? this.cfg.address;
    if (!addr) throw new Error("address required (set it in config or the call).");
    const res = await this.http.request("GET", `/api/links?address=${addr}`);
    return res.links ?? [];
  }
  /** Fetch a single payment link by id. */
  async get(linkId) {
    const res = await this.http.request("GET", `/api/links/${linkId}`);
    return res.link;
  }
  /** Full hosted pay URL for a link. */
  payUrl(linkId) {
    return `${(this.cfg.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "")}/pay/${linkId}`;
  }
};
var EscrowResource = class {
  constructor(http, cfg) {
    this.http = http;
    this.cfg = cfg;
  }
  /** Create an escrow link. */
  async create(input) {
    const sellerAddress = input.sellerAddress ?? this.cfg.address;
    if (!sellerAddress) throw new Error("sellerAddress required (set it in config or the call).");
    const res = await this.http.request("POST", "/api/escrow", {
      title: input.title,
      amount: String(input.amount),
      description: input.description,
      sellerAddress,
      sellerContact: input.sellerContact,
      deliveryDays: input.deliveryDays
    });
    return res.escrow;
  }
  /** List escrows for an address (as seller). */
  async list(address) {
    const addr = address ?? this.cfg.address;
    if (!addr) throw new Error("address required (set it in config or the call).");
    const res = await this.http.request("GET", `/api/escrow?address=${addr}`);
    return res.escrows ?? [];
  }
  /** Fetch a single escrow by id. */
  async get(escrowId) {
    const res = await this.http.request("GET", `/api/escrow/${escrowId}`);
    return res.escrow;
  }
  /** Hosted pay URL for an escrow. */
  payUrl(escrowId) {
    return `${(this.cfg.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "")}/escrow/${escrowId}`;
  }
};
var SplitsResource = class {
  constructor(http, cfg) {
    this.http = http;
    this.cfg = cfg;
  }
  /** Create a split payment link. Percentages must sum to 100. */
  async create(input) {
    const creatorAddress = input.creatorAddress ?? this.cfg.address;
    if (!creatorAddress) throw new Error("creatorAddress required (set it in config or the call).");
    const sum = input.recipients.reduce((s, r) => s + r.percentage, 0);
    if (Math.abs(sum - 100) > 0.05) {
      throw new Error(`Recipient percentages must sum to 100 (got ${sum}).`);
    }
    const res = await this.http.request("POST", "/api/splits", {
      title: input.title,
      amount: String(input.amount),
      description: input.description,
      creatorAddress,
      recipients: input.recipients
    });
    return res.split;
  }
  /** List splits created by an address. */
  async list(address) {
    const addr = address ?? this.cfg.address;
    if (!addr) throw new Error("address required (set it in config or the call).");
    const res = await this.http.request("GET", `/api/splits?address=${addr}`);
    return res.splits ?? [];
  }
  /** Fetch a single split by id. */
  async get(splitId) {
    const res = await this.http.request("GET", `/api/splits/${splitId}`);
    return res.split;
  }
  /** Hosted pay URL for a split. */
  payUrl(splitId) {
    return `${(this.cfg.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "")}/pay/split/${splitId}`;
  }
};
var WebhooksResource = class {
  constructor(http, cfg) {
    this.http = http;
    this.cfg = cfg;
  }
  /** Register a webhook endpoint. Returns the webhook including its signing secret (shown once). */
  async create(input) {
    const ownerAddress = input.ownerAddress ?? this.cfg.address;
    if (!ownerAddress) throw new Error("ownerAddress required (set it in config or the call).");
    const res = await this.http.request("POST", "/api/webhooks", {
      ownerAddress,
      url: input.url,
      events: input.events
    });
    return res.webhook;
  }
  /** List webhooks for an address. */
  async list(address) {
    const addr = address ?? this.cfg.address;
    if (!addr) throw new Error("address required (set it in config or the call).");
    const res = await this.http.request("GET", `/api/webhooks?address=${addr}`);
    return res.webhooks ?? [];
  }
  /** Update a webhook's events, url, or active state. */
  async update(webhookId, changes, callerAddress) {
    const addr = callerAddress ?? this.cfg.address;
    if (!addr) throw new Error("callerAddress required.");
    const res = await this.http.request("PATCH", `/api/webhooks/${webhookId}`, {
      callerAddress: addr,
      ...changes
    });
    return res.webhook;
  }
  /** Send a test ping to a webhook. */
  async test(webhookId, callerAddress) {
    const addr = callerAddress ?? this.cfg.address;
    if (!addr) throw new Error("callerAddress required.");
    return this.http.request("PATCH", `/api/webhooks/${webhookId}`, { callerAddress: addr, action: "test" });
  }
  /** Delete a webhook. */
  async delete(webhookId, callerAddress) {
    const addr = callerAddress ?? this.cfg.address;
    if (!addr) throw new Error("callerAddress required.");
    await this.http.request("DELETE", `/api/webhooks/${webhookId}?address=${addr}`);
  }
};
var ConduitClient = class {
  constructor(config = {}) {
    const cfg = { baseUrl: DEFAULT_BASE_URL, ...config };
    const http = new HttpClient(cfg.baseUrl, cfg.fetch);
    this.links = new LinksResource(http, cfg);
    this.escrow = new EscrowResource(http, cfg);
    this.splits = new SplitsResource(http, cfg);
    this.webhooks = new WebhooksResource(http, cfg);
  }
};

// src/webhooks.ts
import crypto from "crypto";
function verifyWebhookSignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
function constructWebhookEvent(rawBody, signature, secret) {
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    throw new Error("Invalid webhook signature.");
  }
  return JSON.parse(rawBody);
}
export {
  ConduitApiError,
  ConduitClient,
  constructWebhookEvent,
  verifyWebhookSignature
};
