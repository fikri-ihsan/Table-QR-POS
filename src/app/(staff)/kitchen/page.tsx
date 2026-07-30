"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";

type Staff = { id: string; outletId: string; name: string; role: string };
type OrderItem = { id: string; menuItem: { name: string }; quantity: number; notes: string | null };
type Order = {
  id: string; orderNumber: number; status: string; type: string;
  customerName: string | null; items: OrderItem[]; paymentStatus: string;
  createdAt: string; table: { number: number } | null;
};

const statusLabels: Record<string, string> = {
  received: "Diterima", preparing: "Dimasak", ready: "Siap", delivered: "Diantar",
};

const statusFlow = ["received", "preparing", "ready", "delivered"];

export default function KitchenPage() {
  const { staff, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isDark, setIsDark] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!staff) return;
    fetch(`/api/orders`)
      .then((r) => r.json())
      .then((data) => setOrders((data.orders || data).filter((o: Order) => o.paymentStatus === "paid").sort((a: Order, b: Order) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())));

    // SSE
    const evt = new EventSource(`/api/orders/sse?outletId=${staff.outletId}`);
    evt.onmessage = (e) => {
      if (e.data === '{"type":"connected"}') return;
      try {
        const updated = JSON.parse(e.data);
        if (updated.paymentStatus !== "paid") {
          setOrders((prev) => prev.filter((o) => o.id !== updated.id));
          return;
        }
        setOrders((prev) => {
          const existing = prev.findIndex((o) => o.id === updated.id);
          if (existing >= 0) {
            const next = [...prev];
            next[existing] = updated;
            return next;
          }
          if (audioRef.current) audioRef.current.play().catch(() => {});
          return [...prev, updated];
        });
      } catch {}
    };
    return () => evt.close();
  }, [staff]);

  const advanceStatus = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const idx = statusFlow.indexOf(order.status);
    if (idx >= statusFlow.length - 1) return;
    const nextStatus = statusFlow[idx + 1];
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
  };

  const getUrgency = (order: Order) => {
    const elapsed = Date.now() - new Date(order.createdAt).getTime();
    const min = Math.floor(elapsed / 60000);
    if (order.status === "ready" || order.status === "delivered") {
      return { border: isDark ? "border-zinc-700" : "border-zinc-200", min };
    }
    if (min > 20) {
      return { border: "border-red-500 ring-2 ring-red-500/20", min };
    }
    if (min > 10) {
      return { border: "border-amber-500 ring-2 ring-amber-500/20", min };
    }
    return { border: isDark ? "border-blue-500" : "border-blue-400", min };
  };

  if (authLoading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-zinc-700 border-t-emerald-400 rounded-full" />
    </div>
  );
  if (!staff) return null;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? "bg-zinc-950 text-white" : "bg-zinc-50 text-zinc-800"}`}>
      <audio ref={audioRef} src="/notification.wav" />

      {/* Header */}
      <div className={`px-6 py-4 flex justify-between items-center border-b ${isDark ? "border-zinc-800" : "border-zinc-200"}`}>
        <div>
          <h1 className="text-xl font-bold">Kitchen Display</h1>
          <p className={`text-xs ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>{staff.name}</p>
        </div>
        <button
          onClick={() => setIsDark(!isDark)}
          className={`px-3 py-1.5 rounded-lg text-xs border ${isDark ? "border-zinc-700 text-zinc-400" : "border-zinc-300 text-zinc-600"}`}
        >
          {isDark ? "☀️" : "🌙"}
        </button>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-4 gap-4 p-4">
        {statusFlow.map((status) => (
          <div key={status}>
            <div className={`flex justify-between items-center px-4 py-2 rounded-xl mb-3 ${isDark ? "bg-zinc-900" : "bg-white shadow-sm border border-zinc-200"}`}>
              <span className="font-bold text-sm">{statusLabels[status]}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${isDark ? "bg-zinc-800 text-zinc-400" : "bg-zinc-100 text-zinc-500"}`}>
                {orders.filter((o) => o.status === status).length}
              </span>
            </div>

            <div className="space-y-3">
              {orders.filter((o) => o.status === status).map((order) => {
                const { border, min } = getUrgency(order);
                return (
                  <div
                    key={order.id}
                    onClick={() => advanceStatus(order.id)}
                    className={`p-4 rounded-2xl border cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all ${isDark ? "bg-zinc-900" : "bg-white shadow-sm"} ${border}`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-sm">#{order.orderNumber}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded ${isDark ? "bg-zinc-800 text-zinc-400" : "bg-zinc-100 text-zinc-500"}`}>
                        {order.table ? `Meja ${order.table.number}` : "Takeaway"}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {order.items.map((item) => (
                        <div key={item.id} className="text-xs flex justify-between">
                          <span><span className={`font-bold ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>{item.quantity}x</span> {item.menuItem.name}</span>
                          {item.notes && <span className={`text-[10px] italic ${isDark ? "text-orange-400" : "text-orange-500"}`}>({item.notes})</span>}
                        </div>
                      ))}
                    </div>
                    <div className={`flex justify-between items-center mt-2 pt-2 border-t ${isDark ? "border-zinc-800" : "border-zinc-100"}`}>
                      <span className={`text-[10px] ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>{order.customerName || "—"}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        min > 20 ? "bg-red-500/10 text-red-500" : min > 10 ? "bg-amber-500/10 text-amber-500" : isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"
                      }`}>{min}m</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}