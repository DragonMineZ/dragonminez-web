import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@clerk/astro/react";
import { useLanguage } from "../../../i18n";
import { useBlogPosts, type BlogFetchParams } from "../../../hooks/useBlogPosts";
import SearchBar from "../../ui/SearchBar";
import Button from "../../ui/Button";
import Pagination from "../../ui/Pagination";
import SuccessAlert from "../../ui/SuccessAlert";
import type { BlogCategoryWithChildren } from "../../../types/blog";

interface BlogListProps {
    initialCategories?: BlogCategoryWithChildren[];
    canPost?: boolean;
}

function formatDate(dateStr: string | Date, lang: string): string {
    const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    return d.toLocaleDateString(lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

export default function BlogList({ initialCategories = [], canPost = false }: BlogListProps) {
    const { isLoaded: isAuthLoaded, isSignedIn, getToken } = useAuth();
    const { t, language, isLoaded: isI18nLoaded } = useLanguage();
    const { posts, meta, loading, error, fetchPosts } = useBlogPosts();

    // ── Filter state
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedParent, setSelectedParent] = useState<number | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [categories] = useState<BlogCategoryWithChildren[]>(initialCategories);
    const [canPostBlog, setCanPostBlog] = useState(canPost);
    const [successAlert, setSuccessAlert] = useState({ show: false, message: "" });

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1);
        }, 400);
        return () => clearTimeout(t);
    }, [searchQuery]);

    // Fetch permissions if authenticated (unless already passed via SSR prop)
    useEffect(() => {
        if (!canPost && isAuthLoaded && isSignedIn) {
            getToken().then((token) => {
                fetch("/api/users/permissions", {
                    headers: { Authorization: `Bearer ${token}` },
                })
                    .then((r) => r.ok ? r.json() : null)
                    .then((data) => {
                        if (data?.canPostBlog) setCanPostBlog(true);
                    })
                    .catch(() => {});
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthLoaded, isSignedIn]);

    const isLoaded = isAuthLoaded;

    // Build fetch params
    const fetchParams = useMemo<BlogFetchParams>(() => ({
        search: debouncedSearch || undefined,
        categoryId: selectedCategory ?? selectedParent ?? undefined,
        page: currentPage,
        limit: 9,
    }), [debouncedSearch, selectedCategory, selectedParent, currentPage]);

    useEffect(() => {
        fetchPosts(fetchParams);
    }, [fetchParams, fetchPosts]);

    // Cards render after the Layout's initial reveal scan — re-scan so they animate in.
    useEffect(() => {
        (window as unknown as { dmzObserveReveals?: () => void }).dmzObserveReveals?.();
    }, [posts]);

    // ── Handlers
    const handleParentSelect = useCallback((id: number | null) => {
        setSelectedParent(id);
        setSelectedCategory(null);
        setCurrentPage(1);
    }, []);

    const handleSubcategorySelect = useCallback((id: number | null) => {
        setSelectedCategory(id);
        setCurrentPage(1);
    }, []);

    // Subcategories for selected parent
    const subcategories = useMemo(() => {
        if (!selectedParent) return [];
        const parent = categories.find((c) => c.id_category === selectedParent);
        return parent?.children ?? [];
    }, [categories, selectedParent]);

    // ── Loading skeleton
    if (!isLoaded || (loading && posts.length === 0)) {
        return (
            <div className="flex flex-col gap-8">
                {/* Search skeleton */}
                <div className="h-14 bg-glass rounded-full animate-pulse" />
                {/* Cards skeleton grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-3xl bg-glass border border-glass animate-pulse overflow-hidden">
                            <div className="aspect-video bg-glass-strong" />
                            <div className="p-5 flex flex-col gap-3">
                                <div className="h-4 w-1/3 bg-glass-strong rounded-full" />
                                <div className="h-6 w-4/5 bg-glass-strong rounded-full" />
                                <div className="h-4 w-full bg-glass-strong rounded-full" />
                                <div className="h-4 w-3/4 bg-glass-strong rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <p className="text-error font-medium">{t("common.connectionError")}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8">
            {/* Search + New Post */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <div className="flex-1">
                    <SearchBar onSearch={setSearchQuery} />
                </div>
                {canPostBlog && (
                    <a href="/blog/new">
                        <Button variant="primary" size="md" className="w-full sm:w-auto whitespace-nowrap">
                            <span className="material-symbols-outlined text-[18px] mr-1.5">edit_square</span>
                            {t("blog.newPost")}
                        </Button>
                    </a>
                )}
            </div>

            {/* Category pills */}
            {categories.length > 0 && (
                <div className="flex flex-col gap-3">
                    {/* Parent pills */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => handleParentSelect(null)}
                            className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-200 border ${
                                selectedParent === null
                                    ? "bg-foreground text-background border-foreground shadow-glow"
                                    : "bg-glass border-glass text-muted hover:bg-glass-strong hover:text-foreground"
                            }`}
                        >
                            {t("blog.allCategories")}
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat.id_category}
                                onClick={() => handleParentSelect(cat.id_category)}
                                className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-200 border ${
                                    selectedParent === cat.id_category
                                        ? "bg-foreground text-background border-foreground shadow-glow"
                                        : "bg-glass border-glass text-muted hover:bg-glass-strong hover:text-foreground"
                                }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                    {/* Subcategory pills (shown when a parent with children is selected) */}
                    {selectedParent && subcategories.length > 0 && (
                        <div className="flex flex-wrap gap-2 pl-2 border-l-2 border-glass">
                            <button
                                onClick={() => handleSubcategorySelect(null)}
                                className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase transition-all duration-200 border ${
                                    selectedCategory === null
                                        ? "bg-surface-elevated text-foreground border-glass-strong"
                                        : "bg-transparent border-glass text-muted hover:text-foreground"
                                }`}
                            >
                                {t("blog.allPosts")}
                            </button>
                            {subcategories.map((sub) => (
                                <button
                                    key={sub.id_category}
                                    onClick={() => handleSubcategorySelect(sub.id_category)}
                                    className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase transition-all duration-200 border ${
                                        selectedCategory === sub.id_category
                                            ? "bg-surface-elevated text-foreground border-glass-strong"
                                            : "bg-transparent border-glass text-muted hover:text-foreground"
                                    }`}
                                >
                                    {sub.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Posts grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className="rounded-3xl bg-glass border border-glass animate-pulse overflow-hidden">
                            <div className="aspect-video bg-glass-strong" />
                            <div className="p-5 flex flex-col gap-3">
                                <div className="h-4 w-1/3 bg-glass-strong rounded-full" />
                                <div className="h-6 w-4/5 bg-glass-strong rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4 bg-glass rounded-3xl border border-dashed border-glass-strong">
                    <span className="material-symbols-outlined text-muted text-6xl">article</span>
                    <p className="text-lg text-muted">{t("blog.noPosts")}</p>
                    {canPostBlog && (
                        <a href="/blog/new">
                            <Button variant="secondary" size="md">
                                {t("blog.newPost")}
                            </Button>
                        </a>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {posts.map((post, idx) => (
                        <article
                            key={post.id_post}
                            className={`group/card reveal reveal-up reveal-delay-${Math.min((idx % 3) + 1, 4)} relative bg-surface border border-glass rounded-3xl overflow-hidden transition-all duration-300 hover:border-glass-strong hover:bg-surface-elevated hover:-translate-y-1 hover:shadow-glass`}
                        >
                            <a href={`/blog/${post.slug}`} className="block">
                                {/* Cover image */}
                                <div className="relative aspect-video overflow-hidden bg-surface-elevated">
                                    {post.cover_image_url ? (
                                        <img
                                            src={post.cover_image_url}
                                            alt={post.title}
                                            loading="lazy"
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span className="material-symbols-outlined text-muted text-5xl opacity-30">
                                                article
                                            </span>
                                        </div>
                                    )}
                                    {/* Category chip overlay */}
                                    {post.category && (
                                        <div className="absolute top-3 left-3">
                                            <span className="px-2.5 py-1 bg-background/70 backdrop-blur-sm border border-glass rounded-full text-[10px] font-bold text-foreground tracking-wider uppercase">
                                                {post.category.name}
                                            </span>
                                        </div>
                                    )}
                                    {/* Draft badge */}
                                    {!post.published && (
                                        <div className="absolute top-3 right-3">
                                            <span className="px-2.5 py-1 bg-error/80 backdrop-blur-sm rounded-full text-[10px] font-bold text-white tracking-wider uppercase">
                                                {t("blog.draftBadge")}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-5 flex flex-col gap-3">
                                    <h2 className="text-lg font-bold text-foreground tracking-tight leading-snug line-clamp-2 group-hover/card:text-foreground/90 transition-colors">
                                        {post.title}
                                    </h2>

                                    {post.excerpt && (
                                        <p className="text-sm text-muted leading-relaxed line-clamp-3">
                                            {post.excerpt}
                                        </p>
                                    )}

                                    {/* Meta row */}
                                    <div className="flex items-center gap-2 pt-2 mt-auto border-t border-glass">
                                        {post.author.avatar_url && (
                                            <img
                                                src={post.author.avatar_url}
                                                alt={post.author.username}
                                                className="w-6 h-6 rounded-full border border-glass object-cover shrink-0"
                                            />
                                        )}
                                        <span className="text-xs text-muted font-medium truncate flex-1">
                                            {t("blog.by")} <span className="text-foreground/80 font-semibold">{post.author.username}</span>
                                        </span>
                                        <span className="text-xs text-muted shrink-0">
                                            {post.readingTime} {t("blog.minuteRead")}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <time className="text-[11px] text-muted/60" dateTime={String(post.created_at)}>
                                            {formatDate(post.created_at, language || "es")}
                                        </time>
                                        <span className="text-xs text-muted font-semibold tracking-wide group-hover/card:text-foreground transition-colors flex items-center gap-1">
                                            {t("blog.readMore")}
                                            <span className="material-symbols-outlined text-[14px] group-hover/card:translate-x-0.5 transition-transform">
                                                arrow_forward
                                            </span>
                                        </span>
                                    </div>
                                </div>
                            </a>
                        </article>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {meta.totalPages > 1 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={meta.totalPages}
                    onPageChange={(p) => {
                        setCurrentPage(p);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                />
            )}

            <SuccessAlert
                show={successAlert.show}
                message={successAlert.message}
                onClose={() => setSuccessAlert({ ...successAlert, show: false })}
            />
        </div>
    );
}
