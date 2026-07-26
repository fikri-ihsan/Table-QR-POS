"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Staff = {
  id: string;
  outletId: string;
  name: string;
  role: string;
};

export default function POSPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<Staff | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (res) => {
        if (!res.ok) throw new Error("Not auth");
        setStaff(await res.json());
      })
      .catch(() => router.push("/login"));
  }, [router]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (!staff) return null;

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Saji POS</h1>
          <p className="text-xs text-zinc-600">{staff.name} • {staff.role}</p>
        </div>
        <button onClick={logout} className="text-sm text-red-500 hover:text-red-700">Keluar</button>
      </header>
      <main className="p-6">
        <div className="text-center py-20 text-zinc-500">
          <p className="text-lg">POS Interface — coming soon</p>
          <p className="text-sm mt-2 text-zinc-600">Phase 2: Menu & Tables</p>
        </div>
      </main>
    </div>
  );
}
