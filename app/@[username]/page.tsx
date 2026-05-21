import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { PayPage } from "@/components/PayPage";

interface Props { params: { username: string } }

export default async function UsernamePage({ params }: Props) {
    const username = params.username.toLowerCase().replace(/^@/, "");

    const profile = await db.userProfile.findUnique({ where: { username } });
    if (!profile) notFound();

    return (
        <div className="pay-page">
            <div style={{ textAlign: "center", marginBottom: 8 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--c-dim)", border: "2px solid var(--c-border)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: "var(--c)" }}>{username[0].toUpperCase()}</span>
                </div>
                {profile.displayName && <p style={{ fontSize: 16, fontWeight: 800, color: "var(--ink-1)", marginBottom: 4 }}>{profile.displayName}</p>}
                <p style={{ fontSize: 13, color: "var(--c)", fontFamily: "IBM Plex Mono, monospace", fontWeight: 700 }}>@{username}</p>
                {profile.bio && <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 6, maxWidth: 300, margin: "6px auto 0" }}>{profile.bio}</p>}
            </div>

            <div style={{ textAlign: "center", marginBottom: 16 }}>
                <p style={{ fontSize: 12, color: "var(--ink-3)" }}>
                    Pay <span style={{ color: "var(--c)", fontWeight: 700 }}>@{username}</span> in USDC
                </p>
            </div>

            <div style={{ background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: 16, padding: "24px", maxWidth: 420, margin: "0 auto", position: "relative", overflow: "hidden" }}>
                <div style={{ height: 2, background: "var(--c)", position: "absolute", top: 0, left: 0, right: 0 }} />
                <UsernamePayForm address={profile.address} username={username} />
            </div>

            <p className="pay-powered">Powered by Arc Network & Circle</p>
        </div>
    );
}

function UsernamePayForm({ address, username }: { address: string; username: string }) {
    return (
        <div>
            <p style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace", textAlign: "center", marginBottom: 16 }}>
                {address.slice(0, 6)}...{address.slice(-4)}
            </p>
            <a href={`/?pay=${address}&username=${username}`} style={{ display: "block", width: "100%", padding: "13px", background: "var(--c)", border: "none", borderRadius: 10, color: "#000", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "Sora, sans-serif", textDecoration: "none", textAlign: "center", boxShadow: "0 4px 16px rgba(0,229,160,.35)" }}>
                Send USDC to @{username}
            </a>
            <p style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "center", marginTop: 12 }}>
                Opens Conduit Pay — connect any wallet and pay from any chain
            </p>
        </div>
    );
}