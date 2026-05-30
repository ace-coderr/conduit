# Quick Start

Get a USDC-gated API route live in under 5 minutes.

---

## 1. Install the package

```bash
npm install @ace_won/x402
```

---

## 2. Wrap your route

```typescript
// app/api/your-endpoint/route.ts
import { withPayment } from "@ace_won/x402";
import { NextRequest, NextResponse } from "next/server";

async function handler(req: NextRequest) {
  return NextResponse.json({ data: "your content here" });
}

// Requires 0.001 USDC to access
export const GET = withPayment({ amount: "0.001" }, handler);
```

---

## 3. Test it

```bash
# Returns 402 with payment details
curl -i https://your-app.vercel.app/api/your-endpoint

# Expected response
HTTP/1.1 402 Payment Required
Payment-Required: eyJhY2NlcHRzIjpbeyJzY2hlb...
Content-Type: application/json
```

---

## 4. Try the live demo

Hit the Conduit demo endpoint — pay 0.001 USDC, get live Arc Network stats:

```bash
curl -i https://conduitpay.xyz/api/arc-stats
```

Or open it in your browser at [conduitpay.xyz/api/arc-stats](https://conduitpay.xyz/api/arc-stats).

---

## 5. List on the marketplace

Once your endpoint is live, submit it to the [Conduit Marketplace](https://conduitpay.xyz/marketplace/submit) so AI agents and developers can discover it.

---

## Requirements

| Requirement | Version |
|-------------|---------|
| Next.js | 14+ |
| viem | v2+ (peer dependency) |
| Node.js | 18+ |
