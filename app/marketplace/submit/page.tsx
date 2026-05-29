"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useRouter } from "next/navigation";

const CATEGORIES = ["data", "ai", "analytics", "finance", "dev", "other"];

export default function SubmitListingPage() {
    const { address } = useAccount();
    const { authenticated, login } = usePrivy();
    const router = useRouter();

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
        <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Sora, sans-serif", padding: 20 }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--c-border)", borderRadius: "var(--r-xl)", padding: "40px 36px", maxWidth: 440, width: "100%", textAlign: "center", position: "relative", overflow: "hidden" }}>
                <div style={{ height: 2, background: "var(--c)", position: "absolute", top: 0, left: 0, right: 0 }} />
                <div style={{ marginBottom: 16 }}>
                    <svg viewBox="0 0 40 40" fill="none" width="40" height="40">
                        <circle cx="20" cy="20" r="18" stroke="var(--c)" strokeWidth="1.5" opacity=".3" />
                        <path d="M13 20l5 5 9-9" stroke="var(--c)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <h2 style={{ fontSize: 20, fontWeight: 900, color: "var(--ink-1)", marginBottom: 8 }}>Listing Submitted!</h2>
                <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.6, marginBottom: 24 }}>Your API is pending review. It'll appear in the marketplace once approved.</p>
                <Link href="/marketplace" style={{ display: "inline-flex", padding: "10px 20px", background: "var(--c)", borderRadius: "var(--r-md)", color: "#000", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                    Back to Marketplace
                </Link>
            </div>
        </div>
    );

    if (!authenticated || !address) return (
        <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Sora, sans-serif", padding: 20 }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: "var(--r-xl)", padding: "40px 36px", maxWidth: 400, width: "100%", textAlign: "center" }}>
                <p style={{ fontSize: 16, fontWeight: 800, color: "var(--ink-1)", marginBottom: 8 }}>Connect Wallet</p>
                <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 24 }}>Connect your wallet to list your API.</p>
                <button onClick={login} style={{ width: "100%", padding: 13, background: "var(--c)", border: "none", borderRadius: "var(--r-md)", color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "Sora, sans-serif" }}>Connect Wallet</button>
            </div>
        </div>
    );

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "Sora, sans-serif" }}>

            {/* Top bar */}
            <div style={{ height: 52, background: "var(--surface)", borderBottom: "1px solid var(--stroke)", display: "flex", alignItems: "center", padding: "0 32px", gap: 16 }}>
                <Link href="/marketplace" style={{ fontSize: 12, color: "var(--ink-3)", textDecoration: "none", fontWeight: 600 }}>← Marketplace</Link>
                <div style={{ width: 1, height: 16, background: "var(--stroke)" }} />
                <span style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 700 }}>List Your API</span>
            </div>

            <div style={{ maxWidth: 600, margin: "0 auto", padding: "36px 40px" }}>
                <h1 style={{ fontSize: 24, fontWeight: 900, color: "var(--ink-1)", letterSpacing: "-.04em", marginBottom: 6 }}>List Your API</h1>
                <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 28, lineHeight: 1.6 }}>Add your x402-gated API to the marketplace. Earn USDC per request from AI agents and developers.</p>

                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    {/* Name */}
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", display: "block", marginBottom: 6 }}>API Name *</label>
                        <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Arc Network Stats" style={inputStyle} />
                    </div>

                    {/* Description */}
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", display: "block", marginBottom: 6 }}>Description *</label>
                        <textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="What does your API return? What is it useful for?" rows={3} style={{ ...inputStyle, resize: "vertical" as const }} />
                    </div>

                    {/* Price + Category */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", display: "block", marginBottom: 6 }}>Price per Request (USDC) *</label>
                            <input value={form.price} onChange={e => set("price", e.target.value)} placeholder="0.001" type="number" min="0.0001" step="0.0001" style={inputStyle} />
                        </div>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", display: "block", marginBottom: 6 }}>Category *</label>
                            <select value={form.category} onChange={e => set("category", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                                {CATEGORIES.map(c => <option key={c} value={c} style={{ background: "#111" }}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Endpoint */}
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", display: "block", marginBottom: 6 }}>API Endpoint URL *</label>
                        <input value={form.endpoint} onChange={e => set("endpoint", e.target.value)} placeholder="https://your-api.com/api/endpoint" style={inputStyle} />
                        <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>Must return 402 when no payment is provided</p>
                    </div>

                    {/* Docs URL */}
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", display: "block", marginBottom: 6 }}>Documentation URL <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(optional)</span></label>
                        <input value={form.docsUrl} onChange={e => set("docsUrl", e.target.value)} placeholder="https://your-api.com/docs" style={inputStyle} />
                    </div>

                    {/* Creator */}
                    <div style={{ background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: "var(--r-md)", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600 }}>Creator wallet</span>
                        <span style={{ fontSize: 12, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-2)", fontWeight: 700 }}>{address.slice(0, 6)}...{address.slice(-4)}</span>
                    </div>

                    {error && <p style={{ fontSize: 12, color: "var(--danger)" }}>{error}</p>}

                    <button onClick={handleSubmit} disabled={submitting} style={{ padding: 14, background: "var(--c)", border: "none", borderRadius: "var(--r-md)", color: "#000", fontSize: 14, fontWeight: 800, cursor: submitting ? "not-allowed" : "pointer", fontFamily: "Sora, sans-serif", opacity: submitting ? .6 : 1 }}>
                        {submitting ? "Submitting..." : "Submit for Review →"}
                    </button>

                    <p style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "center", lineHeight: 1.6 }}>Listings are reviewed before appearing in the marketplace. Usually approved within 24 hours.</p>
                </div>
            </div>
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    background: "var(--surface)",
    border: "1px solid var(--stroke)",
    borderRadius: "var(--r-md)",
    color: "var(--ink-1)",
    fontSize: 13,
    outline: "none",
    fontFamily: "Sora, sans-serif",
    boxSizing: "border-box",
};