// Forum identity: the website's Clerk login (Discord) mapped to a ForumUser row.
// The forum never keeps its own session: Clerk says who is logged in, Discord decides who is staff.
import type { APIContext } from "astro";
import { prisma } from "../prisma";
import { canModerate, discordIdOf } from "../discord/moderation";
import { roleOf } from "./access";

export type ForumUser = {
  id: number;
  username: string;
  avatarUrl: string | null;
  role: "member" | "mod" | "admin";
  banned: boolean;
};

/** How long a ForumUser row is trusted before username, avatar and staff role are read again. */
const SYNC_MS = 5 * 60_000;

const toUser = (row: { id: number; username: string; avatarUrl: string | null; role: string; bannedAt: Date | null }): ForumUser => ({
  id: row.id,
  username: row.username,
  avatarUrl: row.avatarUrl,
  role: row.role === "admin" || row.role === "mod" ? row.role : "member",
  banned: row.bannedAt !== null,
});

/** Local development only: `?as=member|mod|admin` on /forum/dev sets a cookie that logs in a fake user (no Clerk needed). */
async function devUser(request: Request): Promise<ForumUser | null> {
  if (!import.meta.env.DEV || process.env.FORUM_DEV_LOGIN !== "1") return null;
  const as = /(?:^|;\s*)forum_dev=(member|mod|admin)/.exec(request.headers.get("cookie") ?? "")?.[1];
  if (!as) return null;
  const clerkId = `dev-${as}`;
  const row = await prisma.forumUser.upsert({
    where: { clerkId },
    update: { role: as },
    create: { clerkId, discordId: clerkId, username: as === "admin" ? "Admin" : as === "mod" ? "Moderator" : "Member", role: as },
  });
  return toUser(row);
}

/** The forum user of this request, or null when logged out. Never throws: a failed lookup keeps the last known row. */
export async function loadForumUser(context: Pick<APIContext, "locals" | "request">): Promise<ForumUser | null> {
  const dev = await devUser(context.request);
  if (dev) return dev;

  const { userId } = context.locals.auth();
  if (!userId) return null;

  let row = await prisma.forumUser.findUnique({ where: { clerkId: userId } });
  if (row && Date.now() - row.syncedAt.getTime() < SYNC_MS) return toUser(row);

  try {
    const clerkUser = await context.locals.currentUser();
    if (clerkUser) {
      const discordId = discordIdOf(clerkUser);
      // The same name the HairSalon shows, so a person is one name across the site.
      const web = await prisma.user.findUnique({ where: { clerk_id: userId }, select: { username: true, avatar_url: true } });
      const username = web?.username || clerkUser.username || clerkUser.firstName || `user_${userId.slice(-8)}`;
      const avatarUrl = web?.avatar_url || clerkUser.imageUrl || null;
      const role = roleOf(discordId, await canModerate(context.locals), process.env.ADMIN_DISCORD_IDS);
      row = await prisma.forumUser.upsert({
        where: { clerkId: userId },
        update: { discordId, username, avatarUrl, role, syncedAt: new Date() },
        create: { clerkId: userId, discordId, username, avatarUrl, role },
      });
    }
  } catch (err) {
    console.error("[forum] user sync failed:", err instanceof Error ? err.message : err);
  }
  return row ? toUser(row) : null;
}
