import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function getStaff() {
  const cookieStore = await cookies();
  return verifyToken(cookieStore.get("token")?.value || "");
}

export async function GET() {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.menuItem.findMany({
    where: { outletId: staff.outletId, stock: { not: null } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(items);
}

export async function PATCH(req: Request) {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (staff.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const item = await prisma.menuItem.update({
    where: { id: body.id },
    data: { stock: body.stock },
  });

  return NextResponse.json(item);
}
