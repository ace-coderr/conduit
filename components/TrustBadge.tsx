"use client";

import { useEffect, useState } from "react";

type Reputation = {
    address: string;
    completedEscrows: number;
    disputedEscrows: number;
    refundedEscrows: number;
    totalVolume: string;
    trustScore: number;
    isNew: boolean;
};

/**
 * TrustBadge — shows a wallet's escrow trust score.
 * Usage: <TrustBadge address={sellerAddress} />
 * Optional: size="sm" for compact (contacts list), default is full.
 */
export function TrustBadge({ address, size = "full" }: { address: string; size?: "sm" | "full" }) {
    const [rep, setRep] = useState<Reputation | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!address) return;
        let active = true;
        (async () => {
            try {
                const res = await fetch(`/api/reputation?address=${address}`);
                if (!res.ok) return;
                const { reputation } = await res.json();
                if (active) setRep(reputation);
            } catch { }
            finally { if (active) setLoading(false); }
        })();
        return () => { active = false; };
    }, [address]);

    if (loading || !rep) {
        return (
            <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: size === "sm" ? 10 : 11, color: "var(--ink-3)",
                fontFamily: "IBM Plex Mono, monospace",
            }}>
                <span className="skeleton" style={{ width: 44, height: 14, borderRadius: 6 }} />
            </span>
        );
    }

    // Color by trust tier
    const score = rep.trustScore;
    let color = "var(--c)";
    let bg = "var(--c-dim)";
    let border = "var(--c-border)";
    let label = "Trusted";

    if (rep.isNew) {
        color = "var(--ink-3)"; bg = "var(--raised)"; border = "var(--stroke)"; label = "New";
    } else if (score >= 90) {
        color = "var(--c)"; bg = "var(--c-dim)"; border = "var(--c-border)"; label = "Trusted";
    } else if (score >= 70) {
        color = "var(--warning)"; bg = "rgba(245,166,35,.1)"; border = "rgba(245,166,35,.2)"; label = "Fair";
    } else {
        color = "var(--danger)"; bg = "rgba(240,62,95,.1)"; border = "rgba(240,62,95,.2)"; label = "Caution";
    }

    if (size === "sm") {
        return (
            <span title={`${rep.completedEscrows} completed · ${rep.disputedEscrows} disputed`} style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                fontSize: 10, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700,
                color, background: bg, border: `1px solid ${border}`,
                padding: "2px 7px", borderRadius: 20,
            }}>
                <svg viewBox="0 0 14 14" fill="none" width="9" height="9">
                    <path d="M7 1l1.6 3.3 3.6.5-2.6 2.5.6 3.6L7 9.7 3.8 11.4l.6-3.6L1.8 4.8l3.6-.5L7 1z" stroke={color} strokeWidth="1.1" strokeLinejoin="round" />
                </svg>
                {rep.isNew ? "New" : `${score}`}
            </span>
        );
    }

    return (
        <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: bg, border: `1px solid ${border}`,
            padding: "6px 12px", borderRadius: 20,
        }}>
            <svg viewBox="0 0 14 14" fill="none" width="12" height="12">
                <path d="M7 1l1.6 3.3 3.6.5-2.6 2.5.6 3.6L7 9.7 3.8 11.4l.6-3.6L1.8 4.8l3.6-.5L7 1z" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: "Sora, sans-serif" }}>
                {rep.isNew ? "New seller" : `${label} · ${score}`}
            </span>
            {!rep.isNew && (
                <span style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>
                    {rep.completedEscrows}✓{rep.disputedEscrows > 0 ? ` · ${rep.disputedEscrows}⚠` : ""}
                </span>
            )}
        </div>
    );
}