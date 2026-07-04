"use client";

import { useState, useEffect, useRef } from "react";
import {
  useAccount, useConnect, useDisconnect,
  useSendTransaction, useWaitForTransactionReceipt,
  useBalance, useSwitchChain,
} from "wagmi";
import { injected } from "wagmi/connectors";
import { parseEther, formatEther } from "viem";
import { arcTestnet } from "@/lib/arcChain";
import { TrustBadge } from "@/components/TrustBadge";

const FEE_COLLECTOR = "0x2d2eba8c0da5879ab25b5bd37e211d230aabbb5c";
const FEE_PERCENT = 0.5;

function calcFee(amount: string) {
  const total = parseFloat(amount);
  const fee = Math.max((total * FEE_PERCENT) / 100, 0.001);
  return { fee: fee.toFixed(4), totalPays: (total + fee).toFixed(4) };
}

interface EscrowData {
  id: string;
  title: string;
  description?: string;
  amount: string;
  sellerAddress: string;
  sellerContact?: string;
  buyerAddress?: string;
  stealthAddress: string;
  deliveryDays?: number;
  deliveryDeadline?: string;
  status: string;
  txHash?: string;
  paidAt?: string;
  releaseDeadline?: string;
  confirmedAt?: string;
  disputedAt?: string;
  disputeDeadline?: string;
  sellerRespondedAt?: string;
  buyerLastMessageAt?: string;
}

interface Message {
  id: string;
  sender: string;
  senderAddress?: string;
  message: string;
  createdAt: string;
}

function Logo() {
  return (
    <div className="pay-logo">
      <img src="/conduit-logo-white.png" alt="Conduit" style={{ height: 58, width: "auto", objectFit: "contain" }} />
    </div>
  );
}

const IconLock = ({ size = 14, color = "var(--info)" }: { size?: number; color?: string }) => (
  <svg viewBox="0 0 16 16" fill="none" width={size} height={size}><rect x="3" y="7" width="10" height="8" rx="1.5" stroke={color} strokeWidth="1.3" /><path d="M5 7V5a3 3 0 016 0v2" stroke={color} strokeWidth="1.3" strokeLinecap="round" /></svg>
);
const IconWarning = ({ size = 13, color = "var(--warning)" }: { size?: number; color?: string }) => (
  <svg viewBox="0 0 16 16" fill="none" width={size} height={size}><path d="M8 2L1.5 13.5h13L8 2z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" /><path d="M8 6v3M8 11v.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" /></svg>
);
const IconBack = ({ size = 13 }: { size?: number }) => (
  <svg viewBox="0 0 16 16" fill="none" width={size} height={size}><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const IconX = ({ size = 24, color = "var(--danger)" }: { size?: number; color?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" width={size} height={size}><circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5" /><path d="M8 8l8 8M16 8l-8 8" stroke={color} strokeWidth="1.5" strokeLinecap="round" /></svg>
);
const IconBox = ({ size = 28, color = "var(--info)" }: { size?: number; color?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" width={size} height={size}><rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth="1.5" /><path d="M7 11V7a5 5 0 0110 0v4" stroke={color} strokeWidth="1.5" strokeLinecap="round" /></svg>
);

function Countdown({ deadline, label }: { deadline: string; label?: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const update = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) { setText("Expired"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (h > 0) setText(`${h}h ${m}m`);
      else setText(`${m}m`);
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [deadline]);
  const diff = new Date(deadline).getTime() - Date.now();
  const color = diff < 3600000 ? "var(--danger)" : diff < 14400000 ? "var(--warning)" : "var(--info)";
  return <span style={{ color, fontFamily: "IBM Plex Mono, monospace", fontSize: 11, fontWeight: 700 }}>{label ? `${label}: ` : ""}{text}</span>;
}

type PayStep = "idle" | "sending_payment" | "sending_fee" | "recording" | "done" | "failed";

export function EscrowPayPage({ escrow: initialEscrow }: { escrow: EscrowData }) {
  const [escrow, setEscrow] = useState(initialEscrow);
  const [mounted, setMounted] = useState(false);
  const [payStep, setPayStep] = useState<PayStep>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [feeTxHash, setFeeTxHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputing, setDisputing] = useState(false);
  const [localStatus, setLocalStatus] = useState(escrow.status);
  const [localDeadline, setLocalDeadline] = useState(escrow.releaseDeadline);
  const [localDeliveryDeadline, setLocalDeliveryDeadline] = useState(escrow.deliveryDeadline);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messagesLoaded, setMessagesLoaded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const disputeTextareaRef = useRef<HTMLTextAreaElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  const { address, isConnected, chainId } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const isOnArc = chainId === arcTestnet.id;

  const { fee: feeAmount, totalPays } = calcFee(escrow.amount);
  const { data: balance } = useBalance({ address, chainId: arcTestnet.id });
  const bal = balance ? parseFloat(formatEther(balance.value)) : 0;
  const hasEnough = bal >= parseFloat(totalPays);

  const { sendTransaction: sendPayment, isPending: isPaymentPending } = useSendTransaction();
  const { isLoading: isPaymentWaiting, isSuccess: paymentConfirmed } = useWaitForTransactionReceipt({ hash: txHash, chainId: arcTestnet.id });
  const { sendTransaction: sendFee, isPending: isFeePending } = useSendTransaction();
  const { isLoading: isFeeWaiting, isSuccess: feeConfirmed } = useWaitForTransactionReceipt({ hash: feeTxHash, chainId: arcTestnet.id });

  const deliveryPassed = !localDeliveryDeadline || new Date(localDeliveryDeadline) <= new Date();
  const isBuyer = address?.toLowerCase() === escrow.buyerAddress?.toLowerCase();
  const isSeller = address?.toLowerCase() === escrow.sellerAddress?.toLowerCase();
  const role = isBuyer ? "BUYER" : isSeller ? "SELLER" : null;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (["DISPUTED", "MEDIATION"].includes(localStatus) && !messagesLoaded) fetchMessages();
  }, [localStatus]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (paymentConfirmed && txHash && payStep === "sending_payment") {
      setPayStep("sending_fee");
      sendFee(
        { to: FEE_COLLECTOR as `0x${string}`, value: parseEther(feeAmount), chainId: arcTestnet.id },
        {
          onSuccess: (h) => { setFeeTxHash(h); },
          onError: () => { setPayStep("idle"); setError("Fee transaction failed. Please try again."); },
        }
      );
    }
  }, [paymentConfirmed]);

  useEffect(() => {
    if (feeConfirmed && feeTxHash && payStep === "sending_fee") {
      setPayStep("recording");
      recordPayment();
    }
  }, [feeConfirmed]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/escrow/${escrow.id}/messages`);
      if (res.ok) { const data = await res.json(); setMessages(data.messages ?? []); setMessagesLoaded(true); }
    } catch { }
  };

  const recordPayment = async () => {
    try {
      const res = await fetch(`/api/escrow/${escrow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pay", txHash, paidBy: address }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed."); setPayStep("failed"); return; }
      setLocalStatus("HOLDING");
      setLocalDeadline(data.releaseDeadline);
      setLocalDeliveryDeadline(data.deliveryDeadline);
      setPayStep("done");
      try {
        const existing = JSON.parse(localStorage.getItem("conduit-escrow-orders") ?? "[]");
        const updated = [{ id: escrow.id, title: escrow.title, amount: escrow.amount, paidAt: new Date().toISOString() }, ...existing.filter((o: any) => o.id !== escrow.id)].slice(0, 20);
        localStorage.setItem("conduit-escrow-orders", JSON.stringify(updated));
      } catch { }
    } catch {
      setError("Network error. Payment was sent — contact support.");
      setPayStep("failed");
    }
  };

  const handlePay = () => {
    setError("");
    setPayStep("sending_payment");
    sendPayment(
      { to: escrow.stealthAddress as `0x${string}`, value: parseEther(escrow.amount), chainId: arcTestnet.id },
      {
        onSuccess: (h) => { setTxHash(h); },
        onError: (err: Error) => {
          setPayStep("idle");
          setError(err.message?.includes("rejected") || err.message?.includes("denied") ? "Transaction rejected." : "Transaction failed.");
        },
      }
    );
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const res = await fetch(`/api/escrow/${escrow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm" }),
      });
      if (res.ok) {
        setLocalStatus("CONFIRMED");
        try {
          const existing = JSON.parse(localStorage.getItem("conduit-escrow-orders") ?? "[]");
          localStorage.setItem("conduit-escrow-orders", JSON.stringify(existing.filter((o: any) => o.id !== escrow.id)));
        } catch { }
      } else { const d = await res.json(); setError(d.error ?? "Failed."); }
    } catch { setError("Network error."); }
    finally { setConfirming(false); }
  };

  const handleDispute = async () => {
    const reason = disputeTextareaRef.current?.value ?? "";
    if (!reason.trim()) { setError("Please describe the issue."); return; }
    setDisputing(true);
    try {
      const res = await fetch(`/api/escrow/${escrow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dispute", disputeReason: reason }),
      });
      if (res.ok) {
        const data = await res.json();
        setLocalStatus("DISPUTED");
        setEscrow(prev => ({ ...prev, disputeDeadline: data.disputeDeadline, disputeReason: reason }));
        try {
          const existing = JSON.parse(localStorage.getItem("conduit-escrow-orders") ?? "[]");
          localStorage.setItem("conduit-escrow-orders", JSON.stringify(existing.filter((o: any) => o.id !== escrow.id)));
        } catch { }
        setShowDisputeForm(false);
        fetchMessages();
      } else { const d = await res.json(); setError(d.error ?? "Failed."); }
    } catch { setError("Network error."); }
    finally { setDisputing(false); }
  };

  const sendMessage = async () => {
    const msg = messageInputRef.current?.value ?? "";
    if (!msg.trim() || !address) return;
    setSendingMessage(true);
    try {
      const res = await fetch(`/api/escrow/${escrow.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg.trim(), senderAddress: address }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);
        if (messageInputRef.current) messageInputRef.current.value = "";
        const escrowRes = await fetch(`/api/escrow/${escrow.id}`);
        if (escrowRes.ok) { const escrowData = await escrowRes.json(); setLocalStatus(escrowData.escrow.status); setEscrow(escrowData.escrow); }
        fetchMessages();
      } else { const d = await res.json(); setError(d.error ?? "Failed."); }
    } catch { setError("Network error."); }
    finally { setSendingMessage(false); }
  };

  const statusMsg = () => {
    if (isPaymentPending) return "Confirm payment in MetaMask...";
    if (isPaymentWaiting) return "Confirming payment...";
    if (payStep === "sending_fee" && isFeePending) return "Confirm fee in MetaMask...";
    if (payStep === "sending_fee" && isFeeWaiting) return "Confirming fee...";
    if (payStep === "recording") return "Recording payment...";
    return "Processing...";
  };

  const isBusy = ["sending_payment", "sending_fee", "recording"].includes(payStep) || isPaymentPending || isPaymentWaiting || isFeePending || isFeeWaiting;
  const fmt = (n: number) => n % 1 === 0 ? n.toString() : n.toFixed(2);

  const bubbleClass = (sender: string) => {
    if (sender === "SYSTEM") return "escrow-msg-bubble system";
    const isMine = (sender === "BUYER" && isBuyer) || (sender === "SELLER" && isSeller);
    return `escrow-msg-bubble ${isMine ? "mine" : "theirs"}`;
  };

  // Called as MediationThread() not <MediationThread /> — prevents remount on parent re-render
  const MediationThread = () => (
    <div style={{ marginTop: 20 }}>
      <div className="escrow-dispute-banner">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: "var(--danger)", marginBottom: 4 }}>
              {localStatus === "MEDIATION" ? "Under Admin Review" : "Dispute Mediation"}
            </p>
            <p style={{ fontSize: 11, color: "var(--ink-3)", lineHeight: 1.5 }}>
              {localStatus === "MEDIATION" ? "Both parties have responded. Admin will review and make a decision within 24 hours." : "Submit your side of the story. Both parties have 48 hours to respond."}
            </p>
          </div>
          {escrow.disputeDeadline && localStatus === "DISPUTED" && (
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 10, color: "var(--ink-3)", marginBottom: 3 }}>Response deadline</p>
              <Countdown deadline={escrow.disputeDeadline} />
            </div>
          )}
        </div>
        {localStatus === "DISPUTED" && (
          <div className="escrow-dispute-progress">
            <div className="escrow-dispute-progress-item">
              <div className="escrow-dispute-progress-dot" style={{ background: escrow.sellerRespondedAt ? "var(--c)" : "var(--ink-3)" }} />
              <span style={{ fontSize: 10, color: escrow.sellerRespondedAt ? "var(--c)" : "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>Seller {escrow.sellerRespondedAt ? "responded" : "has not responded yet"}</span>
            </div>
            <div className="escrow-dispute-progress-item">
              <div className="escrow-dispute-progress-dot" style={{ background: escrow.buyerLastMessageAt ? "var(--c)" : "var(--ink-3)" }} />
              <span style={{ fontSize: 10, color: escrow.buyerLastMessageAt ? "var(--c)" : "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>Buyer {escrow.buyerLastMessageAt ? "responded" : "opened the dispute"}</span>
            </div>
          </div>
        )}
      </div>
      <div className="escrow-thread">
        <div className="escrow-thread-head">
          <svg viewBox="0 0 16 16" fill="none" width="12" height="12"><path d="M14 2H2a1 1 0 00-1 1v8a1 1 0 001 1h3l3 3 3-3h3a1 1 0 001-1V3a1 1 0 00-1-1z" stroke="var(--ink-3)" strokeWidth="1.2" /></svg>
          <span className="escrow-thread-head-label">Mediation Thread</span>
          {role && <span className={`escrow-party-role ${role === "BUYER" ? "buyer" : "seller"}`} style={{ marginLeft: 4 }}>You are the {role}</span>}
        </div>
        <div className="escrow-thread-body">
          {messages.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--ink-3)", textAlign: "center", padding: "20px 0" }}>Loading messages...</p>
          ) : messages.map(msg => (
            <div key={msg.id} style={{ display: "flex", flexDirection: "column" as const }}>
              {msg.sender !== "SYSTEM" && (
                <span className="escrow-msg-meta" style={{ alignSelf: ((msg.sender === "BUYER" && isBuyer) || (msg.sender === "SELLER" && isSeller)) ? "flex-end" : "flex-start" }}>
                  {msg.sender === "BUYER" ? "Buyer" : msg.sender === "SELLER" ? "Seller" : "Admin"} · {new Date(msg.createdAt).toLocaleDateString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              <div className={bubbleClass(msg.sender)}>{msg.message}</div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        {role && localStatus !== "MEDIATION" && (
          <div className="escrow-thread-input-row">
            {error && <p style={{ fontSize: 11, color: "var(--danger)", marginBottom: 8 }}>{error}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <textarea
                ref={messageInputRef}
                defaultValue=""
                className="escrow-thread-textarea"
                placeholder={role === "SELLER" ? "Submit your evidence — proof of delivery, tracking info, ArcScan links..." : "Add more details about your dispute..."}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              />
              <button
                onClick={sendMessage}
                disabled={sendingMessage}
                className="escrow-thread-send"
                style={{ background: role === "SELLER" ? "var(--c)" : "var(--info)" }}
              >
                {sendingMessage ? "..." : "Send"}
              </button>
            </div>
            <p style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 6 }}>Press Enter to send · Shift+Enter for new line</p>
          </div>
        )}
      </div>
      <a href="/" className="escrow-back-link"><IconBack /> Back to Conduit</a>
    </div>
  );

  // ── STATUS SCREENS ─────────────────────────────────────────────

  if (localStatus === "CANCELLED") return (
    <div className="pay-page"><Logo /><p className="pay-tagline">ESCROW</p>
      <div className="pay-card"><div className="pay-card-bar" />
        <div className="pay-actions" style={{ textAlign: "center", padding: "36px 28px" }}>
          <div className="escrow-status-icon sm" style={{ background: "var(--danger-dim)", borderColor: "rgba(240,62,95,.2)" }}>
            <IconX size={24} />
          </div>
          <p style={{ fontSize: 18, fontWeight: 800, color: "var(--danger)", marginBottom: 8 }}>Escrow Cancelled</p>
          <p style={{ fontSize: 13, color: "var(--ink-2)", marginBottom: 20 }}>This escrow has been cancelled by the seller.</p>
          <a href="/" className="escrow-back-link"><IconBack /> Back to Conduit</a>
        </div>
      </div>
      <p className="pay-powered">Powered by Arc Network & Circle</p>
    </div>
  );

  if (["CONFIRMED", "RELEASED"].includes(localStatus) && payStep !== "done") return (
    <div className="pay-page"><Logo /><p className="pay-tagline">ESCROW</p>
      <div className="pay-card"><div className="pay-card-bar" />
        <div className="pay-actions" style={{ textAlign: "center" }}>
          <div className="pay-success-icon"><svg viewBox="0 0 24 24" fill="none" width="28" height="28"><path d="M5 12l4.5 4.5L19 7" stroke="var(--c)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
          <p className="pay-success-title">Receipt Confirmed!</p>
          <p className="pay-success-desc">Funds have been released to the seller.</p>
          <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 16, padding: "11px 22px", background: "var(--c)", borderRadius: "var(--r-md)", fontSize: 13, fontWeight: 700, color: "#04140d", textDecoration: "none" }}>
            Go to Dashboard
            <svg viewBox="0 0 16 16" fill="none" width="13" height="13"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
        </div>
      </div>
      <p className="pay-powered">Powered by Arc Network & Circle</p>
    </div>
  );

  if (["DISPUTED", "MEDIATION"].includes(localStatus)) return (
    <div className="pay-page"><Logo /><p className="pay-tagline">ESCROW DISPUTE</p>
      <div className="pay-card" style={{ maxWidth: 520 }}><div className="pay-card-bar" />
        <div className="pay-amount-zone" style={{ paddingBottom: 12 }}>
          <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 4 }}>{escrow.title}</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: "var(--info)", fontFamily: "IBM Plex Mono, monospace" }}>{fmt(parseFloat(escrow.amount))} <span style={{ fontSize: 13 }}>USDC</span></p>
        </div>
        <div style={{ padding: "0 24px 24px" }}>
          {mounted && MediationThread()}
        </div>
      </div>
      <p className="pay-powered">Powered by Arc Network & Circle</p>
    </div>
  );

  // HOLDING — after payment
  if (payStep === "done" || localStatus === "HOLDING") return (
    <div className="pay-page"><Logo /><p className="pay-tagline">ESCROW</p>
      <div className="pay-card"><div className="pay-card-bar" />
        <div className="pay-actions" style={{ textAlign: "center" }}>
          <div className="escrow-status-icon" style={{ background: "var(--info-dim)", borderColor: "var(--info-border)" }}>
            <IconBox />
          </div>
          {!deliveryPassed ? (
            <>
              <p style={{ fontSize: 20, fontWeight: 800, color: "var(--ink-1)", marginBottom: 8 }}>Awaiting Delivery</p>
              <p style={{ fontSize: 14, color: "var(--info)", fontWeight: 700, fontFamily: "IBM Plex Mono, monospace", marginBottom: 4 }}>{escrow.amount} USDC secured</p>
              <p style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 16, lineHeight: 1.6 }}>
                Your payment is held securely. The seller has {escrow.deliveryDays ?? 7} day{(escrow.deliveryDays ?? 7) > 1 ? "s" : ""} to deliver your order. You can confirm or dispute once the delivery window passes.
              </p>
              {localDeliveryDeadline && (
                <div className="escrow-info-box blue">
                  <p className="escrow-info-box-title" style={{ color: "var(--info)", letterSpacing: ".08em", fontFamily: "IBM Plex Mono, monospace" }}>DELIVERY WINDOW</p>
                  <p style={{ fontSize: 13, color: "var(--ink-1)", fontWeight: 700 }}>Expected by {new Date(localDeliveryDeadline).toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
                  <Countdown deadline={localDeliveryDeadline} label="" />
                </div>
              )}
            </>
          ) : (
            <>
              <p style={{ fontSize: 20, fontWeight: 800, color: "var(--ink-1)", marginBottom: 8 }}>Funds Held in Escrow</p>
              <p style={{ fontSize: 14, color: "var(--info)", fontWeight: 700, fontFamily: "IBM Plex Mono, monospace", marginBottom: 4 }}>{escrow.amount} USDC</p>
              <p style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 16, lineHeight: 1.6 }}>The delivery window has passed. Did you receive your order?</p>
            </>
          )}

          {escrow.sellerContact && (
            <div className="escrow-contact-box">
              <p className="escrow-contact-label">CONTACT SELLER FOR DELIVERY</p>
              <p style={{ fontSize: 13, color: "var(--ink-1)", fontWeight: 700 }}>{escrow.sellerContact}</p>
              <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>Reach out to arrange delivery of your order.</p>
            </div>
          )}

          <div className="escrow-bookmark-box">
            <svg viewBox="0 0 16 16" fill="none" width="13" height="13" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="8" cy="8" r="6" stroke="var(--ink-3)" strokeWidth="1.2" />
              <path d="M8 5v3l2 1.5" stroke="var(--ink-3)" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <div>
              <p style={{ fontSize: 11, color: "var(--ink-2)", fontWeight: 600, marginBottom: 3 }}>You can close this page</p>
              <p style={{ fontSize: 11, color: "var(--ink-3)", lineHeight: 1.5 }}>Bookmark this URL and come back anytime to confirm receipt or raise a dispute.</p>
            </div>
          </div>

          {localDeadline && <p style={{ fontSize: 11, color: "var(--ink-3)", marginBottom: 16 }}><Countdown deadline={localDeadline} label="Auto-release in" /></p>}

          {deliveryPassed && !showDisputeForm && (
            <button onClick={handleConfirm} disabled={confirming} className="form-submit-btn" style={{ marginBottom: 10 }}>
              {confirming ? "Releasing funds..." : "I received my order — Release funds"}
            </button>
          )}

          {deliveryPassed && !showDisputeForm && (
            <button onClick={() => setShowDisputeForm(true)}
              style={{ width: "100%", padding: "12px", background: "transparent", border: "1px solid rgba(240,62,95,.3)", borderRadius: "var(--r-md)", color: "var(--danger)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Sora, sans-serif" }}>
              Raise a Dispute
            </button>
          )}

          {deliveryPassed && !showDisputeForm && localDeadline && (
            <p style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 8, fontFamily: "IBM Plex Mono, monospace" }}>
              No action? Funds auto-release in <Countdown deadline={localDeadline} label="" />
            </p>
          )}

          {(txHash || escrow.txHash) && (
            <a href={`https://testnet.arcscan.app/tx/${txHash ?? escrow.txHash}`} target="_blank" rel="noopener noreferrer" className="pay-tx-link" style={{ display: "block", marginTop: 16 }}>View payment on ArcScan ↗</a>
          )}
          <br />
          <a href="/" className="escrow-back-link"><IconBack /> Back to Conduit</a>
        </div>
      </div>

      {/* Dispute form — uncontrolled textarea, rendered outside pay-actions */}
      {deliveryPassed && showDisputeForm && (
        <div style={{ width: "100%", maxWidth: 480, margin: "12px auto 0", padding: "0 24px" }}>
          <p style={{ fontSize: 12, color: "var(--danger)", fontWeight: 700, marginBottom: 8 }}>Describe the issue:</p>
          <textarea
            ref={disputeTextareaRef}
            autoFocus
            defaultValue=""
            placeholder="e.g. Item not delivered, wrong item received..."
            style={{ width: "100%", padding: "10px 12px", background: "var(--raised)", border: "1px solid rgba(240,62,95,.3)", borderRadius: "var(--r-sm)", color: "var(--ink-1)", fontSize: 12, fontFamily: "Sora, sans-serif", resize: "vertical", minHeight: 80, boxSizing: "border-box" as const, outline: "none" }}
          />
          {error && <div className="pay-err-box" style={{ marginTop: 8 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button
              onClick={() => {
                setShowDisputeForm(false);
                setError("");
                if (disputeTextareaRef.current) disputeTextareaRef.current.value = "";
              }}
              style={{ flex: 1, padding: "10px", background: "var(--raised)", border: "1px solid var(--stroke)", borderRadius: "var(--r-sm)", color: "var(--ink-2)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Sora, sans-serif" }}
            >
              Cancel
            </button>
            <button onClick={handleDispute} disabled={disputing} style={{ flex: 2, padding: "10px", background: "var(--danger)", border: "none", borderRadius: "var(--r-sm)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: disputing ? "not-allowed" : "pointer", fontFamily: "Sora, sans-serif", opacity: disputing ? .5 : 1 }}>
              {disputing ? "Submitting..." : "Submit Dispute"}
            </button>
          </div>
        </div>
      )}

      <p className="pay-powered">Powered by Arc Network & Circle</p>
    </div>
  );

  // Main pay page
  return (
    <div className="pay-page">
      <Logo />
      <p className="pay-tagline">ESCROW PAYMENT</p>
      <div className="pay-card">
        <div className="pay-card-bar" />
        <div className="escrow-protected-row">
          <IconLock size={12} /> PROTECTED BY CONDUIT ESCROW
        </div>
        <div className="pay-amount-zone">
          <div>
            <span className="pay-amount">{fmt(parseFloat(escrow.amount))}</span>
            <span className="pay-currency">USDC</span>
          </div>
          <p className="pay-link-title">{escrow.title}</p>
          {escrow.description && <p className="pay-link-desc">{escrow.description}</p>}
        </div>
        <div className="escrow-rep-row">
          <div className="escrow-rep-label">
            <span className="escrow-rep-label-title">SELLER REPUTATION</span>
            <span className="escrow-rep-label-sub">Based on completed escrows</span>
          </div>
          <TrustBadge address={escrow.sellerAddress} size="full" />
        </div>
        <div className="pay-details">
          <div className="pay-detail">
            <span className="pay-detail-k">Seller</span>
            <span className="pay-detail-v" style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 11 }}>{escrow.sellerAddress.slice(0, 6)}...{escrow.sellerAddress.slice(-4)}</span>
          </div>
          <div className="pay-detail">
            <span className="pay-detail-k">Held in</span>
            <span className="pay-detail-v" style={{ color: "var(--info)", fontSize: 11 }}>Escrow wallet</span>
          </div>
          <div className="pay-detail">
            <span className="pay-detail-k">Delivery window</span>
            <span className="pay-detail-v" style={{ fontSize: 11, color: "var(--ink-3)" }}>{escrow.deliveryDays ?? 7} day{(escrow.deliveryDays ?? 7) > 1 ? "s" : ""} from payment</span>
          </div>
          <div className="pay-detail">
            <span className="pay-detail-k">Auto-release</span>
            <span className="pay-detail-v" style={{ fontSize: 11, color: "var(--ink-3)" }}>7 days after delivery deadline</span>
          </div>
          {escrow.sellerContact && (
            <div className="pay-detail">
              <span className="pay-detail-k">Seller contact</span>
              <span className="pay-detail-v" style={{ fontSize: 11, color: "var(--info)", fontWeight: 600 }}>{escrow.sellerContact}</span>
            </div>
          )}
          <div style={{ marginTop: 4, paddingTop: 10, borderTop: "1px dashed var(--stroke)" }}>
            <div className="pay-detail">
              <span className="pay-detail-k">Escrow amount</span>
              <span className="pay-detail-v" style={{ color: "var(--info)" }}>{escrow.amount} USDC</span>
            </div>
            <div className="pay-detail" style={{ marginTop: 6 }}>
              <span className="pay-detail-k" style={{ color: "var(--ink-3)" }}>Service fee ({FEE_PERCENT}%)</span>
              <span className="pay-detail-v" style={{ color: "var(--ink-3)", fontSize: 11 }}>+{feeAmount} USDC</span>
            </div>
            <div className="pay-detail" style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--stroke)" }}>
              <span className="pay-detail-k" style={{ fontWeight: 700, color: "var(--ink-1)" }}>Total you pay</span>
              <span className="pay-detail-v" style={{ fontWeight: 800, color: "var(--ink-1)" }}>{totalPays} USDC</span>
            </div>
          </div>
        </div>
        <div className="escrow-info-box blue">
          <p className="escrow-info-box-title" style={{ color: "var(--info)" }}>How Escrow Works</p>
          {["Your payment is held securely — not sent to seller yet", "Seller delivers your order", "You confirm receipt to release funds", "Dispute after delivery window — both sides submit evidence, auto-resolved in 48hrs"].map((step, i) => (
            <div key={i} className="escrow-info-step">
              <span className="escrow-info-step-num" style={{ color: "var(--info)" }}>{i + 1}.</span>
              <span className="escrow-info-step-text">{step}</span>
            </div>
          ))}
        </div>
        <div className="pay-actions">
          {!mounted ? null : !isConnected ? (
            <button className="pay-connect-btn" onClick={() => connect({ connector: injected() })}>Connect Wallet to Pay</button>
          ) : !isOnArc ? (
            <>
              <div className="pay-warn-box" style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <IconWarning /> Switch to Arc Testnet to continue.
              </div>
              <button className="pay-switch-btn" onClick={() => switchChain({ chainId: arcTestnet.id })}>Switch to Arc Testnet</button>
            </>
          ) : isBusy ? (
            <div className="pay-spin-zone">
              <div className="pay-spinner" />
              <p className="pay-spin-text">{statusMsg()}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: txHash ? "var(--c)" : "var(--stroke2)" }} />
                  <span style={{ fontSize: 10, color: txHash ? "var(--c)" : "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>Payment</span>
                </div>
                <div style={{ width: 20, height: 1, background: "var(--stroke2)" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: feeTxHash ? "var(--c)" : "var(--stroke2)" }} />
                  <span style={{ fontSize: 10, color: feeTxHash ? "var(--c)" : "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>Fee</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <button className="pay-connect-btn" onClick={handlePay} disabled={!hasEnough} style={{ background: "linear-gradient(135deg, #3b5bdb, var(--info))", ...(!hasEnough ? { opacity: .3, cursor: "not-allowed" } : {}) }}>
                Pay {totalPays} USDC into Escrow
              </button>
              <p style={{ fontSize: 10, color: "var(--ink-3)", textAlign: "center", marginTop: 8, fontFamily: "IBM Plex Mono, monospace" }}>
                2 confirmations — {escrow.amount} USDC escrow + {feeAmount} USDC fee
              </p>
              {balance && (
                <p className={`pay-bal${!hasEnough ? " low" : ""}`}>
                  Balance: <span style={{ color: "var(--ink-2)" }}>{bal.toFixed(4)} USDC</span>
                  {!hasEnough && <> — <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer" className="pay-bal-link">get USDC</a></>}
                </p>
              )}
              {error && <div className="pay-err-box" style={{ marginTop: 10 }}>{error}</div>}
            </>
          )}
        </div>
        {mounted && isConnected && address && (
          <div className="pay-wallet-row">
            <span className="pay-wallet-addr">{address.slice(0, 6)}...{address.slice(-4)}</span>
            <button className="pay-disc-btn" onClick={() => disconnect()}>Disconnect</button>
          </div>
        )}
      </div>
      <p className="pay-powered">Powered by Arc Network & Circle</p>
    </div>
  );
}
