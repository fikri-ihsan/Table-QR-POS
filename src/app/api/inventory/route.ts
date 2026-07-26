import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const staff = await verifyToken(cookieStore.get("token")?.value || "");
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.menuItem.findMany({
    where: { outletId: staff.outletId, stock: { not: null } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(items);
}

export async function PATCH(req: Request) {
  const cookieStore = await cookies();
  const staff = await verifyToken(cookieStore.get("token")?.value || "");
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const item = await prisma.menuItem.update({
    where: { id: body.id },
    data: { stock: body.stock },
  });

  return NextResponse.json(item);
}
