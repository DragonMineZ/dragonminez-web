import { createHash } from "crypto";
import { prisma } from "../lib/prisma";
import type { Prisma } from "../generated/client/client";

function computeCodeHash(code: string): string {
    return createHash("sha256").update(code).digest("hex");
}

const publicArtistSelect = {
    username: true,
    avatar_url: true,
} as const;

export interface HairQueryParams {
    search?: string;
    categoryId?: number;
    sort?: "recent" | "likes" | "oldest";
    page?: number;
    limit?: number;
    artistId?: number;
}

export interface CreateHairData {
    name: string;
    code: string;
    image_url: string;
    description?: string | null;
    clerkId: string;
    categoryIds?: number[];
}

export async function findHairsPaginated(dbUserId: number | null, params: HairQueryParams) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(1, params.limit ?? 10));
    const skip = (page - 1) * limit;

    const where: Prisma.HairWhereInput = {
        ...(params.search
            ? {
                  OR: [
                      { name: { contains: params.search, mode: "insensitive" } },
                      { description: { contains: params.search, mode: "insensitive" } },
                  ],
              }
            : {}),
        ...(params.categoryId
            ? { categories: { some: { id_category: params.categoryId } } }
            : {}),
        ...(params.artistId ? { artistId: params.artistId } : {}),
    };

    const orderBy: Prisma.HairOrderByWithRelationInput =
        params.sort === "likes"
            ? { likes: { _count: "desc" } }
            : params.sort === "oldest"
            ? { created_at: "asc" }
            : { created_at: "desc" };

    const [total, hairs] = await Promise.all([
        prisma.hair.count({ where }),
        prisma.hair.findMany({
            where,
            orderBy,
            skip,
            take: limit,
            include: {
                categories: true,
                artist: { select: publicArtistSelect },
                likes: dbUserId !== null ? { where: { id_user: dbUserId } } : false,
                _count: { select: { likes: true } },
            },
        }),
    ]);

    return { hairs, total, page, limit };
}

export async function findHairById(id: number) {
    return prisma.hair.findUnique({
        where: { id_hair: id },
        include: {
            categories: true,
            artist: { select: publicArtistSelect },
            _count: { select: { likes: true } },
        },
    });
}

export async function findHairWithArtist(id: number) {
    return prisma.hair.findUnique({
        where: { id_hair: id },
        include: { artist: true },
    });
}

export async function createHair(data: CreateHairData) {
    return prisma.hair.create({
        data: {
            name: data.name,
            code: data.code,
            code_hash: computeCodeHash(data.code),
            image_url: data.image_url,
            description: data.description,
            artist: { connect: { clerk_id: data.clerkId } },
            categories: data.categoryIds
                ? { connect: data.categoryIds.map((id) => ({ id_category: id })) }
                : undefined,
        },
        include: {
            categories: true,
            artist: { select: publicArtistSelect },
            _count: { select: { likes: true } },
        },
    });
}

export interface UpdateHairData {
    name?: string;
    code?: string;
    image_url?: string;
    description?: string | null;
    categoryIds?: number[];
}

export async function updateHair(id: number, data: UpdateHairData) {
    return prisma.hair.update({
        where: { id_hair: id },
        data: {
            name: data.name,
            code: data.code,
            code_hash: data.code ? computeCodeHash(data.code) : undefined,
            image_url: data.image_url,
            description: data.description,
            categories: data.categoryIds
                ? { set: data.categoryIds.map((id) => ({ id_category: id })) }
                : undefined,
        },
        include: {
            categories: true,
            artist: { select: publicArtistSelect },
            _count: { select: { likes: true } },
        },
    });
}

export async function deleteHair(id: number) {
    return prisma.$transaction([
        prisma.like.deleteMany({ where: { id_hair: id } }),
        prisma.hair.delete({ where: { id_hair: id } }),
    ]);
}

