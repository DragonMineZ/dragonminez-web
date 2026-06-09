import { useState, useEffect } from "react";
import { useAuth } from "@clerk/astro/react";
import type { BlogCategoryWithChildren } from "../types/blog";

export interface BlogFormData {
    title: string;
    excerpt: string;
    content: string;
    cover_image_url: string;
    categoryId: string;
    subcategoryId: string;
    published: boolean;
}

const ALLOWED_IMAGE_PROVIDERS = ["i.imgur.com", "media.discordapp.net"];

function isAllowedImageUrl(url: string): boolean {
    if (!url) return true; // optional field
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== "https:") return false;
        const host = parsed.hostname.toLowerCase();
        return ALLOWED_IMAGE_PROVIDERS.some(
            (p) => host === p || host.endsWith(`.${p}`)
        );
    } catch {
        return false;
    }
}

export function useBlogForm(
    initialData?: {
        id_post: number;
        title: string;
        excerpt: string | null;
        content: string;
        cover_image_url: string | null;
        categoryId?: number | null;
        published: boolean;
    },
    onSuccess?: (slug: string) => void
) {
    const { isLoaded, getToken } = useAuth();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<BlogCategoryWithChildren[]>([]);
    const [error, setError] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Resolve initial category/subcategory selection
    const isEditing = !!initialData;

    const [formData, setFormData] = useState<BlogFormData>({
        title: initialData?.title || "",
        excerpt: initialData?.excerpt || "",
        content: initialData?.content || "",
        cover_image_url: initialData?.cover_image_url || "",
        categoryId: "",
        subcategoryId: "",
        published: initialData?.published ?? true,
    });

    // Load categories
    useEffect(() => {
        async function load() {
            try {
                const res = await fetch("/api/blog/categories");
                if (res.ok) {
                    const data: BlogCategoryWithChildren[] = await res.json();
                    setCategories(data);

                    // Restore category selection for edit mode
                    if (initialData?.categoryId) {
                        const cid = initialData.categoryId;
                        // Is it a parent?
                        const parent = data.find((c) => c.id_category === cid);
                        if (parent) {
                            setFormData((prev) => ({ ...prev, categoryId: String(cid), subcategoryId: "" }));
                        } else {
                            // It's a child — find parent
                            const parentCat = data.find((c) =>
                                c.children.some((ch) => ch.id_category === cid)
                            );
                            if (parentCat) {
                                setFormData((prev) => ({
                                    ...prev,
                                    categoryId: String(parentCat.id_category),
                                    subcategoryId: String(cid),
                                }));
                            }
                        }
                    }
                }
            } catch (e) {
                console.error("Error fetching blog categories", e);
            }
        }
        load();
    }, []);

    const updateField = (field: keyof BlogFormData, value: string | boolean) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field as string]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[field as string];
                return next;
            });
        }
        // Reset subcategory when parent changes
        if (field === "categoryId") {
            setFormData((prev) => ({ ...prev, categoryId: value as string, subcategoryId: "" }));
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.title.trim()) newErrors.title = "blog.form.titleRequired";
        if (!formData.content.trim()) newErrors.content = "blog.form.contentRequired";

        if (formData.cover_image_url && !isAllowedImageUrl(formData.cover_image_url)) {
            newErrors.cover_image_url = "hairSalon.formImageInvalidProvider";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Resolve the effective categoryId to submit
    const getEffectiveCategoryId = (): number | null => {
        const sub = formData.subcategoryId;
        const parent = formData.categoryId;
        if (sub) return parseInt(sub, 10);
        if (parent) return parseInt(parent, 10);
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) {
            setError("blog.form.invalidFields");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const token = await getToken();
            const url = isEditing ? `/api/blog/posts/${initialData.id_post}` : "/api/blog/posts";
            const method = isEditing ? "PATCH" : "POST";

            const payload = {
                title: formData.title.trim(),
                content: formData.content,
                excerpt: formData.excerpt.trim() || null,
                cover_image_url: formData.cover_image_url.trim() || null,
                categoryId: getEffectiveCategoryId(),
                published: formData.published,
            };

            const res = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const data = await res.json();
                const slug = data.slug || data.data?.slug;
                if (onSuccess) {
                    onSuccess(slug);
                } else {
                    window.location.href = `/blog/${slug}`;
                }
            } else {
                const data = await res.json().catch(() => ({}));
                setError(
                    data.error ||
                        (isEditing ? "blog.form.updateError" : "blog.form.createError")
                );
            }
        } catch {
            setError("common.connectionError");
        } finally {
            setLoading(false);
        }
    };

    return {
        isLoaded,
        loading,
        error,
        errors,
        formData,
        updateField,
        categories,
        handleSubmit,
        isEditing,
        setError,
    };
}
