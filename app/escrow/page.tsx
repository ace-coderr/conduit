"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAccount } from "wagmi";
import { NavBar } from "@/components/NavBar";
import { formatDate } from "@/lib/utils";

interface EscrowLink {
  id: string;
  title: string;
  description?: string;
  amount: string;
  sellerAddress: string;
  buyerAddress?: string;
  stealthAddress: string;
  status: string;
  txHash?: string;
  releaseTxHash?: string;
  paidAt?: string;
  deliveryDays?: number;
  deliveryDeadline?: string;
  releaseDeadline?: string;
  confirmedAt?: string;
  disputedAt?: string;
  disputeReason?: string;
  createdAt: string;
}

function Countdown({ deadline, label }: { deadline: string; label: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const update = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) { setText("Passed"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      if (d > 0) setText(`${d}d ${h}h`);
      else setText(`${h}h`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [deadline]);
  const diff = new Date(deadline).getTime() - Date.now();
  const color = diff < 3600000 ? "var(--danger)" : diff < 86400000 ? "var(--warning)" : "var(--info)";
  return <span style={{ fontSize: 10, color, fontFamily: "IBM Plex Mono, monospace" }}>{label}: {text}</span>;
}

const statusColor = (s: string) => ({ ACTIVE: "var(--warning)", HOLDING: "var(--info)", CONFIRMED: "var(--c)", RELEASED: "var(--c)", DISPUTED: "var(--danger)", MEDIATION: "var(--danger)", CANCELLED: "var(--ink-3)" }[s] ?? "var(--ink-3)");
const statusClass = (s: string) => ({ ACTIVE: "status-yellow", HOLDING: "status-blue", CONFIRMED: "status-green", RELEASED: "status-green", DISPUTED: "status-red", MEDIATION: "status-red", CANCELLED: "status-red" }[s] ?? "status-red");

// An escrow whose funds have actually left the wallet — show as Released regardless of status label lag
const isEffectivelyReleased = (e: EscrowLink) => e.status === "RELEASED" || (e.status === "CONFIRMED" && !!e.releaseTxHash);

const DELIVERY_PRESETS = [
  { label: "1 day", days: 1 },
  { label: "3 days", days: 3 },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
  { label: "1 month", days: 30 },
  { label: "2 months", days: 60 },
  { label: "3 months", days: 90 },
];

const ESCROW_STEPS = [
  "Buyer pays into escrow — funds are held securely, not sent to you yet.",
  "You deliver the order within the delivery window you set below.",
  "Buyer confirms receipt — funds release to your wallet instantly.",
  "If there's a dispute, both sides submit evidence and it's mediated within 48 hours.",
];

const IconLock = ({ color = "var(--c)" }: { color?: string }) => (
  <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><rect x="2" y="6" width="12" height="9" rx="1.5" stroke={color} strokeWidth="1.3" /><path d="M5 6V4.5a3 3 0 016 0V6" stroke={color} strokeWidth="1.3" strokeLinecap="round" /></svg>
);
const IconCheck = ({ color = "var(--c)" }: { color?: string }) => (
  <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M3 8.5l3.2 3.2L13 5" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const IconAlert = ({ color = "var(--danger)" }: { color?: string }) => (
  <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M8 1.5L1 14h14L8 1.5z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" /><path d="M8 6.5v3M8 11.5v.01" stroke={color} strokeWidth="1.4" strokeLinecap="round" /></svg>
);
const IconStack = ({ color = "var(--warning)" }: { color?: string }) => (
  <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M8 1.5l6.5 3.5L8 8.5 1.5 5 8 1.5z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" /><path d="M1.5 9l6.5 3.5L14.5 9M1.5 11.5L8 15l6.5-3.5" stroke={color} strokeWidth="1.3" strokeLinejoin="round" /></svg>
);

export default function EscrowPage() {
  const { address, isConnected } = useAccount();
  const [escrows, setEscrows] = useState<EscrowLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [sellerContact, setSellerContact] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("7");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "HOLDING" | "RELEASED" | "DISPUTED">("ALL");
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [buyerOrders, setBuyerOrders] = useState<{ id: string; title: string; amount: string; paidAt: string }[]>([]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("conduit-escrow-orders");
      if (saved) setBuyerOrders(JSON.parse(saved));
    } catch { }
  }, []);

  const fetchEscrows = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/escrow?address=${address}`);
      if (!res.ok) return;
      const data = await res.json();
      setEscrows(data.escrows ?? []);
    } catch { }
    finally { setIsLoading(false); }
  }, [address]);

  useEffect(() => { if (isConnected && address) fetchEscrows(); }, [isConnected, address, fetchEscrows]);

  // Auto-poll while any escrow is mid-release (CONFIRMED without a releaseTxHash yet).
  // Stops automatically once everything settles, so it's not constantly hitting the API.
  useEffect(() => {
    const stillReleasing = escrows.some(e => e.status === "CONFIRMED" && !e.releaseTxHash);

    if (stillReleasing && !pollRef.current) {
      pollRef.current = setInterval(() => { fetchEscrows(); }, 5000);
    } else if (!stillReleasing && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [escrows, fetchEscrows]);

  const createEscrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) { setCreateError("Enter a valid amount."); return; }
    if (!title.trim()) { setCreateError("Title is required."); return; }
    if (!sellerContact.trim()) { setCreateError("Contact is required so buyer can reach you."); return; }
    const parsedDays = parseInt(deliveryDays);
    if (isNaN(parsedDays) || parsedDays < 1) { setCreateError("Enter a valid delivery window."); return; }
    setIsCreating(true); setCreateError("");
    try {
      const res = await fetch("/api/escrow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), amount: parsed.toString(),
          description: description.trim() || undefined,
          sellerAddress: address, sellerContact: sellerContact.trim(),
          deliveryDays: parsedDays,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      const { escrow } = await res.json();
      const url = `${window.location.origin}/escrow/${escrow.id}`;
      setCreatedLink(url);
      setTitle(""); setAmount(""); setDescription(""); setSellerContact(""); setDeliveryDays("7");
      fetchEscrows();
    } catch (err: any) {
      setCreateError(err.message ?? "Something went wrong.");
    } finally { setIsCreating(false); }
  };

  const cancelEscrow = async (id: string) => {
    if (!confirm("Cancel this escrow link?")) return;
    setCancellingId(id);
    try {
      await fetch(`/api/escrow/${id}`, { method: "DELETE" });
      fetchEscrows();
    } catch { }
    finally { setCancellingId(null); }
  };

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/escrow/${id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filtered = filter === "ALL"
    ? escrows
    : filter === "RELEASED"
      ? escrows.filter(e => isEffectivelyReleased(e))
      : escrows.filter(e => e.status === filter);

  const counts = {
    ALL: escrows.length,
    ACTIVE: escrows.filter(e => e.status === "ACTIVE").length,
    HOLDING: escrows.filter(e => e.status === "HOLDING").length,
    RELEASED: escrows.filter(e => isEffectivelyReleased(e)).length,
    DISPUTED: escrows.filter(e => ["DISPUTED", "MEDIATION"].includes(e.status)).length,
  };

  const totalHeld = escrows.filter(e => e.status === "HOLDING").reduce((s, e) => s + parseFloat(e.amount), 0);
  const totalReleased = escrows.filter(e => isEffectivelyReleased(e)).reduce((s, e) => s + parseFloat(e.amount), 0);
  const fmt = (n: number) => n % 1 === 0 ? n.toString() : n.toFixed(2);

  const STAT_CARDS = [
    {
      label: "Currently Held",
      value: fmt(totalHeld), unit: "USDC",
      sub: `${counts.HOLDING} active escrow${counts.HOLDING === 1 ? "" : "s"}`,
      color: "var(--info)", dim: "var(--info-dim)", border: "var(--info-border)",
      icon: <IconLock color="var(--info)" />,
    },
    {
      label: "Total Released",
      value: fmt(totalReleased), unit: "USDC",
      sub: `${counts.RELEASED} completed`,
      color: "var(--c)", dim: "var(--c-dim)", border: "var(--c-border)",
      icon: <IconCheck color="var(--c)" />,
    },
    {
      label: "Disputed",
      value: counts.DISPUTED.toString(), unit: "",
      sub: counts.DISPUTED > 0 ? "needs attention" : "all clear",
      color: counts.DISPUTED > 0 ? "var(--danger)" : "var(--ink-3)",
      dim: counts.DISPUTED > 0 ? "var(--danger-dim)" : "var(--raised)",
      border: counts.DISPUTED > 0 ? "rgba(255,77,106,.3)" : "var(--stroke)",
      icon: <IconAlert color={counts.DISPUTED > 0 ? "var(--danger)" : "var(--ink-3)"} />,
    },
    {
      label: "Total Escrows",
      value: escrows.length.toString(), unit: "",
      sub: `${counts.ACTIVE} awaiting payment`,
      color: "var(--warning)", dim: "var(--warning-dim)", border: "rgba(255,176,46,.3)",
      icon: <IconStack color="var(--warning)" />,
    },
  ];

  return (
    <div className="app">
      <NavBar />
      <div className="page-wrap">

        <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 className="page-title">Escrow</h1>
            <p className="page-subtitle">Hold funds until buyer confirms receipt</p>
          </div>
          {mounted && isConnected && (
            <button onClick={() => { setShowForm(!showForm); setCreatedLink(null); }} className="form-submit-btn" style={{ width: "auto", padding: "10px 20px" }}>
              {showForm ? "✕ Close" : "+ New Escrow"}
            </button>
          )}
        </div>

        {mounted && !isConnected && (
          <div className="empty" style={{ paddingTop: 80 }}>
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--ink-3)" strokeWidth="1.5" /><path d="M7 11V7a5 5 0 0110 0v4" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </div>
            <p className="empty-title">Connect your wallet</p>
            <p className="empty-sub">Connect to create and manage escrow links</p>
          </div>
        )}

        {mounted && isConnected && (
          <div className="bento-grid">

            {/* Stats */}
            {escrows.length > 0 && STAT_CARDS.map(s => (
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
                  <div className="form-card">
                    <div className="form-card-header">
                      <div className="form-card-header-icon">
                        <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><rect x="2" y="6" width="12" height="9" rx="1.5" stroke="var(--c)" strokeWidth="1.3" /><path d="M5 6V4.5a3 3 0 016 0V6" stroke="var(--c)" strokeWidth="1.3" strokeLinecap="round" /></svg>
                      </div>
                      <div><div className="form-card-title">New Escrow Link</div><div className="form-card-subtitle">Buyer pays, funds held until confirmed</div></div>
                    </div>
                    <div className="form-card-body">
                      {createdLink ? (
                        <div className="fade-up">
                          <div className="success-box">
                            <div className="success-box-header">
                              <div className="success-check-icon">
                                <svg viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M2 6l2.5 2.5L10 3.5" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                              </div>
                              <span className="success-label">Escrow link created!</span>
                            </div>
                            <div className="success-link-row">
                              <div className="success-link-input">{createdLink}</div>
                              <button onClick={() => { navigator.clipboard.writeText(createdLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className={`success-copy-btn${copied ? " copied" : ""}`}>
                                {copied ? "✓ Copied" : "Copy"}
                              </button>
                            </div>
                          </div>
                          <p style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 12, lineHeight: 1.6 }}>
                            Share this link with your buyer. They pay → funds are held → you deliver → they confirm after delivery window → you receive payment.
                          </p>
                          <button className="form-another-btn" onClick={() => setCreatedLink(null)}>+ Create another</button>
                        </div>
                      ) : (
                        <form onSubmit={createEscrow}>
                          <div className="form-group">
                            <label className="form-label">Title</label>
                            <input type="text" className="input" placeholder="e.g. iPhone 15 Pro — Lagos delivery" value={title} onChange={e => setTitle(e.target.value)} maxLength={80} required />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Amount</label>
                            <div className="input-wrap input-wrap-hero">
                              <input type="number" className="input input-hero mono" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} min="0.000001" step="any" required />
                              <span className="input-suffix">USDC</span>
                            </div>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Description <span className="form-label-optional">(optional)</span></label>
                            <input type="text" className="input" placeholder="e.g. Item details, delivery terms..." value={description} onChange={e => setDescription(e.target.value)} maxLength={200} />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Your Contact</label>
                            <input type="text" className="input" placeholder="e.g. @ace_must_win on Telegram, +234..." value={sellerContact} onChange={e => setSellerContact(e.target.value)} maxLength={100} required />
                            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6 }}>Required — buyer needs this to arrange delivery</div>
                          </div>

                          {/* Delivery window */}
                          <div className="form-group">
                            <label className="form-label">Expected Delivery Window</label>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                              {DELIVERY_PRESETS.map(p => (
                                <button
                                  key={p.days} type="button"
                                  onClick={() => setDeliveryDays(p.days.toString())}
                                  style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${parseInt(deliveryDays) === p.days ? "var(--c)" : "var(--stroke)"}`, background: parseInt(deliveryDays) === p.days ? "var(--c-dim)" : "transparent", color: parseInt(deliveryDays) === p.days ? "var(--c)" : "var(--ink-3)", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "Sora, sans-serif", transition: "all .15s" }}
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>
                            <div className="input-wrap">
                              <input type="number" className="input mono" placeholder="7" value={deliveryDays} onChange={e => setDeliveryDays(e.target.value)} min="1" max="365" required style={{ paddingRight: 52 }} />
                              <span className="input-suffix">days</span>
                            </div>
                            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6 }}>
                              Buyer can only confirm or dispute after this window passes. Auto-releases 7 days after delivery deadline.
                            </div>
                          </div>

                          <div className="stealth-info-box" style={{ marginBottom: 16 }}>
                            <svg viewBox="0 0 16 16" fill="none" width="14" height="14" style={{ flexShrink: 0, marginTop: 1 }}>
                              <rect x="2" y="6" width="12" height="9" rx="1.5" stroke="var(--c)" strokeWidth="1.3" />
                              <path d="M5 6V4.5a3 3 0 016 0V6" stroke="var(--c)" strokeWidth="1.3" strokeLinecap="round" />
                            </svg>
                            <p style={{ fontSize: 11, color: "var(--c)", lineHeight: 1.5 }}>
                              Funds are held securely. Buyer cannot confirm or dispute until the delivery window passes. Auto-releases 7 days after delivery deadline.
                            </p>
                          </div>
                          {createError && <div className="form-error">{createError}</div>}
                          <button type="submit" className="form-submit-btn" disabled={isCreating}>
                            {isCreating ? <span className="form-submit-spinner"><span className="spinner" />Creating escrow...</span> : "Create Escrow Link"}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bento-cell bento-5">
                  <div className="form-card">
                    <div className="form-card-header">
                      <div className="form-card-header-icon">
                        <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><circle cx="8" cy="8" r="6.5" stroke="var(--c)" strokeWidth="1.3" /><path d="M8 5v3.2l2 1.3" stroke="var(--c)" strokeWidth="1.3" strokeLinecap="round" /></svg>
                      </div>
                      <div><div className="form-card-title">How Escrow Works</div><div className="form-card-subtitle">Trust, built into every step</div></div>
                    </div>
                    <div className="form-card-body">
                      <div className="escrow-steps">
                        {ESCROW_STEPS.map((step, i) => (
                          <div key={i} className="escrow-step">
                            <span className="escrow-step-num">{i + 1}</span>
                            <span className="escrow-step-text">{step}</span>
                          </div>
                        ))}
                      </div>
                      <div className="escrow-fee-note">
                        <svg viewBox="0 0 14 14" fill="none" width="12" height="12" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="7" cy="7" r="5.5" stroke="var(--ink-3)" strokeWidth="1.2" /><path d="M7 4.5v2.8l1.5 1" stroke="var(--ink-3)" strokeWidth="1.2" strokeLinecap="round" /></svg>
                        <span>A 0.5% platform fee is added on top of your amount when the buyer pays — you always receive the full escrow amount you set.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Buyer Orders */}
            {buyerOrders.length > 0 && (
              <div className="bento-cell bento-12">
                <div className="card">
                  <div className="card-head">
                    <div className="card-head-icon">
                      <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M2 2h12a1 1 0 011 1v2H1V3a1 1 0 011-1zM1 6h14v8a1 1 0 01-1 1H2a1 1 0 01-1-1V6z" stroke="var(--c)" strokeWidth="1.2" /><path d="M5 10h6M5 12h4" stroke="var(--c)" strokeWidth="1.2" strokeLinecap="round" /></svg>
                    </div>
                    <div>
                      <div className="card-title">My Orders</div>
                      <div className="card-subtitle">Escrow links you paid — saved on this device</div>
                    </div>
                  </div>
                  <div className="feed-list">
                    {buyerOrders.map(order => (
                      <div key={order.id} className="feed-row">
                        <span className="feed-dot" style={{ background: "var(--info)" }} />
                        <div className="feed-info">
                          <div className="feed-title">{order.title}</div>
                          <div className="feed-time">Paid {new Date(order.paidAt).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</div>
                        </div>
                        <span className="feed-amount" style={{ color: "var(--info)" }}>
                          {parseFloat(order.amount) % 1 === 0 ? order.amount : parseFloat(order.amount).toFixed(2)} <span style={{ fontSize: 10, color: "var(--ink-3)" }}>USDC</span>
                        </span>
                        <a href={`/escrow/${order.id}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 14px", background: "var(--info-dim)", border: "1px solid var(--info-border)", borderRadius: "var(--r-sm)", fontSize: 11, fontWeight: 700, color: "var(--info)", textDecoration: "none", flexShrink: 0 }}>
                          View Order
                          <svg viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Table */}
            <div id="escrow-table" className="bento-cell bento-12">
              <div className="table-card">
                <div className="table-header">
                  <div className="table-header-left">
                    <span className="table-header-title">Escrow Links</span>
                    <span className="table-count-badge">{counts[filter]}</span>
                  </div>
                  <div className="table-header-right">
                    {(["ALL", "ACTIVE", "HOLDING", "RELEASED", "DISPUTED"] as const).map(f => (
                      <button key={f} className={`filter-pill${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>
                        {f}{f === "DISPUTED" && counts.DISPUTED > 0 && <span style={{ marginLeft: 4, background: "var(--danger)", color: "#fff", borderRadius: "50%", width: 14, height: 14, fontSize: 8, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{counts.DISPUTED}</span>}
                      </button>
                    ))}
                    <button className="table-refresh-btn" onClick={fetchEscrows} title="Refresh">↻</button>
                  </div>
                </div>

                {filtered.length > 0 && (
                  <div className="table-col-headers" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr" }}>
                    {["TITLE", "STATUS", "AMOUNT", "BUYER", "CREATED", "ACTIONS"].map(c => (
                      <span key={c} className="table-col-header">{c}</span>
                    ))}
                  </div>
                )}

                <div style={{ overflowY: "auto", maxHeight: 520 }}>
                  {isLoading && <div className="loading-center" style={{ height: 160 }}><div className="page-spinner" /></div>}
                  {!isLoading && filtered.length === 0 && (
                    <div className="table-empty">
                      <div className="table-empty-icon">
                        <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--ink-3)" strokeWidth="1.5" /><path d="M7 11V7a5 5 0 0110 0v4" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round" /></svg>
                      </div>
                      <p className="table-empty-title">{filter === "ALL" ? "No escrow links yet" : `No ${filter.toLowerCase()} escrows`}</p>
                      <p className="table-empty-sub">{filter === "ALL" ? "Create your first escrow link above" : "Try a different filter"}</p>
                    </div>
                  )}

                  {!isLoading && filtered.map(e => {
                    const released = isEffectivelyReleased(e);
                    const effStatus = released ? "RELEASED" : e.status;
                    return (
                      <div key={e.id} className="table-row" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", borderLeft: `3px solid ${statusColor(effStatus)}` }}>
                        <div className="table-cell-title">
                          <div className="table-cell-title-name">
                            <span className="table-cell-status-dot" style={{ background: statusColor(effStatus) }} />
                            <span className="table-cell-title-text">{e.title}</span>
                            {["DISPUTED", "MEDIATION"].includes(e.status) && <span style={{ fontSize: 9, background: "var(--danger-dim)", color: "var(--danger)", border: "1px solid rgba(240,62,95,.3)", borderRadius: 4, padding: "1px 5px", fontWeight: 700 }}>DISPUTE</span>}
                          </div>
                          {e.description && <p className="table-cell-description">{e.description}</p>}
                          {e.deliveryDays && e.status === "HOLDING" && <p style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 2, fontFamily: "IBM Plex Mono, monospace" }}>Delivery: {e.deliveryDays} day{e.deliveryDays > 1 ? "s" : ""}</p>}
                          {e.status === "HOLDING" && e.deliveryDeadline && <Countdown deadline={e.deliveryDeadline} label="Delivery in" />}
                          {e.disputeReason && <p style={{ fontSize: 10, color: "var(--danger)", marginTop: 3 }}>"{e.disputeReason}"</p>}
                          {e.releaseTxHash && (
                            <a href={`https://testnet.arcscan.app/tx/${e.releaseTxHash}`} target="_blank" rel="noopener noreferrer" className="table-cell-txhash">released ↗</a>
                          )}
                        </div>
                        <div>
                          <span className={`status-badge ${statusClass(effStatus)}`}>
                            <span className="status-badge-dot" />
                            {effStatus}
                          </span>
                        </div>
                        <div>
                          <span className="table-amount">{parseFloat(e.amount) % 1 === 0 ? e.amount : parseFloat(e.amount).toFixed(2)}<span className="table-amount-unit">USDC</span></span>
                        </div>
                        <span style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>
                          {e.buyerAddress ? `${e.buyerAddress.slice(0, 6)}...${e.buyerAddress.slice(-4)}` : "—"}
                        </span>
                        <span className="table-date">{formatDate(e.createdAt)}</span>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {e.status === "ACTIVE" && (
                            <>
                              <button className="table-copy-btn" onClick={() => copyLink(e.id)}>Copy Link</button>
                              <button className="table-cancel-btn" onClick={() => cancelEscrow(e.id)} disabled={cancellingId === e.id}>
                                {cancellingId === e.id ? "..." : "Cancel"}
                              </button>
                            </>
                          )}
                          {e.status === "HOLDING" && <span style={{ fontSize: 11, color: "var(--info)", fontFamily: "IBM Plex Mono, monospace" }}>Awaiting delivery</span>}
                          {e.status === "CONFIRMED" && !e.releaseTxHash && (
                            <span style={{ fontSize: 11, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", display: "inline-flex", alignItems: "center", gap: 5 }}>
                              <span className="spinner" style={{ width: 10, height: 10 }} />
                              Releasing...
                            </span>
                          )}
                          {released && <span style={{ fontSize: 11, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace" }}>Released</span>}
                          {["DISPUTED", "MEDIATION"].includes(e.status) && <a href={`/escrow/${e.id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--danger)", fontFamily: "IBM Plex Mono, monospace", textDecoration: "none", fontWeight: 700 }}>View Dispute →</a>}
                          {e.status === "CANCELLED" && <span style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>Cancelled</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
