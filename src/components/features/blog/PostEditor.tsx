import { useMemo, useState } from "react";
import { marked } from "marked";
import { useLanguage } from "../../../i18n";
import { useBlogForm } from "../../../hooks/useBlogForm";
import Field from "../../ui/Field";
import Button from "../../ui/Button";
import ErrorAlert from "../../ui/ErrorAlert";

interface PostEditorProps {
    initialData?: {
        id_post: number;
        title: string;
        excerpt: string | null;
        content: string;
        cover_image_url: string | null;
        categoryId?: number | null;
        published: boolean;
    };
}

const selectStyles =
    "w-full px-5 py-3 bg-surface border border-glass rounded-2xl text-foreground focus:outline-none focus:border-glass-strong focus:bg-surface-elevated/80 transition-all shadow-inner appearance-none cursor-pointer";

export default function PostEditor({ initialData }: PostEditorProps) {
    const { t } = useLanguage();
    const {
        loading,
        error,
        errors,
        formData,
        updateField,
        categories,
        handleSubmit,
        isEditing,
        setError,
    } = useBlogForm(initialData);

    const [tab, setTab] = useState<"write" | "preview">("write");

    const selectedParent = useMemo(
        () => categories.find((c) => String(c.id_category) === formData.categoryId),
        [categories, formData.categoryId],
    );

    const previewHtml = useMemo(() => {
        if (tab !== "preview") return "";
        try {
            return marked.parse(formData.content || "", { async: false, gfm: true, breaks: true }) as string;
        } catch {
            return "";
        }
    }, [tab, formData.content]);

    const translateError = (key?: string) => (key ? t(key) : undefined);

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <Field
                label={t("blog.form.title")}
                placeholder={t("blog.form.titlePlaceholder")}
                value={formData.title}
                maxLength={150}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField("title", e.target.value)}
                error={translateError(errors.title)}
            />

            <Field
                as="textarea"
                label={t("blog.form.excerpt")}
                placeholder={t("blog.form.excerptPlaceholder")}
                value={formData.excerpt}
                maxLength={300}
                rows={2}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField("excerpt", e.target.value)}
            />

            <Field
                label={t("blog.form.coverImage")}
                placeholder={t("blog.form.coverImagePlaceholder")}
                value={formData.cover_image_url}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateField("cover_image_url", e.target.value)}
                error={translateError(errors.cover_image_url)}
            />
            {formData.cover_image_url && !errors.cover_image_url && (
                <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-2xl border border-glass bg-surface">
                    <img
                        src={formData.cover_image_url}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                    />
                </div>
            )}

            {/* Category + subcategory */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="block text-sm font-semibold ml-1 text-foreground/70">
                        {t("blog.form.category")}
                    </label>
                    <select
                        className={selectStyles}
                        value={formData.categoryId}
                        onChange={(e) => updateField("categoryId", e.target.value)}
                    >
                        <option value="">{t("blog.form.noCategory")}</option>
                        {categories.map((cat) => (
                            <option key={cat.id_category} value={cat.id_category}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="block text-sm font-semibold ml-1 text-foreground/70">
                        {t("blog.form.subcategory")}
                    </label>
                    <select
                        className={selectStyles}
                        value={formData.subcategoryId}
                        onChange={(e) => updateField("subcategoryId", e.target.value)}
                        disabled={!selectedParent || selectedParent.children.length === 0}
                    >
                        <option value="">{t("blog.form.noCategory")}</option>
                        {(selectedParent?.children ?? []).map((sub) => (
                            <option key={sub.id_category} value={sub.id_category}>
                                {sub.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Content: write / preview tabs */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold ml-1 text-foreground/70">
                        {t("blog.form.content")}
                    </label>
                    <div className="flex gap-1 p-1 bg-surface border border-glass rounded-full">
                        <button
                            type="button"
                            onClick={() => setTab("write")}
                            className={`px-4 py-1 rounded-full text-xs font-bold transition-all ${
                                tab === "write"
                                    ? "bg-foreground text-background"
                                    : "text-muted hover:text-foreground"
                            }`}
                        >
                            {t("blog.form.write")}
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab("preview")}
                            className={`px-4 py-1 rounded-full text-xs font-bold transition-all ${
                                tab === "preview"
                                    ? "bg-foreground text-background"
                                    : "text-muted hover:text-foreground"
                            }`}
                        >
                            {t("blog.form.preview")}
                        </button>
                    </div>
                </div>

                {tab === "write" ? (
                    <Field
                        as="textarea"
                        placeholder={t("blog.form.contentPlaceholder")}
                        value={formData.content}
                        maxLength={100000}
                        rows={16}
                        className="font-mono text-sm min-h-[400px]"
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateField("content", e.target.value)}
                        error={translateError(errors.content)}
                    />
                ) : (
                    <div
                        className="article-body min-h-[400px] px-6 py-5 bg-surface border border-glass rounded-2xl overflow-auto"
                        dangerouslySetInnerHTML={{ __html: previewHtml }}
                    />
                )}
                <p className="text-xs text-muted/70 ml-1">{t("blog.form.contentHint")}</p>
            </div>

            {/* Published toggle */}
            <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-foreground/70">
                    {t("blog.form.statusLabel")}
                </span>
                <button
                    type="button"
                    onClick={() => updateField("published", !formData.published)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                        formData.published
                            ? "bg-foreground text-background border-foreground"
                            : "bg-glass border-glass text-muted"
                    }`}
                >
                    <span className="material-symbols-outlined text-[16px]">
                        {formData.published ? "public" : "draft"}
                    </span>
                    {formData.published
                        ? t("blog.form.statusPublished")
                        : t("blog.form.statusDraft")}
                </button>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-glass">
                <a href="/blog">
                    <Button type="button" variant="ghost" size="md">
                        {t("common.cancel")}
                    </Button>
                </a>
                <Button type="submit" variant="primary" size="md" disabled={loading}>
                    {loading
                        ? isEditing
                            ? t("blog.form.updating")
                            : t("blog.form.publishing")
                        : isEditing
                          ? t("blog.form.saveChanges")
                          : t("blog.form.publish")}
                </Button>
            </div>

            <ErrorAlert
                show={!!error}
                message={error.startsWith("blog.") || error.startsWith("common.") ? t(error) : error}
                onClose={() => setError("")}
            />
        </form>
    );
}
