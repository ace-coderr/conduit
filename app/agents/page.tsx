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
({ SENT: "#00E5A0", PENDING: "#f5a623", FAILED: "#f03e5f", BLOCKED: "#f03e5f" }[s] ?? "#666");

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

    const copyKey = () => { if (newKey) { navigator.clipboard.writeText(newKey); setCopiedKey(true); setTimeout(() => setCopiedKey(false), 2000); } };
    const copyAddr = (addr: string) => { navigator.clipboard.writeText(addr); setCopiedAddr(addr); setTimeout(() => setCopiedAddr(null), 2000); };

    const totalSpentAll = agents.reduce((s, a) => s + parseFloat(a.totalSpent || "0"), 0);
    const activeCount = agents.filter(a => a.active).length;
    const totalTx = agents.reduce((s, a) => s + a.txCount, 0);

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
                    <div className="card" style={{ padding: "60px 24px", textAlign: "center" }}>
                        <p style={{ fontSize: 16, fontWeight: 800, color: "var(--ink-1)", marginBottom: 6 }}>Connect your wallet</p>
                        <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 18 }}>Sign in to create and manage agent wallets.</p>
                        <button className="form-submit-btn" style={{ width: "auto", padding: "12px 28px", margin: "0 auto" }} onClick={login}>Connect Wallet</button>
                    </div>
                )}

                {mounted && isConnected && (
                    <>
                        {agents.length > 0 && (
                            <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 20 }}>
                                {[
                                    { label: "Total Spent", value: formatUSDC(totalSpentAll.toString()), unit: "USDC", color: "#00E5A0", sub: `${totalTx} transactions` },
                                    { label: "Active Agents", value: String(activeCount), unit: "", color: "#5b8ff9", sub: `${agents.length} total` },
                                    { label: "Agent Wallets", value: String(agents.length), unit: "", color: "#a78bfa", sub: "with guardrails" },
                                ].map((s, i) => (
                                    <div key={i} className="stat-card">
                                        <div className="stat-card-line" style={{ background: s.color }} />
                                        <div className="stat-value">{s.value}{s.unit && <span style={{ fontSize: 13, color: s.color, marginLeft: 4, fontFamily: "IBM Plex Mono, monospace" }}>{s.unit}</span>}</div>
                                        <div className="stat-label">{s.label}</div>
                                        <div className="stat-sub">{s.sub}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* New API key reveal */}
                        {newKey && (
                            <div className="card" style={{ marginBottom: 20, padding: "16px 20px", border: "1px solid var(--c-border)", background: "rgba(0,229,160,.05)" }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--c)", marginBottom: 6 }}>✓ Agent created — save the API key now</p>
                                <p style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 10 }}>Shown only once. Your agent uses this as a Bearer token to spend. Treat it like a password.</p>
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <code style={{ flex: 1, fontSize: 12, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-1)", background: "var(--bg)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--stroke)", overflowX: "auto" }}>{newKey}</code>
                                    <button className="form-submit-btn" style={{ width: "auto", padding: "8px 16px" }} onClick={copyKey}>{copiedKey ? "Copied!" : "Copy"}</button>
                                </div>
                            </div>
                        )}

                        {/* Create form */}
                        {showForm && (
                            <div className="card" style={{ marginBottom: 20 }}>
                                <div className="card-head">
                                    <div className="card-head-icon">
                                        <svg viewBox="0 0 16 16" fill="none" width="16" height="16"><rect x="3" y="4" width="10" height="9" rx="2" stroke="var(--c)" strokeWidth="1.3" /><path d="M6 4V2.5M10 4V2.5M6.5 8h.5M9 8h.5" stroke="var(--c)" strokeWidth="1.3" strokeLinecap="round" /></svg>
                                    </div>
                                    <div>
                                        <div className="card-title">New Agent Wallet</div>
                                        <div className="card-subtitle">A funded wallet your AI agent spends from, within limits you set</div>
                                    </div>
                                </div>
                                <div className="card-body">
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Agent name</label>
                                            <input className="input" placeholder="e.g. ResearchBot" value={name} onChange={e => setName(e.target.value)} maxLength={60} />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Daily limit <span className="form-label-opt">(0 = unlimited)</span></label>
                                            <div className="input-wrap">
                                                <input className="input mono" type="number" min="0" step="0.01" placeholder="0.00" value={dailyLimit} onChange={e => setDailyLimit(e.target.value)} style={{ paddingRight: 52 }} />
                                                <span className="input-suffix">USDC</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: 18 }}>
                                        <label className="form-label">Allowed recipients <span className="form-label-opt">(leave empty to allow any address)</span></label>
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
                                        {formLoading ? <span className="form-submit-spinner"><div className="page-spinner" style={{ width: 14, height: 14 }} /> Provisioning wallet…</span> : "Create Agent Wallet"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Agent list */}
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

                            <div style={{ padding: agents.length === 0 ? 0 : 16 }}>
                                {isLoading && <div className="loading-center" style={{ height: 120 }}><div className="page-spinner" /></div>}

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
                                    const spent = parseFloat(a.spentToday || "0");
                                    const limit = parseFloat(a.dailyLimit || "0");
                                    return (
                                        <div key={a.id} style={{ border: "1px solid var(--stroke)", borderRadius: 12, padding: 16, marginBottom: 12, background: "var(--bg)" }}>
                                            {/* Header */}
                                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: a.active ? "var(--c)" : "var(--ink-3)", flexShrink: 0 }} />
                                                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-1)" }}>{a.name}</span>
                                                        <code style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>{a.apiKeyPreview}</code>
                                                    </div>
                                                    <button onClick={() => copyAddr(a.walletAddress)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 11, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>
                                                        {shortenAddress(a.walletAddress)} {copiedAddr === a.walletAddress ? "✓" : "⧉"}
                                                    </button>
                                                </div>
                                                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                                                    <button className="table-copy-btn" onClick={() => handleToggle(a)}>{a.active ? "Disable" : "Enable"}</button>
                                                    <button className="table-cancel-btn" onClick={() => handleDelete(a.id)}>Delete</button>
                                                </div>
                                            </div>

                                            {/* Stats */}
                                            <div style={{ display: "flex", gap: 20, marginTop: 12, flexWrap: "wrap" }}>
                                                <div>
                                                    <p style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", fontFamily: "IBM Plex Mono, monospace" }}>Daily limit</p>
                                                    <p style={{ fontSize: 13, color: "var(--ink-1)", fontWeight: 600 }}>{limit > 0 ? `${spent.toFixed(2)} / ${limit} USDC` : "Unlimited"}</p>
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", fontFamily: "IBM Plex Mono, monospace" }}>Total spent</p>
                                                    <p style={{ fontSize: 13, color: "var(--ink-1)", fontWeight: 600 }}>{formatUSDC(a.totalSpent)} USDC</p>
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", fontFamily: "IBM Plex Mono, monospace" }}>Recipients</p>
                                                    <p style={{ fontSize: 13, color: "var(--ink-1)", fontWeight: 600 }}>{a.allowedRecipients.length === 0 ? "Any" : `${a.allowedRecipients.length} allowed`}</p>
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: 10, color: "var(--ink-3)", textTransform: "uppercase", fontFamily: "IBM Plex Mono, monospace" }}>Transactions</p>
                                                    <p style={{ fontSize: 13, color: "var(--ink-1)", fontWeight: 600 }}>{a.txCount}</p>
                                                </div>
                                            </div>

                                            {/* Activity log */}
                                            {a.transactions.length > 0 && (
                                                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--stroke)" }}>
                                                    <button onClick={() => setExpandedLog(expandedLog === a.id ? null : a.id)} style={{ fontSize: 11, color: "var(--c)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                                                        {expandedLog === a.id ? "Hide activity" : `Activity (${a.transactions.length})`}
                                                    </button>
                                                    {expandedLog === a.id && (
                                                        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
                                                            {a.transactions.map(t => (
                                                                <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, padding: "6px 10px", background: "var(--surface)", borderRadius: 6 }}>
                                                                    <span style={{ fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-2)" }}>
                                                                        {shortenAddress(t.recipient)} · {formatUSDC(t.amount)} USDC
                                                                    </span>
                                                                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                                                        {t.reason && <span style={{ color: "var(--ink-3)", fontSize: 10 }}>{t.reason}</span>}
                                                                        {t.txHash ? (
                                                                            <a href={`https://testnet.arcscan.app/tx/${t.txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: txColor(t.status), fontWeight: 700, textDecoration: "none" }}>{t.status} ↗</a>
                                                                        ) : (
                                                                            <span style={{ color: txColor(t.status), fontWeight: 700 }}>{t.status}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}