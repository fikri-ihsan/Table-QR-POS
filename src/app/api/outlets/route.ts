import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const staff = await verifyToken(cookieStore.get("token")?.value || "");
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const outlets = await prisma.outlet.findMany({
    where: { id: staff.outletId },
  });
  return NextResponse.json(outlets);
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const staff = await verifyToken(cookieStore.get("token")?.value || "");
  if (!staff || staff.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const outlet = await prisma.outlet.create({
    data: { name: body.name, address: body.address || null, phone: body.phone || null },
  });

  return NextResponse.json(outlet, { status: 201 });
}
