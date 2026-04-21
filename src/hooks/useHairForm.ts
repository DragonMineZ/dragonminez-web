import { useState, useEffect } from "react";
import { useAuth } from "@clerk/astro/react";
import type { Category, Hair } from "../types/hair";

export function useHairForm(initialData?: Hair, onSuccess?: () => void) {
// ── Estado
    const { isLoaded, isSignedIn, getToken } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fetchingUser, setFetchingUser] = useState(true);
    const [currentUser, setCurrentUser] = useState<{ id_user: number } | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<number[]>(
        initialData?.categories?.map((c) => c.id_category) || []
    );
    const [error, setError] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [formData, setFormData] = useState({
        name: initialData?.name || "",
        code: initialData?.code || "",
        image_url: initialData?.image_url || "",
        description: initialData?.description || "",
    });

    const isEditing = !!initialData;

    const updateField = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

// ── Efectos
    useEffect(() => {
        const fetchData = async () => {
            if (isLoaded && isSignedIn) {
                const token = await getToken();
                const userRes = await fetch("/api/users/me", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (userRes.ok) {
                    const user = await userRes.json();
                    setCurrentUser(user);
                }
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

    const ALLOWED_IMAGE_PROVIDERS = [
        'i.imgur.com',
        'imgur.com',
        'media.discordapp.net',
        'cdn.discord.app',
    ];

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = "formNameRequired";
        if (!formData.code.trim()) newErrors.code = "formCodeRequired";
        if (!formData.image_url.trim()) {
            newErrors.image_url = "formImageRequired";
        } else {
            try {
                const url = new URL(formData.image_url);
                const host = url.host.toLowerCase();
                const isAllowed = ALLOWED_IMAGE_PROVIDERS.some(provider => host === provider || host.endsWith(`.${provider}`));
                if (!isAllowed) {
                    newErrors.image_url = "formImageInvalidProvider";
                }
            } catch {
                newErrors.image_url = "formImageInvalidProvider";
            }
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

// ── Handlers
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validate()) {
            setError("hairSalon.formInvalidFields");
            return;
        }

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
                setError(data.error || (isEditing ? 'hairSalon.updateError' : 'hairSalon.createError'));
            }
        } catch (err) {
            setError("common.connectionError");
        } finally {
            setLoading(false);
        }
    };

    return {
        isLoaded,
        fetchingUser,
        loading,
        error,
        errors,
        formData,
        updateField,
        selectedCategories,
        toggleCategory,
        filteredCategories,
        handleSubmit,
        isEditing,
        setError
    };
}
