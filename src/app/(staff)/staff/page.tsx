"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

type Staff = { id: string; name: string; role: string; active: boolean; createdAt: string };

export default function StaffPage() {
  const { staff, loading: authLoading } = useAuth();
  const router = useRouter();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", pin: "", role: "cashier" });

  useEffect(() => {
    if (!staff) return;
    if (staff.role !== "admin") {
      setLoading(false);
      return;
    }
    fetch("/api/staff")
      .then((r) => r.json())
      .then(setStaffList)
      .then(() => setLoading(false));
  }, [staff]);

  const handleAdd = async () => {
    if (staff?.role !== "admin") return;
    await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, pin: form.pin, role: form.role }),
    });
    setShowForm(false);
    setForm({ name: "", pin: "", role: "cashier" });
    const r = await fetch("/api/staff");
    setStaffList(await r.json());
  };

  if (authLoading || loading) return <div className="p-8 text-center text-zinc-500">Loading...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-zinc-800">Staff</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold">+ Tambah Staff</button>
      </div>

      {showForm && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-4 mb-6 flex gap-3 items-end">
          <div><label className="text-xs font-medium text-zinc-700 block mb-1">Nama</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800 bg-white w-40" /></div>
          <div><label className="text-xs font-medium text-zinc-700 block mb-1">PIN</label><input value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} className="px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800 bg-white w-32" /></div>
          <div><label className="text-xs font-medium text-zinc-700 block mb-1">Role</label><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800 bg-white">
            <option value="cashier">Kasir</option><option value="kitchen">Dapur</option><option value="admin">Admin</option>
          </select></div>
          <button onClick={handleAdd} className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold">Tambah</button>
          <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-700">Batal</button>
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-zinc-800">Nama</th>
              <th className="text-left px-4 py-3 font-semibold text-zinc-800">Role</th>
              <th className="text-center px-4 py-3 font-semibold text-zinc-800">Status</th>
              <th className="text-right px-4 py-3 font-semibold text-zinc-800">Dibuat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {staffList.map((s) => (
              <tr key={s.id} className="hover:bg-zinc-50">
                <td className="px-4 py-3 font-medium text-zinc-800">{s.name}</td>
                <td className="px-4 py-3 text-zinc-700 capitalize">{s.role}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.active ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-500"}`}>
                    {s.active ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-zinc-500 text-xs">{new Date(s.createdAt).toLocaleDateString("id-ID")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}