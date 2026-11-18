// Pre-launch lock: until FORUM_PUBLIC=1 only staff (Discord moderator/admin roles) can use the forum. Pure, so tests can import it.

/** Locked unless FORUM_PUBLIC is exactly "1": a missing variable fails closed. */
export const forumLocked = (publicFlag: string | undefined): boolean => publicFlag !== "1";

// Reachable while locked: the holding page and the login page.
const OPEN = [/^\/forum\/(locked|login|dev)$/];

export const openWhenLocked = (pathname: string): boolean => OPEN.some((rule) => rule.test(pathname));

/** Staff who may enter while locked: a logged-in, not banned moderator or admin. */
export const mayEnter = (user: { role: string; banned: boolean } | null | undefined): boolean =>
  !!user && !user.banned && (user.role === "mod" || user.role === "admin");

/** Forum role from Discord: ids in ADMIN_DISCORD_IDS (comma list) are admins, site moderators (Discord staff roles) are mods. */
export const roleOf = (discordId: string | null, moderator: boolean, adminIds = ""): "member" | "mod" | "admin" => {
  const admins = adminIds.split(",").map((id) => id.trim()).filter(Boolean);
  return discordId && admins.includes(discordId) ? "admin" : moderator ? "mod" : "member";
};
