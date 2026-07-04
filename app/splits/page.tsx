"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { NavBar } from "@/components/NavBar";
import { formatUSDC, isValidAddress } from "@/lib/utils";

interface Recipient { address: string; percentage: string; label: string; }
interface Payout { address: string; amount: string; txHash?: string; status: string; label?: string; }

interface SplitLink {
    id: string;
    title: string;
    description?: string;
    amount: string;
    recipients: { address: string; percentage: number; label?: string }[];
    splitAddress: string;
    status: string;
    txHash?: string;
    payouts?: Payout[];
    createdAt: string;
}

const BASE = typeof window !== "undefined" ? window.location.origin : "https://conduitpay.xyz";

const statusColor = (s: string) =>
    ({ COMPLETED: "var(--c)", ACTIVE: "var(--warning)", HOLDING: "var(--info)", DISTRIBUTING: "var(--info)", FAILED: "var(--danger)" }[s] ?? "var(--ink-3)");
const statusClass = (s: string) =>
    ({ COMPLETED: "status-green", ACTIVE: "status-yellow", HOLDING: "status-blue", DISTRIBUTING: "status-blue", FAILED: "status-red" }[s] ?? "status-red");
const payoutStatusColor = (s?: string) =>
    ({ COMPLETED: "var(--c)", SUCCESS: "var(--c)", PENDING: "var(--warning)", FAILED: "var(--danger)" }[s ?? ""] ?? "var(--ink-3)");

const IconSplit = ({ color = "var(--c)" }: { color?: string }) => (
    <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M4 3v3.5c0 1 .8 1.8 1.8 1.8h4.4c1 0 1.8-.8 1.8-1.8V3" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /><path d="M8 8.3V13" stroke={color} strokeWidth="1.3" strokeLinecap="round" /><circle cx="4" cy="2.2" r="1.4" stroke={color} strokeWidth="1.2" /><circle cx="12" cy="2.2" r="1.4" stroke={color} strokeWidth="1.2" /><circle cx="8" cy="13.8" r="1.4" stroke={color} strokeWidth="1.2" /></svg>
);
const IconLayers = ({ color = "var(--info)" }: { color?: string }) => (
    <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M8 1.5l6.5 3.5L8 8.5 1.5 5 8 1.5z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" /><path d="M1.5 9l6.5 3.5L14.5 9M1.5 11.5L8 15l6.5-3.5" stroke={color} strokeWidth="1.3" strokeLinejoin="round" /></svg>
);
const IconAlert = ({ color = "var(--danger)" }: { color?: string }) => (
    <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M8 1.5L1 14h14L8 1.5z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" /><path d="M8 6.5v3M8 11.5v.01" stroke={color} strokeWidth="1.4" strokeLinecap="round" /></svg>
);
const IconGauge = ({ color = "var(--warning)" }: { color?: string }) => (
    <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M2 13a6 6 0 1112 0" stroke={color} strokeWidth="1.3" strokeLinecap="round" /><path d="M8 9L10.5 5.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" /><circle cx="8" cy="9" r="1" fill={color} /></svg>
);

const SPLIT_STEPS = [
    "Set a total amount and add recipients by wallet address + percentage.",
    "Share the split link — payer pays once, in one transaction.",
    "Funds auto-distribute on-chain to every recipient instantly.",
];

export default function SplitsPage() {
    const { address, isConnected } = useAccount();
    const { authenticated, login } = usePrivy();
    const [mounted, setMounted] = useState(false);
    const [splits, setSplits] = useState<SplitLink[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [recipients, setRecipients] = useState<Recipient[]>([
        { address: "", percentage: "", label: "" },
        { address: "", percentage: "", label: "" },
    ]);
    const [formError, setFormError] = useState("");
    const [formLoading, setFormLoading] = useState(false);
    const [createdLink, setCreatedLink] = useState<string | null>(null);
    const [copiedCreated, setCopiedCreated] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    const fetchSplits = useCallback(async () => {
        if (!address) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/splits?address=${address}`);
            const data = await res.json();
            setSplits(data.splits ?? []);
        } catch { } finally { setIsLoading(false); }
    }, [address]);

    useEffect(() => {
        if (authenticated && address) fetchSplits();
    }, [authenticated, address, fetchSplits]);

    const pctSum = recipients.reduce((s, r) => s + (parseFloat(r.percentage) || 0), 0);

    const updateRecipient = (i: number, field: keyof Recipient, value: string) => {
        setRecipients(rs => rs.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
    };
    const addRecipient = () => {
        if (recipients.length >= 10) return;
        setRecipients(rs => [...rs, { address: "", percentage: "", label: "" }]);
    };
    const removeRecipient = (i: number) => {
        if (recipients.length <= 2) return;
        setRecipients(rs => rs.filter((_, idx) => idx !== i));
    };
    const splitEvenly = () => {
        const n = recipients.length;
        const base = Math.floor((100 / n) * 100) / 100; // 2dp floor, e.g. 33.33
        const remainder = +(100 - base * (n - 1)).toFixed(2); // last gets the rest, e.g. 33.34
        setRecipients(rs => rs.map((r, i) => ({
            ...r,
            percentage: (i === n - 1 ? remainder : base).toString(),
        })));
    };

    const handleCopyLink = (id: string) => {
        navigator.clipboard.writeText(`${BASE}/pay/split/${id}`);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleCreate = async () => {
        setFormError("");
        if (!address) return;
        if (!title.trim()) { setFormError("Title is required."); return; }
        const parsed = parseFloat(amount);
        if (isNaN(parsed) || parsed <= 0) { setFormError("Enter a valid amount."); return; }
        for (const r of recipients) {
            if (!isValidAddress(r.address)) { setFormError("All recipient addresses must be valid."); return; }
            const pct = parseFloat(r.percentage);
            if (isNaN(pct) || pct <= 0) { setFormError("All percentages must be greater than 0."); return; }
        }
        if (Math.abs(pctSum - 100) > 0.05) { setFormError(`Percentages must sum to 100% (currently ${pctSum.toFixed(2)}%).`); return; }

        setFormLoading(true);
        try {
            const res = await fetch("/api/splits", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim() || undefined,
                    amount: parsed.toString(),
                    creatorAddress: address,
                    recipients: recipients.map(r => ({
                        address: r.address.trim(),
                        percentage: parseFloat(r.percentage),
                        label: r.label.trim() || undefined,
                    })),
                }),
            });
            const data = await res.json();
            if (!res.ok) { setFormError(data.error || "Failed to create split."); return; }
            setCreatedLink(`${BASE}/pay/split/${data.split.id}`);
            setTitle(""); setDescription(""); setAmount("");
            setRecipients([{ address: "", percentage: "", label: "" }, { address: "", percentage: "", label: "" }]);
            fetchSplits();
        } catch { setFormError("Network error."); }
        finally { setFormLoading(false); }
    };

    // Stats
    const completed = splits.filter(s => s.status === "COMPLETED");
    const totalDistributed = completed.reduce((sum, s) => sum + parseFloat(s.amount || "0"), 0);
    const activeCount = splits.filter(s => ["ACTIVE", "HOLDING", "DISTRIBUTING"].includes(s.status)).length;
    const failedCount = splits.filter(s => s.status === "FAILED").length;
    const avgSplitSize = completed.length > 0 ? totalDistributed / completed.length : 0;
    const fmt = (n: number) => n % 1 === 0 ? n.toString() : n.toFixed(2);

    const STAT_CARDS = [
        {
            label: "Total Split Volume", value: fmt(totalDistributed), unit: "USDC",
            sub: `${completed.length} completed`,
            color: "var(--c)", dim: "var(--c-dim)", border: "var(--c-border)",
            icon: <IconSplit color="var(--c)" />,
        },
        {
            label: "Active Splits", value: activeCount.toString(), unit: "",
            sub: "in progress",
            color: "var(--info)", dim: "var(--info-dim)", border: "var(--info-border)",
            icon: <IconLayers color="var(--info)" />,
        },
        {
            label: "Failed Splits", value: failedCount.toString(), unit: "",
            sub: failedCount > 0 ? "needs attention" : "all clear",
            color: failedCount > 0 ? "var(--danger)" : "var(--ink-3)",
            dim: failedCount > 0 ? "var(--danger-dim)" : "var(--raised)",
            border: failedCount > 0 ? "rgba(255,77,106,.3)" : "var(--stroke)",
            icon: <IconAlert color={failedCount > 0 ? "var(--danger)" : "var(--ink-3)"} />,
        },
        {
            label: "Avg Split Size", value: fmt(avgSplitSize), unit: "USDC",
            sub: "per completed split",
            color: "var(--warning)", dim: "var(--warning-dim)", border: "rgba(255,176,46,.3)",
            icon: <IconGauge color="var(--warning)" />,
        },
    ];

    return (
        <div className="app">
            <NavBar />
            <div className="page-wrap">

                <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <h1 className="page-title">Split Payments</h1>
                        <p className="page-subtitle">One payment auto-splits to multiple wallets by percentage</p>
                    </div>
                    {mounted && isConnected && (
                        <button
                            onClick={() => { setShowForm(!showForm); setCreatedLink(null); }}
                            className="form-submit-btn"
                            style={{ width: "auto", padding: "10px 20px" }}
                        >
                            {showForm ? "✕ Close" : "+ New Split"}
                        </button>
                    )}
                </div>

                {mounted && !authenticated && (
                    <div className="empty" style={{ paddingTop: 80 }}>
                        <div className="empty-icon">
                            <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><rect x="3" y="11" width="18" height="11" rx="2" stroke="var(--ink-3)" strokeWidth="1.5" /><path d="M7 11V7a5 5 0 0110 0v4" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round" /></svg>
                        </div>
                        <p className="empty-title">Connect your wallet</p>
                        <p className="empty-sub">Sign in to create split payment links</p>
                        <button className="form-submit-btn" style={{ width: "auto", padding: "12px 28px", margin: "18px auto 0" }} onClick={login}>Connect Wallet</button>
                    </div>
                )}

                {mounted && isConnected && (
                    <div className="bento-grid">

                        {/* Stats */}
                        {splits.length > 0 && STAT_CARDS.map(s => (
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
                                                <IconSplit color="var(--c)" />
                                            </div>
                                            <div>
                                                <div className="form-card-title">New Split Payment</div>
                                                <div className="form-card-subtitle">Funds auto-distribute to all recipients on payment</div>
                                            </div>
                                        </div>
                                        <div className="form-card-body">
                                            {createdLink ? (
                                                <div className="fade-up">
                                                    <div className="success-box">
                                                        <div className="success-box-header">
                                                            <div className="success-check-icon">
                                                                <svg viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M2 6l2.5 2.5L10 3.5" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                            </div>
                                                            <span className="success-label">Split link created!</span>
                                                        </div>
                                                        <div className="success-link-row">
                                                            <div className="success-link-input">{createdLink}</div>
                                                            <button onClick={() => { navigator.clipboard.writeText(createdLink); setCopiedCreated(true); setTimeout(() => setCopiedCreated(false), 2000); }} className={`success-copy-btn${copiedCreated ? " copied" : ""}`}>
                                                                {copiedCreated ? "✓ Copied" : "Copy"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <p style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 12, lineHeight: 1.6 }}>
                                                        Share this link with the payer. Once paid, funds are automatically distributed on-chain to every recipient by their set percentage.
                                                    </p>
                                                    <button className="form-another-btn" onClick={() => setCreatedLink(null)}>+ Create another</button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                                            <label className="form-label">Title</label>
                                                            <input className="input" placeholder="e.g. Team revenue split" value={title} onChange={e => setTitle(e.target.value)} maxLength={80} />
                                                        </div>
                                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                                            <label className="form-label">Total Amount</label>
                                                            <div className="input-wrap input-wrap-hero">
                                                                <input className="input input-hero mono" type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
                                                                <span className="input-suffix">USDC</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="form-group" style={{ marginTop: 16 }}>
                                                        <label className="form-label">Description <span className="form-label-optional">(optional)</span></label>
                                                        <input className="input" placeholder="e.g. Monthly split for the team" value={description} onChange={e => setDescription(e.target.value)} maxLength={200} />
                                                    </div>

                                                    {/* Recipients */}
                                                    <div style={{ marginTop: 20 }}>
                                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                                                            <label className="form-label" style={{ marginBottom: 0 }}>Recipients ({recipients.length})</label>
                                                            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                                                                <button onClick={splitEvenly} style={{ fontSize: 11, color: "var(--c)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Split evenly</button>
                                                                <span style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color: Math.abs(pctSum - 100) < 0.05 ? "var(--c)" : "var(--warning)" }}>
                                                                    {pctSum.toFixed(1)}% / 100%
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {recipients.map((r, i) => (
                                                            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 120px 90px 36px", gap: 10, marginBottom: 10, alignItems: "center" }}>
                                                                <input className="input" placeholder="0x... wallet address" value={r.address} onChange={e => updateRecipient(i, "address", e.target.value)} style={{ fontSize: 13 }} />
                                                                <input className="input" placeholder="Label" value={r.label} onChange={e => updateRecipient(i, "label", e.target.value)} style={{ fontSize: 13 }} />
                                                                <div className="input-wrap">
                                                                    <input className="input mono" type="number" min="0" max="100" step="0.1" placeholder="0" value={r.percentage} onChange={e => updateRecipient(i, "percentage", e.target.value)} style={{ fontSize: 13, paddingRight: 26 }} />
                                                                    <span className="input-suffix" style={{ fontSize: 11 }}>%</span>
                                                                </div>
                                                                <button
                                                                    onClick={() => removeRecipient(i)}
                                                                    disabled={recipients.length <= 2}
                                                                    style={{ background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: 8, height: 38, cursor: recipients.length <= 2 ? "not-allowed" : "pointer", color: recipients.length <= 2 ? "var(--stroke2)" : "var(--danger)", fontSize: 18, opacity: recipients.length <= 2 ? .4 : 1 }}
                                                                    title="Remove recipient"
                                                                >×</button>
                                                            </div>
                                                        ))}

                                                        {recipients.length < 10 && (
                                                            <button onClick={addRecipient} className="btn-ghost" style={{ marginTop: 4 }}>
                                                                + Add recipient
                                                            </button>
                                                        )}
                                                    </div>

                                                    {formError && <div className="form-error" style={{ marginTop: 16 }}>{formError}</div>}

                                                    <button className="form-submit-btn" style={{ marginTop: 20 }} onClick={handleCreate} disabled={formLoading}>
                                                        {formLoading ? (
                                                            <span className="form-submit-spinner"><span className="spinner" />Creating...</span>
                                                        ) : "Create Split Link"}
                                                    </button>
                                                </>
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
                                            <div><div className="form-card-title">How Splits Work</div><div className="form-card-subtitle">One payment, many wallets</div></div>
                                        </div>
                                        <div className="form-card-body">
                                            <div className="escrow-steps">
                                                {SPLIT_STEPS.map((step, i) => (
                                                    <div key={i} className="escrow-step">
                                                        <span className="escrow-step-num">{i + 1}</span>
                                                        <span className="escrow-step-text">{step}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="escrow-fee-note">
                                                <svg viewBox="0 0 14 14" fill="none" width="12" height="12" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="7" cy="7" r="5.5" stroke="var(--ink-3)" strokeWidth="1.2" /><path d="M7 4.5v2.8l1.5 1" stroke="var(--ink-3)" strokeWidth="1.2" strokeLinecap="round" /></svg>
                                                <span>A 0.5% platform fee is deducted from the total before recipients are paid out — recipient percentages apply to the post-fee amount.</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Table */}
                        <div id="splits-table" className="bento-cell bento-12">
                            <div className="table-card">
                                <div className="table-header">
                                    <div className="table-header-left">
                                        <span className="table-header-title">Your Splits</span>
                                        <span className="table-count-badge">{splits.length}</span>
                                    </div>
                                    <div className="table-header-right">
                                        <button className="table-refresh-btn" onClick={fetchSplits} title="Refresh">↻</button>
                                    </div>
                                </div>

                                {splits.length > 0 && (
                                    <div className="table-col-headers">
                                        {["TITLE", "STATUS", "AMOUNT", "RECIPIENTS", "ACTIONS"].map(c => (
                                            <span key={c} className="table-col-header">{c}</span>
                                        ))}
                                    </div>
                                )}

                                <div style={{ overflowY: "auto", maxHeight: 560 }}>
                                    {isLoading && <div className="loading-center" style={{ height: 140 }}><div className="page-spinner" /></div>}

                                    {!isLoading && splits.length === 0 && (
                                        <div className="table-empty">
                                            <div className="table-empty-icon">
                                                <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                                                    <circle cx="6" cy="6" r="3" stroke="var(--ink-3)" strokeWidth="1.5" />
                                                    <circle cx="18" cy="6" r="3" stroke="var(--ink-3)" strokeWidth="1.5" />
                                                    <circle cx="12" cy="18" r="3" stroke="var(--ink-3)" strokeWidth="1.5" />
                                                    <path d="M6 9v3h12V9M12 12v3" stroke="var(--ink-3)" strokeWidth="1.5" />
                                                </svg>
                                            </div>
                                            <p className="table-empty-title">No splits yet</p>
                                            <p className="table-empty-sub">Click "+ New Split" above to create your first one.</p>
                                        </div>
                                    )}

                                    {!isLoading && splits.map(s => {
                                        const isExpanded = expandedId === s.id;
                                        return (
                                            <div key={s.id}>
                                                <div className="table-row" style={{ borderLeft: `3px solid ${statusColor(s.status)}` }}>
                                                    <div className="table-cell-title">
                                                        <div className="table-cell-title-name">
                                                            <span className="table-cell-status-dot" style={{ background: statusColor(s.status) }} />
                                                            <span className="table-cell-title-text">{s.title}</span>
                                                        </div>
                                                        {s.description && <p className="table-cell-description">{s.description}</p>}
                                                        <button
                                                            onClick={() => setExpandedId(isExpanded ? null : s.id)}
                                                            style={{ fontSize: 11, color: "var(--c)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0, marginTop: 3, marginLeft: 15 }}
                                                        >
                                                            {isExpanded ? "Hide breakdown" : `Show ${s.recipients.length} recipient${s.recipients.length === 1 ? "" : "s"}`}
                                                        </button>
                                                    </div>

                                                    <div>
                                                        <span className={`status-badge ${statusClass(s.status)}`}>
                                                            <span className="status-badge-dot" />
                                                            {s.status}
                                                        </span>
                                                    </div>

                                                    <div>
                                                        <span className="table-amount">{formatUSDC(s.amount)}<span className="table-amount-unit">USDC</span></span>
                                                    </div>

                                                    <span className="table-date">{s.recipients.length} wallets</span>

                                                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                                        <button className={`table-copy-btn${copiedId === s.id ? " copied" : ""}`} onClick={() => handleCopyLink(s.id)}>
                                                            {copiedId === s.id ? "Copied!" : "Copy Link"}
                                                        </button>
                                                        {s.txHash && (
                                                            <a href={`https://testnet.arcscan.app/tx/${s.txHash}`} target="_blank" rel="noopener noreferrer" className="table-copy-btn" style={{ textDecoration: "none" }}>
                                                                TX ↗
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>

                                                {isExpanded && (
                                                    <div style={{ background: "var(--bg-2)", borderBottom: "1px solid var(--stroke)" }}>
                                                        <div className="feed-list">
                                                            {s.recipients.map((r, i) => {
                                                                const payout = s.payouts?.find(p => p.address.toLowerCase() === r.address.toLowerCase());
                                                                const recipientAmount = (parseFloat(s.amount || "0") * r.percentage) / 100;
                                                                return (
                                                                    <div key={i} className="feed-row">
                                                                        <span className="feed-dot" style={{ background: payoutStatusColor(payout?.status) }} />
                                                                        <div className="feed-info">
                                                                            <div className="feed-title">{r.label || `${r.address.slice(0, 6)}...${r.address.slice(-4)}`}</div>
                                                                            <div className="feed-time">
                                                                                {r.label ? `${r.address.slice(0, 6)}...${r.address.slice(-4)} · ` : ""}{r.percentage}%
                                                                                {payout?.txHash && (
                                                                                    <> · <a href={`https://testnet.arcscan.app/tx/${payout.txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--c)" }}>tx ↗</a></>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <span className="feed-amount" style={{ color: payoutStatusColor(payout?.status) }}>
                                                                            {formatUSDC(recipientAmount)} <span style={{ fontSize: 10, color: "var(--ink-3)" }}>USDC</span>
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
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
