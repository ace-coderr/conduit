"use client";

import Link from "next/link";

export const dynamic = "force-dynamic";

const NAV = [
    { id: "overview", label: "Overview" },
    { id: "quickstart", label: "Quick Start" },
    { id: "how-it-works", label: "How It Works" },
    { id: "npm-package", label: "npm Package" },
    { id: "endpoints", label: "API Endpoints" },
    { id: "verify", label: "Verify" },
    { id: "settle", label: "Settle" },
    { id: "marketplace", label: "Marketplace" },
    { id: "network", label: "Network Details" },
    { id: "examples", label: "Code Examples" },
];

function Code({ children }: { children: string }) {
    return (
        <div style={{ background: "#0d0d0d", border: "1px solid #1e1e1e", borderRadius: 12, padding: "20px 24px", fontFamily: "IBM Plex Mono, monospace", fontSize: 12, lineHeight: 1.9, overflowX: "auto", marginBottom: 24 }}>
            {children.split("\n").map((line, i) => {
                const color =
                    line.trimStart().startsWith("#") || line.trimStart().startsWith("//") ? "#555" :
                        line.startsWith("import") || line.startsWith("export") ? "#a78bfa" :
                            line.includes("withPayment") ? "#00E5A0" :
                                line.includes("0x36") || line.includes("0xYour") ? "#f5a623" :
                                    line.trimStart().startsWith("return") || line.trimStart().startsWith("const") ? "#5b8ff9" :
                                        "#ccc";
                return <div key={i} style={{ color, minHeight: "1.5em" }}>{line || " "}</div>;
            })}
        </div>
    );
}

function Tag({ method, color }: { method: string; color: string }) {
    return (
        <span style={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}30`, borderRadius: 4, padding: "2px 7px", flexShrink: 0 }}>
            {method}
        </span>
    );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
    return (
        <section id={id} style={{ marginBottom: 64, scrollMarginTop: 80 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.03em", marginBottom: 20, color: "var(--ink-1)", paddingBottom: 12, borderBottom: "1px solid var(--stroke)" }}>{title}</h2>
            {children}
        </section>
    );
}

function Mono({ children }: { children: string }) {
    return <code style={{ fontSize: 12, background: "var(--raised)", padding: "1px 6px", borderRadius: 4, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace" }}>{children}</code>;
}

export default function DevelopersPage() {
    return (
        <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "Sora, sans-serif", color: "var(--ink-1)" }}>

            {/* Top bar */}
            <div style={{ height: 56, background: "var(--surface)", borderBottom: "1px solid var(--stroke)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", position: "sticky", top: 0, zIndex: 100 }}>
                <Link href="/" style={{ textDecoration: "none" }}>
                    <img src="/conduit-logo-white.png" alt="Conduit" style={{ height: 52, width: "auto" }} />
                </Link>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <a href="https://npmjs.com/package/@ace_won/x402" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--ink-3)", textDecoration: "none", fontWeight: 600 }}>npm ↗</a>
                    <a href="https://github.com/ace-coderr/conduit" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--ink-3)", textDecoration: "none", fontWeight: 600 }}>GitHub ↗</a>
                    <Link href="/" style={{ fontSize: 12, color: "var(--ink-3)", textDecoration: "none", padding: "6px 14px", border: "1px solid var(--stroke)", borderRadius: 8, fontWeight: 600 }}>← App</Link>
                </div>
            </div>

            <div style={{ display: "flex", maxWidth: 1100, margin: "0 auto" }}>

                {/* Sidebar */}
                <aside style={{ width: 260, flexShrink: 0, padding: "40px 0 40px 28px", position: "sticky", top: 56, height: "calc(100vh - 56px)", overflowY: "auto" }}>
                    <p style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, letterSpacing: ".1em", marginBottom: 16 }}>DEVELOPER DOCS</p>
                    <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {NAV.map(n => (
                            <a key={n.id} href={`#${n.id}`}
                                style={{ fontSize: 14, color: "var(--ink-3)", textDecoration: "none", padding: "9px 12px", borderRadius: 6, fontWeight: 600 }}
                                onMouseEnter={e => { (e.target as HTMLElement).style.color = "var(--ink-1)"; (e.target as HTMLElement).style.background = "var(--raised)"; }}
                                onMouseLeave={e => { (e.target as HTMLElement).style.color = "var(--ink-3)"; (e.target as HTMLElement).style.background = "transparent"; }}
                            >{n.label}</a>
                        ))}
                    </nav>
                    <div style={{ marginTop: 32, padding: "12px", background: "var(--c-dim)", border: "1px solid var(--c-border)", borderRadius: 8 }}>
                        <p style={{ fontSize: 10, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, marginBottom: 6 }}>LIVE DEMO</p>
                        <a href="https://conduitpay.xyz/api/arc-stats" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--c)", textDecoration: "none", wordBreak: "break-all" }}>/api/arc-stats ↗</a>
                    </div>
                </aside>

                {/* Main */}
                <main style={{ flex: 1, padding: "40px 48px 80px 40px", minWidth: 0 }}>

                    {/* Hero */}
                    <div style={{ marginBottom: 56 }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--c-dim)", border: "1px solid var(--c-border)", borderRadius: 20, padding: "4px 12px", marginBottom: 20 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--c)" }} />
                            <span style={{ fontSize: 10, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, letterSpacing: ".08em" }}>LIVE ON ARC TESTNET</span>
                        </div>
                        <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-.05em", marginBottom: 16, lineHeight: 1.1 }}>Build with Conduit</h1>
                        <p style={{ fontSize: 16, color: "var(--ink-3)", lineHeight: 1.7, maxWidth: 600 }}>
                            Conduit is the first public x402 facilitator on Arc Network. Gate any API, content, or data behind USDC micropayments — paid automatically by AI agents and HTTP clients.
                        </p>
                    </div>

                    {/* Quick links */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 56 }}>
                        {[
                            { label: "Facilitator URL", value: "conduitpay.xyz/api/x402", href: "https://conduitpay.xyz/api/x402", color: "var(--c)" },
                            { label: "Demo endpoint", value: "/api/arc-stats", href: "https://conduitpay.xyz/api/arc-stats", color: "var(--info)" },
                            { label: "Network", value: "Arc Testnet · eip155:5042002", href: "https://testnet.arcscan.app", color: "#a78bfa" },
                        ].map(s => (
                            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                                style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: 12, padding: "16px 18px", textDecoration: "none", display: "block" }}>
                                <p style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace", marginBottom: 6, letterSpacing: ".08em" }}>{s.label}</p>
                                <p style={{ fontSize: 12, color: s.color, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>{s.value}</p>
                            </a>
                        ))}
                    </div>

                    <Section id="overview" title="Overview">
                        <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.8, marginBottom: 16 }}>
                            x402 is an HTTP-native payment protocol. Instead of blocking access with a subscription or API key, your server returns a <Mono>402 Payment Required</Mono> response. The client pays and retries — automatically.
                        </p>
                        <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.8, marginBottom: 24 }}>
                            Conduit is the facilitator. It handles verification, settlement, and the human pay page. You focus on your API. Conduit handles the money.
                        </p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            {[
                                { title: "For AI agents", desc: "Agents hit your endpoint, receive a 402, sign a USDC authorization, and retry automatically. Zero human involvement." },
                                { title: "For humans", desc: "Browser users see a clean MetaMask pay page. They connect, pay, and get your content." },
                                { title: "For developers", desc: "One npm package. One line of code. No backend changes, no new infrastructure. Works with any Next.js API route." },
                                { title: "For Arc", desc: "Conduit is the first and only public x402 facilitator on Arc. Every payment settles in USDC on Arc in under a second." },
                            ].map(c => (
                                <div key={c.title} style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: 12, padding: "16px 18px" }}>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-1)", marginBottom: 6 }}>{c.title}</p>
                                    <p style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.7 }}>{c.desc}</p>
                                </div>
                            ))}
                        </div>
                    </Section>

                    <Section id="quickstart" title="Quick Start">
                        <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.8, marginBottom: 20 }}>Get a USDC-gated API route live in under 5 minutes.</p>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", marginBottom: 8 }}>1. Install the package</p>
                        <Code>{`npm install @ace_won/x402`}</Code>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", marginBottom: 8 }}>2. Wrap your route</p>
                        <Code>{`// app/api/your-endpoint/route.ts
import { withPayment } from "@ace_won/x402";
import { NextRequest, NextResponse } from "next/server";

async function handler(req: NextRequest) {
  return NextResponse.json({ data: "your content here" });
}

// Requires 0.001 USDC to access
export const GET = withPayment({ amount: "0.001" }, handler);`}</Code>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", marginBottom: 8 }}>3. Test it</p>
                        <Code>{`# Returns 402 with payment details
curl -i https://your-app.vercel.app/api/your-endpoint

# Expected
HTTP/1.1 402 Payment Required
Payment-Required: eyJhY2NlcHRzIjpbeyJzY2hlb...`}</Code>
                        <div style={{ background: "var(--c-dim)", border: "1px solid var(--c-border)", borderRadius: 10, padding: "14px 18px" }}>
                            <p style={{ fontSize: 12, color: "var(--c)", fontWeight: 700, marginBottom: 4 }}>Live demo</p>
                            <p style={{ fontSize: 12, color: "var(--ink-3)" }}>Hit <a href="https://conduitpay.xyz/api/arc-stats" target="_blank" rel="noopener noreferrer" style={{ color: "var(--c)" }}>conduitpay.xyz/api/arc-stats</a> in your browser. Pay 0.001 USDC. Get live Arc Network stats back in under a second.</p>
                        </div>
                    </Section>

                    <Section id="how-it-works" title="How It Works">
                        <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.8, marginBottom: 20 }}>The full payment flow from request to response:</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                            {[
                                { n: "01", t: "Client hits your API", d: "No payment header — your route returns 402 with a PAYMENT-REQUIRED header containing amount, token, network, and recipient." },
                                { n: "02", t: "Client pays on Arc", d: "AI agents sign an EIP-3009 USDC authorization on Arc and retry with PAYMENT-SIGNATURE header. Browsers are redirected to the Conduit pay page." },
                                { n: "03", t: "Conduit verifies", d: "withPayment() calls /api/x402/verify. Checks signature, amount, recipient, nonce not already used, and USDC balance on Arc." },
                                { n: "04", t: "Handler is called", d: "Verification passed — your handler runs and the response is served to the client immediately." },
                                { n: "05", t: "Conduit settles", d: "withPayment() calls /api/x402/settle asynchronously. Conduit executes the USDC transfer on Arc. The payment confirms on-chain." },
                            ].map(s => (
                                <div key={s.n} style={{ display: "flex", gap: 16, background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: 12, padding: "16px 20px" }}>
                                    <span style={{ fontSize: 11, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{s.n}</span>
                                    <div>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-1)", marginBottom: 4 }}>{s.t}</p>
                                        <p style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6 }}>{s.d}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.7 }}>
                            <strong style={{ color: "var(--ink-2)" }}>Security:</strong> Every EIP-3009 authorization has a unique nonce. Conduit checks <Mono>authorizationState</Mono> on the Arc USDC contract before processing. Replay attacks are impossible.
                        </p>
                    </Section>

                    <Section id="npm-package" title="npm Package">
                        <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.8, marginBottom: 20 }}><Mono>@ace_won/x402</Mono> is a drop-in middleware for Next.js 14+. Install once, use on any route.</p>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", marginBottom: 8 }}>Install</p>
                        <Code>{`npm install @ace_won/x402`}</Code>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", marginBottom: 8 }}>All options</p>
                        <Code>{`withPayment({
  // Required
  amount: "0.001",           // USDC amount as string

  // Optional
  payTo: "0xYourWallet",     // Who receives payment
                             // Defaults to Conduit fee collector
  description: "...",        // Shown in 402 response and pay page
  resource: "https://...",   // URL of this resource
  facilitatorUrl: "...",     // Defaults to Conduit's facilitator
  network: "eip155:5042002", // Defaults to Arc Testnet
  asset: "0x3600...",        // Defaults to Arc Testnet USDC
  rpcUrl: "https://rpc.testnet.arc.network",
  maxTimeoutSeconds: 300,    // Max payment age in seconds
}, handler);`}</Code>
                        <div style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: 10, overflow: "hidden", marginBottom: 24 }}>
                            {[
                                { k: "Next.js", v: "14+" },
                                { k: "viem", v: "v2+ (peer dependency)" },
                                { k: "Node.js", v: "18+" },
                                { k: "Package", v: "@ace_won/x402 v1.0.2" },
                            ].map((r, i, arr) => (
                                <div key={r.k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 18px", borderBottom: i < arr.length - 1 ? "1px solid var(--stroke)" : "none" }}>
                                    <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{r.k}</span>
                                    <span style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-1)", fontWeight: 700 }}>{r.v}</span>
                                </div>
                            ))}
                        </div>
                        <a href="https://npmjs.com/package/@ace_won/x402" target="_blank" rel="noopener noreferrer"
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "var(--ink-2)", textDecoration: "none" }}>
                            View on npm ↗
                        </a>
                    </Section>

                    <Section id="endpoints" title="API Endpoints">
                        <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.8, marginBottom: 20 }}>All endpoints live at <Mono>conduitpay.xyz</Mono></p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {[
                                { method: "GET", path: "/api/x402", desc: "Facilitator discovery — returns supported networks, assets, and facilitator info.", color: "#00E5A0" },
                                { method: "POST", path: "/api/x402/verify", desc: "Verify a payment payload. Checks signature, amount, recipient, nonce, and USDC balance.", color: "#5b8ff9" },
                                { method: "POST", path: "/api/x402/settle", desc: "Execute the on-chain USDC transfer. Called after your handler serves the response.", color: "#f5a623" },
                                { method: "GET", path: "/api/x402/payments", desc: "Admin — full payment history through the facilitator. Requires x-wallet-address header.", color: "#a78bfa" },
                                { method: "GET", path: "/api/arc-stats", desc: "Live demo endpoint. Pay 0.001 USDC to receive live Arc Network block stats.", color: "#00E5A0" },
                            ].map(e => (
                                <div key={e.path} style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: 10, padding: "14px 18px" }}>
                                    <Tag method={e.method} color={e.color} />
                                    <div>
                                        <p style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-1)", fontWeight: 700, marginBottom: 3 }}>{e.path}</p>
                                        <p style={{ fontSize: 12, color: "var(--ink-3)" }}>{e.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Section>

                    <Section id="verify" title="Verify">
                        <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.8, marginBottom: 20 }}>Call <Mono>POST /api/x402/verify</Mono> before serving your resource. <Mono>withPayment()</Mono> does this automatically.</p>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", marginBottom: 8 }}>Request body</p>
                        <Code>{`{
  "payload": "<base64 encoded payment data>",
  "paymentDetails": {
    "maxAmountRequired": "1000",
    "payTo": "0xYourWallet",
    "network": "eip155:5042002",
    "asset": "0x3600000000000000000000000000000000000000"
  }
}`}</Code>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", marginBottom: 8 }}>Response — valid</p>
                        <Code>{`{
  "isValid": true,
  "networkId": "eip155:5042002",
  "payer": "0xABCD...",
  "amount": "1000",
  "token": "0x3600000000000000000000000000000000000000"
}`}</Code>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", marginBottom: 8 }}>Response — invalid</p>
                        <Code>{`{
  "isValid": false,
  "error": "Payment nonce already used"
}`}</Code>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-2)", marginBottom: 10 }}>What gets checked</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {[
                                "Payload decodes to a valid payment object",
                                "validAfter has passed and validBefore has not expired",
                                "Payment amount meets the required minimum",
                                "Recipient address matches payTo",
                                "Nonce has not been used — checked via authorizationState on Arc USDC contract",
                                "Payer has sufficient USDC balance on Arc",
                            ].map(c => (
                                <div key={c} style={{ display: "flex", gap: 10, fontSize: 12, color: "var(--ink-3)" }}>
                                    <span style={{ color: "var(--c)", flexShrink: 0 }}>✓</span>{c}
                                </div>
                            ))}
                        </div>
                    </Section>

                    <Section id="settle" title="Settle">
                        <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.8, marginBottom: 20 }}>Call <Mono>POST /api/x402/settle</Mono> after serving your resource. <Mono>withPayment()</Mono> calls this automatically in the background.</p>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", marginBottom: 8 }}>Request body</p>
                        <Code>{`{
  "payload": "<base64 encoded payment data>",
  "paymentDetails": {
    "payTo": "0xYourWallet",
    "network": "eip155:5042002",
    "asset": "0x3600000000000000000000000000000000000000"
  }
}`}</Code>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", marginBottom: 8 }}>Response</p>
                        <Code>{`{
  "success": true,
  "txHash": "0x1c07e4c7...",
  "network": "eip155:5042002"
}`}</Code>
                    </Section>

                    <Section id="marketplace" title="Marketplace">
                        <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.8, marginBottom: 20 }}>The Conduit Marketplace is a public directory of x402-gated APIs. List your API so AI agents and developers can discover and pay for it automatically.</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 28 }}>
                            {[
                                { title: "List your API", desc: "Submit your x402 endpoint. Set a USDC price per request. Earn automatically." },
                                { title: "Get discovered", desc: "AI agents and developers browse by category. Your API is visible to the entire Arc ecosystem." },
                                { title: "Earn per request", desc: "No subscriptions. Every request pays you in USDC on Arc. Conduit takes 0.5%." },
                            ].map(c => (
                                <div key={c.title} style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: 12, padding: "16px 18px" }}>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--c)", marginBottom: 6 }}>{c.title}</p>
                                    <p style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.7 }}>{c.desc}</p>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                            {[
                                { n: "01", t: "Build your x402 endpoint", d: "Use withPayment() to gate any Next.js route. Test locally with curl." },
                                { n: "02", t: "Submit to the marketplace", d: "Go to conduitpay.xyz/marketplace/submit. Fill in name, description, endpoint URL, price, and category." },
                                { n: "03", t: "Get approved", d: "Conduit reviews your listing within 24 hours. You receive an email when approved." },
                                { n: "04", t: "Start earning", d: "Your API is live. Agents and developers pay per request in USDC automatically." },
                            ].map(s => (
                                <div key={s.n} style={{ display: "flex", gap: 14, background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: 10, padding: "14px 18px" }}>
                                    <span style={{ fontSize: 10, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{s.n}</span>
                                    <div>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-1)", marginBottom: 3 }}>{s.t}</p>
                                        <p style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6 }}>{s.d}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <a href="https://conduitpay.xyz/marketplace/submit"
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "11px 22px", background: "var(--c)", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#000", textDecoration: "none" }}>
                            Submit your API →
                        </a>
                    </Section>

                    <Section id="network" title="Network Details">
                        <div style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
                            {[
                                { k: "Network", v: "Arc Testnet" },
                                { k: "Chain ID", v: "5042002" },
                                { k: "CAIP-2", v: "eip155:5042002" },
                                { k: "USDC Address", v: "0x3600000000000000000000000000000000000000" },
                                { k: "USDC Decimals", v: "6" },
                                { k: "RPC URL", v: "https://rpc.testnet.arc.network" },
                                { k: "Explorer", v: "https://testnet.arcscan.app" },
                                { k: "Facilitator", v: "https://conduitpay.xyz/api/x402" },
                                { k: "Gas token", v: "USDC (native)" },
                            ].map((r, i, arr) => (
                                <div key={r.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: i < arr.length - 1 ? "1px solid var(--stroke)" : "none" }}>
                                    <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600 }}>{r.k}</span>
                                    <span style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-1)", fontWeight: 700 }}>{r.v}</span>
                                </div>
                            ))}
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-2)", marginBottom: 8 }}>Add Arc Testnet to MetaMask</p>
                        <Code>{`Network name:  Arc Testnet
RPC URL:       https://rpc.testnet.arc.network
Chain ID:      5042002
Currency:      USDC
Explorer:      https://testnet.arcscan.app`}</Code>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-2)", marginBottom: 8 }}>Get testnet USDC</p>
                        <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.8 }}>
                            Go to <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--c)" }}>faucet.circle.com</a> → select Arc Testnet → paste your wallet address.
                        </p>
                    </Section>

                    <Section id="examples" title="Code Examples">
                        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", marginBottom: 8 }}>Basic — 0.001 USDC per request</p>
                        <Code>{`import { withPayment } from "@ace_won/x402";
import { NextRequest, NextResponse } from "next/server";

export const GET = withPayment({ amount: "0.001" }, async (req: NextRequest) => {
  return NextResponse.json({ data: "basic content" });
});`}</Code>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", marginBottom: 8 }}>Pay directly to your wallet</p>
                        <Code>{`export const GET = withPayment({
  amount: "0.01",
  payTo: "0xYourWalletAddress",
  description: "Premium analytics data",
}, async (req: NextRequest) => {
  return NextResponse.json({ analytics: getData() });
});`}</Code>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", marginBottom: 8 }}>POST endpoint — AI inference</p>
                        <Code>{`export const POST = withPayment({
  amount: "0.005",
  description: "AI inference — pay per request",
}, async (req: NextRequest) => {
  const { prompt } = await req.json();
  const result = await runInference(prompt);
  return NextResponse.json({ result });
});`}</Code>
                        <p style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", marginBottom: 8 }}>Multiple price tiers</p>
                        <Code>{`// app/api/basic/route.ts — 0.001 USDC
export const GET = withPayment({ amount: "0.001" }, basicHandler);

// app/api/premium/route.ts — 0.01 USDC
export const GET = withPayment({
  amount: "0.01",
  payTo: "0xYourWallet",
  description: "Premium tier",
}, premiumHandler);

// app/api/enterprise/route.ts — 0.1 USDC
export const GET = withPayment({
  amount: "0.1",
  description: "Enterprise data feed",
}, enterpriseHandler);`}</Code>
                    </Section>

                    <div style={{ background: "var(--c-dim)", border: "1px solid var(--c-border)", borderRadius: 16, padding: "32px", textAlign: "center" }}>
                        <p style={{ fontSize: 18, fontWeight: 800, color: "var(--ink-1)", marginBottom: 8 }}>Ready to build?</p>
                        <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 24 }}>Start accepting USDC micropayments on Arc. List on the marketplace and let AI agents find you.</p>
                        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                            <a href="https://conduitpay.xyz/marketplace/submit" style={{ padding: "11px 22px", background: "var(--c)", borderRadius: 8, color: "#000", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Submit to Marketplace →</a>
                            <a href="https://github.com/ace-coderr/conduit" target="_blank" rel="noopener noreferrer" style={{ padding: "11px 22px", background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: 8, color: "var(--ink-2)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>View on GitHub ↗</a>
                            <a href="https://x.com/conduit_pay" target="_blank" rel="noopener noreferrer" style={{ padding: "11px 22px", background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: 8, color: "var(--ink-2)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>@conduit_pay ↗</a>
                        </div>
                    </div>

                </main>
            </div>

            <div style={{ borderTop: "1px solid var(--stroke)", padding: "24px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Built on Arc Network · Powered by Circle USDC</span>
                <span style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>@ace_won/x402 v1.0.2</span>
            </div>
        </div>
    );
}