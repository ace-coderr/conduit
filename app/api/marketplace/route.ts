import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyAdminQuery } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "APPROVED";
  const category = searchParams.get("category");

  // Check admin via secret or wallet
  const { ok: isAdmin } = verifyAdminQuery(req);

  const where: any = {};
  if (!isAdmin) where.status = "APPROVED";
  else if (status !== "all") where.status = status;
  if (category && category !== "all") where.category = category;

  const listings = await db.marketplaceListing.findMany({
    where,
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ listings });
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { name, description, price, endpoint, category, creatorAddress, creatorUsername, docsUrl } = body;

  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!description?.trim()) return NextResponse.json({ error: "Description is required" }, { status: 400 });
  if (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) return NextResponse.json({ error: "Valid price required" }, { status: 400 });
  if (!endpoint?.trim()) return NextResponse.json({ error: "Endpoint URL is required" }, { status: 400 });
  if (!category?.trim()) return NextResponse.json({ error: "Category is required" }, { status: 400 });
  if (!creatorAddress?.trim()) return NextResponse.json({ error: "Creator address is required" }, { status: 400 });

  try { new URL(endpoint); } catch {
    return NextResponse.json({ error: "Invalid endpoint URL" }, { status: 400 });
  }

  const profile = await db.userProfile.findUnique({
    where: { address: creatorAddress.toLowerCase() },
  });

  const listing = await db.marketplaceListing.create({
    data: {
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price).toString(),
      endpoint: endpoint.trim(),
      category: category.trim(),
      creatorAddress: creatorAddress.toLowerCase(),
      creatorUsername: profile?.username ?? creatorUsername?.trim() ?? null,
      docsUrl: docsUrl?.trim() || null,
      status: "PENDING",
    },
  });

  return NextResponse.json({ listing }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { ok, error } = verifyAdminQuery(req);
  if (!ok) return NextResponse.json({ error }, { status: 401 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { id, status, featured } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const listing = await db.marketplaceListing.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(featured !== undefined && { featured }),
    },
  });

  return NextResponse.json({ listing });
}

export async function DELETE(req: NextRequest) {
  const { ok, error } = verifyAdminQuery(req);
  if (!ok) return NextResponse.json({ error }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await db.marketplaceListing.delete({ where: { id } });
  return NextResponse.json({ success: true });
}