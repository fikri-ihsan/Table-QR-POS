"use client";

import { Component, ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean; error?: Error };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
          <div className="bg-white rounded-2xl p-8 max-w-sm text-center shadow-sm">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-xl text-red-600">!</span>
            </div>
            <h2 className="text-lg font-bold text-zinc-800 mb-2">Terjadi Kesalahan</h2>
            <p className="text-sm text-zinc-500 mb-6">Silakan muat ulang halaman atau hubungi admin.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700"
            >
              Muat Ulang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
