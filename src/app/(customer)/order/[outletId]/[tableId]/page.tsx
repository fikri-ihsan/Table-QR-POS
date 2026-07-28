"use client";

import { useState, useEffect } from "react";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  category: { name: string };
};

type CartItem = MenuItem & { qty: number; notes: string };

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
  const [paymentUrl, setPaymentUrl] = useState("");

  useEffect(() => {
    params.then((p) => {
      setOutletId(p.outletId);
      setTableId(p.tableId);
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
      if (existing) return prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { ...item, qty: 1, notes: "" }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i))
        .filter((i) => i.qty > 0)
    );
  };

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  const total = subtotal + Math.round(subtotal * 0.1);
  const totalItems = cart.reduce((sum, i) => sum + i.qty, 0);

  const filteredItems =
    selectedCat === "Semua" ? items : items.filter((i) => i.category.name === selectedCat);

  const handleCheckout = async () => {
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

    // create Midtrans payment
    const payRes = await fetch("/api/payment/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id }),
    });
    const payData = await payRes.json();

    if (payData.snapToken) {
      setPaymentUrl(payData.redirectUrl || "#");
      setShowCart(false);
    }
  };

  if (paymentUrl) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-6">
        <div className="bg-white rounded-2xl p-8 max-w-sm text-center shadow-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <span className="text-2xl">✓</span>
          </div>
          <h2 className="text-xl font-bold mb-2">Pesanan Dibuat!</h2>
          <p className="text-zinc-600 text-sm mb-6">
            Silakan lanjutkan pembayaran untuk memproses pesanan.
          </p>
          <a
            href={paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700"
          >
            Bayar Sekarang
          </a>
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
        {filteredItems.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="h-36 bg-zinc-100 flex items-center justify-center text-zinc-400 text-xs">
              {item.image ? (
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              ) : "Foto"}
            </div>
            <div className="p-3">
              <h3 className="font-semibold text-sm">{item.name}</h3>
              {item.description && <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{item.description}</p>}
              <div className="flex justify-between items-center mt-2">
                <span className="font-bold text-sm text-violet-600">
                  Rp {item.price.toLocaleString("id-ID")}
                </span>
                <button
                  onClick={() => addToCart(item)}
                  className="w-7 h-7 rounded-full bg-violet-600 text-white flex items-center justify-center text-sm"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ))}
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
                    <input
                      type="text"
                      placeholder="Catatan..."
                      value={item.notes}
                      onChange={(e) =>
                        setCart((prev) =>
                          prev.map((i) => (i.id === item.id ? { ...i, notes: e.target.value } : i))
                        )
                      }
                      className="mt-1 w-full text-xs px-2 py-1 rounded border border-zinc-200 text-zinc-800 bg-white"
                    />
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
                placeholder="Nama kamu (opsional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800 bg-white"
              />
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
    </div>
  );
}
