import * as BlogRepo from "../repositories/blog.repository";
import type { BlogPostQueryParams } from "../repositories/blog.repository";
import { forbidden, notFound } from "../lib/api/response";
import { slugify } from "../lib/markdown";
import { readingTimeMinutes } from "../lib/markdown";

// ── Helpers

function attachReadingTime<T extends { content: string }>(post: T) {
    const { content, ...rest } = post;
    return { ...rest, content, readingTime: readingTimeMinutes(content) };
}

function stripAuthorId<T extends { authorId: unknown }>(post: T) {
    const { authorId: _authorId, ...rest } = post;
    return rest;
}

type ServiceResult<T> = { error: Response } | { data: T };

// ── Unique slug helper
async function buildUniqueSlug(title: string, excludeId?: number): Promise<string> {
    const base = slugify(title);
    if (!(await BlogRepo.slugExists(base, excludeId))) return base;
    for (let i = 2; i <= 100; i++) {
        const candidate = `${base}-${i}`;
        if (!(await BlogRepo.slugExists(candidate, excludeId))) return candidate;
    }
    // Fallback: append timestamp
    return `${base}-${Date.now()}`;
}

// ── Categories service
export async function getCategories() {
    return BlogRepo.findCategoriesWithChildren();
}

// ── Posts service
export async function getPosts(params: BlogPostQueryParams) {
    const { posts: rawPosts, total, page, limit } = await BlogRepo.findPostsPaginated(params);

    const posts = rawPosts.map((p) => {
        const withTime = attachReadingTime(p);
        return stripAuthorId(withTime as typeof withTime & { authorId: unknown });
    });

    return {
        posts,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
}

export async function getPostBySlug(slug: string) {
    const post = await BlogRepo.findPostBySlug(slug);
    if (!post) return null;
    const withTime = attachReadingTime(post);
    return stripAuthorId(withTime as typeof withTime & { authorId: unknown });
}

export async function getPostById(id: number) {
    const post = await BlogRepo.findPostById(id);
    if (!post) return null;
    const withTime = attachReadingTime(post);
    return stripAuthorId(withTime as typeof withTime & { authorId: unknown });
}

export async function createPost(
    data: Omit<BlogRepo.CreatePostData, "slug">
): Promise<ServiceResult<Awaited<ReturnType<typeof BlogRepo.createPost>>>> {
    // Validate category
    if (data.categoryId) {
        const cat = await BlogRepo.findCategoryById(data.categoryId);
        if (!cat) return { error: notFound("errors.api.invalidReference") };
    }

    const slug = await buildUniqueSlug(data.title);

    try {
        const post = await BlogRepo.createPost({ ...data, slug });
        BlogRepo.blogPostsCache.clear();
        return { data: post };
    } catch (err) {
        throw err;
    }
}

export async function updatePost(
    postId: number,
    clerkId: string,
    data: BlogRepo.UpdatePostData & { categoryId?: number | null }
): Promise<ServiceResult<Awaited<ReturnType<typeof BlogRepo.updatePost>>>> {
    const existing = await BlogRepo.findPostWithAuthor(postId);
    if (!existing) return { error: notFound("errors.api.postNotFound") };
    if (existing.author.clerk_id !== clerkId) {
        return { error: forbidden("errors.api.notOwned") };
    }

    // Validate category if provided
    if (data.categoryId) {
        const cat = await BlogRepo.findCategoryById(data.categoryId);
        if (!cat) return { error: notFound("errors.api.invalidReference") };
    }

    // Regenerate slug only if title changed
    let slug = data.slug;
    if (data.title && data.title !== existing.title) {
        slug = await buildUniqueSlug(data.title, postId);
    }

    const updated = await BlogRepo.updatePost(postId, { ...data, slug });
    BlogRepo.blogPostsCache.clear();
    return { data: updated };
}

export async function deletePost(
    postId: number,
    clerkId: string,
    canModerateBlog: boolean
): Promise<ServiceResult<{ message: string }>> {
    const existing = await BlogRepo.findPostWithAuthor(postId);
    if (!existing) return { error: notFound("errors.api.postNotFound") };

    const isOwner = existing.author.clerk_id === clerkId;
    if (!isOwner && !canModerateBlog) {
        return { error: forbidden("errors.api.forbidden") };
    }

    await BlogRepo.deletePost(postId);
    BlogRepo.blogPostsCache.clear();
    return { data: { message: "Post deleted successfully" } };
}
