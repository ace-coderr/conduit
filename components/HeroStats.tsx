"use client";

import { useEffect, useRef, useState } from "react";

interface PublicStats {
  totalVolume: number;
  transactions: number;
  paymentLinks: number;
  escrows: number;
}

function useCountUp(target: number, active: boolean, duration = 1200) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>();

  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (target - from) * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, active, duration]);

  return value;
}

function StatPill({
  label, value, active, decimals = 0, suffix = "", className = "",
}: { label: string; value: number; active: boolean; decimals?: number; suffix?: string; className?: string }) {
  const n = useCountUp(value, active);
  const formatted = n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  return (
    <div className={`hero-stat-pill ${className}`}>
      <div className="hero-stat-pill-value">
        {formatted}
        {suffix && <span className="hero-stat-pill-suffix">{suffix}</span>}
      </div>
      <div className="hero-stat-pill-label">{label}</div>
    </div>
  );
}

export function HeroStats() {
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public-stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (!cancelled && data) setStats(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const active = stats !== null;
  const d = stats ?? { totalVolume: 0, transactions: 0, paymentLinks: 0, escrows: 0 };

  return (
    <>
      <StatPill className="hero-stat-pill-tl" label="Total Volume" value={d.totalVolume} active={active} decimals={2} suffix=" USDC" />
      <StatPill className="hero-stat-pill-tr" label="Transactions" value={d.transactions} active={active} />
      <StatPill className="hero-stat-pill-bl" label="Payment Links" value={d.paymentLinks} active={active} />
      <StatPill className="hero-stat-pill-br" label="Escrows" value={d.escrows} active={active} />
    </>
  );
}
