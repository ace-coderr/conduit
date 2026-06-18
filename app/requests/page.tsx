"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { NavBar } from "@/components/NavBar";
import { formatUSDC, shortenAddress, isValidAddress } from "@/lib/utils";

interface PaymentRequest {
    id: string;
    requesterAddress: string;
    recipientAddress: string;
    amount: string;
    title: string;
    note?: string;
    status: string;
    expiresAt?: string;
    txHash?: string;
    paidAt?: string;
    createdAt: string;
}

type Tab = "received" | "sent";

const BASE = typeof window !== "undefined" ? window.location.origin : "https://conduitpay.xyz";

const statusColor = (s: string) =>
({ PAID: "#00E5A0", PENDING: "#f5a623", CANCELLED: "#666", EXPIRED: "#f03e5f" }[s] ?? "#666");
const statusClass = (s: string) =>
({ PAID: "status-green", PENDING: "status-yellow", CANCELLED: "status-grey", EXPIRED: "status-red" }[s] ?? "status-red");

function RequestRow({
    request,
    perspective,
    onCancel,
    onCopyLink,
    copiedId,
}: {
    request: PaymentRequest;
    perspective: "sent" | "received";
    onCancel: (id: string) => void;
    onCopyLink: (id: string) => void;
    copiedId: string | null;
}) {
    const counterparty = perspective === "sent" ? request.recipientAddress : request.requesterAddress;

    return (
        <div className="table-row">
            <div className="table-cell-title">
                <div className="table-cell-title-name">
                    <span className="table-cell-status-dot" style={{ background: statusColor(request.status) }} />
                    <span className="table-cell-title-text">{request.title}</span>
                </div>
                {request.note && <p className="table-cell-description">{request.note}</p>}
                <p style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 3, fontFamily: "IBM Plex Mono, monospace" }}>
                    {perspective === "sent" ? "→ " : "← "}{shortenAddress(counterparty)}
                </p>
            </div>

            <div>
                <span className={`status-badge ${statusClass(request.status)}`}>
                    <span className="status-badge-dot" />
                    {request.status}
                </span>
                {request.paidAt && (
                    <p style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 3, fontFamily: "IBM Plex Mono, monospace" }}>
                        {new Date(request.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                )}
            </div>

            <div>
                <span className="table-amount">{formatUSDC(request.amount)}<span className="table-amount-unit">USDC</span></span>
            </div>

            <span className="table-date">
                {new Date(request.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>

            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {request.status === "PENDING" && (
                    <button
                        className={`table-copy-btn${copiedId === request.id ? " copied" : ""}`}
                        onClick={() => onCopyLink(request.id)}
                    >
                        {copiedId === request.id ? "Copied!" : "Copy Link"}
                    </button>
                )}
                {request.status === "PAID" && request.txHash && (
                    <a
                        href={`https://testnet.arcscan.app/tx/${request.txHash}`}
                        target="_blank" rel="noopener noreferrer"
                        className="table-copy-btn"
                        style={{ textDecoration: "none" }}
                    >
                        View TX ↗
                    </a>
                )}
                {perspective === "sent" && request.status === "PENDING" && (
                    <button className="table-cancel-btn" onClick={() => onCancel(request.id)}>
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
}

export default function RequestsPage() {
    const { address } = useAccount();
    const { authenticated, login } = usePrivy();
    const [mounted, setMounted] = useState(false);
    const [tab, setTab] = useState<Tab>("received");
    const [sent, setSent] = useState<PaymentRequest[]>([]);
    const [received, setReceived] = useState<PaymentRequest[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [formRecipient, setFormRecipient] = useState("");
    const [formAmount, setFormAmount] = useState("");
    const [formTitle, setFormTitle] = useState("");
    const [formNote, setFormNote] = useState("");
    const [formExpiry, setFormExpiry] = useState("");
    const [formEmail, setFormEmail] = useState("");
    const [formError, setFormError] = useState("");
    const [formLoading, setFormLoading] = useState(false);
    const [justCreated, setJustCreated] = useState<PaymentRequest | null>(null);

    useEffect(() => { setMounted(true); }, []);

    const fetchRequests = useCallback(async () => {
        if (!address) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/requests?address=${address}`);
            const data = await res.json();
            setSent(data.sent ?? []);
            setReceived(data.received ?? []);
        } catch { } finally { setIsLoading(false); }
    }, [address]);

    useEffect(() => {
        if (authenticated && address) fetchRequests();
    }, [authenticated, address, fetchRequests]);

    const handleCopyLink = (id: string) => {
        navigator.clipboard.writeText(`${BASE}/pay/req/${id}`);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleCancel = async (id: string) => {
        if (!confirm("Cancel this request?")) return;
        await fetch(`/api/requests/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "cancel", callerAddress: address }),
        });
        fetchRequests();
    };

    const handleCreate = async () => {
        setFormError("");
        if (!address) return;
        if (!isValidAddress(formRecipient)) { setFormError("Enter a valid wallet address."); return; }
        const parsed = parseFloat(formAmount);
        if (isNaN(parsed) || parsed <= 0) { setFormError("Enter a valid amount."); return; }
        if (!formTitle.trim()) { setFormError("Title is required."); return; }

        setFormLoading(true);
        try {
            const res = await fetch("/api/requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    requesterAddress: address,
                    recipientAddress: formRecipient.trim(),
                    amount: parsed.toString(),
                    title: formTitle.trim(),
                    note: formNote.trim() || undefined,
                    expiresAt: formExpiry ? new Date(formExpiry).toISOString() : undefined,
                    recipientEmail: formEmail.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) { setFormError(data.error || "Failed to create request."); return; }
            setJustCreated(data.request);
            setShowForm(false);
            setFormRecipient(""); setFormAmount(""); setFormTitle("");
            setFormNote(""); setFormExpiry(""); setFormEmail("");
            fetchRequests();
            setTab("sent");
        } catch { setFormError("Network error."); }
        finally { setFormLoading(false); }
    };

    const minDateTime = new Date(Date.now() + 60_000).toISOString().slice(0, 16);
    const displayed = tab === "sent" ? sent : received;
    const pendingReceived = received.filter(r => r.status === "PENDING").length;

    if (!mounted) return <div className="app"><NavBar /></div>;

    return (
        <div className="app">
            <NavBar />
            <div className="app-body">
                {!authenticated ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 340, gap: 12 }}>
                        <p style={{ fontSize: 16, fontWeight: 800, color: "var(--ink-1)" }}>Connect your wallet</p>
                        <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 8 }}>Sign in to send and manage payment requests.</p>
                        <button className="btn-primary" style={{ width: "auto", padding: "12px 28px" }} onClick={login}>Connect Wallet</button>
                    </div>
                ) : (
                    <div style={{ maxWidth: 860, margin: "0 auto" }}>

                        {/* Header */}
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 12 }}>
                            <div>
                                <h1 style={{ fontSize: 22, fontWeight: 900, color: "var(--ink-1)", letterSpacing: "-.03em", marginBottom: 4 }}>
                                    Payment Requests
                                </h1>
                                <p style={{ fontSize: 13, color: "var(--ink-3)" }}>
                                    Request USDC from any wallet — they pay in one click.
                                </p>
                            </div>
                            <button
                                onClick={() => { setShowForm(!showForm); setJustCreated(null); }}
                                style={{
                                    display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
                                    padding: "10px 18px", background: "var(--c)", border: "none",
                                    borderRadius: "var(--r-md)", color: "#000", fontSize: 13, fontWeight: 700,
                                    cursor: "pointer", fontFamily: "Sora, sans-serif",
                                    boxShadow: "0 4px 16px rgba(0,229,160,.3)",
                                }}
                            >
                                {showForm ? (
                                    "✕ Cancel"
                                ) : (
                                    <>
                                        <svg viewBox="0 0 14 14" fill="none" width="11" height="11">
                                            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                        New Request
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Just-created success banner */}
                        {justCreated && (
                            <div style={{
                                background: "rgba(0,229,160,.06)", border: "1px solid rgba(0,229,160,.2)",
                                borderRadius: 12, padding: "14px 18px", marginBottom: 20,
                                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
                            }}>
                                <div>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--c)", marginBottom: 3 }}>
                                        ✓ Request created — {justCreated.title}
                                    </p>
                                    <p style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>
                                        {`${BASE}/pay/req/${justCreated.id}`}
                                    </p>
                                </div>
                                <button
                                    className={`table-copy-btn${copiedId === justCreated.id ? " copied" : ""}`}
                                    onClick={() => handleCopyLink(justCreated.id)}
                                    style={{ flexShrink: 0 }}
                                >
                                    {copiedId === justCreated.id ? "Copied!" : "Copy Pay Link"}
                                </button>
                            </div>
                        )}

                        {/* Create form */}
                        {showForm && (
                            <div className="form-card" style={{ marginBottom: 24 }}>
                                <div className="form-card-header">
                                    <div className="form-card-header-icon">
                                        <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
                                            <rect x="1" y="3" width="14" height="10" rx="2" stroke="var(--c)" strokeWidth="1.4" />
                                            <path d="M1 7h14M5 10h3" stroke="var(--c)" strokeWidth="1.4" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                    <div>
                                        <div className="form-card-title">New Payment Request</div>
                                        <div className="form-card-subtitle">Send a pay-me link to any wallet address</div>
                                    </div>
                                </div>

                                <div className="form-card-body">
                                    <div className="form-group">
                                        <label className="form-label">Recipient wallet address *</label>
                                        <input
                                            className="input"
                                            placeholder="0x..."
                                            value={formRecipient}
                                            onChange={e => setFormRecipient(e.target.value)}
                                        />
                                    </div>

                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Amount (USDC) *</label>
                                            <div className="input-wrap">
                                                <input
                                                    className="input mono"
                                                    type="number" min="0.01" step="0.01"
                                                    placeholder="0.00"
                                                    value={formAmount}
                                                    onChange={e => setFormAmount(e.target.value)}
                                                    style={{ paddingRight: 52 }}
                                                />
                                                <span className="input-suffix">USDC</span>
                                            </div>
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Title *</label>
                                            <input
                                                className="input"
                                                placeholder="Invoice #42, Freelance work…"
                                                value={formTitle}
                                                onChange={e => setFormTitle(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ marginTop: 12 }}>
                                        <label className="form-label">
                                            Note <span className="form-label-opt">(optional)</span>
                                        </label>
                                        <input
                                            className="input"
                                            placeholder="For services rendered in June…"
                                            value={formNote}
                                            onChange={e => setFormNote(e.target.value)}
                                        />
                                    </div>

                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">
                                                Notify via email <span className="form-label-opt">(optional)</span>
                                            </label>
                                            <input
                                                className="input"
                                                type="email"
                                                placeholder="recipient@email.com"
                                                value={formEmail}
                                                onChange={e => setFormEmail(e.target.value)}
                                            />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">
                                                Expires at <span className="form-label-opt">(optional)</span>
                                            </label>
                                            <input
                                                className="input"
                                                type="datetime-local"
                                                min={minDateTime}
                                                value={formExpiry}
                                                onChange={e => setFormExpiry(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {formError && (
                                        <div className="form-error" style={{ marginTop: 16 }}>{formError}</div>
                                    )}

                                    <button
                                        className="form-submit-btn"
                                        style={{ marginTop: 20 }}
                                        onClick={handleCreate}
                                        disabled={formLoading}
                                    >
                                        {formLoading ? (
                                            <span className="form-submit-spinner">
                                                <div className="page-spinner" style={{ width: 14, height: 14 }} />
                                                Creating…
                                            </span>
                                        ) : "Send Request"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Table */}
                        <div className="table-card">
                            <div className="table-header">
                                <div className="table-header-left" style={{ gap: 4 }}>
                                    {(["received", "sent"] as Tab[]).map(t => (
                                        <button
                                            key={t}
                                            className={`filter-pill${tab === t ? " active" : ""}`}
                                            onClick={() => setTab(t)}
                                        >
                                            {t === "received" ? "Received" : "Sent"}
                                            {t === "received" && pendingReceived > 0 && (
                                                <span style={{
                                                    marginLeft: 5, background: "var(--c)", color: "#000",
                                                    borderRadius: 8, padding: "1px 6px", fontSize: 9, fontWeight: 800,
                                                }}>
                                                    {pendingReceived}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                    <span className="table-count-badge" style={{ marginLeft: 4 }}>{displayed.length}</span>
                                </div>
                                <div className="table-header-right">
                                    <button className="table-refresh-btn" onClick={fetchRequests} title="Refresh">↻</button>
                                </div>
                            </div>

                            {displayed.length > 0 && (
                                <div className="table-col-headers">
                                    {["TITLE", "STATUS", "AMOUNT", "DATE", "ACTIONS"].map(c => (
                                        <span key={c} className="table-col-header">{c}</span>
                                    ))}
                                </div>
                            )}

                            <div style={{ overflowY: "auto", maxHeight: 480 }}>
                                {isLoading && (
                                    <div className="loading-center" style={{ height: 140 }}>
                                        <div className="page-spinner" />
                                    </div>
                                )}

                                {!isLoading && displayed.length === 0 && (
                                    <div className="table-empty">
                                        <div className="table-empty-icon">
                                            <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
                                                <rect x="2" y="5" width="20" height="15" rx="2" stroke="var(--ink-3)" strokeWidth="1.5" />
                                                <path d="M2 9h20" stroke="var(--ink-3)" strokeWidth="1.5" />
                                            </svg>
                                        </div>
                                        <p className="table-empty-title">
                                            {tab === "received" ? "No requests received yet" : "No requests sent yet"}
                                        </p>
                                        <p className="table-empty-sub">
                                            {tab === "received"
                                                ? "When someone requests payment from you, it will appear here."
                                                : "Click \"New Request\" above to send your first one."}
                                        </p>
                                    </div>
                                )}

                                {!isLoading && displayed.map(r => (
                                    <RequestRow
                                        key={r.id}
                                        request={r}
                                        perspective={tab === "sent" ? "sent" : "received"}
                                        onCancel={handleCancel}
                                        onCopyLink={handleCopyLink}
                                        copiedId={copiedId}
                                    />
                                ))}
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}