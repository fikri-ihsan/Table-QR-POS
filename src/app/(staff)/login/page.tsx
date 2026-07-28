"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { staff, loading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && staff) {
      router.push(staff.role === "kitchen" ? "/kitchen" : "/pos");
    }
  }, [staff, loading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, pin }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Login gagal");
      return;
    }

    router.push(data.role === "kitchen" ? "/kitchen" : "/pos");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-800">Saji POS</h1>
          <p className="text-sm text-zinc-800 mt-1">Masuk ke panel staff</p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-800 mb-1">Nama Staff</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-400 bg-white text-zinc-800 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              placeholder="cth: Admin, Kasir"
              required
            />
          </div>

          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-zinc-800 mb-1">PIN</label>
            <input
              id="pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-400 bg-white text-zinc-800 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              placeholder="Masukkan PIN"
              required
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="w-full py-2.5 rounded-xl bg-violet-600 text-white font-semibold text-sm hover:bg-violet-700 transition-colors"
        >
          Masuk
        </button>
      </form>
    </div>
  );
}
