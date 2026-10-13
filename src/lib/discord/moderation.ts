import type { APIContext } from "astro";
import type { User } from "@clerk/astro/server";

const DISCORD_API = "https://discord.com/api/v10";
const DRAGONMINEZ_GUILD_ID = "1216429657273012415";
const ADMINISTRATOR = 1n << 3n;
const MEMBER_TTL = 5 * 60_000;
const GUILD_TTL = 10 * 60_000;

interface GuildInfo {
    ownerId: string;
    roles: Map<string, { name: string; permissions: bigint }>;
}

const memberCache = new Map<string, { value: boolean; expires: number }>();
let guildCache: { value: GuildInfo; expires: number } | null = null;

function settings() {
    return {
        token: process.env.DISCORD_TOKEN ?? "",
        guildId: process.env.DISCORD_GUILD_ID || DRAGONMINEZ_GUILD_ID,
        roles: (process.env.DISCORD_MODERATOR_ROLES ?? "Moderator")
            .split(",")
            .map((role) => role.trim().toLowerCase())
            .filter(Boolean),
    };
}

async function discord(path: string, token: string): Promise<{ status: number; data: any }> {
    try {
        const res = await fetch(`${DISCORD_API}${path}`, {
            headers: {
                Authorization: `Bot ${token}`,
                "User-Agent": "DiscordBot (https://dragonminez.com, 1.0)",
            },
            signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) {
            if (res.status !== 404) {
                console.warn(`[Discord] ${res.status} on ${path.replace(/\d{5,}/g, "<id>")}`);
            }
            return { status: res.status, data: null };
        }
        return { status: res.status, data: await res.json() };
    } catch (err) {
        console.warn("[Discord] request failed:", err);
        return { status: 0, data: null };
    }
}

async function guildInfo(guildId: string, token: string): Promise<GuildInfo | null> {
    if (guildCache && guildCache.expires > Date.now()) return guildCache.value;
    const { data } = await discord(`/guilds/${guildId}`, token);
    if (!data) return null;
    const roles = new Map<string, { name: string; permissions: bigint }>();
    for (const role of data.roles ?? []) {
        roles.set(String(role.id), {
            name: String(role.name ?? "").toLowerCase(),
            permissions: BigInt(role.permissions ?? "0"),
        });
    }
    const value = { ownerId: String(data.owner_id ?? ""), roles };
    guildCache = { value, expires: Date.now() + GUILD_TTL };
    return value;
}

export function discordIdOf(user: User | null): string | null {
    const account = user?.externalAccounts.find(
        (a) => a.provider === "oauth_discord" || a.provider === "discord"
    );
    const id = account?.providerUserId ?? "";
    return /^\d+$/.test(id) ? id : null;
}

async function lookup(discordId: string): Promise<boolean | null> {
    const { token, guildId, roles } = settings();
    if (!token || !guildId) return false;
    const member = await discord(`/guilds/${guildId}/members/${discordId}`, token);
    if (member.status === 404) return false;
    if (!member.data) return null;
    const guild = await guildInfo(guildId, token);
    if (!guild) return null;
    if (guild.ownerId === discordId) return true;
    return (member.data.roles ?? []).some((id: string) => {
        const role = guild.roles.get(String(id));
        if (!role) return false;
        return (
            (role.permissions & ADMINISTRATOR) !== 0n ||
            roles.includes(role.name) ||
            roles.includes(String(id))
        );
    });
}

export async function canModerate(locals: APIContext["locals"]): Promise<boolean> {
    const { userId } = locals.auth();
    if (!userId) return false;

    const cached = memberCache.get(userId);
    if (cached && cached.expires > Date.now()) return cached.value;

    const discordId = discordIdOf(await locals.currentUser());
    const value = discordId ? await lookup(discordId) : false;
    if (value === null) return false;

    if (memberCache.size > 1000) {
        const now = Date.now();
        for (const [key, entry] of memberCache) {
            if (entry.expires <= now) memberCache.delete(key);
        }
    }
    memberCache.set(userId, { value, expires: Date.now() + MEMBER_TTL });
    return value;
}
