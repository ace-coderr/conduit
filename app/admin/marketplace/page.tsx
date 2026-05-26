"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";

const ADMIN_WALLET = "0x8557fabdc62f59a1ba7d6a74aaf0942cdcb68f69";

interface Listing {
    id: string;
    name: string;
    description: string;
    price: string;
    endpoint: string;
    category: string;
    creatorAddress: string;
    creatorUsername?: string;
    status: string;
    featured: boolean;
    docsUrl?: string;
    createdAt: string;
}

export default function AdminMarketplacePage() {
    const { address, isConnected } = useAccount();
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
    const [actioning, setActioning] = useState<string | null>(null);

    const isAdmin = address?.toLowerCase() === ADMIN_WALLET;

    const fetchListings = useCallback(async () => {
        if (!address) return;
        setLoading(true);
        const res = await fetch(`/api/marketplace?status=all&wallet=${address}`);
        const data = await res.json();
        setListings(data.listings ?? []);
        setLoading(false);
    }, [address]);

    useEffect(() => {
        if (isConnected && isAdmin) fetchListings();
    }, [isConnected, isAdmin, fetchListings]);

    const updateListing = async (id: string, updates: { status?: string; featured?: boolean }) => {
        setActioning(id);
        await fetch(`/api/marketplace?wallet=${address}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, ...updates }),
        });
        await fetchListings();
        setActioning(null);
    };

    const deleteListing = async (id: string) => {
        if (!confirm("Delete this listing?")) return;
        setActioning(id);
        await fetch(`/api/marketplace?id=${id}&wallet=${address}`, { method: "DELETE" });
        await fetchListings();
        setActioning(null);
    };

    const filtered = listings.filter(l => l.status === tab);
    const pending = listings.filter(l => l.status === "PENDING").length;

    const fmtDate = (d: string) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

    if (!isConnected || !isAdmin) return (
        <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Sora, sans-serif" }}>
            <p style={{ color: "var(--ink-3)" }}>Admin access required.</p>
        </div>
    );

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "Sora, sans-serif" }}>

            {/* Top bar */}
            <div style={{ height: 56, background: "var(--surface)", borderBottom: "1px solid var(--stroke)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", position: "sticky", top: 0, zIndex: 100 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <Link href="/admin" style={{ fontSize: 12, color: "var(--ink-3)", textDecoration: "none", fontWeight: 600 }}>← Admin</Link>
                    <div style={{ width: 1, height: 20, background: "var(--stroke)" }} />
                    <span style={{ fontSize: 14, fontWeight: 800, color: "var(--ink-1)" }}>Marketplace</span>
                    {pending > 0 && (
                        <span style={{ fontSize: 9, background: "var(--warning)", color: "#000", borderRadius: 20, padding: "2px 8px", fontWeight: 700, fontFamily: "IBM Plex Mono, monospace" }}>{pending} PENDING</span>
                    )}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                    <Link href="/marketplace" target="_blank" style={{ fontSize: 12, color: "var(--c)", textDecoration: "none", padding: "6px 14px", border: "1px solid var(--c-border)", borderRadius: "var(--r-sm)", fontWeight: 600 }}>View Marketplace ↗</Link>
                    <button onClick={fetchListings} style={{ fontSize: 12, color: "var(--c)", background: "var(--c-dim)", border: "1px solid var(--c-border)", borderRadius: "var(--r-sm)", padding: "6px 14px", cursor: "pointer", fontWeight: 700, fontFamily: "Sora, sans-serif" }}>Refresh</button>
                </div>
            </div>

            <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 40px" }}>

                <div style={{ marginBottom: 24 }}>
                    <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--ink-1)", letterSpacing: "-.04em", marginBottom: 4 }}>Marketplace Listings</h1>
                    <p style={{ fontSize: 13, color: "var(--ink-3)" }}>Review and manage API listings submitted by developers</p>
                </div>

                {/* Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
                    {[
                        { label: "Pending Review", value: listings.filter(l => l.status === "PENDING").length, color: "var(--warning)" },
                        { label: "Approved", value: listings.filter(l => l.status === "APPROVED").length, color: "var(--c)" },
                        { label: "Rejected", value: listings.filter(l => l.status === "REJECTED").length, color: "var(--danger)" },
                    ].map(s => (
                        <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: "var(--r-lg)", padding: "16px 20px" }}>
                            <p style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: "IBM Plex Mono, monospace", marginBottom: 4 }}>{s.value}</p>
                            <p style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600 }}>{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div style={{ display: "flex", gap: 4, background: "var(--bg)", borderRadius: "var(--r-sm)", padding: 3, width: "fit-content", marginBottom: 20 }}>
                    {(["PENDING", "APPROVED", "REJECTED"] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)} style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: tab === t ? "var(--surface)" : "transparent", color: tab === t ? (t === "PENDING" ? "var(--warning)" : t === "APPROVED" ? "var(--c)" : "var(--danger)") : "var(--ink-3)", fontSize: 11, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, cursor: "pointer" }}>
                            {t}
                            {t === "PENDING" && pending > 0 && <span style={{ marginLeft: 6, background: "var(--warning)", color: "#000", borderRadius: "50%", width: 14, height: 14, fontSize: 8, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{pending}</span>}
                        </button>
                    ))}
                </div>

                {/* Listings */}
                {loading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="page-spinner" /></div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: "center", padding: 60, color: "var(--ink-3)", fontSize: 13 }}>No {tab.toLowerCase()} listings</div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {filtered.map(l => (
                            <div key={l.id} style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: "var(--r-xl)", padding: "20px 24px" }}>
                                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 12 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                            <span style={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color: "var(--ink-3)", background: "var(--raised)", borderRadius: 4, padding: "1px 6px", textTransform: "uppercase" }}>{l.category}</span>
                                            {l.featured && <span style={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color: "var(--c)", background: "var(--c-dim)", border: "1px solid var(--c-border)", borderRadius: 4, padding: "1px 6px" }}>FEATURED</span>}
                                        </div>
                                        <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--ink-1)", marginBottom: 4 }}>{l.name}</h3>
                                        <p style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5, marginBottom: 8 }}>{l.description}</p>
                                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                                            <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: "var(--c)", fontWeight: 700 }}>{l.price} USDC/req</span>
                                            <a href={l.endpoint} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: "var(--info)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>{l.endpoint} ↗</a>
                                            <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-3)" }}>{l.creatorUsername ? `@${l.creatorUsername}` : `${l.creatorAddress.slice(0, 8)}...${l.creatorAddress.slice(-4)}`}</span>
                                            <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-3)" }}>{fmtDate(l.createdAt)}</span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                                        {tab === "PENDING" && (
                                            <>
                                                <button onClick={() => updateListing(l.id, { status: "APPROVED" })} disabled={actioning === l.id}
                                                    style={{ padding: "7px 14px", background: "var(--c)", border: "none", borderRadius: "var(--r-sm)", color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Sora, sans-serif", opacity: actioning === l.id ? .5 : 1 }}>
                                                    ✓ Approve
                                                </button>
                                                <button onClick={() => updateListing(l.id, { status: "REJECTED" })} disabled={actioning === l.id}
                                                    style={{ padding: "7px 14px", background: "transparent", border: "1px solid var(--danger)", borderRadius: "var(--r-sm)", color: "var(--danger)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Sora, sans-serif", opacity: actioning === l.id ? .5 : 1 }}>
                                                    ✕ Reject
                                                </button>
                                            </>
                                        )}
                                        {tab === "APPROVED" && (
                                            <button onClick={() => updateListing(l.id, { featured: !l.featured })} disabled={actioning === l.id}
                                                style={{ padding: "7px 14px", background: l.featured ? "var(--c-dim)" : "var(--raised)", border: `1px solid ${l.featured ? "var(--c-border)" : "var(--stroke)"}`, borderRadius: "var(--r-sm)", color: l.featured ? "var(--c)" : "var(--ink-2)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Sora, sans-serif" }}>
                                                {l.featured ? "★ Unfeature" : "☆ Feature"}
                                            </button>
                                        )}
                                        {tab === "REJECTED" && (
                                            <button onClick={() => updateListing(l.id, { status: "APPROVED" })} disabled={actioning === l.id}
                                                style={{ padding: "7px 14px", background: "var(--c-dim)", border: "1px solid var(--c-border)", borderRadius: "var(--r-sm)", color: "var(--c)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Sora, sans-serif" }}>
                                                Re-approve
                                            </button>
                                        )}
                                        <button onClick={() => deleteListing(l.id)} disabled={actioning === l.id}
                                            style={{ padding: "7px 14px", background: "transparent", border: "1px solid var(--stroke)", borderRadius: "var(--r-sm)", color: "var(--ink-3)", fontSize: 11, cursor: "pointer", fontFamily: "Sora, sans-serif" }}>
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}