import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendTelegramMessage } from "@/lib/telegram";

// POST /api/telegram/webhook — Telegram pushes bot updates here.
// We handle /start <code> to link a wallet to the user's chat.
export async function POST(req: NextRequest) {
    let update: any;
    try { update = await req.json(); } catch {
        return NextResponse.json({ ok: true }); // always 200 so Telegram doesn't retry-storm
    }

    try {
        const msg = update?.message;
        if (!msg?.text) return NextResponse.json({ ok: true });

        const chatId = String(msg.chat?.id ?? "");
        const username = msg.from?.username ? `@${msg.from.username}` : undefined;
        const text: string = msg.text.trim();

        // /start <code>
        if (text.startsWith("/start")) {
            const parts = text.split(/\s+/);
            const code = parts[1];

            if (!code) {
                await sendTelegramMessage(chatId,
                    "👋 Welcome to <b>Conduit</b>!\n\nTo get payment notifications here, open the Conduit app, go to your Profile, and tap <b>Connect Telegram</b>.");
                return NextResponse.json({ ok: true });
            }

            // Find the pending connection holding this code
            const conn = await db.telegramConnection.findUnique({ where: { linkCode: code } });
            if (!conn) {
                await sendTelegramMessage(chatId,
                    "❌ That link expired or is invalid. Generate a new one from your Conduit Profile.");
                return NextResponse.json({ ok: true });
            }

            // Link it: store chatId, mark linked, clear the code
            await db.telegramConnection.update({
                where: { id: conn.id },
                data: { chatId, username, linked: true, linkCode: null },
            });

            await sendTelegramMessage(chatId,
                "✅ <b>Connected!</b>\n\nYou'll now get a message here whenever you receive a payment, an escrow updates, or a split pays out. 🎉");
            return NextResponse.json({ ok: true });
        }

        // Any other message
        await sendTelegramMessage(chatId,
            "I only send payment notifications. Manage your connection from the Conduit app Profile.");
        return NextResponse.json({ ok: true });
    } catch (err: any) {
        console.error("[telegram webhook] error:", err?.message);
        return NextResponse.json({ ok: true });
    }
}