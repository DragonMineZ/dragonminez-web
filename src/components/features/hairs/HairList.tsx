import { useAuth, SignedIn } from "@clerk/astro/react";
import { useState, useEffect, useMemo, useCallback } from "react";
import HairCard from "./HairCard";
import SearchBar from "../../ui/SearchBar";
import FilterDropdown from "../../ui/FilterDropdown";
import CreateHairTrigger from "./CreateHairTrigger";
import SuccessAlert from "../../ui/SuccessAlert";
import Button from "../../ui/Button";
import Pagination from "../../ui/Pagination";
import ItemsPerPageSelector from "../../ui/ItemsPerPageSelector";
import { useHairs, type HairFetchParams } from "../../../hooks/useHairs";
import { useLanguage } from "../../../i18n";
import type { Category } from "../../../types/hair";
import Chip from "../../ui/Chip";

export default function HairList({ initialCategories = [] }: { initialCategories?: Category[] }) {
  const { isLoaded: isAuthLoaded, isSignedIn, getToken } = useAuth();
  const { t, isLoaded: isI18nLoaded } = useLanguage();

  const { hairs, meta, categories, loading, error, fetchHairs, handleLikeToggleLocally } =
    useHairs(initialCategories);

// ── Estado
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [showMyCreations, setShowMyCreations] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [successAlert, setSuccessAlert] = useState<{ show: boolean; message: string }>({
    show: false,
    message: "",
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchParams = useMemo<HairFetchParams>(
    () => ({
      search: debouncedSearch || undefined,
      category: selectedCategory !== "all" ? (selectedCategory as number) : undefined,
      sort: sortBy as "recent" | "likes" | "oldest",
      myCreations: showMyCreations,
      page: currentPage,
      limit: itemsPerPage,
    }),
    [debouncedSearch, selectedCategory, sortBy, showMyCreations, currentPage, itemsPerPage]
  );

  useEffect(() => {
    fetchHairs(fetchParams);
  }, [fetchParams, fetchHairs]);

  // ── Handlers
  const handleCategoryChange = useCallback((cat: number | string) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  }, []);

  const handleSortChange = useCallback((sort: string) => {
    setSortBy(sort);
    setCurrentPage(1);
  }, []);

  const handleMyCreationsToggle = useCallback(() => {
    setShowMyCreations((prev) => !prev);
    setCurrentPage(1);
  }, []);

  const handleItemsPerPageChange = useCallback((limit: number) => {
    setItemsPerPage(limit);
    setCurrentPage(1);
  }, []);

  // ── Acciones
  const handleDelete = async (id: number) => {
    const token = await getToken();
    const res = await fetch(`/api/hairs/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      fetchHairs(fetchParams);
      setSuccessAlert({ show: true, message: t("hairSalon.deleteSuccess") });
    } else {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error || t("hairSalon.deleteError"));
    }
  };

  const handleCreateSuccess = () => {
    fetchHairs(fetchParams);
    setSuccessAlert({ show: true, message: t("hairSalon.createSuccess") });
  };

  const handleUpdateSuccess = () => {
    fetchHairs(fetchParams);
    setSuccessAlert({ show: true, message: t("hairSalon.updateSuccess") });
  };

  // ── Opciones
  const categoryOptions = useMemo(
    () => [
      { id: "all", label: t("hairSalon.filterAll") },
      ...categories.map((c) => ({ id: c.id_category, label: c.description })),
    ],
    [categories, t]
  );

  const popularityOptions = useMemo(
    () => [
      { id: "recent", label: t("hairSalon.sortRecent") },
      { id: "likes", label: t("hairSalon.sortPopular") },
      { id: "oldest", label: t("hairSalon.sortOldest") },
    ],
    [t]
  );

  // ── Render
  if (!isAuthLoaded || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 animate-pulse">
        <div className="h-10 w-48 bg-glass-strong rounded-2xl"></div>
        {isI18nLoaded && (
          <p className="text-muted">
            {t("hairSalon.preparingCatalog")}
          </p>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 animate-shake">
        <p className="text-error font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <SearchBar onSearch={setSearchQuery} />

      <div className="flex flex-wrap items-center gap-3">
        <FilterDropdown
          label={t("hairSalon.categoriesLabel")}
          options={categoryOptions}
          selectedId={selectedCategory}
          onSelect={handleCategoryChange}
        />
        <FilterDropdown
          label={t("hairSalon.sortLabel")}
          options={popularityOptions}
          selectedId={sortBy}
          onSelect={(id) => handleSortChange(String(id))}
        />
        {isSignedIn && (
          <Button
            variant={showMyCreations ? "primary" : "secondary"}
            size="md"
            onClick={handleMyCreationsToggle}
          >
            {t("hairSalon.myCreations")}
          </Button>
        )}
        <SignedIn>
          <div className="ml-auto flex items-center gap-2">
            <Chip
              href="/editor"
              icon="brush"
              variant="outline"
              title={t("hairSalon.createWithEditor")}
            >
              {t("hairSalon.createWithEditor")}
            </Chip>
            <CreateHairTrigger onSuccess={handleCreateSuccess} />
          </div>
        </SignedIn>
      </div>

      {hairs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 bg-glass rounded-3xl border border-dashed border-glass-strong">
          <span className="material-symbols-outlined text-muted text-6xl">search_off</span>
          <p className="text-lg text-muted">
            {searchQuery
              ? `${t("hairSalon.noResults")} ("${searchQuery}")`
              : t("hairSalon.noResults")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {hairs.map((hair) => (
            <HairCard
              key={hair.id_hair}
              hair={hair}
              isSignedIn={isSignedIn || false}
              onDelete={handleDelete}
              onUpdateSuccess={handleUpdateSuccess}
              onLikeToggle={handleLikeToggleLocally}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mt-4">
        <ItemsPerPageSelector
          currentValue={itemsPerPage}
          options={[10, 25, 50]}
          onSelect={handleItemsPerPageChange}
        />
        {meta.totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={meta.totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      <SuccessAlert
        show={successAlert.show}
        message={successAlert.message}
        onClose={() => setSuccessAlert({ ...successAlert, show: false })}
      />
    </div>
  );
}