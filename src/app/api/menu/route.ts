import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outletId") || (await getDefaultOutlet());

  const items = await prisma.menuItem.findMany({
    where: { outletId },
    include: { category: true },
    orderBy: { category: { sortOrder: "asc" } },
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const staff = await verifyToken(cookieStore.get("token")?.value || "");
  if (!staff || staff.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
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
