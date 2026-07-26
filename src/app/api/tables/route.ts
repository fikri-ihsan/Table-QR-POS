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

  const tables = await prisma.table.findMany({
    where: { outletId: staff.outletId },
    orderBy: { number: "asc" },
  });
  return NextResponse.json(tables);
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const staff = await verifyToken(cookieStore.get("token")?.value || "");
  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const table = await prisma.table.create({
    data: {
      outletId: staff.outletId,
      number: body.number,
      capacity: body.capacity ?? 4,
    },
  });

  return NextResponse.json(table, { status: 201 });
}
