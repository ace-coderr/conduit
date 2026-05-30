# Code Examples

---

## Basic — 0.001 USDC per request

```typescript
import { withPayment } from "@ace_won/x402";
import { NextRequest, NextResponse } from "next/server";

export const GET = withPayment({ amount: "0.001" }, async (req: NextRequest) => {
  return NextResponse.json({ data: "basic content" });
});
```

---

## Pay directly to your wallet

```typescript
export const GET = withPayment({
  amount: "0.01",
  payTo: "0xYourWalletAddress",
  description: "Premium analytics data",
}, async (req: NextRequest) => {
  const data = await getPremiumData();
  return NextResponse.json({ data });
});
```

---

## POST endpoint — AI inference

```typescript
export const POST = withPayment({
  amount: "0.005",
  description: "AI inference — pay per request",
}, async (req: NextRequest) => {
  const { prompt } = await req.json();
  const result = await runInference(prompt);
  return NextResponse.json({ result });
});
```

---

## Multiple price tiers

```typescript
// app/api/basic/route.ts — 0.001 USDC
export const GET = withPayment(
  { amount: "0.001", description: "Basic data" },
  basicHandler
);

// app/api/premium/route.ts — 0.01 USDC
export const GET = withPayment({
  amount: "0.01",
  payTo: "0xYourWallet",
  description: "Premium tier with full dataset",
}, premiumHandler);

// app/api/enterprise/route.ts — 0.1 USDC
export const GET = withPayment({
  amount: "0.1",
  description: "Enterprise real-time feed",
}, enterpriseHandler);
```

---

## Access payer address in your handler

```typescript
export const GET = withPayment({ amount: "0.001" }, async (req: NextRequest) => {
  // The payer's wallet address is available after verification
  const payerAddress = req.headers.get("x-payment-payer");

  return NextResponse.json({
    data: "your content",
    paidBy: payerAddress,
  });
});
```

---

## Live demo reference

The full source for `/api/arc-stats` is in the [GitHub repo](https://github.com/ace-coderr/conduit/blob/main/app/api/arc-stats/route.ts). It's a working x402 endpoint that returns live Arc Network stats — use it as a reference.
