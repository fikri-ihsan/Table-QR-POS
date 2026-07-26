import { prisma } from "@/lib/db";
import { orderEvents } from "@/lib/sse";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const order = await prisma.order.update({
    where: { id },
    data: { status: body.status },
    include: { items: { include: { menuItem: true } }, table: true },
  });

  // if delivered, free the table
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
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { menuItem: true } }, table: true },
  });
  return NextResponse.json(order);
}
