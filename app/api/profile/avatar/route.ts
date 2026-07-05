import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { db } from "@/lib/db";
import { supabaseAdmin, AVATAR_BUCKET } from "@/lib/supabaseAdmin";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const RATE_LIMIT_WINDOW_MS = 30 * 1000; // 1 upload per 30s per address

type ImageType = "image/png" | "image/jpeg" | "image/webp";

// Sniff actual file bytes rather than trusting the client-supplied MIME type.
function detectImageType(buffer: Buffer): ImageType | null {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const address = formData.get("address");
  const signature = formData.get("signature");
  const message = formData.get("message");
  const file = formData.get("file");

  if (typeof address !== "string" || !address) return NextResponse.json({ error: "Address required" }, { status: 400 });
  if (typeof signature !== "string" || typeof message !== "string" || !signature || !message)
    return NextResponse.json({ error: "Signature required" }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "File required" }, { status: 400 });

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

  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Image must be 2MB or smaller" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = detectImageType(buffer);
  if (!contentType) return NextResponse.json({ error: "Only PNG, JPEG, or WEBP images are allowed" }, { status: 400 });

  const path = address.toLowerCase();

  // Rate limit: use the storage object's own updated_at as a serverless-safe throttle,
  // since uploads overwrite the same path rather than creating a countable row.
  const { data: existing } = await supabaseAdmin.storage.from(AVATAR_BUCKET).list("", { search: path });
  const current = existing?.find(f => f.name === path);
  if (current?.updated_at && Date.now() - new Date(current.updated_at).getTime() < RATE_LIMIT_WINDOW_MS) {
    return NextResponse.json({ error: "Please wait a moment before uploading again" }, { status: 429 });
  }

  const { error: uploadError } = await supabaseAdmin.storage.from(AVATAR_BUCKET).upload(path, buffer, {
    contentType,
    upsert: true,
  });
  if (uploadError) { console.error("[avatar upload]", uploadError.message); return NextResponse.json({ error: "Upload failed" }, { status: 500 }); }

  const { data: publicUrlData } = supabaseAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const url = `${publicUrlData.publicUrl}?v=${Date.now()}`;

  try {
    await db.userProfile.update({ where: { address: address.toLowerCase() }, data: { avatar: url } });
  } catch {
    // No profile row yet (new user hasn't saved a username) — the URL still gets
    // persisted once they complete their first profile save, since that flow
    // already sends `avatar` along in its body.
  }

  return NextResponse.json({ url });
}
