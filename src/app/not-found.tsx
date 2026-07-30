import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-zinc-300">404</h1>
        <p className="text-sm text-zinc-500 mt-2 mb-6">Halaman tidak ditemukan</p>
        <Link href="/pos" className="px-6 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700">
          Kembali ke POS
        </Link>
      </div>
    </div>
  );
}
