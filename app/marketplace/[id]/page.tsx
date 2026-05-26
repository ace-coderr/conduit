"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

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

export default function ListingPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const [listing, setListing] = useState<Listing | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [tryResult, setTryResult] = useState<string | null>(null);
    const [trying, setTrying] = useState(false);

    useEffect(() => {
        fetch(`/api/marketplace?status=APPROVED`)
            .then(r => r.json())
            .then(d => {
                const found = d.listings?.find((l: Listing) => l.id === id);
                if (found) setListing(found);
                else setNotFound(true);
            })
            .finally(() => setLoading(false));
    }, [id]);

    const handleTry = async () => {
        if (!listing) return;
        setTrying(true);
        setTryResult(null);
        try {
            const res = await fetch(listing.endpoint);
            if (res.status === 402) {
                // Redirect to human pay page
                window.open(listing.endpoint, "_blank");
                setTryResult("Opened pay page in new tab — connect MetaMask to pay and access.");
            } else if (res.ok) {
                const text = await res.text();
                try {
                    const json = JSON.parse(text);
                    setTryResult(JSON.stringify(json, null, 2));
                } catch {
                    setTryResult(text.slice(0, 500));
                }
            } else {
                setTryResult(`HTTP ${res.status}: ${res.statusText}`);
            }
        } catch (err: any) {
            setTryResult(`Error: ${err.message}`);
        } finally {
            setTrying(false);
        }
    };

    if (loading) return (
        <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="page-spinner" />
        </div>
    );

    if (notFound) return (
        <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "Sora, sans-serif" }}>
            <p style={{ fontSize: 16, color: "var(--ink-3)", marginBottom: 16 }}>Listing not found</p>
            <Link href="/marketplace" style={{ color: "var(--c)", textDecoration: "none", fontSize: 13 }}>← Back to Marketplace</Link>
        </div>
    );

    if (!listing) return null;

    const color = CATEGORY_COLORS[listing.category] ?? "#888";

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "Sora, sans-serif" }}>

            {/* Top bar */}
            <div style={{ height: 52, background: "var(--surface)", borderBottom: "1px solid var(--stroke)", display: "flex", alignItems: "center", padding: "0 32px", gap: 16 }}>
                <Link href="/marketplace" style={{ fontSize: 12, color: "var(--ink-3)", textDecoration: "none", fontWeight: 600 }}>← Marketplace</Link>
                <div style={{ width: 1, height: 16, background: "var(--stroke)" }} />
                <span style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 700 }}>{listing.name}</span>
            </div>

            <div style={{ maxWidth: 860, margin: "0 auto", padding: "36px 40px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24, alignItems: "start" }}>

                    {/* Left — main info */}
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                            <span style={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color, background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 20, padding: "2px 8px", textTransform: "uppercase" }}>{listing.category}</span>
                            {listing.featured && <span style={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color: "var(--c)", background: "var(--c-dim)", border: "1px solid var(--c-border)", borderRadius: 20, padding: "2px 8px" }}>FEATURED</span>}
                        </div>

                        <h1 style={{ fontSize: 28, fontWeight: 900, color: "var(--ink-1)", letterSpacing: "-.04em", marginBottom: 10 }}>{listing.name}</h1>
                        <p style={{ fontSize: 14, color: "var(--ink-3)", lineHeight: 1.7, marginBottom: 24 }}>{listing.description}</p>

                        {/* Endpoint */}
                        <div style={{ marginBottom: 20 }}>
                            <p style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, marginBottom: 6 }}>ENDPOINT</p>
                            <div style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: "var(--r-md)", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                                <code style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", color: "var(--c)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{listing.endpoint}</code>
                                <button onClick={() => navigator.clipboard.writeText(listing.endpoint)} style={{ background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: "var(--r-sm)", padding: "4px 10px", fontSize: 11, color: "var(--ink-3)", cursor: "pointer", fontFamily: "Sora, sans-serif", flexShrink: 0 }}>Copy</button>
                            </div>
                        </div>

                        {/* Integration code */}
                        <div style={{ marginBottom: 24 }}>
                            <p style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, marginBottom: 8 }}>INTEGRATE WITH @ace_won/x402</p>
                            <div style={{ background: "#0d0d0d", border: "1px solid #222", borderRadius: "var(--r-md)", padding: "16px 20px", fontFamily: "IBM Plex Mono, monospace", fontSize: 12, lineHeight: 1.8 }}>
                                <p style={{ color: "#666" }}># Install</p>
                                <p style={{ color: "#00E5A0" }}>npm install @ace_won/x402</p>
                                <br />
                                <p style={{ color: "#666" }}># Pay and access</p>
                                <p style={{ color: "#a78bfa" }}>import {"{"} withPayment {"}"} from '@ace_won/x402';</p>
                                <br />
                                <p style={{ color: "#5b8ff9" }}>const response = await fetch(</p>
                                <p style={{ color: "#888", paddingLeft: 16 }}>'{listing.endpoint}',</p>
                                <p style={{ color: "#888", paddingLeft: 16 }}>{`{ headers: { 'PAYMENT-SIGNATURE': paymentSig } }`}</p>
                                <p style={{ color: "#5b8ff9" }}>);</p>
                            </div>
                        </div>

                        {/* Try it result */}
                        {tryResult && (
                            <div style={{ background: "#0d0d0d", border: "1px solid #1a2a1a", borderRadius: "var(--r-md)", padding: 16, fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: "#00E5A0", lineHeight: 1.8, whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 300, overflowY: "auto" }}>
                                {tryResult}
                            </div>
                        )}
                    </div>

                    {/* Right — pay card */}
                    <div style={{ position: "sticky", top: 20 }}>
                        <div style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: "var(--r-xl)", padding: 24, position: "relative", overflow: "hidden" }}>
                            <div style={{ height: 2, background: "var(--c)", position: "absolute", top: 0, left: 0, right: 0 }} />

                            <div style={{ marginBottom: 20 }}>
                                <p style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace", marginBottom: 4 }}>PRICE PER REQUEST</p>
                                <p style={{ fontSize: 28, fontWeight: 900, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace" }}>{listing.price} <span style={{ fontSize: 14, color: "#5b8ff9" }}>USDC</span></p>
                            </div>

                            <button
                                onClick={handleTry}
                                disabled={trying}
                                style={{ width: "100%", padding: 13, background: "var(--c)", border: "none", borderRadius: "var(--r-md)", color: "#000", fontSize: 14, fontWeight: 800, cursor: trying ? "not-allowed" : "pointer", fontFamily: "Sora, sans-serif", opacity: trying ? .6 : 1, marginBottom: 10 }}
                            >
                                {trying ? "Connecting..." : "Try It Now →"}
                            </button>

                            {listing.docsUrl && (
                                <a href={listing.docsUrl} target="_blank" rel="noopener noreferrer" style={{ display: "block", width: "100%", padding: 10, background: "transparent", border: "1px solid var(--stroke)", borderRadius: "var(--r-md)", color: "var(--ink-2)", fontSize: 13, fontWeight: 600, textAlign: "center", textDecoration: "none", marginBottom: 20 }}>
                                    View Docs ↗
                                </a>
                            )}

                            <div style={{ borderTop: "1px solid var(--stroke)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                                {[
                                    { label: "Network", value: "Arc Testnet" },
                                    { label: "Token", value: "USDC" },
                                    { label: "Protocol", value: "x402" },
                                    { label: "Creator", value: listing.creatorUsername ? `@${listing.creatorUsername}` : `${listing.creatorAddress.slice(0, 6)}...${listing.creatorAddress.slice(-4)}` },
                                ].map(r => (
                                    <div key={r.label} style={{ display: "flex", justifyContent: "space-between" }}>
                                        <span style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600 }}>{r.label}</span>
                                        <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-2)", fontWeight: 700 }}>{r.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginTop: 12, background: "var(--c-dim)", border: "1px solid var(--c-border)", borderRadius: "var(--r-lg)", padding: "12px 16px" }}>
                            <p style={{ fontSize: 11, color: "var(--c)", fontWeight: 700, marginBottom: 4 }}>Powered by Conduit x402</p>
                            <p style={{ fontSize: 11, color: "var(--ink-3)", lineHeight: 1.5 }}>Payments verified and settled on Arc Network in under a second.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}