"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { NavBar } from "@/components/NavBar";
import { formatUSDC, shortenAddress, isValidAddress } from "@/lib/utils";

interface AgentTx {
    id: string; recipient: string; amount: string; txHash?: string;
    status: string; reason?: string; createdAt: string;
}
interface Agent {
    id: string; name: string; walletAddress: string; apiKeyPreview: string;
    dailyLimit: string; allowedRecipients: string[]; spentToday: string;
    active: boolean; totalSpent: string; txCount: number; lastUsedAt?: string;
    createdAt: string; transactions: AgentTx[];
}

const txColor = (s: string) =>
({ SENT: "var(--c)", PENDING: "var(--warning)", FAILED: "var(--danger)", BLOCKED: "var(--danger)" }[s] ?? "var(--ink-3)");

// Agents have no rich status field in the schema, only `active` (bool) — every label
// below is derived client-side from fields already fetched, not a stored status value.
// A pending tx means it's mid-spend right now; hitting the daily cap is an expected
// guardrail needing owner action (raise the limit), not a failure, so it's amber, not
// red — red is reserved for a genuine failed/blocked-for-other-reasons last attempt.
const RECENT_MS = 48 * 3600 * 1000;
function deriveStatus(a: Agent): { label: string; color: string; cls: string } {
    if (a.transactions.some(t => t.status === "PENDING")) return { label: "RUNNING", color: "var(--info)", cls: "status-blue" };
    const limit = parseFloat(a.dailyLimit || "0");
    const limitReached = limit > 0 && parseFloat(a.spentToday || "0") >= limit;
    if (limitReached) return { label: "LIMIT REACHED", color: "var(--warning)", cls: "status-yellow" };
    const lastTx = a.transactions[0];
    if (lastTx && ["FAILED", "BLOCKED"].includes(lastTx.status)) return { label: "ATTENTION", color: "var(--danger)", cls: "status-red" };
    const recentlyUsed = a.lastUsedAt && (Date.now() - new Date(a.lastUsedAt).getTime() < RECENT_MS);
    if (a.active && recentlyUsed) return { label: "ACTIVE", color: "var(--c)", cls: "status-green" };
    return { label: a.active ? "IDLE" : "DISABLED", color: "var(--warning)", cls: "status-yellow" };
}

const fmtLastActive = (d?: string) => {
    if (!d) return "Never";
    const diff = Date.now() - new Date(d).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return "Just now";
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    return `${days}d ago`;
};

const IconAgent = ({ color = "var(--c)" }: { color?: string }) => (
    <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><rect x="2" y="5" width="12" height="9" rx="1.5" stroke={color} strokeWidth="1.3" /><path d="M5.5 5V3.5M10.5 5V3.5M5.5 9h1M9.5 9h1" stroke={color} strokeWidth="1.3" strokeLinecap="round" /></svg>
);
const IconSpend = ({ color = "var(--info)" }: { color?: string }) => (
    <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><circle cx="8" cy="8" r="6.5" stroke={color} strokeWidth="1.3" /><path d="M8 5v3.2l2 1.3" stroke={color} strokeWidth="1.3" strokeLinecap="round" /></svg>
);
const IconBolt = ({ color = "var(--warning)" }: { color?: string }) => (
    <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M9 2L4 9h4l-1 5 5-7H8l1-5z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" /></svg>
);
const IconGauge = ({ color = "var(--c)" }: { color?: string }) => (
    <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M2 13a6 6 0 1112 0" stroke={color} strokeWidth="1.3" strokeLinecap="round" /><path d="M8 9L10.5 5.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" /><circle cx="8" cy="9" r="1" fill={color} /></svg>
);

const AGENT_STEPS = [
    "Register an agent — set a name, a daily USDC spending limit, and (optionally) which addresses it may pay.",
    "Your agent authenticates its x402 calls with the API key, shown once at creation.",
    "It autonomously pays for resources over x402 — each call spends from its own wallet, within your limits.",
    "You monitor every call here and can withdraw or disable the agent's wallet at any time.",
];

export default function AgentsPage() {
    const { address, isConnected } = useAccount();
    const { authenticated, login } = usePrivy();
    const [mounted, setMounted] = useState(false);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState("");
    const [dailyLimit, setDailyLimit] = useState("");
    const [recipients, setRecipients] = useState<string[]>([""]);
    const [formError, setFormError] = useState("");
    const [formLoading, setFormLoading] = useState(false);

    const [newKey, setNewKey] = useState<string | null>(null);
    const [copiedKey, setCopiedKey] = useState(false);
    const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
    const [expandedLog, setExpandedLog] = useState<string | null>(null);
    const [spendOpen, setSpendOpen] = useState<string | null>(null);
    const [spendTo, setSpendTo] = useState("");
    const [spendAmt, setSpendAmt] = useState("");
    const [spendErr, setSpendErr] = useState("");
    const [spendBusy, setSpendBusy] = useState(false);
    const [spendOk, setSpendOk] = useState<string | null>(null);

    useEffect(() => { setMounted(true); }, []);

    const fetchAgents = useCallback(async () => {
        if (!address) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/agents?address=${address}`);
            const data = await res.json();
            setAgents(data.agents ?? []);
        } catch { } finally { setIsLoading(false); }
    }, [address]);

    useEffect(() => {
        if (authenticated && address) fetchAgents();
    }, [authenticated, address, fetchAgents]);

    const updateRecipient = (i: number, v: string) =>
        setRecipients(rs => rs.map((r, idx) => idx === i ? v : r));
    const addRecipient = () => setRecipients(rs => [...rs, ""]);
    const removeRecipient = (i: number) => setRecipients(rs => rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs);

    const handleCreate = async () => {
        setFormError("");
        if (!address) return;
        if (!name.trim()) { setFormError("Agent name is required."); return; }
        if (dailyLimit && (isNaN(parseFloat(dailyLimit)) || parseFloat(dailyLimit) < 0)) {
            setFormError("Daily limit must be 0 or greater."); return;
        }
        const cleanRecipients = recipients.map(r => r.trim()).filter(Boolean);
        for (const r of cleanRecipients) {
            if (!isValidAddress(r)) { setFormError(`Invalid address: ${r}`); return; }
        }

        setFormLoading(true);
        try {
            const res = await fetch("/api/agents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ownerAddress: address,
                    name: name.trim(),
                    dailyLimit: dailyLimit || "0",
                    allowedRecipients: cleanRecipients,
                }),
            });
            const data = await res.json();
            if (!res.ok) { setFormError(data.error || "Failed to create agent."); return; }
            setNewKey(data.apiKey);
            setShowForm(false);
            setName(""); setDailyLimit(""); setRecipients([""]);
            fetchAgents();
        } catch { setFormError("Network error."); }
        finally { setFormLoading(false); }
    };

    const handleToggle = async (a: Agent) => {
        await fetch(`/api/agents/${a.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ callerAddress: address, active: !a.active }),
        });
        fetchAgents();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this agent wallet? Any USDC left in it will be inaccessible. This cannot be undone.")) return;
        await fetch(`/api/agents/${id}?address=${address}`, { method: "DELETE" });
        fetchAgents();
    };

    const handleSpend = async (agentId: string) => {
        setSpendErr(""); setSpendOk(null);
        if (!isValidAddress(spendTo.trim())) { setSpendErr("Enter a valid recipient address."); return; }
        const amt = parseFloat(spendAmt);
        if (isNaN(amt) || amt <= 0) { setSpendErr("Enter a valid amount."); return; }
        setSpendBusy(true);
        try {
            const res = await fetch(`/api/agents/${agentId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "spend", callerAddress: address, recipient: spendTo.trim(), amount: spendAmt }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) { setSpendErr(data.error || "Withdrawal failed."); return; }
            setSpendOk(data.txHash);
            setSpendTo(""); setSpendAmt("");
            fetchAgents();
        } catch { setSpendErr("Network error."); }
        finally { setSpendBusy(false); }
    };

    const copyKey = () => { if (newKey) { navigator.clipboard.writeText(newKey); setCopiedKey(true); setTimeout(() => setCopiedKey(false), 2000); } };
    const copyAddr = (addr: string) => { navigator.clipboard.writeText(addr); setCopiedAddr(addr); setTimeout(() => setCopiedAddr(null), 2000); };

    const totalSpentAll = agents.reduce((s, a) => s + parseFloat(a.totalSpent || "0"), 0);
    const activeCount = agents.filter(a => a.active).length;
    const totalTx = agents.reduce((s, a) => s + a.txCount, 0);
    const remainingToday = agents
        .filter(a => a.active && parseFloat(a.dailyLimit || "0") > 0)
        .reduce((s, a) => s + Math.max(parseFloat(a.dailyLimit) - parseFloat(a.spentToday || "0"), 0), 0);
    const fmt = (n: number) => n % 1 === 0 ? n.toString() : n.toFixed(2);

    const STAT_CARDS = [
        { label: "Active Agents", value: activeCount.toString(), unit: "", sub: `${agents.length} total agents`, color: "var(--c)", dim: "var(--c-dim)", border: "var(--c-border)", icon: <IconAgent color="var(--c)" /> },
        { label: "Total Spend", value: fmt(totalSpentAll), unit: "USDC", sub: "across all agents", color: "var(--info)", dim: "var(--info-dim)", border: "var(--info-border)", icon: <IconSpend color="var(--info)" /> },
        { label: "x402 Calls", value: totalTx.toString(), unit: "", sub: "autonomous payments made", color: "var(--warning)", dim: "var(--warning-dim)", border: "rgba(255,176,46,.3)", icon: <IconBolt color="var(--warning)" /> },
        { label: "Remaining Today", value: fmt(remainingToday), unit: "USDC", sub: "across agents with limits", color: "var(--c)", dim: "var(--c-dim)", border: "var(--c-border)", icon: <IconGauge color="var(--c)" /> },
    ];

    return (
        <div className="app">
            <NavBar />
            <div className="page-wrap">
                <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <h1 className="page-title">Agent Wallets</h1>
                        <p className="page-subtitle">Give AI agents their own wallet with spending limits and allowed recipients</p>
                    </div>
                    {mounted && isConnected && (
                        <button onClick={() => { setShowForm(!showForm); setNewKey(null); }} className="form-submit-btn" style={{ width: "auto", padding: "10px 20px" }}>
                            {showForm ? "✕ Close" : "+ New Agent"}
                        </button>
                    )}
                </div>

                {mounted && !authenticated && (
                    <div className="empty" style={{ paddingTop: 80 }}>
                        <div className="empty-icon">
                            <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><rect x="4" y="6" width="16" height="13" rx="2" stroke="var(--ink-3)" strokeWidth="1.5" /><path d="M9 6V3.5M15 6V3.5M9 12h1M14 12h1" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round" /></svg>
                        </div>
                        <p className="empty-title">Connect your wallet</p>
                        <p className="empty-sub">Sign in to create and manage agent wallets</p>
                        <button className="form-submit-btn" style={{ width: "auto", padding: "12px 28px", margin: "18px auto 0" }} onClick={login}>Connect Wallet</button>
                    </div>
                )}

                {mounted && isConnected && (
                    <div className="bento-grid">

                        {/* Stats */}
                        {agents.length > 0 && STAT_CARDS.map(s => (
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

                        {/* New API key reveal */}
                        {newKey && (
                            <div className="bento-cell bento-12">
                                <div className="card" style={{ padding: "16px 20px", border: "1px solid var(--c-border)", background: "rgba(0,229,160,.05)" }}>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--c)", marginBottom: 6 }}>✓ Agent created — save the API key now</p>
                                    <p style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 10 }}>Shown only once. Your agent uses this as a Bearer token to spend. Treat it like a password.</p>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                        <code style={{ flex: 1, fontSize: 12, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-1)", background: "var(--bg)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--stroke)", overflowX: "auto" }}>{newKey}</code>
                                        <button className="form-submit-btn" style={{ width: "auto", padding: "8px 16px" }} onClick={copyKey}>{copiedKey ? "Copied!" : "Copy"}</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Create form + trust panel */}
                        {showForm && (
                            <>
                                <div className="bento-cell bento-7">
                                    <div className="form-card">
                                        <div className="form-card-header">
                                            <div className="form-card-header-icon"><IconAgent color="var(--c)" /></div>
                                            <div>
                                                <div className="form-card-title">New Agent Wallet</div>
                                                <div className="form-card-subtitle">A funded wallet your AI agent spends from, within limits you set</div>
                                            </div>
                                        </div>
                                        <div className="form-card-body">
                                            <div className="form-group">
                                                <label className="form-label">Agent name</label>
                                                <input className="input" placeholder="e.g. ResearchBot" value={name} onChange={e => setName(e.target.value)} maxLength={60} />
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">Daily limit <span className="form-label-optional">(0 = unlimited)</span></label>
                                                <div className="input-wrap input-wrap-hero">
                                                    <input className="input input-hero mono" type="number" min="0" step="0.01" placeholder="0.00" value={dailyLimit} onChange={e => setDailyLimit(e.target.value)} />
                                                    <span className="input-suffix">USDC</span>
                                                </div>
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label">Allowed recipients <span className="form-label-optional">(leave empty to allow any address)</span></label>
                                                {recipients.map((r, i) => (
                                                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 36px", gap: 8, marginBottom: 8, marginTop: i === 0 ? 6 : 0, alignItems: "center" }}>
                                                        <input className="input" placeholder="0x... address the agent may pay" value={r} onChange={e => updateRecipient(i, e.target.value)} style={{ fontSize: 13 }} />
                                                        <button onClick={() => removeRecipient(i)} disabled={recipients.length <= 1} style={{ background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: 8, height: 38, cursor: recipients.length <= 1 ? "not-allowed" : "pointer", color: recipients.length <= 1 ? "var(--stroke2)" : "var(--danger)", fontSize: 18, opacity: recipients.length <= 1 ? .4 : 1 }}>×</button>
                                                    </div>
                                                ))}
                                                <button onClick={addRecipient} className="btn-ghost" style={{ marginTop: 4 }}>+ Add recipient</button>
                                            </div>

                                            {formError && <div className="form-error" style={{ marginTop: 16 }}>{formError}</div>}

                                            <button className="form-submit-btn" style={{ marginTop: 20 }} onClick={handleCreate} disabled={formLoading}>
                                                {formLoading ? <span className="form-submit-spinner"><span className="spinner" />Provisioning wallet...</span> : "Create Agent Wallet"}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="bento-cell bento-5">
                                    <div className="form-card">
                                        <div className="form-card-header">
                                            <div className="form-card-header-icon">
                                                <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><circle cx="8" cy="8" r="6.5" stroke="var(--c)" strokeWidth="1.3" /><path d="M8 5v3.2l2 1.3" stroke="var(--c)" strokeWidth="1.3" strokeLinecap="round" /></svg>
                                            </div>
                                            <div><div className="form-card-title">How Agents Work</div><div className="form-card-subtitle">The autonomous x402 pay loop</div></div>
                                        </div>
                                        <div className="form-card-body">
                                            <div className="escrow-steps">
                                                {AGENT_STEPS.map((step, i) => (
                                                    <div key={i} className="escrow-step">
                                                        <span className="escrow-step-num">{i + 1}</span>
                                                        <span className="escrow-step-text">{step}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="escrow-fee-note">
                                                <svg viewBox="0 0 14 14" fill="none" width="12" height="12" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="7" cy="7" r="5.5" stroke="var(--ink-3)" strokeWidth="1.2" /><path d="M7 4.5v2.8l1.5 1" stroke="var(--ink-3)" strokeWidth="1.2" strokeLinecap="round" /></svg>
                                                <span>Daily limits reset every 24 hours. You can disable or withdraw from any agent wallet at any time — the agent itself never holds your main wallet's keys.</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Agent list */}
                        <div className="bento-cell bento-12">
                            <div className="table-card">
                                <div className="table-header">
                                    <div className="table-header-left">
                                        <span className="table-header-title">Your Agents</span>
                                        <span className="table-count-badge">{agents.length}</span>
                                    </div>
                                    <div className="table-header-right">
                                        <button className="table-refresh-btn" onClick={fetchAgents} title="Refresh">↻</button>
                                    </div>
                                </div>

                                {agents.length > 0 && (
                                    <div className="table-col-headers" style={{ gridTemplateColumns: "2.2fr 1fr 1fr 1fr 1.3fr 1.6fr" }}>
                                        {["AGENT", "STATUS", "WALLET", "LAST ACTIVE", "X402 ACTIVITY", "ACTIONS"].map(c => (
                                            <span key={c} className="table-col-header">{c}</span>
                                        ))}
                                    </div>
                                )}

                                <div style={{ overflowY: "auto", maxHeight: 640 }}>
                                    {isLoading && <div className="loading-center" style={{ height: 140 }}><div className="page-spinner" /></div>}

                                    {!isLoading && agents.length === 0 && (
                                        <div className="table-empty">
                                            <div className="table-empty-icon">
                                                <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><rect x="4" y="6" width="16" height="13" rx="2" stroke="var(--ink-3)" strokeWidth="1.5" /><path d="M9 6V3.5M15 6V3.5M9 12h1M14 12h1" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round" /></svg>
                                            </div>
                                            <p className="table-empty-title">No agent wallets yet</p>
                                            <p className="table-empty-sub">Create one to let an AI agent spend USDC within your limits.</p>
                                        </div>
                                    )}

                                    {!isLoading && agents.map(a => {
                                        const status = deriveStatus(a);
                                        const spent = parseFloat(a.spentToday || "0");
                                        const limit = parseFloat(a.dailyLimit || "0");
                                        const logOpen = expandedLog === a.id;
                                        const withdrawOpen = spendOpen === a.id;
                                        return (
                                            <div key={a.id}>
                                                <div className="table-data-row" style={{ gridTemplateColumns: "2.2fr 1fr 1fr 1fr 1.3fr 1.6fr", borderLeft: `3px solid ${status.color}` }}>
                                                    <div className="table-cell-title">
                                                        <div className="table-cell-title-name">
                                                            <span className="table-cell-status-dot" style={{ background: status.color }} />
                                                            <span className="table-cell-title-text">{a.name}</span>
                                                            <code style={{ fontSize: 9, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace", flexShrink: 0 }}>{a.apiKeyPreview}</code>
                                                        </div>
                                                        <p className="table-cell-description">
                                                            {limit > 0 ? `Limit: ${spent.toFixed(2)}/${limit} USDC` : "Limit: Unlimited"} · {a.allowedRecipients.length === 0 ? "Any recipient" : `${a.allowedRecipients.length} allowed`}
                                                        </p>
                                                        {a.transactions.length > 0 && (
                                                            <button onClick={() => setExpandedLog(logOpen ? null : a.id)} style={{ fontSize: 11, color: "var(--c)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0, marginTop: 3, marginLeft: 15 }}>
                                                                {logOpen ? "Hide activity" : `Activity (${a.transactions.length})`}
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <span className={`status-badge ${status.cls}`}>
                                                            <span className="status-badge-dot" />
                                                            {status.label}
                                                        </span>
                                                    </div>

                                                    <button onClick={() => copyAddr(a.walletAddress)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 11, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace", textAlign: "left" }}>
                                                        {shortenAddress(a.walletAddress)} {copiedAddr === a.walletAddress ? "✓" : "⧉"}
                                                    </button>

                                                    <span className="table-date">{fmtLastActive(a.lastUsedAt)}</span>

                                                    <span style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-1)" }}>
                                                        {a.txCount} calls<br /><span style={{ color: "var(--ink-3)", fontSize: 11 }}>{formatUSDC(a.totalSpent)} USDC</span>
                                                    </span>

                                                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                                        <button className="table-copy-btn" onClick={() => { const opening = !withdrawOpen; setSpendOpen(opening ? a.id : null); setSpendErr(""); setSpendOk(null); if (opening && address) setSpendTo(address); }}>Withdraw</button>
                                                        <button className="table-copy-btn" onClick={() => handleToggle(a)}>{a.active ? "Disable" : "Enable"}</button>
                                                        <button className="table-cancel-btn" onClick={() => handleDelete(a.id)}>Delete</button>
                                                    </div>
                                                </div>

                                                {/* Owner withdraw form */}
                                                {withdrawOpen && (
                                                    <div style={{ background: "var(--bg-2)", borderBottom: "1px solid var(--stroke)", padding: "14px 20px" }}>
                                                        <p style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 8 }}>Withdraw funds from this agent wallet to any address. Defaults to your wallet — change it to send elsewhere.</p>
                                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 110px auto", gap: 8, alignItems: "center" }}>
                                                            <input className="input" placeholder="0x destination address" value={spendTo} onChange={e => setSpendTo(e.target.value)} style={{ fontSize: 12 }} />
                                                            <div className="input-wrap">
                                                                <input className="input mono" type="number" min="0" step="0.01" placeholder="0.00" value={spendAmt} onChange={e => setSpendAmt(e.target.value)} style={{ fontSize: 12, paddingRight: 46 }} />
                                                                <span className="input-suffix" style={{ fontSize: 10 }}>USDC</span>
                                                            </div>
                                                            <button className="form-submit-btn" style={{ width: "auto", padding: "9px 18px" }} onClick={() => handleSpend(a.id)} disabled={spendBusy}>
                                                                {spendBusy ? "Withdrawing..." : "Withdraw"}
                                                            </button>
                                                        </div>
                                                        {spendErr && <p style={{ fontSize: 11, color: "var(--danger)", marginTop: 8 }}>{spendErr}</p>}
                                                        {spendOk && (
                                                            <p style={{ fontSize: 11, color: "var(--c)", marginTop: 8 }}>
                                                                ✓ Withdrawn — <a href={`https://testnet.arcscan.app/tx/${spendOk}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--c)", fontWeight: 700 }}>view tx ↗</a>
                                                            </p>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Activity log */}
                                                {logOpen && (
                                                    <div style={{ background: "var(--bg-2)", borderBottom: "1px solid var(--stroke)" }}>
                                                        <div className="feed-list">
                                                            {a.transactions.map(t => (
                                                                <div key={t.id} className="feed-row" style={{ padding: "7px 20px" }}>
                                                                    <span className="feed-dot" style={{ background: txColor(t.status) }} />
                                                                    <div className="feed-info">
                                                                        <div className="feed-title">{shortenAddress(t.recipient)}{t.reason && ` · ${t.reason}`}</div>
                                                                        <div className="feed-time">
                                                                            {new Date(t.createdAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
                                                                            {t.txHash && (<> · <a href={`https://testnet.arcscan.app/tx/${t.txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: txColor(t.status) }}>{t.status.toLowerCase()} ↗</a></>)}
                                                                            {!t.txHash && <span style={{ color: txColor(t.status) }}> · {t.status.toLowerCase()}</span>}
                                                                        </div>
                                                                    </div>
                                                                    <span className="feed-amount" style={{ color: txColor(t.status) }}>
                                                                        {formatUSDC(t.amount)} <span style={{ fontSize: 10, color: "var(--ink-3)" }}>USDC</span>
                                                                    </span>
                                                                </div>
                                                            ))}
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
