import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { orderEvents } from "@/lib/sse";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";

async function getStaff() {
  const cookieStore = await cookies();
  return verifyToken(cookieStore.get("token")?.value || "");
}

export async function POST(req: Request) {
  const body = await req.json();

  const staff = await getStaff();

  if (staff && !["admin", "cashier"].includes(staff.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const outletId = body.outletId || staff?.outletId;
  if (!outletId) {
    return NextResponse.json({ error: "Outlet required" }, { status: 400 });
  }

  for (const item of body.items) {
    const menuItem = await prisma.menuItem.findUnique({ where: { id: item.menuItemId } });
    if (!menuItem || !menuItem.available) {
      return NextResponse.json({ error: `Item ${item.menuItemId} not available` }, { status: 400 });
    }
    if (menuItem.stock !== null && menuItem.stock < item.quantity) {
      return NextResponse.json({ error: `Stock tidak cukup untuk ${menuItem.name}` }, { status: 400 });
    }
  }

  const table = body.tableId ? await prisma.table.findFirst({
    where: { outletId, number: body.tableId },
  }) : null;

  const order = await prisma.$transaction(async (tx) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await tx.order.count({
      where: { outletId, createdAt: { gte: today } },
    });

    const subtotal = body.items.reduce((s: number, i: { price: number; quantity: number }) => s + i.price * i.quantity, 0);
    const tax = Math.round(subtotal * 0.1);
    const total = subtotal + tax;

    const order = await tx.order.create({
      data: {
        outletId,
        tableId: table?.id,
        staffId: staff?.id,
        ref: nanoid(8).toUpperCase(),
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

    if (table) {
      await tx.table.update({ where: { id: table.id }, data: { status: "occupied" } });
    }

    return order;
  });

  orderEvents.emit("order:created", order);

  return NextResponse.json(order, { status: 201 });
}

export async function GET(req: Request) {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where: Record<string, unknown> = { outletId: staff.outletId };
  if (status) where.status = status;

  const orders = await prisma.order.findMany({
    where,
    include: { items: { include: { menuItem: true } }, table: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(orders);
}
