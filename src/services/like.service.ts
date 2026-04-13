import * as LikeRepo from "../repositories/like.repository";
import * as UserRepo from "../repositories/user.repository";
import { notFound } from "../lib/api/response";

type LikeResult = { error: Response } | { data: { liked: boolean } };

/**
 * Gives a like from a Clerk user to a hair.
 * Idempotent: if the like already exists it is not duplicated.
 */
export async function giveLike(clerkId: string, hairId: number): Promise<LikeResult> {
    const user = await UserRepo.findUserByClerkId(clerkId);
    if (!user) return { error: notFound("User not registered locally") };

    const existing = await LikeRepo.findLike(user.id_user, hairId);
    if (!existing) {
        await LikeRepo.createLike(user.id_user, hairId);
    }

    return { data: { liked: true } };
}

/**
 * Removes a like from a Clerk user on a hair.
 * Idempotent: if the like does not exist it is silently ignored.
 */
export async function removeLike(clerkId: string, hairId: number): Promise<LikeResult> {
    const user = await UserRepo.findUserByClerkId(clerkId);
    if (!user) return { error: notFound("User not registered locally") };

    const existing = await LikeRepo.findLike(user.id_user, hairId);
    if (existing) {
        await LikeRepo.deleteLike(user.id_user, hairId);
    }

    return { data: { liked: false } };
}
