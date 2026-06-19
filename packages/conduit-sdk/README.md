# @ace_won/conduit-sdk

Official TypeScript SDK for **Conduit** — USDC payment infrastructure on Arc Network. Create payment links, escrow, split payments, and webhooks programmatically with full type safety.

```bash
npm install @ace_won/conduit-sdk
```

## Quick start

```ts
import { ConduitClient } from "@ace_won/conduit-sdk";

const conduit = new ConduitClient({
  address: "0xYourWalletAddress", // default owner for create/list calls
});

// Create a payment link
const link = await conduit.links.create({
  title: "Logo design",
  amount: 50,
});

console.log(conduit.links.payUrl(link.id));
// → https://conduitpay.xyz/pay/<id>
```

## Configuration

```ts
const conduit = new ConduitClient({
  baseUrl: "https://conduitpay.xyz", // optional, this is the default
  address: "0xYourWallet",           // optional default owner address
  fetch: customFetch,                // optional, for Node <18
});
```

## Payment Links

```ts
const link = await conduit.links.create({
  title: "Invoice #102",
  amount: "25.00",
  description: "Consulting — June",
});

const all = await conduit.links.list();          // your links
const one = await conduit.links.get(link.id);    // single link
const url = conduit.links.payUrl(link.id);        // hosted pay page
```

## Escrow

```ts
const escrow = await conduit.escrow.create({
  title: "iPhone 15 Pro",
  amount: 800,
  sellerContact: "@seller on Telegram",
  deliveryDays: 7,
});

const escrows = await conduit.escrow.list();
const url = conduit.escrow.payUrl(escrow.id);
```

## Split Payments

```ts
// Percentages must sum to 100
const split = await conduit.splits.create({
  title: "Team revenue split",
  amount: 1000,
  recipients: [
    { address: "0xAlice...", percentage: 50, label: "Alice" },
    { address: "0xBob...",   percentage: 30, label: "Bob" },
    { address: "0xCarol...", percentage: 20, label: "Carol" },
  ],
});

const url = conduit.splits.payUrl(split.id);
// One payment auto-distributes to all recipients, gaslessly.
```

## Webhooks

### Register an endpoint

```ts
const webhook = await conduit.webhooks.create({
  url: "https://your-app.com/webhooks/conduit",
  events: ["payment.completed", "escrow.released", "split.distributed"],
});

console.log(webhook.secret); // whsec_... — save this, shown only once
```

Other operations:

```ts
await conduit.webhooks.list();
await conduit.webhooks.update(webhook.id, { active: false });
await conduit.webhooks.test(webhook.id);
await conduit.webhooks.delete(webhook.id);
```

### Verify incoming webhooks

Conduit signs every delivery with HMAC-SHA256 in the `X-Conduit-Signature` header. Always verify it.

```ts
import { constructWebhookEvent } from "@ace_won/conduit-sdk";

// Next.js App Router
export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get("x-conduit-signature") ?? "";

  try {
    const event = constructWebhookEvent(raw, sig, process.env.CONDUIT_WEBHOOK_SECRET!);

    switch (event.event) {
      case "payment.completed":
        console.log("Paid:", event.data.amount, "USDC");
        break;
      case "split.distributed":
        console.log("Split done:", event.data.payouts);
        break;
    }

    return new Response("ok");
  } catch {
    return new Response("Invalid signature", { status: 401 });
  }
}
```

Or verify manually:

```ts
import { verifyWebhookSignature } from "@ace_won/conduit-sdk";

const valid = verifyWebhookSignature(rawBody, signature, secret);
```

## Webhook events

| Event | Fires when |
|---|---|
| `payment.completed` | A payment link is paid |
| `escrow.funded` | A buyer funds an escrow |
| `escrow.released` | Escrow funds are released to the seller |
| `escrow.disputed` | A buyer disputes an escrow |
| `escrow.refunded` | An escrow is refunded to the buyer |
| `split.funded` | A split link is paid into |
| `split.distributed` | A split finishes distributing to all recipients |

## Error handling

```ts
import { ConduitApiError } from "@ace_won/conduit-sdk";

try {
  await conduit.links.create({ title: "Test", amount: 10 });
} catch (err) {
  if (err instanceof ConduitApiError) {
    console.error(err.status, err.message);
  }
}
```

## License

MIT
