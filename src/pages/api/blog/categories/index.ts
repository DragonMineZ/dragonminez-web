import type { APIRoute } from "astro";
import { ok } from "../../../../lib/api/response";
import { handlePrismaError } from "../../../../lib/api/errors";
import { blogCategoriesCache } from "../../../../repositories/blog.repository";
import * as BlogService from "../../../../services/blog.service";

const PUBLIC_CACHE = {
    "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
};

const CACHE_KEY = "blog:categories";

/**
 * GET /api/blog/categories
 * Returns all parent categories with their children[] nested.
 * Public endpoint, cached for 5 minutes.
 */
export const GET: APIRoute = async () => {
    const cached = blogCategoriesCache.get(CACHE_KEY);
    if (cached) return ok(cached, PUBLIC_CACHE);

    try {
        const categories = await BlogService.getCategories();
        blogCategoriesCache.set(CACHE_KEY, categories, 300_000);
        return ok(categories, PUBLIC_CACHE);
    } catch (err) {
        return handlePrismaError(err);
    }
};
