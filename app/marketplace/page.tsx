"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const CATEGORIES = ["all", "data", "ai", "analytics", "finance", "dev", "other"];

const CATEGORY_COLORS: Record<string, string> = {
    data: "#5b8ff9",
    ai: "#a78bfa",
    analytics: "#00E5A0",
    finance: "#f5a623",
    dev: "#f03e5f",
    other: "#888",
};

interface Listing {
    id: string;
    name: string;
    description: string;
    price: string;
    endpoint: string;
    category: string;
    creatorAddress: string;
    creatorUsername?: string;
    featured: boolean;
    docsUrl?: string;
    createdAt: string;
}

export default function MarketplacePage() {
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState("all");
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetch(`/api/marketplace?status=APPROVED&category=${category}`)
            .then(r => r.json())
            .then(d => setListings(d.listings ?? []))
            .finally(() => setLoading(false));
    }, [category]);

    const filtered = listings.filter(l =>
        search === "" ||
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        l.description.toLowerCase().includes(search.toLowerCase())
    );

    const featured = filtered.filter(l => l.featured);
    const regular = filtered.filter(l => !l.featured);

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "Sora, sans-serif" }}>

            {/* Header */}
            <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--stroke)", padding: "40px 40px 32px" }}>
                <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                        <div>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--c-dim)", border: "1px solid var(--c-border)", borderRadius: 20, padding: "3px 12px", marginBottom: 12 }}>
                                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--c)" }} />
                                <span style={{ fontSize: 10, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, letterSpacing: ".08em" }}>x402 MARKETPLACE</span>
                            </div>
                            <h1 style={{ fontSize: 32, fontWeight: 900, color: "var(--ink-1)", letterSpacing: "-.05em", marginBottom: 6 }}>API Marketplace</h1>
                            <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.6 }}>Discover and pay for APIs in USDC on Arc Network. AI agents pay automatically.</p>
                        </div>
                        <Link href="/marketplace/submit" style={{ padding: "11px 22px", background: "var(--c)", border: "none", borderRadius: "var(--r-md)", color: "#000", fontSize: 13, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                            + List Your API
                        </Link>
                    </div>

                    {/* Search */}
                    <div style={{ position: "relative", maxWidth: 480 }}>
                        <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} viewBox="0 0 16 16" fill="none" width="14" height="14">
                            <circle cx="6.5" cy="6.5" r="4.5" stroke="var(--ink-3)" strokeWidth="1.3" />
                            <path d="M10 10l3 3" stroke="var(--ink-3)" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search APIs..."
                            style={{ width: "100%", padding: "10px 14px 10px 36px", background: "var(--bg)", border: "1px solid var(--stroke)", borderRadius: "var(--r-md)", color: "var(--ink-1)", fontSize: 13, outline: "none", fontFamily: "Sora, sans-serif" }}
                        />
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 40px" }}>

                {/* Category tabs */}
                <div style={{ display: "flex", gap: 4, marginBottom: 28, overflowX: "auto", paddingBottom: 4 }}>
                    {CATEGORIES.map(c => (
                        <button key={c} onClick={() => setCategory(c)} style={{ padding: "6px 14px", background: category === c ? "var(--c)" : "var(--surface)", border: `1px solid ${category === c ? "var(--c)" : "var(--stroke)"}`, borderRadius: 20, color: category === c ? "#000" : "var(--ink-2)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Sora, sans-serif", whiteSpace: "nowrap", textTransform: "capitalize" }}>
                            {c === "all" ? "All APIs" : c}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
                        <div className="page-spinner" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "80px 0" }}>
                        <p style={{ fontSize: 16, color: "var(--ink-3)", marginBottom: 12 }}>No APIs found</p>
                        <Link href="/marketplace/submit" style={{ fontSize: 13, color: "var(--c)", textDecoration: "none" }}>Be the first to list one →</Link>
                    </div>
                ) : (
                    <>
                        {/* Featured */}
                        {featured.length > 0 && (
                            <div style={{ marginBottom: 32 }}>
                                <p style={{ fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-3)", letterSpacing: ".1em", fontWeight: 600, marginBottom: 14 }}>FEATURED</p>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
                                    {featured.map(l => <ListingCard key={l.id} listing={l} featured />)}
                                </div>
                            </div>
                        )}

                        {/* All listings */}
                        {regular.length > 0 && (
                            <div>
                                {featured.length > 0 && <p style={{ fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-3)", letterSpacing: ".1em", fontWeight: 600, marginBottom: 14 }}>ALL APIS</p>}
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
                                    {regular.map(l => <ListingCard key={l.id} listing={l} />)}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Bottom CTA */}
                <div style={{ marginTop: 56, background: "var(--c-dim)", border: "1px solid var(--c-border)", borderRadius: "var(--r-xl)", padding: 32, textAlign: "center" }}>
                    <p style={{ fontSize: 16, fontWeight: 800, color: "var(--ink-1)", marginBottom: 8 }}>Building on Arc?</p>
                    <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 20 }}>List your API and start earning USDC per request from AI agents and developers.</p>
                    <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                        <Link href="/marketplace/submit" style={{ padding: "10px 20px", background: "var(--c)", border: "none", borderRadius: "var(--r-md)", color: "#000", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>List Your API</Link>
                        <Link href="/developers" style={{ padding: "10px 20px", background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: "var(--r-md)", color: "var(--ink-2)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>View Docs →</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ListingCard({ listing, featured }: { listing: Listing; featured?: boolean }) {
    const color = CATEGORY_COLORS[listing.category] ?? "#888";

    return (
        <Link href={`/marketplace/${listing.id}`} style={{ textDecoration: "none" }}>
            <div style={{ background: "var(--surface)", border: `1px solid ${featured ? "var(--c-border)" : "var(--stroke)"}`, borderRadius: "var(--r-xl)", padding: "20px", position: "relative", overflow: "hidden", transition: "border-color .15s, box-shadow .15s", cursor: "pointer" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--c)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(0,229,160,.1)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = featured ? "var(--c-border)" : "var(--stroke)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
            >
                {featured && <div style={{ height: 2, background: "var(--c)", position: "absolute", top: 0, left: 0, right: 0 }} />}

                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color, background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 20, padding: "2px 8px", textTransform: "uppercase" }}>{listing.category}</span>
                            {featured && <span style={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color: "var(--c)", background: "var(--c-dim)", border: "1px solid var(--c-border)", borderRadius: 20, padding: "2px 8px" }}>FEATURED</span>}
                        </div>
                        <h3 style={{ fontSize: 15, fontWeight: 800, color: "var(--ink-1)", letterSpacing: "-.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{listing.name}</h3>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                        <p style={{ fontSize: 16, fontWeight: 800, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace" }}>{listing.price}</p>
                        <p style={{ fontSize: 9, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>USDC / req</p>
                    </div>
                </div>

                <p style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.6, marginBottom: 14, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{listing.description}</p>

                <div style={{ background: "var(--bg)", border: "1px solid var(--stroke)", borderRadius: "var(--r-sm)", padding: "6px 10px", marginBottom: 14 }}>
                    <p style={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{listing.endpoint}</p>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-3)" }}>
                        {listing.creatorUsername ? `@${listing.creatorUsername}` : `${listing.creatorAddress.slice(0, 6)}...${listing.creatorAddress.slice(-4)}`}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--c)", fontWeight: 700 }}>Try it →</span>
                </div>
            </div>
        </Link>
    );
}