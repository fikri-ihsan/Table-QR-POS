import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function getStaff() {
  const cookieStore = await cookies();
  return verifyToken(cookieStore.get("token")?.value || "");
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaff();
  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  // only allow updating these fields
  const allowedFields: Record<string, unknown> = {};
  if (body.status) allowedFields.status = body.status;
  if (body.capacity) allowedFields.capacity = body.capacity;

  const table = await prisma.table.update({
    where: { id, outletId: staff.outletId },
    data: allowedFields,
  });
  return NextResponse.json(table);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaff();
  if (!staff || staff.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.table.delete({ where: { id, outletId: staff.outletId } });
  return NextResponse.json({ success: true });
}
