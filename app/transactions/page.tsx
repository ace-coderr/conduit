"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { NavBar } from "@/components/NavBar";
import { formatUSDC, formatDate, shortenAddress } from "@/lib/utils";

type Direction = "received" | "sent";
type Tab = "payments" | "escrow" | "splits";

interface PaymentTx {
  id: string; title: string; amount: string; status: string;
  txHash?: string; counterparty?: string; paidAt?: string; createdAt: string; direction: Direction;
}
interface EscrowTx {
  id: string; title: string; amount: string; status: string; isRefunded: boolean;
  txHash?: string; releaseTxHash?: string; counterparty?: string; deliveryDays?: number;
  paidAt?: string; createdAt: string; direction: Direction;
}
interface SplitSentTx {
  id: string; title: string; amount: string; status: string; txHash?: string;
  recipientCount: number; sentLegs: number; distributedAt?: string; createdAt: string;
}
interface SplitRecvTx {
  id: string; title: string; amount: string; totalAmount: string; percentage: number;
  status: string; payoutStatus: string; txHash?: string; distributedAt?: string; createdAt: string;
}

interface AllData {
  payments: { received: PaymentTx[]; sent: PaymentTx[] };
  escrow: { received: EscrowTx[]; sent: EscrowTx[] };
  splits: { sent: SplitSentTx[]; received: SplitRecvTx[] };
}

function TxSkeleton() {
  return (
    <div className="tx-row">
      <div><div className="skeleton" style={{ width: "55%", height: 13, marginBottom: 6, borderRadius: 4 }} /><div className="skeleton" style={{ width: "35%", height: 10, borderRadius: 4 }} /></div>
      <div className="skeleton" style={{ width: 80, height: 14, borderRadius: 4 }} />
      <div className="skeleton" style={{ width: 90, height: 12, borderRadius: 4 }} />
      <div className="skeleton" style={{ width: 70, height: 12, borderRadius: 4 }} />
      <div className="skeleton" style={{ width: 100, height: 12, borderRadius: 4 }} />
    </div>
  );
}

const escrowStatusColor = (s: string) => ({
  HOLDING: "#5b8ff9", CONFIRMED: "#00E5A0", RELEASED: "#00E5A0",
  DISPUTED: "#f03e5f", MEDIATION: "#a78bfa", CANCELLED: "#f03e5f",
}[s] ?? "#666");

const escrowStatusLabel = (s: string, isRefunded: boolean) => {
  if (isRefunded) return "REFUNDED";
  return { HOLDING: "AWAITING", CONFIRMED: "RELEASED", RELEASED: "RELEASED", DISPUTED: "DISPUTED", MEDIATION: "MEDIATION", CANCELLED: "CANCELLED" }[s] ?? s;
};

const EMPTY: AllData = {
  payments: { received: [], sent: [] },
  escrow: { received: [], sent: [] },
  splits: { sent: [], received: [] },
};

export default function TransactionsPage() {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<Tab>("payments");
  const [dir, setDir] = useState<Direction>("received");
  const [data, setData] = useState<AllData>(EMPTY);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!address) return;
    setIsLoading(true);
    fetch(`/api/transactions/all?address=${address}`)
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
        return d as AllData;
      })
      .then((d: AllData) => setData({
        payments: d.payments ?? EMPTY.payments,
        escrow: d.escrow ?? EMPTY.escrow,
        splits: d.splits ?? EMPTY.splits,
      }))
      .catch(err => { console.error("[transactions] load failed:", err); setData(EMPTY); })
      .finally(() => setIsLoading(false));
  }, [address]);

  const fmt = (n: number) => n % 1 === 0 ? n.toString() : n.toFixed(2);

  // Totals
  const totalReceived = data.payments.received.reduce((s, l) => s + parseFloat(l.amount), 0);
  const totalSent = data.payments.sent.reduce((s, l) => s + parseFloat(l.amount), 0);
  const totalEscrowReleased = data.escrow.received.filter(e => ["CONFIRMED", "RELEASED"].includes(e.status)).reduce((s, e) => s + parseFloat(e.amount), 0);
  const totalSplitReceived = data.splits.received.reduce((s, r) => s + parseFloat(r.amount), 0);

  // Current view rows
  const splitRows = tab === "splits" ? (dir === "sent" ? data.splits.sent : data.splits.received) : [];
  const paymentRows = tab === "payments" ? data.payments[dir] : [];
  const escrowRows = tab === "escrow" ? data.escrow[dir] : [];
  const currentCount = tab === "payments" ? paymentRows.length : tab === "escrow" ? escrowRows.length : splitRows.length;

  const download = (rows: string[][], filename: string) => {
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    if (tab === "payments") {
      if (!paymentRows.length) return;
      const label = dir === "sent" ? "To" : "From";
      const rows = [["Title", "Amount (USDC)", label, "Date", "TX Hash"],
      ...paymentRows.map(tx => [tx.title, tx.amount, tx.counterparty ?? "", formatDate(tx.createdAt), tx.txHash ?? ""])];
      download(rows, `conduit-payments-${dir}.csv`);
    } else if (tab === "escrow") {
      if (!escrowRows.length) return;
      const label = dir === "sent" ? "Seller" : "Buyer";
      const rows = [["Title", "Amount (USDC)", "Status", label, "Date", "TX Hash"],
      ...escrowRows.map(tx => [tx.title, tx.amount, escrowStatusLabel(tx.status, tx.isRefunded), tx.counterparty ?? "", tx.paidAt ? formatDate(tx.paidAt) : "", tx.txHash ?? ""])];
      download(rows, `conduit-escrow-${dir}.csv`);
    } else {
      if (!splitRows.length) return;
      if (dir === "sent") {
        const rows = [["Title", "Total (USDC)", "Status", "Recipients", "Date", "Funding TX"],
        ...(splitRows as SplitSentTx[]).map(tx => [tx.title, tx.amount, tx.status, String(tx.recipientCount), formatDate(tx.createdAt), tx.txHash ?? ""])];
        download(rows, "conduit-splits-sent.csv");
      } else {
        const rows = [["Title", "Your Share (USDC)", "Percentage", "Status", "Date", "Payout TX"],
        ...(splitRows as SplitRecvTx[]).map(tx => [tx.title, tx.amount, `${tx.percentage}%`, tx.payoutStatus, formatDate(tx.createdAt), tx.txHash ?? ""])];
        download(rows, "conduit-splits-received.csv");
      }
    }
  };

  return (
    <div className="app">
      <NavBar />
      <div className="page-wrap">
        <div className="page-header">
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">Your complete payment, escrow and split history — sent and received</p>
        </div>

        {/* Stats */}
        {mounted && isConnected && (
          <div className="tx-stats">
            {[
              { label: "Total Received", value: fmt(totalReceived + totalEscrowReleased + totalSplitReceived), unit: "USDC", color: "var(--c)", sub: "across all types" },
              { label: "Total Sent", value: fmt(totalSent), unit: "USDC", color: "#5b8ff9", sub: `${data.payments.sent.length} payments` },
              { label: "Escrow Released", value: fmt(totalEscrowReleased), unit: "USDC", color: "#00E5A0", sub: `${data.escrow.received.filter(e => ["CONFIRMED", "RELEASED"].includes(e.status)).length} completed` },
              { label: "Split Income", value: fmt(totalSplitReceived), unit: "USDC", color: "#a78bfa", sub: `${data.splits.received.length} received` },
            ].map(s => (
              <div key={s.label} className="tx-stat">
                <div className="tx-stat-bar" style={{ background: s.color }} />
                <div className="tx-stat-val">{s.value}{s.unit && <span style={{ fontSize: 13, color: s.color, fontWeight: 700, marginLeft: 4, fontFamily: "IBM Plex Mono, monospace" }}>{s.unit}</span>}</div>
                <div className="tx-stat-label">{s.label}</div>
                <div className="tx-stat-sub">{s.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Card */}
        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
          <div className="table-head" style={{ flexWrap: "wrap", gap: 10 }}>
            {/* Type tabs */}
            <div style={{ display: "flex", gap: 4, background: "var(--bg)", borderRadius: "var(--r-sm)", padding: 3 }}>
              {([["payments", "Payments"], ["escrow", "Escrow"], ["splits", "Splits"]] as const).map(([t, label]) => {
                const n = t === "payments" ? data.payments.received.length + data.payments.sent.length
                  : t === "escrow" ? data.escrow.received.length + data.escrow.sent.length
                    : data.splits.received.length + data.splits.sent.length;
                return (
                  <button key={t} onClick={() => setTab(t)} style={{ padding: "7px 18px", borderRadius: 6, border: "none", background: tab === t ? "var(--surface)" : "transparent", color: tab === t ? "var(--ink-1)" : "var(--ink-3)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Sora, sans-serif", transition: "all .15s" }}>
                    {label}
                    <span style={{ marginLeft: 6, fontSize: 10, fontFamily: "IBM Plex Mono, monospace", color: tab === t ? "var(--c)" : "var(--ink-3)" }}>{n}</span>
                  </button>
                );
              })}
            </div>

            {/* Direction toggle */}
            <div style={{ display: "flex", gap: 4, background: "var(--bg)", borderRadius: "var(--r-sm)", padding: 3 }}>
              {([["received", "Received"], ["sent", "Sent"]] as const).map(([d, label]) => {
                const n = tab === "payments" ? data.payments[d].length
                  : tab === "escrow" ? data.escrow[d].length
                    : data.splits[d].length;
                const activeColor = d === "received" ? "var(--c)" : "#5b8ff9";
                return (
                  <button key={d} onClick={() => setDir(d)} style={{ padding: "7px 16px", borderRadius: 6, border: "none", background: dir === d ? "var(--surface)" : "transparent", color: dir === d ? "var(--ink-1)" : "var(--ink-3)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Sora, sans-serif", transition: "all .15s" }}>
                    {label}
                    <span style={{ marginLeft: 6, fontSize: 10, fontFamily: "IBM Plex Mono, monospace", color: dir === d ? activeColor : "var(--ink-3)" }}>{n}</span>
                  </button>
                );
              })}
            </div>

            <button className="btn-sm" onClick={exportCSV} disabled={currentCount === 0 || isLoading} style={{ marginLeft: "auto" }}>
              Export CSV
            </button>
          </div>

          {/* ── PAYMENTS ── */}
          {tab === "payments" && (
            <>
              {paymentRows.length > 0 && !isLoading && (
                <div className="tx-cols">
                  {["DESCRIPTION", "AMOUNT", dir === "sent" ? "TO" : "FROM", "DATE", "TX HASH"].map(c => (
                    <span key={c} className="tx-col">{c}</span>
                  ))}
                </div>
              )}
              <div style={{ overflowY: "auto", maxHeight: 520 }}>
                {!mounted || !isConnected ? (
                  <div className="empty"><p className="empty-title">Connect your wallet</p><p className="empty-sub">Connect to view transactions</p></div>
                ) : isLoading ? (
                  <>{[1, 2, 3, 4, 5].map(i => <TxSkeleton key={i} />)}</>
                ) : paymentRows.length === 0 ? (
                  <div className="empty">
                    <p className="empty-title">No {dir} payments yet</p>
                    <p className="empty-sub">{dir === "sent" ? "Payment links you pay will appear here" : "Completed payment links will appear here"}</p>
                  </div>
                ) : paymentRows.map(tx => (
                  <div key={tx.id} className="tx-row fade-in">
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <p className="tx-name">{tx.title}</p>
                        <span style={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color: dir === "sent" ? "#5b8ff9" : "var(--c)", background: dir === "sent" ? "rgba(91,143,249,.1)" : "var(--c-dim)", border: `1px solid ${dir === "sent" ? "rgba(91,143,249,.25)" : "var(--c-border)"}`, borderRadius: 4, padding: "1px 5px" }}>{dir === "sent" ? "SENT" : "PAYMENT"}</span>
                      </div>
                      {tx.paidAt && <p className="tx-date-sm">{dir === "sent" ? "Paid" : "Received"} {formatDate(tx.paidAt)}</p>}
                    </div>
                    <span className="tx-amount" style={{ color: dir === "sent" ? "#5b8ff9" : undefined }}>
                      {dir === "sent" ? "-" : "+"}{formatUSDC(tx.amount)}
                      <span style={{ fontSize: 10, color: dir === "sent" ? "#5b8ff9" : "var(--c)", marginLeft: 3, fontWeight: 700 }}>USDC</span>
                    </span>
                    <span className="tx-from">{tx.counterparty ? shortenAddress(tx.counterparty) : "—"}</span>
                    <span className="tx-date">{formatDate(tx.createdAt)}</span>
                    {tx.txHash ? (
                      <a href={`https://testnet.arcscan.app/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer" className="tx-link">{tx.txHash.slice(0, 6)}...{tx.txHash.slice(-4)} ↗</a>
                    ) : <span className="tx-date">—</span>}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── ESCROW ── */}
          {tab === "escrow" && (
            <>
              {escrowRows.length > 0 && !isLoading && (
                <div className="tx-cols" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr" }}>
                  {["TITLE", "STATUS", "AMOUNT", dir === "sent" ? "SELLER" : "BUYER", "DATE", "LINK"].map(c => (
                    <span key={c} className="tx-col">{c}</span>
                  ))}
                </div>
              )}
              <div style={{ overflowY: "auto", maxHeight: 520 }}>
                {!mounted || !isConnected ? (
                  <div className="empty"><p className="empty-title">Connect your wallet</p><p className="empty-sub">Connect to view escrow history</p></div>
                ) : isLoading ? (
                  <>{[1, 2, 3, 4, 5].map(i => <TxSkeleton key={i} />)}</>
                ) : escrowRows.length === 0 ? (
                  <div className="empty">
                    <p className="empty-title">No {dir === "sent" ? "purchases" : "sales"} yet</p>
                    <p className="empty-sub">{dir === "sent" ? "Escrows you buy into will appear here" : "Escrows you sell will appear here"}</p>
                  </div>
                ) : escrowRows.map(tx => (
                  <div key={tx.id} className="tx-row fade-in" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr" }}>
                    <div>
                      <p className="tx-name">{tx.title}</p>
                      {tx.deliveryDays && <p className="tx-date-sm">{tx.deliveryDays} day delivery</p>}
                    </div>
                    <div>
                      <span style={{
                        fontSize: 9, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700,
                        color: tx.isRefunded ? "var(--danger)" : escrowStatusColor(tx.status),
                        background: tx.isRefunded ? "rgba(240,62,95,.1)" : `${escrowStatusColor(tx.status)}18`,
                        border: `1px solid ${tx.isRefunded ? "rgba(240,62,95,.25)" : `${escrowStatusColor(tx.status)}40`}`,
                        borderRadius: 4, padding: "1px 5px",
                      }}>
                        {escrowStatusLabel(tx.status, tx.isRefunded)}
                      </span>
                    </div>
                    <span className="tx-amount" style={{ color: dir === "sent" ? "#5b8ff9" : (tx.isRefunded ? "var(--danger)" : undefined) }}>
                      {dir === "sent" ? "-" : (tx.isRefunded ? "-" : "+")}{formatUSDC(tx.amount)}
                      <span style={{ fontSize: 10, color: dir === "sent" ? "#5b8ff9" : (tx.isRefunded ? "var(--danger)" : "#5b8ff9"), marginLeft: 3, fontWeight: 700 }}>USDC</span>
                    </span>
                    <span className="tx-from">{tx.counterparty ? shortenAddress(tx.counterparty) : "—"}</span>
                    <span className="tx-date">{formatDate(tx.paidAt ?? tx.createdAt)}</span>
                    <a href={`/escrow/${tx.id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#5b8ff9", fontWeight: 700, textDecoration: "none" }}>
                      Open ↗
                    </a>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── SPLITS ── */}
          {tab === "splits" && (
            <>
              {splitRows.length > 0 && !isLoading && (
                <div className="tx-cols" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr" }}>
                  {dir === "sent"
                    ? ["TITLE", "STATUS", "TOTAL", "RECIPIENTS", "DATE", "LINK"].map(c => <span key={c} className="tx-col">{c}</span>)
                    : ["TITLE", "STATUS", "YOUR SHARE", "PERCENT", "DATE", "PAYOUT"].map(c => <span key={c} className="tx-col">{c}</span>)
                  }
                </div>
              )}
              <div style={{ overflowY: "auto", maxHeight: 520 }}>
                {!mounted || !isConnected ? (
                  <div className="empty"><p className="empty-title">Connect your wallet</p><p className="empty-sub">Connect to view split history</p></div>
                ) : isLoading ? (
                  <>{[1, 2, 3, 4, 5].map(i => <TxSkeleton key={i} />)}</>
                ) : splitRows.length === 0 ? (
                  <div className="empty">
                    <p className="empty-title">No {dir === "sent" ? "splits funded" : "splits received"} yet</p>
                    <p className="empty-sub">{dir === "sent" ? "Splits you pay into will appear here" : "Splits paying out to you will appear here"}</p>
                  </div>
                ) : dir === "sent" ? (
                  (splitRows as SplitSentTx[]).map(tx => {
                    const splitColor = tx.status === "COMPLETED" ? "#00E5A0" : tx.status === "FAILED" ? "#f03e5f" : "#a78bfa";
                    return (
                      <div key={tx.id} className="tx-row fade-in" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr" }}>
                        <div>
                          <p className="tx-name">{tx.title}</p>
                          {tx.sentLegs > 0 && <p className="tx-date-sm">{tx.sentLegs}/{tx.recipientCount} paid out</p>}
                        </div>
                        <div>
                          <span style={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color: splitColor, background: `${splitColor}18`, border: `1px solid ${splitColor}40`, borderRadius: 4, padding: "1px 5px" }}>{tx.status}</span>
                        </div>
                        <span className="tx-amount" style={{ color: "#5b8ff9" }}>-{formatUSDC(tx.amount)}<span style={{ fontSize: 10, color: "#5b8ff9", marginLeft: 3, fontWeight: 700 }}>USDC</span></span>
                        <span className="tx-from">{tx.recipientCount} wallets</span>
                        <span className="tx-date">{formatDate(tx.distributedAt ?? tx.createdAt)}</span>
                        {tx.txHash ? (
                          <a href={`https://testnet.arcscan.app/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700, textDecoration: "none" }}>Funding ↗</a>
                        ) : <span className="tx-date">—</span>}
                      </div>
                    );
                  })
                ) : (
                  (splitRows as SplitRecvTx[]).map(tx => {
                    const pc = tx.payoutStatus === "SENT" ? "#00E5A0" : tx.payoutStatus === "FAILED" ? "#f03e5f" : "#a78bfa";
                    return (
                      <div key={tx.id} className="tx-row fade-in" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr" }}>
                        <div>
                          <p className="tx-name">{tx.title}</p>
                          <p className="tx-date-sm">of {formatUSDC(tx.totalAmount)} USDC total</p>
                        </div>
                        <div>
                          <span style={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, color: pc, background: `${pc}18`, border: `1px solid ${pc}40`, borderRadius: 4, padding: "1px 5px" }}>{tx.payoutStatus}</span>
                        </div>
                        <span className="tx-amount">+{formatUSDC(tx.amount)}<span style={{ fontSize: 10, color: "var(--c)", marginLeft: 3, fontWeight: 700 }}>USDC</span></span>
                        <span className="tx-from">{tx.percentage}%</span>
                        <span className="tx-date">{formatDate(tx.distributedAt ?? tx.createdAt)}</span>
                        {tx.txHash ? (
                          <a href={`https://testnet.arcscan.app/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--c)", fontWeight: 700, textDecoration: "none" }}>Payout ↗</a>
                        ) : <span className="tx-date">—</span>}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <footer className="app-footer">
        <span>Conduit v0.1.0</span>
        <div className="footer-links">
          <a href="https://x.com/conduit_pay" target="_blank" rel="noopener noreferrer" className="footer-link">
            <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.845L1.255 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
          </a>
          <a href="https://t.me/conduit_community" target="_blank" rel="noopener noreferrer" className="footer-link">
            <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.667l-2.94-.918c-.64-.203-.654-.64.136-.954l11.49-4.43c.532-.194.998.131.838.856z" /></svg>
          </a>
        </div>
        <span>Built on Arc Network · Powered by Circle</span>
      </footer>
    </div>
  );
}