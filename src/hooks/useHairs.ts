import { useState, useEffect } from "react";
import type { Hair, Category } from "../types/hair";

export function useHairs(initialHairs: Hair[] = [], initialCategories: Category[] = []) {
    const [hairs, setHairs] = useState<Hair[]>(initialHairs);
    const [categories, setCategories] = useState<Category[]>(initialCategories);
    const [loading, setLoading] = useState(initialHairs.length === 0);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [hairsRes, catsRes] = await Promise.all([
                fetch("/api/hairs"),
                fetch("/api/categories")
            ]);

            if (!hairsRes.ok || !catsRes.ok) {
                throw new Error("Failed to fetch data");
            }

            const hairsData = await hairsRes.json();
            const catsData = await catsRes.json();

            setHairs(hairsData);
            setCategories(catsData);
        } catch (err) {
            console.error("Error loading data", err);
            setError("Error al cargar el catálogo de cabellos.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (initialHairs.length === 0) {
            fetchData();
        }
    }, [initialHairs.length]);

    const handleDeleteLocally = (id: number) => {
        setHairs((prev) => prev.filter((h: Hair) => h.id_hair !== id));
    };

    const handleLikeToggleLocally = (hairId: number, liked: boolean) => {
        setHairs((prevHairs) => prevHairs.map((h) => {
            if (h.id_hair === hairId) {
                const currentLikes = h._count?.likes || 0;
                return {
                    ...h,
                    is_liked_by_user: liked,
                    _count: {
                        ...h._count,
                        likes: liked ? currentLikes + 1 : Math.max(0, currentLikes - 1)
                    }
                };
            }
            return h;
        }));
    };

    return {
        hairs,
        categories,
        loading,
        error,
        fetchData,
        handleDeleteLocally,
        handleLikeToggleLocally
    };
}
