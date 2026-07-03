"use client";

import { useAccount, useBalance } from "wagmi";
import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { arcTestnet } from "@/lib/arcChain";
import { shortenAddress, copyToClipboard } from "@/lib/utils";

interface StatsRowProps {
  totalLinks: number;
  completedLinks: number;
  totalEarned: string;
}

const STATS = (bal: string, totalLinks: number, completedLinks: number, totalEarned: string) => [
  {
    label: "Wallet Balance",
    value: bal,
    sub: "Available to spend",
    bento: "bento-5",
    cardClass: "stat-card-balance stat-card-hero",
    icon: (
      <svg viewBox="0 0 18 18" fill="var(--c)" width="18" height="18">
        <path d="M2 5a2 2 0 012-2h10a2 2 0 012 2v1H2V5zm0 3h14v6a2 2 0 01-2 2H4a2 2 0 01-2-2V8zm9 2a1 1 0 100 2h1a1 1 0 100-2h-1z" />
      </svg>
    ),
  },
  {
    label: "Payment Links",
    value: totalLinks.toString(),
    sub: `${completedLinks} completed`,
    bento: "bento-4",
    cardClass: "stat-card-has-footer",
    icon: (
      <svg viewBox="0 0 18 18" fill="none" stroke="var(--c)" strokeWidth="1.5" width="16" height="16">
        <path d="M10.5 7.5a3.5 3.5 0 010 4.95l-1.5 1.5a3.5 3.5 0 01-4.95-4.95l.75-.75" strokeLinecap="round" />
        <path d="M7.5 10.5a3.5 3.5 0 010-4.95l1.5-1.5a3.5 3.5 0 014.95 4.95l-.75.75" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Network",
    value: "Arc Testnet",
    sub: "Chain ID 5042002",
    bento: "bento-3",
    cardClass: "stat-card-has-footer",
    icon: (
      <svg viewBox="0 0 18 18" fill="var(--c)" width="16" height="16">
        <path fillRule="evenodd" d="M9 1a8 8 0 100 16A8 8 0 009 1zM4.5 9a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zm4.5-2a2 2 0 100 4 2 2 0 000-4z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: "Total Earned",
    value: totalEarned !== "0" ? `${parseFloat(totalEarned).toLocaleString()} USDC` : "—",
    sub: "From completed payments",
    hero: true,
    wide: true,
    bento: "bento-12",
    cardClass: "",
    icon: (
      <svg viewBox="0 0 18 18" fill="var(--c)" width="20" height="20">
        <path fillRule="evenodd" d="M9 1a8 8 0 100 16A8 8 0 009 1zm.75 4.5v.5h.75a.75.75 0 010 1.5H9.75v.5a.75.75 0 01-1.5 0V7.5H7.5a.75.75 0 010-1.5h.75v-.5a.75.75 0 011.5 0zm-3 5.25a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75z" clipRule="evenodd" />
      </svg>
    ),
  },
];

export function StatsRow({ totalLinks, completedLinks, totalEarned }: StatsRowProps) {
  const { address } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [addrCopied, setAddrCopied] = useState(false);

  const { data: balance } = useBalance({ address, chainId: arcTestnet.id });

  useEffect(() => { setMounted(true); }, []);

  const bal = balance
    ? `${parseFloat(formatEther(balance.value)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`
    : "0.00 USDC";

  const stats = STATS(bal, totalLinks, completedLinks, totalEarned);

  const handleCopyAddress = async () => {
    if (!address) return;
    const ok = await copyToClipboard(address);
    if (ok) {
      setAddrCopied(true);
      setTimeout(() => setAddrCopied(false), 2000);
    }
  };

  return (
    <>
      {stats.map((s) =>
        s.wide ? (
          <div key={s.label} className={`stat-card ${s.bento} stat-card-hero stat-card-wide fade-up`}>
            <div className="stat-card-top-line" />
            <div className="stat-icon-wrap stat-icon-wrap-hero">{s.icon}</div>
            <div className="stat-wide-body">
              <div className="stat-value">
                {mounted ? s.value : <span className="skeleton stat-skeleton" />}
              </div>
              <div className="stat-label">{s.label}</div>
            </div>
            <div className="stat-sub stat-wide-sub">{s.sub}</div>
          </div>
        ) : (
          <div key={s.label} className={`stat-card ${s.bento}${s.cardClass ? ` ${s.cardClass}` : ""} fade-up`}>
            {s.label === "Wallet Balance" && <div className="stat-card-top-line" />}
            <div className="stat-top">
              <div className="stat-icon-wrap">{s.icon}</div>
              <div className="stat-value">
                {mounted ? s.value : <span className="skeleton stat-skeleton" />}
              </div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>

            {s.label === "Wallet Balance" && address && (
              <div className="stat-card-footer">
                <div className="stat-addr-row">
                  <span className="stat-addr">
                    <svg viewBox="0 0 14 14" fill="none" width="11" height="11"><rect x="2" y="5" width="10" height="7" rx="1.3" stroke="currentColor" strokeWidth="1.2" /><path d="M4 5V3.8a3 3 0 016 0V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                    {shortenAddress(address)}
                  </span>
                  <button type="button" onClick={handleCopyAddress} className={`stat-addr-copy${addrCopied ? " copied" : ""}`}>
                    {addrCopied ? "✓ Copied" : "Copy"}
                  </button>
                </div>
                <a href={`https://testnet.arcscan.app/address/${address}`} target="_blank" rel="noopener noreferrer" className="stat-explorer-link">
                  View on ArcScan
                  <svg viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M4 2h6v6M10 2L2 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </a>
              </div>
            )}

            {s.label === "Payment Links" && (
              <div className="stat-card-footer">
                <a href="#payment-links-table" className="stat-explorer-link">
                  View all links
                  <svg viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M6 2v8M2.5 7L6 10.5 9.5 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </a>
              </div>
            )}

            {s.label === "Network" && (
              <div className="stat-card-footer">
                <div className="pay-detail">
                  <span className="pay-detail-k">Gas fees</span>
                  <span className="pay-detail-v">Free</span>
                </div>
              </div>
            )}
          </div>
        )
      )}
    </>
  );
}
