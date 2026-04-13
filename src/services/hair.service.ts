import * as HairRepo from "../repositories/hair.repository";
import type { HairQueryParams } from "../repositories/hair.repository";
import { forbidden, notFound } from "../lib/api/response";

/**
 * Fetches a paginated list of hairs with server-side filtering and sorting.
 * Computes `is_liked_by_user` and `isOwner` before stripping internal fields.
 */
export async function getAllHairs(dbUserId: number | null, params: HairQueryParams) {
    const { hairs: rawHairs, total, page, limit } = await HairRepo.findHairsPaginated(
        dbUserId,
        params
    );

    const data = rawHairs.map((h) => {
        // Destructure internal/Prisma fields before spreading into the public response
        const { likes, artistId, ...rest } = h as typeof h & {
            likes?: unknown[];
            artistId: number;
        };
        return {
            ...rest,
            is_liked_by_user: Array.isArray(likes) && likes.length > 0,
            isOwner: dbUserId !== null && artistId === dbUserId,
        };
    });

    return {
        data,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
}

export async function getHairById(id: number) {
    const hair = await HairRepo.findHairById(id);
    if (!hair) return null;
    // Strip the internal FK from the public response
    const { artistId: _artistId, ...rest } = hair as typeof hair & { artistId: number };
    return rest;
}

export async function createHair(data: HairRepo.CreateHairData) {
    const hair = await HairRepo.createHair(data);
    // Strip artistId from the creation response as well
    const { artistId: _artistId, ...rest } = hair as typeof hair & { artistId: number };
    return rest;
}

type ServiceResult<T> = { error: Response } | { data: T };

export async function updateHair(
    hairId: number,
    clerkId: string,
    data: HairRepo.UpdateHairData
): Promise<ServiceResult<Omit<Awaited<ReturnType<typeof HairRepo.updateHair>>, "artistId">>> {
    const existing = await HairRepo.findHairWithArtist(hairId);
    if (!existing) return { error: notFound("Hair not found") };
    if (existing.artist.clerk_id !== clerkId) {
        return { error: forbidden("You do not own this hair") };
    }
    const updated = await HairRepo.updateHair(hairId, data);
    const { artistId: _artistId, ...rest } = updated as typeof updated & { artistId: number };
    return { data: rest };
}

export async function removeHair(
    hairId: number,
    clerkId: string
): Promise<ServiceResult<{ message: string }>> {
    const existing = await HairRepo.findHairWithArtist(hairId);
    if (!existing) return { error: notFound("Hair not found") };
    if (existing.artist.clerk_id !== clerkId) {
        return { error: forbidden("You do not own this hair") };
    }
    await HairRepo.deleteHair(hairId);
    return { data: { message: "Hair deleted successfully" } };
}
