"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

type Staff = {
  id: string;
  outletId: string;
  name: string;
  role: "admin" | "cashier" | "kitchen";
};

const publicPaths = ["/login"];

const navItems = [
  { label: "POS", href: "/pos", icon: "▲" },
  { label: "Menu", href: "/menu", icon: "☕" },
  { label: "Meja", href: "/tables", icon: "▨" },
  { label: "Kitchen", href: "/kitchen", icon: "●" },
  { label: "Orders", href: "/orders", icon: "📋" },
  { label: "Staff", href: "/staff", icon: "👤" },
  { label: "Inventory", href: "/inventory", icon: "📦" },
  { label: "Reports", href: "/reports", icon: "📊" },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (publicPaths.some((p) => pathname.startsWith(p))) {
      setLoading(false);
      return;
    }

    fetch("/api/auth/me")
      .then(async (res) => {
        if (!res.ok) throw new Error("Not authenticated");
        const data = await res.json();
        setStaff(data);
      })
      .catch(() => {
        router.push("/login");
      })
      .finally(() => setLoading(false));
  }, [pathname, router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!staff && !publicPaths.some((p) => pathname.startsWith(p))) return null;
  if (publicPaths.some((p) => pathname.startsWith(p))) return <>{children}</>;

  return (
    <div className="min-h-screen flex bg-zinc-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-56" : "w-16"} bg-white border-r border-zinc-200 flex flex-col transition-all duration-200`}>
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
          {sidebarOpen && <span className="font-bold text-sm text-zinc-800">Saji POS</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-zinc-100 rounded text-zinc-800">
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {navItems
            .filter((item) => item.href !== "/staff" || staff?.role === "admin")
            .map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                pathname === item.href
                  ? "bg-violet-100 text-violet-800 font-semibold"
                  : "text-zinc-800 hover:bg-zinc-100"
              }`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-zinc-200 space-y-2">
          {sidebarOpen && (
            <div className="px-3 text-xs text-zinc-800 truncate">
              {staff?.name} • {staff?.role}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg"
          >
            {sidebarOpen ? "Keluar" : "✕"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
