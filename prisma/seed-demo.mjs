import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const p = new PrismaClient();

let outlet = await p.outlet.findFirst();
if (!outlet) {
  outlet = await p.outlet.create({ data: { name: "Saji Coffee & Eatery", taxEnabled: true, taxRate: 10, taxLabel: "Pajak", serviceEnabled: false, serviceRate: 5, serviceLabel: "Service" } });
  const pin = await bcrypt.hash("123456", 12);
  await p.staff.create({ data: { outletId: outlet.id, name: "Admin", pin, role: "admin" } });
  console.log("CREATED outlet + admin (PIN 123456)");
}
const oid = outlet.id;

const CATS = ["Kopi", "Non-Kopi", "Dessert"]; // keep existing Minuman & Makanan too
const MENU = [
  // [name, category, price, stock]
  ["Espresso",        "Kopi",     18000,  null],
  ["Kopi Susu Gula Aren","Kopi",  22000,  null],
  ["Kopi Hitam",      "Kopi",     15000,  null],
  ["Cappuccino",      "Kopi",     24000,  null],
  ["Caramel Machiatto","Kopi",    28000,  null],
  ["Matcha Latte",    "Non-Kopi", 26000,  null],
  ["Lemon Tea",       "Non-Kopi", 15000,  null],
  ["Es Teh Manis",    "Non-Kopi", 10000,  null],
  ["Kopi Susu Klasik", "Kopi",    20000,  null],
  ["Banana Smoothie", "Non-Kopi", 24000,  null],
  ["Chessecake Selai Kacang", "Dessert", 30000, 5],
  ["Brownies Almond", "Dessert",  26000,  null],
  ["Choco Lava Cake", "Dessert",  32000,  null],
  ["Nasi Goreng Spesial","Makanan", 35000, null],
  ["Ayam Geprek",     "Makanan",  25000, null],
  ["Indomie Goreng",  "Makanan",  15000, null],
];

// categories
const catId = {};
for (const [cid, name] of [[null,"Minuman"],[null,"Makanan"],...CATS.map(c=>[null,c])]) {
  let c = await p.category.findFirst({ where: { outletId: oid, name } });
  if (!c) c = await p.category.create({ data: { outletId: oid, name, sortOrder: 0 } });
  catId[name] = c.id;
}

// menu items
let added = 0;
for (const [name, cat, price, stock] of MENU) {
  const exists = await p.menuItem.findFirst({ where: { outletId: oid, name } });
  if (!exists) {
    await p.menuItem.create({ data: { outletId: oid, categoryId: catId[cat], name, price, stock, available: true } });
    added++;
  }
}

// tables 1..8
let tadd = 0;
for (let n = 1; n <= 8; n++) {
  const exists = await p.table.findFirst({ where: { outletId: oid, number: n } });
  if (!exists) { await p.table.create({ data: { outletId: oid, number: n, capacity: 4, status: "available" } }); tadd++; }
}

// staff
const cashier = await p.staff.findFirst({ where: { outletId: oid, name: "Kasir" } });

// fresh orders today: create 6 orders with various status for kitchen/orders/reports
const items = await p.menuItem.findMany({ where: { outletId: oid, available: true } });
const STATUSES = ["received","preparing","ready","done"];
let oadd = 0;
const now = new Date();
for (let i = 0; i < 6; i++) {
  const picks = [];
  const count = 1 + Math.floor(Math.random()*3);
  let sub = 0;
  for (let k = 0; k < count; k++) {
    const it = items[Math.floor(Math.random()*items.length)];
    const q = 1 + Math.floor(Math.random()*2);
    picks.push({ menuItemId: it.id, quantity: q, price: it.price });
    sub += it.price * q;
  }
  const status = STATUSES[i % STATUSES.length];
  const tableId = (await p.table.findFirst({ where: { outletId: oid, number: (i%8)+1 } })).id;
  const dt = new Date(now.getTime() - i*55*60000); // spaced back in time today
  const dayStart = new Date(dt); dayStart.setHours(0,0,0,0);
  const maxNum = await p.order.findFirst({ where: { outletId: oid, createdAt: { gte: dayStart } }, orderBy: { orderNumber: "desc" }, select: { orderNumber: true } });
  const orderNumber = (maxNum?.orderNumber ?? 0) + i + 1;
  await p.order.create({
    data: {
      orderNumber,
      ref: "DMO" + String(Math.floor(100000+Math.random()*900000)),
      outletId: oid,
      tableId,
      staffId: cashier.id,
      status,
      type: "dine_in",
      subtotal: sub,
      tax: Math.round(sub*0.1),
      service: 0,
      total: Math.round(sub*1.1),
      paymentStatus: "paid",
      paymentMethod: i%3===0 ? "qris" : "cash",
      createdAt: dt,
      updatedAt: dt,
      items: { create: picks },
    },
  });
  oadd++;
}

console.log(JSON.stringify({ added, tadd, oadd }));
await p.$disconnect();
