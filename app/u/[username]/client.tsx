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

function Logo() {
    return (
        <div className="pay-logo">
            <img src="/conduit-logo-white.png" alt="Conduit" style={{ height: 58, width: "auto", objectFit: "contain" }} />
        </div>
    );
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
            <Logo />
            <p className="pay-tagline">PAYMENT SENT</p>
            <div className="pay-card">
                <div className="pay-card-bar" />
                <div className="pay-actions" style={{ textAlign: "center" }}>
                    <div className="pay-success-icon">
                        <svg viewBox="0 0 24 24" fill="none" width="28" height="28"><path d="M5 12l4.5 4.5L19 7" stroke="var(--c)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    <p className="pay-success-title">Payment Sent!</p>
                    <p className="pay-success-desc">You sent <strong style={{ color: "var(--ink-1)" }}>{fmt(parsed)} USDC</strong> to @{username}</p>
                    {txHash && (
                        <a href={`https://testnet.arcscan.app/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="pay-tx-link">View on ArcScan ↗</a>
                    )}
                </div>
            </div>

            <div className="pay-cta-box">
                <p className="pay-cta-text">Want to receive USDC payments like this?</p>
                <a href="/" className="pay-cta-btn">
                    <svg viewBox="0 0 16 16" fill="none" width="13" height="13"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                    Create your own payment link
                </a>
                <p className="pay-cta-sub">Free · No sign-up · Any chain</p>
            </div>

            <p className="pay-powered">Powered by Arc Network & Circle</p>
        </div>
    );

    return (
        <div className="pay-page">
            <Logo />
            <p className="pay-tagline">PAYMENT REQUEST</p>
            <div className="pay-card">
                <div className="pay-card-bar" />

                {/* Profile — who you're paying, builds trust */}
                <div className="pay-profile-zone">
                    <div className="pay-avatar">{username[0].toUpperCase()}</div>
                    <p className="pay-profile-name">{profile.displayName || `@${username}`}</p>
                    {profile.displayName && <p className="pay-profile-username">@{username}</p>}
                    {profile.bio && <p className="pay-profile-bio">{profile.bio}</p>}
                </div>

                {/* Amount */}
                <div className="pay-amount-entry">
                    <p className="pay-amount-eyebrow">You&apos;re paying @{username}</p>
                    <div className="pay-amount-input-row">
                        <input
                            type="number"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="0.00"
                            min="0"
                            step="any"
                            disabled={isBusy}
                            className="pay-amount-input"
                        />
                        <span className="pay-currency">USDC</span>
                    </div>
                    <div className="pay-quick-amounts">
                        {["1", "5", "10", "50"].map(n => (
                            <button key={n} onClick={() => setAmount(n)} disabled={isBusy} className={`pay-quick-btn${amount === n ? " on" : ""}`}>
                                {n}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Note */}
                <div className="pay-note-zone">
                    <input
                        value={note}
                        onChange={e => setNote(e.target.value)}
                        placeholder="Add a note (optional)"
                        maxLength={100}
                        disabled={isBusy}
                        className="pay-note-input"
                    />
                </div>

                {/* Recipient + fee breakdown */}
                <div className="pay-details">
                    <div className="pay-detail">
                        <span className="pay-detail-k">Pay to</span>
                        <span className="pay-detail-v">{profile.address.slice(0, 6)}...{profile.address.slice(-4)}</span>
                    </div>
                    <div className="pay-detail">
                        <span className="pay-detail-k">Network</span>
                        <span className="pay-detail-v"><span className="pay-net-dot" />Arc Testnet</span>
                    </div>
                    {isValidAmount && (
                        <div style={{ marginTop: 4, paddingTop: 10, borderTop: "1px dashed var(--stroke)", display: "flex", flexDirection: "column", gap: 10 }}>
                            <div className="pay-detail">
                                <span className="pay-detail-k">Amount</span>
                                <span className="pay-detail-v">{fmt(parsed)} USDC</span>
                            </div>
                            <div className="pay-detail">
                                <span className="pay-detail-k" style={{ color: "var(--ink-3)" }}>Network fee ({FEE_PERCENT}%)</span>
                                <span className="pay-detail-v" style={{ color: "var(--ink-3)", fontSize: 11 }}>+{fmt(fee)} USDC</span>
                            </div>
                            <div className="pay-detail" style={{ paddingTop: 6, borderTop: "1px solid var(--stroke)" }}>
                                <span className="pay-detail-k" style={{ fontWeight: 700, color: "var(--ink-1)" }}>Total</span>
                                <span className="pay-detail-v" style={{ fontWeight: 800, color: "var(--c)" }}>{fmt(total)} USDC</span>
                            </div>
                        </div>
                    )}
                </div>

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
