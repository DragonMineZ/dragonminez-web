// Forum role from Discord. `roleFor` is pure; `discordRole` does the lookups with the bot token.
export type Role = "member" | "mod" | "admin";

export interface GuildInfo {
  ownerId: string;
  /** role id -> lowercased name and permission bits */
  roles: Map<string, { name: string; permissions: bigint }>;
}

const ADMINISTRATOR = 1n << 3n;

export function roleFor(input: {
  discordId: string;
  adminIds: string[];
  memberRoleIds: string[];
  guild: GuildInfo | null;
  modRoleNames: string[];
}): Role {
  const { discordId, adminIds, memberRoleIds, guild, modRoleNames } = input;
  if (adminIds.includes(discordId)) return "admin";
  if (!guild) return "member";
  if (guild.ownerId === discordId) return "mod";
  const isMod = memberRoleIds.some((id) => {
    const role = guild.roles.get(id);
    if (!role) return false;
    return (role.permissions & ADMINISTRATOR) !== 0n || modRoleNames.includes(role.name) || modRoleNames.includes(id);
  });
  return isMod ? "mod" : "member";
}

const DISCORD_API = "https://discord.com/api/v10";
const GUILD_TTL = 10 * 60_000;
let guildCache: { id: string; value: GuildInfo; expires: number } | null = null;

const list = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

async function discord(path: string, token: string): Promise<any> {
  try {
    const res = await fetch(`${DISCORD_API}${path}`, {
      headers: { Authorization: `Bot ${token}`, "User-Agent": "DiscordBot (https://forum.dragonminez.com, 1.0)" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      if (res.status !== 404) console.warn(`[Discord] ${res.status} on ${path.replace(/\d{5,}/g, "<id>")}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn("[Discord] request failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function guildInfo(guildId: string, token: string): Promise<GuildInfo | null> {
  if (guildCache && guildCache.id === guildId && guildCache.expires > Date.now()) return guildCache.value;
  const data = await discord(`/guilds/${guildId}`, token);
  if (!data) return null;
  const roles: GuildInfo["roles"] = new Map();
  for (const role of data.roles ?? []) {
    roles.set(String(role.id), {
      name: String(role.name ?? "").toLowerCase(),
      permissions: BigInt(role.permissions ?? "0"),
    });
  }
  const value = { ownerId: String(data.owner_id ?? ""), roles };
  guildCache = { id: guildId, value, expires: Date.now() + GUILD_TTL };
  return value;
}

/** Role for a Discord user at login. Never throws; any failed lookup counts as no staff role. */
export async function discordRole(discordId: string): Promise<Role> {
  const base = {
    discordId,
    adminIds: list(process.env.ADMIN_DISCORD_IDS),
    modRoleNames: list(process.env.DISCORD_MODERATOR_ROLES || "moderator").map((s) => s.toLowerCase()),
  };
  const token = process.env.DISCORD_TOKEN ?? "";
  const guildId = process.env.DISCORD_GUILD_ID ?? "";
  if (base.adminIds.includes(discordId) || !token || !/^\d+$/.test(guildId)) {
    return roleFor({ ...base, memberRoleIds: [], guild: null });
  }
  try {
    const member = await discord(`/guilds/${guildId}/members/${discordId}`, token);
    const guild = await guildInfo(guildId, token);
    // The owner is staff even if the member lookup failed; roles need both.
    return roleFor({ ...base, memberRoleIds: (member?.roles ?? []).map(String), guild });
  } catch {
    return "member";
  }
}
