import { useState, useCallback } from "react";
import type { BlogPost, BlogPostMeta } from "../types/blog";

export interface BlogFetchParams {
    search?: string;
    categoryId?: number;
    page?: number;
    limit?: number;
    mine?: boolean;
}

export function useBlogPosts() {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [meta, setMeta] = useState<BlogPostMeta>({
        total: 0,
        page: 1,
        limit: 9,
        totalPages: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPosts = useCallback(async (params: BlogFetchParams = {}) => {
        setLoading(true);
        setError(null);

        const query = new URLSearchParams();
        if (params.search) query.set("search", params.search);
        if (params.categoryId) query.set("categoryId", String(params.categoryId));
        if (params.page) query.set("page", String(params.page));
        if (params.limit) query.set("limit", String(params.limit));
        if (params.mine) query.set("mine", "true");

        try {
            const res = await fetch(`/api/blog/posts?${query}`);
            if (!res.ok) throw new Error("Failed to fetch posts");
            const { posts: fetchedPosts, meta: fetchedMeta } = await res.json();
            setPosts(fetchedPosts);
            setMeta(fetchedMeta);
        } catch (err) {
            console.error("Error loading posts:", err);
            setError("common.connectionError");
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        posts,
        meta,
        loading,
        error,
        fetchPosts,
    };
}
