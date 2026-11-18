// Pre-launch lock: until FORUM_PUBLIC=1 only staff (Discord moderator/admin roles) can use the forum. Pure, so tests can import it.

/** Locked unless FORUM_PUBLIC is exactly "1": a missing variable fails closed. */
export const forumLocked = (publicFlag: string | undefined): boolean => publicFlag !== "1";

// Reachable while locked: logging in and out, the language switch, the holding page itself and the assets it needs.
const OPEN = [
  /^\/auth\/(login|callback|logout|dev)$/,
  /^\/lang\/[a-z]{2}$/,
  /^\/locked$/,
  /^\/_astro\//,
  /^\/_image$/,
  /^\/pinned-bg\.png$/,
  /^\/favicon\./,
];

export const openWhenLocked = (pathname: string): boolean => OPEN.some((rule) => rule.test(pathname));

/** Staff who may enter while locked: a logged-in, not banned moderator or admin. */
export const mayEnter = (user: { role: string; banned: boolean } | null | undefined): boolean =>
  !!user && !user.banned && (user.role === "mod" || user.role === "admin");
