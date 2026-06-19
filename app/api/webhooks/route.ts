import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isValidAddress } from "@/lib/utils";
import { generateWebhookSecret, ALL_WEBHOOK_EVENTS } from "@/lib/webhooks";

// GET /api/webhooks?address= — list a wallet's webhooks (with recent deliveries)
export async function GET(req: NextRequest) {
    const address = req.nextUrl.searchParams.get("address")?.toLowerCase();
    if (!address) return NextResponse.json({ error: "Address required." }, { status: 400 });

    const webhooks = await db.webhook.findMany({
        where: { ownerAddress: address },
        orderBy: { createdAt: "desc" },
        include: {
            deliveries: { orderBy: { createdAt: "desc" }, take: 10 },
        },
    });

    return NextResponse.json({ webhooks, availableEvents: ALL_WEBHOOK_EVENTS });
}

// POST /api/webhooks — create a webhook
export async function POST(req: NextRequest) {
    let body: any;
    try { body = await req.json(); } catch {
        return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    const { ownerAddress, url, events } = body;

    if (!ownerAddress || !isValidAddress(ownerAddress))
        return NextResponse.json({ error: "Valid owner address required." }, { status: 400 });

    // Validate URL
    let parsedUrl: URL;
    try { parsedUrl = new URL(url); } catch {
        return NextResponse.json({ error: "Enter a valid URL." }, { status: 400 });
    }
    if (parsedUrl.protocol !== "https:")
        return NextResponse.json({ error: "Webhook URL must use HTTPS." }, { status: 400 });

    // Validate events
    if (!Array.isArray(events) || events.length === 0)
        return NextResponse.json({ error: "Select at least one event." }, { status: 400 });
    const invalid = events.filter((e: string) => !(ALL_WEBHOOK_EVENTS as string[]).includes(e));
    if (invalid.length > 0)
        return NextResponse.json({ error: `Unknown events: ${invalid.join(", ")}` }, { status: 400 });

    // Limit: 10 webhooks per wallet
    const count = await db.webhook.count({ where: { ownerAddress: ownerAddress.toLowerCase() } });
    if (count >= 10)
        return NextResponse.json({ error: "Maximum 10 webhooks per wallet." }, { status: 429 });

    const webhook = await db.webhook.create({
        data: {
            ownerAddress: ownerAddress.toLowerCase(),
            url: parsedUrl.toString(),
            secret: generateWebhookSecret(),
            events,
            active: true,
        },
    });

    return NextResponse.json({ webhook }, { status: 201 });
}