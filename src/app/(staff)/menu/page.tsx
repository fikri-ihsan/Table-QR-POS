"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import ConfirmDialog from "@/components/confirm-dialog";

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
  const { staff, loading: authLoading, refresh } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

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
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MenuItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");

  // Category modal state
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");

  const reloadCategories = () => fetch("/api/categories").then((r) => r.json()).then(setCategories);

  const addCat = async () => {
    if (!newCatName.trim()) return;
    await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCatName }) });
    setNewCatName("");
    reloadCategories();
  };

  const renameCat = async (id: string) => {
    if (!editingCatName.trim()) return;
    await fetch(`/api/categories/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editingCatName }) });
    setEditingCatId(null);
    reloadCategories();
  };

  const removeCat = async (id: string) => {
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (!res.ok) { const err = await res.json(); alert(err.error); return; }
    reloadCategories();
  };

  const moveCatSort = async (id: string, dir: number) => {
    const idx = categories.findIndex((c) => c.id === id);
    const target = idx + dir;
    if (target < 0 || target >= categories.length) return;
    const current = categories[idx];
    const neighbor = categories[target];
    await Promise.all([
      fetch(`/api/categories/${current.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: neighbor.sortOrder }) }),
      fetch(`/api/categories/${neighbor.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sortOrder: current.sortOrder }) }),
    ]);
    reloadCategories();
  };

  useEffect(() => {
    if (!staff) return;
    if (staff.role !== "admin") { router.push("/pos"); return; }
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
    if (staff?.role !== "admin") return;
    if (!form.name.trim() || !form.price) return;
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

    const payloadWithImage = imageUrl ? { ...payload, image: imageUrl } : payload;
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payloadWithImage) });
    setShowForm(false);
    setEditingId(null);
    setImageUrl(null);
    setForm({ name: "", description: "", price: "", categoryId: "", stock: "", lowStockAt: "" });

    // refresh
    const items = await fetch("/api/menu").then((r) => r.json());
    setItems(items);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/menu/${deleteTarget.id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleting(false);
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
    setImageUrl(item.image);
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const compressed = await imageCompression(file, { maxSizeMB: 0.3, maxWidthOrHeight: 800, useWebWorker: true });
    const fd = new FormData();
    fd.append("file", compressed);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setImageUrl(data.url);
    setUploading(false);
  };

  const toggleAvailable = async (item: MenuItem) => {
    if (staff?.role !== "admin") return;
    await fetch(`/api/menu/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !item.available }),
    });
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, available: !i.available } : i)));
  };

  if (authLoading || loading || !staff) return (
    <div className="p-8 flex items-center justify-center min-h-screen">
      <div className="animate-spin w-8 h-8 border-2 border-zinc-300 border-t-violet-600 rounded-full" />
    </div>
  );

  return (
    <>
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-zinc-800">Menu Items</h1>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari menu..." className="w-48 px-3 py-1.5 rounded-xl border border-zinc-300 text-sm bg-white text-zinc-800 placeholder-zinc-400 ml-auto" />
        {staff?.role === "admin" && (
          <>
          <button
            onClick={() => setShowCatModal(true)}
            className="px-4 py-2 rounded-xl bg-violet-100 text-sm text-violet-700 hover:bg-violet-200"
          >
            Kelola Kategori
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setEditingId(null); setImageUrl(null); setForm({ name: "", description: "", price: "", categoryId: "", stock: "", lowStockAt: "" }); }}
            className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700"
          >
            + Tambah Item
          </button>
          </>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-zinc-800">{editingId ? "Edit Item" : "Item Baru"}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-800 mb-1">Nama</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800 bg-white" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-800 mb-1">Harga (Rp)</label>
              <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800 bg-white" required min={1} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-800 mb-1">Deskripsi</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800 bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-800 mb-1">Kategori</label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800 bg-white">
                <option value="">Pilih kategori</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-800 mb-1">Foto</label>
              <div className="flex items-center gap-3">
                {imageUrl && (
                  <img src={imageUrl} alt="" className="w-14 h-14 rounded-xl object-cover border border-zinc-200" />
                )}
                <label className={`px-3 py-1.5 rounded-xl border text-xs cursor-pointer ${uploading ? "opacity-50" : "hover:bg-zinc-50"} text-zinc-700 border-zinc-300`}>
                  {uploading ? "Uploading..." : imageUrl ? "Ganti" : "Upload"}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                </label>
                {imageUrl && (
                  <button onClick={() => setImageUrl(null)} className="text-xs text-red-500 hover:text-red-700">Hapus</button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-800 mb-1">Stock</label>
                <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800 bg-white" placeholder="Kosongkan = unlimited" min={0} />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-800 mb-1">Min. Stock Alert</label>
                <input type="number" value={form.lowStockAt} onChange={(e) => setForm({ ...form, lowStockAt: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800 bg-white" min={0} />
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
          {items.length === 0 ? (
            <tbody><tr><td colSpan={6} className="text-center text-zinc-400 py-10 text-sm">Belum ada menu. Tambah item baru untuk memulai.</td></tr></tbody>
          ) : (
          <tbody className="divide-y divide-zinc-100">
            {items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())).map((item) => (
              <tr key={item.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3 font-medium text-zinc-800 flex items-center gap-2">
                  {item.image && <img src={item.image} alt="" className="w-8 h-8 rounded-lg object-cover" />}
                  {item.name}
                </td>
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
                  {staff?.role === "admin" ? (
                    <>
                      <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold">Edit</button>
                      <span className="text-zinc-300 mx-1">|</span>
                      <button onClick={() => setDeleteTarget(item)} className="text-red-600 hover:text-red-800 text-xs font-semibold">Hapus</button>
                    </>
                  ) : <span className="text-zinc-300 text-xs">-</span>}
                </td>
              </tr>
            ))}
          </tbody>
          )}
        </table>
      </div>
    </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Item"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      >
        {deleteTarget && (
          <div className="flex items-center gap-3">
            {deleteTarget.image && <img src={deleteTarget.image} alt="" className="w-12 h-12 rounded-xl object-cover" />}
            <div>
              <p className="font-medium text-sm text-zinc-800">{deleteTarget.name}</p>
              <p className="text-xs text-zinc-500">Rp {deleteTarget.price.toLocaleString("id-ID")}</p>
            </div>
          </div>
        )}
      </ConfirmDialog>

      {showCatModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCatModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-zinc-800">Kelola Kategori</h2>
              <button onClick={() => setShowCatModal(false)} className="text-zinc-400 hover:text-zinc-600 text-lg">&times;</button>
            </div>

            <div className="flex gap-2">
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCat()}
                placeholder="Nama kategori baru"
                className="flex-1 px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800 bg-white"
              />
              <button onClick={addCat} className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700">Tambah</button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {categories.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-4">Belum ada kategori</p>
              ) : categories.map((cat, i) => (
                <div key={cat.id} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-zinc-50">
                  <div className="flex flex-col">
                    <button onClick={() => moveCatSort(cat.id, -1)} disabled={i === 0} className="text-zinc-400 hover:text-zinc-600 disabled:opacity-30 text-xs leading-none">&uarr;</button>
                    <button onClick={() => moveCatSort(cat.id, 1)} disabled={i === categories.length - 1} className="text-zinc-400 hover:text-zinc-600 disabled:opacity-30 text-xs leading-none">&darr;</button>
                  </div>
                  {editingCatId === cat.id ? (
                    <input
                      value={editingCatName}
                      onChange={(e) => setEditingCatName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && renameCat(cat.id)}
                      onBlur={() => renameCat(cat.id)}
                      className="flex-1 px-2 py-1 rounded-lg border border-zinc-300 text-sm text-zinc-800 bg-white"
                      autoFocus
                    />
                  ) : (
                    <span className="flex-1 text-sm text-zinc-800">{cat.name}</span>
                  )}
                  <button
                    onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name); }}
                    className="text-blue-600 hover:text-blue-800 text-xs font-semibold"
                  >
                    Rename
                  </button>
                  <button onClick={() => removeCat(cat.id)} className="text-red-600 hover:text-red-800 text-xs font-semibold">Hapus</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
