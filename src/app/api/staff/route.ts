import { prisma } from "@/lib/db";
import { verifyToken, hashPassword } from "@/lib/auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function getStaff() {
  const cookieStore = await cookies();
  return verifyToken(cookieStore.get("token")?.value || "");
}

export async function GET() {
  const staff = await getStaff();
  if (!staff || staff.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const staffList = await prisma.staff.findMany({
    where: { outletId: staff.outletId },
    select: { id: true, name: true, role: true, active: true, createdAt: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(staffList);
}

export async function POST(req: Request) {
  const staff = await getStaff();
  if (!staff || staff.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.name || !body.pin) {
    return NextResponse.json({ error: "Nama dan PIN harus diisi" }, { status: 400 });
  }
  const hashed = await hashPassword(body.pin);

  const newStaff = await prisma.staff.create({
    data: {
      outletId: staff.outletId,
      name: body.name,
      pin: hashed,
      role: body.role || "cashier",
    },
  });

  return NextResponse.json({ id: newStaff.id, name: newStaff.name, role: newStaff.role }, { status: 201 });
}

export async function PATCH(req: Request) {
  const current = await getStaff();
  if (!current || current.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name) data.name = body.name;
  if (body.pin) data.pin = await hashPassword(body.pin);
  if (body.role) data.role = body.role;
  if (body.active !== undefined) data.active = body.active;

  const updated = await prisma.staff.update({
    where: { id: body.id },
    data,
  });

  return NextResponse.json({ id: updated.id, name: updated.name, role: updated.role, active: updated.active });
}

export async function DELETE(req: Request) {
  const current = await getStaff();
  if (!current || current.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  if (id === current.id) return NextResponse.json({ error: "Tidak bisa hapus diri sendiri" }, { status: 400 });

  await prisma.staff.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
