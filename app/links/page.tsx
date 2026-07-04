"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { NavBar } from "@/components/NavBar";
import { CreateLinkForm } from "@/components/CreateLinkForm";
import { PaymentLinksTable } from "@/components/PaymentLinksTable";

interface LinkStub {
  status: string;
  amount: string;
  stealthAddress?: string;
}

const LINK_STEPS = [
  "Set a title and USDC amount — no sign-up required.",
  "Share the link anywhere — DM, invoice, embed it, or post it.",
  "Payer connects any wallet and pays in seconds — no gas.",
  "Enable stealth mode to route the payment through a temp wallet so your real address stays private.",
];

const IconBolt = ({ color = "var(--c)" }: { color?: string }) => (
  <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M9 2L4 9h4l-1 5 5-7H8l1-5z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" /></svg>
);
const IconLink = ({ color = "var(--warning)" }: { color?: string }) => (
  <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M10.5 7.5a3.5 3.5 0 010 4.95l-1.5 1.5a3.5 3.5 0 01-4.95-4.95l.75-.75" stroke={color} strokeWidth="1.3" strokeLinecap="round" /><path d="M7.5 10.5a3.5 3.5 0 010-4.95l1.5-1.5a3.5 3.5 0 014.95 4.95l-.75.75" stroke={color} strokeWidth="1.3" strokeLinecap="round" /></svg>
);
const IconAlert = ({ color = "var(--danger)" }: { color?: string }) => (
  <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M8 1.5L1 14h14L8 1.5z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" /><path d="M8 6.5v3M8 11.5v.01" stroke={color} strokeWidth="1.4" strokeLinecap="round" /></svg>
);
const IconLayers = ({ color = "var(--info)" }: { color?: string }) => (
  <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M8 1.5l6.5 3.5L8 8.5 1.5 5 8 1.5z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" /><path d="M1.5 9l6.5 3.5L14.5 9M1.5 11.5L8 15l6.5-3.5" stroke={color} strokeWidth="1.3" strokeLinejoin="round" /></svg>
);

export default function LinksPage() {
  const { address, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [links, setLinks] = useState<LinkStub[]>([]);

  useEffect(() => { setMounted(true); }, []);

  // Independent, stats-only fetch — kept separate from PaymentLinksTable's own
  // fetch so that component's data-loading logic stays completely untouched.
  const fetchStats = useCallback(async () => {
    if (!address) return;
    try {
      const res = await fetch(`/api/links?address=${address}`);
      if (!res.ok) return;
      const data = await res.json();
      setLinks((data.links ?? []).filter((l: any) => !l.isEscrow && !l.isRefunded));
    } catch { }
  }, [address]);

  useEffect(() => { if (isConnected && address) fetchStats(); }, [isConnected, address, fetchStats, refresh]);

  const counts = {
    ACTIVE: links.filter(l => l.status === "ACTIVE").length,
    COMPLETED: links.filter(l => l.status === "COMPLETED").length,
    EXPIRED: links.filter(l => l.status === "EXPIRED").length,
  };
  const totalVolume = links.filter(l => l.status === "COMPLETED").reduce((s, l) => s + parseFloat(l.amount), 0);
  const stealthCount = links.filter(l => l.stealthAddress).length;
  const fmt = (n: number) => n % 1 === 0 ? n.toString() : n.toFixed(2);

  const STAT_CARDS = [
    {
      label: "Total Volume", value: fmt(totalVolume), unit: "USDC",
      sub: `${counts.COMPLETED} completed payment${counts.COMPLETED === 1 ? "" : "s"}`,
      color: "var(--c)", dim: "var(--c-dim)", border: "var(--c-border)",
      icon: <IconBolt color="var(--c)" />,
    },
    {
      label: "Active Links", value: counts.ACTIVE.toString(), unit: "",
      sub: "awaiting payment",
      color: "var(--warning)", dim: "var(--warning-dim)", border: "rgba(255,176,46,.3)",
      icon: <IconLink color="var(--warning)" />,
    },
    {
      label: "Expired", value: counts.EXPIRED.toString(), unit: "",
      sub: counts.EXPIRED > 0 ? "no longer payable" : "all clear",
      color: counts.EXPIRED > 0 ? "var(--danger)" : "var(--ink-3)",
      dim: counts.EXPIRED > 0 ? "var(--danger-dim)" : "var(--raised)",
      border: counts.EXPIRED > 0 ? "rgba(255,77,106,.3)" : "var(--stroke)",
      icon: <IconAlert color={counts.EXPIRED > 0 ? "var(--danger)" : "var(--ink-3)"} />,
    },
    {
      label: "Total Links", value: links.length.toString(), unit: "",
      sub: `${stealthCount} using stealth mode`,
      color: "var(--info)", dim: "var(--info-dim)", border: "var(--info-border)",
      icon: <IconLayers color="var(--info)" />,
    },
  ];

  return (
    <div className="app">
      <NavBar />
      <div className="page-wrap">

        <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 className="page-title">Payment Links</h1>
            <p className="page-subtitle">All your payment links — active, completed, and expired</p>
          </div>
          {mounted && isConnected && (
            <button onClick={() => setShowForm(!showForm)} className="form-submit-btn" style={{ width: "auto", padding: "10px 20px" }}>
              {showForm ? "✕ Close" : "+ New Link"}
            </button>
          )}
        </div>

        {mounted && !isConnected && (
          <div className="empty" style={{ paddingTop: 80 }}>
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--ink-3)" strokeWidth="1.5" /><path d="M7 11V7a5 5 0 0110 0v4" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </div>
            <p className="empty-title">Connect your wallet</p>
            <p className="empty-sub">Connect to create and manage payment links</p>
          </div>
        )}

        {mounted && isConnected && (
          <div className="bento-grid">

            {/* Stats */}
            {links.length > 0 && STAT_CARDS.map(s => (
              <div key={s.label} className="bento-cell bento-3">
                <div className="stat-card">
                  <div className="stat-card-line" style={{ background: s.color }} />
                  <div className="stat-icon-wrap" style={{ background: s.dim, borderColor: s.border }}>{s.icon}</div>
                  <div className="stat-value" style={{ color: s.color }}>
                    {s.value}{s.unit && <span style={{ fontSize: 13, color: s.color, marginLeft: 4 }}>{s.unit}</span>}
                  </div>
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-sub" style={{ color: s.color }}>{s.sub}</div>
                </div>
              </div>
            ))}

            {/* Create form + trust panel */}
            {showForm && (
              <>
                <div className="bento-cell bento-7">
                  <CreateLinkForm onLinkCreated={() => setRefresh(n => n + 1)} />
                </div>

                <div className="bento-cell bento-5">
                  <div className="form-card">
                    <div className="form-card-header">
                      <div className="form-card-header-icon">
                        <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><circle cx="8" cy="8" r="6.5" stroke="var(--c)" strokeWidth="1.3" /><path d="M8 5v3.2l2 1.3" stroke="var(--c)" strokeWidth="1.3" strokeLinecap="round" /></svg>
                      </div>
                      <div><div className="form-card-title">How Payment Links Work</div><div className="form-card-subtitle">Get paid in seconds, anywhere</div></div>
                    </div>
                    <div className="form-card-body">
                      <div className="escrow-steps">
                        {LINK_STEPS.map((step, i) => (
                          <div key={i} className="escrow-step">
                            <span className="escrow-step-num">{i + 1}</span>
                            <span className="escrow-step-text">{step}</span>
                          </div>
                        ))}
                      </div>
                      <div className="escrow-fee-note">
                        <svg viewBox="0 0 14 14" fill="none" width="12" height="12" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="7" cy="7" r="5.5" stroke="var(--ink-3)" strokeWidth="1.2" /><path d="M7 4.5v2.8l1.5 1" stroke="var(--ink-3)" strokeWidth="1.2" strokeLinecap="round" /></svg>
                        <span>A 0.5% platform fee is added on top of your amount when the payer pays — you always receive the full link amount you set.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Table */}
            <div id="payment-links-table" className="bento-cell bento-12">
              <PaymentLinksTable refreshTrigger={refresh} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
