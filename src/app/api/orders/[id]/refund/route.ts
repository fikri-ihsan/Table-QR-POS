import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { orderEvents } from "@/lib/sse";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await verifyToken((await cookies()).get("token")?.value || "");
  if (!staff || staff.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { menuItem: true } } },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.paymentStatus !== "paid") {
    return NextResponse.json({ error: "Hanya order Lunas yang bisa di-refund" }, { status: 400 });
  }

  const refunded = await prisma.$transaction(async (tx) => {
    const itemsToRefund = body.items as { id: string; qty: number }[] | undefined;

    if (itemsToRefund && itemsToRefund.length > 0) {
      for (const ri of itemsToRefund) {
        const oi = order.items.find((i) => i.id === ri.id);
        if (!oi) continue;
        if (oi.menuItem.stock !== null) {
          await tx.menuItem.update({
            where: { id: oi.menuItemId },
            data: { stock: { increment: ri.qty } },
          });
        }
        const remaining = oi.quantity - ri.qty;
        if (remaining <= 0) {
          await tx.orderItem.delete({ where: { id: oi.id } });
        } else {
          await tx.orderItem.update({
            where: { id: oi.id },
            data: { quantity: remaining },
          });
        }
      }
    } else {
      for (const item of order.items) {
        if (item.menuItem.stock !== null) {
          await tx.menuItem.update({
            where: { id: item.menuItemId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
    }

    const updatedOrder = await tx.order.update({
      where: { id },
      data: {
        paymentStatus: "refunded",
        ...(itemsToRefund && itemsToRefund.length > 0 ? {} : { status: "cancelled" }),
      },
      include: { items: { include: { menuItem: true } }, table: true },
    });

    if (updatedOrder.tableId && updatedOrder.status === "cancelled") {
      const hasOther = await tx.order.findFirst({
        where: { tableId: updatedOrder.tableId, id: { not: id }, status: { in: ["received", "preparing", "ready"] } },
      });
      if (!hasOther) {
        await tx.table.update({ where: { id: updatedOrder.tableId }, data: { status: "available" } });
      }
    }

    return updatedOrder;
  });

  orderEvents.emit("order:updated", refunded);
  return NextResponse.json(refunded);
}
