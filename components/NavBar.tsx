"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount, useDisconnect } from "wagmi";
import { useEffect, useState, useRef } from "react";

const DOCS_URL = "https://conduitpay.mintlify.app";

// Reuses the drawer's single-open-group state, so the wallet menu and the
// nav groups can't be expanded at the same time.
const WALLET_GROUP = "__wallet";

const DocsIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13"><path d="M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" strokeLinecap="round" /><path d="M5 6h6M5 9h6M5 12h4" strokeLinecap="round" /></svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="12" height="12"><circle cx="8" cy="8" r="6" /><path d="M8 4.5V8l2.5 1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const ChevronIcon = () => (
  <svg className="nav-item-chevron" viewBox="0 0 10 6" fill="none" width="8" height="8"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const CopyIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5" /><path d="M10.5 5.5V4a1.5 1.5 0 00-1.5-1.5H4A1.5 1.5 0 002.5 4v5A1.5 1.5 0 004 10.5h1.5" strokeLinecap="round" /></svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" width="11" height="11"><path d="M3 8.5l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const DisconnectIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="11" height="11"><path d="M8 2.5v5" strokeLinecap="round" /><path d="M4.6 4.6a4.5 4.5 0 106.8 0" strokeLinecap="round" /></svg>
);

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
        label: "Splits", href: "/splits",
        icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13"><circle cx="4" cy="4" r="2.2" /><circle cx="12" cy="4" r="2.2" /><circle cx="8" cy="12" r="2.2" /><path d="M4 6.2v1.3h8V6.2M8 7.5v2.3" strokeLinecap="round" /></svg>,
        desc: "Auto-split one payment to many wallets",
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
        desc: "x402 API & integration docs",
      },
      {
        label: "Webhooks", href: "/webhooks",
        icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13"><path d="M3 8a5 5 0 015-5M8 13a5 5 0 005-5" strokeLinecap="round" /><circle cx="8" cy="8" r="2" /></svg>,
        desc: "Notify your endpoint on events",
      },
      {
        label: "Agent Wallets", href: "/agents",
        icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="13" height="13"><rect x="3" y="5" width="10" height="8" rx="1.5" /><path d="M8 5V3M6 2.5h4" strokeLinecap="round" /><circle cx="6" cy="9" r="0.8" fill="currentColor" /><circle cx="10" cy="9" r="0.8" fill="currentColor" /></svg>,
        desc: "Wallets for AI agents with spend limits",
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
    <div ref={ref} className="nav-dropdown">
      <button
        onClick={() => setOpen(o => !o)}
        className={`nav-item${isActive ? " is-active" : open ? " is-open" : ""}`}
      >
        <span className="nav-item-icon">{group.icon}</span>
        {group.label}
        <ChevronIcon />
      </button>

      {open && (
        <div className="nav-dropdown-panel">
          <div className="nav-dropdown-header">
            <span>{group.label.toUpperCase()}</span>
          </div>
          {group.links.map(l => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`nav-dropdown-item${active ? " is-active" : ""}`}
              >
                <span className="nav-icon-chip">{l.icon}</span>
                <div className="nav-dropdown-item-text">
                  <p className="nav-dropdown-item-title">{l.label}</p>
                  <p className="nav-dropdown-item-desc">{l.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Copies the full address (never the truncated display text) and flips a
 * `copied` flag for 1.5s so callers can swap in a confirmation.
 */
function useCopyAddress(address?: string) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const copy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      // Clipboard API needs a secure context — fall back to a throwaway node.
      const ta = document.createElement("textarea");
      ta.value = address;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } finally { ta.remove(); }
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  };

  return { copied, copy };
}

function WalletMenu({ label, address, onDisconnect }: { label: string; address?: string; onDisconnect: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { copied, copy } = useCopyAddress(address);

  // pointerdown rather than mousedown: this has to dismiss on touch too.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="nav-dropdown">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`nav-wallet${open ? " is-open" : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="nav-wallet-dot" />
        {label}
        <ChevronIcon />
      </button>

      {open && (
        <div className="nav-dropdown-panel is-right" role="menu">
          <div className="nav-dropdown-header">
            <span>WALLET</span>
          </div>
          {address && (
            <button type="button" role="menuitem" className="nav-dropdown-item is-button" onClick={copy}>
              <span className="nav-icon-chip">{copied ? <CheckIcon /> : <CopyIcon />}</span>
              <div className="nav-dropdown-item-text">
                <p className="nav-dropdown-item-title">{copied ? "Copied!" : "Copy Address"}</p>
                <p className="nav-dropdown-item-desc">Full address to clipboard</p>
              </div>
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            className="nav-dropdown-item is-button is-danger"
            onClick={() => { setOpen(false); onDisconnect(); }}
          >
            <span className="nav-icon-chip"><DisconnectIcon /></span>
            <div className="nav-dropdown-item-text">
              <p className="nav-dropdown-item-title">Disconnect</p>
              <p className="nav-dropdown-item-desc">End this wallet session</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

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
  const { copied: drawerCopied, copy: drawerCopy } = useCopyAddress(address);

  useEffect(() => {
    setMounted(true);
    setIsDark(localStorage.getItem("conduit-theme") !== "light");
    const tick = () => setTime(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

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
    window.dispatchEvent(new Event("conduit-theme-change"));
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
      <nav className="nav">
        <Link href="/" className="nav-logo">
          {mounted ? (
            <Image src={logoSrc} alt="Conduit" width={140} height={52} style={{ height: 100, width: "auto", objectFit: "contain" }} priority />
          ) : (
            <Image src="/conduit-logo-white.png" alt="Conduit" width={140} height={52} style={{ height: 100, width: "auto", objectFit: "contain" }} priority />
          )}
        </Link>

        <div className="nav-links">
          {STANDALONE.map(l => (
            <Link key={l.href} href={l.href} className={`nav-item${pathname === l.href ? " is-active" : ""}`}>
              <span className="nav-item-icon">{l.icon}</span>
              {l.label}
            </Link>
          ))}
          <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" className="nav-item">
            <span className="nav-item-icon"><DocsIcon /></span>
            Docs
          </a>
          {GROUPS.map(g => (
            <NavDropdown key={g.label} group={g} pathname={pathname} />
          ))}
        </div>

        <div className="nav-right">
          <div className="nav-pill-group">
            <div className="nav-network">
              <span className="nav-network-dot pulse-dot" />
              <span className="nav-network-label">Arc Testnet</span>
            </div>
            {mounted && (
              <div className="nav-timer">
                <span className="nav-timer-icon"><ClockIcon /></span>
                <span className="nav-time">{time}</span>
              </div>
            )}
            {mounted && ready && (
              <>
                {isConnected ? (
                  <WalletMenu
                    label={short || user?.email?.address?.slice(0, 16) || "Connected"}
                    address={address}
                    onDisconnect={handleLogout}
                  />
                ) : (
                  <button className="nav-connect-btn" onClick={login}>Connect Wallet</button>
                )}
              </>
            )}
          </div>
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
      <div className={`nav-drawer-backdrop${drawerOpen ? " open" : ""}`} onClick={() => setDrawerOpen(false)} />
      <div className={`nav-drawer${drawerOpen ? " open" : ""}`}>
        {STANDALONE.map(l => (
          <Link key={l.href} href={l.href} className={`nav-drawer-item${pathname === l.href ? " is-active" : ""}`}>
            <span className="nav-icon-chip">{l.icon}</span>
            <span className="nav-drawer-item-label">{l.label}</span>
          </Link>
        ))}
        <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" className="nav-drawer-item">
          <span className="nav-icon-chip"><DocsIcon /></span>
          <span className="nav-drawer-item-label">Docs</span>
        </a>

        <div className="nav-drawer-divider" />

        {GROUPS.map(g => {
          const groupOpen = drawerGroup === g.label;
          return (
            <div key={g.label}>
              <button
                onClick={() => setDrawerGroup(groupOpen ? null : g.label)}
                className={`nav-drawer-item${groupOpen ? " is-open" : ""}`}
              >
                <span className="nav-icon-chip">{g.icon}</span>
                <span className="nav-drawer-item-label">{g.label}</span>
                <svg className="nav-drawer-item-chevron" viewBox="0 0 10 6" fill="none" width="8" height="8">
                  <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {groupOpen && (
                <div className="nav-drawer-group-items">
                  {g.links.map(l => (
                    <Link key={l.href} href={l.href} className={`nav-drawer-item${pathname === l.href ? " is-active" : ""}`}>
                      <span className="nav-icon-chip">{l.icon}</span>
                      <span className="nav-drawer-item-label">{l.label}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* The desktop pill is hidden under 768px, so the drawer carries its
            own copy/disconnect menu — same rows, expanded inline the way the
            drawer's other groups behave. */}
        {mounted && ready && isConnected && (
          <>
            <div className="nav-drawer-divider" />
            <button
              onClick={() => setDrawerGroup(drawerGroup === WALLET_GROUP ? null : WALLET_GROUP)}
              className={`nav-drawer-item${drawerGroup === WALLET_GROUP ? " is-open" : ""}`}
              aria-expanded={drawerGroup === WALLET_GROUP}
            >
              <span className="nav-icon-chip"><span className="nav-wallet-dot" /></span>
              <span className="nav-drawer-item-label">{short || user?.email?.address?.slice(0, 16) || "Connected"}</span>
              <svg className="nav-drawer-item-chevron" viewBox="0 0 10 6" fill="none" width="8" height="8">
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {drawerGroup === WALLET_GROUP && (
              <div className="nav-drawer-group-items">
                {address && (
                  <button className="nav-drawer-item" onClick={drawerCopy}>
                    <span className="nav-icon-chip">{drawerCopied ? <CheckIcon /> : <CopyIcon />}</span>
                    <span className="nav-drawer-item-label">{drawerCopied ? "Copied!" : "Copy Address"}</span>
                  </button>
                )}
                <button
                  className="nav-drawer-item is-danger"
                  onClick={() => { setDrawerOpen(false); handleLogout(); }}
                >
                  <span className="nav-icon-chip"><DisconnectIcon /></span>
                  <span className="nav-drawer-item-label">Disconnect</span>
                </button>
              </div>
            )}
          </>
        )}

        <div className="nav-drawer-divider" />

        <div className="nav-drawer-utils">
          <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" className="nav-drawer-util">Get USDC ↗</a>
          <a href="https://testnet.arcscan.app" target="_blank" rel="noopener noreferrer" className="nav-drawer-util">Explorer ↗</a>
        </div>
      </div>
    </>
  );
}