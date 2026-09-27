import type { Context } from "@netlify/functions";

const noStore = { "Cache-Control": "no-store" };

export function json(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json; charset=utf-8", ...noStore, ...init.headers },
  });
}

export function jsonError(status: number, error: string, extra: Record<string, unknown> = {}) {
  return json({ error, ...extra }, { status });
}

export function methodNotAllowed(allowed: string) {
  return new Response(null, { status: 405, headers: { Allow: allowed, ...noStore } });
}

/**
 * Rejects cross-site POSTs (defence in depth alongside JSON-only bodies and the
 * SameSite cookie). A missing Origin is allowed: some same-origin fetches omit it.
 */
export function isSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

export async function readJsonBody(req: Request): Promise<Record<string, unknown> | null> {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return null;
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function clientIp(req: Request, context?: Pick<Context, "ip">) {
  return context?.ip || req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

export function getCookie(req: Request, name: string) {
  for (const part of (req.headers.get("cookie") ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}

export function serializeCookie(req: Request, name: string, value: string, maxAgeSeconds: number) {
  // Secure everywhere except plain-http local development.
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${secure}`;
}
