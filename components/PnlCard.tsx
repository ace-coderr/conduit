"use client";

import { useState, useId } from "react";

interface PnlCardProps {
  address: string;
  totalEarned: number;
  completedCount: number;
  completionRate: number;
  avgPayment: number;
  biggestPayment: number;
  /** Earnings-over-time series (same values feeding the page's volume chart) for the sparkline backdrop */
  series?: number[];
}

const SPARK_W = 400;
const SPARK_H = 60;

export function PnlCard({
  address,
  totalEarned,
  completedCount,
  completionRate,
  avgPayment,
  biggestPayment,
  series = [],
}: PnlCardProps) {
  const [downloading, setDownloading] = useState(false);
  const gradientId = `pnlSparkline-${useId()}`;

  const fmt = (n: number) => n.toFixed(2);
  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const sparkMax = Math.max(...series, 1);
  const sparkStepX = SPARK_W / Math.max(series.length - 1, 1);
  const sparkPoints = series.map((v, i) => ({ x: i * sparkStepX, y: SPARK_H * (1 - v / sparkMax) }));
  const sparkLine = sparkPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const sparkArea = sparkPoints.length > 1
    ? `${sparkLine} L${sparkPoints[sparkPoints.length - 1].x.toFixed(1)},${SPARK_H} L0,${SPARK_H} Z`
    : "";

  const downloadCard = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/og?address=${address}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `conduit-pnl-${address.slice(0, 8)}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      {/* Preview card */}
      <div style={{
        background: "#08090e",
        borderRadius: "var(--r-xl)",
        overflow: "hidden",
        border: "1px solid rgba(0,229,160,.15)",
        boxShadow: "0 0 40px rgba(0,229,160,.08)",
        position: "relative",
        marginBottom: 14,
      }}>
        {/* Banner image background */}
        <img
          src="/pnl-banner.jpeg"
          alt=""
          style={{
            position: "absolute",
            top: 0, left: 0,
            width: "100%", height: "100%",
            objectFit: "cover",
            opacity: 0.15,
            pointerEvents: "none",
          }}
        />

        {/* Centered icon watermark */}
        <img
          src="/favicon.png"
          alt=""
          style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400, height: 400,
            objectFit: "contain",
            opacity: 0.07,
            pointerEvents: "none",
          }}
        />

        {/* Top bar */}
        <div style={{ height: 3, background: "var(--c)", position: "relative" }} />

        <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 14, position: "relative" }}>

          {/* Header — icon mark + wordmark */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img src="/favicon.png" alt="" style={{ height: 22, width: 22, borderRadius: 6, objectFit: "contain" }} />
              <img src="/conduit-logo-white.png" alt="Conduit" style={{ height: 20, width: "auto", objectFit: "contain" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,229,160,.1)", border: "1px solid rgba(0,229,160,.22)", borderRadius: 20, padding: "3px 10px" }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--c)" }} />
                <span style={{ fontSize: 10, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, letterSpacing: ".08em" }}>ARC TESTNET</span>
              </div>
              <span style={{ fontSize: 9, color: "#424d5e", fontFamily: "IBM Plex Mono, monospace" }}>{today}</span>
            </div>
          </div>

          {/* Main number + earnings sparkline */}
          <div>
            <p style={{ fontSize: 11, color: "#8892a4", letterSpacing: ".08em", fontFamily: "IBM Plex Mono, monospace", marginBottom: 6, textTransform: "uppercase" }}>Lifetime Earnings</p>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
              <span style={{ fontSize: 52, fontWeight: 900, color: "var(--c)", lineHeight: 1, letterSpacing: "-.04em", fontFamily: "IBM Plex Mono, monospace" }}>{fmt(totalEarned)}</span>
              <span style={{ fontSize: 18, color: "var(--c)", fontWeight: 700, marginBottom: 6, fontFamily: "IBM Plex Mono, monospace" }}>USDC</span>
            </div>

            {sparkArea && (
              <svg viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} preserveAspectRatio="none" style={{ width: "100%", height: 44, display: "block", marginTop: 8 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--c)" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="var(--c)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={sparkArea} fill={`url(#${gradientId})`} stroke="none" />
                <path d={sparkLine} fill="none" stroke="var(--c)" strokeOpacity="0.5" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              </svg>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.06)" }}>
            {[
              { label: "PAYMENTS", value: completedCount.toString(), unit: "" },
              { label: "COMPLETION", value: `${completionRate}`, unit: "%" },
              { label: "AVG PAYMENT", value: fmt(avgPayment), unit: "USDC" },
              { label: "BIGGEST", value: fmt(biggestPayment), unit: "USDC" },
            ].map((s, i) => (
              <div key={s.label} style={{ paddingLeft: i === 0 ? 0 : 16, borderLeft: i === 0 ? "none" : "1px solid rgba(255,255,255,.06)" }}>
                <p style={{ fontSize: 8, color: "#424d5e", letterSpacing: ".14em", fontFamily: "IBM Plex Mono, monospace", marginBottom: 4, textTransform: "uppercase" }}>{s.label}</p>
                <p style={{ fontSize: 15, color: "var(--c)", fontWeight: 800, fontFamily: "IBM Plex Mono, monospace", letterSpacing: "-.02em" }}>
                  {s.value}{s.unit && <span style={{ fontSize: 10, color: "#424d5e", fontWeight: 700, marginLeft: 3 }}>{s.unit}</span>}
                </p>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "#424d5e", fontFamily: "IBM Plex Mono, monospace" }}>{shortAddr}</span>
            <span style={{ fontSize: 9, color: "#424d5e", fontFamily: "IBM Plex Mono, monospace" }}>conduitpay.xyz</span>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ height: 2, background: "var(--c)", opacity: 0.35 }} />
      </div>

      {/* Download button */}
      <button
        onClick={downloadCard}
        disabled={downloading}
        style={{
          width: "100%",
          padding: "13px",
          background: downloading ? "var(--raised)" : "var(--c)",
          border: "none",
          borderRadius: "var(--r-md)",
          color: downloading ? "var(--ink-2)" : "#000",
          fontSize: 14,
          fontWeight: 700,
          cursor: downloading ? "not-allowed" : "pointer",
          fontFamily: "Sora, sans-serif",
          transition: "all .15s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          boxShadow: downloading ? "none" : "0 4px 16px rgba(0,229,160,.35)",
        }}
      >
        {downloading ? (
          <>
            <div style={{ width: 14, height: 14, border: "2px solid var(--ink-3)", borderTopColor: "var(--ink-1)", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
            Generating...
          </>
        ) : (
          <>
            <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
              <path d="M8 2v8M5 7l3 3 3-3M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Download PnL Card
          </>
        )}
      </button>
      <p style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "center", marginTop: 8 }}>PNG · 800×420px · Ready to share on X</p>
    </div>
  );
}