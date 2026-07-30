import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { orderEvents } from "@/lib/sse";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

async function getStaff() {
  const cookieStore = await cookies();
  return verifyToken(cookieStore.get("token")?.value || "");
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaff();
  if (!staff || !["admin", "cashier", "kitchen"].includes(staff.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const updateData: Record<string, unknown> = { status: body.status };
  if (body.paymentStatus) updateData.paymentStatus = body.paymentStatus;
  if (body.paymentMethod) updateData.paymentMethod = body.paymentMethod;

  const order = await prisma.order.update({
    where: { id },
    data: updateData,
    include: { items: { include: { menuItem: true } }, table: true },
  });

  if (body.status === "cancelled") {
    const orderItems = await prisma.orderItem.findMany({ where: { orderId: id }, include: { menuItem: true } });
    for (const item of orderItems) {
      if (item.menuItem.stock !== null) {
        await prisma.menuItem.update({
          where: { id: item.menuItemId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }
  }

  if (body.status === "delivered" && order.tableId) {
    const hasOtherActiveOrders = await prisma.order.findFirst({
      where: {
        tableId: order.tableId,
        id: { not: id },
        status: { in: ["received", "preparing", "ready"] },
      },
    });
    if (!hasOtherActiveOrders) {
      await prisma.table.update({ where: { id: order.tableId as string }, data: { status: "available" } });
    }
  }

  orderEvents.emit("order:updated", order);
  return NextResponse.json(order);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { menuItem: true } }, table: true, outlet: { select: { name: true, address: true } }, staff: { select: { name: true } } },
  });
  return NextResponse.json(order);
}
