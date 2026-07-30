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
  const staff = await getStaff();
  if (!staff || staff.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.number) {
    return NextResponse.json({ error: "Nomor meja harus diisi" }, { status: 400 });
  }
  const table = await prisma.table.create({
    data: {
      outletId: staff.outletId,
      number: body.number,
      capacity: body.capacity ?? 4,
    },
  });

  return NextResponse.json(table, { status: 201 });
}
