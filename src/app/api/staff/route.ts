import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const staff = await verifyToken(cookieStore.get("token")?.value || "");
  if (!staff || staff.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const staffList = await prisma.staff.findMany({
    where: { outletId: staff.outletId },
    select: { id: true, name: true, role: true, active: true, createdAt: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(staffList);
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const staff = await verifyToken(cookieStore.get("token")?.value || "");
  if (!staff || staff.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const newStaff = await prisma.staff.create({
    data: {
      outletId: staff.outletId,
      name: body.name,
      pin: body.pin,
      role: body.role || "cashier",
    },
  });

  return NextResponse.json({ id: newStaff.id, name: newStaff.name, role: newStaff.role }, { status: 201 });
}

export async function PATCH(req: Request) {
  const cookieStore = await cookies();
  const current = await verifyToken(cookieStore.get("token")?.value || "");
  if (!current || current.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const staff = await prisma.staff.update({
    where: { id: body.id },
    data: { pin: body.pin, role: body.role, active: body.active },
  });

  return NextResponse.json({ id: staff.id, name: staff.name, role: staff.role, active: staff.active });
}
