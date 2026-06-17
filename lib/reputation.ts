import { db } from "@/lib/db";

/**
 * Reputation helper — call these from escrow routes when status changes.
 *
 * trustScore formula:
 *   - Starts at 100 (neutral, no history)
 *   - Once a wallet has activity: (completed / (completed + disputed)) * 100
 *   - Refunds don't penalize trust (a fair refund is not the seller's fault)
 */

type RepEvent = "COMPLETED" | "DISPUTED" | "REFUNDED";

function computeTrustScore(completed: number, disputed: number): number {
    const total = completed + disputed;
    if (total === 0) return 100;
    return Math.round((completed / total) * 100);
}

/**
 * Record a reputation event for a wallet address.
 * @param address  the seller's wallet address
 * @param event    COMPLETED | DISPUTED | REFUNDED
 * @param amount   the escrow USDC amount (string), added to totalVolume on COMPLETED
 */
export async function recordReputationEvent(
    address: string,
    event: RepEvent,
    amount: string = "0"
): Promise<void> {
    if (!address) return;
    const addr = address.toLowerCase();

    try {
        const existing = await db.walletReputation.findUnique({ where: { address: addr } });

        let completed = existing?.completedEscrows ?? 0;
        let disputed = existing?.disputedEscrows ?? 0;
        let refunded = existing?.refundedEscrows ?? 0;
        let volume = parseFloat(existing?.totalVolume ?? "0");

        if (event === "COMPLETED") {
            completed += 1;
            volume += parseFloat(amount || "0");
        } else if (event === "DISPUTED") {
            disputed += 1;
        } else if (event === "REFUNDED") {
            refunded += 1;
        }

        const trustScore = computeTrustScore(completed, disputed);

        await db.walletReputation.upsert({
            where: { address: addr },
            update: {
                completedEscrows: completed,
                disputedEscrows: disputed,
                refundedEscrows: refunded,
                totalVolume: volume.toFixed(2),
                trustScore,
            },
            create: {
                address: addr,
                completedEscrows: completed,
                disputedEscrows: disputed,
                refundedEscrows: refunded,
                totalVolume: volume.toFixed(2),
                trustScore,
            },
        });
    } catch (err) {
        // Never let reputation tracking break a payment flow
        console.error("reputation event failed:", err);
    }
}

/** Fetch a wallet's reputation, or a default neutral object if none exists. */
export async function getReputation(address: string) {
    const addr = address.toLowerCase();
    const rep = await db.walletReputation.findUnique({ where: { address: addr } });

    if (!rep) {
        return {
            address: addr,
            completedEscrows: 0,
            disputedEscrows: 0,
            refundedEscrows: 0,
            totalVolume: "0",
            trustScore: 100,
            isNew: true,
        };
    }

    return { ...rep, isNew: false };
}