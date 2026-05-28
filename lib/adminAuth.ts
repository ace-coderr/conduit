import { NextRequest } from "next/server";

const ADMIN_SECRET = process.env.ADMIN_SECRET;
const ADMIN_WALLET = "0x8557fabdc62f59a1ba7d6a74aaf0942cdcb68f69";

/**
 * Verify admin access via ADMIN_SECRET header.
 * Usage: const { ok, error } = verifyAdmin(req);
 */
export function verifyAdmin(req: NextRequest): { ok: boolean; error?: string } {
    if (!ADMIN_SECRET) {
        return { ok: false, error: "Server misconfigured — ADMIN_SECRET not set" };
    }

    // Primary: secret header
    const secret = req.headers.get("x-admin-secret");
    if (secret && secret === ADMIN_SECRET) {
        return { ok: true };
    }

    // Fallback: wallet header (for backwards compat with admin dashboard)
    const wallet = req.headers.get("x-wallet-address")?.toLowerCase();
    if (wallet && wallet === ADMIN_WALLET) {
        return { ok: true };
    }

    return { ok: false, error: "Unauthorized" };
}

/**
 * Verify admin from query param wallet (legacy — phase out after mainnet).
 * Only used where we can't easily add headers (e.g. auto-release fetch calls).
 */
export function verifyAdminQuery(req: NextRequest): { ok: boolean; error?: string } {
    if (!ADMIN_SECRET) {
        return { ok: false, error: "Server misconfigured" };
    }

    const { searchParams } = new URL(req.url);

    // Prefer secret
    const secret = searchParams.get("secret");
    if (secret && secret === ADMIN_SECRET) {
        return { ok: true };
    }

    // Fallback wallet param (legacy)
    const wallet = searchParams.get("wallet")?.toLowerCase();
    if (wallet && wallet === ADMIN_WALLET) {
        return { ok: true };
    }

    return { ok: false, error: "Unauthorized" };
}

export { ADMIN_WALLET };