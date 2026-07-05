"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { NavBar } from "@/components/NavBar";
import { PnlCard } from "@/components/PnlCard";

interface PaymentLink {
  id: string;
  title: string;
  amount: string;
  status: string;
  txHash?: string;
  paidBy?: string;
  paidAt?: string;
  createdAt: string;
  stealthAddress?: string;
  isEscrow?: boolean;
}

interface EscrowLink {
  id: string;
  title: string;
  amount: string;
  status: string;
  buyerAddress?: string;
  paidAt?: string;
  confirmedAt?: string;
  createdAt: string;
  releaseDeadline?: string;
  disputeReason?: string;
}

interface SplitLink {
  id: string;
  title: string;
  amount: string;
  status: string;
  paidBy?: string;
  paidAt?: string;
  createdAt: string;
}

type Range = "7d" | "30d" | "90d" | "all";
const RANGES: { value: Range; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "all", label: "All" },
];

const MilestoneIcons: Record<string, JSX.Element> = {
  first_payment: <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="#00E5A0" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  five_payments: <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M12 3c3.87 2.93 9 3.1 9 3.1S21 15 12 21C3 15 3 6.1 3 6.1S8.13 5.93 12 3z" stroke="#f5a623" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  ten_payments: <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="#00E5A0" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  fifty_payments: <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke="#f5a623" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  earn_10: <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><circle cx="12" cy="12" r="9" stroke="#00E5A0" strokeWidth="1.5"/><path d="M12 7v10M9 9.5C9 8.12 10.34 7 12 7s3 1.12 3 2.5S13.66 12 12 12s-3 1.12-3 2.5S9.34 17 12 17s3-1.12 3-2.5" stroke="#00E5A0" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  earn_100: <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" stroke="#00E5A0" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  earn_1000: <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M12 2l2.4 4.8 5.6.8-4 3.9.9 5.5L12 14.5l-4.9 2.5.9-5.5L4 7.6l5.6-.8L12 2z" stroke="#f5a623" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
  stealth_5: <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M12 5C7 5 2.73 7.11 1 10.5c1.73 3.39 6 5.5 11 5.5s9.27-2.11 11-5.5C21.27 7.11 17 5 12 5z" stroke="#a78bfa" strokeWidth="1.5"/><circle cx="12" cy="10.5" r="3" stroke="#a78bfa" strokeWidth="1.5"/><path d="M3 20l18-18" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  first_escrow: <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#5b8ff9" strokeWidth="1.5"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="#5b8ff9" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  perfect: <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M12 3l1.5 4.5H18l-3.75 2.73 1.43 4.4L12 12.1l-3.68 2.53 1.43-4.4L6 7.5h4.5L12 3z" stroke="#5b8ff9" strokeWidth="1.5" strokeLinejoin="round"/><path d="M8 21l4-3 4 3" stroke="#5b8ff9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

const MILESTONES = [
  { id: "first_payment", label: "First Payment", desc: "Received your first USDC", req: (c: number) => c >= 1 },
  { id: "five_payments", label: "On a Roll", desc: "5 payments received", req: (c: number) => c >= 5 },
  { id: "ten_payments", label: "Power User", desc: "10 payments received", req: (c: number) => c >= 10 },
  { id: "fifty_payments", label: "Veteran", desc: "50 payments received", req: (c: number) => c >= 50 },
  { id: "earn_10", label: "First 10 USDC", desc: "Earned 10 USDC total", req: (_: number, earned: number) => earned >= 10 },
  { id: "earn_100", label: "Century Club", desc: "Earned 100 USDC total", req: (_: number, earned: number) => earned >= 100 },
  { id: "earn_1000", label: "Grand Club", desc: "Earned 1000 USDC total", req: (_: number, earned: number) => earned >= 1000 },
  { id: "stealth_5", label: "Ghost Mode", desc: "5 stealth payments", req: (_: number, __: number, stealth: number) => stealth >= 5 },
  { id: "first_escrow", label: "Trusted Seller", desc: "First escrow completed", req: (_: number, __: number, ___: number, ____: number, _____: number, escrow: number) => escrow >= 1 },
  { id: "perfect", label: "Perfect Record", desc: "100% completion rate", req: (_: number, __: number, ___: number, rate: number, total: number) => rate === 100 && total >= 3 },
];

const CHART_W = 600;
const CHART_H = 170;
const CHART_PAD_TOP = 14;

export default function AnalyticsPage() {
  const { address, isConnected } = useAccount();
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [escrows, setEscrows] = useState<EscrowLink[]>([]);
  const [splits, setSplits] = useState<SplitLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [range, setRange] = useState<Range>("30d");

  useEffect(() => { setMounted(true); }, []);

  const fetchData = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const [linksRes, escrowsRes, splitsRes] = await Promise.all([
        fetch(`/api/links?address=${address}`),
        fetch(`/api/escrow?address=${address}`),
        fetch(`/api/splits?address=${address}`),
      ]);
      if (linksRes.ok) {
        const data = await linksRes.json();
        setLinks(data.links ?? []);
      }
      if (escrowsRes.ok) {
        const data = await escrowsRes.json();
        setEscrows(data.escrows ?? []);
      }
      if (splitsRes.ok) {
        const data = await splitsRes.json();
        setSplits(data.splits ?? []);
      }
    } catch {}
    finally { setIsLoading(false); }
  }, [address]);

  useEffect(() => { if (isConnected && address) fetchData(); }, [isConnected, address, fetchData]);

  // Payment link stats (unchanged — feeds Milestones/PnL/Top Links below)
  const completed = links.filter(l => l.status === "COMPLETED" && !l.isEscrow);
  const allCompleted = links.filter(l => l.status === "COMPLETED");
  const active = links.filter(l => l.status === "ACTIVE");
  const expired = links.filter(l => l.status === "EXPIRED");

  // Escrow stats (unchanged)
  const releasedEscrows = escrows.filter(e => ["RELEASED", "CONFIRMED"].includes(e.status));
  const holdingEscrows = escrows.filter(e => e.status === "HOLDING");
  const disputedEscrows = escrows.filter(e => e.status === "DISPUTED");
  const totalHeld = holdingEscrows.reduce((s, e) => s + parseFloat(e.amount), 0);

  // Splits stats (new — same COMPLETED filter pattern as links/escrow)
  const completedSplits = splits.filter(s => s.status === "COMPLETED");

  const totalEarned = allCompleted.reduce((s, l) => s + parseFloat(l.amount), 0);
  const completionRate = links.length > 0 ? Math.round((allCompleted.length / links.length) * 100) : 0;
  const avgPayment = allCompleted.length > 0 ? totalEarned / allCompleted.length : 0;
  const biggestPayment = allCompleted.length > 0 ? Math.max(...allCompleted.map(l => parseFloat(l.amount))) : 0;
  const stealthCompleted = completed.filter(l => l.stealthAddress).length;

  const earnedMilestones = MILESTONES.filter(m => m.req(allCompleted.length, totalEarned, stealthCompleted, completionRate, links.length, releasedEscrows.length));
  const lockedMilestones = MILESTONES.filter(m => !m.req(allCompleted.length, totalEarned, stealthCompleted, completionRate, links.length, releasedEscrows.length));

  const streak = (() => {
    let s = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = d.toISOString().split("T")[0];
      if (allCompleted.some(l => (l.paidAt ?? l.createdAt)?.startsWith(ds))) s++;
      else if (i > 0) break;
    }
    return s;
  })();

  const topLinks = [...allCompleted].sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount)).slice(0, 5);
  const topTxAmount = Math.max(...topLinks.map(l => parseFloat(l.amount)), 1);

  // Link status mix — orthogonal to the payment-type donut (type vs status)
  const linkStatusTotal = links.length + escrows.length;
  const LINK_STATUS = [
    { label: "Completed", count: allCompleted.length, color: "var(--c)" },
    { label: "Active", count: active.length, color: "var(--warning)" },
    { label: "Expired", count: expired.length, color: "var(--danger)" },
    { label: "Escrow Released", count: releasedEscrows.length, color: "var(--info)" },
  ];

  const fmt = (n: number) => n % 1 === 0 ? n.toString() : n.toFixed(2);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en", { month: "short", day: "numeric" });

  // ── Period-aware aggregates (new — power the bento stat row/donut/charts) ──
  const chartDays = range === "7d" ? 7 : range === "30d" ? 30 : 90;

  const rangeStart = new Date();
  if (range !== "all") rangeStart.setDate(rangeStart.getDate() - chartDays);

  const rangeCompleted = range === "all" ? allCompleted : allCompleted.filter(l => new Date(l.paidAt ?? l.createdAt) >= rangeStart);
  const rangeEarned = rangeCompleted.reduce((s, l) => s + parseFloat(l.amount), 0);

  const rangeEscrowCompleted = range === "all" ? releasedEscrows : releasedEscrows.filter(e => new Date(e.confirmedAt ?? e.paidAt ?? e.createdAt) >= rangeStart);
  const rangeEscrowEarned = rangeEscrowCompleted.reduce((s, e) => s + parseFloat(e.amount), 0);

  const rangeSplitsCompleted = range === "all" ? completedSplits : completedSplits.filter(sp => new Date(sp.paidAt ?? sp.createdAt) >= rangeStart);
  const rangeSplitsEarned = rangeSplitsCompleted.reduce((s, sp) => s + parseFloat(sp.amount), 0);

  const periodVolume = rangeEarned + rangeEscrowEarned + rangeSplitsEarned;
  const periodTxCount = rangeCompleted.length + rangeEscrowCompleted.length + rangeSplitsCompleted.length;
  const periodAvgTx = periodTxCount > 0 ? periodVolume / periodTxCount : 0;
  const uniquePayers = new Set([
    ...rangeCompleted.map(l => l.paidBy?.toLowerCase()),
    ...rangeEscrowCompleted.map(e => e.buyerAddress?.toLowerCase()),
    ...rangeSplitsCompleted.map(sp => sp.paidBy?.toLowerCase()),
  ].filter((a): a is string => !!a)).size;

  const STAT_CARDS = [
    { label: "Total Volume", value: fmt(periodVolume), unit: "USDC", sub: `${periodTxCount} transaction${periodTxCount === 1 ? "" : "s"}`, color: "var(--c)" },
    { label: "Unique Payers", value: uniquePayers.toString(), unit: "", sub: "this period", color: "var(--c)" },
    { label: "Transactions", value: periodTxCount.toString(), unit: "", sub: "payments + escrow + splits", color: "var(--warning)" },
    { label: "Avg Transaction", value: fmt(periodAvgTx), unit: "USDC", sub: "per transaction", color: "var(--purple)" },
  ];

  const donutTotal = rangeEarned + rangeEscrowEarned + rangeSplitsEarned;
  const donutSegments = [
    { label: "Payments", value: rangeEarned, color: "var(--c)" },
    { label: "Escrow", value: rangeEscrowEarned, color: "var(--info)" },
    { label: "Splits", value: rangeSplitsEarned, color: "var(--warning)" },
  ];

  // Volume/transaction time series. 7D/30D/90D bucket by day; All buckets by
  // week across full history so it reads as genuinely all-time, not a 90-day alias.
  const chartData = (() => {
    if (range === "all") {
      const allDates = [
        ...allCompleted.map(l => l.paidAt ?? l.createdAt),
        ...releasedEscrows.map(e => e.confirmedAt ?? e.paidAt ?? e.createdAt),
        ...completedSplits.map(sp => sp.paidAt ?? sp.createdAt),
      ].filter(Boolean).map(d => new Date(d as string));

      const today = new Date(); today.setHours(0, 0, 0, 0);
      const start = allDates.length ? new Date(Math.min(...allDates.map(d => d.getTime()))) : new Date(today);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - start.getDay()); // align to week start

      const weeks: { date: string; label: string; amount: number; count: number }[] = [];
      for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 7)) {
        const weekStart = new Date(d);
        const weekEnd = new Date(d); weekEnd.setDate(weekEnd.getDate() + 7);
        const inWeek = (dateStr?: string) => { if (!dateStr) return false; const dt = new Date(dateStr); return dt >= weekStart && dt < weekEnd; };
        const weekLinks = allCompleted.filter(l => inWeek(l.paidAt ?? l.createdAt));
        const weekEscrows = releasedEscrows.filter(e => inWeek(e.confirmedAt ?? e.paidAt ?? e.createdAt));
        const weekSplits = completedSplits.filter(sp => inWeek(sp.paidAt ?? sp.createdAt));
        const amount = weekLinks.reduce((s, l) => s + parseFloat(l.amount), 0)
          + weekEscrows.reduce((s, e) => s + parseFloat(e.amount), 0)
          + weekSplits.reduce((s, sp) => s + parseFloat(sp.amount), 0);
        weeks.push({
          date: weekStart.toISOString().split("T")[0],
          label: weekStart.toLocaleDateString("en", { month: "short", day: "numeric" }),
          amount,
          count: weekLinks.length + weekEscrows.length + weekSplits.length,
        });
      }
      return weeks.length ? weeks : [{ date: today.toISOString().split("T")[0], label: "—", amount: 0, count: 0 }];
    }

    const days = [];
    const now = new Date();
    for (let i = chartDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayLinks = allCompleted.filter(l => (l.paidAt ?? l.createdAt)?.startsWith(dateStr));
      const dayEscrows = releasedEscrows.filter(e => (e.confirmedAt ?? e.paidAt ?? e.createdAt)?.startsWith(dateStr));
      const daySplits = completedSplits.filter(sp => (sp.paidAt ?? sp.createdAt)?.startsWith(dateStr));
      const dayAmount = dayLinks.reduce((s, l) => s + parseFloat(l.amount), 0)
        + dayEscrows.reduce((s, e) => s + parseFloat(e.amount), 0)
        + daySplits.reduce((s, sp) => s + parseFloat(sp.amount), 0);
      days.push({
        date: dateStr,
        label: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
        amount: dayAmount,
        count: dayLinks.length + dayEscrows.length + daySplits.length,
      });
    }
    return days;
  })();

  const maxAmount = Math.max(...chartData.map(d => d.amount), 1);
  const maxCount = Math.max(...chartData.map(d => d.count), 1);
  const chartStepX = CHART_W / Math.max(chartData.length - 1, 1);
  const chartPoints = chartData.map((d, i) => ({
    ...d,
    x: i * chartStepX,
    y: CHART_PAD_TOP + (CHART_H - CHART_PAD_TOP) * (1 - d.amount / maxAmount),
  }));
  const volumeLinePath = chartPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const volumeAreaPath = chartData.length > 1
    ? `${volumeLinePath} L${chartPoints[chartPoints.length - 1].x.toFixed(1)},${CHART_H} L0,${CHART_H} Z`
    : "";
  const axisStep = chartData.length <= 7 ? 1 : chartData.length <= 30 ? 5 : chartData.length <= 90 ? 10 : Math.ceil(chartData.length / 8);

  const R = 52, CIRC = 2 * Math.PI * R;
  let donutCumulative = 0;

  return (
    <div className="app">
      <NavBar/>
      <div className="page-wrap">

        <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 className="page-title">Analytics</h1>
            <p className="page-subtitle">Your payment performance</p>
          </div>
          {mounted && isConnected && (
            <div style={{ display: "flex", gap: 6 }}>
              {RANGES.map(r => (
                <button key={r.value} className={`filter-pill${range === r.value ? " active" : ""}`} onClick={() => setRange(r.value)}>{r.label}</button>
              ))}
            </div>
          )}
        </div>

        {mounted && !isConnected && (
          <div className="empty" style={{ paddingTop: 80 }}>
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" width="22" height="22"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <p className="empty-title">Connect your wallet</p>
            <p className="empty-sub">Connect to view your analytics</p>
          </div>
        )}

        {mounted && isConnected && isLoading && <div className="loading-wrap"><div className="page-spinner"/></div>}

        {mounted && isConnected && !isLoading && (
          <div className="bento-grid">

            {/* Streak strip */}
            {streak > 1 && (
              <div className="bento-cell bento-12">
                <div style={{ background: "linear-gradient(135deg, rgba(0,229,160,.12), rgba(0,229,160,.04))", border: "1px solid var(--c-border)", borderRadius: "var(--r-lg)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(0,229,160,.15)", border: "1px solid var(--c-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
                      <path d="M12 2c0 6-6 8-6 14a6 6 0 0012 0c0-6-6-8-6-14z" stroke="#00E5A0" strokeWidth="1.5" strokeLinejoin="round"/>
                      <path d="M12 12c0 3-2 4-2 6a2 2 0 004 0c0-2-2-3-2-6z" fill="#00E5A0" opacity=".3"/>
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 800, color: "var(--c)" }}>{streak}-day payment streak!</p>
                    <p style={{ fontSize: 12, color: "var(--ink-3)" }}>You've received payments {streak} days in a row</p>
                  </div>
                </div>
              </div>
            )}

            {/* Row 1 — accent-bar stat cards */}
            {STAT_CARDS.map(s => (
              <div key={s.label} className="bento-cell bento-3">
                <div className="stat-card">
                  <div className="stat-card-line" style={{ background: s.color }}/>
                  <div className="stat-value" style={{ color: s.color }}>
                    {s.value}{s.unit && <span style={{ fontSize: 13, marginLeft: 4 }}>{s.unit}</span>}
                  </div>
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-sub" style={{ color: s.color }}>{s.sub}</div>
                </div>
              </div>
            ))}

            {/* Row 2 — volume chart (2) + payment-type donut (1) */}
            <div className="bento-cell bento-8 bento-tall">
              <div className="card" style={{ height: "100%" }}>
                <div className="card-head">
                  <div className="card-head-icon">
                    <svg viewBox="0 0 20 20" fill="none" width="16" height="16"><path d="M2 14l4-4 4 2 4-6 4 2" stroke="var(--c)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div>
                    <div className="card-title">Volume Over Time</div>
                    <div className="card-subtitle">{fmt(periodVolume)} USDC · {range === "all" ? "all time, by week" : `last ${chartDays} days`}</div>
                  </div>
                </div>
                <div className="card-body" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  {periodVolume === 0 ? (
                    <div className="chart-empty"><p>No completed transactions in this period</p></div>
                  ) : (
                    <>
                      <div style={{ flex: 1, minHeight: 0 }}>
                        <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
                          <defs>
                            <linearGradient id="analyticsVolumeGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--c)" stopOpacity="0.35"/>
                              <stop offset="100%" stopColor="var(--c)" stopOpacity="0"/>
                            </linearGradient>
                          </defs>
                          {volumeAreaPath && <path d={volumeAreaPath} fill="url(#analyticsVolumeGradient)" stroke="none"/>}
                          <path d={volumeLinePath} fill="none" stroke="var(--c)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
                          {chartPoints.map(p => p.amount > 0 && (
                            <circle key={p.date} cx={p.x} cy={p.y} r="3.5" fill="var(--surface)" stroke="var(--c)" strokeWidth="1.8" vectorEffect="non-scaling-stroke">
                              <title>{`${p.label}: ${fmt(p.amount)} USDC (${p.count} tx)`}</title>
                            </circle>
                          ))}
                        </svg>
                      </div>
                      <div className="chart-axis-row">
                        {chartData.filter((_, i) => i % axisStep === 0 || i === chartData.length - 1).map(d => (
                          <span key={d.date} className="chart-axis-label">{d.label}</span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="bento-cell bento-4 bento-tall">
              <div style={{ display: "flex", flexDirection: "column", gap: 18, height: "100%" }}>
                <div className="card" style={{ flex: 1 }}>
                  <div className="card-head">
                    <div className="card-head-icon"><svg viewBox="0 0 20 20" fill="none" width="16" height="16"><circle cx="10" cy="10" r="7" stroke="var(--c)" strokeWidth="1.4"/></svg></div>
                    <div>
                      <div className="card-title">Payment Types</div>
                      <div className="card-subtitle">Payments vs escrow vs splits</div>
                    </div>
                  </div>
                  <div className="card-body" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    {donutTotal === 0 ? (
                      <div className="chart-empty"><p>No completed transactions in this period</p></div>
                    ) : (
                      <div className="donut-wrap">
                        <svg viewBox="0 0 130 130" width="130" height="130">
                          <circle cx="65" cy="65" r={R} fill="none" stroke="var(--raised)" strokeWidth="15"/>
                          {donutSegments.filter(s => s.value > 0).map(s => {
                            const dash = (s.value / donutTotal) * CIRC;
                            const el = (
                              <circle key={s.label} cx="65" cy="65" r={R} fill="none" stroke={s.color} strokeWidth="15"
                                strokeDasharray={`${dash} ${CIRC - dash}`} strokeDashoffset={-donutCumulative} transform="rotate(-90 65 65)">
                                <title>{`${s.label}: ${fmt(s.value)} USDC`}</title>
                              </circle>
                            );
                            donutCumulative += dash;
                            return el;
                          })}
                          <text x="65" y="61" textAnchor="middle" fontSize="20" fontWeight="800" fill="var(--ink-1)" fontFamily="'IBM Plex Mono', monospace">{fmt(donutTotal)}</text>
                          <text x="65" y="78" textAnchor="middle" fontSize="9" fill="var(--ink-3)" letterSpacing="1" fontFamily="'IBM Plex Mono', monospace">USDC</text>
                        </svg>
                        <div className="donut-legend">
                          {donutSegments.map(s => (
                            <div key={s.label} className="donut-legend-row">
                              <span className="donut-legend-left">
                                <span className="donut-legend-dot" style={{ background: s.color }}/>
                                {s.label}
                              </span>
                              <span className="donut-legend-count">{fmt(s.value)} <span style={{ color: "var(--ink-3)", fontWeight: 500 }}>({donutTotal > 0 ? Math.round((s.value / donutTotal) * 100) : 0}%)</span></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Link status mix — compact, orthogonal to the type donut above */}
                <div className="card">
                  <div className="card-head">
                    <div className="card-head-icon"><svg viewBox="0 0 20 20" fill="none" width="16" height="16"><path d="M10 3v14M3 10h14" stroke="var(--ink-2)" strokeWidth="1.3" strokeLinecap="round"/></svg></div>
                    <div><div className="card-title">Link Status</div><div className="card-subtitle">{linkStatusTotal} total</div></div>
                  </div>
                  <div style={{ padding: "12px 20px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {LINK_STATUS.map(s => (
                      <div key={s.label}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 11, color: "var(--ink-2)", fontWeight: 600 }}>{s.label}</span>
                          <span style={{ fontSize: 11, fontFamily: "IBM Plex Mono, monospace", color: s.color, fontWeight: 700 }}>{s.count}</span>
                        </div>
                        <div style={{ height: 3, borderRadius: 3, background: "var(--raised)", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: linkStatusTotal > 0 ? `${(s.count / linkStatusTotal) * 100}%` : "0%", background: s.color, borderRadius: 3, transition: "width .5s ease" }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Escrow health — funds currently held + disputes, not covered elsewhere */}
            <div className="bento-cell bento-12">
              <div style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: "var(--r-lg)", padding: "14px 24px", boxShadow: "var(--elev-1)", display: "flex", alignItems: "center", gap: 32 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: "var(--info)", fontFamily: "IBM Plex Mono, monospace", marginBottom: 2 }}>
                    {fmt(totalHeld)}<span style={{ fontSize: 11, marginLeft: 4 }}>USDC</span>
                  </p>
                  <p style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600 }}>Currently Held ({holdingEscrows.length} escrow{holdingEscrows.length === 1 ? "" : "s"})</p>
                </div>
                <div style={{ width: 1, height: 32, background: "var(--stroke)" }}/>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: disputedEscrows.length > 0 ? "var(--danger)" : "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace", marginBottom: 2 }}>
                    {disputedEscrows.length}
                  </p>
                  <p style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600 }}>Disputed {disputedEscrows.length > 0 ? "— needs attention" : "— all clear"}</p>
                </div>
              </div>
            </div>

            {/* Row 3 — transactions chart (5) + top links leaderboard (7) */}
            <div className="bento-cell bento-5">
              <div className="card" style={{ height: "100%" }}>
                <div className="card-head">
                  <div className="card-head-icon"><svg viewBox="0 0 20 20" fill="none" width="16" height="16"><rect x="3" y="4" width="14" height="13" rx="2" stroke="var(--info)" strokeWidth="1.3"/><path d="M7 2v4M13 2v4M3 9h14" stroke="var(--info)" strokeWidth="1.3" strokeLinecap="round"/></svg></div>
                  <div>
                    <div className="card-title">Transactions Over Time</div>
                    <div className="card-subtitle">{periodTxCount} in this period</div>
                  </div>
                </div>
                <div className="card-body">
                  {periodTxCount === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-3)", fontSize: 13 }}>No transactions in this period</div>
                  ) : (
                    <>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 140, marginBottom: 8 }}>
                        {chartData.map((d, i) => (
                          <div key={d.date} title={`${d.label}: ${d.count} tx`} style={{ flex: 1, height: `${Math.max((d.count / maxCount) * 100, d.count > 0 ? 3 : 1.5)}%`, background: d.count > 0 ? (i === chartData.length - 1 ? "var(--info)" : "rgba(91,143,249,.4)") : "var(--raised)", borderRadius: "3px 3px 0 0", transition: "height .4s ease", minHeight: 2 }}/>
                        ))}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                        {chartData.filter((_, i) => i % axisStep === 0 || i === chartData.length - 1).map(d => (
                          <span key={d.date} style={{ fontSize: 9, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>{d.label}</span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="bento-cell bento-7">
              <div className="card" style={{ height: "100%" }}>
                <div className="card-head">
                  <div className="card-head-icon"><svg viewBox="0 0 20 20" fill="none" width="16" height="16"><path d="M10 2l2.4 4.8 5.6.8-4 3.9.9 5.5L10 14.5l-4.9 2.5.9-5.5L2 7.6l5.6-.8L10 2z" stroke="var(--c)" strokeWidth="1.3" strokeLinejoin="round"/></svg></div>
                  <div><div className="card-title">Top Links</div><div className="card-subtitle">By amount received</div></div>
                </div>
                <div style={{ padding: "0 0 8px" }}>
                  {topLinks.length === 0 ? (
                    <div style={{ padding: 24, textAlign: "center", color: "var(--ink-3)", fontSize: 12 }}>No completed payments yet</div>
                  ) : topLinks.map((l, i) => (
                    <div key={l.id} style={{ padding: "12px 20px", borderBottom: i < topLinks.length - 1 ? "1px solid var(--stroke)" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                        <span style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace", width: 16, flexShrink: 0 }}>#{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.title}</p>
                            {l.isEscrow && <span style={{ fontSize: 8, color: "var(--info)", background: "var(--info-dim)", border: "1px solid var(--info-border)", borderRadius: 3, padding: "1px 4px", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, flexShrink: 0 }}>ESCROW</span>}
                          </div>
                          <p style={{ fontSize: 11, color: "var(--ink-3)" }}>{fmtDate(l.paidAt ?? l.createdAt)}</p>
                        </div>
                        <span style={{ fontSize: 13, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color: l.isEscrow ? "var(--info)" : "var(--c)", flexShrink: 0 }}>{fmt(parseFloat(l.amount))} <span style={{ fontSize: 10, color: "var(--ink-3)" }}>USDC</span></span>
                      </div>
                      <div style={{ height: 4, borderRadius: 4, background: "var(--raised)", overflow: "hidden", marginLeft: 28 }}>
                        <div style={{ height: "100%", width: `${(parseFloat(l.amount) / topTxAmount) * 100}%`, background: l.isEscrow ? "var(--info)" : "var(--c)", borderRadius: 4, transition: "width .5s ease" }}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Milestones — compact badge strip */}
            <div className="bento-cell bento-12">
              <div className="card">
                <div className="card-head">
                  <div className="card-head-icon">
                    <svg viewBox="0 0 20 20" fill="none" width="16" height="16"><path d="M10 2l2.4 4.8 5.6.8-4 3.9.9 5.5L10 14.5l-4.9 2.5.9-5.5L2 7.6l5.6-.8L10 2z" stroke="var(--c)" strokeWidth="1.3" strokeLinejoin="round"/></svg>
                  </div>
                  <div><div className="card-title">Milestones</div><div className="card-subtitle">{earnedMilestones.length} of {MILESTONES.length} unlocked</div></div>
                </div>
                <div className="card-body" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {earnedMilestones.map(m => (
                    <div key={m.id} title={m.desc} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(0,229,160,.07)", border: "1px solid var(--c-border)", borderRadius: "var(--r-full)" }}>
                      <div style={{ flexShrink: 0, display: "flex" }}>{MilestoneIcons[m.id]}</div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--c)" }}>{m.label}</span>
                    </div>
                  ))}
                  {lockedMilestones.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", padding: "8px 14px", background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: "var(--r-full)" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-3)" }}>+{lockedMilestones.length} locked</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* PnL share card */}
            <div className="bento-cell bento-12">
              <PnlCard
                address={address!}
                totalEarned={totalEarned}
                completedCount={allCompleted.length}
                completionRate={completionRate}
                avgPayment={avgPayment}
                biggestPayment={biggestPayment}
                series={chartData.map(d => d.amount)}
              />
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
