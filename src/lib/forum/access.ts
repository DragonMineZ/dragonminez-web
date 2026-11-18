// Pre-launch lock: until FORUM_PUBLIC=1 only staff (Discord moderator/admin roles) can use the forum. Pure, so tests can import it.

/** Locked unless FORUM_PUBLIC is exactly "1": a missing variable fails closed. */
export const forumLocked = (publicFlag: string | undefined): boolean => publicFlag !== "1";

// Reachable while locked: the holding page and the login page.
const OPEN = [/^\/forum\/(locked|login|dev)$/];

export const openWhenLocked = (pathname: string): boolean => OPEN.some((rule) => rule.test(pathname));

/** Staff who may enter while locked: a logged-in, not banned moderator or admin. */
export const mayEnter = (user: { role: string; banned: boolean } | null | undefined): boolean =>
  !!user && !user.banned && (user.role === "mod" || user.role === "admin");

/**
 * Forum role from Discord: the server owner and anyone with the Administrator permission are admins, the staff roles
 * (DISCORD_MODERATOR_ROLES) are mods. `extraAdminIds` (ADMIN_DISCORD_IDS, comma list) is an optional break-glass list.
 */
export const roleOf = (
  discordId: string | null,
  level: "admin" | "mod" | null,
  extraAdminIds = "",
): "member" | "mod" | "admin" => {
  const extra = extraAdminIds.split(",").map((id) => id.trim()).filter(Boolean);
  if (level === "admin" || (discordId && extra.includes(discordId))) return "admin";
  return level === "mod" ? "mod" : "member";
};
