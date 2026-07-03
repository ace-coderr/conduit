"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";

interface LinkItem {
  amount: string;
  status: string;
  paidAt?: string;
  createdAt: string;
}

const DAYS = 14;
const W = 600;
const H = 170;
const PAD_TOP = 14;

function fmt(n: number) {
  return n % 1 === 0 ? n.toString() : n.toFixed(2);
}

export function VolumeChart({ refreshTrigger }: { refreshTrigger: number }) {
  const { address, isConnected } = useAccount();
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchLinks = useCallback(async () => {
    if (!address) return;
    try {
      const res = await fetch(`/api/links?address=${address}`);
      if (!res.ok) return;
      const data = await res.json();
      setLinks(data.links ?? []);
    } catch { }
  }, [address]);

  useEffect(() => {
    if (isConnected && address) fetchLinks();
  }, [isConnected, address, fetchLinks, refreshTrigger]);

  const completed = links.filter((l) => l.status === "COMPLETED");

  const series = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (DAYS - 1 - i));
    const key = d.toISOString().split("T")[0];
    const dayItems = completed.filter((l) => (l.paidAt ?? l.createdAt)?.startsWith(key));
    const amount = dayItems.reduce((s, l) => s + parseFloat(l.amount || "0"), 0);
    return { key, label: d.toLocaleDateString("en", { month: "short", day: "numeric" }), amount, count: dayItems.length };
  });

  const total = series.reduce((s, d) => s + d.amount, 0);
  const totalCount = series.reduce((s, d) => s + d.count, 0);
  const max = Math.max(...series.map((d) => d.amount), 1);
  const stepX = W / (series.length - 1);

  const points = series.map((d, i) => ({
    ...d,
    x: i * stepX,
    y: PAD_TOP + (H - PAD_TOP) * (1 - d.amount / max),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${H} L0,${H} Z`;

  const hasData = mounted && isConnected && total > 0;

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-icon">
          <svg viewBox="0 0 20 20" fill="none" width="16" height="16"><path d="M2 14l4-4 4 2 4-6 4 2" stroke="var(--c)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div>
          <div className="card-title">Volume</div>
          <div className="card-subtitle">
            {mounted && isConnected ? `${totalCount} payments · ${fmt(total)} USDC · last ${DAYS} days` : "Payment volume over time"}
          </div>
        </div>
      </div>
      <div className="card-body" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {!mounted || !isConnected ? (
          <div className="chart-empty">
            <p>Connect your wallet to see volume</p>
          </div>
        ) : !hasData ? (
          <div className="chart-empty">
            <p>No completed payments in the last {DAYS} days yet</p>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, minHeight: 0 }}>
              <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
                <defs>
                  <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--c)" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="var(--c)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={areaPath} fill="url(#volumeGradient)" stroke="none" />
                <path d={linePath} fill="none" stroke="var(--c)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                {points.map((p) => p.amount > 0 && (
                  <circle key={p.key} cx={p.x} cy={p.y} r="3.5" fill="var(--surface)" stroke="var(--c)" strokeWidth="1.8" vectorEffect="non-scaling-stroke">
                    <title>{`${p.label}: ${fmt(p.amount)} USDC (${p.count} payment${p.count === 1 ? "" : "s"})`}</title>
                  </circle>
                ))}
              </svg>
            </div>
            <div className="chart-axis-row">
              {series.filter((_, i) => i % 3 === 0 || i === series.length - 1).map((d) => (
                <span key={d.key} className="chart-axis-label">{d.label}</span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
