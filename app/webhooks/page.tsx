"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { NavBar } from "@/components/NavBar";

interface Delivery {
    id: string; event: string; statusCode?: number; success: boolean;
    errorMessage?: string; attempts: number; createdAt: string;
}
interface Webhook {
    id: string; url: string; secret: string; events: string[];
    active: boolean; failureCount: number; lastFiredAt?: string; createdAt: string;
    deliveries: Delivery[];
}

const EVENT_LABELS: Record<string, string> = {
    "payment.completed": "Payment completed",
    "escrow.funded": "Escrow funded",
    "escrow.released": "Escrow released",
    "escrow.disputed": "Escrow disputed",
    "escrow.refunded": "Escrow refunded",
    "split.funded": "Split funded",
    "split.distributed": "Split distributed",
};

export default function WebhooksPage() {
    const { address, isConnected } = useAccount();
    const { authenticated, login } = usePrivy();
    const [mounted, setMounted] = useState(false);
    const [webhooks, setWebhooks] = useState<Webhook[]>([]);
    const [availableEvents, setAvailableEvents] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [showForm, setShowForm] = useState(false);
    const [url, setUrl] = useState("");
    const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
    const [formError, setFormError] = useState("");
    const [formLoading, setFormLoading] = useState(false);

    const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
    const [copiedSecret, setCopiedSecret] = useState<string | null>(null);
    const [expandedLog, setExpandedLog] = useState<string | null>(null);
    const [testingId, setTestingId] = useState<string | null>(null);
    const [testResult, setTestResult] = useState<{ id: string; ok: boolean; msg: string } | null>(null);

    useEffect(() => { setMounted(true); }, []);

    const fetchWebhooks = useCallback(async () => {
        if (!address) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/webhooks?address=${address}`);
            const data = await res.json();
            setWebhooks(data.webhooks ?? []);
            setAvailableEvents(data.availableEvents ?? []);
        } catch { } finally { setIsLoading(false); }
    }, [address]);

    useEffect(() => {
        if (authenticated && address) fetchWebhooks();
    }, [authenticated, address, fetchWebhooks]);

    const toggleEvent = (e: string) =>
        setSelectedEvents(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e]);

    const handleCreate = async () => {
        setFormError("");
        if (!address) return;
        try { const u = new URL(url); if (u.protocol !== "https:") { setFormError("URL must use HTTPS."); return; } }
        catch { setFormError("Enter a valid URL."); return; }
        if (selectedEvents.length === 0) { setFormError("Select at least one event."); return; }

        setFormLoading(true);
        try {
            const res = await fetch("/api/webhooks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ownerAddress: address, url: url.trim(), events: selectedEvents }),
            });
            const data = await res.json();
            if (!res.ok) { setFormError(data.error || "Failed to create webhook."); return; }
            setRevealedSecret(data.webhook.secret); // show secret once on creation
            setShowForm(false);
            setUrl(""); setSelectedEvents([]);
            fetchWebhooks();
        } catch { setFormError("Network error."); }
        finally { setFormLoading(false); }
    };

    const handleToggleActive = async (w: Webhook) => {
        await fetch(`/api/webhooks/${w.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ callerAddress: address, active: !w.active }),
        });
        fetchWebhooks();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this webhook? This cannot be undone.")) return;
        await fetch(`/api/webhooks/${id}?address=${address}`, { method: "DELETE" });
        fetchWebhooks();
    };

    const handleTest = async (id: string) => {
        setTestingId(id); setTestResult(null);
        try {
            const res = await fetch(`/api/webhooks/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ callerAddress: address, action: "test" }),
            });
            const data = await res.json();
            setTestResult({ id, ok: data.success, msg: data.success ? `OK (${data.statusCode})` : (data.error || "Failed") });
            fetchWebhooks();
        } catch { setTestResult({ id, ok: false, msg: "Network error" }); }
        finally { setTestingId(null); }
    };

    const copySecret = (secret: string) => {
        navigator.clipboard.writeText(secret);
        setCopiedSecret(secret);
        setTimeout(() => setCopiedSecret(null), 2000);
    };

    const mask = (s: string) => s.slice(0, 10) + "•".repeat(20) + s.slice(-4);

    return (
        <div className="app">
            <NavBar />
            <div className="page-wrap">
                <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <h1 className="page-title">Webhooks</h1>
                        <p className="page-subtitle">Get notified at your endpoint when payments, escrows, and splits change</p>
                    </div>
                    {mounted && isConnected && (
                        <button onClick={() => { setShowForm(!showForm); setRevealedSecret(null); }} className="form-submit-btn" style={{ width: "auto", padding: "10px 20px" }}>
                            {showForm ? "✕ Close" : "+ New Webhook"}
                        </button>
                    )}
                </div>

                {mounted && !authenticated && (
                    <div className="card" style={{ padding: "60px 24px", textAlign: "center" }}>
                        <p style={{ fontSize: 16, fontWeight: 800, color: "var(--ink-1)", marginBottom: 6 }}>Connect your wallet</p>
                        <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 18 }}>Sign in to manage webhook endpoints.</p>
                        <button className="form-submit-btn" style={{ width: "auto", padding: "12px 28px", margin: "0 auto" }} onClick={login}>Connect Wallet</button>
                    </div>
                )}

                {mounted && isConnected && (
                    <>
                        {/* New-secret reveal banner */}
                        {revealedSecret && (
                            <div className="card" style={{ marginBottom: 20, padding: "16px 20px", border: "1px solid var(--c-border)", background: "rgba(0,229,160,.05)" }}>
                                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--c)", marginBottom: 6 }}>✓ Webhook created — save your signing secret now</p>
                                <p style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 10 }}>This is the only time the full secret is shown. Use it to verify the <code>X-Conduit-Signature</code> header (HMAC-SHA256).</p>
                                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                    <code style={{ flex: 1, fontSize: 12, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-1)", background: "var(--bg)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--stroke)", overflowX: "auto" }}>{revealedSecret}</code>
                                    <button className="form-submit-btn" style={{ width: "auto", padding: "8px 16px" }} onClick={() => copySecret(revealedSecret)}>
                                        {copiedSecret === revealedSecret ? "Copied!" : "Copy"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Create form */}
                        {showForm && (
                            <div className="card" style={{ marginBottom: 20 }}>
                                <div className="card-head">
                                    <div className="card-head-icon">
                                        <svg viewBox="0 0 16 16" fill="none" width="16" height="16"><path d="M3 8a5 5 0 015-5M8 13a5 5 0 005-5" stroke="var(--c)" strokeWidth="1.4" strokeLinecap="round" /><circle cx="8" cy="8" r="2" stroke="var(--c)" strokeWidth="1.4" /></svg>
                                    </div>
                                    <div>
                                        <div className="card-title">New Webhook</div>
                                        <div className="card-subtitle">We POST a signed JSON payload to your URL on each event</div>
                                    </div>
                                </div>
                                <div className="card-body">
                                    <div className="form-group">
                                        <label className="form-label">Endpoint URL (HTTPS)</label>
                                        <input className="input" placeholder="https://your-app.com/webhooks/conduit" value={url} onChange={e => setUrl(e.target.value)} />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Events to subscribe</label>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
                                            {availableEvents.map(e => (
                                                <label key={e} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: selectedEvents.includes(e) ? "var(--c-dim)" : "var(--bg)", border: `1px solid ${selectedEvents.includes(e) ? "var(--c-border)" : "var(--stroke)"}`, borderRadius: 8, cursor: "pointer", transition: "all .12s" }}>
                                                    <input type="checkbox" checked={selectedEvents.includes(e)} onChange={() => toggleEvent(e)} style={{ accentColor: "var(--c)" }} />
                                                    <div>
                                                        <span style={{ fontSize: 12, color: "var(--ink-1)", fontWeight: 600 }}>{EVENT_LABELS[e] ?? e}</span>
                                                        <span style={{ display: "block", fontSize: 10, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>{e}</span>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    {formError && <div className="form-error" style={{ marginTop: 16 }}>{formError}</div>}
                                    <button className="form-submit-btn" style={{ marginTop: 20 }} onClick={handleCreate} disabled={formLoading}>
                                        {formLoading ? <span className="form-submit-spinner"><div className="page-spinner" style={{ width: 14, height: 14 }} /> Creating…</span> : "Create Webhook"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Webhook list */}
                        <div className="table-card">
                            <div className="table-header">
                                <div className="table-header-left">
                                    <span className="table-header-title">Your Endpoints</span>
                                    <span className="table-count-badge">{webhooks.length}</span>
                                </div>
                                <div className="table-header-right">
                                    <button className="table-refresh-btn" onClick={fetchWebhooks} title="Refresh">↻</button>
                                </div>
                            </div>

                            <div style={{ padding: webhooks.length === 0 ? 0 : 16 }}>
                                {isLoading && <div className="loading-center" style={{ height: 120 }}><div className="page-spinner" /></div>}

                                {!isLoading && webhooks.length === 0 && (
                                    <div className="table-empty">
                                        <div className="table-empty-icon">
                                            <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M4 12a8 8 0 018-8M12 20a8 8 0 008-8" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round" /><circle cx="12" cy="12" r="3" stroke="var(--ink-3)" strokeWidth="1.5" /></svg>
                                        </div>
                                        <p className="table-empty-title">No webhooks yet</p>
                                        <p className="table-empty-sub">Add an endpoint to start receiving events.</p>
                                    </div>
                                )}

                                {!isLoading && webhooks.map(w => {
                                    const lastDelivery = w.deliveries[0];
                                    return (
                                        <div key={w.id} style={{ border: "1px solid var(--stroke)", borderRadius: 12, padding: 16, marginBottom: 12, background: "var(--bg)" }}>
                                            {/* Top row */}
                                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: w.active ? "var(--c)" : "var(--ink-3)", flexShrink: 0 }} />
                                                        <code style={{ fontSize: 13, color: "var(--ink-1)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.url}</code>
                                                    </div>
                                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                                                        {w.events.map(e => (
                                                            <span key={e} style={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-2)", background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: 4, padding: "2px 6px" }}>{e}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                                                    <button className="table-copy-btn" onClick={() => handleTest(w.id)} disabled={testingId === w.id}>
                                                        {testingId === w.id ? "Testing…" : "Test"}
                                                    </button>
                                                    <button className="table-copy-btn" onClick={() => handleToggleActive(w)}>
                                                        {w.active ? "Disable" : "Enable"}
                                                    </button>
                                                    <button className="table-cancel-btn" onClick={() => handleDelete(w.id)}>Delete</button>
                                                </div>
                                            </div>

                                            {/* Secret (masked) */}
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                                                <span style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace", textTransform: "uppercase" }}>Secret</span>
                                                <code style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>{mask(w.secret)}</code>
                                            </div>

                                            {/* Test result */}
                                            {testResult?.id === w.id && (
                                                <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: testResult.ok ? "var(--c)" : "var(--danger)" }}>
                                                    {testResult.ok ? "✓ " : "✕ "}{testResult.msg}
                                                </div>
                                            )}

                                            {/* Status + delivery log toggle */}
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--stroke)" }}>
                                                <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--ink-3)" }}>
                                                    <span>{w.active ? "Active" : "Disabled"}</span>
                                                    {w.failureCount > 0 && <span style={{ color: "var(--warning)" }}>{w.failureCount} recent failures</span>}
                                                    {lastDelivery && (
                                                        <span style={{ color: lastDelivery.success ? "var(--c)" : "var(--danger)" }}>
                                                            Last: {lastDelivery.success ? "delivered" : "failed"}
                                                        </span>
                                                    )}
                                                </div>
                                                {w.deliveries.length > 0 && (
                                                    <button onClick={() => setExpandedLog(expandedLog === w.id ? null : w.id)} style={{ fontSize: 11, color: "var(--c)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                                                        {expandedLog === w.id ? "Hide log" : `Delivery log (${w.deliveries.length})`}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Delivery log */}
                                            {expandedLog === w.id && (
                                                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
                                                    {w.deliveries.map(d => (
                                                        <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, padding: "6px 10px", background: "var(--surface)", borderRadius: 6 }}>
                                                            <span style={{ fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-2)" }}>{d.event}</span>
                                                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                                                <span style={{ color: "var(--ink-3)" }}>{new Date(d.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                                                                <span style={{ fontWeight: 700, fontFamily: "IBM Plex Mono, monospace", color: d.success ? "var(--c)" : "var(--danger)" }}>
                                                                    {d.success ? d.statusCode : (d.errorMessage ?? "failed")}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
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