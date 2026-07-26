"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Staff = { id: string; outletId: string; name: string; role: string };
type MenuItem = { id: string; name: string; price: number; category: { name: string }; available: boolean };
type CartItem = MenuItem & { qty: number; notes: string };

export default function POSPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCat, setSelectedCat] = useState("Semua");
  const [orderType, setOrderType] = useState("dine_in");
  const [tableNumber, setTableNumber] = useState(1);
  const [tables, setTables] = useState<{ id: string; number: number }[]>([]);

  useEffect(() => {
    fetch("/api/auth/me").then(async (res) => {
      if (!res.ok) return router.push("/login");
      const s = await res.json();
      setStaff(s);
      const [menuRes, tablesRes] = await Promise.all([
        fetch(`/api/menu?outletId=${s.outletId}`),
        fetch("/api/tables"),
      ]);
      setItems(await menuRes.json());
      setTables(await tablesRes.json());
    });
  }, [router]);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) return prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { ...item, qty: 1, notes: "" }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) => (i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i)).filter((i) => i.qty > 0)
    );
  };

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const total = subtotal + Math.round(subtotal * 0.1);
  const totalItems = cart.reduce((sum, i) => sum + i.qty, 0);

  const filteredItems = selectedCat === "Semua"
    ? items.filter((i) => i.available)
    : items.filter((i) => i.category.name === selectedCat && i.available);

  const handleCheckout = async (paymentMethod: string) => {
    if (cart.length === 0) return;
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outletId: staff!.outletId,
        tableId: orderType === "dine_in" ? tableNumber : null,
        staffId: staff!.id,
        type: orderType,
        items: cart.map((i) => ({ menuItemId: i.id, quantity: i.qty, price: i.price, notes: i.notes || null })),
      }),
    });
    const order = await res.json();

    if (paymentMethod === "cash") {
      await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "received" }),
      });
    }

    setCart([]);
    alert(`Pesanan #${order.orderNumber} berhasil dibuat!`);
  };

  const categories = ["Semua", ...new Set(items.map((i) => i.category.name))];

  if (!staff) return null;

  return (
    <div className="h-screen flex flex-col bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-zinc-800">Saji POS</h1>
          <span className="text-xs text-zinc-500">{staff.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setOrderType("dine_in")} className={`px-3 py-1 rounded-lg text-xs ${orderType === "dine_in" ? "bg-violet-600 text-white" : "border border-zinc-300 text-zinc-700"}`}>Dine In</button>
          <button onClick={() => setOrderType("takeaway")} className={`px-3 py-1 rounded-lg text-xs ${orderType === "takeaway" ? "bg-violet-600 text-white" : "border border-zinc-300 text-zinc-700"}`}>Takeaway</button>
          {orderType === "dine_in" && (
            <select value={tableNumber} onChange={(e) => setTableNumber(Number(e.target.value))} className="text-xs px-2 py-1 rounded-lg border border-zinc-300 text-zinc-700">
              {tables.map((t) => <option key={t.id} value={t.number}>Meja {t.number}</option>)}
            </select>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setSelectedCat(cat)} className={`px-4 py-1.5 rounded-full text-xs whitespace-nowrap ${selectedCat === cat ? "bg-violet-600 text-white" : "bg-white border border-zinc-300 text-zinc-700"}`}>{cat}</button>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredItems.map((item) => (
              <button key={item.id} onClick={() => addToCart(item)} className="bg-white rounded-2xl p-4 text-left border border-zinc-200 hover:border-violet-300 transition-all">
                <h3 className="font-semibold text-sm text-zinc-800">{item.name}</h3>
                <p className="text-xs text-zinc-600 mt-1">Rp {item.price.toLocaleString("id-ID")}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="w-80 bg-white border-l border-zinc-200 flex flex-col">
          <div className="p-4 border-b border-zinc-100">
            <h2 className="font-semibold text-sm text-zinc-800">Pesanan {totalItems > 0 && `(${totalItems})`}</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <p className="text-xs text-zinc-500 text-center pt-10">Belum ada item</p>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="border-b border-zinc-100 pb-3">
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-medium text-zinc-800">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.id, -1)} className="w-5 h-5 rounded-full border border-zinc-300 flex items-center justify-center text-xs">-</button>
                      <span className="text-sm font-semibold text-zinc-800 w-4 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="w-5 h-5 rounded-full border border-zinc-300 flex items-center justify-center text-xs">+</button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-zinc-600">Rp {(item.price * item.qty).toLocaleString("id-ID")}</p>
                    <input type="text" placeholder="catatan" value={item.notes} onChange={(e) => setCart((prev) => prev.map((i) => i.id === item.id ? { ...i, notes: e.target.value } : i))} className="w-24 text-xs px-1.5 py-0.5 rounded border border-zinc-200 text-zinc-800" />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-zinc-100 space-y-3">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-zinc-700"><span>Subtotal</span><span>Rp {subtotal.toLocaleString("id-ID")}</span></div>
              <div className="flex justify-between text-zinc-700"><span>Pajak 10%</span><span>Rp {Math.round(subtotal * 0.1).toLocaleString("id-ID")}</span></div>
              <div className="flex justify-between font-bold text-sm text-zinc-800 pt-1 border-t border-zinc-100"><span>Total</span><span>Rp {total.toLocaleString("id-ID")}</span></div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => handleCheckout("cash")} disabled={cart.length === 0} className="py-2 rounded-xl bg-green-600 text-white text-xs font-semibold disabled:opacity-40">Tunai</button>
              <button onClick={() => handleCheckout("qris")} disabled={cart.length === 0} className="py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold disabled:opacity-40">QRIS</button>
              <button onClick={() => handleCheckout("card")} disabled={cart.length === 0} className="py-2 rounded-xl bg-violet-600 text-white text-xs font-semibold disabled:opacity-40">Card/VA</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
