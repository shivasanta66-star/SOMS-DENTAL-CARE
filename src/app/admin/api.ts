"use client";

// Browser side of the admin API (netlify/functions/admin.mts). The session is
// an httpOnly cookie, so nothing secret is ever visible to page scripts.
import { useCallback, useEffect, useState } from "react";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

async function request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(`/api/admin/${path}`, {
      method,
      headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 0, error: "network" };
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (res.status === 401 && path !== "login") {
    window.location.assign("/admin/login");
    return { ok: false, status: 401, error: "unauthenticated" };
  }
  if (!res.ok) return { ok: false, status: res.status, error: data.error ?? "server" };
  return { ok: true, data };
}

export const adminGet = <T>(path: string) => request<T>("GET", path);
export const adminPost = <T = { ok: string }>(path: string, body: unknown = {}) => request<T>("POST", path, body);

/** Loads an admin GET endpoint; `reload()` fetches it again after a change. */
export function useAdminData<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    adminGet<T>(path).then((r) => {
      if (cancelled) return;
      if (r.ok) {
        setData(r.data);
        setError(null);
      } else if (r.status !== 401) {
        setError(r.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [path, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, error, reload };
}

export type FlashState = { ok?: string; error?: string };

/** Posts a change and turns the { ok } / { error } code into a flash message. */
export async function submitChange(path: string, body: unknown, setFlash: (f: FlashState) => void, onDone?: () => void) {
  const r = await adminPost(path, body);
  setFlash(r.ok ? { ok: r.data.ok } : { error: r.error });
  onDone?.();
  return r.ok;
}

export function formValues(form: HTMLFormElement) {
  return Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
}
