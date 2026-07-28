import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const staff = await verifyToken(cookieStore.get("token")?.value || "");
  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const categories = await prisma.category.findMany({
    where: { outletId: staff.outletId },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const staff = await verifyToken(cookieStore.get("token")?.value || "");
  if (!staff || staff.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const maxSort = await prisma.category.findFirst({
    where: { outletId: staff.outletId },
    orderBy: { sortOrder: "desc" },
  });

  const category = await prisma.category.create({
    data: {
      outletId: staff.outletId,
      name: body.name,
      sortOrder: body.sortOrder ?? (maxSort ? maxSort.sortOrder + 1 : 1),
    },
  });

  return NextResponse.json(category, { status: 201 });
}
