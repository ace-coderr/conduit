"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";

const CATEGORIES = ["data", "ai", "analytics", "finance", "dev", "other"];

export default function SubmitListingPage() {
    const { address } = useAccount();
    const { authenticated, login } = usePrivy();

    const [form, setForm] = useState({
        name: "",
        description: "",
        price: "",
        endpoint: "",
        category: "data",
        docsUrl: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const set = (key: string, val: string) => {
        setForm(prev => ({ ...prev, [key]: val }));
        setError("");
    };

    const handleSubmit = async () => {
        if (!address) return;
        if (!form.name.trim()) return setError("Name is required");
        if (!form.description.trim()) return setError("Description is required");
        if (!form.price || isNaN(parseFloat(form.price)) || parseFloat(form.price) <= 0) return setError("Enter a valid price");
        if (!form.endpoint.trim()) return setError("Endpoint URL is required");
        try { new URL(form.endpoint); } catch { return setError("Enter a valid endpoint URL"); }

        setSubmitting(true);
        const res = await fetch("/api/marketplace", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...form,
                creatorAddress: address,
            }),
        });
        const data = await res.json();
        setSubmitting(false);

        if (!res.ok) return setError(data.error ?? "Submission failed");
        setSuccess(true);
    };

    if (success) return (
        <div className="app">
            <NavBar />
            <div className="page-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
                <div className="card" style={{ maxWidth: 460, width: "100%" }}>
                    <div className="listing-card-bar" />
                    <div className="card-body" style={{ padding: "48px 40px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                        <div className="pay-success-icon" style={{ width: 64, height: 64, marginBottom: 20 }}>
                            <svg viewBox="0 0 24 24" fill="none" width="28" height="28"><path d="M5 13l4 4L19 7" stroke="var(--c)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                        <h2 style={{ fontSize: 22, fontWeight: 900, color: "var(--ink-1)", marginBottom: 10 }}>Listing Submitted!</h2>
                        <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.6, marginBottom: 28, maxWidth: 320 }}>Your API is pending review. It'll appear in the marketplace once approved.</p>
                        <Link href="/marketplace" className="btn-primary" style={{ width: "auto", padding: "12px 28px", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                            Back to Marketplace
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );

    if (!authenticated || !address) return (
        <div className="app">
            <NavBar />
            <div className="page-wrap">
                <div className="empty" style={{ paddingTop: 80 }}>
                    <div className="empty-icon">
                        <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><circle cx="12" cy="8" r="4" stroke="var(--ink-3)" strokeWidth="1.5" /><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    </div>
                    <p className="empty-title">Connect your wallet</p>
                    <p className="empty-sub">Sign in to list your API in the marketplace</p>
                    <button className="form-submit-btn" style={{ width: "auto", padding: "12px 28px", margin: "18px auto 0" }} onClick={login}>Connect Wallet</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="app">
            <NavBar />
            <div className="page-wrap">
                <div style={{ maxWidth: 640, margin: "0 auto" }}>

                    <Link href="/marketplace" className="listing-detail-back">← Back to Marketplace</Link>

                    <div className="page-header">
                        <h1 className="page-title">List Your API</h1>
                        <p className="page-subtitle">Add your x402-gated API to the marketplace. Earn USDC per request from AI agents and developers.</p>
                    </div>

                    <div className="form-card">
                        <div className="form-card-body">
                            <div className="form-group">
                                <label className="form-label">API Name</label>
                                <input className="input" value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Arc Network Stats" />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="input" value={form.description} onChange={e => set("description", e.target.value)} placeholder="What does your API return? What is it useful for?" rows={3} style={{ resize: "vertical", width: "100%" }} />
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Price / Request <span style={{ color: "var(--c)" }}>USDC</span></label>
                                    <input className="input mono" value={form.price} onChange={e => set("price", e.target.value)} placeholder="0.001" type="number" min="0.0001" step="0.0001" />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Category</label>
                                    <select className="input" value={form.category} onChange={e => set("category", e.target.value)} style={{ cursor: "pointer" }}>
                                        {CATEGORIES.map(c => <option key={c} value={c} style={{ background: "#111" }}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">API Endpoint URL</label>
                                <input className="input" value={form.endpoint} onChange={e => set("endpoint", e.target.value)} placeholder="https://your-api.com/api/endpoint" />
                                <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6 }}>Must return 402 when no payment is provided</p>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Documentation URL <span className="form-label-opt">(optional)</span></label>
                                <input className="input" value={form.docsUrl} onChange={e => set("docsUrl", e.target.value)} placeholder="https://your-api.com/docs" />
                            </div>

                            <div style={{ background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: "var(--r-md)", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                                <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600 }}>Creator wallet</span>
                                <span style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-2)", fontWeight: 700 }}>{address.slice(0, 6)}...{address.slice(-4)}</span>
                            </div>

                            {error && <div className="form-error">{error}</div>}

                            <button onClick={handleSubmit} disabled={submitting} className="form-submit-btn">
                                {submitting ? "Submitting..." : "Submit for Review →"}
                            </button>

                            <p style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "center", lineHeight: 1.6, marginTop: 14 }}>Listings are reviewed before appearing in the marketplace. Usually approved within 24 hours.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
