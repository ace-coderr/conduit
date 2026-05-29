# Conduit Pay — USDC Payment Infrastructure on Arc Network

Conduit is a full-stack USDC payment platform built on Arc Network, powered by Circle. Payment links, P2P escrow, seedless wallets, username payments, x402 facilitator, and an AI-powered API marketplace — all live on Arc Testnet.

**Live:** <https://conduitpay.xyz> · **Docs:** <https://conduitpay.xyz/developers> · **Marketplace:** <https://conduitpay.xyz/marketplace>

---

## Traction

- **2,670+ USDC** processed on Arc Testnet
- **71 payment links** created
- **11 escrow contracts** opened
- First public x402 facilitator on Arc Network

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 + TypeScript |
| Blockchain | wagmi v2 + viem |
| Multi-chain | Circle CCTP V2 + Unified Balance SDK |
| Auth & Wallets | Privy (email, Google, passkey) |
| Escrow Custody | Circle Developer-Controlled Wallets |
| Database | Prisma + Supabase (PostgreSQL) |
| Email | Resend |
| AI Mediation | Google Gemini 2.0 Flash |
| Hosting | Vercel |
| Chain | Arc Testnet (Chain ID 5042002) |

---

## Features

### Payments

- **Payment links** — Shareable one-time USDC payment links with title, amount, and optional expiry
- **Stealth mode** — Optional privacy toggle. Routes payments through a temporary wallet to hide your real address
- **Multi-chain** — Accept USDC from Base, Ethereum, Arbitrum, Polygon, Avalanche, Optimism via Circle CCTP V2
- **Username payments** — Claim @username and share `conduitpay.xyz/u/yourname` instead of a wallet address
- **Contacts** — Save wallet addresses and usernames for quick payments
- **Fee system** — 0.5% platform fee on all payments

### Escrow

- **P2P escrow** — Lock USDC in a Circle Developer-Controlled Wallet until delivery is confirmed
- **Delivery windows** — Set a delivery deadline; auto-release after confirmation window
- **Dispute system** — Buyer raises dispute, both parties submit evidence in a mediation thread
- **Auto-resolution** — If seller goes silent after 48hrs → auto-refund. If buyer goes silent → auto-release
- **AI dispute agent** — Gemini 2.0 Flash reads the full dispute thread and issues a binding verdict. 80%+ confidence → auto-executes via Circle wallet

### Wallets & Auth

- **Seedless wallets** — Sign up with email, Google, or passkey via Privy. No seed phrase required
- **MetaMask support** — Full support for existing wallets via injected connector

### x402 Facilitator

- **First x402 facilitator on Arc** — Any developer can gate their API behind USDC micropayments
- **One-line integration** — `npm install @ace_won/x402` and wrap your route
- **Human pay page** — Browser users see a clean MetaMask pay page
- **Agent flow** — AI agents pay automatically via EIP-3009 USDC authorization
- **npm package** — [@ace_won/x402](https://npmjs.com/package/@ace_won/x402)

### x402 API Marketplace

- **Live marketplace** — Developers list x402-gated APIs at `conduitpay.xyz/marketplace`
- **Per-request billing** — No subscriptions. Pay per request in USDC on Arc
- **AI agent customers** — Agents browse, pay, and get data back automatically in under a second

### Platform

- **Analytics dashboard** — Volume, link performance, earnings history
- **Admin dashboard** — Full platform stats, dispute management, AI verdict, marketplace approval
- **Email notifications** — Payment received, escrow funded, dispute raised, listing approved via Resend
- **Transactions page** — Full history with PAYMENT / ESCROW / REFUNDED tags

---

## Quick Start

### Prerequisites

- Node.js v20+
- MetaMask browser extension
- Supabase account — <https://supabase.com>
- Privy account — <https://console.privy.io>

### Add Arc Testnet to MetaMask

| Field | Value |
|---|---|
| Network name | Arc Testnet |
| RPC URL | `https://rpc.testnet.arc.network` |
| Chain ID | `5042002` |
| Currency symbol | `USDC` |
| Block explorer | `https://testnet.arcscan.app` |

### Get Testnet USDC

Go to **<https://faucet.circle.com>** → select Arc Testnet → paste your wallet address.

### Install & Run

```bash
# 1. Clone the repo
git clone https://github.com/ace-coderr/conduit.git
cd conduit

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env

# 4. Fill in your environment variables (see below)

# 5. Push database schema
npx prisma db push

# 6. Start development server
npm run dev
```

Open **<http://localhost:3000>**

---

## Environment Variables

```env
# Supabase (PostgreSQL)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID="your_project_id"

# Privy
NEXT_PUBLIC_PRIVY_APP_ID="your_privy_app_id"

# Stealth wallet encryption key (64-char hex string)
STEALTH_SECRET="your_secret_here"

# Forwarder wallet private key
FORWARDER_PRIVATE_KEY="0x..."

# Admin
ADMIN_SECRET="your_admin_secret"
RECOVER_TOKEN="your_token_here"

# Circle
CIRCLE_API_KEY="your_circle_api_key"
CIRCLE_ENTITY_SECRET="your_entity_secret"
CIRCLE_WALLET_SET_ID="your_wallet_set_id"

# Resend (email notifications)
RESEND_API_KEY="re_..."

# Gemini (AI dispute agent)
GEMINI_API_KEY="AIza..."
```

---

## Project Structure

```
conduit/
├── app/
│   ├── page.tsx                        # Dashboard + landing
│   ├── escrow/page.tsx                 # Escrow dashboard
│   ├── transactions/page.tsx           # Transaction history
│   ├── analytics/page.tsx              # Analytics
│   ├── marketplace/page.tsx            # x402 API Marketplace
│   ├── marketplace/[id]/page.tsx       # Listing detail
│   ├── marketplace/submit/page.tsx     # Developer submission
│   ├── developers/page.tsx             # x402 developer docs
│   ├── profile/page.tsx                # Username + email settings
│   ├── contacts/page.tsx               # Saved contacts
│   ├── pay/[linkId]/page.tsx           # Public payment page
│   ├── escrow/[linkId]/page.tsx        # Public escrow page
│   ├── u/[username]/page.tsx           # Public username pay page
│   └── api/
│       ├── links/                      # Payment link CRUD
│       ├── escrow/                     # Escrow CRUD + dispute + AI verdict
│       ├── forward/                    # Stealth forwarding
│       ├── marketplace/                # Marketplace CRUD
│       ├── profile/                    # Username + email
│       ├── x402/                       # x402 facilitator discovery
│       ├── x402/verify/                # Payment verification
│       ├── x402/settle/                # Payment settlement
│       └── arc-stats/                  # Live demo x402 endpoint
├── components/
│   └── NavBar.tsx
├── lib/
│   ├── arcChain.ts                     # Arc Testnet config
│   ├── arcClient.ts                    # Arc viem client
│   ├── circle.ts                       # Circle Developer Wallets
│   ├── db.ts                           # Prisma client
│   ├── email.ts                        # Resend email templates
│   ├── adminAuth.ts                    # Admin authentication
│   ├── fees.ts                         # Fee config
│   ├── stealthWallet.ts                # Stealth wallet logic
│   └── x402.ts                         # x402 middleware
├── packages/
│   └── x402/                           # @ace_won/x402 npm package
└── prisma/
    └── schema.prisma
```

---

## x402 Integration

Add USDC-gated payments to any API route:

```bash
npm install @ace_won/x402
```

```ts
import { withPayment } from "@ace_won/x402";

export const GET = withPayment({ amount: "0.001" }, async (req) => {
  return NextResponse.json({ data: "paid content" });
});
```

**Demo endpoint:** `https://conduitpay.xyz/api/arc-stats` — pay 0.001 USDC, get live Arc Network stats.

**Full docs:** <https://conduitpay.xyz/developers>

---

## Deployment

```bash
git add .
git commit -m "Deploy"
git push
```

Import to Vercel, add environment variables, deploy. Database uses Supabase PostgreSQL — run `npx prisma db push` after schema changes.

---

## Resources

| Resource | URL |
|---|---|
| Live App | <https://conduitpay.xyz> |
| Developer Docs | <https://conduitpay.xyz/developers> |
| x402 Marketplace | <https://conduitpay.xyz/marketplace> |
| npm Package | <https://npmjs.com/package/@ace_won/x402> |
| Arc Network | <https://arc.network> |
| Arc Testnet Explorer | <https://testnet.arcscan.app> |
| Circle Faucet | <https://faucet.circle.com> |
| Circle Docs | <https://developers.circle.com> |

---

Built on Arc Network · Powered by Circle USDC · Facilitated by Conduit