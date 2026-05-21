"use client";
import { useState } from "react";
import { useAccount, useConnect, useDisconnect, useSendTransaction, useWaitForTransactionReceipt, useBalance } from "wagmi";
import { injected } from "wagmi/connectors";
import { parseUnits, formatUnits } from "viem";
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
    const { connect } = useConnect();
    const { disconnect } = useDisconnect();
    const { data: balance } = useBalance({ address, chainId: arcTestnet.id });
    const bal = balance ? parseFloat(formatUnits(balance.value, 6)) : 0;

    const { sendTransaction, isPending } = useSendTransaction();
    const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({ hash: txHash, chainId: arcTestnet.id });

    const parsed = parseFloat(amount);
    const isValidAmount = !isNaN(parsed) && parsed > 0;
    const fee = isValidAmount ? Math.max((parsed * FEE_PERCENT) / 100, 0.000001) : 0;
    const total = isValidAmount ? parsed + fee : 0;
    const hasEnough = bal >= total;
    const isOnArc = chainId === arcTestnet.id;
    const isBusy = isPending || isWaiting || step === "sending";

    const handlePay = () => {
        if (!isValidAmount || !address) return;
        setStep("sending");

        // Send payment to recipient
        sendTransaction(
            {
                to: profile.address as `0x${string}`,
                value: parseUnits(parsed.toString(), 6),
                chainId: arcTestnet.id,
            },
            {
                onSuccess: (hash) => {
                    setTxHash(hash);
                    // Send fee
                    sendTransaction(
                        {
                            to: FEE_COLLECTOR as `0x${string}`,
                            value: parseUnits(fee.toFixed(6), 6),
                            chainId: arcTestnet.id,
                        },
                        {
                            onSuccess: () => setStep("done"),
                            onError: () => setStep("done"), // fee failed but payment went through
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
            {/* Profile header */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--c-dim)", border: "2px solid var(--c-border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                    <span style={{ fontSize: 26, fontWeight: 900, color: "var(--c)" }}>{username[0].toUpperCase()}</span>
                </div>
                {profile.displayName && <p style={{ fontSize: 18, fontWeight: 800, color: "var(--ink-1)", marginBottom: 4 }}>{profile.displayName}</p>}
                <p style={{ fontSize: 13, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>@{username}</p>
                {profile.bio && <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 6, maxWidth: 300, margin: "6px auto 0", lineHeight: 1.5 }}>{profile.bio}</p>}
            </div>

            <div className="pay-card" style={{ maxWidth: 420 }}>
                <div className="pay-card-bar" />

                {/* Amount input */}
                <div className="pay-amount-zone">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8 }}>
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="0.00"
                            min="0"
                            step="any"
                            disabled={isBusy}
                            style={{ background: "none", border: "none", outline: "none", fontSize: 40, fontWeight: 900, color: "var(--ink-1)", fontFamily: "IBM Plex Mono, monospace", width: 160, textAlign: "center" }}
                        />
                        <span style={{ fontSize: 18, color: "var(--c)", fontWeight: 700, fontFamily: "IBM Plex Mono, monospace" }}>USDC</span>
                    </div>

                    {/* Quick amounts */}
                    <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 8 }}>
                        {["1", "5", "10", "50"].map(n => (
                            <button key={n} onClick={() => setAmount(n)} disabled={isBusy} style={{ padding: "4px 12px", background: amount === n ? "var(--c)" : "var(--raised)", border: `1px solid ${amount === n ? "var(--c)" : "var(--stroke)"}`, borderRadius: 20, color: amount === n ? "#000" : "var(--ink-3)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "IBM Plex Mono, monospace" }}>
                                {n}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Note */}
                <div style={{ padding: "0 24px 16px" }}>
                    <input
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Add a note (optional)"
                        maxLength={100}
                        disabled={isBusy}
                        style={{ width: "100%", padding: "10px 12px", background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: 8, color: "var(--ink-1)", fontSize: 13, fontFamily: "Sora, sans-serif", outline: "none", boxSizing: "border-box" as const }}
                    />
                </div>

                {/* Fee breakdown */}
                {isValidAmount && (
                    <div style={{ margin: "0 24px 16px", padding: "12px 14px", background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Amount</span>
                            <span style={{ fontSize: 12, color: "var(--ink-2)", fontFamily: "IBM Plex Mono, monospace" }}>{fmt(parsed)} USDC</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Fee (0.5%)</span>
                            <span style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>+{fmt(fee)} USDC</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6, borderTop: "1px solid var(--stroke)" }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-1)" }}>Total</span>
                            <span style={{ fontSize: 12, fontWeight: 800, color: "var(--ink-1)", fontFamily: "IBM Plex Mono, monospace" }}>{fmt(total)} USDC</span>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="pay-actions">
                    {!isConnected ? (
                        <button className="pay-connect-btn" onClick={() => connect({ connector: injected() })}>
                            Connect Wallet to Pay
                        </button>
                    ) : !isOnArc ? (
                        <div className="pay-warn-box">Switch to Arc Testnet to continue.</div>
                    ) : isBusy ? (
                        <div className="pay-spin-zone">
                            <div className="pay-spinner" />
                            <p className="pay-spin-text">{isPending ? "Confirm in MetaMask..." : "Confirming..."}</p>
                        </div>
                    ) : (
                        <>
                            <button
                                className="pay-connect-btn"
                                onClick={handlePay}
                                disabled={!isValidAmount || !hasEnough}
                                style={{ opacity: !isValidAmount || !hasEnough ? .4 : 1, cursor: !isValidAmount || !hasEnough ? "not-allowed" : "pointer" }}
                            >
                                {!isValidAmount ? "Enter amount" : `Pay ${fmt(parsed)} USDC to @${username}`}
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

                {isConnected && (
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