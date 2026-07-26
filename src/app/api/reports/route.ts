import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const staff = await verifyToken(cookieStore.get("token")?.value || "");
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "daily";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const now = new Date();
  let startDate: Date;
  if (from) {
    startDate = new Date(from);
  } else {
    startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    if (type === "weekly") startDate.setDate(startDate.getDate() - 7);
    else if (type === "monthly") startDate.setMonth(startDate.getMonth() - 1);
  }

  const endDate = to ? new Date(to) : new Date();

  const orders = await prisma.order.findMany({
    where: {
      outletId: staff.outletId,
      paymentStatus: "paid",
      createdAt: { gte: startDate, lte: endDate },
    },
    include: { items: true, table: true },
    orderBy: { createdAt: "desc" },
  });

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  // popular items
  const itemCounts: Record<string, { name: string; qty: number; revenue: number }> = {};
  for (const order of orders) {
    for (const item of order.items) {
      const key = item.menuItemId;
      if (!itemCounts[key]) {
        const menuItem = await prisma.menuItem.findUnique({ where: { id: key } });
        itemCounts[key] = { name: menuItem?.name || "Unknown", qty: 0, revenue: 0 };
      }
      itemCounts[key].qty += item.quantity;
      itemCounts[key].revenue += item.price * item.quantity;
    }
  }

  const popularItems = Object.values(itemCounts).sort((a, b) => b.qty - a.qty).slice(0, 10);

  // daily revenue chart data
  const dailyRevenue: Record<string, number> = {};
  for (const order of orders) {
    const day = order.createdAt.toISOString().split("T")[0];
    dailyRevenue[day] = (dailyRevenue[day] || 0) + order.total;
  }

  return NextResponse.json({
    totalRevenue,
    totalOrders,
    avgOrderValue,
    popularItems,
    dailyRevenue: Object.entries(dailyRevenue).map(([date, revenue]) => ({ date, revenue })),
  });
}
