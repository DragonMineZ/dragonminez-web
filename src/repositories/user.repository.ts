import { prisma } from "../lib/prisma";

export async function findUserByClerkId(clerkId: string) {
    return prisma.user.findUnique({ where: { clerk_id: clerkId } });
}

/** Returns user fields safe for external consumption (excludes clerk_id). */
export async function findUserProfile(clerkId: string) {
    return prisma.user.findUnique({
        where: { clerk_id: clerkId },
        select: { id_user: true, username: true, email: true, avatar_url: true },
    });
}

export async function findUserById(id: number) {
    return prisma.user.findUnique({ where: { id_user: id } });
}

export interface UpsertUserData {
    clerkId: string;
    username: string;
    email: string;
    avatarUrl: string;
}

export async function upsertUser(data: UpsertUserData) {
    return prisma.user.upsert({
        where: { clerk_id: data.clerkId },
        update: {
            username: data.username,
            email: data.email,
            avatar_url: data.avatarUrl,
        },
        create: {
            clerk_id: data.clerkId,
            username: data.username,
            email: data.email,
            avatar_url: data.avatarUrl,
        },
    });
}

export async function deleteUser(clerkId: string) {
    return prisma.user
        .delete({ where: { clerk_id: clerkId } })
        .catch(() => {});
}
