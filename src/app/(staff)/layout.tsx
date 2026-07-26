"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type Staff = {
  id: string;
  outletId: string;
  name: string;
  role: "admin" | "cashier" | "kitchen";
};

const publicPaths = ["/login"];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [staff, setStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!staff && !publicPaths.some((p) => pathname.startsWith(p))) {
    return null;
  }

  return <>{children}</>;
}
