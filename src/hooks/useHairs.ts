import { useState, useCallback } from "react";
import type { Hair, Category, HairMeta } from "../types/hair";

export interface HairFetchParams {
    search?: string;
    category?: number;
    sort?: "recent" | "likes" | "oldest";
    myCreations?: boolean;
    page?: number;
    limit?: number;
}

// ── Estado
export function useHairs(initialCategories: Category[] = []) {
    const [hairs, setHairs] = useState<Hair[]>([]);
    const [meta, setMeta] = useState<HairMeta>({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
        canModerate: false,
    });
    const [categories] = useState<Category[]>(initialCategories);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

// ── Handlers
    const fetchHairs = useCallback(async (params: HairFetchParams = {}) => {
        setLoading(true);
        setError(null);

        const query = new URLSearchParams();
        if (params.search) query.set("search", params.search);
        if (params.category) query.set("category", String(params.category));
        if (params.sort) query.set("sort", params.sort);
        if (params.myCreations) query.set("myCreations", "true");
        if (params.page) query.set("page", String(params.page));
        if (params.limit) query.set("limit", String(params.limit));

        try {
            const res = await fetch(`/api/hairs?${query}`);
            if (!res.ok) throw new Error("Failed to fetch hairs");
            const { data, meta } = await res.json();
            setHairs(data);
            setMeta({ ...meta, canModerate: meta.canModerate ?? false });
        } catch (err) {
            console.error("Error loading hairs:", err);
            setError("Error al cargar el catálogo de cabellos.");
        } finally {
            setLoading(false);
        }
    }, []);

    const handleLikeToggleLocally = useCallback((hairId: number, liked: boolean) => {
        setHairs((prev) =>
            prev.map((h) => {
                if (h.id_hair !== hairId) return h;
                return {
                    ...h,
                    is_liked_by_user: liked,
                    _count: {
                        ...h._count,
                        likes: liked
                            ? (h._count?.likes ?? 0) + 1
                            : Math.max(0, (h._count?.likes ?? 0) - 1),
                    },
                };
            })
        );
    }, []);

    return {
        hairs,
        meta,
        categories,
        loading,
        error,
        fetchHairs,
        handleLikeToggleLocally,
    };
}
