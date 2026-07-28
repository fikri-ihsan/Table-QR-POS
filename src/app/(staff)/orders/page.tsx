"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

type Order = {
  id: string; orderNumber: number; status: string; type: string;
  customerName: string | null; total: number; paymentStatus: string;
  createdAt: string; table: { number: number } | null;
  items: { id: string; menuItem: { name: string }; quantity: number; price: number }[];
};

const statusLabels: Record<string, string> = {
  received: "Diterima", preparing: "Dimasak", ready: "Siap", delivered: "Diantar", cancelled: "Batal",
};

export default function OrdersPage() {
  const { staff, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    if (staff?.role === "kitchen") { router.push("/kitchen"); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/orders");
      if (r.ok) {
        setOrders(await r.json());
      }
    } catch (e) {
      console.error("Gagal load orders:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!staff) return;
    loadOrders();
  }, [staff]);

  const updateStatus = async (id: string, status: string) => {
    if (staff?.role === "kitchen") { router.push("/kitchen"); return; }
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadOrders();
  };

  if (authLoading || loading) return <div className="p-8 text-center text-zinc-500">Loading...</div>;

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-800 mb-6">Pesanan</h1>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[{ key: "all", label: "Semua" }, ...Object.entries(statusLabels).map(([key, label]) => ({ key, label }))].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`px-4 py-1.5 rounded-full text-xs whitespace-nowrap ${filter === f.key ? "bg-violet-600 text-white" : "bg-white border border-zinc-300 text-zinc-700"}`}>{f.label}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((order) => (
          <div key={order.id} className="bg-white rounded-2xl p-5 border border-zinc-200">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="font-bold text-zinc-800">#{order.orderNumber}</span>
                <span className="ml-3 text-xs text-zinc-500">{order.table ? `Meja ${order.table.number}` : "Takeaway"}</span>
                <span className="ml-2 text-xs text-zinc-500">{order.customerName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusLabels[order.status] ? "bg-violet-100 text-violet-700" : ""}`}>
                  {statusLabels[order.status] || order.status}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${order.paymentStatus === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {order.paymentStatus === "paid" ? "Lunas" : "Pending"}
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
              <div className="flex gap-1">
                {order.status === "received" && <button onClick={() => updateStatus(order.id, "preparing")} className="px-3 py-1 rounded-lg bg-amber-500 text-white text-xs">Masak</button>}
                {order.status === "preparing" && <button onClick={() => updateStatus(order.id, "ready")} className="px-3 py-1 rounded-lg bg-green-500 text-white text-xs">Siap</button>}
                {order.status === "ready" && <button onClick={() => updateStatus(order.id, "delivered")} className="px-3 py-1 rounded-lg bg-blue-500 text-white text-xs">Antar</button>}
                <button onClick={() => updateStatus(order.id, "cancelled")} className="px-3 py-1 rounded-lg border border-red-300 text-red-600 text-xs">Batal</button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-zinc-500 py-10">Tidak ada pesanan</p>}
      </div>
    </div>
  );
}