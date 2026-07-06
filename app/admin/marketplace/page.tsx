"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";

const ADMIN_WALLET = "0x8557fabdc62f59a1ba7d6a74aaf0942cdcb68f69";

const CATEGORY_COLORS: Record<string, string> = {
    data: "#5b8ff9",
    ai: "#a78bfa",
    analytics: "#00E5A0",
    finance: "#f5a623",
    dev: "#f03e5f",
    other: "#888",
};

interface Listing {
    id: string; name: string; description: string; price: string;
    endpoint: string; category: string; creatorAddress: string;
    creatorUsername?: string; status: string; featured: boolean;
    docsUrl?: string; createdAt: string;
}

function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: JSX.Element }) {
    return (
        <div className="stat-card" style={{ padding: "16px 18px" }}>
            <div className="stat-card-line" style={{ background: color }} />
            <div className="stat-icon-wrap" style={{ width: 30, height: 30, marginBottom: 10 }}>{icon}</div>
            <div className="stat-value" style={{ fontSize: 24, color }}>{value}</div>
            <div className="stat-label">{label}</div>
        </div>
    );
}

const statusColor = (s: string) => ({ PENDING: "var(--warning)", APPROVED: "var(--c)", REJECTED: "var(--danger)" }[s] ?? "var(--ink-3)");

export default function AdminMarketplacePage() {
    const { address, isConnected } = useAccount();
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"PENDING" | "APPROVED" | "REJECTED" | "ALL">("PENDING");
    const [actioning, setActioning] = useState<string | null>(null);

    const isAdmin = address?.toLowerCase() === ADMIN_WALLET;

    const fetchListings = useCallback(async () => {
        if (!address) return;
        setLoading(true);
        const wallet = address.toLowerCase();
        const res = await fetch(`/api/marketplace?status=all&wallet=${wallet}`, {
            headers: { "x-wallet-address": wallet },
        });
        const data = await res.json();
        setListings(data.listings ?? []);
        setLoading(false);
    }, [address]);

    useEffect(() => {
        if (isConnected && isAdmin) fetchListings();
    }, [isConnected, isAdmin, fetchListings]);

    const updateListing = async (id: string, updates: { status?: string; featured?: boolean }) => {
        setActioning(id);
        const wallet = address?.toLowerCase() ?? "";
        await fetch(`/api/marketplace?wallet=${wallet}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "x-wallet-address": wallet,
            },
            body: JSON.stringify({ id, ...updates }),
        });
        await fetchListings();
        setActioning(null);
    };

    const deleteListing = async (id: string) => {
        if (!confirm("Delete this listing?")) return;
        setActioning(id);
        const wallet = address?.toLowerCase() ?? "";
        await fetch(`/api/marketplace?id=${id}&wallet=${wallet}`, {
            method: "DELETE",
            headers: { "x-wallet-address": wallet },
        });
        await fetchListings();
        setActioning(null);
    };

    const pending = listings.filter(l => l.status === "PENDING");
    const approved = listings.filter(l => l.status === "APPROVED");
    const rejected = listings.filter(l => l.status === "REJECTED");
    const filtered = tab === "ALL" ? listings : tab === "PENDING" ? pending : tab === "APPROVED" ? approved : rejected;
    const fmtDate = (d: string) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

    if (!isConnected || !isAdmin) return (
        <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Sora, sans-serif" }}>
            <p style={{ color: "var(--ink-3)" }}>Admin access required.</p>
        </div>
    );

    return (
        <div className="app">
            <NavBar />
            <div className="page-wrap" style={{ maxWidth: 1400 }}>
                <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                            <Link href="/admin" style={{ fontSize: 12, color: "var(--ink-3)", textDecoration: "none", fontWeight: 600 }}>← Admin</Link>
                            <h1 className="page-title" style={{ marginBottom: 0 }}>Marketplace Moderation</h1>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(240,62,95,.1)", border: "1px solid rgba(240,62,95,.2)", borderRadius: 20, padding: "3px 12px" }}>
                                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--danger)" }} />
                                <span style={{ fontSize: 10, color: "var(--danger)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, letterSpacing: ".08em" }}>ADMIN</span>
                            </div>
                            {pending.length > 0 && (
                                <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(245,166,35,.1)", border: "1px solid rgba(245,166,35,.3)", borderRadius: 20, padding: "3px 10px" }}>
                                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--warning)" }} />
                                    <span style={{ fontSize: 10, color: "var(--warning)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>{pending.length} PENDING</span>
                                </div>
                            )}
                        </div>
                        <p className="page-subtitle">Review and manage API listings submitted by all users</p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <Link href="/marketplace" target="_blank" style={{ fontSize: 12, color: "var(--c)", textDecoration: "none", padding: "6px 14px", border: "1px solid var(--c-border)", borderRadius: "var(--r-sm)", fontWeight: 600 }}>View Marketplace ↗</Link>
                        <button onClick={fetchListings} style={{ fontSize: 12, color: "var(--c)", background: "var(--c-dim)", border: "1px solid var(--c-border)", borderRadius: "var(--r-sm)", padding: "6px 14px", cursor: "pointer", fontWeight: 700, fontFamily: "Sora, sans-serif" }}>Refresh</button>
                    </div>
                </div>

                <div className="bento-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 28 }}>
                    <div className="bento-cell"><StatCard label="Total Listings" value={listings.length.toString()} color="var(--ink-1)" icon={<svg viewBox="0 0 20 20" fill="none" width="14" height="14"><path d="M3 6h14l-1.2 10h-11.6L3 6z" stroke="var(--ink-1)" strokeWidth="1.3" strokeLinejoin="round" /><path d="M7 6V4.5a3 3 0 016 0V6" stroke="var(--ink-1)" strokeWidth="1.3" strokeLinecap="round" /></svg>} /></div>
                    <div className="bento-cell"><StatCard label="Pending Review" value={pending.length.toString()} color="var(--warning)" icon={<svg viewBox="0 0 20 20" fill="none" width="14" height="14"><circle cx="10" cy="10" r="8" stroke="var(--warning)" strokeWidth="1.3" /><path d="M10 6v4l2.5 2.5" stroke="var(--warning)" strokeWidth="1.3" strokeLinecap="round" /></svg>} /></div>
                    <div className="bento-cell"><StatCard label="Approved (Live)" value={approved.length.toString()} color="var(--c)" icon={<svg viewBox="0 0 20 20" fill="none" width="14" height="14"><path d="M3 10l4.5 4.5L17 5" stroke="var(--c)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>} /></div>
                    <div className="bento-cell"><StatCard label="Rejected" value={rejected.length.toString()} color="var(--danger)" icon={<svg viewBox="0 0 20 20" fill="none" width="14" height="14"><path d="M6 6l8 8M14 6l-8 8" stroke="var(--danger)" strokeWidth="1.5" strokeLinecap="round" /></svg>} /></div>
                </div>

                <div className="card">
                    <div className="card-head" style={{ justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div className="card-head-icon"><svg viewBox="0 0 20 20" fill="none" width="16" height="16"><path d="M3 6h14l-1.2 10h-11.6L3 6z" stroke="var(--c)" strokeWidth="1.3" strokeLinejoin="round" /><path d="M7 6V4.5a3 3 0 016 0V6" stroke="var(--c)" strokeWidth="1.3" strokeLinecap="round" /></svg></div>
                            <div><div className="card-title">Listings</div><div className="card-subtitle">{listings.length} total · {pending.length} awaiting review</div></div>
                        </div>
                        <div style={{ display: "flex", gap: 4, background: "var(--bg)", borderRadius: "var(--r-sm)", padding: 3 }}>
                            {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map(t => (
                                <button key={t} onClick={() => setTab(t)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: tab === t ? "var(--surface)" : "transparent", color: tab === t ? (t === "PENDING" ? "var(--warning)" : t === "APPROVED" ? "var(--c)" : t === "REJECTED" ? "var(--danger)" : "var(--ink-1)") : "var(--ink-3)", fontSize: 11, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, cursor: "pointer", transition: "all .15s" }}>
                                    {t}
                                    {t === "PENDING" && pending.length > 0 && <span style={{ marginLeft: 4, background: "var(--warning)", color: "#000", borderRadius: "50%", width: 14, height: 14, fontSize: 8, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{pending.length}</span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "2.4fr 1.1fr 0.8fr 1.4fr 0.9fr 0.9fr 1.6fr", gap: 12, padding: "11px 20px", background: "var(--raised)", borderBottom: "1px solid var(--stroke)" }}>
                        {["LISTING", "SUBMITTER", "PRICE", "ENDPOINT", "STATUS", "DATE", "ACTIONS"].map(c => <span key={c} style={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-3)", letterSpacing: ".12em", fontWeight: 600 }}>{c}</span>)}
                    </div>

                    <div style={{ maxHeight: 640, overflowY: "auto", padding: "4px 0" }}>
                        {loading ? (
                            <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="page-spinner" /></div>
                        ) : filtered.length === 0 ? (
                            <div style={{ padding: 40, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>No {tab === "ALL" ? "" : tab.toLowerCase() + " "}listings</div>
                        ) : filtered.map((l, i) => {
                            const color = CATEGORY_COLORS[l.category] ?? "#888";
                            return (
                                <div key={l.id} style={{ display: "grid", gridTemplateColumns: "2.4fr 1.1fr 0.8fr 1.4fr 0.9fr 0.9fr 1.6fr", gap: 12, padding: "16px 20px", alignItems: "center", borderBottom: i < filtered.length - 1 ? "1px solid var(--stroke)" : "none", transition: "background .12s" }}
                                    onMouseEnter={ev => (ev.currentTarget.style.background = "var(--raised)")}
                                    onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}
                                >
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                            <span className="listing-chip" style={{ color, background: `${color}15`, borderColor: `${color}30` }}>{l.category}</span>
                                            {l.featured && <span className="listing-chip listing-chip-featured">Featured</span>}
                                        </div>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</p>
                                        <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.description}</p>
                                    </div>
                                    <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-2)" }}>{l.creatorUsername ? `@${l.creatorUsername}` : `${l.creatorAddress.slice(0, 6)}...${l.creatorAddress.slice(-4)}`}</span>
                                    <div>
                                        <p style={{ fontSize: 14, fontWeight: 800, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", letterSpacing: "-.02em" }}>{l.price}</p>
                                        <p style={{ fontSize: 9, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>USDC/req</p>
                                    </div>
                                    <a href={l.endpoint} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: "var(--info)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.endpoint} ↗</a>
                                    <div><span style={{ fontSize: 11, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color: statusColor(l.status), background: `${statusColor(l.status)}15`, border: `1px solid ${statusColor(l.status)}30`, borderRadius: 20, padding: "2px 8px" }}>{l.status}</span></div>
                                    <span style={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-3)" }}>{fmtDate(l.createdAt)}</span>
                                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                        {l.status === "PENDING" && (
                                            <>
                                                <button onClick={() => updateListing(l.id, { status: "APPROVED" })} disabled={actioning === l.id} style={{ padding: "6px 12px", background: "var(--c)", border: "none", borderRadius: "var(--r-sm)", color: "#000", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Sora, sans-serif", opacity: actioning === l.id ? .5 : 1 }}>✓ Approve</button>
                                                <button onClick={() => updateListing(l.id, { status: "REJECTED" })} disabled={actioning === l.id} style={{ padding: "6px 12px", background: "transparent", border: "1px solid var(--danger)", borderRadius: "var(--r-sm)", color: "var(--danger)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Sora, sans-serif", opacity: actioning === l.id ? .5 : 1 }}>✕ Reject</button>
                                            </>
                                        )}
                                        {l.status === "APPROVED" && (
                                            <button onClick={() => updateListing(l.id, { featured: !l.featured })} disabled={actioning === l.id} style={{ padding: "6px 12px", background: l.featured ? "var(--c-dim)" : "var(--raised)", border: `1px solid ${l.featured ? "var(--c-border)" : "var(--stroke)"}`, borderRadius: "var(--r-sm)", color: l.featured ? "var(--c)" : "var(--ink-2)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Sora, sans-serif" }}>{l.featured ? "★ Unfeature" : "☆ Feature"}</button>
                                        )}
                                        {l.status === "REJECTED" && (
                                            <button onClick={() => updateListing(l.id, { status: "APPROVED" })} disabled={actioning === l.id} style={{ padding: "6px 12px", background: "var(--c-dim)", border: "1px solid var(--c-border)", borderRadius: "var(--r-sm)", color: "var(--c)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Sora, sans-serif" }}>Re-approve</button>
                                        )}
                                        <Link href={`/marketplace/${l.id}`} target="_blank" style={{ padding: "6px 12px", background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: "var(--r-sm)", color: "var(--ink-2)", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>View</Link>
                                        <button onClick={() => deleteListing(l.id)} disabled={actioning === l.id} style={{ padding: "6px 12px", background: "transparent", border: "1px solid var(--stroke)", borderRadius: "var(--r-sm)", color: "var(--ink-3)", fontSize: 11, cursor: "pointer", fontFamily: "Sora, sans-serif" }}>Delete</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
