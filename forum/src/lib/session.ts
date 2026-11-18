// Signed session cookie: `userId.expiry.hmac`. Pure (node:crypto only) so tests can import it.
import { createHmac, timingSafeEqual } from "node:crypto";
import type { AstroCookies } from "astro";

export const SESSION_COOKIE = "dmz_forum_session";
export const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

function mac(payload: string, secret: string): string {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("SESSION_SECRET is missing or shorter than 32 characters; sessions are disabled.");
  }
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** `expiryMs` is the absolute time (ms since epoch) the session ends. */
export function sign(userId: number, expiryMs: number, secret: string): string {
  const payload = `${userId}.${expiryMs}`;
  return `${payload}.${mac(payload, secret)}`;
}

/** The user id, or null when the value is malformed, tampered with or expired. Throws on a bad secret. */
export function verify(cookieValue: string | undefined | null, secret: string, now: number): number | null {
  const m = /^([1-9]\d{0,8})\.([1-9]\d{0,15})\.([0-9a-f]{64})$/.exec(cookieValue ?? "");
  const expected = mac(m ? `${m[1]}.${m[2]}` : "", secret);
  if (!m || !safeEqual(m[3], expected)) return null;
  return Number(m[2]) > now ? Number(m[1]) : null;
}

/** Where to go after login: a same-site relative path, else "/". */
export function safeNext(value: string | undefined | null): string {
  if (!value || value.length > 500) return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/auth/")) return "/";
  // Browsers strip tabs and newlines from URLs and read "\" as "/".
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return "/";
  return value;
}

export const appUrl = (fallback: URL) => (process.env.PUBLIC_APP_URL || fallback.origin).replace(/\/+$/, "");

export function startSession(cookies: AstroCookies, userId: number, url: URL): void {
  const value = sign(userId, Date.now() + SESSION_MS, process.env.SESSION_SECRET ?? "");
  cookies.set(SESSION_COOKIE, value, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: appUrl(url).startsWith("https:"),
    maxAge: SESSION_MS / 1000,
  });
}
