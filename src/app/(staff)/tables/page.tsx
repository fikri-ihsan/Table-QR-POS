"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Table = {
  id: string;
  number: number;
  capacity: number;
  status: string;
  qrCode: string | null;
};

export default function TablesPage() {
  const router = useRouter();
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newNumber, setNewNumber] = useState("");
  const [newCapacity, setNewCapacity] = useState("4");
  const [qrMap, setQrMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/auth/me").then(async (res) => {
      if (!res.ok) return router.push("/login");
      loadTables();
    });
  }, [router]);

  const loadTables = async () => {
    const res = await fetch("/api/tables");
    setTables(await res.json());
    setLoading(false);
  };

  const handleAdd = async () => {
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

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus meja ini?")) return;
    await fetch(`/api/tables/${id}`, { method: "DELETE" });
    loadTables();
  };

  const generateQR = async (id: string) => {
    const res = await fetch(`/api/tables/${id}/qr`);
    const data = await res.json();
    setQrMap((prev) => ({ ...prev, [id]: data.qrUrl }));
  };

  if (loading) return <div className="p-8 text-center text-zinc-800">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-zinc-800">Meja</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700"
        >
          + Tambah Meja
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 mb-6 flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-zinc-800 mb-1">Nomor Meja</label>
            <input type="number" value={newNumber} onChange={(e) => setNewNumber(e.target.value)} className="w-32 px-3 py-2 rounded-xl border border-zinc-300 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-800 mb-1">Kapasitas</label>
            <input type="number" value={newCapacity} onChange={(e) => setNewCapacity(e.target.value)} className="w-32 px-3 py-2 rounded-xl border border-zinc-300 text-sm" />
          </div>
          <button onClick={handleAdd} className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700">Tambah</button>
          <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800">Batal</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map((table) => (
          <div key={table.id} className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-zinc-800">Meja {table.number}</h3>
                <p className="text-xs text-zinc-800">Kapasitas {table.capacity} orang</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                table.status === "available" ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-800"
              }`}>
                {table.status === "available" ? "Tersedia" : "Terisi"}
              </span>
            </div>

            {qrMap[table.id] ? (
              <div className="text-xs bg-zinc-50 rounded-xl p-3 break-all font-mono text-zinc-800">
                {qrMap[table.id]}
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
              <button onClick={() => handleDelete(table.id)} className="text-red-500 hover:text-red-700 font-medium">Hapus</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
