import * as UserRepo from "../repositories/user.repository";

export async function getUserByClerkId(clerkId: string) {
    return UserRepo.findUserByClerkId(clerkId);
}

export async function getUserProfile(clerkId: string) {
    return UserRepo.findUserProfile(clerkId);
}

interface ClerkUserPayload {
    id: string;
    email_addresses?: { email_address: string }[];
    username?: string | null;
    first_name?: string | null;
    image_url?: string;
}

export async function syncFromClerk(
    type: string,
    data: ClerkUserPayload
): Promise<{ message: string }> {
    if (type === "user.created" || type === "user.updated") {
        const clerkId = data.id;
        const email = data.email_addresses?.[0]?.email_address ?? "";
        const username =
            data.username ?? data.first_name ?? `user_${clerkId.slice(0, 8)}`;
        const avatarUrl = data.image_url ?? "";

        await UserRepo.upsertUser({ clerkId, username, email, avatarUrl });
        return { message: "User synced" };
    }

    if (type === "user.deleted") {
        const clerkId = data.id;
        await UserRepo.deleteUser(clerkId);
        return { message: "User deleted" };
    }

    return { message: "Event ignored" };
}

