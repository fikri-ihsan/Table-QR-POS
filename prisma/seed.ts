import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create outlet
  const outlet = await prisma.outlet.create({
    data: {
      name: "Saji Coffee & Eatery",
      address: "Jl. Merdeka No. 123, Bandung",
      phone: "081234567890",
    },
  });

  // Create categories
  const kategoryKopi = await prisma.category.create({
    data: { outletId: outlet.id, name: "Kopi", sortOrder: 1 },
  });
  const kategoryMakanan = await prisma.category.create({
    data: { outletId: outlet.id, name: "Makanan", sortOrder: 2 },
  });
  const kategorySnack = await prisma.category.create({
    data: { outletId: outlet.id, name: "Snack", sortOrder: 3 },
  });
  const kategoryMinuman = await prisma.category.create({
    data: { outletId: outlet.id, name: "Minuman", sortOrder: 4 },
  });

  // Create menu items
  const menuItems = [
    { categoryId: kategoryKopi.id, name: "Es Kopi Susu Aren", price: 28000, desc: "Espresso blend dengan susu segar & sirup aren murni", stock: 50, lowStockAt: 10 },
    { categoryId: kategoryKopi.id, name: "Cafe Latte", price: 32000, desc: "Double espresso shot dengan microfoam milk lembut", stock: null, lowStockAt: null },
    { categoryId: kategoryKopi.id, name: "Cappuccino", price: 30000, desc: "Espresso dengan foam susu tebal", stock: null, lowStockAt: null },
    { categoryId: kategoryKopi.id, name: "Americano", price: 25000, desc: "Espresso shot murni dengan air panas", stock: null, lowStockAt: null },
    { categoryId: kategoryMakanan.id, name: "Nasi Goreng Kampung", price: 35000, desc: "Nasi goreng bumbu tradisional dengan telur mata sapi", stock: null, lowStockAt: null },
    { categoryId: kategoryMakanan.id, name: "Mie Goreng Tek-Tek", price: 30000, desc: "Mie kuning goreng khas kaki lima", stock: null, lowStockAt: null },
    { categoryId: kategoryMakanan.id, name: "Chicken Katsu Curry", price: 42000, desc: "Ayam katsu renyah dengan saus kari Jepang", stock: 30, lowStockAt: 5 },
    { categoryId: kategorySnack.id, name: "French Fries", price: 22000, desc: "Kentang goreng renyah", stock: null, lowStockAt: null },
    { categoryId: kategorySnack.id, name: "Roti Bakar Coklat Keju", price: 18000, desc: "Roti bakar dengan keju & coklat melimpah", stock: null, lowStockAt: null },
    { categoryId: kategorySnack.id, name: "Pisang Goreng Madu", price: 15000, desc: "Pisang kepok dengan siraman madu", stock: null, lowStockAt: null },
    { categoryId: kategoryMinuman.id, name: "Matcha Latte", price: 35000, desc: "Matcha Jepang grade premium", stock: null, lowStockAt: null },
    { categoryId: kategoryMinuman.id, name: "Jus Jeruk Peras", price: 20000, desc: "Jeruk peras murni segar", stock: null, lowStockAt: null },
    { categoryId: kategoryMinuman.id, name: "Es Teh Manis", price: 12000, desc: "Teh melati seduh tradisional", stock: null, lowStockAt: null },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.create({
      data: {
        outletId: outlet.id,
        categoryId: item.categoryId,
        name: item.name,
        price: item.price,
        description: item.desc,
        stock: item.stock,
        lowStockAt: item.lowStockAt,
        available: true,
      },
    });
  }

  // Create tables
  for (let i = 1; i <= 8; i++) {
    await prisma.table.create({
      data: {
        outletId: outlet.id,
        number: i,
        capacity: i <= 2 ? 2 : i <= 6 ? 4 : 6,
      },
    });
  }

  // Create staff
  await prisma.staff.create({
    data: {
      outletId: outlet.id,
      name: "Admin",
      pin: "123456",
      role: "admin",
    },
  });

  await prisma.staff.create({
    data: {
      outletId: outlet.id,
      name: "Kasir",
      pin: "111111",
      role: "cashier",
    },
  });

  await prisma.staff.create({
    data: {
      outletId: outlet.id,
      name: "Dapur",
      pin: "222222",
      role: "kitchen",
    },
  });

  console.log("✅ Seed selesai!");
  console.log("   Staff: Admin (123456), Kasir (111111), Dapur (222222)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
