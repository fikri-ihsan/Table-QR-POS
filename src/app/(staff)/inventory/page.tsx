"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import ErrorState from "@/components/error-state";
import { SkeletonTable } from "@/components/skeleton";

type InventoryItem = {
  id: string; name: string; stock: number | null;
  lowStockAt: number | null; available: boolean;
};

export default function InventoryPage() {
  const { staff, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(false);
  const [stockTarget, setStockTarget] = useState<InventoryItem | null>(null);
  const [stockValue, setStockValue] = useState("");

  useEffect(() => {
    if (!staff) return;
    if (staff.role !== "admin") { router.push("/pos"); return; }
    fetch("/api/inventory")
      .then((r) => r.json())
      .then(setItems)
      .catch(() => setError(true))
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

  if (authLoading || loading) return (
    <div className="p-6 max-w-4xl mx-auto">
      <SkeletonTable rows={4} />
    </div>
  );
  if (error) return (
    <div className="p-6 max-w-4xl mx-auto">
      <ErrorState message="Gagal memuat inventory" onRetry={() => window.location.reload()} />
    </div>
  );

  const lowStockItems = items.filter((i) => i.stock !== null && i.lowStockAt !== null && i.stock <= i.lowStockAt);

  return (
    <>
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-zinc-800">Inventory Stock</h1>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari item..." className="w-48 px-3 py-1.5 rounded-xl border border-zinc-300 text-sm bg-white text-zinc-800 placeholder-zinc-400 ml-auto" />
      </div>

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
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-zinc-800">Item</th>
              <th className="text-center px-4 py-3 font-semibold text-zinc-800">Stock</th>
              <th className="text-center px-4 py-3 font-semibold text-zinc-800">Min Alert</th>
              <th className="text-right px-4 py-3 font-semibold text-zinc-800">Aksi</th>
            </tr>
          </thead>
          {items.length === 0 ? (
            <tbody><tr><td colSpan={4} className="text-center text-zinc-400 py-10 text-sm">Belum ada item inventory.</td></tr></tbody>
          ) : (
          <tbody className="divide-y divide-zinc-100">
            {items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())).map((item) => (
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
                      onClick={() => { setStockTarget(item); setStockValue(String(item.stock ?? "")); }}
                      className="px-3 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700"
                    >
                      Update
                    </button>
                  ) : <span className="text-xs text-zinc-400">-</span>}
                </td>
              </tr>
            ))}
          </tbody>
          )}
        </table>
        </div>
      </div>
    </div>

      {stockTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setStockTarget(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-xs w-full space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold text-zinc-800">Update Stock</h2>
            <p className="text-sm text-zinc-800 font-medium">{stockTarget.name}</p>
            <p className="text-xs text-zinc-400">Stock sekarang: {stockTarget.stock ?? "∞"}</p>
            <input type="number" value={stockValue} onChange={(e) => setStockValue(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800 bg-white" autoFocus />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setStockTarget(null)} className="px-4 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-700">Batal</button>
              <button onClick={() => { if (!stockValue) return; updateStock(stockTarget.id, parseInt(stockValue)); setStockTarget(null); }}
                className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
