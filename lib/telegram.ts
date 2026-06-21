import { db } from "@/lib/db";

const TG_API = "https://api.telegram.org";

function token(): string | null {
    return process.env.TELEGRAM_BOT_TOKEN ?? null;
}

/** Low-level send to a specific chat id. */
export async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
    const t = token();
    if (!t) { console.error("[telegram] TELEGRAM_BOT_TOKEN not set"); return false; }
    try {
        const res = await fetch(`${TG_API}/bot${t}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: "HTML",
                disable_web_page_preview: true,
            }),
        });
        if (!res.ok) {
            const body = await res.text();
            console.error("[telegram] send failed:", res.status, body);
            return false;
        }
        return true;
    } catch (err: any) {
        console.error("[telegram] send error:", err?.message);
        return false;
    }
}

/** Map an event to a formatted message. Returns null if we don't notify for it. */
function formatEvent(event: string, data: Record<string, any>): string | null {
    const amt = data.amount ? `<b>${data.amount} USDC</b>` : "";
    const title = data.title ? ` — ${escapeHtml(data.title)}` : "";
    const tx = data.txHash ? `\n<a href="https://testnet.arcscan.app/tx/${data.txHash}">View transaction ↗</a>` : "";

    switch (event) {
        case "payment.completed":
            return `💰 <b>Payment received</b>${title}\nYou were paid ${amt}.${tx}`;
        case "escrow.funded":
            return `🔒 <b>Escrow funded</b>${title}\nA buyer locked ${amt} in escrow.${tx}`;
        case "escrow.released":
            return `✅ <b>Escrow released</b>${title}\n${amt} has been released to you.${tx}`;
        case "escrow.disputed":
            return `⚠️ <b>Escrow disputed</b>${title}\nA buyer opened a dispute on a ${amt} escrow.`;
        case "escrow.refunded":
            return `↩️ <b>Escrow refunded</b>${title}\nA ${amt} escrow was refunded to the buyer.${tx}`;
        case "split.funded":
            return `🔀 <b>Split funded</b>${title}\nA ${amt} split was funded.${tx}`;
        case "split.distributed":
            return `🎉 <b>Split distributed</b>${title}\n${amt} was split and paid out to all recipients.${tx}`;
        default:
            return null;
    }
}

function escapeHtml(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Notify a wallet owner on Telegram about an event, if they've linked their account.
 * Fire-and-forget safe — never throws into the caller.
 */
export async function notifyTelegram(ownerAddress: string, event: string, data: Record<string, any>): Promise<void> {
    try {
        const conn = await db.telegramConnection.findUnique({ where: { ownerAddress: ownerAddress.toLowerCase() } });
        if (!conn || !conn.linked) return;

        const message = formatEvent(event, data);
        if (!message) return;

        await sendTelegramMessage(conn.chatId, message);
    } catch (err: any) {
        console.error("[notifyTelegram] error:", err?.message);
    }
}