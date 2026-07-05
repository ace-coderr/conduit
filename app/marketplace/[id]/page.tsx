"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";

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
    const [listing, setListing] = useState<Listing | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [tryResult, setTryResult] = useState<string | null>(null);
    const [trying, setTrying] = useState(false);
    const [copied, setCopied] = useState(false);

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

    const handleCopy = () => {
        if (!listing) return;
        navigator.clipboard.writeText(listing.endpoint);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) return (
        <div className="app">
            <NavBar />
            <div className="loading-center" style={{ height: "60vh" }}>
                <div className="page-spinner" />
            </div>
        </div>
    );

    if (notFound || !listing) return (
        <div className="app">
            <NavBar />
            <div className="page-wrap">
                <div className="empty" style={{ paddingTop: 80 }}>
                    <p className="empty-title">Listing not found</p>
                    <Link href="/marketplace" style={{ color: "var(--c)", textDecoration: "none", fontSize: 13, fontWeight: 700, display: "inline-block", marginTop: 10 }}>← Back to Marketplace</Link>
                </div>
            </div>
        </div>
    );

    const color = CATEGORY_COLORS[listing.category] ?? "#888";
    const creator = listing.creatorUsername ? `@${listing.creatorUsername}` : `${listing.creatorAddress.slice(0, 6)}...${listing.creatorAddress.slice(-4)}`;

    return (
        <div className="app">
            <NavBar />
            <div className="page-wrap">

                <Link href="/marketplace" className="listing-detail-back">← Back to Marketplace</Link>

                <div className="page-header">
                    <div className="listing-card-chips" style={{ marginBottom: 12 }}>
                        <span className="listing-chip" style={{ color, background: `${color}15`, borderColor: `${color}30` }}>{listing.category}</span>
                        {listing.featured && <span className="listing-chip listing-chip-featured">Featured</span>}
                    </div>
                    <h1 className="page-title">{listing.name}</h1>
                    <p className="listing-detail-creator">Listed by {creator}</p>
                </div>

                <div className="marketplace-detail-grid">

                    {/* Left — details */}
                    <div className="card">
                        <div className="card-body">
                            <div className="listing-detail-section">
                                <p className="form-label">Description</p>
                                <p className="listing-detail-body-text">{listing.description}</p>
                            </div>

                            <div className="listing-detail-section">
                                <p className="form-label">Endpoint</p>
                                <div className="listing-detail-endpoint-row">
                                    <code className="listing-detail-endpoint-code">{listing.endpoint}</code>
                                    <button onClick={handleCopy} className={`listing-detail-copy-btn${copied ? " copied" : ""}`}>
                                        {copied ? "Copied!" : "Copy"}
                                    </button>
                                </div>
                            </div>

                            <div className="listing-detail-section">
                                <p className="form-label">Integrate with @ace_won/x402</p>
                                <div className="listing-detail-code">
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

                            {tryResult && (
                                <div className="listing-detail-section">
                                    <p className="form-label">Response</p>
                                    <div className="listing-detail-result">{tryResult}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right — pay card */}
                    <div style={{ position: "sticky", top: 20 }}>
                        <div className="card">
                            <div className="listing-card-bar" />
                            <div className="card-body">
                                <p className="listing-pay-price-label">Price per request</p>
                                <p className="listing-pay-price-value">{listing.price} <span>USDC</span></p>

                                <button
                                    onClick={handleTry}
                                    disabled={trying}
                                    className="btn-primary"
                                    style={{ marginTop: 20 }}
                                >
                                    {trying ? "Connecting..." : "Try It Now →"}
                                </button>

                                {listing.docsUrl && (
                                    <a href={listing.docsUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 10 }}>
                                        View Docs ↗
                                    </a>
                                )}

                                <div className="listing-pay-meta">
                                    {[
                                        { label: "Network", value: "Arc Testnet" },
                                        { label: "Token", value: "USDC" },
                                        { label: "Protocol", value: "x402" },
                                        { label: "Creator", value: creator },
                                    ].map(r => (
                                        <div key={r.label} className="listing-pay-meta-row">
                                            <span className="listing-pay-meta-k">{r.label}</span>
                                            <span className="listing-pay-meta-v">{r.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="listing-powered-box">
                            <p className="listing-powered-title">Powered by Conduit x402</p>
                            <p className="listing-powered-sub">Payments verified and settled on Arc Network in under a second.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
