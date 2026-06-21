"use client";
import { useState } from "react";
import { useAccount, useDisconnect, useSendTransaction, useWaitForTransactionReceipt, useBalance } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { parseEther } from "viem";
import { arcTestnet } from "@/lib/arcChain";

const FEE_COLLECTOR = "0x2d2eba8c0da5879ab25b5bd37e211d230aabbb5c";
const FEE_PERCENT = 0.5;

interface Profile {
    address: string;
    username: string;
    displayName?: string | null;
    bio?: string | null;
}

export function UserPayClient({ profile, username }: { profile: Profile; username: string }) {
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");
    const [step, setStep] = useState<"idle" | "sending" | "done" | "failed">("idle");
    const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

    const { address, isConnected, chainId } = useAccount();
    const { login, authenticated } = usePrivy();
    const { disconnect } = useDisconnect();
    const { data: balance } = useBalance({ address, chainId: arcTestnet.id });
    const bal = balance ? parseFloat(balance.formatted) : 0;

    const { sendTransaction, isPending } = useSendTransaction();
    const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({ hash: txHash, chainId: arcTestnet.id });

    const parsed = parseFloat(amount);
    const isValidAmount = !isNaN(parsed) && parsed > 0;
    const fee = isValidAmount ? Math.max((parsed * FEE_PERCENT) / 100, 0.000001) : 0;
    const total = isValidAmount ? parsed + fee : 0;
    const hasEnough = bal >= total;
    const isOnArc = chainId === arcTestnet.id;
    const isBusy = isPending || isWaiting || step === "sending";
    const isLoggedIn = authenticated && isConnected;

    const handlePay = () => {
        if (!isValidAmount || !address) return;
        setStep("sending");

        sendTransaction(
            {
                to: profile.address as `0x${string}`,
                value: parseEther(parsed.toString()),
                chainId: arcTestnet.id,
            },
            {
                onSuccess: (hash) => {
                    setTxHash(hash);
                    // Record transaction in DB
                    fetch("/api/transactions/direct", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            title: `Payment to @${username}`,
                            amount: parsed.toString(),
                            recipientAddress: profile.address,
                            paidBy: address,
                            txHash: hash,
                        }),
                    }).catch(() => { });
                    sendTransaction(
                        {
                            to: FEE_COLLECTOR as `0x${string}`,
                            value: parseEther(fee.toFixed(6)),
                            chainId: arcTestnet.id,
                        },
                        {
                            onSuccess: () => setStep("done"),
                            onError: () => setStep("done"),
                        }
                    );
                },
                onError: (err) => {
                    setStep(err.message?.includes("rejected") ? "idle" : "failed");
                },
            }
        );
    };

    const fmt = (n: number) => n % 1 === 0 ? n.toString() : n.toFixed(4);

    if (step === "done" || isSuccess) return (
        <div className="pay-page">
            <div className="pay-card" style={{ maxWidth: 420 }}>
                <div className="pay-card-bar" />
                <div className="pay-actions" style={{ textAlign: "center" }}>
                    <div className="pay-success-icon">
                        <svg viewBox="0 0 24 24" fill="none" width="28" height="28"><path d="M5 12l4.5 4.5L19 7" stroke="var(--c)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    <p className="pay-success-title">Payment Sent!</p>
                    <p className="pay-success-desc">You sent {fmt(parsed)} USDC to @{username}</p>
                    {txHash && (
                        <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="pay-tx-link" style={{ display: "block", marginTop: 12 }}>View on ArcScan ↗</a>
                    )}
                    <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 16, padding: "11px 22px", background: "var(--c)", borderRadius: "var(--r-md)", fontSize: 13, fontWeight: 700, color: "#000", textDecoration: "none" }}>
                        Go to Dashboard
                    </a>
                </div>
            </div>
            <p className="pay-powered">Powered by Arc Network & Circle</p>
        </div>
    );

    return (
        <div className="pay-page">
            <div className="pay-card" style={{ maxWidth: 440 }}>
                <div className="pay-card-bar" />

                {/* Profile header — integrated into the card */}
                <div style={{ padding: "28px 28px 22px", textAlign: "center", borderBottom: "1px solid var(--stroke)" }}>
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--c-dim)", border: "2px solid var(--c-border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                        <span style={{ fontSize: 22, fontWeight: 900, color: "var(--c)" }}>{username[0].toUpperCase()}</span>
                    </div>
                    <p style={{ fontSize: 17, fontWeight: 800, color: "var(--ink-1)", marginBottom: 2 }}>{profile.displayName || `@${username}`}</p>
                    {profile.displayName && <p style={{ fontSize: 12, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 600 }}>@{username}</p>}
                    {profile.bio && <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 8, maxWidth: 280, margin: "8px auto 0", lineHeight: 1.5 }}>{profile.bio}</p>}
                </div>

                {/* Amount */}
                <div style={{ padding: "26px 28px 20px", textAlign: "center" }}>
                    <p style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 14 }}>You're paying @{username}</p>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 8, marginBottom: 16 }}>
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="0.00"
                            min="0"
                            step="any"
                            disabled={isBusy}
                            style={{ background: "none", border: "none", outline: "none", fontSize: 44, fontWeight: 900, color: "var(--ink-1)", fontFamily: "IBM Plex Mono, monospace", width: 180, textAlign: "right" as const, letterSpacing: "-.04em" }}
                        />
                        <span style={{ fontSize: 16, color: "var(--c)", fontWeight: 700, fontFamily: "IBM Plex Mono, monospace" }}>USDC</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                        {["1", "5", "10", "50"].map(n => (
                            <button key={n} onClick={() => setAmount(n)} disabled={isBusy} style={{ minWidth: 44, padding: "6px 0", background: amount === n ? "var(--c)" : "var(--raised)", border: `1px solid ${amount === n ? "var(--c)" : "var(--stroke)"}`, borderRadius: 8, color: amount === n ? "#000" : "var(--ink-3)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "IBM Plex Mono, monospace", transition: "all .15s" }}>
                                {n}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Note */}
                <div style={{ padding: "0 28px 18px" }}>
                    <input
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Add a note (optional)"
                        maxLength={100}
                        disabled={isBusy}
                        style={{ width: "100%", padding: "11px 13px", background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: 8, color: "var(--ink-1)", fontSize: 13, fontFamily: "Sora, sans-serif", outline: "none", boxSizing: "border-box" as const }}
                    />
                </div>

                {/* Fee breakdown */}
                {isValidAmount && (
                    <div style={{ margin: "0 28px 18px", padding: "13px 15px", background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Amount</span>
                            <span style={{ fontSize: 12, color: "var(--ink-2)", fontFamily: "IBM Plex Mono, monospace" }}>{fmt(parsed)} USDC</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Network fee (0.5%)</span>
                            <span style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>+{fmt(fee)} USDC</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 7, borderTop: "1px solid var(--stroke)" }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-1)" }}>Total</span>
                            <span style={{ fontSize: 13, fontWeight: 800, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace" }}>{fmt(total)} USDC</span>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="pay-actions">
                    {!isLoggedIn ? (
                        <button className="pay-connect-btn" onClick={login}>
                            Connect Wallet to Pay
                        </button>
                    ) : !isOnArc ? (
                        <div className="pay-warn-box">Switch to Arc Testnet to continue.</div>
                    ) : isBusy ? (
                        <div className="pay-spin-zone">
                            <div className="pay-spinner" />
                            <p className="pay-spin-text">{isPending ? "Confirm in wallet..." : "Confirming..."}</p>
                        </div>
                    ) : (
                        <>
                            <button
                                className="pay-connect-btn"
                                onClick={handlePay}
                                disabled={!isValidAmount || !hasEnough}
                                style={{ opacity: !isValidAmount || !hasEnough ? .4 : 1, cursor: !isValidAmount || !hasEnough ? "not-allowed" : "pointer" }}
                            >
                                {!isValidAmount ? "Enter amount" : `Pay ${fmt(parsed)} USDC`}
                            </button>
                            {balance && (
                                <p className={`pay-bal${!hasEnough && isValidAmount ? " low" : ""}`}>
                                    Balance: <span style={{ color: "var(--ink-2)" }}>{bal.toFixed(4)} USDC</span>
                                    {!hasEnough && isValidAmount && <> — <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" className="pay-bal-link">get USDC</a></>}
                                </p>
                            )}
                        </>
                    )}
                </div>

                {isLoggedIn && (
                    <div className="pay-wallet-row">
                        <span className="pay-wallet-addr">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                        <button className="pay-disc-btn" onClick={() => disconnect()}>Disconnect</button>
                    </div>
                )}
            </div>
            <p className="pay-powered">Powered by Arc Network & Circle</p>
        </div>
    );
}