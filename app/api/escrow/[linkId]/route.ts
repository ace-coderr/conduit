import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { arcPublicClient } from "@/lib/arcClient";
import { parseEther } from "viem";
import { sendEscrowPaidEmail, sendDisputeRaisedEmail } from "@/lib/email";
import { recordReputationEvent } from "@/lib/reputation";
import { transferFromWallet } from "@/lib/circle";
import { fireWebhook } from "@/lib/webhooks";
import { notifyTelegram } from "@/lib/telegram";

const ADMIN_WALLET = "0x8557fabdc62f59a1ba7d6a74aaf0942cdcb68f69";
interface RouteParams { params: { linkId: string } }

async function checkDisputeDeadline(escrow: any, reqUrl: string) {
  if (escrow.status !== "DISPUTED") return;
  if (!escrow.disputeDeadline) return;
  if (new Date(escrow.disputeDeadline) > new Date()) return;

  const now = new Date();
  if (!escrow.sellerRespondedAt) {
    await db.escrowLink.update({ where: { id: escrow.id }, data: { status: "CANCELLED" } });
    await db.escrowMessage.create({ data: { escrowId: escrow.id, sender: "SYSTEM", message: "Seller did not respond within 48 hours. Funds have been automatically refunded to the buyer." } });
    fetch(new URL(`/api/escrow/refund`, reqUrl).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-wallet-address": ADMIN_WALLET },
      body: JSON.stringify({ escrowId: escrow.id }),
    }).catch(console.error);
  } else if (!escrow.buyerLastMessageAt) {
    await db.escrowLink.update({ where: { id: escrow.id }, data: { status: "CONFIRMED", confirmedAt: now } });
    await db.escrowMessage.create({ data: { escrowId: escrow.id, sender: "SYSTEM", message: "Buyer did not respond within 48 hours. Funds have been automatically released to the seller." } });
    // Release directly and reliably (not fire-and-forget)
    await releaseEscrowFunds(escrow.id);
  }
}

/**
 * Releases escrow funds to the seller, sets status to RELEASED, records reputation.
 * Returns { success, txHash?, error? }. Idempotent — skips if already released.
 */
async function releaseEscrowFunds(escrowId: string): Promise<{ success: boolean; txHash?: string; error?: string }> {
  const escrow = await db.escrowLink.findUnique({ where: { id: escrowId } });
  if (!escrow) return { success: false, error: "Escrow not found" };
  if (escrow.releaseTxHash) return { success: true, txHash: escrow.releaseTxHash };
  if (!escrow.circleWalletId) return { success: false, error: "No Circle wallet" };

  const result = await transferFromWallet(escrow.circleWalletId, escrow.sellerAddress, escrow.amount);
  if (result.success && result.txHash) {
    await db.escrowLink.update({
      where: { id: escrowId },
      data: { status: "RELEASED", releaseTxHash: result.txHash },
    });
    await recordReputationEvent(escrow.sellerAddress, "COMPLETED", escrow.amount);
    fireWebhook(escrow.sellerAddress, "escrow.released", {
      id: escrow.id, title: escrow.title, amount: escrow.amount,
      txHash: result.txHash, sellerAddress: escrow.sellerAddress, buyerAddress: escrow.buyerAddress ?? null,
    }).catch(() => { });
    notifyTelegram(escrow.sellerAddress, "escrow.released", { title: escrow.title, amount: escrow.amount, txHash: result.txHash }).catch(() => { });
    return { success: true, txHash: result.txHash };
  }
  return { success: false, error: result.error ?? "Transfer failed" };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const escrow = await db.escrowLink.findUnique({
    where: { id: params.linkId },
    select: {
      id: true, title: true, description: true, amount: true,
      sellerAddress: true, sellerContact: true, buyerAddress: true, stealthAddress: true,
      status: true, txHash: true, paidAt: true,
      deliveryDays: true, deliveryDeadline: true, releaseDeadline: true,
      confirmedAt: true, disputedAt: true, disputeReason: true,
      disputeDeadline: true, sellerRespondedAt: true, buyerLastMessageAt: true,
      createdAt: true,
    },
  });
  if (!escrow) return NextResponse.json({ error: "Escrow not found." }, { status: 404 });
  await checkDisputeDeadline(escrow, req.url);
  return NextResponse.json({ escrow });
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { action, txHash, paidBy, disputeReason } = body;
  const escrow = await db.escrowLink.findUnique({ where: { id: params.linkId } });
  if (!escrow) return NextResponse.json({ error: "Escrow not found." }, { status: 404 });

  // ── PAY ──────────────────────────────────────────────────────
  if (action === "pay") {
    if (escrow.status !== "ACTIVE") return NextResponse.json({ error: "Escrow is not active." }, { status: 409 });
    if (!txHash) return NextResponse.json({ error: "Transaction hash is required." }, { status: 400 });

    try {
      const tx = await arcPublicClient.getTransaction({ hash: txHash as `0x${string}` });
      if (tx && tx.blockNumber) {
        if (tx.to?.toLowerCase() !== escrow.stealthAddress.toLowerCase()) {
          return NextResponse.json({ error: "Transaction sent to wrong address." }, { status: 400 });
        }
        if (tx.value < parseEther(escrow.amount)) {
          return NextResponse.json({ error: `Insufficient payment. Required ${escrow.amount} USDC.` }, { status: 400 });
        }
      }
    } catch (err: any) { console.warn("[escrow pay] verification skipped:", err.message); }

    const paidAt = new Date();
    const days = escrow.deliveryDays ?? 7;
    const deliveryDeadline = new Date(paidAt.getTime() + days * 24 * 60 * 60 * 1000);
    const releaseDeadline = new Date(deliveryDeadline.getTime() + 7 * 24 * 60 * 60 * 1000);

    await db.escrowLink.update({
      where: { id: params.linkId },
      data: { status: "HOLDING", txHash, buyerAddress: paidBy ? paidBy.toLowerCase() : null, paidAt, deliveryDeadline, releaseDeadline },
    });

    fireWebhook(escrow.sellerAddress, "escrow.funded", {
      id: escrow.id, title: escrow.title, amount: escrow.amount,
      txHash, sellerAddress: escrow.sellerAddress, buyerAddress: paidBy ?? null,
    }).catch(() => { });
    notifyTelegram(escrow.sellerAddress, "escrow.funded", { title: escrow.title, amount: escrow.amount, txHash }).catch(() => { });

    // Email seller
    try {
      const profile = await db.userProfile.findUnique({
        where: { address: escrow.sellerAddress.toLowerCase() },
        select: { email: true },
      });
      if (profile?.email) {
        sendEscrowPaidEmail({
          to: profile.email,
          title: escrow.title,
          amount: escrow.amount,
          buyerAddress: paidBy ?? undefined,
          deliveryDays: days,
          escrowId: params.linkId,
        }).catch(() => { });
      }
    } catch { }

    return NextResponse.json({ success: true, status: "HOLDING", deliveryDeadline, releaseDeadline });
  }

  // ── CONFIRM ───────────────────────────────────────────────────
  if (action === "confirm") {
    if (escrow.status !== "HOLDING") return NextResponse.json({ error: "Escrow is not in HOLDING status." }, { status: 409 });

    // Mark confirmed, then release synchronously so we KNOW if it worked.
    await db.escrowLink.update({ where: { id: params.linkId }, data: { status: "CONFIRMED", confirmedAt: new Date() } });

    const release = await releaseEscrowFunds(params.linkId);

    if (!release.success) {
      // Release failed — report it so the UI can show an error and allow retry.
      // Status stays CONFIRMED; the retry-release endpoint or a re-confirm can recover it.
      return NextResponse.json(
        { success: false, status: "CONFIRMED", error: release.error ?? "Release failed. Please retry.", releasePending: true },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, status: "RELEASED", releaseTxHash: release.txHash });
  }

  // ── DISPUTE ───────────────────────────────────────────────────
  if (action === "dispute") {
    if (escrow.status !== "HOLDING") return NextResponse.json({ error: "Escrow is not in HOLDING status." }, { status: 409 });
    const now = new Date();
    const disputeDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    await db.escrowLink.update({
      where: { id: params.linkId },
      data: { status: "DISPUTED", disputedAt: now, disputeDeadline, disputeReason: disputeReason?.trim() || "No reason provided" },
    });
    fireWebhook(escrow.sellerAddress, "escrow.disputed", {
      id: escrow.id, title: escrow.title, amount: escrow.amount,
      reason: disputeReason?.trim() || "No reason provided",
      sellerAddress: escrow.sellerAddress, buyerAddress: escrow.buyerAddress ?? null,
    }).catch(() => { });
    notifyTelegram(escrow.sellerAddress, "escrow.disputed", { title: escrow.title, amount: escrow.amount }).catch(() => { });
    await db.escrowMessage.create({
      data: { escrowId: params.linkId, sender: "SYSTEM", message: `Dispute opened by buyer. Reason: "${disputeReason?.trim() || "No reason provided"}". Both parties have 48 hours to submit their side. If the seller does not respond, funds will be automatically refunded to the buyer.` },
    });

    // Record reputation: a dispute counts against the seller's trust score
    await recordReputationEvent(escrow.sellerAddress, "DISPUTED", escrow.amount);

    // Email seller about dispute
    try {
      const profile = await db.userProfile.findUnique({
        where: { address: escrow.sellerAddress.toLowerCase() },
        select: { email: true },
      });
      if (profile?.email) {
        sendDisputeRaisedEmail({
          to: profile.email,
          title: escrow.title,
          amount: escrow.amount,
          disputeReason: disputeReason?.trim(),
          escrowId: params.linkId,
          buyerAddress: escrow.buyerAddress ?? undefined,
        }).catch(() => { });
      }
    } catch { }

    return NextResponse.json({ success: true, status: "DISPUTED", disputeDeadline });
  }

  return NextResponse.json({ error: "Invalid action." }, { status: 400 });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const escrow = await db.escrowLink.findUnique({ where: { id: params.linkId } });
  if (!escrow) return NextResponse.json({ error: "Escrow not found." }, { status: 404 });
  if (escrow.status !== "ACTIVE") return NextResponse.json({ error: "Can only cancel active escrows." }, { status: 409 });
  await db.escrowLink.update({ where: { id: params.linkId }, data: { status: "CANCELLED" } });
  return NextResponse.json({ success: true });
}