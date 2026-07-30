import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function getStaff() {
  const cookieStore = await cookies();
  return verifyToken(cookieStore.get("token")?.value || "");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outletId") || (await getDefaultOutlet());

  // ponytail: open for customers, but staff pages will provide outletId anyway
  // if you want strict auth for staff, add a ?staff=true param or similar
  // keeping it open since customer order page needs it
  
  const items = await prisma.menuItem.findMany({
    where: { outletId },
    include: { category: true },
    orderBy: { category: { sortOrder: "asc" } },
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const staff = await getStaff();
  if (!staff || staff.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.name || !body.categoryId || body.price < 1) {
    return NextResponse.json({ error: "Nama, kategori, dan harga harus diisi" }, { status: 400 });
  }
  const item = await prisma.menuItem.create({
    data: {
      outletId: staff.outletId,
      categoryId: body.categoryId,
      name: body.name,
      description: body.description || null,
      price: body.price,
      image: body.image || null,
      available: body.available ?? true,
      stock: body.stock ?? null,
      lowStockAt: body.lowStockAt ?? null,
    },
  });

  return NextResponse.json(item, { status: 201 });
}

async function getDefaultOutlet() {
  const outlet = await prisma.outlet.findFirst();
  return outlet?.id || "";
}
