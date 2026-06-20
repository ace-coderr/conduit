import crypto from "crypto";
import { db } from "@/lib/db";
import { transferFromWallet, getWalletBalance } from "@/lib/circle";

// ─── API key generation & hashing ────────────────────────────────────────────

export function generateAgentApiKey(): { key: string; hash: string; preview: string } {
    const raw = crypto.randomBytes(24).toString("hex");
    const key = `cak_live_${raw}`; // conduit agent key
    const hash = hashApiKey(key);
    const preview = `cak_live_...${raw.slice(-6)}`;
    return { key, hash, preview };
}

export function hashApiKey(key: string): string {
    return crypto.createHash("sha256").update(key).digest("hex");
}

/** Look up an active agent wallet by its API key. Returns null if invalid/inactive. */
export async function authenticateAgent(apiKey: string) {
    if (!apiKey || !apiKey.startsWith("cak_live_")) return null;
    const hash = hashApiKey(apiKey);
    const agent = await db.agentWallet.findUnique({ where: { apiKeyHash: hash } });
    if (!agent || !agent.active) return null;
    return agent;
}

// ─── Spend window helpers ────────────────────────────────────────────────────

/** Returns spentToday, resetting the rolling 24h window if expired. */
async function getSpentToday(agentId: string): Promise<{ spent: number; agent: any }> {
    const agent = await db.agentWallet.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error("Agent not found");

    const now = Date.now();
    const windowAge = now - new Date(agent.spendResetAt).getTime();
    if (windowAge >= 24 * 60 * 60 * 1000) {
        // Window expired — reset
        const reset = await db.agentWallet.update({
            where: { id: agentId },
            data: { spentToday: "0", spendResetAt: new Date() },
        });
        return { spent: 0, agent: reset };
    }
    return { spent: parseFloat(agent.spentToday), agent };
}

// ─── Core spend with guardrails ──────────────────────────────────────────────

export interface SpendResult {
    success: boolean;
    txHash?: string;
    error?: string;
    blocked?: boolean;
}

/**
 * Execute a spend from an agent wallet, enforcing daily limit + allowed recipients.
 * Logs every attempt (including blocked ones).
 */
export async function agentSpend(
    agentId: string,
    recipient: string,
    amount: string
): Promise<SpendResult> {
    const recip = recipient.toLowerCase();
    const amt = parseFloat(amount);

    const { spent, agent } = await getSpentToday(agentId);

    if (!agent.active) {
        await logTx(agentId, recip, amount, "BLOCKED", "Agent wallet is disabled");
        return { success: false, blocked: true, error: "Agent wallet is disabled." };
    }
    if (!agent.circleWalletId) {
        return { success: false, error: "Agent wallet not provisioned." };
    }
    if (isNaN(amt) || amt <= 0) {
        return { success: false, error: "Invalid amount." };
    }

    // Allowed-recipients check (empty list = any allowed)
    const allowed: string[] = agent.allowedRecipients ?? [];
    if (allowed.length > 0 && !allowed.includes(recip)) {
        await logTx(agentId, recip, amount, "BLOCKED", "Recipient not in allowlist");
        return { success: false, blocked: true, error: "Recipient not in allowlist." };
    }

    // Daily limit check ("0" = unlimited)
    const limit = parseFloat(agent.dailyLimit);
    if (limit > 0 && spent + amt > limit) {
        await logTx(agentId, recip, amount, "BLOCKED", `Daily limit exceeded (${spent}/${limit} USDC)`);
        return { success: false, blocked: true, error: `Daily limit exceeded. ${spent}/${limit} USDC used.` };
    }

    // Execute via Circle (gasless)
    const result = await transferFromWallet(agent.circleWalletId, recip, amount);

    if (result.success && result.txHash) {
        await db.agentWallet.update({
            where: { id: agentId },
            data: {
                spentToday: (spent + amt).toString(),
                totalSpent: (parseFloat(agent.totalSpent) + amt).toString(),
                txCount: { increment: 1 },
                lastUsedAt: new Date(),
            },
        });
        await logTx(agentId, recip, amount, "SENT", null, result.txHash);
        return { success: true, txHash: result.txHash };
    }

    await logTx(agentId, recip, amount, "FAILED", result.error ?? "Transfer failed");
    return { success: false, error: result.error ?? "Transfer failed." };
}

async function logTx(
    agentWalletId: string,
    recipient: string,
    amount: string,
    status: string,
    reason?: string | null,
    txHash?: string
) {
    await db.agentTransaction.create({
        data: { agentWalletId, recipient, amount, status, reason: reason ?? null, txHash: txHash ?? null },
    });
}

export { getWalletBalance };