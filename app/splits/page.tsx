"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { NavBar } from "@/components/NavBar";
import { formatUSDC, shortenAddress, isValidAddress } from "@/lib/utils";

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
({ COMPLETED: "#00E5A0", ACTIVE: "#f5a623", HOLDING: "#5b8ff9", DISTRIBUTING: "#5b8ff9", FAILED: "#f03e5f" }[s] ?? "#666");
const statusClass = (s: string) =>
({ COMPLETED: "status-green", ACTIVE: "status-yellow", HOLDING: "status-blue", DISTRIBUTING: "status-blue", FAILED: "status-red" }[s] ?? "status-red");

export default function SplitsPage() {
    const { address, isConnected } = useAccount();
    const { authenticated, login } = usePrivy();
    const [mounted, setMounted] = useState(false);
    const [splits, setSplits] = useState<SplitLink[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

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
        const even = (100 / recipients.length).toFixed(2);
        setRecipients(rs => rs.map(r => ({ ...r, percentage: even })));
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
        if (Math.abs(pctSum - 100) > 0.01) { setFormError(`Percentages must sum to 100% (currently ${pctSum.toFixed(2)}%).`); return; }

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

    const stats = [
        { value: formatUSDC(totalDistributed.toString()), unit: "USDC", label: "Total Distributed", sub: `${completed.length} completed`, color: "#00E5A0" },
        { value: String(splits.length), unit: "", label: "Total Splits", sub: `${activeCount} active`, color: "#5b8ff9" },
        { value: String(splits.reduce((n, s) => n + s.recipients.length, 0)), unit: "", label: "Total Recipients", sub: "across all splits", color: "#a78bfa" },
    ];

    return (
        <div className="app">
            <NavBar />
            <div className="page-wrap">

                {/* Header */}
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

                {/* Not connected */}
                {mounted && !authenticated && (
                    <div className="card" style={{ padding: "60px 24px", textAlign: "center" }}>
                        <p style={{ fontSize: 16, fontWeight: 800, color: "var(--ink-1)", marginBottom: 6 }}>Connect your wallet</p>
                        <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 18 }}>Sign in to create split payment links.</p>
                        <button className="form-submit-btn" style={{ width: "auto", padding: "12px 28px", margin: "0 auto" }} onClick={login}>Connect Wallet</button>
                    </div>
                )}

                {mounted && isConnected && (
                    <>
                        {/* Stats */}
                        {splits.length > 0 && (
                            <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 20 }}>
                                {stats.map((s, i) => (
                                    <div key={i} className="stat-card">
                                        <div className="stat-card-line" style={{ background: s.color }} />
                                        <div className="stat-value">{s.value}{s.unit && <span style={{ fontSize: 13, color: s.color, marginLeft: 4, fontFamily: "IBM Plex Mono, monospace" }}>{s.unit}</span>}</div>
                                        <div className="stat-label">{s.label}</div>
                                        <div className="stat-sub">{s.sub}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Created banner */}
                        {createdLink && (
                            <div className="card" style={{ marginBottom: 20, padding: 0 }}>
                                <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                                    <div>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--c)", marginBottom: 3 }}>✓ Split link created</p>
                                        <p style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>{createdLink}</p>
                                    </div>
                                    <button
                                        className="form-submit-btn"
                                        style={{ width: "auto", padding: "9px 18px" }}
                                        onClick={() => { navigator.clipboard.writeText(createdLink); setCopiedCreated(true); setTimeout(() => setCopiedCreated(false), 2000); }}
                                    >
                                        {copiedCreated ? "Copied!" : "Copy Pay Link"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Create form */}
                        {showForm && (
                            <div className="card" style={{ marginBottom: 20 }}>
                                <div className="card-head">
                                    <div className="card-head-icon">
                                        <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
                                            <circle cx="4" cy="4" r="2" stroke="var(--c)" strokeWidth="1.3" />
                                            <circle cx="12" cy="4" r="2" stroke="var(--c)" strokeWidth="1.3" />
                                            <circle cx="8" cy="12" r="2" stroke="var(--c)" strokeWidth="1.3" />
                                            <path d="M4 6v2h8V6M8 8v2" stroke="var(--c)" strokeWidth="1.3" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="card-title">New Split Payment</div>
                                        <div className="card-subtitle">Funds auto-distribute to all recipients on payment</div>
                                    </div>
                                </div>

                                <div className="card-body">
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Title</label>
                                            <input className="input" placeholder="e.g. Team revenue split" value={title} onChange={e => setTitle(e.target.value)} maxLength={80} />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Total Amount</label>
                                            <div className="input-wrap">
                                                <input className="input mono" type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} style={{ paddingRight: 52 }} />
                                                <span className="input-suffix">USDC</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ marginTop: 16 }}>
                                        <label className="form-label">Description <span className="form-label-opt">(optional)</span></label>
                                        <input className="input" placeholder="e.g. Monthly split for the team" value={description} onChange={e => setDescription(e.target.value)} maxLength={200} />
                                    </div>

                                    {/* Recipients */}
                                    <div style={{ marginTop: 20 }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                                            <label className="form-label" style={{ marginBottom: 0 }}>Recipients ({recipients.length})</label>
                                            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                                                <button onClick={splitEvenly} style={{ fontSize: 11, color: "var(--c)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Split evenly</button>
                                                <span style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color: Math.abs(pctSum - 100) < 0.01 ? "var(--c)" : "var(--warning)" }}>
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
                                            <span className="form-submit-spinner"><div className="page-spinner" style={{ width: 14, height: 14 }} /> Creating…</span>
                                        ) : "Create Split Link"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Table */}
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

                            <div style={{ overflowY: "auto", maxHeight: 480 }}>
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

                                {!isLoading && splits.map(s => (
                                    <div key={s.id} className="table-row">
                                        <div className="table-cell-title">
                                            <div className="table-cell-title-name">
                                                <span className="table-cell-status-dot" style={{ background: statusColor(s.status) }} />
                                                <span className="table-cell-title-text">{s.title}</span>
                                            </div>
                                            {s.description && <p className="table-cell-description">{s.description}</p>}
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
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}