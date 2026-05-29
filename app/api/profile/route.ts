import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyMessage } from "viem";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address");
  if (!address) return NextResponse.json({ error: "Address required" }, { status: 400 });

  const profile = await db.userProfile.findUnique({
    where: { address: address.toLowerCase() },
  });

  return NextResponse.json({ profile });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { address, username, displayName, bio, email, signature, message } = body;

  if (!address) return NextResponse.json({ error: "Address required" }, { status: 400 });
  if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 });
  if (!signature || !message) return NextResponse.json({ error: "Signature required" }, { status: 400 });

  // Verify signature
  try {
    const valid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
    if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 401 });
  }

  if (!message.toLowerCase().includes(address.toLowerCase())) {
    return NextResponse.json({ error: "Message must contain your wallet address" }, { status: 400 });
  }

  const clean = username.toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (clean.length < 3) return NextResponse.json({ error: "Username must be at least 3 characters" }, { status: 400 });
  if (clean.length > 20) return NextResponse.json({ error: "Username must be 20 characters or less" }, { status: 400 });

  // Validate email if provided
  const cleanEmail = email?.trim().toLowerCase() || null;
  if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const existing = await db.userProfile.findUnique({ where: { username: clean } });
  if (existing && existing.address !== address.toLowerCase()) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  const profile = await db.userProfile.upsert({
    where: { address: address.toLowerCase() },
    update: {
      username: clean,
      displayName: displayName?.trim() || null,
      bio: bio?.trim() || null,
      avatar: body.avatar || null,
      email: cleanEmail,
    },
    create: {
      address: address.toLowerCase(),
      username: clean,
      displayName: displayName?.trim() || null,
      bio: bio?.trim() || null,
      avatar: body.avatar || null,
      email: cleanEmail,
    },
  });

  return NextResponse.json({ profile });
}