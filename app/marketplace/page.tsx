"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";

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
        <div className="app">
            <NavBar />
            <div className="page-wrap">

                <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <h1 className="page-title">Marketplace</h1>
                        <p className="page-subtitle">Discover x402-gated APIs and pay automatically in USDC on Arc Network</p>
                    </div>
                    <Link href="/marketplace/submit" className="btn-primary" style={{ width: "auto", padding: "11px 22px", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                        + List Your API
                    </Link>
                </div>

                <div className="marketplace-toolbar">
                    <div className="marketplace-search">
                        <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                            <circle cx="6.5" cy="6.5" r="4.5" stroke="var(--ink-3)" strokeWidth="1.3" />
                            <path d="M10 10l3 3" stroke="var(--ink-3)" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                        <input
                            className="input"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search APIs..."
                        />
                    </div>

                    <div className="marketplace-tabs">
                        {CATEGORIES.map(c => (
                            <button
                                key={c}
                                onClick={() => setCategory(c)}
                                className={`pill${category === c ? " on" : ""}`}
                                style={{ textTransform: "capitalize" }}
                            >
                                {c === "all" ? "All APIs" : c}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="loading-center" style={{ height: "40vh" }}>
                        <div className="page-spinner" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="empty">
                        <div className="empty-icon">
                            <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M3 6h18l-1.5 12h-15L3 6z" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinejoin="round" /><path d="M8 6V4.5a4 4 0 018 0V6" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round" /></svg>
                        </div>
                        <p className="empty-title">No APIs found</p>
                        <p className="empty-sub">Try a different search or category</p>
                        <Link href="/marketplace/submit" style={{ fontSize: 13, color: "var(--c)", textDecoration: "none", fontWeight: 700, display: "inline-block", marginTop: 14 }}>Be the first to list one →</Link>
                    </div>
                ) : (
                    <>
                        {featured.length > 0 && (
                            <div className="marketplace-section">
                                <p className="marketplace-section-label">Featured</p>
                                <div className="marketplace-grid">
                                    {featured.map(l => <ListingCard key={l.id} listing={l} featured />)}
                                </div>
                            </div>
                        )}

                        {regular.length > 0 && (
                            <div className="marketplace-section">
                                {featured.length > 0 && <p className="marketplace-section-label">All APIs</p>}
                                <div className="marketplace-grid">
                                    {regular.map(l => <ListingCard key={l.id} listing={l} />)}
                                </div>
                            </div>
                        )}
                    </>
                )}

                <div className="marketplace-cta">
                    <p className="marketplace-cta-title">Building on Arc?</p>
                    <p className="marketplace-cta-sub">List your API and start earning USDC per request from AI agents and developers.</p>
                    <div className="marketplace-cta-actions">
                        <Link href="/marketplace/submit" className="btn-primary" style={{ width: "auto", padding: "10px 20px", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>List Your API</Link>
                        <Link href="/developers" className="btn-ghost" style={{ width: "auto", padding: "10px 20px", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>View Docs →</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ListingCard({ listing, featured }: { listing: Listing; featured?: boolean }) {
    const color = CATEGORY_COLORS[listing.category] ?? "#888";

    return (
        <Link href={`/marketplace/${listing.id}`} className="card card-interactive listing-card">
            {featured && <div className="listing-card-bar" />}
            <div className="listing-card-body">
                <div className="listing-card-top">
                    <div className="listing-card-chips">
                        <span className="listing-chip" style={{ color, background: `${color}15`, borderColor: `${color}30` }}>{listing.category}</span>
                        {featured && <span className="listing-chip listing-chip-featured">Featured</span>}
                    </div>
                    <div className="listing-card-price">
                        <p className="listing-price-value">{listing.price}</p>
                        <p className="listing-price-unit">USDC / req</p>
                    </div>
                </div>

                <h3 className="listing-card-title">{listing.name}</h3>
                <p className="listing-card-desc">{listing.description}</p>
                <div className="listing-card-endpoint">{listing.endpoint}</div>

                <div className="listing-card-foot">
                    <span className="listing-card-creator">
                        {listing.creatorUsername ? `@${listing.creatorUsername}` : `${listing.creatorAddress.slice(0, 6)}...${listing.creatorAddress.slice(-4)}`}
                    </span>
                    <span className="listing-card-cta">Try it →</span>
                </div>
            </div>
        </Link>
    );
}
