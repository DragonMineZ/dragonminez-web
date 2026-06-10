import type { APIRoute } from "astro";
import {
    ok,
    created,
    badRequest,
    forbidden,
} from "../../../../lib/api/response";
import { withAuth } from "../../../../lib/api/guards";
import { handlePrismaError } from "../../../../lib/api/errors";
import { blogPostsCache } from "../../../../repositories/blog.repository";
import * as BlogService from "../../../../services/blog.service";
import { getUserPermissions } from "../../../../services/permission.service";
import { getUserByClerkId } from "../../../../services/user.service";
import { createPostSchema, validatePostBody } from "../../../../lib/api/blog-schemas";

const PUBLIC_CACHE = {
    "Cache-Control": "public, s-maxage=30, stale-while-revalidate=15",
};

/**
 * GET /api/blog/posts
 * Public paginated list. Supports: page, limit (default 9, max 50),
 * categoryId, search, mine (only for authenticated authors).
 */
export const GET: APIRoute = async (context) => {
    const { request, locals } = context;
    const { userId } = locals.auth();

    const url = new URL(request.url);
    const pageParam = url.searchParams.get("page");
    const limitParam = url.searchParams.get("limit");
    const categoryParam = url.searchParams.get("categoryId");
    const search = url.searchParams.get("search") ?? undefined;
    const mine = url.searchParams.get("mine") === "true";

    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? parseInt(limitParam, 10) : 9;

    let categoryId: number | undefined;
    if (categoryParam) {
        const parsed = parseInt(categoryParam, 10);
        if (isNaN(parsed) || parsed <= 0) {
            return badRequest("categoryId must be a positive integer");
        }
        categoryId = parsed;
    }

    let authorDbId: number | undefined;
    let includeMine = false;

    if (userId && mine) {
        const perms = await getUserPermissions(context, userId);
        if (perms.canPostBlog) {
            const dbUser = await getUserByClerkId(userId);
            if (dbUser) {
                authorDbId = dbUser.id_user;
                includeMine = true;
            }
        }
    }

    // Use cache only for anonymous non-filtered requests
    if (!userId && !mine) {
        const cacheKey = url.search || "?";
        const cached = blogPostsCache.get(cacheKey);
        if (cached) return ok(cached, PUBLIC_CACHE);

        try {
            const result = await BlogService.getPosts({
                page: isNaN(page) || page < 1 ? 1 : page,
                limit: isNaN(limit) || limit < 1 ? 9 : Math.min(limit, 50),
                categoryId,
                search,
                includeMine: false,
            });
            blogPostsCache.set(cacheKey, result, 30_000);
            return ok(result, PUBLIC_CACHE);
        } catch (err) {
            return handlePrismaError(err);
        }
    }

    try {
        const result = await BlogService.getPosts({
            page: isNaN(page) || page < 1 ? 1 : page,
            limit: isNaN(limit) || limit < 1 ? 9 : Math.min(limit, 50),
            categoryId,
            search,
            includeMine,
            authorDbId,
        });
        return ok(result);
    } catch (err) {
        return handlePrismaError(err);
    }
};

/**
 * POST /api/blog/posts
 * Create a new blog post. Requires auth + canPostBlog permission.
 */
export const POST = withAuth(async (context, userId) => {
    // Permission check
    const perms = await getUserPermissions(context, userId);
    if (!perms.canPostBlog) {
        return forbidden("errors.api.forbidden");
    }

    // Resolve local db user
    const dbUser = await getUserByClerkId(userId);
    if (!dbUser) {
        return forbidden("errors.api.unauthorized");
    }

    // Parse body
    let body: unknown;
    try {
        body = await context.request.json();
    } catch {
        return badRequest("errors.api.badRequest");
    }

    const validation = validatePostBody(createPostSchema, body);
    if (!validation.success) return validation.error;

    const { title, content, excerpt, cover_image_url, categoryId, published } = validation.data;

    try {
        const result = await BlogService.createPost({
            title,
            content,
            excerpt: excerpt ?? null,
            cover_image_url: cover_image_url ?? null,
            categoryId: categoryId ?? null,
            published: published ?? true,
            authorId: dbUser.id_user,
        });

        if ("error" in result) return result.error;
        return created(result.data);
    } catch (err) {
        return handlePrismaError(err);
    }
});
