"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ShoppingCart, ChefHat, ClipboardList, Coffee, Tags, Grid3x3, Users, Package, BarChart3, X, Menu, LogOut } from "lucide-react";

const publicPaths = ["/login"];

const navItems = [
  { label: "POS", href: "/pos", icon: ShoppingCart, roles: ["admin", "cashier"], group: 1 },
  { label: "Dapur", href: "/kitchen", icon: ChefHat, roles: ["admin", "cashier", "kitchen"], group: 1 },
  { label: "Pesanan", href: "/orders", icon: ClipboardList, roles: ["admin", "cashier"], group: 1 },
  { label: "Meja", href: "/tables", icon: Grid3x3, roles: ["admin"], group: 2 },
  { label: "Kategori", href: "/categories", icon: Tags, roles: ["admin"], group: 2 },
  { label: "Menu", href: "/menu", icon: Coffee, roles: ["admin"], group: 2 },
  { label: "Staff", href: "/staff", icon: Users, roles: ["admin"], group: 3 },
  { label: "Inventory", href: "/inventory", icon: Package, roles: ["admin"], group: 3 },
  { label: "Reports", href: "/reports", icon: BarChart3, roles: ["admin"], group: 3 },
];

function StaffLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { staff, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (staff && staff.role !== "admin") setSidebarOpen(false);
  }, [staff]);

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
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {navItems
            .filter((item) => item.roles.includes(staff?.role ?? ""))
            .map((item, i, visible) => {
              const elements: React.ReactNode[] = [];
              if (i > 0 && visible[i - 1].group !== item.group) {
                elements.push(<div key={`sep-${item.href}`} className="border-t border-zinc-200 my-1.5" />);
              }
              elements.push(
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                    pathname === item.href
                      ? "bg-violet-100 text-violet-800 font-semibold"
                      : "text-zinc-800 hover:bg-zinc-100"
                  }`}
                >
                  <item.icon size={18} />
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              );
              return elements;
            })}
        </nav>

        <div className="p-3 border-t border-zinc-200 space-y-2">
          {sidebarOpen && (
            <div className="px-3 text-xs text-zinc-800 truncate">
              {staff?.name} • {staff?.role}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg"
          >
            <LogOut size={16} />
            {sidebarOpen && <span>Keluar</span>}
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

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <StaffLayoutContent>{children}</StaffLayoutContent>
    </AuthProvider>
  );
}
