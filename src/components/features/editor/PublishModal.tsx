/**
 * Publish modal: posts to /api/hairs with Clerk token.
 * Auto-selects "Full" category for DMZF codes, "Base" for DMZ codes.
 */
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/astro/react";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import ErrorAlert from "../../ui/ErrorAlert";
import SuccessAlert from "../../ui/SuccessAlert";
import { useLanguage } from "../../../i18n";

interface Category {
    id_category: number;
    description: string;
}

interface PublishModalProps {
    isOpen: boolean;
    onClose: () => void;
    code: string;
    hairName: string;
}

const ALLOWED_IMAGE_PROVIDERS = ["i.imgur.com", "media.discordapp.net", "cdn.discord.app"];

function isAllowedUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        const host = parsed.host.toLowerCase();
        return ALLOWED_IMAGE_PROVIDERS.some((p) => host === p || host.endsWith(`.${p}`));
    } catch {
        return false;
    }
}

export default function PublishModal({ isOpen, onClose, code, hairName }: PublishModalProps) {
    const { t } = useLanguage();
    const { isLoaded, isSignedIn, getToken } = useAuth();

    const [name, setName] = useState(hairName);
    const [imageUrl, setImageUrl] = useState("");
    const [description, setDescription] = useState("");
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Sync name when prop changes
    useEffect(() => {
        setName(hairName);
    }, [hairName]);

    // Fetch categories
    useEffect(() => {
        if (!isOpen) return;
        fetch("/api/categories")
            .then((r) => r.ok ? r.json() : [])
            .then((data: Category[]) => {
                setCategories(data);
                // Auto-select category
                const isFullSet = code.startsWith("DMZF");
                const auto = data.find((c) =>
                    isFullSet ? c.description === "Full" : c.description === "Base",
                );
                if (auto) setSelectedCategories([auto.id_category]);
            })
            .catch(() => {});
    }, [isOpen, code]);

    const validate = (): boolean => {
        const errs: Record<string, string> = {};
        if (!name.trim()) errs.name = t("hairSalon.formNameRequired");
        if (!imageUrl.trim()) {
            errs.image_url = t("hairSalon.formImageRequired");
        } else if (!isAllowedUrl(imageUrl)) {
            errs.image_url = t("hairSalon.formImageInvalidProvider");
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            if (!validate()) return;

            setLoading(true);
            setError("");

            try {
                const token = await getToken();
                const res = await fetch("/api/hairs", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        name: name.trim(),
                        code,
                        image_url: imageUrl.trim(),
                        description: description.trim(),
                        categoryIds: selectedCategories,
                    }),
                });

                if (res.ok) {
                    setSuccess(true);
                    setTimeout(() => {
                        onClose();
                        window.location.href = "/hairsalon";
                    }, 2000);
                } else {
                    const data = await res.json();
                    setError(data.error || t("hairSalon.createError"));
                }
            } catch {
                setError(t("common.connectionError"));
            } finally {
                setLoading(false);
            }
        },
        [name, code, imageUrl, description, selectedCategories, getToken, t, onClose],
    );

    const filteredCategories = categories.filter((cat) => {
        if (code.startsWith("DMZF")) return cat.description === "Full";
        if (code.startsWith("DMZ")) return cat.description !== "Full";
        return true;
    });

    const toggleCategory = (id: number) => {
        setSelectedCategories((prev) =>
            prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
        );
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} noPadding>
                <div className="flex flex-col w-full max-h-[85vh]">
                    {/* Header */}
                    <div className="shrink-0 p-6 md:p-8 pb-4">
                        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                            {t("editor.publish")}
                        </h2>
                        <p className="text-muted text-sm">{t("editor.publishDesc")}</p>
                    </div>

                    {/* Form body */}
                    <form
                        id="editor-publish-form"
                        onSubmit={handleSubmit}
                        noValidate
                        className="flex-1 overflow-y-auto px-6 md:px-8 pb-4 space-y-4 scrollbar-hide"
                    >
                        {/* Name */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-foreground/70 ml-1">
                                {t("hairSalon.formName")} <span className="text-error">*</span>
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t("hairSalon.formNamePlaceholder")}
                                className={`w-full px-4 py-2.5 bg-surface border rounded-2xl text-foreground placeholder:text-muted/40 focus:outline-none focus:border-glass-strong transition-all ${errors.name ? "border-error/60" : "border-glass"}`}
                            />
                            {errors.name && (
                                <p className="text-error text-xs ml-1 font-medium">{errors.name}</p>
                            )}
                        </div>

                        {/* Code (readonly) */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-foreground/70 ml-1">
                                {t("hairSalon.formCode")}
                            </label>
                            <textarea
                                value={code}
                                readOnly
                                rows={2}
                                className="w-full px-4 py-2.5 bg-surface border border-glass rounded-2xl text-foreground/50 text-xs font-mono resize-none focus:outline-none"
                            />
                        </div>

                        {/* Categories */}
                        {filteredCategories.length > 0 && (
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-foreground/70 ml-1">
                                    {t("hairSalon.formCategories")}
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {filteredCategories.map((cat) => (
                                        <button
                                            key={cat.id_category}
                                            type="button"
                                            onClick={() => toggleCategory(cat.id_category)}
                                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                                                selectedCategories.includes(cat.id_category)
                                                    ? "bg-foreground text-background shadow-glow"
                                                    : "bg-glass text-muted hover:bg-glass-strong hover:text-foreground"
                                            }`}
                                        >
                                            {cat.description}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Image URL */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-foreground/70 ml-1">
                                {t("hairSalon.formImage")} <span className="text-error">*</span>
                            </label>
                            <input
                                type="url"
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                placeholder={t("hairSalon.formImagePlaceholder")}
                                className={`w-full px-4 py-2.5 bg-surface border rounded-2xl text-foreground placeholder:text-muted/40 focus:outline-none focus:border-glass-strong transition-all ${errors.image_url ? "border-error/60" : "border-glass"}`}
                            />
                            {errors.image_url && (
                                <p className="text-error text-xs ml-1 font-medium">{errors.image_url}</p>
                            )}
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <label className="block text-sm font-semibold text-foreground/70 ml-1">
                                {t("hairSalon.formDescription")}
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={t("hairSalon.formDescriptionPlaceholder")}
                                rows={2}
                                maxLength={500}
                                className="w-full px-4 py-2.5 bg-surface border border-glass rounded-2xl text-foreground placeholder:text-muted/40 focus:outline-none focus:border-glass-strong transition-all resize-none"
                            />
                        </div>

                        {/* Error in form */}
                        {error && (
                            <p className="text-error text-sm font-medium px-1">{error}</p>
                        )}
                    </form>

                    {/* Footer */}
                    <div className="shrink-0 p-6 md:p-8 pt-4 flex justify-end">
                        <Button
                            type="submit"
                            form="editor-publish-form"
                            disabled={loading || success}
                            className="flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="h-4 w-4 border-2 border-background/20 border-t-background rounded-full animate-spin" />
                                    {t("hairSalon.publishing")}
                                </>
                            ) : (
                                t("editor.publish")
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>

            <SuccessAlert
                show={success}
                message={t("hairSalon.createSuccess")}
                onClose={() => setSuccess(false)}
            />
        </>
    );
}
