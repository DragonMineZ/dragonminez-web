import type { APIRoute } from "astro";
import { ok } from "../../../lib/api/response";
import { handlePrismaError } from "../../../lib/api/errors";
import { categoriesCache } from "../../../lib/api/cache";
import { getAllCategories } from "../../../services/category.service";

/**
 * GET /api/categories
 * Categories change rarely (admin-only operation) — cached for 5 minutes.
 * Cache is in-process: restart server to force a refresh if needed.
 */
export const GET: APIRoute = async () => {
    const cached = categoriesCache.get("categories");
    if (cached) return ok(cached);

    try {
        const categories = await getAllCategories();
        categoriesCache.set("categories", categories, 300_000); // 5 minutes
        return ok(categories);
    } catch (err) {
        return handlePrismaError(err);
    }
};
