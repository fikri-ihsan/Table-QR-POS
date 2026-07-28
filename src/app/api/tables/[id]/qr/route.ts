import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import QRCode from "qrcode";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const staff = await verifyToken(cookieStore.get("token")?.value || "");
  if (!staff) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const table = await prisma.table.findUnique({ where: { id } });
  if (!table) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const qrData = `${appUrl}/order/${staff.outletId}/${table.number}`;

  // store the QR URL in the table record
  await prisma.table.update({ where: { id }, data: { qrCode: qrData } });

  const qrImage = await QRCode.toDataURL(qrData, { width: 400, margin: 2 });

  return NextResponse.json({ qrUrl: qrData, qrImage });
}
