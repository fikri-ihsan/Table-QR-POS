"use client";

import { ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  children: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  confirmLabel?: string;
  confirmClass?: string;
};

export default function ConfirmDialog({ open, title, children, onConfirm, onCancel, loading, confirmLabel, confirmClass }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-semibold text-zinc-800">{title}</h2>
        {children}
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} disabled={loading} className="px-4 py-2 rounded-xl border border-zinc-300 text-sm text-zinc-700 hover:bg-zinc-50">
            Batal
          </button>
          <button onClick={onConfirm} disabled={loading} className={`px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-40 ${confirmClass || "bg-red-600 hover:bg-red-700"}`}>
            {loading ? "Memproses..." : confirmLabel || "Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}
