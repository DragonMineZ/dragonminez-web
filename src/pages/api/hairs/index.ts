import type { APIRoute } from "astro";
import { ok, badRequest, serverError } from "../../../lib/api/response";
import { withAuth } from "../../../lib/api/guards";
import { parseId } from "../../../lib/api/params";
import { validateBody, createHairSchema } from "../../../lib/api/schemas";
import { handlePrismaError } from "../../../lib/api/errors";
import { hairsCache } from "../../../lib/api/cache";
import * as HairService from "../../../services/hair.service";
import { getUserByClerkId } from "../../../services/user.service";
import type { HairQueryParams } from "../../../repositories/hair.repository";

const PUBLIC_CACHE = {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
};

// ── Handlers
export const GET: APIRoute = async ({ request, locals }) => {

    const { userId } = locals.auth();
    let dbUserId: number | null = null;

    if (userId) {
        const dbUser = await getUserByClerkId(userId);
        dbUserId = dbUser?.id_user ?? null;
    }

    const url = new URL(request.url);
    const search = url.searchParams.get("search") ?? undefined;
    const categoryParam = url.searchParams.get("category");
    const sortParam = url.searchParams.get("sort");
    const pageParam = url.searchParams.get("page");
    const limitParam = url.searchParams.get("limit");
    const myCreations = url.searchParams.get("myCreations") === "true";

    let categoryId: number | undefined;
    if (categoryParam) {
        const parsed = parseInt(categoryParam, 10);
        if (isNaN(parsed) || parsed <= 0) {
            return badRequest("category must be a positive integer");
        }
        categoryId = parsed;
    }

    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    const params: HairQueryParams = {
        search,
        categoryId,
        sort: (["recent", "likes", "oldest"].includes(sortParam ?? "")
            ? sortParam
            : "recent") as HairQueryParams["sort"],
        page: isNaN(page) || page < 1 ? 1 : page,
        limit: isNaN(limit) || limit < 1 ? 10 : Math.min(limit, 50),
        artistId: myCreations && dbUserId ? dbUserId : undefined,
    };

    // ── Cache
    if (!userId && !myCreations) {
        const cacheKey = url.search || "?";
        const cached = hairsCache.get(cacheKey);
        if (cached) return ok(cached, PUBLIC_CACHE);

        try {
            const result = await HairService.getAllHairs(null, params);
            hairsCache.set(cacheKey, result, 30_000);
            return ok(result, PUBLIC_CACHE);

        } catch (err) {
            return handlePrismaError(err);
        }
    }

    try {
        const result = await HairService.getAllHairs(dbUserId, params);
        return ok(result, PUBLIC_CACHE);

    } catch (err) {
        return handlePrismaError(err);
    }
};

export const POST = withAuth(async ({ request }, userId) => {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return badRequest("Could not parse request body as JSON");
    }

    const validation = validateBody(createHairSchema, body);
    if (!validation.success) return validation.error;

    const { name, code, image_url, description, categoryIds } = validation.data;

    try {
        const hair = await HairService.createHair({
            name,
            code,
            image_url,
            description,
            clerkId: userId,
            categoryIds,
        });
        hairsCache.clear();
        return ok(hair);
    } catch (err) {
        return handlePrismaError(err);
    }
});

