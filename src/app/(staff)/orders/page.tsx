"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import ErrorState from "@/components/error-state";
import { SkeletonCard } from "@/components/skeleton";

type Order = {
  id: string; ref: string; orderNumber: number; status: string; type: string;
  customerName: string | null; total: number; paymentStatus: string;
  createdAt: string; table: { number: number } | null;
  items: { id: string; menuItem: { name: string }; quantity: number; price: number }[];
};

const statusLabels: Record<string, string> = {
  received: "Diterima", preparing: "Dimasak", ready: "Siap", delivered: "Diantar", cancelled: "Batal",
};

const filterTabs = [
  { key: "all", label: "Semua" },
  { key: "active", label: "Aktif" },
  { key: "delivered", label: "Selesai" },
  { key: "cancelled", label: "Batal" },
];

const activeStatuses = ["received", "preparing", "ready"];

export default function OrdersPage() {
  const { staff, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [refundTarget, setRefundTarget] = useState<Order | null>(null);
  const [refundMode, setRefundMode] = useState<"full" | "partial">("full");
  const [refundSelection, setRefundSelection] = useState<Record<string, number>>({});
  const [refunding, setRefunding] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<any>(null);
  const [error, setError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadOrders = async () => {
    if (staff?.role === "kitchen") { router.push("/kitchen"); return; }
    setLoading(true);
    setError(false);
    try {
      const r = await fetch("/api/orders?take=20");
      if (!r.ok) throw new Error();
      const { orders: data, hasMore: more } = await r.json();
      setOrders(data);
      setHasMore(more);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || orders.length === 0) return;
    setLoadingMore(true);
    try {
      const cursor = orders[orders.length - 1].id;
      const r = await fetch(`/api/orders?take=20&cursor=${cursor}`);
      if (r.ok) {
        const { orders: data, hasMore: more } = await r.json();
        setOrders((prev) => [...prev, ...data]);
        setHasMore(more);
      }
    } catch (e) {
      console.error("Gagal load more:", e);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, orders]);

  useEffect(() => {
    if (!staff) return;
    loadOrders();

    let evt: EventSource;
    const connect = () => {
      evt = new EventSource(`/api/orders/sse?outletId=${staff.outletId}`);
      evt.onmessage = (e) => {
        if (e.data === '{"type":"connected"}') return;
        try {
          const updated = JSON.parse(e.data);
          setOrders((prev) => {
            const existing = prev.findIndex((o) => o.id === updated.id);
            if (existing >= 0) {
              const next = [...prev];
              next[existing] = updated;
              return next;
            }
            return [updated, ...prev];
          });
        } catch {}
      };
      evt.onerror = () => {
        evt.close();
        setTimeout(connect, 3000);
      };
    };
    connect();
    return () => evt?.close();
  }, [staff]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [loadMore]);

  const openRefund = (order: Order) => {
    setRefundTarget(order);
    setRefundMode("full");
    setRefundSelection({});
  };

  const handlePrint = async (order: Order) => {
    const r = await fetch(`/api/orders/${order.id}`);
    if (!r.ok) return;
    const data = await r.json();
    setReceiptOrder({
      orderRef: data.ref,
      orderNumber: data.orderNumber,
      total: data.total,
      subtotal: data.subtotal,
      tax: data.tax,
      service: data.service,
      discount: data.discount || 0,
      taxLabel: "Pajak",
      serviceLabel: "Service",
      customerName: data.customerName,
      cashierName: data.staff?.name || data.outlet?.name || "Laris POS",
      outletName: data.outlet?.name || "Laris POS",
      outletAddress: data.outlet?.address || "",
      createdAt: new Date(data.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      items: data.items.map((i: any) => ({ name: i.menuItem?.name || "?", qty: i.quantity, price: i.price })),
    });
  };

  const handleRefund = async () => {
    if (!refundTarget) return;
    setRefunding(true);
    try {
      const body = refundMode === "partial"
        ? { items: Object.entries(refundSelection).filter(([, qty]) => qty > 0).map(([id, qty]) => ({ id, qty })) }
        : {};
      await fetch(`/api/orders/${refundTarget.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      loadOrders();
    } catch (e) {
      console.error("Refund gagal:", e);
    } finally {
      setRefunding(false);
      setRefundTarget(null);
    }
  };

  if (authLoading || loading) return (
    <div className="p-6 max-w-6xl mx-auto space-y-3">
      {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
  if (error) return (
    <div className="p-6 max-w-6xl mx-auto">
      <ErrorState message="Gagal memuat pesanan" onRetry={loadOrders} />
    </div>
  );

  const filtered = (filter === "all" ? orders : filter === "active" ? orders.filter((o) => activeStatuses.includes(o.status)) : orders.filter((o) => o.status === filter))
    .filter((o) =>
      o.orderNumber.toString().includes(search) ||
      (o.ref || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.customerName || "").toLowerCase().includes(search.toLowerCase())
    );

  return (
    <>
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-zinc-800">Pesanan</h1>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari pesanan..." className="w-48 px-3 py-1.5 rounded-xl border border-zinc-300 text-sm bg-white text-zinc-800 placeholder-zinc-400 ml-auto" />
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {filterTabs.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`px-4 py-2.5 rounded-full text-xs whitespace-nowrap ${filter === f.key ? "bg-violet-600 text-white" : "bg-white border border-zinc-300 text-zinc-700"}`}>{f.label}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-2xl p-5 border border-zinc-200 cursor-pointer"
            onClick={() => router.push(`/orders/${order.id}`)}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="font-bold text-zinc-800">#{order.orderNumber}</span>
                {order.ref && <span className="ml-2 text-[10px] text-zinc-400 font-mono">· {order.ref}</span>}
                <span className="ml-3 text-xs text-zinc-500">{order.table ? `Meja ${order.table.number}` : "Takeaway"}</span>
                <span className="ml-2 text-xs text-zinc-500">{order.customerName}</span>
                <span className="ml-2 text-xs text-zinc-400">{new Date(order.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusLabels[order.status] ? "bg-violet-100 text-violet-700" : ""}`}>
                  {statusLabels[order.status] || order.status}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${order.paymentStatus === "paid" ? "bg-green-100 text-green-700" : order.paymentStatus === "failed" ? "bg-red-100 text-red-700" : order.paymentStatus === "refunded" ? "bg-zinc-100 text-zinc-500" : "bg-yellow-100 text-yellow-700"}`}>
                  {order.paymentStatus === "paid" ? "Lunas" : order.paymentStatus === "failed" ? "Gagal" : order.paymentStatus === "refunded" ? "Refund" : "Pending"}
                </span>
              </div>
            </div>

            <div className="space-y-1 mb-3">
              {order.items.map((item) => (
                <div key={item.id} className="text-xs text-zinc-700 flex justify-between">
                  <span><span className="font-semibold">{item.quantity}x</span> {item.menuItem.name}</span>
                  <span>Rp {(item.price * item.quantity).toLocaleString("id-ID")}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-zinc-100">
              <span className="font-bold text-sm text-zinc-800">Rp {order.total.toLocaleString("id-ID")}</span>
              <div className="flex gap-2">
                {order.paymentStatus === "paid" && (
                  <button onClick={(e) => { e.stopPropagation(); router.push(`/orders/${order.id}`); }} className="px-3 py-2 rounded-lg border border-zinc-300 text-zinc-700 text-xs font-semibold hover:bg-zinc-50">Detail</button>
                )}
                {order.paymentStatus === "paid" && staff?.role === "admin" && (
                  <button onClick={(e) => { e.stopPropagation(); openRefund(order); }} className="px-3 py-2 rounded-lg border border-red-300 text-red-600 text-xs font-semibold hover:bg-red-50">Refund</button>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-zinc-100 flex items-center justify-center">
              <span className="text-lg text-zinc-400">📋</span>
            </div>
            <p className="text-sm text-zinc-400">Tidak ada pesanan</p>
          </div>
        )}
        {loadingMore && (
          <div className="flex justify-center py-6">
            <div className="animate-spin w-6 h-6 border-2 border-zinc-300 border-t-violet-600 rounded-full" />
          </div>
        )}
        <div ref={sentinelRef} />
      </div>
    </div>

      {refundTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !refunding && setRefundTarget(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold text-zinc-800">Refund #{refundTarget.orderNumber}</h2>

            <div className="flex gap-2">
              <button onClick={() => setRefundMode("full")} className={`flex-1 py-2 rounded-xl text-sm ${refundMode === "full" ? "bg-red-600 text-white" : "border border-zinc-300 text-zinc-700"}`}>Full Refund</button>
              <button onClick={() => setRefundMode("partial")} className={`flex-1 py-2 rounded-xl text-sm ${refundMode === "partial" ? "bg-red-600 text-white" : "border border-zinc-300 text-zinc-700"}`}>Partial</button>
            </div>

            {refundMode === "full" ? (
              <p className="text-sm text-zinc-600">Semua item akan direfund. Stok dikembalikan. Pesanan dibatalkan.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {refundTarget.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-700">{item.quantity}x {item.menuItem.name}</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setRefundSelection((prev) => ({ ...prev, [item.id]: Math.max(0, (prev[item.id] || 0) - 1) }))} className="w-9 h-9 rounded-full border border-zinc-300">-</button>
                      <span className="w-5 text-center font-medium">{refundSelection[item.id] || 0}</span>
                      <button onClick={() => setRefundSelection((prev) => ({ ...prev, [item.id]: Math.min(item.quantity, (prev[item.id] || 0) + 1) }))} className="w-9 h-9 rounded-full border border-zinc-300">+</button>
                    </div>
                  </div>
                ))}
                {Object.values(refundSelection).every((v) => !v) && (
                  <p className="text-xs text-zinc-400 text-center pt-2">Pilih item untuk direfund</p>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button onClick={() => setRefundTarget(null)} disabled={refunding} className="px-4 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-700">Batal</button>
              <button
                onClick={handleRefund}
                disabled={refunding || (refundMode === "partial" && Object.values(refundSelection).every((v) => !v))}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-40"
              >
                {refunding ? "Memproses..." : "Refund"}
              </button>
            </div>
          </div>
        </div>
      )}

      {receiptOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-10 p-4 overflow-y-auto receipt-print" onClick={() => setReceiptOrder(null)}>
          <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
              <div className="text-center">
                <h3 className="font-bold text-zinc-800 text-lg">{receiptOrder.outletName}</h3>
                {receiptOrder.outletAddress && <p className="text-[10px] text-zinc-400">{receiptOrder.outletAddress}</p>}
              </div>

              <div className="text-center border-t border-zinc-100 pt-3 space-y-1">
                <p className="text-xs text-zinc-500 font-semibold">#{receiptOrder.orderNumber} · {receiptOrder.orderRef} · {receiptOrder.cashierName}</p>
                <p className="text-[10px] text-zinc-400">{receiptOrder.createdAt}</p>
                {receiptOrder.customerName && <p className="text-sm text-zinc-400 font-semibold">{receiptOrder.customerName}</p>}
              </div>

              <div className="border-t border-zinc-100 pt-4 space-y-2">
                {receiptOrder.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-zinc-700"><span className="font-semibold">{item.qty}x</span> {item.name}</span>
                    <span className="text-zinc-800">Rp {(item.price * item.qty).toLocaleString("id-ID")}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-zinc-100 pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-zinc-600"><span>Subtotal</span><span>Rp {receiptOrder.subtotal.toLocaleString("id-ID")}</span></div>
                {receiptOrder.tax > 0 && <div className="flex justify-between text-zinc-600"><span>Pajak</span><span>Rp {receiptOrder.tax.toLocaleString("id-ID")}</span></div>}
                {receiptOrder.service > 0 && <div className="flex justify-between text-zinc-600"><span>Service</span><span>Rp {receiptOrder.service.toLocaleString("id-ID")}</span></div>}
                {receiptOrder.discount > 0 && <div className="flex justify-between text-red-600"><span>Diskon</span><span>-Rp {receiptOrder.discount.toLocaleString("id-ID")}</span></div>}
                <div className="flex justify-between font-bold text-zinc-800 pt-1 border-t border-zinc-100"><span>Total Dibayar</span><span>Rp {receiptOrder.total.toLocaleString("id-ID")}</span></div>
              </div>

              <p className="text-center text-[10px] text-zinc-400 pt-2">Terima kasih! Selamat menikmati.</p>
              <button onClick={() => window.print()} className="w-full py-3 rounded-xl border border-zinc-300 text-zinc-700 text-sm font-semibold hover:bg-zinc-50 no-print">
                Print Invoice
              </button>
              <button onClick={() => setReceiptOrder(null)} className="w-full py-3 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 no-print">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}