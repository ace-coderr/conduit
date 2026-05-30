"use client";

import Link from "next/link";

export const dynamic = "force-dynamic";

const NAV = [
    { id: "introduction", label: "Introduction" },
    { id: "who-is-it-for", label: "Who Is It For?" },
    { id: "why-conduit", label: "Why Conduit Exists" },
    { id: "payment-links", label: "Payment Links" },
    { id: "stealth-mode", label: "Stealth Mode" },
    { id: "multi-chain", label: "Multi-Chain Payments" },
    { id: "escrow", label: "Escrow" },
    { id: "ai-dispute", label: "AI Dispute Agent" },
    { id: "seedless-wallets", label: "Seedless Wallets" },
    { id: "username-payments", label: "Username Payments" },
    { id: "notifications", label: "Email Notifications" },
    { id: "x402", label: "x402 & Marketplace" },
    { id: "getting-started", label: "Getting Started" },
    { id: "faq", label: "FAQ" },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
    return (
        <section id={id} style={{ marginBottom: 64, scrollMarginTop: 80 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.03em", marginBottom: 20, color: "var(--ink-1)", paddingBottom: 12, borderBottom: "1px solid var(--stroke)" }}>{title}</h2>
            {children}
        </section>
    );
}

function P({ children }: { children: React.ReactNode }) {
    return <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.85, marginBottom: 16 }}>{children}</p>;
}

function Note({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ background: "var(--c-dim)", border: "1px solid var(--c-border)", borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7 }}>{children}</p>
        </div>
    );
}

function Steps({ items }: { items: { n: string; t: string; d: string }[] }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {items.map(s => (
                <div key={s.n} style={{ display: "flex", gap: 16, background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: 12, padding: "16px 20px" }}>
                    <span style={{ fontSize: 11, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{s.n}</span>
                    <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-1)", marginBottom: 4 }}>{s.t}</p>
                        <p style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6 }}>{s.d}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

function Cards({ items }: { items: { title: string; desc: string; color?: string }[] }) {
    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
            {items.map(c => (
                <div key={c.title} style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: 12, padding: "16px 18px" }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: c.color ?? "var(--ink-1)", marginBottom: 6 }}>{c.title}</p>
                    <p style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.7 }}>{c.desc}</p>
                </div>
            ))}
        </div>
    );
}

export default function DocsPage() {
    return (
        <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "Sora, sans-serif", color: "var(--ink-1)" }}>

            <div style={{ height: 56, background: "var(--surface)", borderBottom: "1px solid var(--stroke)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", position: "sticky", top: 0, zIndex: 100 }}>
                <Link href="/" style={{ textDecoration: "none" }}>
                    <img src="/conduit-logo-white.png" alt="Conduit" style={{ height: 52, width: "auto" }} />
                </Link>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <Link href="/developers" style={{ fontSize: 12, color: "var(--ink-3)", textDecoration: "none", fontWeight: 600 }}>Developer Docs ↗</Link>
                    <Link href="/" style={{ fontSize: 12, color: "var(--ink-3)", textDecoration: "none", padding: "6px 14px", border: "1px solid var(--stroke)", borderRadius: 8, fontWeight: 600 }}>← App</Link>
                </div>
            </div>

            <div style={{ display: "flex", maxWidth: 1100, margin: "0 auto" }}>

                <aside style={{ width: 260, flexShrink: 0, padding: "40px 0 40px 28px", position: "sticky", top: 56, height: "calc(100vh - 56px)", overflowY: "auto" }}>
                    <p style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, letterSpacing: ".1em", marginBottom: 16 }}>DOCUMENTATION</p>
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
                        <p style={{ fontSize: 10, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, marginBottom: 6 }}>DEVELOPER DOCS</p>
                        <Link href="/developers" style={{ fontSize: 11, color: "var(--c)", textDecoration: "none" }}>x402 & API reference ↗</Link>
                    </div>
                </aside>

                <main style={{ flex: 1, padding: "40px 48px 80px 40px", minWidth: 0 }}>

                    <div style={{ marginBottom: 56 }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--c-dim)", border: "1px solid var(--c-border)", borderRadius: 20, padding: "4px 12px", marginBottom: 20 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--c)" }} />
                            <span style={{ fontSize: 10, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, letterSpacing: ".08em" }}>LIVE ON ARC TESTNET</span>
                        </div>
                        <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-.05em", marginBottom: 16, lineHeight: 1.1 }}>Conduit Documentation</h1>
                        <p style={{ fontSize: 16, color: "var(--ink-3)", lineHeight: 1.7, maxWidth: 600 }}>
                            Everything you need to send and receive USDC on Arc Network. No bank account. No KYC. No complicated setup.
                        </p>
                    </div>

                    <Section id="introduction" title="What is Conduit?">
                        <P>Conduit is a payments infrastructure built on Arc Network, powered by Circle USDC. It lets anyone send and receive digital dollars instantly — without a bank account, without KYC, and without complicated setup.</P>
                        <P>Conduit is built to let you:</P>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                            {[
                                "Send and receive USDC instantly",
                                "Create payment links in seconds",
                                "Use escrow for safe peer-to-peer transactions",
                                "Accept payments from any blockchain",
                                "Get paid via @username instead of a wallet address",
                                "Enable payments for AI agents and APIs",
                                "Receive email notifications for every payment event",
                            ].map(item => (
                                <div key={item} style={{ display: "flex", gap: 10, fontSize: 14, color: "var(--ink-2)" }}>
                                    <span style={{ color: "var(--c)", flexShrink: 0 }}>→</span>{item}
                                </div>
                            ))}
                        </div>
                        <Note><strong>Example:</strong> You create a link → someone pays → you receive USDC instantly. That's it.</Note>
                        <P>Conduit is designed to be a universal payment layer for people, businesses, developers, and autonomous AI systems — live at <a href="https://conduitpay.xyz" style={{ color: "var(--c)" }}>conduitpay.xyz</a>.</P>
                    </Section>

                    <Section id="who-is-it-for" title="Who Is Conduit For?">
                        <Cards items={[
                            { title: "Freelancers & creators", desc: "Get paid in USDC without sharing your wallet address. Create a link, share it, receive instantly.", color: "var(--c)" },
                            { title: "Businesses", desc: "Collect payments with escrow protection. Funds are held securely until delivery is confirmed.", color: "#5b8ff9" },
                            { title: "Developers", desc: "Monetize any API with one line of code. AI agents pay automatically per request in USDC.", color: "#a78bfa" },
                            { title: "Anyone, anywhere", desc: "No bank account needed. No KYC. Works in any country. Sign up with just an email address.", color: "#f5a623" },
                        ]} />
                    </Section>

                    <Section id="why-conduit" title="Why Does Conduit Exist?">
                        <P>Modern crypto payment systems suffer from four fundamental problems:</P>
                        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
                            {[
                                { n: "1", title: "Identity Exposure", desc: "On public blockchains, wallet addresses are permanent public identifiers. Anyone who interacts with you can trace your entire transaction history, analyze your balances, and link payments together — a total loss of financial privacy.", color: "#f03e5f" },
                                { n: "2", title: "Complexity Barrier", desc: "To receive crypto payments today, users must understand wallets, seed phrases, gas fees, network selection, and token bridges. Most people give up before they receive their first payment.", color: "#f5a623" },
                                { n: "3", title: "Fragmented Infrastructure", desc: "Payments are split across multiple chains, wallets, bridges, and standards. This leads to failed transactions, confusion, and user errors — and in many cases, permanently lost funds.", color: "#5b8ff9" },
                                { n: "4", title: "Lack of Native Internet Payments", desc: "There is no standard way for APIs, software, and AI agents to accept payments per request in a native, automated way. Every existing solution requires subscriptions, API keys, and human interaction.", color: "#a78bfa" },
                            ].map(p => (
                                <div key={p.n} style={{ background: "var(--surface)", borderLeft: `3px solid ${p.color}`, borderRadius: 10, padding: "16px 20px" }}>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: p.color, marginBottom: 6 }}>{p.n}. {p.title}</p>
                                    <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.7 }}>{p.desc}</p>
                                </div>
                            ))}
                        </div>
                        <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--ink-1)", marginBottom: 16 }}>Conduit's Solution</h3>
                        <P>Conduit solves all four problems with four core primitives:</P>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
                            {[
                                { title: "Payment Abstraction", desc: "Users never interact with wallet addresses directly. Instead they use payment links, @usernames, and checkout flows. The wallet is handled invisibly in the background." },
                                { title: "Privacy Layer — Stealth Architecture", desc: "Payments route through temporary intermediary wallets. The sender never sees your real address. On-chain history cannot be linked back to you. Optional — toggle per link." },
                                { title: "Cross-Chain Settlement Layer", desc: "Through Circle's CCTP V2, a payer can send from Ethereum, Base, Arbitrum, or Polygon while you always receive in USDC on Arc. No bridging required on either side." },
                                { title: "Programmable Payment Layer — x402", desc: "APIs return a 402 Payment Required response. AI agents pay automatically in USDC. Every API call becomes a monetized transaction with no accounts or subscriptions." },
                            ].map((p, i) => (
                                <div key={p.title} style={{ display: "flex", gap: 16, background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: 12, padding: "16px 20px" }}>
                                    <span style={{ fontSize: 11, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, flexShrink: 0, marginTop: 2 }}>0{i + 1}</span>
                                    <div>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-1)", marginBottom: 4 }}>{p.title}</p>
                                        <p style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6 }}>{p.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Section>

                    <Section id="payment-links" title="Payment Links">
                        <P>A payment link is a shareable URL that lets anyone pay you USDC instantly. No wallet address sharing. No network selection. One link, one click, done.</P>
                        <Steps items={[
                            { n: "01", t: "Create a link", d: "Go to conduitpay.xyz, click Create Link. Set a title, amount in USDC, and optional description." },
                            { n: "02", t: "Share it", d: "Copy the link and share it anywhere — DM, email, invoice, social media." },
                            { n: "03", t: "Payer clicks and pays", d: "The payer opens the link, connects their wallet, and confirms the payment. No account needed." },
                            { n: "04", t: "You receive USDC", d: "Funds land in your wallet in under half a second. You get an email notification if you've added your email." },
                        ]} />
                        <Cards items={[
                            { title: "One-time use", desc: "Each link can only be paid once. No double payments, no accidental duplicates." },
                            { title: "Optional expiry", desc: "Set an expiry date on any link. It automatically becomes inactive after that date." },
                            { title: "Works from any chain", desc: "The payer can be on Ethereum, Base, Arbitrum, or Polygon. You always receive on Arc." },
                            { title: "0.5% fee", desc: "Conduit takes 0.5% per payment — the lowest in the space. No other hidden charges." },
                        ]} />
                    </Section>

                    <Section id="stealth-mode" title="Stealth Mode">
                        <P>Stealth mode is an optional privacy toggle on every payment link. When enabled, your real wallet address is never exposed to payers or visible on the blockchain.</P>
                        <P>When stealth mode is ON:</P>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                            {[
                                "Conduit generates a fresh temporary wallet for that link",
                                "The payer sends USDC to the temporary wallet",
                                "Conduit's forwarder automatically routes the funds to your real wallet",
                                "The payer only ever sees the temporary address — never your real one",
                            ].map(item => (
                                <div key={item} style={{ display: "flex", gap: 10, fontSize: 14, color: "var(--ink-3)" }}>
                                    <span style={{ color: "var(--c)", flexShrink: 0 }}>→</span>{item}
                                </div>
                            ))}
                        </div>
                        <Note>Stealth mode is optional. Toggle it per link — not all or nothing. If privacy isn't a concern, leave it off and payments go directly to your wallet.</Note>
                        <P><strong style={{ color: "var(--ink-2)" }}>Why does privacy matter?</strong> On a public blockchain, your wallet address is like a bank account number anyone can search. If you share it with every client, they can see your full transaction history and balance. Stealth mode solves that.</P>
                    </Section>

                    <Section id="multi-chain" title="Multi-Chain Payments">
                        <P>Conduit uses Circle's CCTP V2 to accept payments from any supported blockchain. The payer doesn't need to be on Arc — they can pay from wherever they are.</P>
                        <div style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "10px 20px", background: "var(--raised)", borderBottom: "1px solid var(--stroke)" }}>
                                <span style={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-3)", fontWeight: 700, letterSpacing: ".1em" }}>PAYER'S CHAIN</span>
                                <span style={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-3)", fontWeight: 700, letterSpacing: ".1em" }}>YOU RECEIVE ON</span>
                            </div>
                            {["Ethereum", "Base", "Arbitrum", "Optimism", "Polygon", "Avalanche"].map((from, i, arr) => (
                                <div key={from} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "10px 20px", borderBottom: i < arr.length - 1 ? "1px solid var(--stroke)" : "none" }}>
                                    <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{from}</span>
                                    <span style={{ fontSize: 12, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>Arc Network</span>
                                </div>
                            ))}
                        </div>
                        <P>Neither the payer nor the receiver needs to know or care about network selection. Conduit handles the routing entirely.</P>
                    </Section>

                    <Section id="escrow" title="Escrow">
                        <P>Escrow protects both buyer and seller in a peer-to-peer transaction. The buyer locks USDC before anything is delivered. Funds are held securely until the buyer confirms receipt — then released instantly to the seller.</P>
                        <Note>All escrow funds are held in a <strong>Circle Developer-Controlled Wallet</strong> — a secure MPC wallet managed by Circle's infrastructure. No private keys are stored in Conduit's database. No one can steal the funds, even if Conduit is compromised.</Note>
                        <Steps items={[
                            { n: "01", t: "Seller creates the escrow link", d: "Sets title, description, amount, and delivery window (e.g. 7 days). Shares the link with the buyer." },
                            { n: "02", t: "Buyer pays", d: "Buyer opens the link and pays. USDC is locked in a Circle wallet. Status becomes HOLDING." },
                            { n: "03", t: "Seller delivers", d: "Seller completes the work or delivers the goods within the agreed window." },
                            { n: "04", t: "Buyer confirms receipt", d: "Buyer logs in and clicks Confirm Receipt. Funds release instantly to the seller." },
                            { n: "05", t: "Auto-release", d: "If the buyer doesn't confirm or dispute within 7 days after delivery, funds auto-release to the seller." },
                        ]} />
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink-1)", marginBottom: 12 }}>Escrow statuses</h3>
                        <div style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
                            {[
                                { status: "ACTIVE", desc: "Escrow created, waiting for buyer to pay", color: "#f5a623" },
                                { status: "HOLDING", desc: "Buyer paid — funds locked, waiting for delivery", color: "#5b8ff9" },
                                { status: "CONFIRMED", desc: "Buyer confirmed receipt — release in progress", color: "#00E5A0" },
                                { status: "RELEASED", desc: "Funds transferred to seller", color: "#00E5A0" },
                                { status: "DISPUTED", desc: "Buyer raised a dispute — mediation in progress", color: "#f03e5f" },
                                { status: "CANCELLED", desc: "Escrow refunded to buyer", color: "#666" },
                            ].map((s, i, arr) => (
                                <div key={s.status} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderBottom: i < arr.length - 1 ? "1px solid var(--stroke)" : "none" }}>
                                    <span style={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color: s.color, background: `${s.color}15`, border: `1px solid ${s.color}30`, borderRadius: 4, padding: "1px 7px", flexShrink: 0 }}>{s.status}</span>
                                    <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{s.desc}</span>
                                </div>
                            ))}
                        </div>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink-1)", marginBottom: 12 }}>Disputes</h3>
                        <P>If something goes wrong, the buyer can raise a dispute before confirming. Both parties have 48 hours to submit evidence in a mediation thread.</P>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                            {[
                                "Seller goes silent for 48 hours → funds automatically refunded to buyer",
                                "Buyer goes silent after seller responds → funds automatically released to seller",
                                "Both respond → escalates to admin review with full context",
                            ].map(item => (
                                <div key={item} style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--ink-3)" }}>
                                    <span style={{ color: "var(--c)", flexShrink: 0 }}>→</span>{item}
                                </div>
                            ))}
                        </div>
                    </Section>

                    <Section id="ai-dispute" title="AI Dispute Agent">
                        <P>Conduit uses an AI mediator powered by Google Gemini 2.0 Flash to automatically resolve escrow disputes. When a dispute is escalated, the AI reads the full evidence thread and issues a binding verdict.</P>
                        <Cards items={[
                            { title: "RELEASE", desc: "Funds go to seller. Triggered when seller provided convincing delivery evidence or buyer's claim is unsubstantiated.", color: "var(--c)" },
                            { title: "REFUND", desc: "Funds go to buyer. Triggered when seller failed to deliver, ignored the dispute, or has no evidence.", color: "#f03e5f" },
                            { title: "UNCERTAIN", desc: "Human review needed. Triggered when evidence is genuinely ambiguous or both sides have valid claims.", color: "#f5a623" },
                            { title: "Auto-execution", desc: "If confidence is 80% or above, the verdict executes automatically via Circle wallet. No human needed.", color: "#a78bfa" },
                        ]} />
                        <P>The AI evaluates only the content of the dispute thread — not wallet identities. Decisions are consistent, evidence-based, and instant.</P>
                    </Section>

                    <Section id="seedless-wallets" title="Seedless Wallets">
                        <P>You don't need MetaMask or a seed phrase to use Conduit. Sign up with your email, Google account, or a passkey — and a wallet is created for you automatically.</P>
                        <Cards items={[
                            { title: "Email signup", desc: "Enter your email, verify it, and your Arc wallet is ready. No downloads, no extensions." },
                            { title: "Google login", desc: "Sign in with Google in one click. Your wallet is created and linked to your Google account." },
                            { title: "Passkey", desc: "Use Face ID, Touch ID, or your device PIN as your login. Most secure option." },
                            { title: "MetaMask support", desc: "Already have a wallet? Connect MetaMask or any injected wallet instead." },
                        ]} />
                        <Note>Seedless wallets are powered by Privy, a professional wallet infrastructure provider. Your wallet is non-custodial — Conduit never holds your funds or keys.</Note>
                    </Section>

                    <Section id="username-payments" title="Username Payments">
                        <P>Claim a @username and get a personal payment page at <strong style={{ color: "var(--c)" }}>conduitpay.xyz/u/yourname</strong>. Share your username instead of a wallet address.</P>
                        <Steps items={[
                            { n: "01", t: "Go to Profile", d: "Click Account → Profile in the navigation. Connect your wallet or sign in first." },
                            { n: "02", t: "Claim your username", d: "Enter a username (letters, numbers, underscores only, 3–20 characters). Sign to verify ownership." },
                            { n: "03", t: "Share your page", d: "Your pay page is live at conduitpay.xyz/u/yourname. Share it anywhere instead of your wallet address." },
                            { n: "04", t: "Receive payments", d: "Anyone can visit your page and pay you directly. Funds go straight to your wallet." },
                        ]} />
                    </Section>

                    <Section id="notifications" title="Email Notifications">
                        <P>Add your email in your profile settings to receive automatic notifications for every payment event.</P>
                        <div style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "10px 20px", background: "var(--raised)", borderBottom: "1px solid var(--stroke)" }}>
                                <span style={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-3)", fontWeight: 700, letterSpacing: ".1em" }}>EVENT</span>
                                <span style={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-3)", fontWeight: 700, letterSpacing: ".1em" }}>WHO GETS NOTIFIED</span>
                            </div>
                            {[
                                { event: "Payment link paid", who: "Seller" },
                                { event: "Escrow funded by buyer", who: "Seller" },
                                { event: "Escrow funds released", who: "Buyer" },
                                { event: "Dispute raised", who: "Seller" },
                                { event: "Escrow refunded", who: "Buyer" },
                                { event: "Marketplace listing approved", who: "Developer" },
                                { event: "Marketplace listing rejected", who: "Developer" },
                            ].map((r, i, arr) => (
                                <div key={r.event} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "10px 20px", borderBottom: i < arr.length - 1 ? "1px solid var(--stroke)" : "none" }}>
                                    <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{r.event}</span>
                                    <span style={{ fontSize: 13, color: "var(--c)", fontWeight: 600 }}>{r.who}</span>
                                </div>
                            ))}
                        </div>
                        <Note>Go to <strong>Account → Profile</strong> and add your email to activate notifications. Emails are sent from <strong>noreply@conduitpay.xyz</strong>.</Note>
                    </Section>

                    <Section id="x402" title="x402 & Marketplace">
                        <P>x402 is a payment protocol for the internet. It lets any API charge USDC per request automatically. AI agents pay without human involvement. Browsers get a pay page.</P>
                        <P>Conduit is the first public x402 facilitator on Arc Network. Any developer can use it with one line of code.</P>
                        <Note><strong>Try it now:</strong> Visit <a href="https://conduitpay.xyz/api/arc-stats" target="_blank" rel="noopener noreferrer" style={{ color: "var(--c)" }}>conduitpay.xyz/api/arc-stats</a> in your browser. Pay 0.001 USDC. Get live Arc Network data back instantly.</Note>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink-1)", marginBottom: 12 }}>The API Marketplace</h3>
                        <P>Developers list their x402-gated APIs on the Conduit Marketplace. AI agents and humans browse, pay per request, and get data back automatically.</P>
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            <a href="https://conduitpay.xyz/marketplace" style={{ padding: "10px 20px", background: "var(--c)", borderRadius: 8, color: "#000", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Browse Marketplace →</a>
                            <Link href="/developers" style={{ padding: "10px 20px", background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: 8, color: "var(--ink-2)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Developer Docs →</Link>
                        </div>
                    </Section>

                    <Section id="getting-started" title="Getting Started">
                        <Steps items={[
                            { n: "01", t: "Go to conduitpay.xyz", d: "Open the app in your browser. No download required." },
                            { n: "02", t: "Connect or create a wallet", d: "Sign in with email, Google, or passkey — or connect MetaMask if you already have a wallet." },
                            { n: "03", t: "Get testnet USDC", d: "Go to faucet.circle.com, select Arc Testnet, and paste your wallet address. Free USDC arrives in under a minute." },
                            { n: "04", t: "Create a payment link", d: "Click Create Link, set a title and amount, and share the URL with anyone." },
                            { n: "05", t: "Add your email", d: "Go to Account → Profile and add your email to receive payment notifications." },
                            { n: "06", t: "Claim your username", d: "Set a @username in your profile to get a personal pay page at conduitpay.xyz/u/yourname." },
                        ]} />
                    </Section>

                    <Section id="faq" title="FAQ">
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            {[
                                { q: "Is Conduit custodial? Does it hold my funds?", a: "No. Conduit never holds your funds. Payment links go directly to your wallet. Escrow funds are held in Circle Developer-Controlled Wallets — not Conduit's servers." },
                                { q: "What is USDC?", a: "USDC is a digital dollar issued by Circle. 1 USDC = $1 USD, always. It's a stablecoin — it doesn't go up or down in price like Bitcoin." },
                                { q: "What is Arc Network?", a: "Arc is a new blockchain built by Circle specifically for USDC payments. Transactions settle in half a second and cost almost nothing. Conduit is built natively on Arc." },
                                { q: "Do I need MetaMask?", a: "No. Conduit supports seedless wallets — sign up with email, Google, or passkey. No MetaMask, no seed phrase required." },
                                { q: "What chains can payers use?", a: "Payers can send from Ethereum, Base, Arbitrum, Optimism, Polygon, or Avalanche. You always receive in USDC on Arc regardless of where they send from." },
                                { q: "What is the fee?", a: "Conduit charges 0.5% per payment. This is deducted automatically. There are no other fees, no subscriptions, no hidden charges." },
                                { q: "What happens if a payment link expires unpaid?", a: "It becomes inactive automatically. You can create a new link at any time." },
                                { q: "Is Conduit live on mainnet?", a: "Conduit is currently live on Arc Testnet. Mainnet launch is planned for when Arc Network goes live. All testnet transactions use free testnet USDC." },
                            ].map(f => (
                                <div key={f.q} style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: 12, padding: "18px 20px" }}>
                                    <p style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-1)", marginBottom: 8 }}>{f.q}</p>
                                    <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.7 }}>{f.a}</p>
                                </div>
                            ))}
                        </div>
                    </Section>

                    <div style={{ background: "var(--c-dim)", border: "1px solid var(--c-border)", borderRadius: 16, padding: "32px", textAlign: "center" }}>
                        <p style={{ fontSize: 18, fontWeight: 800, color: "var(--ink-1)", marginBottom: 8 }}>Ready to get started?</p>
                        <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 24 }}>Create your first payment link in under a minute.</p>
                        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                            <a href="https://conduitpay.xyz" style={{ padding: "11px 22px", background: "var(--c)", borderRadius: 8, color: "#000", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Open Conduit →</a>
                            <Link href="/developers" style={{ padding: "11px 22px", background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: 8, color: "var(--ink-2)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Developer Docs →</Link>
                        </div>
                    </div>

                </main>
            </div>

            <div style={{ borderTop: "1px solid var(--stroke)", padding: "24px 40px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Built on Arc Network · Powered by Circle USDC</span>
                <span style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>conduitpay.xyz</span>
            </div>
        </div>
    );
}