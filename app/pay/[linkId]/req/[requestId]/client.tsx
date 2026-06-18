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

const FEE_COLLECTOR = "0x2d2eba8c0da5879ab25b5bd37e211d230aabbb5c";

interface RequestData {
    id: string;
    requesterAddress: string;
    recipientAddress: string;
    amount: string;
    title: string;
    note?: string;
    status: string;
    expiresAt?: string;
    txHash?: string;
    paidAt?: string;
}

interface RequesterProfile {
    username?: string | null;
    displayName?: string | null;
    avatar?: string | null;
}

interface FeeInfo { fee: string; recipientAmount: string; feePercent: string; }

interface Props {
    request: RequestData;
    requesterProfile?: RequesterProfile;
    fee: FeeInfo;
}

function Logo() {
    return (
        <div className="pay-logo">
            <img src="/conduit-logo-white.png" alt="Conduit" style={{ height: 58, width: "auto", objectFit: "contain" }} />
        </div>
    );
}

type Step = "idle" | "sending_payment" | "sending_fee" | "recording" | "done" | "failed";

export function RequestPayClient({ request, requesterProfile, fee }: Props) {
    const [mounted, setMounted] = useState(false);
    const [step, setStep] = useState<Step>("idle");
    const [payTxHash, setPayTxHash] = useState<`0x${string}` | undefined>();
    const [feeTxHash, setFeeTxHash] = useState<`0x${string}` | undefined>();
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(request.status === "PAID");

    const { address, isConnected, chainId } = useAccount();
    const { connect } = useConnect();
    const { disconnect } = useDisconnect();
    const { switchChain } = useSwitchChain();
    const isOnArc = chainId === arcTestnet.id;

    const { sendTransactionAsync } = useSendTransaction();

    // Watch payment tx
    const { data: payReceipt } = useWaitForTransactionReceipt({ hash: payTxHash, query: { enabled: !!payTxHash } });
    // Watch fee tx
    const { data: feeReceipt } = useWaitForTransactionReceipt({ hash: feeTxHash, query: { enabled: !!feeTxHash } });

    useEffect(() => { setMounted(true); }, []);

    // After payment confirmed → send fee
    useEffect(() => {
        if (!payReceipt || step !== "sending_payment") return;
        (async () => {
            try {
                setStep("sending_fee");
                const feeWei = parseEther(fee.fee);
                const hash = await sendTransactionAsync({
                    to: FEE_COLLECTOR as `0x${string}`,
                    value: feeWei,
                });
                setFeeTxHash(hash);
            } catch (err: any) {
                setError(err?.shortMessage || err?.message || "Fee transaction failed.");
                setStep("failed");
            }
        })();
    }, [payReceipt]);

    // After fee confirmed → record as paid
    useEffect(() => {
        if (!feeReceipt || step !== "sending_fee") return;
        (async () => {
            try {
                setStep("recording");
                const res = await fetch(`/api/requests/${request.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "paid", txHash: payTxHash }),
                });
                if (!res.ok) throw new Error("Failed to record payment.");
                setStep("done");
                setSuccess(true);
            } catch (err: any) {
                setError(err?.message || "Recording failed.");
                setStep("failed");
            }
        })();
    }, [feeReceipt]);

    const handlePay = async () => {
        if (!isConnected || !address) { connect({ connector: injected() }); return; }
        if (!isOnArc) { switchChain({ chainId: arcTestnet.id }); return; }

        // Guard: only the intended recipient can pay (soft check, not enforced on-chain)
        if (address.toLowerCase() !== request.recipientAddress.toLowerCase()) {
            setError(`This request is addressed to ${shortenAddress(request.recipientAddress)}. Connect the correct wallet.`);
            return;
        }

        setError("");
        setStep("sending_payment");
        try {
            const totalWei = parseEther(request.amount);
            const hash = await sendTransactionAsync({
                to: request.requesterAddress as `0x${string}`,
                value: totalWei,
            });
            setPayTxHash(hash);
        } catch (err: any) {
            setError(err?.shortMessage || err?.message || "Transaction rejected.");
            setStep("failed");
        }
    };

    const requesterDisplay =
        requesterProfile?.username
            ? `@${requesterProfile.username}`
            : requesterProfile?.displayName || shortenAddress(request.requesterAddress);

    const isExpired = request.status === "EXPIRED" || (request.expiresAt && new Date(request.expiresAt) <= new Date());
    const isCancelled = request.status === "CANCELLED";
    const totalPays = (parseFloat(request.amount) + parseFloat(fee.fee)).toFixed(4);

    const isAddressedToMe = address && address.toLowerCase() === request.recipientAddress.toLowerCase();

    if (!mounted) return null;

    return (
        <div className="pay-wrap">
            <Logo />

            <div className="pay-card">
                {/* Tag */}
                <div style={{ marginBottom: 20 }}>
                    <span style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "3px 10px", borderRadius: 4,
                        fontSize: 10, fontWeight: 700, fontFamily: "IBM Plex Mono, monospace",
                        background: "rgba(91,143,249,.1)", color: "#5b8ff9",
                        border: "1px solid rgba(91,143,249,.2)",
                    }}>
                        <svg viewBox="0 0 12 12" fill="none" width="9" height="9">
                            <rect x="1" y="3" width="10" height="7" rx="1" stroke="#5b8ff9" strokeWidth="1.2" />
                            <path d="M1 5.5h10" stroke="#5b8ff9" strokeWidth="1.2" />
                        </svg>
                        PAYMENT REQUEST
                    </span>
                </div>

                <h1 className="pay-title">{request.title}</h1>
                {request.note && (
                    <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 16, lineHeight: 1.5 }}>
                        {request.note}
                    </p>
                )}

                {/* Requester info */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                    <div style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: "var(--raised)", border: "1px solid var(--stroke)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                        {requesterProfile?.avatar
                            ? <img src={requesterProfile.avatar} style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} alt="" />
                            : <svg viewBox="0 0 16 16" fill="none" width="13" height="13"><circle cx="8" cy="6" r="3" stroke="var(--ink-3)" strokeWidth="1.3" /><path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="var(--ink-3)" strokeWidth="1.3" strokeLinecap="round" /></svg>
                        }
                    </div>
                    <div>
                        <p style={{ fontSize: 12, color: "var(--ink-1)", fontWeight: 700 }}>{requesterDisplay}</p>
                        <p style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>
                            is requesting payment from you
                        </p>
                    </div>
                </div>

                {/* Amount */}
                <div className="pay-amount-row">
                    <span className="pay-amount">{formatUSDC(request.amount)}</span>
                    <span className="pay-amount-unit">USDC</span>
                </div>

                {/* Fee breakdown */}
                <div className="pay-info-rows" style={{ margin: "16px 0" }}>
                    <div className="pay-info-row">
                        <span className="pay-info-label">You send</span>
                        <span className="pay-info-val">{formatUSDC(request.amount)} USDC</span>
                    </div>
                    <div className="pay-info-row">
                        <span className="pay-info-label">Platform fee ({fee.feePercent})</span>
                        <span className="pay-info-val">{fee.fee} USDC</span>
                    </div>
                    <div className="pay-info-row" style={{ borderBottom: "none", paddingTop: 8 }}>
                        <span className="pay-info-label" style={{ fontWeight: 700, color: "var(--ink-1)" }}>Total</span>
                        <span className="pay-info-val" style={{ color: "var(--c)", fontWeight: 700 }}>{totalPays} USDC</span>
                    </div>
                </div>

                {/* Expiry */}
                {request.expiresAt && !isExpired && !success && (
                    <p style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 16, display: "flex", alignItems: "center", gap: 5 }}>
                        <svg viewBox="0 0 12 12" fill="none" width="10" height="10"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" /><path d="M6 3.5v2.8l1.2.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" /></svg>
                        Expires {new Date(request.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                )}

                {/* Address mismatch warning */}
                {isConnected && !isAddressedToMe && !success && !isExpired && !isCancelled && (
                    <div style={{
                        background: "rgba(240,62,95,.08)", border: "1px solid rgba(240,62,95,.2)",
                        borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "var(--danger)",
                    }}>
                        ⚠ This request is addressed to {shortenAddress(request.recipientAddress)}, not your connected wallet.
                    </div>
                )}

                {/* Status states */}
                {(success || request.status === "PAID") && (
                    <div style={{ textAlign: "center", padding: "20px 0" }}>
                        <div style={{ fontSize: 36, marginBottom: 8 }}>✓</div>
                        <p style={{ color: "var(--c)", fontWeight: 800, fontSize: 16, marginBottom: 4 }}>Paid!</p>
                        {payTxHash && (
                            <a
                                href={`https://testnet.arcscan.app/tx/${payTxHash}`}
                                target="_blank" rel="noopener noreferrer"
                                style={{ fontSize: 11, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace" }}
                            >
                                {payTxHash.slice(0, 10)}... ↗
                            </a>
                        )}
                    </div>
                )}

                {isExpired && !success && (
                    <div style={{ textAlign: "center", padding: "20px 0", color: "var(--danger)" }}>
                        <p style={{ fontWeight: 700 }}>This request has expired.</p>
                    </div>
                )}

                {isCancelled && !success && (
                    <div style={{ textAlign: "center", padding: "20px 0", color: "var(--ink-3)" }}>
                        <p style={{ fontWeight: 700 }}>This request was cancelled.</p>
                    </div>
                )}

                {/* Step indicator */}
                {step !== "idle" && step !== "done" && step !== "failed" && (
                    <div style={{ marginBottom: 14, fontSize: 12, color: "var(--ink-3)", display: "flex", alignItems: "center", gap: 8 }}>
                        <div className="page-spinner" style={{ width: 14, height: 14 }} />
                        {{
                            sending_payment: "Sending payment…",
                            sending_fee: "Sending platform fee…",
                            recording: "Recording on Conduit…",
                        }[step]}
                    </div>
                )}

                {error && (
                    <div style={{
                        background: "rgba(240,62,95,.08)", border: "1px solid rgba(240,62,95,.2)",
                        borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "var(--danger)",
                    }}>
                        {error}
                        <button onClick={() => { setError(""); setStep("idle"); }} style={{ marginLeft: 8, fontSize: 11, color: "var(--ink-3)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}>
                            Retry
                        </button>
                    </div>
                )}

                {/* CTA */}
                {!success && !isExpired && !isCancelled && (
                    <>
                        {!isConnected ? (
                            <button className="pay-btn" onClick={() => connect({ connector: injected() })}>
                                Connect Wallet to Pay
                            </button>
                        ) : !isOnArc ? (
                            <button className="pay-btn" onClick={() => switchChain({ chainId: arcTestnet.id })}>
                                Switch to Arc Network
                            </button>
                        ) : (
                            <button
                                className="pay-btn"
                                onClick={handlePay}
                                disabled={step !== "idle" && step !== "failed"}
                            >
                                {step === "idle" || step === "failed" ? `Pay ${formatUSDC(request.amount)} USDC` : "Processing…"}
                            </button>
                        )}

                        {isConnected && (
                            <button
                                onClick={() => disconnect()}
                                style={{ width: "100%", marginTop: 10, fontSize: 11, color: "var(--ink-3)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                            >
                                Disconnect ({shortenAddress(address!)})
                            </button>
                        )}
                    </>
                )}

                <p className="pay-powered">Powered by Conduit · Arc Network · Circle USDC</p>
            </div>
        </div>
    );
}