"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ShoppingCart, ChefHat, ClipboardList, Coffee, Grid3x3, Users, Package, BarChart3, Settings, X, Menu, LogOut } from "lucide-react";

const publicPaths = ["/login"];

const navItems = [
  { label: "POS", href: "/pos", icon: ShoppingCart, roles: ["admin", "cashier"], group: 1 },
  { label: "Dapur", href: "/kitchen", icon: ChefHat, roles: ["admin", "cashier", "kitchen"], group: 1 },
  { label: "Pesanan", href: "/orders", icon: ClipboardList, roles: ["admin", "cashier"], group: 1 },
  { label: "Meja", href: "/tables", icon: Grid3x3, roles: ["admin"], group: 2 },
  { label: "Menu", href: "/menu", icon: Coffee, roles: ["admin"], group: 2 },
  { label: "Staff", href: "/staff", icon: Users, roles: ["admin"], group: 3 },
  { label: "Inventory", href: "/inventory", icon: Package, roles: ["admin"], group: 3 },
  { label: "Reports", href: "/reports", icon: BarChart3, roles: ["admin"], group: 3 },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["admin"], group: 3 },
];

function StaffLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { staff, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (staff && staff.role !== "admin") setSidebarOpen(false);
  }, [staff]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

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

  const navContent = (
    <>
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  pathname === item.href
                    ? "bg-violet-100 text-violet-800 font-semibold"
                    : "text-zinc-800 hover:bg-zinc-100"
                }`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
            return elements;
          })}
      </nav>

      <div className="p-3 border-t border-zinc-200 space-y-2">
        <div className="px-3 text-xs text-zinc-800 truncate">
          {staff?.name} • {staff?.role}
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg"
        >
          <LogOut size={16} />
          <span>Keluar</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-zinc-50">
      {/* Desktop sidebar — always visible on lg+ */}
      <aside className={`no-print hidden lg:flex ${sidebarOpen ? "w-56" : "w-16"} bg-white border-r border-zinc-200 flex-col transition-all duration-200`}>
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
          {sidebarOpen && <span className="font-bold text-sm text-zinc-800">Laris POS</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-zinc-100 rounded text-zinc-800">
            {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
        {sidebarOpen ? (
          navContent
        ) : (
          <div className="flex-1 flex flex-col">
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
                      className={`flex items-center justify-center px-3 py-2.5 rounded-xl text-sm transition-all ${
                        pathname === item.href
                          ? "bg-violet-100 text-violet-800 font-semibold"
                          : "text-zinc-800 hover:bg-zinc-100"
                      }`}
                      title={item.label}
                    >
                      <item.icon size={18} />
                    </Link>
                  );
                  return elements;
                })}
            </nav>
            <div className="p-3 border-t border-zinc-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg"
                title="Keluar"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Tablet/mobile drawer overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white border-r border-zinc-200 flex flex-col">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
              <span className="font-bold text-sm text-zinc-800">Laris POS</span>
              <button onClick={() => setDrawerOpen(false)} className="p-2 hover:bg-zinc-100 rounded text-zinc-800">
                <X size={16} />
              </button>
            </div>
            {navContent}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tablet top bar */}
        <div className="lg:hidden no-print flex items-center gap-3 px-4 py-3 bg-white border-b border-zinc-200">
          <button onClick={() => setDrawerOpen(true)} className="p-2 hover:bg-zinc-100 rounded text-zinc-800">
            <Menu size={20} />
          </button>
          <span className="font-bold text-sm text-zinc-800">Laris POS</span>
        </div>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
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
