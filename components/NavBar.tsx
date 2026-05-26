"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useDisconnect } from "wagmi";
import { useEffect, useState, useRef } from "react";

// ─── Nav structure ────────────────────────────────────────────────────────────

const STANDALONE = [
  {
    label: "Dashboard", href: "/",
    icon: <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13"><rect x="1" y="1" width="6" height="6" rx="1.5" /><rect x="9" y="1" width="6" height="6" rx="1.5" /><rect x="1" y="9" width="6" height="6" rx="1.5" /><rect x="9" y="9" width="6" height="6" rx="1.5" /></svg>,
  },
  {
    label: "Escrow", href: "/escrow",
    icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13"><rect x="2" y="6" width="12" height="9" rx="1.5" /><path d="M5 6V4.5a3 3 0 016 0V6" strokeLinecap="round" /><circle cx="8" cy="10.5" r="1.2" fill="currentColor" stroke="none" /><path d="M8 11.7v1.3" strokeLinecap="round" /></svg>,
  },
];

const GROUPS = [
  {
    label: "Payments",
    icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13"><rect x="1" y="3" width="14" height="10" rx="2" /><path d="M1 7h14" strokeLinecap="round" /></svg>,
    links: [
      {
        label: "Links", href: "/links",
        icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13"><path d="M9 6a3 3 0 010 4.24l-1.5 1.5a3 3 0 01-4.24-4.24l.75-.75" strokeLinecap="round" /><path d="M7 10a3 3 0 010-4.24l1.5-1.5a3 3 0 014.24 4.24l-.75.75" strokeLinecap="round" /></svg>,
        desc: "Create & share payment links",
      },
      {
        label: "Transactions", href: "/transactions",
        icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13"><path d="M2 5h12M2 5l3-3M2 5l3 3M14 11H2m12 0l-3-3m3 3l-3 3" strokeLinecap="round" strokeLinejoin="round" /></svg>,
        desc: "View payment history",
      },
      {
        label: "Analytics", href: "/analytics",
        icon: <svg viewBox="0 0 16 16" fill="currentColor" width="13" height="13"><path d="M2 12V8h2.5v4H2zm4 0V4h2.5v8H6zm4 0V1h2.5v11H10z" opacity=".85" /></svg>,
        desc: "Volume and earnings stats",
      },
    ],
  },
  {
    label: "x402",
    icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13"><path d="M5 4l-3 4 3 4M11 4l3 4-3 4M9 2l-2 12" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    links: [
      {
        label: "Marketplace", href: "/marketplace",
        icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13"><path d="M2 3h12l-1 8H3L2 3z" strokeLinecap="round" /><path d="M6 3V2a2 2 0 014 0v1" strokeLinecap="round" /></svg>,
        desc: "Discover & pay for APIs",
      },
      {
        label: "Developers", href: "/developers",
        icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13"><path d="M5 4l-3 4 3 4M11 4l3 4-3 4M9 2l-2 12" strokeLinecap="round" strokeLinejoin="round" /></svg>,
        desc: "Docs and integration guide",
      },
    ],
  },
  {
    label: "Account",
    icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13"><circle cx="8" cy="5" r="3" /><path d="M2 14c0-3.31 2.69-6 6-6s6 2.69 6 6" strokeLinecap="round" /></svg>,
    links: [
      {
        label: "Profile", href: "/profile",
        icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13"><circle cx="8" cy="5" r="3" /><path d="M2 14c0-3.31 2.69-6 6-6s6 2.69 6 6" strokeLinecap="round" /></svg>,
        desc: "Username & payment page",
      },
      {
        label: "Contacts", href: "/contacts",
        icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13"><circle cx="6" cy="5" r="2.5" /><path d="M1 13c0-2.76 2.24-5 5-5" /><circle cx="12" cy="7" r="2" /><path d="M10 13c0-1.66 1.34-3 3-3" strokeLinecap="round" /></svg>,
        desc: "Saved wallets & usernames",
      },
    ],
  },
];

// ─── Dropdown component ───────────────────────────────────────────────────────

function NavDropdown({ group, pathname }: { group: typeof GROUPS[0]; pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = group.links.some(l => pathname === l.href);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`nav-link${isActive ? " active" : ""}`}
        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: "Sora, sans-serif" }}
      >
        <span className="nav-link-icon">{group.icon}</span>
        {group.label}
        <svg viewBox="0 0 10 6" fill="none" width="8" height="8" style={{ opacity: .5, transition: "transform .15s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
          background: "var(--surface)", border: "1px solid var(--stroke)", borderRadius: "var(--r-lg)",
          boxShadow: "var(--elev-2)", minWidth: 220, zIndex: 200, overflow: "hidden",
          animation: "fadeInDown .12s ease",
        }}>
          <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid var(--stroke)" }}>
            <span style={{ fontSize: 9, fontFamily: "IBM Plex Mono, monospace", color: "var(--ink-3)", letterSpacing: ".1em", fontWeight: 700 }}>{group.label.toUpperCase()}</span>
          </div>
          {group.links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", textDecoration: "none", background: pathname === l.href ? "var(--c-dim)" : "transparent", borderLeft: pathname === l.href ? "2px solid var(--c)" : "2px solid transparent", transition: "background .1s" }}
              onMouseEnter={e => { if (pathname !== l.href) (e.currentTarget as HTMLElement).style.background = "var(--raised)"; }}
              onMouseLeave={e => { if (pathname !== l.href) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <span style={{ color: pathname === l.href ? "var(--c)" : "var(--ink-3)", marginTop: 1, flexShrink: 0 }}>{l.icon}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: pathname === l.href ? "var(--c)" : "var(--ink-1)", marginBottom: 1 }}>{l.label}</p>
                <p style={{ fontSize: 11, color: "var(--ink-3)", lineHeight: 1.4 }}>{l.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main NavBar ──────────────────────────────────────────────────────────────

export function NavBar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState("");
  const [isDark, setIsDark] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerGroup, setDrawerGroup] = useState<string | null>(null);

  const { ready, authenticated, login, logout, user } = usePrivy();
  const { address } = useAccount();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    setMounted(true);
    setIsDark(localStorage.getItem("conduit-theme") !== "light");
    const tick = () => setTime(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("conduit-theme", "dark");
    } else {
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("conduit-theme", "light");
    }
  };

  const handleLogout = async () => {
    disconnect();
    await logout();
  };

  const short = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
  const logoSrc = mounted && !isDark ? "/conduit-logo-black.png" : "/conduit-logo-white.png";
  const isConnected = ready && authenticated;

  return (
    <>
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      <nav className="nav">
        <Link href="/" className="nav-logo">
          {mounted ? (
            <Image src={logoSrc} alt="Conduit" width={140} height={52} style={{ height: 100, width: "auto", objectFit: "contain" }} priority />
          ) : (
            <Image src="/conduit-logo-white.png" alt="Conduit" width={140} height={52} style={{ height: 100, width: "auto", objectFit: "contain" }} priority />
          )}
        </Link>

        {/* Desktop nav */}
        <div className="nav-links">
          {STANDALONE.map(l => (
            <Link key={l.href} href={l.href} className={`nav-link${pathname === l.href ? " active" : ""}`}>
              <span className="nav-link-icon">{l.icon}</span>
              {l.label}
            </Link>
          ))}
          {GROUPS.map(g => (
            <NavDropdown key={g.label} group={g} pathname={pathname} />
          ))}
        </div>

        <div className="nav-right">
          <div className="nav-network">
            <span className="nav-network-dot pulse-dot" />
            <span className="nav-network-label">Arc Testnet</span>
          </div>
          {mounted && <span className="nav-time">{time}</span>}
          {mounted && ready && (
            <>
              {isConnected ? (
                <div className="nav-wallet" onClick={handleLogout} title="Click to disconnect">
                  <span className="nav-wallet-dot" />
                  {short || user?.email?.address?.slice(0, 16) || "Connected"}
                </div>
              ) : (
                <button className="nav-connect-btn" onClick={login}>Connect Wallet</button>
              )}
            </>
          )}
          <button className="nav-theme-btn" onClick={toggleTheme} title={isDark ? "Switch to light" : "Switch to dark"}>
            {mounted ? (isDark ? (
              <svg viewBox="0 0 20 20" fill="none" width="15" height="15"><circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" /><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.93 4.93l1.41 1.41M13.66 13.66l1.41 1.41M4.93 15.07l1.41-1.41M13.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="none" width="15" height="15"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            )) : (
              <svg viewBox="0 0 20 20" fill="none" width="15" height="15"><circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" /></svg>
            )}
          </button>
          <button className="nav-hamburger" onClick={() => setDrawerOpen(!drawerOpen)}>
            {drawerOpen
              ? <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M6 6l12 12M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              : <svg viewBox="0 0 24 24" fill="none" width="18" height="18"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            }
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div className={`nav-drawer${drawerOpen ? " open" : ""}`}>
        {STANDALONE.map(l => (
          <Link key={l.href} href={l.href} className={`nav-link${pathname === l.href ? " active" : ""}`}>
            <span className="nav-link-icon">{l.icon}</span>
            {l.label}
          </Link>
        ))}
        <div style={{ height: 1, background: "var(--stroke)", margin: "6px 0" }} />
        {GROUPS.map(g => (
          <div key={g.label}>
            <button
              onClick={() => setDrawerGroup(drawerGroup === g.label ? null : g.label)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 16px", background: "none", border: "none", cursor: "pointer", fontFamily: "Sora, sans-serif" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "var(--ink-3)" }}>{g.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-2)" }}>{g.label}</span>
              </div>
              <svg viewBox="0 0 10 6" fill="none" width="8" height="8" style={{ opacity: .4, transition: "transform .15s", transform: drawerGroup === g.label ? "rotate(180deg)" : "rotate(0deg)" }}>
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {drawerGroup === g.label && (
              <div style={{ paddingLeft: 12 }}>
                {g.links.map(l => (
                  <Link key={l.href} href={l.href} className={`nav-link${pathname === l.href ? " active" : ""}`}>
                    <span className="nav-link-icon">{l.icon}</span>
                    {l.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
        <div style={{ height: 1, background: "var(--stroke)", margin: "6px 0" }} />
        <div style={{ display: "flex", gap: 10, padding: "4px 0" }}>
          <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" className="nav-link" style={{ flex: 1, justifyContent: "center" }}>Get USDC ↗</a>
          <a href="https://testnet.arcscan.app" target="_blank" rel="noopener noreferrer" className="nav-link" style={{ flex: 1, justifyContent: "center" }}>Explorer ↗</a>
        </div>
      </div>
    </>
  );
}