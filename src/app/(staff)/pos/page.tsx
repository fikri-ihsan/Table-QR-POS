"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Toast from "@/components/toast";

type MenuItem = { id: string; name: string; price: number; image: string | null; category: { name: string }; available: boolean };
type CartItem = MenuItem & { qty: number; notes: string };

export default function POSPage() {
  const { staff, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCat, setSelectedCat] = useState("Semua");
  const [orderType, setOrderType] = useState("dine_in");
  const [tableNumber, setTableNumber] = useState(1);
  const [tables, setTables] = useState<{ id: string; number: number }[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [lastOrderNumber, setLastOrderNumber] = useState(0);
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    if (!staff) return;
    fetch("/api/orders").then((r) => r.json()).then((orders: { createdAt: string }[]) => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      setTodayCount(orders.filter((o) => new Date(o.createdAt) >= today).length);
    }).catch(() => {});
  }, [staff]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("transaction_status") === "settlement") {
      setToast("✓ Pembayaran berhasil!");
      window.history.replaceState({}, "", "/pos");
    }
  }, []);

  useEffect(() => {
    if (!staff) return;
    if (staff.role === "kitchen") { router.push("/kitchen"); return; }
    Promise.all([
      fetch(`/api/menu?outletId=${staff.outletId}`).then((r) => r.json()),
      fetch("/api/tables").then((r) => r.json()),
    ]).then(([menu, tables]) => {
      setItems(menu);
      setTables(tables);
    });
  }, [staff]);

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
    setLastOrderNumber(order.orderNumber);

    if (paymentMethod === "cash") {
      await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "received" }),
      });
      setCart([]);
      setToast(`✓ Pesanan #${order.orderNumber} — Tunai dibayar!`);
    } else {
      const payRes = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          callbackUrl: window.location.origin + "/pos",
        }),
      });
      const payData = await payRes.json();

      if (payData.redirectUrl) {
        window.open(payData.redirectUrl, "_blank");
        setCart([]);
        setToast(`✓ Pesanan #${order.orderNumber} — Silakan selesaikan pembayaran di tab baru.`);
      } else {
        setToast("✕ Gagal membuat pembayaran. Periksa konfigurasi Midtrans.");
      }
    }
  };

  const categories = ["Semua", ...new Set(items.map((i) => i.category.name))];

  if (authLoading || !staff) return null;

  return (
    <>
    <div className="h-screen flex flex-col bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-zinc-800">Saji POS</h1>
          <span className="text-xs text-zinc-500">{staff.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setOrderType("dine_in")} className={`px-4 py-2 rounded-lg text-sm ${orderType === "dine_in" ? "bg-violet-600 text-white" : "border border-zinc-300 text-zinc-700"}`}>Dine In</button>
          <button onClick={() => setOrderType("takeaway")} className={`px-4 py-2 rounded-lg text-sm ${orderType === "takeaway" ? "bg-violet-600 text-white" : "border border-zinc-300 text-zinc-700"}`}>Takeaway</button>
          {orderType === "dine_in" && (
            <select value={tableNumber} onChange={(e) => setTableNumber(Number(e.target.value))} className="text-sm px-3 py-2 rounded-lg border border-zinc-300 text-zinc-700">
              {tables.map((t) => <option key={t.id} value={t.number}>Meja {t.number}</option>)}
            </select>
          )}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setSelectedCat(cat)} className={`px-5 py-2 rounded-full text-sm whitespace-nowrap ${selectedCat === cat ? "bg-violet-600 text-white" : "bg-white border border-zinc-300 text-zinc-700"}`}>{cat}</button>
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {filteredItems.map((item) => (
              <button key={item.id} onClick={() => addToCart(item)} className="bg-white rounded-2xl text-left border border-zinc-200 hover:border-violet-300 transition-all overflow-hidden">
                {item.image ? (
                  <div className="aspect-square overflow-hidden">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-square flex items-center justify-center text-zinc-300 text-xs bg-zinc-50">Foto</div>
                )}
                <div className="p-3">
                  <h3 className="font-semibold text-sm text-zinc-800 line-clamp-2">{item.name}</h3>
                  <p className="text-sm text-violet-600 font-bold mt-1">Rp {item.price.toLocaleString("id-ID")}</p>
                </div>
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
                    <span className="text-base font-medium text-zinc-800">{item.name}</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateQty(item.id, -1)} className="w-9 h-9 rounded-full border border-zinc-300 flex items-center justify-center text-base">-</button>
                      <span className="text-lg font-semibold text-zinc-800 w-5 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="w-9 h-9 rounded-full border border-zinc-300 flex items-center justify-center text-base">+</button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-zinc-600">Rp {(item.price * item.qty).toLocaleString("id-ID")}</p>
                    <input type="text" placeholder="catatan" value={item.notes} onChange={(e) => setCart((prev) => prev.map((i) => i.id === item.id ? { ...i, notes: e.target.value } : i))} className="w-28 text-sm px-2 py-1.5 rounded-lg border border-zinc-200 text-zinc-800" />
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

            <div className="text-center text-xs text-zinc-400">
              {lastOrderNumber > 0 ? <span>Pesanan Terakhir: #{lastOrderNumber}</span> : todayCount > 0 && <span>Pesanan #{todayCount + 1}</span>}
            </div>
            <div className="space-y-2">
              <button onClick={() => handleCheckout("cash")} disabled={cart.length === 0} className="w-full py-4 rounded-xl bg-green-600 text-white text-base font-semibold disabled:opacity-40">Tunai</button>
              <button onClick={() => handleCheckout("qris")} disabled={cart.length === 0} className="w-full py-4 rounded-xl bg-blue-600 text-white text-base font-semibold disabled:opacity-40">QRIS</button>
            </div>
          </div>
        </div>
      </div>
    </div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}