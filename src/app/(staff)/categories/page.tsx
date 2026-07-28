"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

type Category = { id: string; name: string; sortOrder: number };

export default function CategoriesPage() {
  const { staff, loading: authLoading } = useAuth();
  const router = useRouter();
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const load = () =>
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCats)
      .then(() => setLoading(false));

  useEffect(() => {
    if (!staff) return;
    if (staff.role !== "admin") { router.push("/pos"); return; }
    load();
  }, [staff]);

  const add = async () => {
    if (!newName.trim()) return;
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    setNewName("");
    load();
  };

  const rename = async (id: string) => {
    if (!editingName.trim()) return;
    await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingName }),
    });
    setEditingId(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Hapus kategori ini?")) return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error);
      return;
    }
    load();
  };

  const moveSort = async (id: string, dir: number) => {
    const idx = cats.findIndex((c) => c.id === id);
    const target = idx + dir;
    if (target < 0 || target >= cats.length) return;
    const current = cats[idx];
    const neighbor = cats[target];
    await Promise.all([
      fetch(`/api/categories/${current.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: neighbor.sortOrder }),
      }),
      fetch(`/api/categories/${neighbor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: current.sortOrder }),
      }),
    ]);
    load();
  };

  if (authLoading || loading) return <div className="p-8 text-center text-zinc-500">Loading...</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-800 mb-6">Kategori</h1>

      <div className="flex gap-2 mb-6">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Nama kategori baru"
          className="flex-1 px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800 bg-white"
        />
        <button onClick={add} className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700">
          + Tambah
        </button>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-zinc-800">Urutan</th>
              <th className="text-left px-4 py-3 font-semibold text-zinc-800">Nama</th>
              <th className="text-right px-4 py-3 font-semibold text-zinc-800">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {cats.map((cat, i) => (
              <tr key={cat.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveSort(cat.id, -1)} disabled={i === 0} className="p-1 hover:bg-zinc-100 rounded disabled:opacity-30 text-zinc-600">&uarr;</button>
                    <button onClick={() => moveSort(cat.id, 1)} disabled={i === cats.length - 1} className="p-1 hover:bg-zinc-100 rounded disabled:opacity-30 text-zinc-600">&darr;</button>
                    <span className="ml-2 text-xs text-zinc-400">{cat.sortOrder}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {editingId === cat.id ? (
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && rename(cat.id)}
                      onBlur={() => rename(cat.id)}
                      className="w-full px-2 py-1 rounded-lg border border-zinc-300 text-sm text-zinc-800 bg-white"
                      autoFocus
                    />
                  ) : (
                    <span className="text-zinc-800">{cat.name}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => { setEditingId(cat.id); setEditingName(cat.name); }}
                    className="text-blue-600 hover:text-blue-800 text-xs font-semibold mr-3"
                  >
                    Rename
                  </button>
                  <button onClick={() => remove(cat.id)} className="text-red-600 hover:text-red-800 text-xs font-semibold">
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
