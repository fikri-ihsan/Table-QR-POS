"use client";

import { useState, useEffect } from "react";
import Toast from "@/components/toast";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  stock: number | null;
  category: { name: string };
};

type CartItem = MenuItem & { qty: number; notes: string };

type InvoiceOrder = {
  orderRef: string;
  orderNumber: number;
  total: number;
  subtotal: number;
  tax: number;
  service: number;
  taxLabel: string;
  serviceLabel: string;
  createdAt: string;
  customerName: string;
  outletName: string;
  outletAddress: string;
  items: { name: string; qty: number; price: number }[];
};

export default function CustomerOrderPage({
  params,
}: {
  params: Promise<{ outletId: string; tableId: string }>;
}) {
  const [outletId, setOutletId] = useState("");
  const [tableId, setTableId] = useState("");
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCat, setSelectedCat] = useState("Semua");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [nameError, setNameError] = useState(false);
  const [notesOpen, setNotesOpen] = useState<Record<string, boolean>>({});

  const [paidOrder, setPaidOrder] = useState<InvoiceOrder | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<MenuItem | null>(null);
  const [detailQty, setDetailQty] = useState(1);
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState(10);
  const [taxLabel, setTaxLabel] = useState("Pajak");
  const [serviceEnabled, setServiceEnabled] = useState(false);
  const [serviceRate, setServiceRate] = useState(5);
  const [serviceLabel, setServiceLabel] = useState("Service");

  useEffect(() => {
    const params2 = new URLSearchParams(window.location.search);
    const ts = params2.get("transaction_status");
    if (ts === "settlement" || ts === "capture") {
      const saved = localStorage.getItem("lastOrder");
      if (saved) {
        setPaidOrder(JSON.parse(saved));
        localStorage.removeItem("lastOrder");
      }
      window.history.replaceState({}, "", window.location.pathname);
    }

    params.then((p) => {
      setOutletId(p.outletId);
      setTableId(p.tableId);
      fetch(`/api/outlets`).then(r => r.json()).then(data => {
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
      fetch(`/api/menu?outletId=${p.outletId}`)
        .then((r) => r.json())
        .then((data) => {
          setItems(data);
          const cats = ["Semua", ...new Set(data.map((i: MenuItem) => i.category.name))];
          setCategories(cats as string[]);
        });
    });
  }, [params]);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      const currentQty = existing?.qty || 0;
      if (item.stock !== null && currentQty >= item.stock) {
        setToast(`Stok ${item.name} hanya tersisa ${item.stock}`);
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
      return prev
        .map((i) => (i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i))
        .filter((i) => i.qty > 0);
    });
  };

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const tax = taxEnabled ? Math.round(subtotal * taxRate / 100) : 0;
  const serviceCharge = serviceEnabled ? Math.round(subtotal * serviceRate / 100) : 0;
  const total = subtotal + tax + serviceCharge;
  const totalItems = cart.reduce((sum, i) => sum + i.qty, 0);

  const filteredItems =
    selectedCat === "Semua" ? items : items.filter((i) => i.category.name === selectedCat);

  const handleCheckout = async () => {
    if (!customerName.trim()) {
      setNameError(true);
      return;
    }
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outletId,
        tableId: parseInt(tableId),
        type: "dine_in",
        customerName,
        items: cart.map((i) => ({
          menuItemId: i.id,
          quantity: i.qty,
          price: i.price,
          notes: i.notes || undefined,
        })),
      }),
    });

    const order = await res.json();

    const today = new Date();
    localStorage.setItem("lastOrder", JSON.stringify({
      customerName,
      orderRef: order.ref,
      orderNumber: order.orderNumber,
      total: order.total,
      subtotal: order.subtotal,
      tax,
      service: serviceCharge,
      taxLabel,
      serviceLabel,
      createdAt: today.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      outletName: order.outlet?.name || "Laris POS",
      outletAddress: order.outlet?.address || "",
      items: cart.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
    }));

    // create Midtrans payment
    const payRes = await fetch("/api/payment/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id, callbackUrl: window.location.href }),
    });
    const payData = await payRes.json();

    if (payData.redirectUrl) {
      window.location.href = payData.redirectUrl;
    }
  };

  if (paidOrder) {
    const tax = paidOrder.total - paidOrder.subtotal;
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center p-6">
        <div className="text-center pt-6 pb-4">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-xl text-green-600">✓</span>
          </div>
          <h2 className="text-lg font-bold text-zinc-800">Pembayaran Berhasil</h2>
        </div>

        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <div className="text-center">
            <h3 className="font-bold text-zinc-800 text-lg">{paidOrder.outletName}</h3>
            {paidOrder.outletAddress && <p className="text-[10px] text-zinc-400">{paidOrder.outletAddress}</p>}
          </div>

          <div className="text-center border-t border-zinc-100 pt-3 space-y-1">
            <p className="text-xs text-zinc-500 font-semibold">Pesanan #{paidOrder.orderNumber} · {paidOrder.orderRef}</p>
            <p className="text-[10px] text-zinc-400">{paidOrder.createdAt}</p>
            <p className="text-xs text-zinc-400 font-semibold">{paidOrder.customerName}</p>
          </div>

          <div className="border-t border-zinc-100 pt-4 space-y-2">
            {paidOrder.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-zinc-700"><span className="font-semibold">{item.qty}x</span> {item.name}</span>
                <span className="text-zinc-800">Rp {(item.price * item.qty).toLocaleString("id-ID")}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-zinc-100 pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-zinc-600"><span>Subtotal</span><span>Rp {paidOrder.subtotal.toLocaleString("id-ID")}</span></div>
            <div className="flex justify-between text-zinc-600"><span>{paidOrder.taxLabel || taxLabel}</span><span>Rp {paidOrder.tax?.toLocaleString("id-ID") || tax.toLocaleString("id-ID")}</span></div>
            {paidOrder.service > 0 && <div className="flex justify-between text-zinc-600"><span>{paidOrder.serviceLabel || serviceLabel}</span><span>Rp {paidOrder.service.toLocaleString("id-ID")}</span></div>}
            <div className="flex justify-between font-bold text-zinc-800 pt-1 border-t border-zinc-100"><span>Total Dibayar</span><span>Rp {paidOrder.total.toLocaleString("id-ID")}</span></div>
          </div>

          <p className="text-center text-xs text-zinc-400 pt-2">Terima kasih! Silakan tunggu pesanan Anda.</p>

          <button
            onClick={() => window.print()}
            className="w-full py-3 rounded-xl border border-zinc-300 text-zinc-700 text-sm font-semibold hover:bg-zinc-50 no-print"
          >
            Download Invoice
          </button>
          <button
            onClick={() => { setPaidOrder(null); setCart([]); localStorage.removeItem("lastOrder"); }}
            className="w-full py-3 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 no-print"
          >
            Pesan Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 px-4 py-3 sticky top-0 z-10">
        <h1 className="text-lg font-bold">Meja {tableId}</h1>
        <p className="text-sm text-zinc-500">Scan & Order</p>
      </div>

      {/* Categories */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={`px-4 py-1.5 rounded-full text-xs whitespace-nowrap ${
              selectedCat === cat
                ? "bg-violet-600 text-white"
                : "bg-white border border-zinc-300 text-zinc-600"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu Items */}
      <div className="grid grid-cols-2 gap-3 px-4">
        {filteredItems.map((item) => {
          const outOfStock = item.stock !== null && item.stock <= 0;
          return (
          <div key={item.id}
            className={`bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col ${outOfStock ? "opacity-40" : ""}`}>
            <div onClick={() => !outOfStock && setDetailItem(item)}
              className={`h-36 bg-zinc-100 flex items-center justify-center text-zinc-400 text-xs flex-shrink-0 ${outOfStock ? "" : "cursor-pointer hover:opacity-80"}`}>
              {item.image ? (
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              ) : "Foto"}
            </div>
            <div className="p-3 flex flex-col flex-1 justify-between">
              <h3 className="font-semibold text-sm text-zinc-800 truncate">{item.name}</h3>
              <div className="flex justify-between items-center mt-1">
                <span className="font-bold text-sm text-violet-600">Rp {item.price.toLocaleString("id-ID")}</span>
                {!outOfStock && (
                  <button onClick={() => addToCart(item)}
                    className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center text-base hover:bg-violet-700 active:scale-95 transition-all"
                  >+</button>
                )}
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Cart FAB */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 inset-x-0 p-4 z-20">
          <button
            onClick={() => setShowCart(true)}
            className="w-full py-4 rounded-2xl bg-violet-600 text-white font-semibold shadow-lg flex justify-between items-center px-5"
          >
            <span>{totalItems} item</span>
            <span>Rp {total.toLocaleString("id-ID")}</span>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 bg-black/50 z-30 flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl max-h-[80%] flex flex-col">
            <div className="flex justify-center py-3" onClick={() => setShowCart(false)}>
              <div className="w-10 h-1 bg-zinc-300 rounded-full" />
            </div>

            <div className="px-5 pb-3 border-b border-zinc-100">
              <h2 className="font-bold">Keranjang</h2>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-start border-b border-zinc-100 pb-3">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold">{item.name}</h3>
                    <p className="text-xs text-zinc-500">Rp {item.price.toLocaleString("id-ID")}</p>
                    <div className="mt-1">
                      {notesOpen[item.id] || item.notes ? (
                        <input
                          type="text"
                          placeholder="Catatan..."
                          value={item.notes}
                          onChange={(e) =>
                            setCart((prev) =>
                              prev.map((i) => (i.id === item.id ? { ...i, notes: e.target.value } : i))
                            )
                          }
                          className="w-full text-xs px-2 py-1 rounded border border-zinc-200 text-zinc-800 bg-white"
                        />
                      ) : (
                        <button onClick={() => setNotesOpen((prev) => ({ ...prev, [item.id]: true }))} className="text-xs text-zinc-400 hover:text-zinc-600">
                          + Catatan
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 rounded-full border border-zinc-300 flex items-center justify-center text-sm">-</button>
                    <span className="text-sm font-semibold w-4 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 rounded-full border border-zinc-300 flex items-center justify-center text-sm">+</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-zinc-100 space-y-3">
              <input
                type="text"
                placeholder="Nama kamu"
                required
                value={customerName}
                onChange={(e) => { setCustomerName(e.target.value); setNameError(false); }}
                className={`w-full px-3 py-2 rounded-xl border text-sm text-zinc-800 bg-white ${nameError ? "border-red-400" : "border-zinc-300"}`}
              />
              {nameError && <p className="text-xs text-red-500">Nama harus diisi</p>}
              {tax > 0 && <div className="flex justify-between text-xs text-zinc-600"><span>{taxLabel} {taxRate}%</span><span>Rp {tax.toLocaleString("id-ID")}</span></div>}
              {serviceCharge > 0 && <div className="flex justify-between text-xs text-zinc-600"><span>{serviceLabel} {serviceRate}%</span><span>Rp {serviceCharge.toLocaleString("id-ID")}</span></div>}
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>Rp {total.toLocaleString("id-ID")}</span>
              </div>
              <button onClick={handleCheckout} className="w-full py-3 rounded-xl bg-violet-600 text-white font-semibold text-sm">
                Bayar Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && <Toast message={toast} type="warning" onClose={() => setToast(null)} />}

      {detailItem && (
        <div className="fixed inset-0 bg-black/50 z-40 flex flex-col justify-end" onClick={() => { setDetailItem(null); setDetailQty(1); }}>
          <div className="bg-white rounded-t-3xl max-h-[85%] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="h-56 bg-zinc-100 flex items-center justify-center text-zinc-400 text-sm">
              {detailItem.image ? (
                <img src={detailItem.image} alt={detailItem.name} className="w-full h-full object-cover" />
              ) : "Foto"}
            </div>
            <div className="p-5 space-y-4">
              <div>
                <h2 className="font-bold text-lg text-zinc-800">{detailItem.name}</h2>
                {detailItem.description && <p className="text-sm text-zinc-500 mt-1">{detailItem.description}</p>}
              </div>
              <p className="font-bold text-xl text-violet-600">Rp {detailItem.price.toLocaleString("id-ID")}</p>

              <div className="flex items-center justify-center gap-6 py-2">
                <button onClick={() => setDetailQty(Math.max(1, detailQty - 1))}
                  className="w-10 h-10 rounded-full border border-zinc-300 flex items-center justify-center text-lg text-zinc-700">-</button>
                <span className="text-xl font-bold text-zinc-800 w-8 text-center">{detailQty}</span>
                <button onClick={() => {
                  if (detailItem.stock !== null && detailQty >= detailItem.stock) return setToast(`Stok ${detailItem.name} hanya tersisa ${detailItem.stock}`);
                  setDetailQty(detailQty + 1);
                }}
                  className="w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center text-lg">+</button>
              </div>

              <button onClick={() => {
                for (let i = 0; i < detailQty; i++) addToCart(detailItem);
                setDetailItem(null);
                setDetailQty(1);
              }} className="w-full py-3 rounded-xl bg-violet-600 text-white font-semibold text-base hover:bg-violet-700">
                Tambah {detailQty > 1 ? `${detailQty} item` : "1 item"} ke Cart
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
