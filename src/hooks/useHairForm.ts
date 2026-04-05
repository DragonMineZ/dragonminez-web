import { useState, useEffect } from "react";
import { useAuth } from "@clerk/astro/react";
import type { Category, Hair } from "../components/types/hair";

export function useHairForm(initialData?: Hair, onSuccess?: () => void) {
    const { isLoaded, isSignedIn, getToken } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fetchingUser, setFetchingUser] = useState(true);
    const [currentUser, setCurrentUser] = useState<{ id_user: number } | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<number[]>(
        initialData?.categories?.map((c) => c.id_category) || []
    );
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        name: initialData?.name || "",
        code: initialData?.code || "",
        image_url: initialData?.image_url || "",
        description: initialData?.description || "",
    });

    const isEditing = !!initialData;

    useEffect(() => {
        const fetchData = async () => {
            if (isLoaded && isSignedIn) {
                const token = await getToken();
                // Fetch User
                const userRes = await fetch("/api/user/me", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (userRes.ok) {
                    const user = await userRes.json();
                    setCurrentUser(user);
                }
                // Fetch Categories
                try {
                    const catRes = await fetch("/api/categories");
                    if (catRes.ok) {
                        const data = await catRes.json();
                        setCategories(data);
                    }
                } catch (e) {
                    console.error("Error fetching categories", e);
                }
                setFetchingUser(false);
            } else if (isLoaded) {
                setFetchingUser(false);
            }
        };
        fetchData();
    }, [isLoaded, isSignedIn, getToken]);

    useEffect(() => {
        if (formData.code.startsWith("DMZF")) {
            const fullCategory = categories.find((c) => c.description === "Full");
            if (fullCategory) {
                setSelectedCategories((prev) => {
                    if (prev.length === 1 && prev[0] === fullCategory.id_category) return prev;
                    return [fullCategory.id_category];
                });
            }
        } else if (formData.code.startsWith("DMZ")) {
            const fullCategory = categories.find((c) => c.description === "Full");
            if (fullCategory) {
                setSelectedCategories((prev) => {
                    if (!prev.includes(fullCategory.id_category)) return prev;
                    return prev.filter((id) => id !== fullCategory.id_category);
                });
            }
        }
    }, [formData.code, categories]);

    const filteredCategories = categories.filter((cat) => {
        if (formData.code.startsWith("DMZF")) return cat.description === "Full";
        if (formData.code.startsWith("DMZ")) return cat.description !== "Full";
        return true;
    });

    const toggleCategory = (id: number) => {
        setSelectedCategories((prev) =>
            prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const token = await getToken();
            const url = isEditing ? `/api/hairs/${initialData.id_hair}` : "/api/hairs";
            const method = isEditing ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...formData,
                    artistId: currentUser?.id_user,
                    categoryIds: selectedCategories,
                }),
            });

            if (res.ok) {
                if (onSuccess) onSuccess();
                else window.location.href = "/hairsalon";
            } else {
                const data = await res.json();
                setError(data.error || `Error al ${isEditing ? "editar" : "crear"} el cabello`);
            }
        } catch (err) {
            setError("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    return {
        isLoaded,
        fetchingUser,
        loading,
        error,
        formData,
        setFormData,
        selectedCategories,
        toggleCategory,
        filteredCategories,
        handleSubmit,
        isEditing
    };
}
