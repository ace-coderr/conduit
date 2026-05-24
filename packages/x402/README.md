# @ace_won/x402

> Drop-in x402 payment middleware for Next.js — powered by Conduit on Arc Network.

Wrap any API route with **one line** to require USDC micropayments. No accounts, no API keys, no subscriptions. Humans pay via MetaMask, AI agents pay automatically via EIP-3009.

Built on **Arc Network** · Powered by **Circle USDC** · Facilitated by **[Conduit](https://conduit-pay.vercel.app)**

---

## Install

```bash
npm install @ace_won/x402
```

---

## Usage

```ts
// app/api/your-endpoint/route.ts
import { withPayment } from "@ace_won/x402";
import { NextRequest, NextResponse } from "next/server";

async function handler(req: NextRequest) {
  return NextResponse.json({ data: "your content here" });
}

// Requires 0.001 USDC to access — that's it
export const GET = withPayment({ amount: "0.001" }, handler);
```

That's it. Your route now:
- Returns `402 Payment Required` to unpaid requests
- Shows a MetaMask pay page to browsers
- Returns raw 402 JSON to AI agents
- Verifies payment on-chain before serving the response
- Settles asynchronously via Conduit's facilitator on Arc

---

## Options

```ts
withPayment({
  // Required
  amount: "0.001",          // USDC amount — e.g. "0.001", "0.01", "1.00"

  // Optional — all have sensible defaults
  payTo: "0xYourWallet",    // Who receives payment. Defaults to Conduit fee collector
  description: "...",       // Shown in 402 response and pay page
  resource: "https://...",  // URL of this resource for tracking
  facilitatorUrl: "...",    // Custom facilitator. Defaults to Conduit's
  network: "eip155:5042002",// CAIP-2 network. Defaults to Arc Testnet
  asset: "0x3600...",       // USDC contract. Defaults to Arc Testnet USDC
  rpcUrl: "https://...",    // RPC for tx verification. Defaults to Arc Testnet
  maxTimeoutSeconds: 300,   // Max payment age in seconds. Defaults to 300
}, handler);
```

---

## How it works

### For browsers (humans)
1. Browser hits your route → gets a MetaMask pay page
2. User connects wallet, confirms USDC transfer
3. Browser retries with `PAYMENT-SIGNATURE: tx:<txHash>`
4. Middleware verifies the tx on-chain
5. Handler is called, response served

### For AI agents
1. Agent hits your route → gets `402` with payment details in `PAYMENT-REQUIRED` header
2. Agent signs an EIP-3009 USDC authorization on Arc
3. Agent retries with `PAYMENT-SIGNATURE: <base64 payload>`
4. Middleware calls Conduit's `/verify` endpoint
5. Handler is called, response served
6. Middleware calls `/settle` async — USDC transferred on-chain

---

## Network details

| Property | Value |
|----------|-------|
| Network | Arc Testnet |
| Chain ID | 5042002 |
| CAIP-2 | eip155:5042002 |
| USDC | `0x3600000000000000000000000000000000000000` |
| Facilitator | `https://conduit-pay.vercel.app/api/x402` |
| Explorer | https://testnet.arcscan.app |

---

## Example — Multiple routes

```ts
// app/api/basic/route.ts
export const GET = withPayment({ amount: "0.001", description: "Basic data" }, basicHandler);

// app/api/premium/route.ts
export const GET = withPayment({
  amount: "0.01",
  payTo: "0xYourWallet",
  description: "Premium analytics",
}, premiumHandler);

// app/api/ai-inference/route.ts
export const POST = withPayment({
  amount: "0.005",
  description: "AI inference — pay per request",
}, inferenceHandler);
```

---

## Requirements

- Next.js 14+
- `viem` v2+ (peer dependency — already installed in most Next.js projects)

---

## Links

- **Facilitator docs:** https://conduit-pay.vercel.app/developers
- **Arc Network:** https://arc.network
- **GitHub:** https://github.com/ace-coderr/conduit
- **Twitter:** [@conduit_pay](https://x.com/conduit_pay)

---

## License

MIT