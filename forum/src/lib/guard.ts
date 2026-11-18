// Checks every write handler runs: who is asking, and how often.
import type { APIContext } from "astro";
import { getLang, t } from "../i18n/index.ts";

export type SessionUser = NonNullable<App.Locals["user"]>;

export const isStaff = (user: { role: string } | null | undefined): boolean =>
  user?.role === "mod" || user?.role === "admin";

export const isAdmin = (user: { role: string } | null | undefined): boolean => user?.role === "admin";

/** Category.postRole decides who starts threads: member (everyone), staff (mods and admins) or admin. */
export const canStartThread = (category: { postRole: string }, user: { role: string } | null | undefined): boolean =>
  category.postRole === "admin" ? isAdmin(user) : category.postRole === "staff" ? isStaff(user) : true;

/**
 * The logged-in, not banned user, or the Response to return instead:
 * logged out = redirect to login (GET) or 401; banned = 403.
 * `const user = requireUser(Astro); if (user instanceof Response) return user;`
 */
export function requireUser(context: Pick<APIContext, "locals" | "request" | "url">): SessionUser | Response {
  const { locals, request, url } = context;
  const lang = getLang(request);
  if (!locals.user) {
    if (request.method !== "GET") return new Response(t(lang, "auth.required"), { status: 401 });
    const next = encodeURIComponent(url.pathname + url.search);
    return new Response(null, { status: 302, headers: { Location: `/auth/login?next=${next}` } });
  }
  if (locals.user.banned) return new Response(t(lang, "auth.banned"), { status: 403 });
  return locals.user;
}

// Note: in-memory limiter. Ceiling: one process, and counts are lost on restart.
// Move it to Postgres or Redis if the app ever runs on more than one instance.
const hits = new Map<string, { times: number[]; windowMs: number }>();
const MAX_KEYS = 10_000;

/** Sliding window: true (and counted) when `key` has had fewer than `max` hits in the last `windowMs`. */
export function rateLimit(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const times = (hits.get(key)?.times ?? []).filter((at) => at > now - windowMs);
  if (times.length >= max) {
    hits.set(key, { times, windowMs });
    return false;
  }
  times.push(now);
  hits.delete(key); // re-insert so the map stays ordered by last use
  hits.set(key, { times, windowMs });
  if (hits.size > MAX_KEYS) {
    for (const [k, entry] of hits) {
      if (entry.times[entry.times.length - 1] <= now - entry.windowMs) hits.delete(k);
    }
    for (const k of hits.keys()) {
      if (hits.size <= MAX_KEYS) break;
      hits.delete(k);
    }
  }
  return true;
}

/** False for a server listing's thread until the server is approved, except for staff and the owner. */
export function canSeeThread(
  thread: { server?: { status: string; ownerId: number } | null },
  user: { id: number; role: string } | null | undefined,
): boolean {
  const server = thread.server;
  return !server || server.status === "approved" || isStaff(user) || server.ownerId === user?.id;
}
