"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Category = { id: string; name: string; sortOrder: number };
type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  available: boolean;
  stock: number | null;
  lowStockAt: number | null;
  category: Category;
};

export default function MenuPage() {
  const router = useRouter();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<{ role: string } | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    categoryId: "",
    stock: "",
    lowStockAt: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(async (res) => {
      if (!res.ok) return router.push("/login");
      const s = await res.json();
      setStaff(s);
    });
  }, [router]);

  useEffect(() => {
    if (!staff) return;
    Promise.all([
      fetch("/api/categories").then((r) => r.json()),
      fetch("/api/menu").then((r) => r.json()),
    ]).then(([cats, items]) => {
      setCategories(cats);
      setItems(items);
      setLoading(false);
    });
  }, [staff]);

  const handleSave = async () => {
    const payload = {
      name: form.name,
      description: form.description || null,
      price: parseInt(form.price),
      categoryId: form.categoryId,
      stock: form.stock ? parseInt(form.stock) : null,
      lowStockAt: form.lowStockAt ? parseInt(form.lowStockAt) : null,
    };

    const url = editingId ? `/api/menu/${editingId}` : "/api/menu";
    const method = editingId ? "PUT" : "POST";

    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setShowForm(false);
    setEditingId(null);
    setForm({ name: "", description: "", price: "", categoryId: "", stock: "", lowStockAt: "" });

    // refresh
    const items = await fetch("/api/menu").then((r) => r.json());
    setItems(items);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus item ini?")) return;
    await fetch(`/api/menu/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleEdit = (item: MenuItem) => {
    setForm({
      name: item.name,
      description: item.description || "",
      price: item.price.toString(),
      categoryId: item.category.id,
      stock: item.stock?.toString() || "",
      lowStockAt: item.lowStockAt?.toString() || "",
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const toggleAvailable = async (item: MenuItem) => {
    await fetch(`/api/menu/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !item.available }),
    });
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, available: !i.available } : i)));
  };

  if (loading || !staff) return <div className="p-8 text-center text-zinc-800">Loading...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-zinc-800">Menu Items</h1>
        <button
          onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ name: "", description: "", price: "", categoryId: "", stock: "", lowStockAt: "" }); }}
          className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700"
        >
          + Tambah Item
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-zinc-800">{editingId ? "Edit Item" : "Item Baru"}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-800 mb-1">Nama</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-800 mb-1">Harga (Rp)</label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-800 mb-1">Deskripsi</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-800 mb-1">Kategori</label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm">
                <option value="">Pilih kategori</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-800 mb-1">Stock</label>
                <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm" placeholder="Kosongkan = unlimited" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-800 mb-1">Min. Stock Alert</label>
                <input type="number" value={form.lowStockAt} onChange={(e) => setForm({ ...form, lowStockAt: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm" />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700">
              {editingId ? "Simpan" : "Tambah"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800">Batal</button>
          </div>
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-zinc-800">Nama</th>
              <th className="text-left px-4 py-3 font-semibold text-zinc-800">Kategori</th>
              <th className="text-right px-4 py-3 font-semibold text-zinc-800">Harga</th>
              <th className="text-center px-4 py-3 font-semibold text-zinc-800">Stock</th>
              <th className="text-center px-4 py-3 font-semibold text-zinc-800">Tersedia</th>
              <th className="text-right px-4 py-3 font-semibold text-zinc-800">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3 font-medium text-zinc-800">{item.name}</td>
                <td className="px-4 py-3 text-zinc-800">{item.category.name}</td>
                <td className="px-4 py-3 text-right font-mono text-zinc-800">Rp {item.price.toLocaleString("id-ID")}</td>
                <td className="px-4 py-3 text-center">
                  {item.stock !== null ? (
                    <span className={item.stock <= (item.lowStockAt || 0) ? "text-red-600 font-semibold" : "text-zinc-800"}>{item.stock}</span>
                  ) : <span className="text-zinc-800">∞</span>}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggleAvailable(item)}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                  >
                    {item.available ? "Aktif" : "Nonaktif"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold mr-2">Edit</button>
                  <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800 text-xs font-semibold">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
