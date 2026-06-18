import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Conduit Pay <noreply@conduitpay.xyz>";
const REPLY_TO = "conduitpay@gmail.com";
const BASE_URL = "https://conduitpay.xyz";

async function send(to: string, subject: string, html: string) {
    try {
        await resend.emails.send({ from: FROM, to, subject, html, replyTo: REPLY_TO });
    } catch (err: any) {
        console.error("[email] Failed to send:", err.message);
    }
}

function base(content: string): string {
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
  body { margin: 0; padding: 0; background: #0a0a0a; font-family: 'Helvetica Neue', Arial, sans-serif; color: #f0f0f0; }
  .wrap { max-width: 520px; margin: 40px auto; padding: 0 20px; }
  .card { background: #111; border: 1px solid #222; border-radius: 16px; overflow: hidden; }
  .bar { height: 3px; background: linear-gradient(90deg, #00E5A0, #5b8ff9); }
  .body { padding: 32px 36px; }
  .logo { font-size: 18px; font-weight: 900; color: #00E5A0; letter-spacing: -.04em; margin-bottom: 24px; }
  h1 { font-size: 22px; font-weight: 800; color: #f0f0f0; margin: 0 0 8px; letter-spacing: -.03em; }
  p { font-size: 14px; color: #888; line-height: 1.7; margin: 0 0 16px; }
  .amount { font-size: 28px; font-weight: 900; color: #00E5A0; font-family: 'Courier New', monospace; margin: 20px 0; }
  .amount span { font-size: 14px; color: #5b8ff9; margin-left: 4px; font-weight: 700; }
  .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #1a1a1a; font-size: 13px; }
  .info-label { color: #555; }
  .info-val { color: #ccc; font-family: 'Courier New', monospace; font-weight: 600; }
  .btn { display: inline-block; padding: 12px 24px; background: #00E5A0; border-radius: 10px; color: #000; font-size: 14px; font-weight: 800; text-decoration: none; margin-top: 20px; }
  .footer { padding: 20px 36px; border-top: 1px solid #1a1a1a; font-size: 11px; color: #333; }
  .tag { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 4px; font-size: 10px; font-weight: 700; font-family: 'Courier New', monospace; }
  .tag-green { background: rgba(0,229,160,.1); color: #00E5A0; border: 1px solid rgba(0,229,160,.2); }
  .tag-blue { background: rgba(91,143,249,.1); color: #5b8ff9; border: 1px solid rgba(91,143,249,.2); }
  .tag-red { background: rgba(240,62,95,.1); color: #f03e5f; border: 1px solid rgba(240,62,95,.2); }
  .tag-purple { background: rgba(167,139,250,.1); color: #a78bfa; border: 1px solid rgba(167,139,250,.2); }
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="bar"></div>
    <div class="body">
      <div class="logo">Conduit</div>
      ${content}
    </div>
    <div class="footer">
      Conduit Pay &middot; <a href="${BASE_URL}" style="color: #444; text-decoration: none;">conduitpay.xyz</a> &middot; Built on Arc Network &middot; Powered by Circle USDC
    </div>
  </div>
</div>
</body>
</html>`;
}

// ─── Email: Payment received (seller) ────────────────────────────────────────

export async function sendPaymentReceivedEmail(opts: {
    to: string;
    sellerUsername?: string;
    title: string;
    amount: string;
    paidBy?: string;
    txHash?: string;
    linkId: string;
}) {
    const html = base(`
        <span class="tag tag-green">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style="vertical-align:middle"><circle cx="8" cy="8" r="6" stroke="#00E5A0" stroke-width="1.5"/><path d="M8 4v8M6 6c0-.8 1-1.5 2-1.5s2 .7 2 1.5-1 1.5-2 1.5-2 .7-2 1.5 1 1.5 2 1.5 2-.7 2-1.5" stroke="#00E5A0" stroke-width="1.2" stroke-linecap="round"/></svg>
          PAYMENT RECEIVED
        </span>
        <h1 style="margin-top: 12px;">You received a payment</h1>
        <p>Someone paid your link <strong style="color: #f0f0f0;">${opts.title}</strong>.</p>
        <div class="amount">${opts.amount}<span>USDC</span></div>
        <div style="margin: 20px 0;">
            ${opts.paidBy ? `<div class="info-row"><span class="info-label">Paid by</span><span class="info-val">${opts.paidBy.slice(0, 8)}...${opts.paidBy.slice(-6)}</span></div>` : ""}
            ${opts.txHash ? `<div class="info-row"><span class="info-label">Transaction</span><span class="info-val"><a href="https://testnet.arcscan.app/tx/${opts.txHash}" style="color: #00E5A0; text-decoration: none;">${opts.txHash.slice(0, 10)}...</a></span></div>` : ""}
            <div class="info-row"><span class="info-label">Network</span><span class="info-val">Arc Testnet</span></div>
        </div>
        <a href="${BASE_URL}/transactions" class="btn">View Transactions</a>
    `);
    await send(opts.to, `Payment received — ${opts.amount} USDC for "${opts.title}"`, html);
}

// ─── Email: Escrow paid (seller) ──────────────────────────────────────────────

export async function sendEscrowPaidEmail(opts: {
    to: string;
    title: string;
    amount: string;
    buyerAddress?: string;
    deliveryDays?: number;
    escrowId: string;
}) {
    const html = base(`
        <span class="tag tag-blue">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style="vertical-align:middle"><rect x="2" y="6" width="12" height="9" rx="1.5" stroke="#5b8ff9" stroke-width="1.5"/><path d="M5 6V4.5a3 3 0 016 0V6" stroke="#5b8ff9" stroke-width="1.5" stroke-linecap="round"/></svg>
          ESCROW FUNDED
        </span>
        <h1 style="margin-top: 12px;">Your escrow has been funded</h1>
        <p>A buyer has paid your escrow link <strong style="color: #f0f0f0;">${opts.title}</strong>. Funds are held securely until you deliver.</p>
        <div class="amount">${opts.amount}<span>USDC</span></div>
        <div style="margin: 20px 0;">
            ${opts.buyerAddress ? `<div class="info-row"><span class="info-label">Buyer</span><span class="info-val">${opts.buyerAddress.slice(0, 8)}...${opts.buyerAddress.slice(-6)}</span></div>` : ""}
            <div class="info-row"><span class="info-label">Delivery window</span><span class="info-val">${opts.deliveryDays ?? 7} days</span></div>
            <div class="info-row"><span class="info-label">Custody</span><span class="info-val">Circle Developer Wallets</span></div>
        </div>
        <p style="font-size: 13px; color: #666;">Deliver within the agreed window. The buyer will confirm receipt and funds will be released to you.</p>
        <a href="${BASE_URL}/escrow" class="btn">View Escrow</a>
    `);
    await send(opts.to, `Escrow funded — ${opts.amount} USDC held for "${opts.title}"`, html);
}

// ─── Email: Escrow released (buyer) ──────────────────────────────────────────

export async function sendEscrowReleasedEmail(opts: {
    to: string;
    title: string;
    amount: string;
    sellerAddress: string;
    txHash?: string;
    escrowId: string;
}) {
    const html = base(`
        <span class="tag tag-green">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style="vertical-align:middle"><path d="M3 8l4 4 6-6" stroke="#00E5A0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          ESCROW RELEASED
        </span>
        <h1 style="margin-top: 12px;">Funds released to seller</h1>
        <p>The escrow for <strong style="color: #f0f0f0;">${opts.title}</strong> has been completed. Funds were released to the seller.</p>
        <div class="amount">${opts.amount}<span>USDC</span></div>
        <div style="margin: 20px 0;">
            <div class="info-row"><span class="info-label">Seller</span><span class="info-val">${opts.sellerAddress.slice(0, 8)}...${opts.sellerAddress.slice(-6)}</span></div>
            ${opts.txHash ? `<div class="info-row"><span class="info-label">Transaction</span><span class="info-val"><a href="https://testnet.arcscan.app/tx/${opts.txHash}" style="color: #00E5A0; text-decoration: none;">${opts.txHash.slice(0, 10)}...</a></span></div>` : ""}
            <div class="info-row"><span class="info-label">Status</span><span class="info-val" style="color: #00E5A0;">RELEASED</span></div>
        </div>
        <a href="${BASE_URL}/escrow" class="btn">View Escrow</a>
    `);
    await send(opts.to, `Escrow complete — "${opts.title}"`, html);
}

// ─── Email: Dispute raised (seller) ──────────────────────────────────────────

export async function sendDisputeRaisedEmail(opts: {
    to: string;
    title: string;
    amount: string;
    disputeReason?: string;
    escrowId: string;
    buyerAddress?: string;
}) {
    const html = base(`
        <span class="tag tag-red">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style="vertical-align:middle"><path d="M8 5v4m0 2.5h.01M2 13L8 2l6 11H2z" stroke="#f03e5f" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          DISPUTE RAISED
        </span>
        <h1 style="margin-top: 12px;">A dispute has been opened</h1>
        <p>The buyer has raised a dispute on your escrow <strong style="color: #f0f0f0;">${opts.title}</strong>. You have <strong style="color: #f03e5f;">48 hours</strong> to respond or funds will be automatically refunded.</p>
        <div class="amount">${opts.amount}<span>USDC</span></div>
        <div style="margin: 20px 0;">
            ${opts.buyerAddress ? `<div class="info-row"><span class="info-label">Buyer</span><span class="info-val">${opts.buyerAddress.slice(0, 8)}...${opts.buyerAddress.slice(-6)}</span></div>` : ""}
            ${opts.disputeReason ? `<div class="info-row"><span class="info-label">Reason</span><span class="info-val" style="color: #f03e5f; max-width: 240px; text-align: right;">${opts.disputeReason.slice(0, 80)}</span></div>` : ""}
            <div class="info-row"><span class="info-label">Deadline</span><span class="info-val" style="color: #f03e5f;">48 hours to respond</span></div>
        </div>
        <p style="font-size: 13px; color: #666;">Submit your evidence in the dispute thread. If you do not respond in time, funds will be automatically refunded to the buyer.</p>
        <a href="${BASE_URL}/escrow/${opts.escrowId}" class="btn" style="background: #f03e5f; color: #fff;">Respond to Dispute</a>
    `);
    await send(opts.to, `Dispute raised on "${opts.title}" — respond within 48 hours`, html);
}

// ─── Email: Escrow refunded (buyer) ──────────────────────────────────────────

export async function sendEscrowRefundedEmail(opts: {
    to: string;
    title: string;
    amount: string;
    txHash?: string;
    escrowId: string;
}) {
    const html = base(`
        <span class="tag tag-purple">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style="vertical-align:middle"><path d="M2 8a6 6 0 1012 0M2 8l3-3M2 8l3 3" stroke="#a78bfa" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          REFUND PROCESSED
        </span>
        <h1 style="margin-top: 12px;">Your refund has been processed</h1>
        <p>Your dispute on <strong style="color: #f0f0f0;">${opts.title}</strong> was resolved in your favour. Your USDC has been refunded.</p>
        <div class="amount">${opts.amount}<span>USDC</span></div>
        <div style="margin: 20px 0;">
            ${opts.txHash ? `<div class="info-row"><span class="info-label">Transaction</span><span class="info-val"><a href="https://testnet.arcscan.app/tx/${opts.txHash}" style="color: #00E5A0; text-decoration: none;">${opts.txHash.slice(0, 10)}...</a></span></div>` : ""}
            <div class="info-row"><span class="info-label">Status</span><span class="info-val" style="color: #a78bfa;">REFUNDED</span></div>
        </div>
        <a href="${BASE_URL}/transactions" class="btn">View Transactions</a>
    `);
    await send(opts.to, `Refund processed — ${opts.amount} USDC for "${opts.title}"`, html);
}

// ─── Email: Marketplace listing approved ─────────────────────────────────────

export async function sendListingApprovedEmail(opts: {
    to: string;
    name: string;
    endpoint: string;
    price: string;
    listingId: string;
}) {
    const html = base(`
        <span class="tag tag-green">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style="vertical-align:middle"><path d="M3 8l4 4 6-6" stroke="#00E5A0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          LISTING APPROVED
        </span>
        <h1 style="margin-top: 12px;">Your API is live on the marketplace</h1>
        <p>Your listing <strong style="color: #f0f0f0;">${opts.name}</strong> has been approved and is now visible to developers and AI agents on the Conduit marketplace.</p>
        <div style="margin: 20px 0;">
            <div class="info-row"><span class="info-label">API Name</span><span class="info-val">${opts.name}</span></div>
            <div class="info-row"><span class="info-label">Endpoint</span><span class="info-val" style="max-width: 240px; text-align: right; overflow: hidden; text-overflow: ellipsis;">${opts.endpoint}</span></div>
            <div class="info-row"><span class="info-label">Price</span><span class="info-val" style="color: #00E5A0;">${opts.price} USDC / request</span></div>
        </div>
        <p style="font-size: 13px; color: #666;">AI agents and developers can now discover and pay for your API in USDC on Arc Network.</p>
        <a href="${BASE_URL}/marketplace/${opts.listingId}" class="btn">View Your Listing</a>
    `);
    await send(opts.to, `Your API "${opts.name}" is live on the Conduit Marketplace`, html);
}

// ─── Email: Marketplace listing rejected ─────────────────────────────────────

export async function sendListingRejectedEmail(opts: {
    to: string;
    name: string;
}) {
    const html = base(`
        <span class="tag tag-red">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style="vertical-align:middle"><path d="M4 4l8 8M12 4l-8 8" stroke="#f03e5f" stroke-width="1.5" stroke-linecap="round"/></svg>
          LISTING REJECTED
        </span>
        <h1 style="margin-top: 12px;">Your listing needs some changes</h1>
        <p>Your API listing <strong style="color: #f0f0f0;">${opts.name}</strong> was not approved at this time.</p>
        <p style="font-size: 13px; color: #666;">Common reasons: the endpoint does not return a 402, the description is unclear, or the price is set to 0. Fix these and resubmit.</p>
        <a href="${BASE_URL}/marketplace/submit" class="btn" style="background: #222; color: #f0f0f0; border: 1px solid #333;">Resubmit</a>
    `);
    await send(opts.to, `Your API listing "${opts.name}" was not approved`, html);
}
// ─── Email: Payment request received (recipient) ──────────────────────────────

export async function sendPaymentRequestEmail(opts: {
    to: string;
    requesterUsername?: string | null;
    requesterAddress: string;
    recipientUsername?: string | null;
    title: string;
    amount: string;
    note?: string;
    requestId: string;
    expiresAt?: string;
}) {
    const requesterDisplay = opts.requesterUsername
        ? `@${opts.requesterUsername}`
        : `${opts.requesterAddress.slice(0, 8)}...${opts.requesterAddress.slice(-6)}`;

    const html = base(`
        <span class="tag tag-blue">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style="vertical-align:middle"><rect x="1" y="3" width="14" height="10" rx="2" stroke="#5b8ff9" stroke-width="1.5"/><path d="M1 7h14" stroke="#5b8ff9" stroke-width="1.5"/></svg>
          PAYMENT REQUEST
        </span>
        <h1 style="margin-top: 12px;">${requesterDisplay} is requesting payment</h1>
        <p><strong style="color: #f0f0f0;">${requesterDisplay}</strong> has sent you a payment request on Conduit.</p>
        <div class="amount">${opts.amount}<span>USDC</span></div>
        <div style="margin: 20px 0;">
            <div class="info-row"><span class="info-label">For</span><span class="info-val">${opts.title}</span></div>
            ${opts.note ? `<div class="info-row"><span class="info-label">Note</span><span class="info-val" style="max-width: 240px; text-align: right;">${opts.note.slice(0, 100)}</span></div>` : ""}
            ${opts.expiresAt ? `<div class="info-row"><span class="info-label">Expires</span><span class="info-val">${new Date(opts.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></div>` : ""}
            <div class="info-row"><span class="info-label">Network</span><span class="info-val">Arc Testnet · USDC</span></div>
        </div>
        <p style="font-size: 13px; color: #666;">Click below to review and pay in one step — no account needed, just your wallet.</p>
        <a href="${BASE_URL}/pay/req/${opts.requestId}" class="btn">Pay ${opts.amount} USDC →</a>
    `);
    await send(opts.to, `${requesterDisplay} is requesting ${opts.amount} USDC — "${opts.title}"`, html);
}

// ─── Email: Payment request fulfilled (requester) ─────────────────────────────

export async function sendRequestPaidEmail(opts: {
    to: string;
    requesterUsername?: string | null;
    payerAddress: string;
    payerUsername?: string | null;
    title: string;
    amount: string;
    txHash: string;
    requestId: string;
}) {
    const payerDisplay = opts.payerUsername
        ? `@${opts.payerUsername}`
        : `${opts.payerAddress.slice(0, 8)}...${opts.payerAddress.slice(-6)}`;

    const html = base(`
        <span class="tag tag-green">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" style="vertical-align:middle"><path d="M3 8l4 4 6-6" stroke="#00E5A0" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          REQUEST PAID
        </span>
        <h1 style="margin-top: 12px;">Your request was paid</h1>
        <p><strong style="color: #f0f0f0;">${payerDisplay}</strong> paid your request for <strong style="color: #f0f0f0;">${opts.title}</strong>.</p>
        <div class="amount">${opts.amount}<span>USDC</span></div>
        <div style="margin: 20px 0;">
            <div class="info-row"><span class="info-label">Paid by</span><span class="info-val">${payerDisplay}</span></div>
            <div class="info-row"><span class="info-label">Transaction</span><span class="info-val"><a href="https://testnet.arcscan.app/tx/${opts.txHash}" style="color: #00E5A0; text-decoration: none;">${opts.txHash.slice(0, 10)}...</a></span></div>
            <div class="info-row"><span class="info-label">Status</span><span class="info-val" style="color: #00E5A0;">PAID</span></div>
        </div>
        <a href="${BASE_URL}/requests" class="btn">View Requests</a>
    `);
    await send(opts.to, `Your request was paid — ${opts.amount} USDC for "${opts.title}"`, html);
}