import { prisma } from "@/lib/db";
import { orderEvents } from "@/lib/sse";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  // get today's order count for orderNumber
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = await prisma.order.count({
    where: { createdAt: { gte: today } },
  });

  const subtotal = body.items.reduce((s: number, i: { price: number; quantity: number }) => s + i.price * i.quantity, 0);
  const tax = Math.round(subtotal * 0.1);
  const total = subtotal + tax;

  // find table
  const table = await prisma.table.findFirst({
    where: { outletId: body.outletId, number: body.tableId },
  });

  const order = await prisma.order.create({
    data: {
      outletId: body.outletId,
      tableId: table?.id,
      orderNumber: todayCount + 1,
      type: body.type || "dine_in",
      customerName: body.customerName || null,
      subtotal,
      tax,
      total,
      items: {
        create: body.items.map((i: { menuItemId: string; quantity: number; price: number; notes?: string }) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          price: i.price,
          notes: i.notes,
        })),
      },
    },
    include: { items: true, table: true },
  });

  // update table status to occupied
  if (table) {
    await prisma.table.update({ where: { id: table.id }, data: { status: "occupied" } });
  }

  // emit SSE event
  orderEvents.emit("order:created", order);

  return NextResponse.json(order, { status: 201 });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outletId");
  const status = searchParams.get("status");

  const where: Record<string, string> = {};
  if (outletId) where.outletId = outletId;
  if (status) where.status = status;

  const orders = await prisma.order.findMany({
    where,
    include: { items: { include: { menuItem: true } }, table: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(orders);
}
