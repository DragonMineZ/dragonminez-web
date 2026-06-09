import { prisma } from "../lib/prisma";
import type { Prisma } from "../generated/client/client";
import { TtlCache } from "../lib/api/cache";

// ── Caches
export const blogPostsCache = new TtlCache<unknown>(200);
export const blogCategoriesCache = new TtlCache<unknown>(1);

// ── Selects
const publicAuthorSelect = {
    username: true,
    avatar_url: true,
} as const;

const publicCategorySelect = {
    id_category: true,
    name: true,
    slug: true,
    description: true,
    parentId: true,
    parent: {
        select: {
            id_category: true,
            name: true,
            slug: true,
            description: true,
            parentId: true,
        },
    },
} as const;

// ── Query params
export interface BlogPostQueryParams {
    search?: string;
    /** category id — if parent, includes children posts too */
    categoryId?: number;
    page?: number;
    limit?: number;
    /** include own drafts (only when mine=true AND authenticated) */
    includeMine?: boolean;
    authorDbId?: number;
}

// ── Create/Update types
export interface CreatePostData {
    title: string;
    slug: string;
    content: string;
    excerpt?: string | null;
    cover_image_url?: string | null;
    categoryId?: number | null;
    published: boolean;
    authorId: number;
}

export interface UpdatePostData {
    title?: string;
    slug?: string;
    content?: string;
    excerpt?: string | null;
    cover_image_url?: string | null;
    categoryId?: number | null;
    published?: boolean;
}

// ── Repository
export async function findCategoriesWithChildren() {
    return prisma.blogCategory.findMany({
        where: { parentId: null },
        select: {
            id_category: true,
            name: true,
            slug: true,
            description: true,
            parentId: true,
            children: {
                select: {
                    id_category: true,
                    name: true,
                    slug: true,
                    description: true,
                    parentId: true,
                },
                orderBy: { name: "asc" },
            },
        },
        orderBy: { name: "asc" },
    });
}

export async function findCategoryById(id: number) {
    return prisma.blogCategory.findUnique({ where: { id_category: id } });
}

/** Returns all descendant category ids for a given parent (including itself). */
async function getDescendantCategoryIds(categoryId: number): Promise<number[]> {
    const cat = await prisma.blogCategory.findUnique({
        where: { id_category: categoryId },
        include: { children: { select: { id_category: true } } },
    });
    if (!cat) return [categoryId];
    return [categoryId, ...cat.children.map((c) => c.id_category)];
}

export async function findPostsPaginated(params: BlogPostQueryParams) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(1, params.limit ?? 9));
    const skip = (page - 1) * limit;

    // Resolve which categories to filter
    let categoryIds: number[] | undefined;
    if (params.categoryId) {
        categoryIds = await getDescendantCategoryIds(params.categoryId);
    }

    // Visibility filter: published OR (mine && includeMine)
    const publishedFilter: Prisma.BlogPostWhereInput =
        params.includeMine && params.authorDbId
            ? {
                  OR: [
                      { published: true },
                      { published: false, authorId: params.authorDbId },
                  ],
              }
            : { published: true };

    const where: Prisma.BlogPostWhereInput = {
        ...publishedFilter,
        ...(params.search
            ? {
                  OR: [
                      { title: { contains: params.search, mode: "insensitive" } },
                      { excerpt: { contains: params.search, mode: "insensitive" } },
                  ],
              }
            : {}),
        ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
    };

    const [total, posts] = await Promise.all([
        prisma.blogPost.count({ where }),
        prisma.blogPost.findMany({
            where,
            orderBy: { created_at: "desc" },
            skip,
            take: limit,
            include: {
                author: { select: publicAuthorSelect },
                category: { select: publicCategorySelect },
            },
        }),
    ]);

    return { posts, total, page, limit };
}

export async function findPostBySlug(slug: string) {
    return prisma.blogPost.findUnique({
        where: { slug },
        include: {
            author: { select: publicAuthorSelect },
            category: { select: publicCategorySelect },
        },
    });
}

export async function findPostById(id: number) {
    return prisma.blogPost.findUnique({
        where: { id_post: id },
        include: {
            author: { select: publicAuthorSelect },
            category: { select: publicCategorySelect },
        },
    });
}

export async function findPostWithAuthor(id: number) {
    return prisma.blogPost.findUnique({
        where: { id_post: id },
        include: { author: true },
    });
}

/** Server-side only: includes the author's clerk_id for ownership checks. */
export async function findPostBySlugWithAuthor(slug: string) {
    return prisma.blogPost.findUnique({
        where: { slug },
        include: {
            author: { select: { ...publicAuthorSelect, clerk_id: true } },
            category: { select: publicCategorySelect },
        },
    });
}

export async function createPost(data: CreatePostData) {
    return prisma.blogPost.create({
        data: {
            title: data.title,
            slug: data.slug,
            content: data.content,
            excerpt: data.excerpt,
            cover_image_url: data.cover_image_url,
            published: data.published,
            author: { connect: { id_user: data.authorId } },
            category: data.categoryId
                ? { connect: { id_category: data.categoryId } }
                : undefined,
        },
        include: {
            author: { select: publicAuthorSelect },
            category: { select: publicCategorySelect },
        },
    });
}

export async function updatePost(id: number, data: UpdatePostData) {
    return prisma.blogPost.update({
        where: { id_post: id },
        data: {
            title: data.title,
            slug: data.slug,
            content: data.content,
            excerpt: data.excerpt,
            cover_image_url: data.cover_image_url,
            published: data.published,
            category:
                data.categoryId !== undefined
                    ? data.categoryId
                        ? { connect: { id_category: data.categoryId } }
                        : { disconnect: true }
                    : undefined,
        },
        include: {
            author: { select: publicAuthorSelect },
            category: { select: publicCategorySelect },
        },
    });
}

export async function deletePost(id: number) {
    return prisma.blogPost.delete({ where: { id_post: id } });
}

/** Check if a slug already exists (optionally excluding a specific post id). */
export async function slugExists(slug: string, excludeId?: number): Promise<boolean> {
    const post = await prisma.blogPost.findUnique({ where: { slug } });
    if (!post) return false;
    if (excludeId && post.id_post === excludeId) return false;
    return true;
}
