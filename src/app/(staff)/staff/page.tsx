"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/confirm-dialog";
import ErrorState from "@/components/error-state";
import { SkeletonTable } from "@/components/skeleton";

type Staff = { id: string; name: string; role: string; active: boolean; createdAt: string };
type EditTarget = Staff | null;

export default function StaffPage() {
  const { staff, loading: authLoading } = useAuth();
  const router = useRouter();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", pin: "", role: "cashier" });

  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [editForm, setEditForm] = useState({ name: "", pin: "", role: "" });
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(false);

  const load = () => fetch("/api/staff").then((r) => r.json()).then(setStaffList);

  useEffect(() => {
    if (!staff) return;
    if (staff.role !== "admin") { router.push("/pos"); return; }
    load().then(() => setLoading(false)).catch(() => { setError(true); setLoading(false); });
  }, [staff]);

  const handleAdd = async () => {
    if (staff?.role !== "admin") return;
    if (!form.name.trim() || !form.pin) return;
    await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, pin: form.pin, role: form.role }),
    });
    setShowForm(false);
    setForm({ name: "", pin: "", role: "cashier" });
    load();
  };

  const openEdit = (s: Staff) => {
    setEditTarget(s);
    setEditForm({ name: s.name, pin: "", role: s.role });
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setSaving(true);
    const body: Record<string, unknown> = { id: editTarget.id, name: editForm.name, role: editForm.role };
    if (editForm.pin) body.pin = editForm.pin;
    await fetch("/api/staff", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setEditTarget(null);
    setSaving(false);
    load();
  };

  const toggleActive = async (s: Staff) => {
    await fetch("/api/staff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, active: !s.active }),
    });
    load();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch("/api/staff", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deleteTarget.id }) });
    setDeleteTarget(null);
    setDeleting(false);
    load();
  };

  if (authLoading || loading) return (
    <div className="p-6 max-w-4xl mx-auto">
      <SkeletonTable />
    </div>
  );
  if (error) return (
    <div className="p-6 max-w-4xl mx-auto">
      <ErrorState message="Gagal memuat data staff" onRetry={() => window.location.reload()} />
    </div>
  );

  const roleLabel: Record<string, string> = { admin: "Admin", cashier: "Kasir", kitchen: "Dapur" };

  return (
    <>
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-zinc-800">Staff</h1>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari staff..." className="w-48 px-3 py-1.5 rounded-xl border border-zinc-300 text-sm bg-white text-zinc-800 placeholder-zinc-400 ml-auto" />
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold">+ Tambah Staff</button>
      </div>

      {showForm && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 mb-6 flex gap-3 items-end">
          <div><label className="text-xs font-medium text-zinc-700 block mb-1">Nama</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800 bg-white w-40" required autoFocus /></div>
          <div><label className="text-xs font-medium text-zinc-700 block mb-1">PIN</label><input value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} className="px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800 bg-white w-32" required /></div>
          <div><label className="text-xs font-medium text-zinc-700 block mb-1">Role</label><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800 bg-white">
            <option value="cashier">Kasir</option><option value="kitchen">Dapur</option><option value="admin">Admin</option>
          </select></div>
          <button onClick={handleAdd} className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold">Tambah</button>
          <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-700">Batal</button>
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-zinc-800">Nama</th>
              <th className="text-left px-4 py-3 font-semibold text-zinc-800">Role</th>
              <th className="text-center px-4 py-3 font-semibold text-zinc-800">Status</th>
              <th className="text-right px-4 py-3 font-semibold text-zinc-800">Aksi</th>
            </tr>
          </thead>
          {staffList.length === 0 ? (
            <tbody><tr><td colSpan={4} className="text-center text-zinc-400 py-10 text-sm">Belum ada staff. Tambah staff baru untuk memulai.</td></tr></tbody>
          ) : (
          <tbody className="divide-y divide-zinc-100">
            {staffList.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())).map((s) => (
              <tr key={s.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3 font-medium text-zinc-800">{s.name}</td>
                <td className="px-4 py-3 text-zinc-700 capitalize">{roleLabel[s.role] || s.role}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => toggleActive(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium ${s.active ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500"}`}>
                    {s.active ? "Aktif" : "Nonaktif"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(s)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold py-1 px-1.5">Edit</button>
                  <button onClick={() => setDeleteTarget(s)} className="text-red-600 hover:text-red-800 text-xs font-semibold py-1 px-1.5">Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
          )}
        </table>
        </div>
      </div>
    </div>

      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !saving && setEditTarget(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold text-zinc-800">Edit Staff</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-700 block mb-1">Nama</label>
                <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800 bg-white" autoFocus />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-700 block mb-1">Role</label>
                <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800 bg-white">
                  <option value="cashier">Kasir</option><option value="kitchen">Dapur</option><option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-700 block mb-1">PIN Baru <span className="text-zinc-400">(kosongkan jika tidak diganti)</span></label>
                <input type="password" value={editForm.pin} onChange={(e) => setEditForm({ ...editForm, pin: e.target.value })} placeholder="Biarkan kosong" className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800 bg-white" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditTarget(null)} disabled={saving} className="px-4 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-700">Batal</button>
              <button onClick={handleEdit} disabled={saving} className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-40">
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Staff"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      >
        {deleteTarget && (
          <p className="text-sm text-zinc-600">
            Yakin hapus <span className="font-semibold text-zinc-800">{deleteTarget.name}</span>?
            {staff?.id === deleteTarget?.id && <span className="text-red-600 block mt-1">Anda tidak bisa menghapus diri sendiri.</span>}
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
