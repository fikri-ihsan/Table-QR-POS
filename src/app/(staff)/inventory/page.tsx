"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

type InventoryItem = {
  id: string; name: string; stock: number | null;
  lowStockAt: number | null; available: boolean;
};

export default function InventoryPage() {
  const { staff, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!staff) return;
    if (staff.role !== "admin") { router.push("/pos"); return; }
    fetch("/api/inventory")
      .then((r) => r.json())
      .then(setItems)
      .finally(() => setLoading(false));
  }, [staff]);

  const updateStock = async (id: string, stock: number) => {
    await fetch("/api/inventory", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, stock }),
    });
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, stock } : i)));
  };

  if (authLoading || loading) return <div className="p-8 text-center text-zinc-500">Loading...</div>;

    const lowStockItems = items.filter((i) => i.stock !== null && i.lowStockAt !== null && i.stock <= i.lowStockAt);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-800 mb-6">Inventory Stock</h1>

      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
          <h2 className="font-semibold text-red-700 text-sm mb-2">⚠️ Stock Menipis</h2>
          <div className="space-y-1">
            {lowStockItems.map((item) => (
              <div key={item.id} className="text-xs text-red-600 flex justify-between">
                <span>{item.name}</span>
                <span className="font-semibold">{item.stock} tersisa</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-zinc-800">Item</th>
              <th className="text-center px-4 py-3 font-semibold text-zinc-800">Stock</th>
              <th className="text-center px-4 py-3 font-semibold text-zinc-800">Min Alert</th>
              <th className="text-right px-4 py-3 font-semibold text-zinc-800">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3 font-medium text-zinc-800">{item.name}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`font-semibold ${item.stock !== null && item.lowStockAt !== null && item.stock <= item.lowStockAt ? "text-red-600" : "text-zinc-800"}`}>
                    {item.stock ?? "∞"}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-zinc-600">{item.lowStockAt ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  {staff?.role === "admin" ? (
                    <button
                      onClick={() => {
                        const val = prompt("Stock baru:", String(item.stock ?? ""));
                        if (val) updateStock(item.id, parseInt(val));
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      Update
                    </button>
                  ) : <span className="text-xs text-zinc-400">-</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}