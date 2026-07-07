"use client";

import { useEffect, useRef, useState } from "react";

interface PublicStats {
  totalVolume: number;
  transactions: number;
  paymentLinks: number;
  escrows: number;
  splits: number;
  agents: number;
  marketplaceListings: number;
  x402Payments: number;
}

function useCountUp(target: number, active: boolean, duration = 1200) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>();

  useEffect(() => {
    if (!active) return;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, active, duration]);

  return value;
}

function StatCard({
  label, value, active, decimals = 0, suffix = "", accent = false,
}: { label: string; value: number; active: boolean; decimals?: number; suffix?: string; accent?: boolean }) {
  const n = useCountUp(value, active);
  const formatted = n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  return (
    <div className={`landing-stat-card${accent ? " landing-stat-card-accent" : ""}`}>
      <div className="landing-stat-value">
        {active ? formatted : <span className="stat-skeleton" />}
        {suffix && <span className="landing-stat-suffix">{suffix}</span>}
      </div>
      <div className="landing-stat-label">{label}</div>
    </div>
  );
}

export function LandingStats() {
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = (retriesLeft: number) => {
      fetch("/api/public-stats")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (cancelled) return;
          if (data) setStats(data);
          else if (retriesLeft > 0) setTimeout(() => load(retriesLeft - 1), 1500);
        })
        .catch(() => {
          if (!cancelled && retriesLeft > 0) setTimeout(() => load(retriesLeft - 1), 1500);
        });
    };
    load(1);

    return () => { cancelled = true; };
  }, []);

  const active = stats !== null;
  const d = stats ?? {
    totalVolume: 0, transactions: 0, paymentLinks: 0, escrows: 0,
    splits: 0, agents: 0, marketplaceListings: 0, x402Payments: 0,
  };

  return (
    <section className="landing-stats-section">
      <div className="landing-badge-row">
        <div className="landing-badge">
          <span className="landing-badge-dot pulse-dot" />
          First x402 facilitator live on Arc Network
        </div>
      </div>

      <div className="landing-stats-grid">
        <StatCard label="USDC Volume" value={d.totalVolume} active={active} decimals={2} suffix=" USDC" accent />
        <StatCard label="Payment Links" value={d.paymentLinks} active={active} />
        <StatCard label="Escrows Opened" value={d.escrows} active={active} />
        <StatCard label="Payment Splits" value={d.splits} active={active} />
        <StatCard label="Agent Wallets" value={d.agents} active={active} />
        <StatCard label="x402 Payments" value={d.x402Payments} active={active} />
      </div>
    </section>
  );
}
