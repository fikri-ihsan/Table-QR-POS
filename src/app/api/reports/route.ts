import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const weekdayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const staff = await verifyToken(cookieStore.get("token")?.value || "");
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "daily";
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const isExport = searchParams.get("export") === "csv";

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
    include: { items: { include: { menuItem: true } }, table: true },
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
        itemCounts[key] = { name: item.menuItem?.name || "Unknown", qty: 0, revenue: 0 };
      }
      itemCounts[key].qty += item.quantity;
      itemCounts[key].revenue += item.price * item.quantity;
    }
  }
  const popularItems = Object.values(itemCounts).sort((a, b) => b.qty - a.qty).slice(0, 10);

  // daily revenue
  const dailyRevenueMap: Record<string, number> = {};
  for (const order of orders) {
    const day = order.createdAt.toISOString().split("T")[0];
    dailyRevenueMap[day] = (dailyRevenueMap[day] || 0) + order.total;
  }
  const dailyRevenue = Object.entries(dailyRevenueMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({ date, revenue }));

  // hourly orders (for daily view)
  const hourlyMap: Record<number, { count: number; revenue: number }> = {};
  for (let h = 0; h < 24; h++) hourlyMap[h] = { count: 0, revenue: 0 };
  for (const order of orders) {
    const h = new Date(order.createdAt).getHours();
    hourlyMap[h].count++;
    hourlyMap[h].revenue += order.total;
  }
  const hourlyOrders = Object.entries(hourlyMap).map(([hour, data]) => ({ hour: parseInt(hour), ...data }));

  // weekday orders
  const weekdayMap: Record<string, { count: number; revenue: number }> = {};
  for (const day of weekdayNames) weekdayMap[day] = { count: 0, revenue: 0 };
  for (const order of orders) {
    const day = weekdayNames[new Date(order.createdAt).getDay()];
    weekdayMap[day].count++;
    weekdayMap[day].revenue += order.total;
  }
  const weekdayOrders = weekdayNames.map((day) => ({ day, ...weekdayMap[day] }));

  if (isExport) {
    const lines: string[] = [];

    lines.push("=== RINGKASAN ===");
    lines.push(`Periode,${type === "daily" ? "Hari Ini" : type === "weekly" ? "7 Hari" : "30 Hari"}`);
    lines.push(`Total Revenue,Rp ${totalRevenue.toLocaleString("id-ID")}`);
    lines.push(`Total Pesanan,${totalOrders}`);
    lines.push(`Rata-rata Pesanan,Rp ${avgOrderValue.toLocaleString("id-ID")}`);
    lines.push("");

    lines.push("=== DETAIL PESANAN ===");
    lines.push("No Order,Ref,Tanggal,Meja,Customer,Items,Subtotal,Pajak,Service,Diskon,Total,Status,Pembayaran");
    for (const o of orders) {
      const itemsSummary = o.items.map((i) => `${i.quantity}x ${i.menuItem?.name || "?"}`).join("; ");
      lines.push([
        `#${o.orderNumber}`,
        o.ref || "",
        o.createdAt.toISOString(),
        o.table ? `Meja ${o.table.number}` : "Takeaway",
        o.customerName || "",
        `"${itemsSummary}"`,
        o.subtotal,
        o.tax,
        o.service,
        o.discount || 0,
        o.total,
        o.status,
        o.paymentMethod || "",
      ].join(","));
    }
    lines.push("");

    lines.push("=== ITEM TERLARIS ===");
    lines.push("Item,Qty,Revenue");
    for (const item of popularItems) {
      lines.push(`"${item.name}",${item.qty},Rp ${item.revenue.toLocaleString("id-ID")}`);
    }
    lines.push("");

    lines.push("=== JAM SIBUK ===");
    lines.push("Jam,Jumlah Pesanan,Revenue");
    for (const h of hourlyOrders) {
      if (h.count > 0) lines.push(`${h.hour}:00,${h.count},Rp ${h.revenue.toLocaleString("id-ID")}`);
    }
    lines.push("");

    lines.push("=== HARI SIBUK ===");
    lines.push("Hari,Jumlah Pesanan,Revenue");
    for (const d of weekdayOrders) {
      if (d.count > 0) lines.push(`${d.day},${d.count},Rp ${d.revenue.toLocaleString("id-ID")}`);
    }

    const csv = lines.join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="laporan-${type}-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  return NextResponse.json({
    totalRevenue,
    totalOrders,
    avgOrderValue,
    popularItems,
    dailyRevenue,
    hourlyOrders,
    weekdayOrders,
  });
}
