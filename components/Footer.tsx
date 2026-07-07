"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const DOCS_URL = "https://conduitpay.mintlify.app";

const PRODUCT_LINKS = [
  { label: "Payments", href: "/links" },
  { label: "Escrow", href: "/escrow" },
  { label: "x402", href: "/marketplace" },
  { label: "Developers", href: "/developers" },
];

const RESOURCE_LINKS = [
  { label: "Get USDC", href: "https://faucet.circle.com" },
  { label: "Explorer", href: "https://testnet.arcscan.app" },
  { label: "Docs", href: DOCS_URL },
];

const SOCIAL_LINKS = [
  {
    label: "X",
    href: "https://x.com/conduit_pay",
    icon: <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.845L1.255 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>,
  },
  {
    label: "GitHub",
    href: "https://github.com/ace-coderr/conduit",
    icon: <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.79-.25.79-.55 0-.27-.01-1.16-.02-2.11-3.2.7-3.88-1.36-3.88-1.36-.52-1.34-1.28-1.69-1.28-1.69-1.04-.72.08-.7.08-.7 1.16.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 015.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.26 5.69.41.36.78 1.06.78 2.14 0 1.54-.01 2.79-.01 3.17 0 .3.21.66.79.55A10.51 10.51 0 0023.5 12c0-6.35-5.15-11.5-11.5-11.5z" /></svg>,
  },
  {
    label: "Telegram",
    href: "https://t.me/conduit_app",
    icon: <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.17 13.667l-2.94-.918c-.64-.203-.654-.64.136-.954l11.49-4.43c.532-.194.998.131.838.856z" /></svg>,
  },
];

export function Footer() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setMounted(true);
    setIsDark(localStorage.getItem("conduit-theme") !== "light");

    const syncTheme = () => setIsDark(localStorage.getItem("conduit-theme") !== "light");
    window.addEventListener("conduit-theme-change", syncTheme);
    return () => window.removeEventListener("conduit-theme-change", syncTheme);
  }, []);

  // Standalone payment-collection pages have their own minimal "Powered by" footer
  // and shouldn't carry the full app nav footer.
  if (pathname?.startsWith("/pay") || pathname?.startsWith("/u/")) return null;

  const logoSrc = mounted && !isDark ? "/conduit-logo-black.png" : "/conduit-logo-white.png";

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-top">
          <div className="site-footer-brand">
            <Link href="/" className="site-footer-logo">
              <Image src={mounted ? logoSrc : "/conduit-logo-white.png"} alt="Conduit" width={140} height={52} style={{ height: 52, width: "auto", objectFit: "contain" }} />
            </Link>
            <p className="site-footer-tagline">
              The USDC payment rail for humans and AI agents on Arc Network.
            </p>
            <div className="site-footer-social">
              {SOCIAL_LINKS.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="site-footer-social-link" title={s.label} aria-label={s.label}>
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          <div className="site-footer-col">
            <div className="site-footer-col-title">Product</div>
            {PRODUCT_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="site-footer-link">{l.label}</Link>
            ))}
          </div>

          <div className="site-footer-col">
            <div className="site-footer-col-title">Resources</div>
            {RESOURCE_LINKS.map((l) => (
              <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="site-footer-link">
                {l.label} <span className="site-footer-link-arrow">↗</span>
              </a>
            ))}
          </div>
        </div>

        <div className="site-footer-bottom">
          <span className="site-footer-version">Conduit v0.1.0</span>
          <span className="site-footer-powered">Built on Arc Network · Powered by Circle</span>
        </div>
      </div>
    </footer>
  );
}
