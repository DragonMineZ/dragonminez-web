/**
 * Discord-based role permissions.
 *
 * Users sign in through Clerk with Discord. Their roles inside the DMZ
 * Discord server (guild) determine what they can do on the website:
 *
 *  - "DMZ Author" role    → can publish blog posts and delete any hairsalon item.
 *  - "DMZ Moderator" role → can delete any hairsalon item and any blog post.
 *
 * Role lookup strategies (first available wins):
 *  1. Bot token  — `DISCORD_BOT_TOKEN` queries the guild member directly via
 *     the user's Discord id from their Clerk external account.
 *  2. OAuth token — the user's Discord OAuth access token from Clerk; needs
 *     the `guilds.members.read` scope enabled on Clerk's Discord connection.
 *
 * Required env vars: DISCORD_GUILD_ID, DISCORD_AUTHOR_ROLE_ID,
 * DISCORD_MODERATOR_ROLE_ID and optionally DISCORD_BOT_TOKEN.
 */
import type { APIContext } from "astro";
import { clerkClient } from "@clerk/astro/server";
import { TtlCache } from "../lib/api/cache";

export interface UserPermissions {
    /** The Clerk account has a linked Discord account. */
    hasDiscord: boolean;
    isAuthor: boolean;
    isModerator: boolean;
    canPostBlog: boolean;
    canModerateBlog: boolean;
    canModerateSalon: boolean;
}

export const NO_PERMISSIONS: UserPermissions = {
    hasDiscord: false,
    isAuthor: false,
    isModerator: false,
    canPostBlog: false,
    canModerateBlog: false,
    canModerateSalon: false,
};

const DISCORD_API = "https://discord.com/api/v10";
const PERMISSIONS_TTL_MS = 5 * 60 * 1000;
const permissionsCache = new TtlCache<UserPermissions>(1000);

function env(name: string): string | undefined {
    return process.env[name] ?? (import.meta.env as Record<string, string | undefined>)[name];
}

function buildPermissions(hasDiscord: boolean, roleIds: string[]): UserPermissions {
    const authorRole = env("DISCORD_AUTHOR_ROLE_ID");
    const moderatorRole = env("DISCORD_MODERATOR_ROLE_ID");

    const isAuthor = !!authorRole && roleIds.includes(authorRole);
    const isModerator = !!moderatorRole && roleIds.includes(moderatorRole);

    return {
        hasDiscord,
        isAuthor,
        isModerator,
        canPostBlog: isAuthor,
        canModerateBlog: isModerator,
        canModerateSalon: isAuthor || isModerator,
    };
}

async function fetchRolesWithBotToken(discordUserId: string): Promise<string[] | null> {
    const botToken = env("DISCORD_BOT_TOKEN");
    const guildId = env("DISCORD_GUILD_ID");
    if (!botToken || !guildId) return null;

    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${discordUserId}`, {
        headers: { Authorization: `Bot ${botToken}` },
    });
    if (res.status === 404) return []; // not a guild member → no roles
    if (!res.ok) return null;

    const member = (await res.json()) as { roles?: string[] };
    return member.roles ?? [];
}

async function fetchRolesWithOauthToken(
    context: APIContext,
    clerkUserId: string,
): Promise<string[] | null> {
    const guildId = env("DISCORD_GUILD_ID");
    if (!guildId) return null;

    let token: string | undefined;
    try {
        const tokens = await clerkClient(context).users.getUserOauthAccessToken(
            clerkUserId,
            "discord",
        );
        token = tokens.data[0]?.token;
    } catch {
        return null;
    }
    if (!token) return null;

    const res = await fetch(`${DISCORD_API}/users/@me/guilds/${guildId}/member`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 404) return [];
    if (!res.ok) return null;

    const member = (await res.json()) as { roles?: string[] };
    return member.roles ?? [];
}

/**
 * Resolves the website permissions of a signed-in user from their Discord
 * roles. Results are cached for 5 minutes per user. Fails closed: any
 * lookup error yields no elevated permissions.
 */
export async function getUserPermissions(
    context: APIContext,
    clerkUserId: string | null | undefined,
): Promise<UserPermissions> {
    if (!clerkUserId) return NO_PERMISSIONS;

    const cached = permissionsCache.get(clerkUserId);
    if (cached) return cached;

    let permissions = NO_PERMISSIONS;
    try {
        const user = await clerkClient(context).users.getUser(clerkUserId);
        const discordAccount = user.externalAccounts.find(
            (acc) => acc.provider === "discord" || acc.provider === "oauth_discord",
        );

        if (discordAccount) {
            let roles = await fetchRolesWithBotToken(discordAccount.providerUserId);
            if (roles === null) {
                roles = await fetchRolesWithOauthToken(context, clerkUserId);
            }
            permissions = buildPermissions(true, roles ?? []);
        }
    } catch (err) {
        console.error(
            JSON.stringify({
                level: "error",
                scope: "permissions",
                message: "Failed to resolve Discord permissions",
                error: err instanceof Error ? err.message : String(err),
            }),
        );
        return NO_PERMISSIONS; // not cached → retried on next request
    }

    permissionsCache.set(clerkUserId, permissions, PERMISSIONS_TTL_MS);
    return permissions;
}

/** Drops a user's cached permissions (e.g. after roles visibly changed). */
export function invalidatePermissions(clerkUserId: string): void {
    permissionsCache.invalidate(clerkUserId);
}
