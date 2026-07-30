"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/confirm-dialog";

type Table = {
  id: string;
  number: number;
  capacity: number;
  status: string;
  qrCode: string | null;
};

export default function TablesPage() {
  const { staff, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newNumber, setNewNumber] = useState("");
  const [newCapacity, setNewCapacity] = useState("4");
  const [qrMap, setQrMap] = useState<Record<string, { url: string; image: string }>>({});
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadTables = async () => {
    const res = await fetch("/api/tables");
    setTables(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    if (!staff) return;
    if (staff.role !== "admin") { router.push("/pos"); return; }
    loadTables();
  }, [staff]);

  const handleAdd = async () => {
    if (!newNumber) return;
    await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: parseInt(newNumber), capacity: parseInt(newCapacity) }),
    });
    setShowForm(false);
    setNewNumber("");
    setNewCapacity("4");
    loadTables();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await fetch(`/api/tables/${deleteTarget}`, { method: "DELETE" });
    setQrMap((prev) => { const n = { ...prev }; delete n[deleteTarget]; return n; });
    setDeleteTarget(null);
    setDeleting(false);
    loadTables();
  };

  const generateQR = async (id: string, auto = false) => {
    if (qrMap[id] && !auto) return;
    const res = await fetch(`/api/tables/${id}/qr`);
    const data = await res.json();
    setQrMap((prev) => ({ ...prev, [id]: { url: data.qrUrl, image: data.qrImage } }));
  };

  useEffect(() => {
    tables.forEach((t) => { if (t.qrCode) generateQR(t.id, true); });
  }, [tables.length]);

  if (authLoading || loading) return (
    <div className="p-8 flex items-center justify-center min-h-screen">
      <div className="animate-spin w-8 h-8 border-2 border-zinc-300 border-t-violet-600 rounded-full" />
    </div>
  );

  return (
    <>
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-zinc-800">Meja</h1>
        {staff?.role === "admin" && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700"
          >
            + Tambah Meja
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 mb-6 flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-zinc-800 mb-1">Nomor Meja</label>
            <input type="number" value={newNumber} onChange={(e) => setNewNumber(e.target.value)} className="w-32 px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800 bg-white" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800 mb-1">Kapasitas</label>
            <input type="number" value={newCapacity} onChange={(e) => setNewCapacity(e.target.value)} className="w-32 px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800 bg-white" />
          </div>
          <button onClick={handleAdd} className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700">Tambah</button>
          <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800">Batal</button>
        </div>
      )}

      {tables.length === 0 ? (
        <p className="text-center text-zinc-400 py-10 text-sm">Belum ada meja. Tambah meja baru untuk memulai.</p>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map((table) => (
          <div key={table.id} className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-zinc-800">Meja {table.number}</h3>
                <p className="text-xs text-zinc-800">Kapasitas {table.capacity} orang</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${table.status === "available" ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-800"}`
              }>
                {table.status === "available" ? "Tersedia" : "Terisi"}
              </span>
            </div>

            {qrMap[table.id] ? (
              <div className="flex flex-col items-center gap-2">
                <img src={qrMap[table.id].image} alt={`QR Meja ${table.number}`} className="w-40 h-40" />
                <div className="flex gap-3 items-center">
                  <a
                    href={qrMap[table.id].image}
                    download={`meja-${table.number}.png`}
                    className="text-xs text-violet-600 hover:text-violet-800 font-medium"
                  >
                    Download QR
                  </a>
                  <span className="text-zinc-300">|</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(qrMap[table.id].url)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Copy URL
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => generateQR(table.id)}
                className="w-full py-2 rounded-xl border border-dashed border-zinc-300 text-xs text-zinc-800 hover:bg-zinc-50"
              >
                Generate QR Code
              </button>
            )}

            <div className="flex justify-between text-xs pt-2 border-t border-zinc-100">
              <span className="text-zinc-800">ID: {table.id.slice(0, 8)}...</span>
              <button onClick={() => setDeleteTarget(table.id)} className="text-red-500 hover:text-red-700 font-medium">Hapus</button>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Hapus Meja"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      >
        <p className="text-sm text-zinc-600">Yakin hapus meja ini? Data pesanan terkait tetap tersimpan.</p>
      </ConfirmDialog>
    </>
  );
}