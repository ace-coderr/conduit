"use client";
import { useState, useEffect, useRef } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { NavBar } from "@/components/NavBar";
import { TrustBadge } from "@/components/TrustBadge";

interface Reputation {
    completedEscrows: number;
    disputedEscrows: number;
    totalVolume: string;
    trustScore: number;
    isNew: boolean;
}

const FIELD_KEYS = ["username", "displayName", "bio", "email"] as const;
type FieldKey = typeof FIELD_KEYS[number];

// Shared chrome for an edit-in-place field: clean display text + a small "Edit" affordance
// by default; toggling swaps in whatever input the caller passes as children. There's no
// per-field save — every field persists through the same shared save bar below, since the
// backend is one atomic profile upsert, not per-field endpoints.
function FieldShell({ label, required, editing, onToggle, displayValue, placeholder, children }: {
    label: string; required?: boolean; editing: boolean; onToggle: () => void;
    displayValue: string; placeholder: string; children: React.ReactNode;
}) {
    return (
        <div className="form-group" style={{ marginBottom: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>{label} {required && <span style={{ color: "var(--c)" }}>*</span>}</label>
                <button onClick={onToggle} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--c)", fontWeight: 700, padding: 0 }}>
                    {editing ? "Cancel" : "Edit"}
                </button>
            </div>
            {editing ? children : (
                <p style={{ fontSize: 13, color: displayValue ? "var(--ink-1)" : "var(--ink-3)", fontWeight: 600, minHeight: 20 }}>
                    {displayValue || placeholder}
                </p>
            )}
        </div>
    );
}

export default function ProfilePage() {
    const { address } = useAccount();
    const { authenticated, login } = usePrivy();
    const { signMessageAsync } = useSignMessage();
    const [mounted, setMounted] = useState(false);
    const [username, setUsername] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [bio, setBio] = useState("");
    const [avatar, setAvatar] = useState("");
    const [email, setEmail] = useState("");
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");
    const [profile, setProfile] = useState<any>(null);
    const [profileChecked, setProfileChecked] = useState(false);
    const [reputation, setReputation] = useState<Reputation | null>(null);
    const [tgLinked, setTgLinked] = useState(false);
    const [tgUsername, setTgUsername] = useState<string | null>(null);
    const [tgChecking, setTgChecking] = useState(false);
    const [copied, setCopied] = useState(false);
    const [editing, setEditing] = useState<Set<FieldKey>>(new Set());
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [avatarError, setAvatarError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const setField: Record<FieldKey, (v: string) => void> = { username: setUsername, displayName: setDisplayName, bio: setBio, email: setEmail };
    const savedValue: Record<FieldKey, string> = {
        username: profile?.username ?? "", displayName: profile?.displayName ?? "",
        bio: profile?.bio ?? "", email: profile?.email ?? "",
    };

    const openField = (key: FieldKey) => setEditing(prev => new Set(prev).add(key));
    const closeField = (key: FieldKey) => {
        setField[key](savedValue[key]);
        setEditing(prev => { const n = new Set(prev); n.delete(key); return n; });
    };
    const toggleField = (key: FieldKey) => editing.has(key) ? closeField(key) : openField(key);

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

    const pickAvatar = () => fileInputRef.current?.click();

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file || !address) return;
        setAvatarError("");
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
            setAvatarError("Only PNG, JPEG, or WEBP images are allowed");
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setAvatarError("Image must be 2MB or smaller");
            return;
        }
        setAvatarUploading(true);
        try {
            const message = `Conduit: Update avatar for ${address} at ${Date.now()}`;
            let signature: string;
            try {
                signature = await signMessageAsync({ message });
            } catch {
                setAvatarError("Signature rejected. Please sign to upload your avatar.");
                return;
            }
            const body = new FormData();
            body.append("address", address);
            body.append("signature", signature);
            body.append("message", message);
            body.append("file", file);
            const res = await fetch("/api/profile/avatar", { method: "POST", body });
            const data = await res.json();
            if (!res.ok) { setAvatarError(data.error ?? "Upload failed"); return; }
            setAvatar(data.url);
        } catch {
            setAvatarError("Network error");
        } finally {
            setAvatarUploading(false);
        }
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
                    setAvatar(d.profile.avatar ?? "");
                    setEmail(d.profile.email ?? "");
                } else {
                    // Nothing to show yet — open every field so first-time setup isn't a dead end.
                    setEditing(new Set(FIELD_KEYS));
                }
                setProfileChecked(true);
            });
        fetch(`/api/reputation?address=${address}`)
            .then(r => r.json())
            .then(d => { if (d.reputation) setReputation(d.reputation); })
            .catch(() => { });
    }, [address]);

    const handleSave = async (): Promise<boolean> => {
        if (!address) return false;
        setSaving(true);
        setError("");
        setSaved(false);
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setError("A valid email is required.");
            setSaving(false);
            return false;
        }
        try {
            const message = `Conduit: Set username @${username} for ${address} at ${Date.now()}`;
            let signature: string;
            try {
                signature = await signMessageAsync({ message });
            } catch {
                setError("Signature rejected. Please sign to save your profile.");
                return false;
            }

            const res = await fetch("/api/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address, username, displayName, bio, avatar, email, signature, message }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error ?? "Failed to save"); return false; }
            setProfile(data.profile);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
            return true;
        } catch { setError("Network error"); return false; }
        finally { setSaving(false); }
    };

    const handleSaveChanges = async () => {
        const ok = await handleSave();
        if (ok) setEditing(new Set());
    };

    const handleCancelChanges = () => {
        FIELD_KEYS.forEach(k => setField[k](savedValue[k]));
        setEditing(new Set());
        setError("");
    };

    const payUrl = username
        ? `${typeof window !== "undefined" ? window.location.origin : "https://conduitpay.xyz"}/u/${username}`
        : null;

    const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
    const initial = (displayName || username || "?")[0]?.toUpperCase();
    const isVerified = !!profile;

    const copyLink = () => {
        if (!payUrl) return;
        navigator.clipboard.writeText(payUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="app">
            <NavBar />
            <div className="page-wrap">
                <div className="page-header" style={{ maxWidth: 1080, margin: "0 auto", width: "100%" }}>
                    <h1 className="page-title">Profile</h1>
                    <p className="page-subtitle">How others see you, and the account settings behind it</p>
                </div>

                {!mounted || !authenticated ? (
                    <div className="empty" style={{ paddingTop: 80 }}>
                        <p className="empty-title">Connect your wallet</p>
                        <p className="empty-sub">Connect to set up your profile</p>
                        {mounted && <button className="form-submit-btn" style={{ width: "auto", padding: "12px 28px", margin: "18px auto 0" }} onClick={login}>Connect Wallet</button>}
                    </div>
                ) : !profileChecked ? (
                    <div className="loading-wrap"><div className="page-spinner" /></div>
                ) : (
                    <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

                        {/* ── Hero: cover band + overlapping avatar ──
                            Avatar is positioned absolutely (independent of the text flow) so it can
                            overlap the band without ever dragging the name/badge/wallet up with it —
                            that coupling was the bug. The text row lives in normal flow right below
                            the band, with left padding reserved for the avatar's footprint. */}
                        <div className="card" style={{ padding: 0, overflow: "hidden", position: "relative" }}>
                            <div style={{ height: 88, background: "linear-gradient(135deg, rgba(0,229,160,.4), rgba(0,184,148,.18) 55%, transparent), var(--raised)" }} />

                            {/* Outer wrapper stays unclipped so the camera chip can sit at the circle's
                                edge; the circle itself keeps overflow hidden to mask the image/initial. */}
                            <div style={{ position: "absolute", left: 32, top: 88 - 44, width: 88, height: 88, zIndex: 2 }}>
                                <div style={{
                                    position: "relative", width: 88, height: 88, borderRadius: "50%",
                                    background: "var(--c-dim)", border: "3px solid var(--surface)", display: "flex", alignItems: "center", justifyContent: "center",
                                    overflow: "hidden", boxShadow: "0 0 28px rgba(0,229,160,.18)",
                                }}>
                                    {avatar ? (
                                        <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => (e.currentTarget.style.display = "none")} />
                                    ) : (
                                        <span style={{ fontSize: 34, fontWeight: 800, color: "var(--c)", fontFamily: "Sora, sans-serif" }}>{initial}</span>
                                    )}
                                    {avatarUploading && (
                                        <div style={{ position: "absolute", inset: 0, background: "rgba(11,15,13,.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <span className="spinner" />
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={pickAvatar}
                                    disabled={avatarUploading || !address}
                                    title={!address ? "Connect your wallet to change your avatar" : avatarUploading ? "Uploading..." : "Change avatar"}
                                    style={{
                                        position: "absolute", right: -2, bottom: -2, width: 30, height: 30, borderRadius: "50%",
                                        background: "var(--c)", border: "3px solid var(--surface)", display: "flex", alignItems: "center", justifyContent: "center",
                                        cursor: (avatarUploading || !address) ? "default" : "pointer", opacity: (avatarUploading || !address) ? 0.6 : 1, padding: 0,
                                    }}
                                >
                                    <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
                                        <path d="M2 5.5A1.5 1.5 0 013.5 4h1.13a1 1 0 00.86-.5l.4-.68A1 1 0 016.76 2.3h2.48a1 1 0 01.87.5l.4.68a1 1 0 00.86.5H12.5A1.5 1.5 0 0114 5.5v6A1.5 1.5 0 0112.5 13h-9A1.5 1.5 0 012 11.5v-6z" stroke="#04120c" strokeWidth="1.2" strokeLinejoin="round" />
                                        <circle cx="8" cy="8.2" r="2.1" stroke="#04120c" strokeWidth="1.2" />
                                    </svg>
                                </button>

                                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleAvatarChange} style={{ display: "none" }} />
                            </div>

                            <div style={{ padding: "16px 32px 28px" }}>
                                {avatarError && (
                                    <p style={{ fontSize: 11, color: "var(--danger)", fontWeight: 600, marginBottom: 10, paddingLeft: 112 }}>{avatarError}</p>
                                )}
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", paddingLeft: 112, minHeight: 44 }}>
                                    <div style={{ flex: 1, minWidth: 220 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                                            <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--ink-1)", fontFamily: "Sora, sans-serif", letterSpacing: "-.02em" }}>
                                                {displayName || (username ? `@${username}` : "Unnamed")}
                                            </h2>
                                            {address && <TrustBadge address={address} size="full" />}
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8, flexWrap: "wrap" }}>
                                            {username && <span style={{ fontSize: 13, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>@{username}</span>}
                                            <span style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>{shortAddr}</span>
                                        </div>
                                    </div>

                                    {payUrl && (
                                        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                                            <button className="table-copy-btn" onClick={copyLink}>{copied ? "Copied!" : "Copy link"}</button>
                                            <a href={`/u/${username}`} target="_blank" rel="noopener noreferrer" className="table-copy-btn" style={{ textDecoration: "none" }}>View public page ↗</a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── Main (edit-in-place) + Live Preview / Reputation ── */}
                        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 24, alignItems: "start" }}>

                            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

                                {/* Main */}
                                <div className="form-card">
                                    <div className="form-card-header">
                                        <div className="form-card-header-icon">
                                            <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><circle cx="8" cy="5.5" r="2.5" stroke="var(--c)" strokeWidth="1.3" /><path d="M3 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="var(--c)" strokeWidth="1.3" strokeLinecap="round" /></svg>
                                        </div>
                                        <div>
                                            <div className="form-card-title">Main</div>
                                            <div className="form-card-subtitle">Your identity — click Edit on any field</div>
                                        </div>
                                    </div>
                                    <div className="form-card-body">
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                                            <FieldShell label="Display Name" editing={editing.has("displayName")} onToggle={() => toggleField("displayName")} displayValue={displayName} placeholder="Not set">
                                                <input className="input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your Name" maxLength={50} autoFocus />
                                            </FieldShell>

                                            <FieldShell label="Username" required editing={editing.has("username")} onToggle={() => toggleField("username")} displayValue={username ? `@${username}` : ""} placeholder="Not set">
                                                <div className="input-wrap">
                                                    <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, fontSize: 14, pointerEvents: "none" }}>@</span>
                                                    <input className="input mono" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="yourname" maxLength={20} style={{ paddingLeft: 28 }} autoFocus />
                                                </div>
                                            </FieldShell>

                                            <div>
                                                <label className="form-label">Wallet</label>
                                                <p style={{ fontSize: 13, color: "var(--ink-1)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, minHeight: 20 }}>{shortAddr}</p>
                                            </div>

                                            <div>
                                                <label className="form-label">Verification</label>
                                                {isVerified ? (
                                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: "var(--c)", background: "var(--c-dim)", border: "1px solid var(--c-border)", borderRadius: 20, padding: "4px 10px" }}>
                                                        <svg viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M2 6l2.5 2.5L10 3.5" stroke="var(--c)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                        Verified
                                                    </span>
                                                ) : (
                                                    <span style={{ display: "inline-flex", alignItems: "center", fontSize: 12, fontWeight: 700, color: "var(--ink-3)", background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: 20, padding: "4px 10px" }}>
                                                        Not verified yet
                                                    </span>
                                                )}
                                            </div>

                                            <div style={{ gridColumn: "1 / -1" }}>
                                                <FieldShell label="Bio" editing={editing.has("bio")} onToggle={() => toggleField("bio")} displayValue={bio} placeholder="No bio yet">
                                                    <textarea className="input" value={bio} onChange={e => setBio(e.target.value)} placeholder="Freelancer, builder, creator..." maxLength={160} rows={3} style={{ resize: "none" }} autoFocus />
                                                    <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 6, textAlign: "right" }}>{bio.length}/160</p>
                                                </FieldShell>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Account */}
                                <div className="form-card">
                                    <div className="form-card-header">
                                        <div className="form-card-header-icon">
                                            <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><rect x="2" y="4" width="12" height="9" rx="1.5" stroke="var(--c)" strokeWidth="1.3" /><path d="M10.5 8.5h.01" stroke="var(--c)" strokeWidth="1.8" strokeLinecap="round" /></svg>
                                        </div>
                                        <div>
                                            <div className="form-card-title">Account</div>
                                            <div className="form-card-subtitle">Private — email alerts and connected notifications</div>
                                        </div>
                                    </div>
                                    <div className="form-card-body">
                                        <FieldShell label="Email" required editing={editing.has("email")} onToggle={() => toggleField("email")} displayValue={email} placeholder="Not set">
                                            <input className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" type="email" autoFocus />
                                        </FieldShell>
                                        <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 8 }}>Required — used for receipts and important alerts.</p>

                                        {/* Telegram — existing notification integration, not a public link */}
                                        <div style={{ marginTop: 22, paddingTop: 22, borderTop: "1px solid var(--stroke)" }}>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                                    <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(34,158,217,.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                                        <svg viewBox="0 0 24 24" width="20" height="20" fill="#229ED9"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.667l-2.94-.918c-.64-.203-.654-.64.136-.954l11.49-4.43c.532-.194.998.131.838.856z" /></svg>
                                                    </div>
                                                    <div>
                                                        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-1)" }}>Telegram notifications</p>
                                                        <p style={{ fontSize: 11, color: tgLinked ? "var(--c)" : "var(--ink-3)" }}>
                                                            {tgLinked ? <>Connected{tgUsername ? ` · ${tgUsername}` : ""}</> : "Instant alerts on every payment"}
                                                        </p>
                                                    </div>
                                                </div>
                                                {tgLinked ? (
                                                    <button className="table-cancel-btn" onClick={disconnectTelegram}>Disconnect</button>
                                                ) : (
                                                    <button className="table-copy-btn" disabled={tgChecking} onClick={connectTelegram} style={{ background: "#229ED9", color: "#fff", borderColor: "#229ED9" }}>
                                                        {tgChecking ? "Opening..." : "Connect"}
                                                    </button>
                                                )}
                                            </div>
                                            {!tgLinked && (
                                                <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 12, lineHeight: 1.5, paddingLeft: 50 }}>
                                                    Opens our bot in Telegram — press Start and you're linked. This page updates automatically.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Live public preview + reputation — public-facing, grouped together */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                                <div>
                                    <div style={{ marginBottom: 12 }}>
                                        <h3 style={{ fontSize: 14, fontWeight: 800, color: "var(--ink-1)", fontFamily: "Sora, sans-serif" }}>Live Public Preview</h3>
                                        <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>What buyers see at your payment page</p>
                                    </div>
                                    <div className="pay-card" style={{ margin: "0 auto" }}>
                                        <div className="pay-card-bar" />
                                        <div className="pay-profile-zone">
                                            <div className="pay-avatar" style={{ overflow: "hidden" }}>
                                                {avatar ? <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => (e.currentTarget.style.display = "none")} /> : initial}
                                            </div>
                                            <p className="pay-profile-name">{displayName || (username ? `@${username}` : "Your name")}</p>
                                            {displayName && username && <p className="pay-profile-username">@{username}</p>}
                                            {bio && <p className="pay-profile-bio">{bio}</p>}
                                        </div>
                                        <div style={{ padding: "14px 28px", textAlign: "center", borderTop: "1px solid var(--stroke)" }}>
                                            {payUrl ? (
                                                <a href={`/u/${username}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--c)", fontWeight: 700, textDecoration: "none" }}>View live page ↗</a>
                                            ) : (
                                                <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Set a username to go live</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {reputation && (
                                    <div className="card" style={{ padding: "20px 24px" }}>
                                        <p style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", fontFamily: "IBM Plex Mono, monospace", letterSpacing: ".06em", marginBottom: 14 }}>Reputation others see</p>
                                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                                            <div>
                                                <p style={{ fontSize: 20, fontWeight: 800, color: "var(--ink-1)", fontFamily: "IBM Plex Mono, monospace" }}>{reputation.isNew ? "—" : reputation.trustScore}</p>
                                                <p style={{ fontSize: 11, color: "var(--ink-3)" }}>Trust score</p>
                                            </div>
                                            <div>
                                                <p style={{ fontSize: 20, fontWeight: 800, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace" }}>{reputation.completedEscrows}</p>
                                                <p style={{ fontSize: 11, color: "var(--ink-3)" }}>Completed</p>
                                            </div>
                                            <div>
                                                <p style={{ fontSize: 20, fontWeight: 800, color: reputation.disputedEscrows > 0 ? "var(--danger)" : "var(--ink-1)", fontFamily: "IBM Plex Mono, monospace" }}>{reputation.disputedEscrows}</p>
                                                <p style={{ fontSize: 11, color: "var(--ink-3)" }}>Disputed</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Shared save bar — appears only while something is being edited; sits
                                    under Reputation so it fills the right column instead of stranding
                                    at the bottom of a taller left column. */}
                                {editing.size > 0 && (
                                    <div className="card fade-up" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12, border: "1px solid var(--c-border)", background: "rgba(0,229,160,.05)" }}>
                                        <p style={{ fontSize: 11, color: "var(--ink-3)" }}>
                                            {saving ? "Saving asks your wallet to sign a message — check your wallet." : "Saving asks your wallet to sign a message to prove you own this address."}
                                        </p>
                                        {error && <p style={{ fontSize: 11, color: "var(--danger)", fontWeight: 600 }}>{error}</p>}
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <button className="btn-ghost" onClick={handleCancelChanges} disabled={saving} style={{ flex: 1 }}>Cancel</button>
                                            <button className="form-submit-btn" style={{ flex: 1 }} onClick={handleSaveChanges} disabled={saving || !username.trim() || !email.trim()}>
                                                {saving ? <span className="form-submit-spinner"><span className="spinner" />Saving...</span> : saved ? "✓ Saved!" : profile ? "Save changes" : "Create profile"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
