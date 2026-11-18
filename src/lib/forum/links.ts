// Pure helpers shared by pages: search query cleanup and where a post lives. No imports, so tests can load it.
export const PAGE_SIZE = 20;

/** The trimmed search query, or null when it is not 2 to 80 characters. */
export function normalizeQuery(raw: string | null | undefined): string | null {
  const q = (raw ?? "").trim();
  return q.length >= 2 && q.length <= 80 ? q : null;
}

/** Makes %, _ and \ match literally in a LIKE pattern (Prisma's `contains` does not escape them). */
export const likeEscape = (q: string): string => q.replace(/[\\%_]/g, "\\$&");

/**
 * Page (1-based) a post is on. `before` = posts of the thread with id <= the post's id.
 * A server's thread hides its opening post (the listing card shows it), so its pages count one less.
 */
export function postPage(before: number, isServerThread: boolean): number {
  return Math.max(1, Math.ceil((isServerThread ? before - 1 : before) / PAGE_SIZE));
}

type Target = { type: string; threadId: number | null; postId: number | null; serverId: number | null };

/** Link for a notification, or null when what it points to no longer exists (or the viewer can't open it). */
export function notificationHref(
  n: Target,
  found: { thread: boolean; server: boolean; page: number },
): string | null {
  if (n.type === "server_approved" || n.type === "server_rejected") {
    return n.serverId && found.server ? `/forum/servers/${n.serverId}` : null;
  }
  if (!n.threadId || !found.thread) return null;
  const query = found.page > 1 ? `?page=${found.page}` : "";
  return `/forum/t/${n.threadId}${query}${n.postId ? `#post-${n.postId}` : ""}`;
}
