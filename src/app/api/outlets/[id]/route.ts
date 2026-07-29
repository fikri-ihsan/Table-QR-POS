import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const staff = await verifyToken(cookieStore.get("token")?.value || "");
  if (!staff || staff.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.address !== undefined) data.address = body.address;
  if (body.taxEnabled !== undefined) data.taxEnabled = body.taxEnabled;
  if (body.taxRate !== undefined) data.taxRate = body.taxRate;
  if (body.taxLabel !== undefined) data.taxLabel = body.taxLabel;
  if (body.serviceEnabled !== undefined) data.serviceEnabled = body.serviceEnabled;
  if (body.serviceRate !== undefined) data.serviceRate = body.serviceRate;
  if (body.serviceLabel !== undefined) data.serviceLabel = body.serviceLabel;

  const outlet = await prisma.outlet.update({ where: { id }, data });
  return NextResponse.json(outlet);
}
