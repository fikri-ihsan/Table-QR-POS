"use client";

export type FetchOptions = RequestInit & {
  showError?: boolean;
};

export async function fetchAPI<T = unknown>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const { showError = true, ...fetchOptions } = options;

  const res = await fetch(url, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    },
  });

  if (!res.ok) {
    let message = "Terjadi kesalahan";
    try {
      const data = await res.json();
      message = data.error || message;
    } catch {}
    const error = new Error(message) as Error & { status: number };
    error.status = res.status;
    if (showError) {
      console.error(`API Error (${res.status}):`, message);
    }
    throw error;
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function withLoading<T>(
  promise: Promise<T>,
  setLoading: (v: boolean) => void
): Promise<T> {
  setLoading(true);
  try {
    return await promise;
  } finally {
    setLoading(false);
  }
}