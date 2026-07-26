import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const staff = await verifyToken(cookieStore.get("token")?.value || "");
  if (!staff || staff.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const item = await prisma.menuItem.update({
    where: { id },
    data: {
      categoryId: body.categoryId,
      name: body.name,
      description: body.description,
      price: body.price,
      image: body.image,
      available: body.available,
      stock: body.stock,
      lowStockAt: body.lowStockAt,
    },
  });

  return NextResponse.json(item);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const staff = await verifyToken(cookieStore.get("token")?.value || "");
  if (!staff || staff.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.menuItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
