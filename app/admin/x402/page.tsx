"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";

const ADMIN_WALLET = "0x8557fabdc62f59a1ba7d6a74aaf0942cdcb68f69";

interface X402Payment {
    id: string;
    txHash: string;
    payer: string;
    payTo: string;
    amount: string;
    network: string;
    resource: string;
    settledAt: string;
}

interface DayData { date: string; label: string; amount: number; count: number; }

function StatCard({ label, value, unit, sub, color, icon }: {
    label: string; value: string; unit?: string; sub?: string; color: string; icon: JSX.Element;
}) {
    return (
        <div className="stat-card" style={{ padding: "16px 18px" }}>
            <div className="stat-card-line" style={{ background: color }} />
            <div className="stat-icon-wrap" style={{ width: 30, height: 30, marginBottom: 10 }}>{icon}</div>
            <div className="stat-value" style={{ fontSize: 22, color }}>
                {value}
                {unit && <span style={{ fontSize: 12, color, marginLeft: 4, fontFamily: "IBM Plex Mono, monospace" }}>{unit}</span>}
            </div>
            <div className="stat-label">{label}</div>
            {sub && <div className="stat-sub" style={{ color: "var(--ink-3)" }}>{sub}</div>}
        </div>
    );
}

export default function X402Dashboard() {
    const { address, isConnected } = useAccount();
    const { connect } = useConnect();
    const [payments, setPayments] = useState<X402Payment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [range, setRange] = useState<"7d" | "30d" | "all">("30d");

    const isAdmin = address?.toLowerCase() === ADMIN_WALLET;

    useEffect(() => { setMounted(true); }, []);

    const fetchPayments = useCallback(async () => {
        if (!address) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/x402/payments?wallet=${address}`);
            if (res.ok) {
                const data = await res.json();
                setPayments(data.payments ?? []);
            }
        } catch { }
        finally { setIsLoading(false); }
    }, [address]);

    useEffect(() => {
        if (mounted && isConnected && isAdmin) fetchPayments();
    }, [mounted, isConnected, isAdmin, fetchPayments]);

    const totalVolume = payments.reduce((s, p) => s + parseFloat(p.amount), 0);
    const uniquePayers = new Set(payments.map(p => p.payer.toLowerCase())).size;
    const avgPrice = payments.length > 0 ? totalVolume / payments.length : 0;
    const fmt = (n: number) => n % 1 === 0 ? n.toString() : n.toFixed(4);
    const fmtDate = (d: string) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

    const chartDays = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const chartData: DayData[] = (() => {
        const days = [];
        const now = new Date();
        for (let i = chartDays - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split("T")[0];
            const dayPayments = payments.filter(p => p.settledAt?.startsWith(dateStr));
            days.push({ date: dateStr, label: d.toLocaleDateString("en", { month: "short", day: "numeric" }), amount: dayPayments.reduce((s, p) => s + parseFloat(p.amount), 0), count: dayPayments.length });
        }
        return days;
    })();
    const maxAmount = Math.max(...chartData.map(d => d.amount), 1);

    if (!mounted) return null;

    if (!isConnected) return (
        <div className="app">
            <NavBar />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", flexDirection: "column", gap: 16 }}>
                <p style={{ fontSize: 14, color: "var(--ink-2)" }}>Connect the admin wallet to view x402 activity.</p>
                <button onClick={() => connect({ connector: injected() })} style={{ padding: "11px 22px", background: "var(--c-grad)", border: "none", borderRadius: "var(--r-sm)", color: "#04140d", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "Sora, sans-serif" }}>Connect Wallet</button>
            </div>
        </div>
    );

    if (!isAdmin) return (
        <div className="app">
            <NavBar />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
                <p style={{ color: "var(--ink-3)" }}>Admin access required.</p>
            </div>
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
                            <h1 className="page-title" style={{ marginBottom: 0 }}>x402 Payments</h1>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(240,62,95,.1)", border: "1px solid rgba(240,62,95,.2)", borderRadius: 20, padding: "3px 12px" }}>
                                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--danger)" }} />
                                <span style={{ fontSize: 10, color: "var(--danger)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, letterSpacing: ".08em" }}>ADMIN</span>
                            </div>
                            <span style={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color: "#a78bfa", background: "rgba(167,139,250,.1)", border: "1px solid rgba(167,139,250,.25)", borderRadius: 4, padding: "2px 8px" }}>Arc Testnet · eip155:5042002</span>
                        </div>
                        <p className="page-subtitle">Every x402 micropayment settled through Conduit's Arc facilitator, across all users</p>
                    </div>
                    <button onClick={fetchPayments} style={{ fontSize: 12, color: "var(--c)", background: "var(--c-dim)", border: "1px solid var(--c-border)", borderRadius: "var(--r-sm)", padding: "6px 14px", cursor: "pointer", fontWeight: 700, fontFamily: "Sora, sans-serif" }}>Refresh</button>
                </div>

                <div className="bento-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
                    <div className="bento-cell"><StatCard label="Total x402 Volume" value={fmt(totalVolume)} unit="USDC" sub="all users" color="var(--c)" icon={<svg viewBox="0 0 20 20" fill="none" width="14" height="14"><circle cx="10" cy="10" r="8" stroke="var(--c)" strokeWidth="1.3" /><path d="M10 6v8M7.5 8C7.5 6.9 8.6 6 10 6s2.5.9 2.5 2-1.1 2-2.5 2-2.5.9-2.5 2S8.6 14 10 14s2.5-.9 2.5-2" stroke="var(--c)" strokeWidth="1.2" strokeLinecap="round" /></svg>} /></div>
                    <div className="bento-cell"><StatCard label="Settlements" value={payments.length.toString()} sub="paid calls" color="var(--info)" icon={<svg viewBox="0 0 20 20" fill="none" width="14" height="14"><path d="M3 10l4.5 4.5L17 5" stroke="var(--info)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>} /></div>
                    <div className="bento-cell"><StatCard label="Unique Paying Agents" value={uniquePayers.toString()} sub="distinct wallets" color="var(--warning)" icon={<svg viewBox="0 0 20 20" fill="none" width="14" height="14"><rect x="3" y="5" width="14" height="10" rx="1.5" stroke="var(--warning)" strokeWidth="1.3" /><path d="M8 5V3M6 2.5h4" stroke="var(--warning)" strokeWidth="1.3" strokeLinecap="round" /><circle cx="7" cy="10" r="1" fill="var(--warning)" /><circle cx="13" cy="10" r="1" fill="var(--warning)" /></svg>} /></div>
                    <div className="bento-cell"><StatCard label="Avg Price / Call" value={fmt(avgPrice)} unit="USDC" sub="per request" color="#a78bfa" icon={<svg viewBox="0 0 20 20" fill="none" width="14" height="14"><path d="M6 5l-4 5 4 5M14 5l4 5-4 5M11 3l-2 14" stroke="#a78bfa" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>} /></div>
                </div>

                <div className="card" style={{ marginBottom: 24, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <p style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 4, fontWeight: 600 }}>Facilitator endpoint</p>
                        <p style={{ fontSize: 13, fontFamily: "IBM Plex Mono, monospace", color: "var(--c)", fontWeight: 700 }}>https://www.conduitpay.xyz/api/x402</p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                        <a href="https://www.conduitpay.xyz/api/x402" target="_blank" rel="noopener noreferrer" style={{ padding: "7px 14px", background: "var(--c-dim)", border: "1px solid var(--c-border)", borderRadius: "var(--r-sm)", color: "var(--c)", fontSize: 11, fontWeight: 700, textDecoration: "none", fontFamily: "IBM Plex Mono, monospace" }}>Discovery ↗</a>
                        <a href="https://www.conduitpay.xyz/api/arc-stats" target="_blank" rel="noopener noreferrer" style={{ padding: "7px 14px", background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: "var(--r-sm)", color: "var(--ink-2)", fontSize: 11, fontWeight: 700, textDecoration: "none", fontFamily: "IBM Plex Mono, monospace" }}>Demo endpoint ↗</a>
                    </div>
                </div>

                <div className="card" style={{ marginBottom: 24 }}>
                    <div className="card-head" style={{ justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div className="card-head-icon"><svg viewBox="0 0 20 20" fill="none" width="16" height="16"><path d="M2 14l4-4 4 2 4-6 4 2" stroke="var(--c)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                            <div><div className="card-title">x402 Volume</div><div className="card-subtitle">Settled USDC per day, all users</div></div>
                        </div>
                        <div style={{ display: "flex", gap: 4, background: "var(--bg)", borderRadius: "var(--r-sm)", padding: 3 }}>
                            {(["7d", "30d", "all"] as const).map(r => <button key={r} onClick={() => setRange(r)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: range === r ? "var(--surface)" : "transparent", color: range === r ? "var(--ink-1)" : "var(--ink-3)", fontSize: 11, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, cursor: "pointer", transition: "all .15s" }}>{r}</button>)}
                        </div>
                    </div>
                    <div className="card-body" style={{ padding: "14px 20px" }}>
                        {payments.length === 0 ? <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-3)", fontSize: 13 }}>No x402 payments yet</div> : (
                            <>
                                <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 110, marginBottom: 8 }}>
                                    {chartData.map((day, i) => <div key={day.date} title={`${day.label}: ${fmt(day.amount)} USDC (${day.count} calls)`} style={{ flex: 1, height: `${Math.max((day.amount / maxAmount) * 100, day.amount > 0 ? 3 : 1.5)}%`, background: day.amount > 0 ? (i === chartData.length - 1 ? "var(--c)" : "rgba(0,229,160,.4)") : "var(--raised)", borderRadius: "3px 3px 0 0", minHeight: 2, transition: "height .4s ease" }} />)}
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    {chartData.filter((_, i) => i % (chartDays <= 7 ? 1 : chartDays <= 30 ? 5 : 10) === 0 || i === chartData.length - 1).map(day => <span key={day.date} style={{ fontSize: 9, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>{day.label}</span>)}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="card">
                    <div className="card-head" style={{ justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div className="card-head-icon"><svg viewBox="0 0 20 20" fill="none" width="16" height="16"><path d="M5 4l-3 4 3 4M11 4l3 4-3 4M9 2l-2 12" stroke="var(--c)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                            <div><div className="card-title">Settlements</div><div className="card-subtitle">{payments.length} total x402 transactions on Arc</div></div>
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1.1fr 1fr 1.3fr 1.2fr", gap: 12, padding: "11px 20px", background: "var(--raised)", borderBottom: "1px solid var(--stroke)" }}>
                        {["RESOURCE", "PAYER", "AMOUNT", "DATE", "TX HASH"].map(c => (
                            <span key={c} style={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-3)", letterSpacing: ".12em", fontWeight: 600 }}>{c}</span>
                        ))}
                    </div>

                    <div style={{ maxHeight: 560, overflowY: "auto", padding: "4px 0" }}>
                        {isLoading ? (
                            <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><div className="page-spinner" /></div>
                        ) : payments.length === 0 ? (
                            <div style={{ padding: 40, textAlign: "center" }}>
                                <p style={{ fontSize: 14, color: "var(--ink-2)", fontWeight: 700, marginBottom: 8 }}>No x402 payments yet</p>
                                <p style={{ fontSize: 12, color: "var(--ink-3)" }}>Payments will appear here once agents start using the facilitator</p>
                                <a href="https://www.conduitpay.xyz/api/arc-stats" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: 12, fontSize: 12, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace" }}>Test with curl -i https://www.conduitpay.xyz/api/arc-stats ↗</a>
                            </div>
                        ) : payments.map((p, i) => (
                            <div key={p.id}
                                style={{ display: "grid", gridTemplateColumns: "2.2fr 1.1fr 1fr 1.3fr 1.2fr", gap: 12, padding: "16px 20px", alignItems: "center", borderBottom: i < payments.length - 1 ? "1px solid var(--stroke)" : "none", transition: "background .12s" }}
                                onMouseEnter={e => (e.currentTarget.style.background = "var(--raised)")}
                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                            >
                                <div style={{ minWidth: 0 }}>
                                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.resource.replace("https://conduitpay.xyz", "")}</p>
                                    <p style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace", marginTop: 2 }}>{p.network}</p>
                                </div>
                                <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-2)" }}>{p.payer.slice(0, 6)}...{p.payer.slice(-4)}</span>
                                <div>
                                    <p style={{ fontSize: 14, fontWeight: 800, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", letterSpacing: "-.02em" }}>{parseFloat(p.amount).toFixed(4)}</p>
                                    <p style={{ fontSize: 9, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>USDC</p>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <svg viewBox="0 0 16 16" fill="none" width="11" height="11" style={{ flexShrink: 0 }}><path d="M2.5 8.5l3.5 3.5 7.5-8" stroke="var(--c)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    <span style={{ fontSize: 10, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-3)" }}>{fmtDate(p.settledAt)}</span>
                                </div>
                                <a href={`https://testnet.arcscan.app/tx/${p.txHash}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", textDecoration: "none" }}>
                                    {p.txHash.slice(0, 8)}...↗
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
