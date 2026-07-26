import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { orderEvents } from "@/lib/sse";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = await prisma.order.count({
    where: { outletId, createdAt: { gte: today } },
  });

  const subtotal = body.items.reduce((s: number, i: { price: number; quantity: number }) => s + i.price * i.quantity, 0);
  const tax = Math.round(subtotal * 0.1);
  const total = subtotal + tax;

  const table = body.tableId ? await prisma.table.findFirst({
    where: { outletId, number: body.tableId },
  }) : null;

  const order = await prisma.order.create({
    data: {
      outletId,
      tableId: table?.id,
      staffId: staff?.id,
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
    await prisma.table.update({ where: { id: table.id }, data: { status: "occupied" } });
  }

  orderEvents.emit("order:created", order);

  return NextResponse.json(order, { status: 201 });
}

export async function GET(req: Request) {
  const staff = await getStaff();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const outletId = searchParams.get("outletId") || staff.outletId;
  const status = searchParams.get("status");

  const where: Record<string, string> = { outletId };
  if (status) where.status = status;

  const orders = await prisma.order.findMany({
    where,
    include: { items: { include: { menuItem: true } }, table: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json(orders);
}
