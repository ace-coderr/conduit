"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { NavBar } from "@/components/NavBar";
import { StatsRow } from "@/components/StatsRow";
import { CreateLinkForm } from "@/components/CreateLinkForm";
import { PaymentLinksTable } from "@/components/PaymentLinksTable";
import { PaymentFlowVisual } from "@/components/PaymentFlowVisual";
import { HeroStats } from "@/components/HeroStats";
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

  return (
    <div className="app">
      <NavBar />

      <div className="app-body">
        {!mounted && <div className="loading-wrap"><div className="page-spinner" /></div>}

        {/* Landing */}
        {mounted && !authenticated && (
          <>
            <div className="landing fade-in">
              <div className="landing-inner landing-inner-v2">
                <div>
                  <div className="hero-eyebrow">
                    <span className="hero-eyebrow-dot pulse-dot" />
                    <span className="hero-eyebrow-text">LIVE ON ARC TESTNET</span>
                  </div>

                  <h1 className="hero-title hero-title-v2">
                    The payment rail for the<br />
                    <em>agentic economy</em>
                  </h1>

                  <p className="hero-desc">
                    USDC payments for humans and AI agents on Arc — escrow, x402,
                    and autonomous wallets. No gas, no custody, no complexity.
                  </p>

                  <div className="hero-cta">
                    <button className="btn-hero" onClick={login}>
                      Get Started — It's Free
                    </button>
                    <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" className="btn-hero-ghost">
                      Get Testnet USDC ↗
                    </a>
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

            {/* Steps */}
            <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 40px 60px", width: "100%" }}>
              <div className="steps">
                <div className="steps-title">HOW IT WORKS</div>
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

                <div className="features">
                  {["One-time use links", "Stealth mode privacy", "Multi-chain payments", "No sign-up required", "Sub-second settlement", "Open source", "Arc Network native"].map((f) => (
                    <div key={f} className="feat">
                      <span className="feat-dot" />{f}
                    </div>
                  ))}
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
