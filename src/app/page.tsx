import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import Link from "next/link";

export default async function Home() {
  const cookieStore = await cookies();
  const staff = await verifyToken(cookieStore.get("token")?.value || "");
  if (staff) redirect(staff.role === "kitchen" ? "/kitchen" : "/pos");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-violet-50 to-white px-4">
      <div className="text-center max-w-lg">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-violet-600 flex items-center justify-center">
          <span className="text-white font-bold text-xl">L</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2 text-zinc-800">Laris POS</h1>
        <p className="text-zinc-800 mb-8">
          Sistem Point of Sale untuk cafe dan restoran.
          Self-order via QR, kitchen display real-time, dan manajemen lengkap.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 transition-colors"
          >
            Masuk Staff
          </Link>
        </div>
      </div>
    </div>
  );
}
