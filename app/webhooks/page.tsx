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

// Endpoints have no rich status field — derived client-side from fields already fetched.
// No deliveries yet reads as "new"; auto-disabled (failureCount hit the threshold, active
// flips false) reads as failing; accumulating-but-not-yet-disabled failures read as degraded.
function deriveStatus(w: Webhook): { label: string; color: string; cls: string } {
    if (w.deliveries.length === 0) return { label: "NEW", color: "var(--info)", cls: "status-blue" };
    if (!w.active) return { label: "DISABLED", color: "var(--danger)", cls: "status-red" };
    if (w.failureCount > 0) return { label: "DEGRADED", color: "var(--warning)", cls: "status-yellow" };
    return { label: "HEALTHY", color: "var(--c)", cls: "status-green" };
}

const fmtLastDelivery = (d?: string) => {
    if (!d) return "Never";
    const diff = Date.now() - new Date(d).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return "Just now";
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
};

// Every stored delivery is already a final outcome — the retry loop runs internally
// before a row is ever written, so there's no live "retrying" state to show. The
// attempts count is the honest stand-in: it says whether this outcome took retries.
const deliveryLabel = (d: Delivery) => {
    if (d.success) return { text: d.attempts > 1 ? `Delivered (attempt ${d.attempts}/3)` : "Delivered", color: "var(--c)" };
    return { text: `Failed (${d.attempts}/3 attempts)`, color: "var(--danger)" };
};

const IconEndpoint = ({ color = "var(--c)" }: { color?: string }) => (
    <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M3 8a5 5 0 015-5M8 13a5 5 0 005-5" stroke={color} strokeWidth="1.4" strokeLinecap="round" /><circle cx="8" cy="8" r="2" stroke={color} strokeWidth="1.4" /></svg>
);
const IconGauge = ({ color = "var(--info)" }: { color?: string }) => (
    <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M2 13a6 6 0 1112 0" stroke={color} strokeWidth="1.3" strokeLinecap="round" /><path d="M8 9L10.5 5.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" /><circle cx="8" cy="9" r="1" fill={color} /></svg>
);
const IconAlert = ({ color = "var(--danger)" }: { color?: string }) => (
    <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M8 1.5L1 14h14L8 1.5z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" /><path d="M8 6.5v3M8 11.5v.01" stroke={color} strokeWidth="1.4" strokeLinecap="round" /></svg>
);
const IconTag = ({ color = "var(--purple)" }: { color?: string }) => (
    <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M2 2h5.5L14 8.5 8.5 14 2 7.5V2z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" /><circle cx="5.2" cy="5.2" r="1" fill={color} /></svg>
);

const WEBHOOK_STEPS = [
    "Add an HTTPS endpoint and pick which events to subscribe to.",
    "We POST a signed JSON payload to your URL the moment a subscribed event fires.",
    "You verify the X-Conduit-Signature header (HMAC-SHA256) before trusting the payload.",
    "If your endpoint errors or times out, we retry up to 3 times with backoff before giving up.",
];

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

    const activeCount = webhooks.filter(w => w.active).length;
    const recentDeliveries = webhooks.flatMap(w => w.deliveries);
    const successCount = recentDeliveries.filter(d => d.success).length;
    const failedCount = recentDeliveries.length - successCount;
    const successRate = recentDeliveries.length > 0 ? Math.round((successCount / recentDeliveries.length) * 100) : null;
    const subscribedEvents = new Set(webhooks.flatMap(w => w.events)).size;

    const STAT_CARDS = [
        { label: "Active Endpoints", value: activeCount.toString(), unit: "", sub: `${webhooks.length} total endpoints`, color: "var(--c)", dim: "var(--c-dim)", border: "var(--c-border)", icon: <IconEndpoint color="var(--c)" /> },
        { label: "Success Rate", value: successRate !== null ? successRate.toString() : "—", unit: successRate !== null ? "%" : "", sub: "recent deliveries", color: "var(--info)", dim: "var(--info-dim)", border: "var(--info-border)", icon: <IconGauge color="var(--info)" /> },
        {
            label: "Failed Deliveries", value: failedCount.toString(), unit: "", sub: failedCount > 0 ? "needs attention" : "all clear",
            color: failedCount > 0 ? "var(--danger)" : "var(--ink-3)",
            dim: failedCount > 0 ? "var(--danger-dim)" : "var(--raised)",
            border: failedCount > 0 ? "rgba(255,77,106,.3)" : "var(--stroke)",
            icon: <IconAlert color={failedCount > 0 ? "var(--danger)" : "var(--ink-3)"} />,
        },
        { label: "Events Subscribed", value: subscribedEvents.toString(), unit: "", sub: `of ${availableEvents.length || 7} available`, color: "var(--purple)", dim: "rgba(167,139,250,.12)", border: "rgba(167,139,250,.3)", icon: <IconTag color="var(--purple)" /> },
    ];

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
                    <div className="empty" style={{ paddingTop: 80 }}>
                        <div className="empty-icon">
                            <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M4 12a8 8 0 018-8M12 20a8 8 0 008-8" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round" /><circle cx="12" cy="12" r="3" stroke="var(--ink-3)" strokeWidth="1.5" /></svg>
                        </div>
                        <p className="empty-title">Connect your wallet</p>
                        <p className="empty-sub">Sign in to manage webhook endpoints</p>
                        <button className="form-submit-btn" style={{ width: "auto", padding: "12px 28px", margin: "18px auto 0" }} onClick={login}>Connect Wallet</button>
                    </div>
                )}

                {mounted && isConnected && (
                    <div className="bento-grid">

                        {/* Stats */}
                        {webhooks.length > 0 && STAT_CARDS.map(s => (
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

                        {/* New-secret reveal banner */}
                        {revealedSecret && (
                            <div className="bento-cell bento-12">
                                <div className="card" style={{ padding: "16px 20px", border: "1px solid var(--c-border)", background: "rgba(0,229,160,.05)" }}>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--c)", marginBottom: 6 }}>✓ Webhook created — save your signing secret now</p>
                                    <p style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 10 }}>This is the only time the full secret is shown. Use it to verify the <code>X-Conduit-Signature</code> header (HMAC-SHA256).</p>
                                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                        <code style={{ flex: 1, fontSize: 12, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-1)", background: "var(--bg)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--stroke)", overflowX: "auto" }}>{revealedSecret}</code>
                                        <button className="form-submit-btn" style={{ width: "auto", padding: "8px 16px" }} onClick={() => copySecret(revealedSecret)}>
                                            {copiedSecret === revealedSecret ? "Copied!" : "Copy"}
                                        </button>
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
                                            <div className="form-card-header-icon"><IconEndpoint color="var(--c)" /></div>
                                            <div>
                                                <div className="form-card-title">New Webhook</div>
                                                <div className="form-card-subtitle">We POST a signed JSON payload to your URL on each event</div>
                                            </div>
                                        </div>
                                        <div className="form-card-body">
                                            <div className="form-group">
                                                <label className="form-label">Endpoint URL (HTTPS)</label>
                                                <input className="input" placeholder="https://your-app.com/webhooks/conduit" value={url} onChange={e => setUrl(e.target.value)} />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label">Events to subscribe</label>
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6 }}>
                                                    {availableEvents.map(e => (
                                                        <label key={e} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: selectedEvents.includes(e) ? "var(--c-dim)" : "var(--raised)", border: `1px solid ${selectedEvents.includes(e) ? "var(--c-border)" : "var(--stroke)"}`, borderRadius: 8, cursor: "pointer", transition: "all .12s" }}>
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
                                                {formLoading ? <span className="form-submit-spinner"><span className="spinner" />Creating...</span> : "Create Webhook"}
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
                                            <div><div className="form-card-title">How Webhooks Work</div><div className="form-card-subtitle">Signed, verifiable, retried on failure</div></div>
                                        </div>
                                        <div className="form-card-body">
                                            <div className="escrow-steps">
                                                {WEBHOOK_STEPS.map((step, i) => (
                                                    <div key={i} className="escrow-step">
                                                        <span className="escrow-step-num">{i + 1}</span>
                                                        <span className="escrow-step-text">{step}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="escrow-fee-note">
                                                <svg viewBox="0 0 14 14" fill="none" width="12" height="12" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="7" cy="7" r="5.5" stroke="var(--ink-3)" strokeWidth="1.2" /><path d="M7 4.5v2.8l1.5 1" stroke="var(--ink-3)" strokeWidth="1.2" strokeLinecap="round" /></svg>
                                                <span>An endpoint auto-disables after 15 consecutive failures. You can re-enable it any time once your server is back up.</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Endpoint list */}
                        <div className="bento-cell bento-12">
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

                                {webhooks.length > 0 && (
                                    <div className="table-col-headers" style={{ gridTemplateColumns: "2.4fr 1.6fr 1fr 1fr 1.4fr" }}>
                                        {["ENDPOINT", "EVENTS", "STATUS", "LAST DELIVERY", "ACTIONS"].map(c => (
                                            <span key={c} className="table-col-header">{c}</span>
                                        ))}
                                    </div>
                                )}

                                <div style={{ overflowY: "auto", maxHeight: 640 }}>
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
                                        const status = deriveStatus(w);
                                        const logOpen = expandedLog === w.id;
                                        return (
                                            <div key={w.id}>
                                                <div className="table-data-row" style={{ gridTemplateColumns: "2.4fr 1.6fr 1fr 1fr 1.4fr", borderLeft: `3px solid ${status.color}` }}>
                                                    <div className="table-cell-title">
                                                        <div className="table-cell-title-name">
                                                            <span className="table-cell-status-dot" style={{ background: status.color }} />
                                                            <code style={{ fontSize: 13, color: "var(--ink-1)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.url}</code>
                                                        </div>
                                                        <p className="table-cell-description">Secret: {mask(w.secret)}</p>
                                                        {w.deliveries.length > 0 && (
                                                            <button onClick={() => setExpandedLog(logOpen ? null : w.id)} style={{ fontSize: 11, color: "var(--c)", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0, marginTop: 3, marginLeft: 15 }}>
                                                                {logOpen ? "Hide log" : `Delivery log (${w.deliveries.length})`}
                                                            </button>
                                                        )}
                                                        {testResult?.id === w.id && (
                                                            <p style={{ fontSize: 11, fontWeight: 700, color: testResult.ok ? "var(--c)" : "var(--danger)", marginTop: 4, marginLeft: 15 }}>
                                                                {testResult.ok ? "✓ " : "✕ "}{testResult.msg}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                                        {w.events.map(e => (
                                                            <span key={e} style={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-2)", background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: 4, padding: "2px 6px", whiteSpace: "nowrap" }}>{e}</span>
                                                        ))}
                                                    </div>

                                                    <div>
                                                        <span className={`status-badge ${status.cls}`}>
                                                            <span className="status-badge-dot" />
                                                            {status.label}
                                                        </span>
                                                    </div>

                                                    <span className="table-date">{fmtLastDelivery(w.lastFiredAt)}</span>

                                                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                                        <button className="table-copy-btn" onClick={() => handleTest(w.id)} disabled={testingId === w.id}>
                                                            {testingId === w.id ? "Testing..." : "Test"}
                                                        </button>
                                                        <button className="table-copy-btn" onClick={() => handleToggleActive(w)}>{w.active ? "Disable" : "Enable"}</button>
                                                        <button className="table-cancel-btn" onClick={() => handleDelete(w.id)}>Delete</button>
                                                    </div>
                                                </div>

                                                {/* Delivery log — nested, dimmer, no full-height border, small inline state per attempt */}
                                                {logOpen && (
                                                    <div style={{ background: "var(--bg-2)", borderBottom: "1px solid var(--stroke)" }}>
                                                        <div className="feed-list">
                                                            {w.deliveries.map(d => {
                                                                const dl = deliveryLabel(d);
                                                                return (
                                                                    <div key={d.id} className="feed-row" style={{ padding: "7px 20px" }}>
                                                                        <span className="feed-dot" style={{ background: dl.color }} />
                                                                        <div className="feed-info">
                                                                            <div className="feed-title">{d.event}</div>
                                                                            <div className="feed-time">
                                                                                {new Date(d.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                                                                {d.success && d.statusCode && ` · HTTP ${d.statusCode}`}
                                                                                {!d.success && d.errorMessage && ` · ${d.errorMessage}`}
                                                                            </div>
                                                                        </div>
                                                                        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "IBM Plex Mono, monospace", color: dl.color, flexShrink: 0 }}>{dl.text}</span>
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
