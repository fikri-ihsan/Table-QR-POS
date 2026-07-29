"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { staff, loading: authLoading } = useAuth();
  const router = useRouter();
  const [outletId, setOutletId] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState(10);
  const [taxLabel, setTaxLabel] = useState("Pajak");
  const [serviceEnabled, setServiceEnabled] = useState(false);
  const [serviceRate, setServiceRate] = useState(5);
  const [serviceLabel, setServiceLabel] = useState("Service");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!staff) return;
    if (staff.role !== "admin") { router.push("/pos"); return; }
    fetch("/api/outlets").then((r) => r.json()).then((data) => {
      const o = data[0];
      if (o) {
        setOutletId(o.id);
        setName(o.name);
        setAddress(o.address || "");
        setTaxEnabled(o.taxEnabled ?? false);
        setTaxRate(o.taxRate ?? 10);
        setTaxLabel(o.taxLabel || "Pajak");
        setServiceEnabled(o.serviceEnabled ?? false);
        setServiceRate(o.serviceRate ?? 5);
        setServiceLabel(o.serviceLabel || "Service");
      }
    });
  }, [staff]);

  const handleSave = async () => {
    if (!outletId) return;
    setSaving(true);
    await fetch(`/api/outlets/${outletId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, address, taxEnabled, taxRate: Number(taxRate), taxLabel, serviceEnabled, serviceRate: Number(serviceRate), serviceLabel }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (authLoading) return <div className="p-8 text-center text-zinc-500">Loading...</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-800 mb-6">Pengaturan</h1>

      <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-sm text-zinc-800 mb-1">Akun Staff</h2>
          <p className="text-xs text-zinc-600">{staff?.name} • {staff?.role}</p>
        </div>

        <div className="pt-4 border-t border-zinc-100 space-y-3">
          <h2 className="font-semibold text-sm text-zinc-800">Informasi Outlet</h2>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Nama Toko</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800 bg-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">Alamat</label>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800 bg-white resize-none" />
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-100 space-y-3">
          <h2 className="font-semibold text-sm text-zinc-800">Pajak</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={taxEnabled} onChange={(e) => setTaxEnabled(e.target.checked)} className="w-4 h-4 rounded border-zinc-300 text-violet-600" />
            <span className="text-sm text-zinc-700">Aktifkan pajak</span>
          </label>
          {taxEnabled && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-700 mb-1">Label</label>
                <input value={taxLabel} onChange={(e) => setTaxLabel(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800 bg-white" />
              </div>
              <div className="w-24">
                <label className="block text-xs font-medium text-zinc-700 mb-1">Rate (%)</label>
                <input type="number" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800 bg-white" />
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-zinc-100 space-y-3 pt-4">
          <h2 className="font-semibold text-sm text-zinc-800">Service Charge</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={serviceEnabled} onChange={(e) => setServiceEnabled(e.target.checked)} className="w-4 h-4 rounded border-zinc-300 text-violet-600" />
            <span className="text-sm text-zinc-700">Aktifkan service charge</span>
          </label>
          {serviceEnabled && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-700 mb-1">Label</label>
                <input value={serviceLabel} onChange={(e) => setServiceLabel(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800 bg-white" />
              </div>
              <div className="w-24">
                <label className="block text-xs font-medium text-zinc-700 mb-1">Rate (%)</label>
                <input type="number" value={serviceRate} onChange={(e) => setServiceRate(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-800 bg-white" />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 disabled:opacity-40">
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
          {saved && <span className="text-xs text-green-600">✓ Tersimpan</span>}
        </div>

        <div className="pt-4 border-t border-zinc-100">
          <h2 className="font-semibold text-sm text-zinc-800 mb-2">Deployment</h2>
          <p className="text-xs text-zinc-600">Pastikan file <code className="text-xs bg-zinc-100 px-1 py-0.5 rounded">.env</code> di root project sudah diisi dengan variabel lingkungan yang dibutuhkan.</p>
        </div>
      </div>
    </div>
  );
}
