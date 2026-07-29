"use client";

import { useEffect, useState } from "react";

type Props = {
  message: string;
  type?: "success" | "error" | "info" | "warning";
  onClose: () => void;
  duration?: number;
};

export default function Toast({ message, type = "success", onClose, duration = 4000 }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => { setVisible(false); setTimeout(onClose, 300); }, duration);
    return () => clearTimeout(t);
  }, []);

  const colors = {
    success: "bg-green-600",
    error: "bg-red-600",
    info: "bg-violet-600",
    warning: "bg-amber-500",
  };

  const icons = {
    success: "✓",
    error: "✕",
    info: "ℹ",
    warning: "⚠",
  };

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${visible ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"}`}>
      <div className={`${colors[type]} text-white px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 text-sm font-medium`}>
        <span>{icons[type]}</span>
        <span>{message}</span>
      </div>
    </div>
  );
}
