import type { APIRoute } from "astro";
import {
    ok,
    badRequest,
    notFound,
    noContent,
} from "../../../../lib/api/response";
import { withAuth } from "../../../../lib/api/guards";
import { parseId } from "../../../../lib/api/params";
import { handlePrismaError } from "../../../../lib/api/errors";
import * as BlogService from "../../../../services/blog.service";
import { getUserPermissions } from "../../../../services/permission.service";
import { updatePostSchema, validatePostBody } from "../../../../lib/api/blog-schemas";

const PUBLIC_CACHE = {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
};

/**
 * GET /api/blog/posts/[id]
 * Public for published posts. Owner or moderator can see drafts.
 */
export const GET: APIRoute = async (context) => {
    const { params, locals } = context;
    const postId = parseId(params.id);
    if (!postId) return badRequest("Post id must be a positive integer");

    const { userId } = locals.auth();

    try {
        const post = await BlogService.getPostById(postId);
        if (!post) return notFound("errors.api.postNotFound");

        // Draft guard: only owner or moderator
        if (!post.published) {
            if (!userId) return notFound("errors.api.postNotFound");
            // We need to check if the requester is the owner or moderator
            // post doesn't have authorId exposed (stripped by service), so we fetch raw
            const { findPostWithAuthor } = await import("../../../../repositories/blog.repository");
            const rawPost = await findPostWithAuthor(postId);
            if (!rawPost) return notFound("errors.api.postNotFound");

            const isOwner = rawPost.author.clerk_id === userId;
            if (!isOwner) {
                const perms = await getUserPermissions(context, userId);
                if (!perms.canModerateBlog) return notFound("errors.api.postNotFound");
            }
            // Draft visible only to owner/moderator — never share-cache it
            return ok(post, { "Cache-Control": "private, no-store" });
        }

        return ok(post, PUBLIC_CACHE);
    } catch (err) {
        return handlePrismaError(err);
    }
};

/**
 * PATCH /api/blog/posts/[id]
 * Partial update. Requires auth + canPostBlog + ownership.
 */
export const PATCH = withAuth(async (context, userId) => {
    const postId = parseId(context.params.id);
    if (!postId) return badRequest("Post id must be a positive integer");

    const perms = await getUserPermissions(context, userId);
    if (!perms.canPostBlog) {
        const { forbidden } = await import("../../../../lib/api/response");
        return forbidden("errors.api.forbidden");
    }

    let body: unknown;
    try {
        body = await context.request.json();
    } catch {
        return badRequest("errors.api.badRequest");
    }

    const validation = validatePostBody(updatePostSchema, body);
    if (!validation.success) return validation.error;

    try {
        const result = await BlogService.updatePost(postId, userId, validation.data);
        if ("error" in result) return result.error;
        return ok(result.data);
    } catch (err) {
        return handlePrismaError(err);
    }
});

/**
 * DELETE /api/blog/posts/[id]
 * Owner OR canModerateBlog.
 */
export const DELETE = withAuth(async (context, userId) => {
    const postId = parseId(context.params.id);
    if (!postId) return badRequest("Post id must be a positive integer");

    const perms = await getUserPermissions(context, userId);

    try {
        const result = await BlogService.deletePost(postId, userId, perms.canModerateBlog);
        if ("error" in result) return result.error;
        return noContent();
    } catch (err) {
        return handlePrismaError(err);
    }
});
