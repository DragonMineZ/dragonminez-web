// ── Blog client-side types

export interface BlogAuthor {
    username: string;
    avatar_url: string | null;
}

export interface BlogCategoryBase {
    id_category: number;
    name: string;
    slug: string;
    description: string | null;
    parentId: number | null;
}

export interface BlogCategory extends BlogCategoryBase {
    children: BlogCategoryBase[];
}

/** Alias used by hooks/components for clarity. */
export type BlogCategoryWithChildren = BlogCategory;

export interface BlogPost {
    id_post: number;
    title: string;
    slug: string;
    excerpt: string | null;
    cover_image_url: string | null;
    published: boolean;
    created_at: string | Date;
    updated_at: string | Date;
    author: BlogAuthor;
    category: BlogCategoryBase & { parent?: BlogCategoryBase | null } | null;
    /** reading time derived from content length; returned by API */
    readingTime?: number;
    /** whether the request is from the post owner (API injects this) */
    isOwner?: boolean;
}

export interface BlogPostDetail extends BlogPost {
    content: string;
}

export interface BlogPostMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface BlogPostsResponse {
    posts: BlogPost[];
    meta: BlogPostMeta;
}
