"use client";
import { useState, useEffect } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { NavBar } from "@/components/NavBar";

export default function ProfilePage() {
    const { address } = useAccount();
    const { authenticated, login } = usePrivy();
    const { signMessageAsync } = useSignMessage();
    const [mounted, setMounted] = useState(false);
    const [username, setUsername] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [bio, setBio] = useState("");
    const [email, setEmail] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");
    const [profile, setProfile] = useState<any>(null);
    const [tgLinked, setTgLinked] = useState(false);
    const [tgUsername, setTgUsername] = useState<string | null>(null);
    const [tgChecking, setTgChecking] = useState(false);

    const checkTelegram = async (addr: string) => {
        try {
            const r = await fetch(`/api/telegram/status?address=${addr}`);
            const d = await r.json();
            setTgLinked(d.linked); setTgUsername(d.username);
        } catch { }
    };

    const connectTelegram = async () => {
        if (!address) return;
        setTgChecking(true);
        try {
            const r = await fetch("/api/telegram/connect", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ownerAddress: address }),
            });
            const d = await r.json();
            if (d.deepLink) {
                window.open(d.deepLink, "_blank");
                // poll for link completion
                const start = Date.now();
                const poll = setInterval(async () => {
                    await checkTelegram(address);
                    if (Date.now() - start > 120000) clearInterval(poll);
                }, 3000);
            }
        } catch { } finally { setTgChecking(false); }
    };

    const disconnectTelegram = async () => {
        if (!address) return;
        await fetch(`/api/telegram/status?address=${address}`, { method: "DELETE" });
        setTgLinked(false); setTgUsername(null);
    };

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (!address) return;
        checkTelegram(address);
        fetch(`/api/profile?address=${address}`)
            .then(r => r.json())
            .then(d => {
                if (d.profile) {
                    setProfile(d.profile);
                    setUsername(d.profile.username ?? "");
                    setDisplayName(d.profile.displayName ?? "");
                    setBio(d.profile.bio ?? "");
                    setEmail(d.profile.email ?? "");
                }
            });
    }, [address]);

    const handleSave = async () => {
        if (!address) return;
        setSaving(true);
        setError("");
        setSaved(false);
        try {
            const message = `Conduit: Set username @${username} for ${address} at ${Date.now()}`;
            let signature: string;
            try {
                signature = await signMessageAsync({ message });
            } catch {
                setError("Signature rejected. Please sign to save your profile.");
                return;
            }

            const res = await fetch("/api/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address, username, displayName, bio, email, signature, message }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
            setProfile(data.profile);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch { setError("Network error"); }
        finally { setSaving(false); }
    };

    const payUrl = profile
        ? `${typeof window !== "undefined" ? window.location.origin : "https://conduitpay.xyz"}/u/${profile.username}`
        : null;

    return (
        <div className="app">
            <NavBar />
            <div className="page-wrap">
                <div className="page-header">
                    <h1 className="page-title">Profile</h1>
                    <p className="page-subtitle">Set your username and get a personal payment page</p>
                </div>

                {!mounted || !authenticated ? (
                    <div className="empty">
                        <p className="empty-title">Connect your wallet</p>
                        <p className="empty-sub">Connect to set up your profile</p>
                        {mounted && <button onClick={login} style={{ marginTop: 16, padding: "10px 24px", background: "var(--c)", border: "none", borderRadius: 8, color: "#000", fontWeight: 700, cursor: "pointer", fontFamily: "Sora, sans-serif" }}>Connect</button>}
                    </div>
                ) : (
                    <div style={{ maxWidth: 520 }}>
                        {payUrl && (
                            <div style={{ background: "var(--c-dim)", border: "1px solid var(--c-border)", borderRadius: 12, padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                                <div>
                                    <p style={{ fontSize: 10, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, letterSpacing: ".08em", marginBottom: 4 }}>YOUR PAYMENT PAGE</p>
                                    <p style={{ fontSize: 13, color: "var(--ink-1)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>conduitpay.xyz/u/{profile.username}</p>
                                </div>
                                <div style={{ display: "flex", gap: 8 }}>
                                    <button onClick={() => navigator.clipboard.writeText(payUrl)} style={{ padding: "7px 14px", background: "var(--c)", border: "none", borderRadius: 8, color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Sora, sans-serif" }}>Copy</button>
                                    <a href={`/u/${profile.username}`} target="_blank" rel="noopener noreferrer" style={{ padding: "7px 14px", background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: 8, color: "var(--ink-2)", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>View ↗</a>
                                </div>
                            </div>
                        )}

                        <div className="card" style={{ padding: "24px" }}>
                            {/* Username */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", display: "block", marginBottom: 6 }}>Username <span style={{ color: "var(--c)" }}>*</span></label>
                                <div style={{ position: "relative" }}>
                                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, fontSize: 14 }}>@</span>
                                    <input value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="yourname" maxLength={20}
                                        style={{ width: "100%", padding: "10px 12px 10px 28px", background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: 8, color: "var(--ink-1)", fontSize: 14, fontFamily: "IBM Plex Mono, monospace", outline: "none", boxSizing: "border-box" as const }} />
                                </div>
                                <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>Letters, numbers, underscores only. 3-20 characters.</p>
                            </div>

                            {/* Display Name */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", display: "block", marginBottom: 6 }}>Display Name</label>
                                <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your Name" maxLength={50}
                                    style={{ width: "100%", padding: "10px 12px", background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: 8, color: "var(--ink-1)", fontSize: 13, fontFamily: "Sora, sans-serif", outline: "none", boxSizing: "border-box" as const }} />
                            </div>

                            {/* Bio */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", display: "block", marginBottom: 6 }}>Bio</label>
                                <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Freelancer, builder, creator..." maxLength={160} rows={3}
                                    style={{ width: "100%", padding: "10px 12px", background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: 8, color: "var(--ink-1)", fontSize: 13, fontFamily: "Sora, sans-serif", outline: "none", resize: "none", boxSizing: "border-box" as const }} />
                                <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{bio.length}/160</p>
                            </div>

                            {/* Email */}
                            <div style={{ marginBottom: 24 }}>
                                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)", display: "block", marginBottom: 6 }}>
                                    Email <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>(optional — for payment notifications)</span>
                                </label>
                                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" type="email"
                                    style={{ width: "100%", padding: "10px 12px", background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: 8, color: "var(--ink-1)", fontSize: 13, fontFamily: "Sora, sans-serif", outline: "none", boxSizing: "border-box" as const }} />
                                <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>Get notified when you receive payments, escrow updates, and dispute alerts.</p>
                            </div>

                            {error && <p style={{ fontSize: 12, color: "var(--danger)", marginBottom: 12 }}>{error}</p>}

                            <button onClick={handleSave} disabled={saving || !username.trim()} style={{ width: "100%", padding: "12px", background: "var(--c)", border: "none", borderRadius: 8, color: "#000", fontSize: 14, fontWeight: 800, cursor: saving || !username.trim() ? "not-allowed" : "pointer", fontFamily: "Sora, sans-serif", opacity: saving || !username.trim() ? .5 : 1 }}>
                                {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Profile"}
                            </button>
                        </div>

                        <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 11, color: "var(--ink-3)" }}>Connected wallet</span>
                            <span style={{ fontSize: 11, color: "var(--ink-2)", fontFamily: "IBM Plex Mono, monospace" }}>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                        </div>

                        <div style={{ marginTop: 16, padding: "16px", background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <svg viewBox="0 0 24 24" width="22" height="22" fill="#229ED9"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.667l-2.94-.918c-.64-.203-.654-.64.136-.954l11.49-4.43c.532-.194.998.131.838.856z" /></svg>
                                    <div>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-1)" }}>Telegram notifications</p>
                                        <p style={{ fontSize: 11, color: "var(--ink-3)" }}>
                                            {tgLinked ? <>Connected{tgUsername ? ` as ${tgUsername}` : ""} — you'll get pinged on every payment.</> : "Get a message the moment you're paid, plus escrow & split alerts."}
                                        </p>
                                    </div>
                                </div>
                                {tgLinked ? (
                                    <button onClick={disconnectTelegram} style={{ padding: "8px 16px", background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: 8, color: "var(--danger)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Sora, sans-serif" }}>Disconnect</button>
                                ) : (
                                    <button onClick={connectTelegram} disabled={tgChecking} style={{ padding: "8px 16px", background: "#229ED9", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Sora, sans-serif" }}>
                                        {tgChecking ? "Opening…" : "Connect Telegram"}
                                    </button>
                                )}
                            </div>
                            {!tgLinked && (
                                <p style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 10, lineHeight: 1.5 }}>
                                    Tap connect → it opens our bot in Telegram → press Start. This page updates automatically once linked.
                                </p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}