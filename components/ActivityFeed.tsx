"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { formatUSDC } from "@/lib/utils";

interface LinkItem {
  id: string;
  title: string;
  amount: string;
  status: string;
  txHash?: string;
  paidAt?: string;
  createdAt: string;
  isEscrow?: boolean;
}

const FEED_LIMIT = 7;

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });
}

const statusColor = (s: string) => ({ COMPLETED: "var(--c)", ACTIVE: "var(--warning)", EXPIRED: "var(--danger)" }[s] ?? "var(--ink-3)");

export function ActivityFeed({ refreshTrigger }: { refreshTrigger: number }) {
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

  const recent = [...links]
    .sort((a, b) => new Date(b.paidAt ?? b.createdAt).getTime() - new Date(a.paidAt ?? a.createdAt).getTime())
    .slice(0, FEED_LIMIT);

  const hasData = mounted && isConnected && recent.length > 0;

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-head-icon">
          <svg viewBox="0 0 20 20" fill="none" width="16" height="16"><path d="M10 2v8l5 3" stroke="var(--c)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /><circle cx="10" cy="10" r="7.5" stroke="var(--c)" strokeWidth="1.4" /></svg>
        </div>
        <div>
          <div className="card-title">Recent Activity</div>
          <div className="card-subtitle">Latest links & escrow payments</div>
        </div>
      </div>
      <div className="card-body" style={{ flex: 1, display: "flex", flexDirection: "column", padding: 0, minHeight: 0 }}>
        {!mounted || !isConnected ? (
          <div className="feed-empty"><p>Connect your wallet to see activity</p></div>
        ) : !hasData ? (
          <div className="feed-empty"><p>No activity yet — create a link to get started</p></div>
        ) : (
          <>
            <div className="feed-list">
              {recent.map((l) => (
                <div key={l.id} className="feed-row">
                  <span className="feed-dot" style={{ background: statusColor(l.status) }} />
                  <div className="feed-info">
                    <div className="feed-title">
                      {l.title}
                      {l.isEscrow && <span className="stealth-badge" style={{ color: "#5b8ff9", background: "rgba(91,143,249,.1)", borderColor: "rgba(91,143,249,.25)" }}>escrow</span>}
                    </div>
                    <div className="feed-time">
                      {timeAgo(l.paidAt ?? l.createdAt)}
                      {l.txHash && (
                        <>
                          {" · "}
                          <a href={`https://testnet.arcscan.app/tx/${l.txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--c)", textDecoration: "none" }}>
                            view ↗
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="feed-amount" style={{ color: statusColor(l.status) }}>
                    {l.status === "COMPLETED" ? "+" : ""}{formatUSDC(l.amount)}
                  </span>
                </div>
              ))}
            </div>
            <a href="#payment-links-table" className="feed-view-all">
              View all payment links
              <svg viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M6 2v8M2.5 7L6 10.5 9.5 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
          </>
        )}
      </div>
    </div>
  );
}
