"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Toast from "@/components/toast";

type MenuItem = { id: string; name: string; price: number; image: string | null; stock: number | null; category: { name: string }; available: boolean };
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
  const [toastType, setToastType] = useState<"success" | "error" | "info" | "warning">("success");
  const [lastOrderNumber, setLastOrderNumber] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [paidOrder, setPaidOrder] = useState<any>(null);
  const [customerName, setCustomerName] = useState("");
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState(10);
  const [taxLabel, setTaxLabel] = useState("Pajak");
  const [serviceEnabled, setServiceEnabled] = useState(false);
  const [serviceRate, setServiceRate] = useState(5);
  const [serviceLabel, setServiceLabel] = useState("Service");
  const [discountType, setDiscountType] = useState<"percent" | "nominal" | "">("");
  const [discountValue, setDiscountValue] = useState("");

  useEffect(() => {
    if (!staff) return;
    fetch("/api/outlets").then((r) => r.json()).then((data) => {
      const o = data[0];
      if (o) {
        setTaxEnabled(o.taxEnabled ?? false);
        setTaxRate(o.taxRate ?? 10);
        setTaxLabel(o.taxLabel || "Pajak");
        setServiceEnabled(o.serviceEnabled ?? false);
        setServiceRate(o.serviceRate ?? 5);
        setServiceLabel(o.serviceLabel || "Service");
      }
    }).catch(() => {});
    fetch("/api/orders").then((r) => r.json()).then((data) => {
      const orders = data.orders || data;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      setTodayCount(orders.filter((o: { createdAt: string }) => new Date(o.createdAt) >= today).length);
    }).catch(() => {});
  }, [staff]);

  useEffect(() => {
    if (paidOrder) setTimeout(() => window.print(), 300);
  }, [paidOrder]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("transaction_status") === "settlement") {
      const saved = localStorage.getItem("lastOrder");
      if (saved) { setPaidOrder(JSON.parse(saved)); localStorage.removeItem("lastOrder"); }
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
      const currentQty = existing?.qty || 0;
      if (item.stock !== null && currentQty >= item.stock) {
        setToast(`Stok ${item.name} hanya tersisa ${item.stock}`);
        setToastType("warning");
        return prev;
      }
      if (existing) return prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { ...item, qty: 1, notes: "" }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => {
      if (delta > 0) {
        const item = prev.find((i) => i.id === id);
        if (item && item.stock !== null && item.qty >= item.stock) return prev;
      }
      return prev.map((i) => (i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i)).filter((i) => i.qty > 0);
    });
  };

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const tax = taxEnabled ? Math.round(subtotal * taxRate / 100) : 0;
  const serviceCharge = serviceEnabled ? Math.round(subtotal * serviceRate / 100) : 0;
  const discountAmount = discountType === "percent" ? Math.round(subtotal * Number(discountValue) / 100) : discountType === "nominal" ? Number(discountValue) : 0;
  const total = Math.max(0, subtotal + tax + serviceCharge - discountAmount);
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
        customerName: customerName || null,
        discountType: discountType || null,
        discount: discountValue ? Number(discountValue) : 0,
        items: cart.map((i) => ({ menuItemId: i.id, quantity: i.qty, price: i.price, notes: i.notes || null })),
      }),
    });
    const order = await res.json();
    setLastOrderNumber(order.orderNumber);
    const now = new Date();
    const outletName = order.outlet?.name || "Laris POS";
    const outletAddress = order.outlet?.address || "";
    const orderTax = taxEnabled ? Math.round(subtotal * taxRate / 100) : 0;
    const orderService = serviceEnabled ? Math.round(subtotal * serviceRate / 100) : 0;

    if (paymentMethod === "cash") {
      await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "received", paymentStatus: "paid", paymentMethod: "cash" }),
      });
      setCart([]);
      setDiscountType("");
      setDiscountValue("");
      setPaidOrder({
        orderRef: order.ref,
        orderNumber: order.orderNumber,
        total: order.total,
        subtotal: order.subtotal,
        tax: orderTax,
        service: orderService,
        discount: discountAmount,
        discountLabel: discountType === "percent" ? `Diskon ${discountValue}%` : discountAmount > 0 ? "Diskon" : null,
        taxLabel,
        serviceLabel,
        customerName: customerName || null,
        cashierName: staff!.name,
        outletName,
        outletAddress,
        createdAt: now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        items: cart.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
      });
    } else {
      localStorage.setItem("lastOrder", JSON.stringify({
        orderRef: order.ref,
        orderNumber: order.orderNumber,
        total: order.total,
        subtotal: order.subtotal,
        tax: orderTax,
        service: orderService,
        discount: discountAmount,
        discountLabel: discountType === "percent" ? `Diskon ${discountValue}%` : discountAmount > 0 ? "Diskon" : null,
        taxLabel,
        serviceLabel,
        customerName: customerName || null,
        cashierName: staff!.name,
        outletName,
        outletAddress,
        createdAt: now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        items: cart.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
      }));

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
        setDiscountType("");
        setDiscountValue("");
        setToast(`✓ Pesanan #${order.orderNumber} — Silakan selesaikan pembayaran di tab baru.`);
        setToastType("success");
      } else {
        setToast("✕ Gagal membuat pembayaran. Periksa konfigurasi Midtrans.");
        setToastType("error");
      }
    }
  };

  const categories = ["Semua", ...new Set(items.map((i) => i.category.name))];

  if (authLoading || !staff) return null;

  return (
    <>
    <div className="h-screen flex flex-col bg-zinc-50 no-print">
      <header className="bg-white border-b border-zinc-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="font-bold text-zinc-800">Laris POS</h1>
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
              <button
                key={item.id}
                onClick={() => addToCart(item)}
                disabled={item.stock !== null && item.stock <= 0}
                className={`bg-white rounded-2xl text-left border border-zinc-200 transition-all overflow-hidden ${item.stock !== null && item.stock <= 0 ? "opacity-40 cursor-not-allowed" : "hover:border-violet-300"}`}
              >
                <div className="aspect-square overflow-hidden relative">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-300 text-xs bg-zinc-50">Foto</div>
                  )}
                  {item.stock !== null && item.stock <= 0 && (
                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                      <span className="text-xs font-semibold text-zinc-400 bg-white/80 px-2 py-0.5 rounded">Habis</span>
                    </div>
                  )}
                </div>
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
              {tax > 0 && <div className="flex justify-between text-zinc-700"><span>{taxLabel} {taxRate}%</span><span>Rp {tax.toLocaleString("id-ID")}</span></div>}
              {serviceCharge > 0 && <div className="flex justify-between text-zinc-700"><span>{serviceLabel} {serviceRate}%</span><span>Rp {serviceCharge.toLocaleString("id-ID")}</span></div>}
              {discountAmount > 0 && <div className="flex justify-between text-red-600"><span>Diskon {discountType === "percent" ? `(${discountValue}%)` : ""}</span><span>-Rp {discountAmount.toLocaleString("id-ID")}</span></div>}
              <div className="flex justify-between font-bold text-sm text-zinc-800 pt-1 border-t border-zinc-100"><span>Total</span><span>Rp {total.toLocaleString("id-ID")}</span></div>
            </div>

            <div className="flex gap-2">
              <select value={discountType} onChange={(e) => { setDiscountType(e.target.value as any); setDiscountValue(""); }} className="flex-1 px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-700 bg-white">
                <option value="">No Diskon</option>
                <option value="percent">Diskon %</option>
                <option value="nominal">Diskon Rp</option>
              </select>
              {discountType && (
                <input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === "percent" ? "10" : "5000"}
                  className="w-24 px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800 bg-white" min={0} />
              )}
            </div>
            <input
              type="text"
              placeholder="Nama pemesan"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800 bg-white"
            />
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
      {toast && <Toast message={toast} type={toastType} onClose={() => setToast(null)} />}

      {paidOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-10 p-4 overflow-y-auto">
          <div className="w-full max-w-sm">
            <div className="text-center mb-4 no-print">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-xl text-green-600">✓</span>
              </div>
              <h2 className="text-lg font-bold text-zinc-800">Pembayaran Berhasil</h2>
            </div>

            <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
              <div className="text-center">
                <h3 className="font-bold text-zinc-800 text-lg">{paidOrder.outletName}</h3>
                {paidOrder.outletAddress && <p className="text-[10px] text-zinc-400">{paidOrder.outletAddress}</p>}
              </div>

              <div className="text-center border-t border-zinc-100 pt-3 space-y-1">
                <p className="text-xs text-zinc-500 font-semibold">#{paidOrder.orderNumber} · {paidOrder.orderRef} · {paidOrder.cashierName}</p>
                <p className="text-[10px] text-zinc-400">{paidOrder.createdAt}</p>
                {paidOrder.customerName && <p className="text-sm text-zinc-400 font-semibold">{paidOrder.customerName}</p>}
              </div>

              <div className="border-t border-zinc-100 pt-4 space-y-2">
                {paidOrder.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-zinc-700"><span className="font-semibold">{item.qty}x</span> {item.name}</span>
                    <span className="text-zinc-800">Rp {(item.price * item.qty).toLocaleString("id-ID")}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-zinc-100 pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-zinc-600"><span>Subtotal</span><span>Rp {paidOrder.subtotal.toLocaleString("id-ID")}</span></div>
                <div className="flex justify-between text-zinc-600"><span>{paidOrder.taxLabel || "Pajak"}</span><span>Rp {paidOrder.tax.toLocaleString("id-ID")}</span></div>
                {paidOrder.service > 0 && <div className="flex justify-between text-zinc-600"><span>{paidOrder.serviceLabel || "Service"}</span><span>Rp {paidOrder.service.toLocaleString("id-ID")}</span></div>}
                {paidOrder.discount > 0 && <div className="flex justify-between text-red-600"><span>{paidOrder.discountLabel || "Diskon"}</span><span>-Rp {paidOrder.discount.toLocaleString("id-ID")}</span></div>}
                <div className="flex justify-between font-bold text-zinc-800 pt-1 border-t border-zinc-100"><span>Total Dibayar</span><span>Rp {paidOrder.total.toLocaleString("id-ID")}</span></div>
              </div>

              <p className="text-center text-[10px] text-zinc-400 pt-2">Terima kasih! Selamat menikmati.</p>
              <button onClick={() => window.print()} className="w-full py-3 rounded-xl border border-zinc-300 text-zinc-700 text-sm font-semibold hover:bg-zinc-50 no-print">
                Print Invoice
              </button>
              <button onClick={() => { setPaidOrder(null); localStorage.removeItem("lastOrder"); }} className="w-full py-3 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 no-print">
                Pesanan Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}