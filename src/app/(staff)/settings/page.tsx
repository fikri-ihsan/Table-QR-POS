"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(async (res) => {
      if (!res.ok) return router.push("/login");
      setStaff(await res.json());
    });
  }, [router]);

  if (!staff) return null;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-800 mb-6">Pengaturan</h1>

      <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-sm text-zinc-800 mb-1">Akun Staff</h2>
          <p className="text-xs text-zinc-600">{staff.name} • {staff.role}</p>
        </div>

        <div className="pt-4 border-t border-zinc-100">
          <h2 className="font-semibold text-sm text-zinc-800 mb-2">Informasi Outlet</h2>
          <p className="text-xs text-zinc-600">Menu, meja, dan data lainnya sudah diatur melalui halaman terkait.</p>
        </div>

        <div className="pt-4 border-t border-zinc-100">
          <h2 className="font-semibold text-sm text-zinc-800 mb-2">Deployment</h2>
          <p className="text-xs text-zinc-600">App ini berjalan di Railway. Pastikan variabel lingkungan <code className="text-xs bg-zinc-100 px-1 py-0.5 rounded">DATABASE_URL</code>, <code className="text-xs bg-zinc-100 px-1 py-0.5 rounded">JWT_SECRET</code>, dan <code className="text-xs bg-zinc-100 px-1 py-0.5 rounded">MIDTRANS_SERVER_KEY</code> sudah terisi.</p>
        </div>
      </div>
    </div>
  );
}
