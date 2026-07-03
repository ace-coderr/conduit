"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";

interface LinkItem {
  status: string;
}

const R = 52;
const CIRC = 2 * Math.PI * R;

export function StatusDonut({ refreshTrigger }: { refreshTrigger: number }) {
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

  const completed = links.filter((l) => l.status === "COMPLETED").length;
  const active = links.filter((l) => l.status === "ACTIVE").length;
  const expired = links.filter((l) => l.status === "EXPIRED").length;
  const total = completed + active + expired;

  const segments = [
    { label: "Completed", count: completed, color: "var(--c)" },
    { label: "Active", count: active, color: "var(--warning)" },
    { label: "Expired", count: expired, color: "var(--danger)" },
  ];

  let cumulative = 0;
  const hasData = mounted && isConnected && total > 0;

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-icon">
          <svg viewBox="0 0 20 20" fill="none" width="16" height="16"><circle cx="10" cy="10" r="7" stroke="var(--c)" strokeWidth="1.4" /></svg>
        </div>
        <div>
          <div className="card-title">Link Status</div>
          <div className="card-subtitle">Completed vs active vs expired</div>
        </div>
      </div>
      <div className="card-body" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {!mounted || !isConnected ? (
          <div className="chart-empty"><p>Connect your wallet to see status</p></div>
        ) : !hasData ? (
          <div className="chart-empty"><p>Create your first payment link to see a breakdown</p></div>
        ) : (
          <div className="donut-wrap">
            <svg viewBox="0 0 130 130" width="130" height="130">
              <circle cx="65" cy="65" r={R} fill="none" stroke="var(--raised)" strokeWidth="15" />
              {segments.filter((s) => s.count > 0).map((s) => {
                const dash = (s.count / total) * CIRC;
                const el = (
                  <circle
                    key={s.label}
                    cx="65" cy="65" r={R}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="15"
                    strokeDasharray={`${dash} ${CIRC - dash}`}
                    strokeDashoffset={-cumulative}
                    transform="rotate(-90 65 65)"
                  >
                    <title>{`${s.label}: ${s.count}`}</title>
                  </circle>
                );
                cumulative += dash;
                return el;
              })}
              <text x="65" y="61" textAnchor="middle" fontSize="26" fontWeight="800" fill="var(--ink-1)" fontFamily="'IBM Plex Mono', monospace">{total}</text>
              <text x="65" y="78" textAnchor="middle" fontSize="9" fill="var(--ink-3)" letterSpacing="1" fontFamily="'IBM Plex Mono', monospace">LINKS</text>
            </svg>
            <div className="donut-legend">
              {segments.map((s) => (
                <div key={s.label} className="donut-legend-row">
                  <span className="donut-legend-left">
                    <span className="donut-legend-dot" style={{ background: s.color }} />
                    {s.label}
                  </span>
                  <span className="donut-legend-count">{s.count} <span style={{ color: "var(--ink-3)", fontWeight: 500 }}>({total > 0 ? Math.round((s.count / total) * 100) : 0}%)</span></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
