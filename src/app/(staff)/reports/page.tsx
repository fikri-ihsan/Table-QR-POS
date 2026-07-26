"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Report = {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  popularItems: { name: string; qty: number; revenue: number }[];
  dailyRevenue: { date: string; revenue: number }[];
};

export default function ReportsPage() {
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [range, setRange] = useState("daily");

  useEffect(() => {
    fetch("/api/auth/me").then(async (res) => {
      if (!res.ok) return router.push("/login");
      fetch(`/api/reports?type=${range}`)
        .then((r) => r.json())
        .then(setReport);
    });
  }, [router, range]);

  if (!report) return <div className="p-8 text-center text-zinc-500">Loading...</div>;

  const maxRevenue = Math.max(...report.dailyRevenue.map((d) => d.revenue), 1);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-zinc-800">Laporan</h1>
        <select value={range} onChange={(e) => setRange(e.target.value)} className="text-sm px-3 py-1.5 rounded-xl border border-zinc-300 text-zinc-700">
          <option value="daily">Hari Ini</option>
          <option value="weekly">7 Hari</option>
          <option value="monthly">30 Hari</option>
        </select>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-zinc-200">
          <p className="text-xs text-zinc-500">Total Penjualan</p>
          <p className="text-xl font-bold text-zinc-800 mt-1">Rp {report.totalRevenue.toLocaleString("id-ID")}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-zinc-200">
          <p className="text-xs text-zinc-500">Jumlah Pesanan</p>
          <p className="text-xl font-bold text-zinc-800 mt-1">{report.totalOrders}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-zinc-200">
          <p className="text-xs text-zinc-500">Rata-rata Pesanan</p>
          <p className="text-xl font-bold text-zinc-800 mt-1">Rp {report.avgOrderValue.toLocaleString("id-ID")}</p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-200 mb-8">
        <h2 className="font-semibold text-sm text-zinc-800 mb-4">Revenue</h2>
        <div className="flex items-end gap-2 h-32">
          {report.dailyRevenue.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-lg bg-violet-600 transition-all"
                style={{ height: `${(d.revenue / maxRevenue) * 100}%`, minHeight: "4px" }}
              />
              <span className="text-[8px] text-zinc-500 -rotate-45 origin-left">{d.date.slice(5)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Popular Items */}
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        <h2 className="font-semibold text-sm text-zinc-800 px-5 py-4 border-b border-zinc-100">Item Terlaris</h2>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="text-left px-5 py-3 font-semibold text-zinc-800">Item</th>
              <th className="text-center px-5 py-3 font-semibold text-zinc-800">Terjual</th>
              <th className="text-right px-5 py-3 font-semibold text-zinc-800">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {report.popularItems.map((item, i) => (
              <tr key={i}>
                <td className="px-5 py-3 font-medium text-zinc-800">{item.name}</td>
                <td className="px-5 py-3 text-center text-zinc-700">{item.qty}</td>
                <td className="px-5 py-3 text-right text-zinc-800">Rp {item.revenue.toLocaleString("id-ID")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
