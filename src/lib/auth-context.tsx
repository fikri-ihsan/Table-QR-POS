"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";

type Staff = {
  id: string;
  outletId: string;
  name: string;
  role: "admin" | "cashier" | "kitchen";
} | null;

type AuthContextType = {
  staff: Staff;
  loading: boolean;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Staff>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchStaff = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        setLoading(false);
        router.push("/login");
        return;
      }
      const data = await res.json();
      setStaff(data);
      setLoading(false);
    } catch {
      setLoading(false);
      router.push("/login");
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [router]);

  const refresh = async () => {
    await fetchStaff();
  };

  return (
    <AuthContext.Provider value={{ staff, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}