"use client";

import { useState, useEffect } from "react";
import {
    useAccount, useConnect, useDisconnect,
    useSendTransaction, useWaitForTransactionReceipt,
    useSwitchChain,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { parseEther } from "viem";
import { arcTestnet } from "@/lib/arcChain";
import { formatUSDC, shortenAddress } from "@/lib/utils";

interface Recipient { address: string; percentage: number; label?: string; }
interface Payout { address: string; amount: string; txHash?: string; status: string; label?: string; }

interface SplitData {
    id: string;
    title: string;
    description?: string;
    amount: string;
    splitAddress: string;
    recipients: Recipient[];
    status: string;
    txHash?: string;
    payouts?: Payout[];
}

interface FeeInfo { fee: string; recipientAmount: string; feePercent: string; }

function fmt(n: number) {
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Logo() {
    return (
        <div className="pay-logo">
            <img src="/conduit-logo-white.png" alt="Conduit" style={{ height: 58, width: "auto", objectFit: "contain" }} />
        </div>
    );
}

type Step = "idle" | "sending" | "distributing" | "done" | "failed";

export function SplitPayClient({ split, fee }: { split: SplitData; fee: FeeInfo }) {
    const [mounted, setMounted] = useState(false);
    const [step, setStep] = useState<Step>(split.status === "COMPLETED" ? "done" : "idle");
    const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
    const [error, setError] = useState("");
    const [payouts, setPayouts] = useState<Payout[]>(split.payouts ?? []);

    const { address, isConnected, chainId } = useAccount();
    const { connect } = useConnect();
    const { disconnect } = useDisconnect();
    const { switchChain } = useSwitchChain();
    const isOnArc = chainId === arcTestnet.id;

    const { sendTransactionAsync } = useSendTransaction();
    const { data: receipt } = useWaitForTransactionReceipt({ hash: txHash, query: { enabled: !!txHash } });

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (!receipt || step !== "sending") return;
        (async () => {
            try {
                setStep("distributing");
                const res = await fetch(`/api/splits/${split.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "pay", txHash, paidBy: address }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || "Distribution failed.");
                setPayouts(data.payouts ?? []);
                if (data.success) setStep("done");
                else { setError(data.error || "Some payouts failed."); setStep("failed"); }
            } catch (err: any) {
                setError(err?.message || "Distribution failed.");
                setStep("failed");
            }
        })();
    }, [receipt]);

    const totalPays = (parseFloat(split.amount) + parseFloat(fee.fee)).toFixed(4);
    const isPaid = ["HOLDING", "DISTRIBUTING", "COMPLETED", "FAILED"].includes(split.status) || step === "done";

    const handlePay = async () => {
        if (!isConnected || !address) { connect({ connector: injected() }); return; }
        if (!isOnArc) { switchChain({ chainId: arcTestnet.id }); return; }
        setError("");
        setStep("sending");
        try {
            const hash = await sendTransactionAsync({
                to: split.splitAddress as `0x${string}`,
                value: parseEther(split.amount),
            });
            setTxHash(hash);
        } catch (err: any) {
            setError(err?.shortMessage || err?.message || "Transaction rejected.");
            setStep("failed");
        }
    };

    const handleRetry = async () => {
        setError("");
        setStep("distributing");
        try {
            const res = await fetch(`/api/splits/${split.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "retry" }),
            });
            const data = await res.json();
            setPayouts(data.payouts ?? []);
            if (data.success) setStep("done");
            else { setError(data.error || "Retry failed."); setStep("failed"); }
        } catch (err: any) {
            setError(err?.message || "Retry failed.");
            setStep("failed");
        }
    };

    if (!mounted) return null;

    // Success view
    if (step === "done") {
        return (
            <div className="pay-page">
                <Logo />
                <p className="pay-tagline">SPLIT PAYMENT</p>
                <div className="pay-card">
                    <div className="pay-card-bar" />
                    <div style={{ padding: "40px 28px" }}>
                        <div className="pay-success-icon">
                            <svg viewBox="0 0 24 24" fill="none" width="30" height="30"><path d="M5 13l4 4 10-10" stroke="var(--c)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                        <p className="pay-success-title">Split Distributed</p>
                        <p style={{ textAlign: "center", fontSize: 13, color: "var(--ink-3)", marginBottom: 22 }}>
                            All {split.recipients.length} recipients have been paid.
                        </p>
                        <div className="pay-details" style={{ borderRadius: "var(--r-md)", border: "1px solid var(--stroke)" }}>
                            {payouts.map((p, i) => (
                                <div className="pay-detail" key={i}>
                                    <span className="pay-detail-k">{p.label || shortenAddress(p.address)}</span>
                                    <span className="pay-detail-v">
                                        {fmt(parseFloat(p.amount))} USDC
                                        {p.txHash && (
                                            <a href={`https://testnet.arcscan.app/tx/${p.txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--c)", marginLeft: 4 }}>↗</a>
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <p className="pay-powered" style={{ paddingBottom: 22 }}>Powered by Conduit · Arc Network · Circle USDC</p>
                </div>
            </div>
        );
    }

    return (
        <div className="pay-page">
            <Logo />
            <p className="pay-tagline">SPLIT PAYMENT</p>
            <div className="pay-card">
                <div className="pay-card-bar" />

                {/* Banner */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", borderBottom: "1px solid var(--stroke)" }}>
                    <svg viewBox="0 0 16 16" fill="none" width="12" height="12">
                        <circle cx="4" cy="4" r="2" stroke="#a78bfa" strokeWidth="1.3" />
                        <circle cx="12" cy="4" r="2" stroke="#a78bfa" strokeWidth="1.3" />
                        <circle cx="8" cy="12" r="2" stroke="#a78bfa" strokeWidth="1.3" />
                        <path d="M4 6v2h8V6M8 8v2" stroke="#a78bfa" strokeWidth="1.3" />
                    </svg>
                    <span style={{ fontSize: 10, color: "#a78bfa", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, letterSpacing: ".1em" }}>
                        AUTO-SPLITS TO {split.recipients.length} WALLETS
                    </span>
                </div>

                {/* Amount */}
                <div className="pay-amount-zone">
                    <div>
                        <span className="pay-amount">{fmt(parseFloat(split.amount))}</span>
                        <span className="pay-currency">USDC</span>
                    </div>
                    <p className="pay-link-title">{split.title}</p>
                    {split.description && <p className="pay-link-desc">{split.description}</p>}
                </div>

                {/* Split breakdown */}
                <div className="pay-details">
                    {split.recipients.map((r, i) => {
                        const payout = payouts.find(p => p.address === r.address);
                        const legAmount = ((parseFloat(fee.recipientAmount) * r.percentage) / 100).toFixed(2);
                        return (
                            <div className="pay-detail" key={i}>
                                <span className="pay-detail-k" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: "#a78bfa", background: "rgba(167,139,250,.1)", borderRadius: 4, padding: "2px 6px", fontFamily: "IBM Plex Mono, monospace", minWidth: 38, textAlign: "center" }}>
                                        {r.percentage}%
                                    </span>
                                    {r.label || shortenAddress(r.address)}
                                </span>
                                <span className="pay-detail-v">
                                    {legAmount} USDC
                                    {payout?.status === "SENT" && payout.txHash && (
                                        <a href={`https://testnet.arcscan.app/tx/${payout.txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: "var(--c)", marginLeft: 3 }}>↗</a>
                                    )}
                                    {payout?.status === "FAILED" && <span style={{ color: "var(--danger)", marginLeft: 3, fontSize: 10 }}>FAILED</span>}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Fee + total */}
                <div className="pay-details" style={{ background: "transparent" }}>
                    <div className="pay-detail">
                        <span className="pay-detail-k">Platform fee ({fee.feePercent})</span>
                        <span className="pay-detail-v">{fee.fee} USDC</span>
                    </div>
                    <div className="pay-detail">
                        <span className="pay-detail-k" style={{ fontWeight: 700, color: "var(--ink-1)" }}>You pay</span>
                        <span className="pay-detail-v" style={{ color: "var(--c)" }}>{totalPays} USDC</span>
                    </div>
                </div>

                {/* CTA zone */}
                <div style={{ padding: "20px 28px 28px" }}>
                    {step === "distributing" && (
                        <div style={{ marginBottom: 14, fontSize: 12, color: "var(--ink-3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                            <div className="page-spinner" style={{ width: 14, height: 14 }} />
                            Distributing to recipients…
                        </div>
                    )}

                    {error && <div className="pay-err-box" style={{ marginBottom: 14, marginTop: 0 }}>{error}</div>}

                    {!isPaid && (
                        <>
                            {!isConnected ? (
                                <button className="pay-switch-btn" onClick={() => connect({ connector: injected() })}>
                                    Connect Wallet to Pay
                                </button>
                            ) : !isOnArc ? (
                                <button className="pay-switch-btn" onClick={() => switchChain({ chainId: arcTestnet.id })}>
                                    Switch to Arc Network
                                </button>
                            ) : (
                                <button className="pay-switch-btn" onClick={handlePay} disabled={step === "sending" || step === "distributing"} style={{ background: "var(--c)", color: "#000", border: "none", boxShadow: "0 4px 18px rgba(0,229,160,.4)" }}>
                                    {step === "sending" ? "Confirm in wallet…" : step === "distributing" ? "Distributing…" : `Pay ${fmt(parseFloat(split.amount))} USDC`}
                                </button>
                            )}
                            {isConnected && (
                                <div style={{ textAlign: "center", marginTop: 12 }}>
                                    <button className="pay-disc-btn" onClick={() => disconnect()}>
                                        Disconnect ({shortenAddress(address!)})
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {step === "failed" && isPaid && (
                        <button className="pay-switch-btn" onClick={handleRetry} style={{ background: "var(--c)", color: "#000", border: "none" }}>
                            Retry Distribution
                        </button>
                    )}
                </div>

                <p className="pay-powered" style={{ paddingBottom: 22 }}>Powered by Conduit · Arc Network · Circle USDC</p>
            </div>
        </div>
    );
}