"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

type Report = {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  popularItems: { name: string; qty: number; revenue: number }[];
  dailyRevenue: { date: string; revenue: number }[];
  hourlyOrders: { hour: number; count: number; revenue: number }[];
  weekdayOrders: { day: string; count: number; revenue: number }[];
};

export default function ReportsPage() {
  const { staff, loading: authLoading } = useAuth();
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [range, setRange] = useState("daily");

  useEffect(() => {
    if (!staff) return;
    if (staff.role !== "admin") { router.push("/pos"); return; }
    fetch(`/api/reports?type=${range}`)
      .then((r) => r.json())
      .then(setReport);
  }, [staff, range]);

  if (!report) return (
    <div className="p-8 flex items-center justify-center min-h-screen">
      <div className="animate-spin w-8 h-8 border-2 border-zinc-300 border-t-violet-600 rounded-full" />
    </div>
  );

  const rangeLabel = range === "daily" ? "Hari Ini" : range === "weekly" ? "7 Hari" : "30 Hari";

  // chart data: hourly for daily, daily for weekly/monthly
  const chartData = range === "daily"
    ? report.hourlyOrders.map((h) => ({
        label: `${h.hour}:00`,
        value: h.revenue,
        sub: `${h.count} trx`,
      }))
    : report.dailyRevenue.map((d) => ({
        label: d.date.slice(5).replace("-", "/"),
        value: d.revenue,
        sub: "",
      }));

  const maxValue = Math.max(...chartData.map((d) => d.value), 1);
  const maxQty = Math.max(...report.popularItems.map((i) => i.qty), 1);
  const maxHourlyCount = Math.max(...report.hourlyOrders.map((h) => h.count), 1);
  const maxWeekdayCount = Math.max(...report.weekdayOrders.map((d) => d.count), 1);

  // peak hour & day
  const peakHour = report.hourlyOrders.reduce((max, h) => h.count > max.count ? h : max, report.hourlyOrders[0]);
  const peakDay = report.weekdayOrders.reduce((max, d) => d.count > max.count ? d : max, report.weekdayOrders[0]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-zinc-800">Laporan</h1>
        <div className="flex gap-2 items-center">
          <select value={range} onChange={(e) => setRange(e.target.value)} className="text-sm px-3 py-1.5 rounded-xl border border-zinc-300 text-zinc-700">
            <option value="daily">Hari Ini</option>
            <option value="weekly">7 Hari</option>
            <option value="monthly">30 Hari</option>
          </select>
          <a href={`/api/reports?type=${range}&export=csv`} download
            className="px-3 py-1.5 rounded-xl border border-zinc-300 text-xs text-zinc-700 hover:bg-zinc-50">
            CSV
          </a>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
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
      <div className="bg-white rounded-2xl p-5 border border-zinc-200 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-sm text-zinc-800">Revenue ({rangeLabel})</h2>
          {chartData.length > 0 && (
            <span className="text-xs text-zinc-400">Maks: Rp {maxValue.toLocaleString("id-ID")}</span>
          )}
        </div>
        {chartData.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-8">Belum ada data</p>
        ) : (
          <>
          <div className="relative h-40 flex items-end gap-1">
            {chartData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full min-w-0" style={{ maxWidth: range === "daily" ? "3rem" : "4rem" }}>
                <div
                  className={`w-full rounded-t-md transition-all relative ${d.value > 0 ? "bg-violet-600" : "bg-zinc-200"}`}
                  style={{ height: `${Math.max((d.value / maxValue) * 100, d.value > 0 ? 3 : 1.5)}%`, minHeight: d.value > 0 ? "3px" : "1.5px" }}
                  title={`${d.label}: Rp ${d.value.toLocaleString("id-ID")}${d.sub ? ` (${d.sub})` : ""}`}
                >
                  {d.value > 0 && (
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] text-zinc-500 whitespace-nowrap">
                      {d.value >= 1000000 ? `${(d.value / 1000000).toFixed(1)}jt` : d.value >= 1000 ? `${(d.value / 1000).toFixed(0)}rb` : ""}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {chartData.length > 0 && (
            <div className="flex gap-1 mt-1">
              {chartData.map((d, i) => (
                <div key={i} className="flex-1 text-center min-w-0" style={{ maxWidth: range === "daily" ? "3rem" : "4rem" }}>
                  {(range !== "daily" || d.label.endsWith("00") || d.label.endsWith("06") || d.label.endsWith("12") || d.label.endsWith("18")) && (
                    <span className="text-[8px] text-zinc-400">{d.label}</span>
                  )}
                </div>
              ))}
            </div>
          )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Peak Hours */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-sm text-zinc-800">Jam Sibuk</h2>
            {peakHour && peakHour.count > 0 && (
              <span className="text-xs font-medium text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                Puncak: {peakHour.hour}:00 ({peakHour.count} pesanan)
              </span>
            )}
          </div>
          <div className="flex items-end gap-0.5 h-24">
            {report.hourlyOrders.map((h) => (
              <div key={h.hour} className="flex-1 flex flex-col items-center justify-end h-full" title={`${h.hour}:00 — ${h.count} pesanan`}>
                <div
                  className={`w-full rounded-t-sm ${h.count > 0 ? "bg-violet-500" : "bg-zinc-100"}`}
                  style={{ height: `${Math.max((h.count / maxHourlyCount) * 100, h.count > 0 ? 4 : 2)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[8px] text-zinc-400">00</span>
            <span className="text-[8px] text-zinc-400">06</span>
            <span className="text-[8px] text-zinc-400">12</span>
            <span className="text-[8px] text-zinc-400">18</span>
            <span className="text-[8px] text-zinc-400">23</span>
          </div>
        </div>

        {/* Peak Days */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-sm text-zinc-800">Hari Sibuk</h2>
            {peakDay && peakDay.count > 0 && (
              <span className="text-xs font-medium text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                Puncak: {peakDay.day} ({peakDay.count} pesanan)
              </span>
            )}
          </div>
          <div className="flex items-end gap-2 h-24">
            {report.weekdayOrders.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center justify-end h-full" title={`${d.day} — ${d.count} pesanan, Rp ${d.revenue.toLocaleString("id-ID")}`}>
                <span className="text-[8px] text-zinc-500 mb-0.5">{d.count > 0 ? d.count : ""}</span>
                <div
                  className={`w-full rounded-t-md ${d.count > 0 ? "bg-violet-500" : "bg-zinc-100"}`}
                  style={{ height: `${Math.max((d.count / maxWeekdayCount) * 100, d.count > 0 ? 4 : 2)}%` }}
                />
                <span className="text-[9px] text-zinc-500 mt-1">{d.day.slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Popular Items */}
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        <h2 className="font-semibold text-sm text-zinc-800 px-5 py-4 border-b border-zinc-100">Produk Terlaris</h2>
        {report.popularItems.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-8">Belum ada data</p>
        ) : (
          <div className="p-5 space-y-3">
            {report.popularItems.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-400 w-6">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-zinc-800 truncate">{item.name}</span>
                    <span className="text-xs text-zinc-500 ml-2 whitespace-nowrap">{item.qty}x · Rp {item.revenue.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-600 rounded-full transition-all"
                      style={{ width: `${(item.qty / maxQty) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
