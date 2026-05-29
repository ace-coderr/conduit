"use client";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { usePrivy } from "@privy-io/react-auth";
import { NavBar } from "@/components/NavBar";

interface Contact {
    id: string;
    contactAddress: string;
    nickname?: string;
    profile?: { username: string; displayName?: string };
    createdAt: string;
}

export default function ContactsPage() {
    const { address } = useAccount();
    const { authenticated, login } = usePrivy();
    const [mounted, setMounted] = useState(false);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newAddress, setNewAddress] = useState("");
    const [newNickname, setNewNickname] = useState("");
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState("");
    const [copiedId, setCopiedId] = useState<string | null>(null);

    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (!address) return;
        fetchContacts();
    }, [address]);

    const fetchContacts = async () => {
        if (!address) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/contacts?address=${address}`);
            const data = await res.json();
            setContacts(data.contacts ?? []);
        } catch { }
        finally { setIsLoading(false); }
    };

    const addContact = async () => {
        if (!address || !newAddress.trim()) return;
        setAdding(true);
        setError("");
        try {
            const res = await fetch("/api/contacts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ownerAddress: address, contactAddress: newAddress.trim(), nickname: newNickname.trim() }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error ?? "Failed to add contact"); return; }
            setNewAddress("");
            setNewNickname("");
            fetchContacts();
        } catch { setError("Network error"); }
        finally { setAdding(false); }
    };

    const removeContact = async (contactAddress: string) => {
        if (!address) return;
        await fetch("/api/contacts", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ownerAddress: address, contactAddress }),
        });
        fetchContacts();
    };

    const copyPayLink = (c: Contact) => {
        const url = c.profile?.username
            ? `${window.location.origin}/u/${c.profile.username}`
            : `${window.location.origin}/@${c.contactAddress}`;
        navigator.clipboard.writeText(url);
        setCopiedId(c.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="app">
            <NavBar />
            <div className="page-wrap">
                <div className="page-header">
                    <h1 className="page-title">Contacts</h1>
                    <p className="page-subtitle">Saved wallets for quick payments</p>
                </div>

                {!mounted || !authenticated ? (
                    <div className="empty">
                        <p className="empty-title">Connect your wallet</p>
                        <p className="empty-sub">Connect to manage contacts</p>
                        {mounted && <button onClick={login} style={{ marginTop: 16, padding: "10px 24px", background: "var(--c)", border: "none", borderRadius: 8, color: "#000", fontWeight: 700, cursor: "pointer", fontFamily: "Sora, sans-serif" }}>Connect</button>}
                    </div>
                ) : (
                    <div style={{ maxWidth: 600 }}>
                        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-1)", marginBottom: 14 }}>Add Contact</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                <input value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="Wallet address or @username"
                                    style={{ padding: "10px 12px", background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: 8, color: "var(--ink-1)", fontSize: 13, fontFamily: "Sora, sans-serif", outline: "none" }} />
                                <input value={newNickname} onChange={e => setNewNickname(e.target.value)} placeholder="Nickname (optional)"
                                    style={{ padding: "10px 12px", background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: 8, color: "var(--ink-1)", fontSize: 13, fontFamily: "Sora, sans-serif", outline: "none" }} />
                                {error && <p style={{ fontSize: 12, color: "var(--danger)" }}>{error}</p>}
                                <button onClick={addContact} disabled={adding || !newAddress.trim()} style={{ padding: "10px", background: "var(--c)", border: "none", borderRadius: 8, color: "#000", fontSize: 13, fontWeight: 700, cursor: adding || !newAddress.trim() ? "not-allowed" : "pointer", fontFamily: "Sora, sans-serif", opacity: adding || !newAddress.trim() ? .5 : 1 }}>
                                    {adding ? "Adding..." : "Add Contact"}
                                </button>
                            </div>
                        </div>

                        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
                            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--stroke)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-1)" }}>Saved Contacts</span>
                                <span style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>{contacts.length}</span>
                            </div>
                            {isLoading ? (
                                <div style={{ padding: 32, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>Loading...</div>
                            ) : contacts.length === 0 ? (
                                <div className="empty">
                                    <p className="empty-title">No contacts yet</p>
                                    <p className="empty-sub">Add wallet addresses for quick payments</p>
                                </div>
                            ) : contacts.map((c, i) => (
                                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: i < contacts.length - 1 ? "1px solid var(--stroke)" : "none" }}>
                                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--c-dim)", border: "1px solid var(--c-border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--c)" }}>{(c.nickname || c.profile?.username || c.contactAddress)[0].toUpperCase()}</span>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-1)" }}>{c.nickname || c.profile?.displayName || (c.profile?.username ? `@${c.profile.username}` : `${c.contactAddress.slice(0, 6)}...${c.contactAddress.slice(-4)}`)}</p>
                                        <p style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>{c.profile?.username ? `conduitpay.xyz/u/${c.profile.username}` : `${c.contactAddress.slice(0, 6)}...${c.contactAddress.slice(-4)}`}</p>
                                    </div>
                                    <div style={{ display: "flex", gap: 6 }}>
                                        <button onClick={() => copyPayLink(c)} style={{ padding: "6px 12px", background: "var(--c)", border: "none", borderRadius: 6, color: "#000", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Sora, sans-serif" }}>
                                            {copiedId === c.id ? "Copied!" : "Copy Link"}
                                        </button>
                                        <button onClick={() => removeContact(c.contactAddress)} style={{ padding: "6px 12px", background: "transparent", border: "1px solid rgba(240,62,95,.3)", borderRadius: 6, color: "var(--danger)", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "Sora, sans-serif" }}>
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}