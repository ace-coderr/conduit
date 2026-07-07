"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { StatsRow } from "@/components/StatsRow";
import { CreateLinkForm } from "@/components/CreateLinkForm";
import { PaymentLinksTable } from "@/components/PaymentLinksTable";
import { PaymentFlowVisual } from "@/components/PaymentFlowVisual";
import { HeroStats } from "@/components/HeroStats";
import { LandingStats } from "@/components/LandingStats";
import { VolumeChart } from "@/components/VolumeChart";
import { StatusDonut } from "@/components/StatusDonut";
import { ActivityFeed } from "@/components/ActivityFeed";

export default function HomePage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState({ totalLinks: 0, completedLinks: 0, totalEarned: "0" });
  const { address } = useAccount();
  const { login, authenticated } = usePrivy();

  useEffect(() => { setMounted(true); }, []);

  const fetchStats = useCallback(async () => {
    if (!address) return;
    try {
      const res = await fetch(`/api/links?address=${address}`);
      if (!res.ok) return;
      const { links = [] } = await res.json();
      const done = links.filter((l: any) => l.status === "COMPLETED");
      const total = done.reduce((s: number, l: any) => s + parseFloat(l.amount || "0"), 0).toFixed(2);
      setStats({ totalLinks: links.length, completedLinks: done.length, totalEarned: total });
    } catch { }
  }, [address]);

  useEffect(() => {
    if (authenticated && address) fetchStats();
  }, [authenticated, address, fetchStats, refreshTrigger]);

  const TRUST_ITEMS = [
    {
      label: "One-time use",
      icon: <svg viewBox="0 0 14 14" fill="none" width="12" height="12"><path d="M7 1l1.8 3.6L13 5.45l-3 2.92.7 4.13L7 10.6l-3.7 1.9.7-4.13L1 5.45l4.2-.85L7 1z" stroke="var(--c)" strokeWidth="1.2" strokeLinejoin="round" /></svg>
    },
    {
      label: "Stealth privacy",
      icon: <svg viewBox="0 0 14 14" fill="none" width="12" height="12"><rect x="2.5" y="6" width="9" height="7" rx="1.5" stroke="var(--c)" strokeWidth="1.2" /><path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="var(--c)" strokeWidth="1.2" strokeLinecap="round" /></svg>
    },
    {
      label: "Multi-chain",
      icon: <svg viewBox="0 0 14 14" fill="none" width="12" height="12"><circle cx="7" cy="7" r="5.5" stroke="var(--c)" strokeWidth="1.2" /><path d="M1.5 7h11M7 1.5c-1.5 1.5-1.5 9 0 11M7 1.5c1.5 1.5 1.5 9 0 11" stroke="var(--c)" strokeWidth="1.2" /></svg>
    },
    {
      label: "No KYC",
      icon: <svg viewBox="0 0 14 14" fill="none" width="12" height="12"><path d="M2 7l3.5 3.5L12 3" stroke="var(--c)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
    },
  ];

  const AGENT_PILLARS = [
    {
      icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><path d="M5 4l-3 4 3 4M11 4l3 4-3 4M9 2l-2 12" strokeLinecap="round" strokeLinejoin="round" /></svg>,
      title: "x402 Facilitator",
      desc: "Gate any API behind a USDC micropayment. Humans see a pay page; agents pay via EIP-3009 authorization.",
      href: "https://conduitpay.mintlify.app",
    },
    {
      icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><rect x="3" y="5" width="10" height="8" rx="1.5" /><path d="M8 5V3M6 2.5h4" strokeLinecap="round" /><circle cx="6" cy="9" r="0.8" fill="currentColor" /><circle cx="10" cy="9" r="0.8" fill="currentColor" /></svg>,
      title: "Agent Wallets",
      desc: "Give an agent its own USDC wallet with a daily spend limit and an address allowlist.",
      href: "/agents",
    },
    {
      icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><path d="M2 3h12l-1 8H3L2 3z" strokeLinecap="round" /><path d="M6 3V2a2 2 0 014 0v1" strokeLinecap="round" /></svg>,
      title: "API Marketplace",
      desc: "Discover x402-gated APIs and pay per request in USDC — no subscriptions.",
      href: "/marketplace",
    },
  ];

  const CORE_FEATURES = [
    {
      icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><path d="M9 6a3 3 0 010 4.24l-1.5 1.5a3 3 0 01-4.24-4.24l.75-.75" strokeLinecap="round" /><path d="M7 10a3 3 0 010-4.24l1.5-1.5a3 3 0 014.24 4.24l-.75.75" strokeLinecap="round" /></svg>,
      title: "Payment Links",
      desc: "Shareable one-time USDC links with a title, amount, and optional expiry.",
    },
    {
      icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><rect x="2.5" y="7" width="11" height="7.5" rx="1.5" /><path d="M5 7V5a3 3 0 016 0v2" /></svg>,
      title: "Stealth Mode",
      desc: "Routes payments through a temporary wallet — your real address never shows.",
    },
    {
      icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><circle cx="8" cy="5" r="3" /><path d="M2 14c0-3.31 2.69-6 6-6s6 2.69 6 6" strokeLinecap="round" /></svg>,
      title: "Username Payments",
      desc: "Claim @yourname and share conduitpay.xyz/u/yourname instead of an address.",
    },
    {
      icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><circle cx="4" cy="4" r="2.2" /><circle cx="12" cy="4" r="2.2" /><circle cx="8" cy="12" r="2.2" /><path d="M4 6.2v1.3h8V6.2M8 7.5v2.3" strokeLinecap="round" /></svg>,
      title: "Payment Splits",
      desc: "One incoming payment, auto-divided to multiple wallets by percentage.",
    },
  ];

  const MEDIATION_STEPS = [
    { n: "01", t: "Fund", d: "Buyer sends USDC into escrow, held by a Circle Developer-Controlled Wallet." },
    { n: "02", t: "Deliver", d: "Seller delivers within the agreed window; buyer confirms to release funds." },
    { n: "03", t: "Dispute", d: "If something's wrong, buyer opens a dispute — both sides post evidence." },
    { n: "04", t: "AI Verdict", d: "Gemini 2.0 Flash reads the thread. 80%+ confidence auto-executes the outcome." },
  ];

  const MEDIATION_FACTS = [
    { t: "Delivery windows", d: "Seller sets a delivery deadline; the window auto-releases funds if the buyer goes silent." },
    { t: "Auto-resolution", d: "48h of seller silence → auto-refund. 48h of buyer silence → auto-release." },
    { t: "Circle-held custody", d: "Funds sit in a Circle Developer-Controlled Wallet, not with Conduit." },
  ];

  const CHECK_ICON = <svg viewBox="0 0 16 16" fill="none" stroke="var(--c)" strokeWidth="1.6" width="15" height="15"><path d="M3 8.5l3.2 3.2L13 4.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;

  const CHAIN_ICON = <svg viewBox="0 0 14 14" fill="none" width="12" height="12"><circle cx="7" cy="7" r="5.5" stroke="var(--c)" strokeWidth="1.2" /><path d="M1.5 7h11M7 1.5c-1.5 1.5-1.5 9 0 11M7 1.5c1.5 1.5 1.5 9 0 11" stroke="var(--c)" strokeWidth="1.2" /></svg>;
  const CHAINS = ["Base", "Ethereum", "Arbitrum", "Polygon", "Avalanche", "Optimism"];

  const AUTH_METHODS = [
    {
      label: "Email",
      icon: <svg viewBox="0 0 16 16" fill="none" stroke="var(--c)" strokeWidth="1.3" width="12" height="12"><rect x="1.5" y="3.5" width="13" height="9" rx="1.5" /><path d="M2 4l6 5 6-5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    },
    {
      label: "Google",
      icon: <svg viewBox="0 0 16 16" fill="none" stroke="var(--c)" strokeWidth="1.3" width="12" height="12"><circle cx="8" cy="8" r="6" /><circle cx="8" cy="6.6" r="1.9" /><path d="M4.2 12.6c.7-1.9 2.2-2.7 3.8-2.7s3.1.8 3.8 2.7" strokeLinecap="round" /></svg>,
    },
    {
      label: "Passkey",
      icon: <svg viewBox="0 0 16 16" fill="none" stroke="var(--c)" strokeWidth="1.3" width="12" height="12"><path d="M8 3a5 5 0 015 5v1.3" strokeLinecap="round" /><path d="M3 9.3V8a5 5 0 011.4-3.5" strokeLinecap="round" /><path d="M5.3 12.6A4.5 4.5 0 015 8a3 3 0 016 0v1.8" strokeLinecap="round" /><path d="M8 6.6a1.5 1.5 0 011.5 1.5v2.1c0 1-.3 2-.9 2.8" strokeLinecap="round" /></svg>,
    },
    {
      label: "MetaMask",
      icon: <svg viewBox="0 0 16 16" fill="none" stroke="var(--c)" strokeWidth="1.3" width="12" height="12"><rect x="1.5" y="4.5" width="13" height="9" rx="1.5" /><path d="M1.5 7h13" /><circle cx="11.3" cy="10.2" r="0.9" fill="var(--c)" stroke="none" /></svg>,
    },
  ];

  const ESCROW_STATUSES = [
    { label: "ACTIVE", cls: "badge-green" },
    { label: "DISPUTED", cls: "badge-yellow" },
    { label: "RELEASED", cls: "badge-green" },
  ];

  const GATE_SNIPPET: { t: string; c?: string }[] = [
    { t: "# Install", c: "code-cm" },
    { t: "npm install @ace_won/x402", c: "code-kw" },
    { t: "" },
    { t: "# Gate any route behind a USDC micropayment", c: "code-cm" },
    { t: "import { withPayment } from '@ace_won/x402';", c: "code-imp" },
    { t: "" },
    { t: "export const GET = withPayment({ amount: '0.001' }, async (req) => {" },
    { t: "  return NextResponse.json({ data: 'paid content' });" },
    { t: "});" },
  ];

  const AGENT_SNIPPET: { t: string; c?: string }[] = [
    { t: "# One call: agent discovers the paywall, pays from its own wallet, gets data back", c: "code-cm" },
    { t: "curl -X POST https://www.conduitpay.xyz/api/agents/x402-fetch \\", c: "code-kw" },
    { t: "  -H \"Authorization: Bearer cak_live_...\" \\" },
    { t: "  -d '{\"url\":\"https://www.conduitpay.xyz/api/arc-stats\"}'", c: "code-str" },
  ];

  return (
    <div className="app">
      <NavBar />

      <div className="app-body">
        {!mounted && <div className="loading-wrap"><div className="page-spinner" /></div>}

        {/* Landing */}
        {mounted && !authenticated && (
          <>
            {/* 1. Hero */}
            <div className="landing fade-in">
              <div className="landing-inner landing-inner-v2">
                <div>
                  <div className="hero-eyebrow">
                    <span className="hero-eyebrow-dot pulse-dot" />
                    <span className="hero-eyebrow-text">LIVE ON ARC TESTNET</span>
                  </div>

                  <h1 className="hero-title hero-title-v2">
                    The USDC payment rail for<br />
                    <em>humans and AI agents</em> on Arc
                  </h1>

                  <p className="hero-desc">
                    Payment links, escrow, x402 micropayments, and autonomous agent
                    wallets — all settled in USDC on Arc Network. No gas, no custody,
                    no seed phrases.
                  </p>

                  <div className="hero-cta">
                    <button className="btn-hero" onClick={login}>
                      Create a Payment Link
                    </button>
                    <Link href="/marketplace" className="btn-hero-ghost">
                      Explore the x402 Marketplace →
                    </Link>
                  </div>

                  <div className="trust-row">
                    {TRUST_ITEMS.map((t) => (
                      <div key={t.label} className="trust-item">
                        {t.icon}
                        {t.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live payment flow visual + stat pills */}
                <div className="flow-stage fade-up" style={{ animationDelay: ".1s" }}>
                  <PaymentFlowVisual />
                  <HeroStats />
                </div>
              </div>
            </div>

            {/* 2. Stats strip (live) + first-on-Arc badge */}
            <LandingStats />

            {/* 3a. Flagship — x402 Facilitator & the Autonomous Agent Economy */}
            <div className="landing-section">
              <div className="landing-container">
                <div className="landing-section-head">
                  <div className="landing-eyebrow">THE FLAGSHIP</div>
                  <h2 className="landing-h2">The x402 Facilitator & the Autonomous Agent Economy</h2>
                  <p className="landing-p">
                    Conduit is the first x402 facilitator live on Arc Network — any developer
                    can gate an API behind a USDC micropayment, and any AI agent can discover
                    it, pay it, and get the data back with zero humans in the loop.
                  </p>
                </div>

                <div className="flagship-grid">
                  <div>
                    <div className="pillar-list">
                      {AGENT_PILLARS.map((p) => (
                        <a
                          key={p.title}
                          href={p.href}
                          {...(p.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                          className="pillar-card"
                        >
                          <div className="pillar-icon">{p.icon}</div>
                          <div className="pillar-body">
                            <div className="pillar-title">{p.title}</div>
                            <div className="pillar-desc">{p.desc}</div>
                          </div>
                          <span className="pillar-arrow">→</span>
                        </a>
                      ))}
                    </div>
                  </div>

                  <div className="code-panel-wrap">
                    <div className="code-panel-label">gate-a-route.ts · @ace_won/x402</div>
                    <div className="listing-detail-code">
                      {GATE_SNIPPET.map((l, i) => (
                        <p key={i} className={l.c || "code-plain"}>{l.t || " "}</p>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 28 }}>
                  <div className="code-panel-label" style={{ marginBottom: 14 }}>autonomous agent flow · one call</div>
                  <div className="listing-detail-code">
                    {AGENT_SNIPPET.map((l, i) => (
                      <p key={i} className={l.c || "code-plain"}>{l.t || " "}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 3b. Escrow + AI mediation */}
            <div className="landing-section landing-section-alt">
              <div className="landing-container">
                <div className="landing-section-head">
                  <div className="landing-eyebrow">ESCROW</div>
                  <h2 className="landing-h2">P2P escrow, mediated by AI</h2>
                  <p className="landing-p">
                    Lock USDC in a Circle Developer-Controlled Wallet until delivery is
                    confirmed. If a dispute comes up, both sides submit evidence — and
                    Conduit's AI dispute agent reads the thread and issues a binding verdict.
                  </p>
                </div>

                <div className="mediation-grid">
                  <div>
                    <div className="gemini-badge">✦ Gemini 2.0 Flash — AI Dispute Agent</div>
                    <div className="escrow-status-row">
                      {ESCROW_STATUSES.map((s) => (
                        <span key={s.label} className={`badge ${s.cls}`}><span className="badge-dot" />{s.label}</span>
                      ))}
                    </div>
                    <div className="pillar-list">
                      {MEDIATION_FACTS.map((f) => (
                        <div key={f.t} className="pillar-card" style={{ cursor: "default" }}>
                          <div className="pillar-icon">{CHECK_ICON}</div>
                          <div className="pillar-body">
                            <div className="pillar-title">{f.t}</div>
                            <div className="pillar-desc">{f.d}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mediation-steps">
                    {MEDIATION_STEPS.map((s) => (
                      <div key={s.n} className="step-card">
                        <div className="step-num">{s.n}</div>
                        <div className="step-title">{s.t}</div>
                        <div className="step-desc">{s.d}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 3c. Core payments — compact, table stakes */}
            <div className="landing-section-tight">
              <div className="landing-container">
                <div className="landing-section-head-center">
                  <div className="landing-eyebrow">CORE PAYMENTS</div>
                  <h2 className="landing-h2">Everything you'd expect from a payment rail</h2>
                </div>

                <div className="core-grid">
                  {CORE_FEATURES.map((f) => (
                    <div key={f.title} className="core-card">
                      <div className="core-icon">{f.icon}</div>
                      <div className="core-title">{f.title}</div>
                      <div className="core-desc">{f.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3d. Multi-chain via CCTP V2 */}
            <div className="landing-section-tight landing-section-alt">
              <div className="landing-container">
                <div className="showcase-band">
                  <div>
                    <div className="landing-eyebrow">MULTI-CHAIN</div>
                    <h2 className="landing-h2">Accept USDC from anywhere, settle on Arc</h2>
                    <p className="landing-p">
                      Circle's CCTP V2 abstracts away chain selection. Payers send from
                      wherever they already are — you always receive USDC on Arc. No
                      bridging UI, no manual network switching.
                    </p>
                  </div>
                  <div className="chain-chip-row">
                    {CHAINS.map((c) => (
                      <div key={c} className="feat">{CHAIN_ICON}{c}</div>
                    ))}
                    <span className="chain-arrow">→</span>
                    <div className="chain-endpoint">Settles on Arc</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3e. Seedless wallets via Privy */}
            <div className="landing-section-tight">
              <div className="landing-container">
                <div className="showcase-band">
                  <div className="method-chip-row">
                    {AUTH_METHODS.map((m) => (
                      <div key={m.label} className="feat">{m.icon}{m.label}</div>
                    ))}
                  </div>
                  <div>
                    <div className="landing-eyebrow">SEEDLESS WALLETS</div>
                    <h2 className="landing-h2">No seed phrase. No extension required.</h2>
                    <p className="landing-p">
                      Sign up with email, Google, or a passkey — Privy creates a
                      non-custodial Arc wallet secured with MPC. Conduit never holds
                      your keys; export your wallet anytime from your profile.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. How it works */}
            <div className="landing-section landing-section-alt">
              <div className="landing-container">
                <div className="landing-section-head-center">
                  <div className="landing-eyebrow">HOW IT WORKS</div>
                  <h2 className="landing-h2">Get paid in three steps</h2>
                </div>
                <div className="steps-grid">
                  {[
                    { n: "01", t: "Create a link", d: "Set a title and USDC amount. Enable stealth mode to hide your real wallet address from the payer." },
                    { n: "02", t: "Share it", d: "Copy the link and send it via DM, email, invoice, or embed it anywhere. No website needed." },
                    { n: "03", t: "Get paid instantly", d: "Payer connects their wallet — from Arc or any supported chain — and pays. Funds arrive in seconds." },
                  ].map((s) => (
                    <div key={s.n} className="step-card">
                      <div className="step-num">{s.n}</div>
                      <div className="step-title">{s.t}</div>
                      <div className="step-desc">{s.d}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 5. For developers / agents */}
            <div className="landing-section">
              <div className="landing-container">
                <div className="landing-section-head">
                  <div className="landing-eyebrow">FOR DEVELOPERS & AGENTS</div>
                  <h2 className="landing-h2">Build on Conduit</h2>
                  <p className="landing-p">
                    One package to monetize an API. One API to give an agent its own
                    spending wallet.
                  </p>
                </div>

                <div className="dev-grid">
                  <div className="dev-col">
                    <div className="dev-col-title">For builders</div>
                    <p className="landing-p">
                      Publish an x402-gated API in one line with the <code>@ace_won/x402</code> npm
                      package, then list it on the Marketplace so agents and developers can
                      discover and pay for it per request — no subscriptions.
                    </p>
                    <div className="dev-links">
                      <a className="dev-link-chip" href="https://npmjs.com/package/@ace_won/x402" target="_blank" rel="noopener noreferrer">npm: @ace_won/x402 ↗</a>
                      <Link className="dev-link-chip" href="/marketplace">Browse Marketplace →</Link>
                      <a className="dev-link-chip" href="https://conduitpay.mintlify.app" target="_blank" rel="noopener noreferrer">Full Docs ↗</a>
                    </div>
                  </div>

                  <div className="dev-col">
                    <div className="dev-col-title">For agents</div>
                    <p className="landing-p">
                      Give an AI agent its own USDC wallet with a daily spend limit and an
                      address allowlist. It authenticates with an API key — never a seed
                      phrase — and any blocked spend is logged, not executed.
                    </p>
                    <div className="dev-links">
                      <div className="feat"><span className="feat-dot" />Daily spend limit</div>
                      <div className="feat"><span className="feat-dot" />Address allowlist</div>
                      <div className="feat"><span className="feat-dot" />API key, not a seed phrase</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Final CTA */}
            <div className="final-cta-section">
              <div className="landing-container">
                <div className="final-cta-card">
                  <div className="landing-eyebrow" style={{ display: "flex", justifyContent: "center" }}>READY WHEN YOU ARE</div>
                  <h2 className="final-cta-title">Create your first payment link</h2>
                  <p className="final-cta-desc">
                    No sign-up form, no seed phrase, no gas to hold. Sign in with email
                    or a wallet and send your first USDC payment link in under a minute.
                  </p>
                  <div className="final-cta-actions">
                    <button className="btn-hero" onClick={login}>Create a Payment Link</button>
                    <Link href="/marketplace" className="btn-hero-ghost">Explore the Marketplace</Link>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Dashboard */}
        {mounted && authenticated && (
          <div className="page-wrap fade-in">
            <div className="page-header">
              <h1 className="page-title">Dashboard</h1>
              <p className="page-subtitle">Manage your USDC payment links · Powered by Circle & Arc Network</p>
            </div>

            <div className="bento-grid">
              {/* Overview: balance hero + 3 stat tiles */}
              <StatsRow
                totalLinks={stats.totalLinks}
                completedLinks={stats.completedLinks}
                totalEarned={stats.totalEarned}
              />

              {/* Volume chart (hero) + status donut */}
              <div className="bento-cell bento-8 bento-tall">
                <VolumeChart refreshTrigger={refreshTrigger} />
              </div>
              <div className="bento-cell bento-4 bento-tall">
                <StatusDonut refreshTrigger={refreshTrigger} />
              </div>

              {/* Create link form + activity feed — two even columns, no mismatched third neighbor */}
              <div className="bento-cell bento-6">
                <CreateLinkForm onLinkCreated={() => setRefreshTrigger(n => n + 1)} />
              </div>
              <div className="bento-cell bento-6">
                <ActivityFeed refreshTrigger={refreshTrigger} />
              </div>

              {/* Full-width payment links table */}
              <div id="payment-links-table" className="bento-cell bento-12">
                <PaymentLinksTable refreshTrigger={refreshTrigger} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
