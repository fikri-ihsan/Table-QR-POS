"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import ErrorState from "@/components/error-state";

const statusLabels: Record<string, string> = {
  received: "Diterima", preparing: "Dimasak", ready: "Siap", delivered: "Diantar", cancelled: "Batal",
};

export default function OrderDetailPage() {
  const { staff, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!staff) return;
    if (staff.role === "kitchen") { router.push("/kitchen"); return; }
    fetch(`/api/orders/${params.id}`)
      .then((r) => r.json())
      .then((data) => { setOrder(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [staff]);

  if (authLoading || loading) return (
    <div className="p-6 max-w-2xl mx-auto animate-pulse space-y-4">
      <div className="h-6 bg-zinc-200 rounded w-48" />
      <div className="h-4 bg-zinc-100 rounded w-32" />
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-3">
        {[...Array(4)].map((_, i) => <div key={i} className="h-4 bg-zinc-100 rounded w-full" />)}
      </div>
    </div>
  );
  if (error || !order) return (
    <div className="p-6 max-w-2xl mx-auto">
      <ErrorState message="Gagal memuat detail pesanan" />
    </div>
  );

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/orders" className="text-xs text-zinc-500 hover:text-zinc-700">&larr; Kembali ke Pesanan</Link>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-zinc-200 space-y-5">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold text-zinc-800">#{order.orderNumber}</h1>
            {order.ref && <p className="text-xs text-zinc-400 font-mono mt-0.5">{order.ref}</p>}
          </div>
          <div className="flex gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusLabels[order.status] ? "bg-violet-100 text-violet-700" : "bg-zinc-100 text-zinc-500"}`}>
              {statusLabels[order.status] || order.status}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${order.paymentStatus === "paid" ? "bg-green-100 text-green-700" : order.paymentStatus === "refunded" ? "bg-zinc-100 text-zinc-500" : "bg-yellow-100 text-yellow-700"}`}>
              {order.paymentStatus === "paid" ? "Lunas" : order.paymentStatus === "refunded" ? "Refund" : "Pending"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-zinc-400">Meja / Tipe</p>
            <p className="text-zinc-800 font-medium">{order.table ? `Meja ${order.table.number}` : "Takeaway"}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">Customer</p>
            <p className="text-zinc-800 font-medium">{order.customerName || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">Tanggal</p>
            <p className="text-zinc-800 font-medium">{new Date(order.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          <div>
            <p className="text-xs text-zinc-400">Kasir</p>
            <p className="text-zinc-800 font-medium">{order.staff?.name || "Self-order"}</p>
          </div>
        </div>

        <div className="border-t border-zinc-100 pt-4">
          <h2 className="font-semibold text-sm text-zinc-800 mb-3">Item Pesanan</h2>
          <div className="space-y-2">
            {order.items.map((item: any) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-zinc-700"><span className="font-semibold">{item.quantity}x</span> {item.menuItem?.name || "?"}</span>
                <span className="text-zinc-800">Rp {(item.price * item.quantity).toLocaleString("id-ID")}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-zinc-100 pt-4 space-y-1 text-sm">
          <div className="flex justify-between text-zinc-600"><span>Subtotal</span><span>Rp {order.subtotal.toLocaleString("id-ID")}</span></div>
          {order.tax > 0 && <div className="flex justify-between text-zinc-600"><span>Pajak</span><span>Rp {order.tax.toLocaleString("id-ID")}</span></div>}
          {order.service > 0 && <div className="flex justify-between text-zinc-600"><span>Service</span><span>Rp {order.service.toLocaleString("id-ID")}</span></div>}
          {order.discount > 0 && <div className="flex justify-between text-red-600"><span>Diskon</span><span>-Rp {order.discount.toLocaleString("id-ID")}</span></div>}
          <div className="flex justify-between font-bold text-zinc-800 pt-1 border-t border-zinc-100"><span>Total</span><span>Rp {order.total.toLocaleString("id-ID")}</span></div>
        </div>

        {order.paymentStatus === "paid" && (
          <div className="border-t border-zinc-100 pt-4">
            <p className="text-xs text-zinc-400 mb-2">Pembayaran</p>
            <p className="text-sm text-zinc-800">{order.paymentMethod === "cash" ? "Tunai" : order.paymentMethod === "qris" ? "QRIS" : order.paymentMethod || "—"}</p>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Link href="/orders" className="flex-1 text-center py-3 rounded-xl border border-zinc-300 text-zinc-700 text-sm font-semibold hover:bg-zinc-50">
            Kembali
          </Link>
          {order.paymentStatus === "paid" && (
            <button onClick={() => window.print()} className="flex-1 py-3 rounded-xl border border-zinc-300 text-zinc-700 text-sm font-semibold hover:bg-zinc-50 no-print">
              Cetak Ulang
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
