import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ALL_WEBHOOK_EVENTS, testWebhook } from "@/lib/webhooks";

interface Ctx { params: { webhookId: string } }

// PATCH /api/webhooks/[webhookId] — update events/url/active, or test
export async function PATCH(req: NextRequest, { params }: Ctx) {
    let body: any;
    try { body = await req.json(); } catch {
        return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    const { action, callerAddress, url, events, active } = body;
    const webhook = await db.webhook.findUnique({ where: { id: params.webhookId } });
    if (!webhook) return NextResponse.json({ error: "Not found." }, { status: 404 });

    // Owner check
    if (!callerAddress || callerAddress.toLowerCase() !== webhook.ownerAddress)
        return NextResponse.json({ error: "Not authorized." }, { status: 403 });

    // TEST: send a ping
    if (action === "test") {
        const result = await testWebhook(webhook.id);
        return NextResponse.json(result);
    }

    // UPDATE
    const data: any = {};
    if (typeof active === "boolean") {
        data.active = active;
        if (active) data.failureCount = 0; // re-enabling resets failures
    }
    if (url !== undefined) {
        try {
            const u = new URL(url);
            if (u.protocol !== "https:") return NextResponse.json({ error: "URL must use HTTPS." }, { status: 400 });
            data.url = u.toString();
        } catch { return NextResponse.json({ error: "Invalid URL." }, { status: 400 }); }
    }
    if (events !== undefined) {
        if (!Array.isArray(events) || events.length === 0)
            return NextResponse.json({ error: "Select at least one event." }, { status: 400 });
        const invalid = events.filter((e: string) => !(ALL_WEBHOOK_EVENTS as string[]).includes(e));
        if (invalid.length > 0) return NextResponse.json({ error: `Unknown events: ${invalid.join(", ")}` }, { status: 400 });
        data.events = events;
    }

    const updated = await db.webhook.update({ where: { id: webhook.id }, data });
    return NextResponse.json({ webhook: updated });
}

// DELETE /api/webhooks/[webhookId]
export async function DELETE(req: NextRequest, { params }: Ctx) {
    const callerAddress = req.nextUrl.searchParams.get("address")?.toLowerCase();
    const webhook = await db.webhook.findUnique({ where: { id: params.webhookId } });
    if (!webhook) return NextResponse.json({ error: "Not found." }, { status: 404 });

    if (!callerAddress || callerAddress !== webhook.ownerAddress)
        return NextResponse.json({ error: "Not authorized." }, { status: 403 });

    await db.webhook.delete({ where: { id: webhook.id } });
    return NextResponse.json({ success: true });
}