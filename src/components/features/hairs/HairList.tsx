import { useAuth, SignedIn } from "@clerk/astro/react";
import { useState, useEffect, useMemo } from "react";
import HairCard from "./HairCard";
import SearchBar from "../../ui/SearchBar";
import FilterDropdown from "../../ui/FilterDropdown";
import CreateHairTrigger from "./CreateHairTrigger";
import SuccessAlert from "../../ui/SuccessAlert";
import Pagination from "../../ui/Pagination";
import Button from "../../ui/Button";
import { useHairs } from "../../../hooks/useHairs";
import { filterHairs, sortHairs } from "../../../lib/hairFilters";
import { useLanguage } from "../../../i18n";

export default function HairList() {
  const { isLoaded: isAuthLoaded, isSignedIn, getToken, userId } = useAuth();
  const { t } = useLanguage();

  const {
    hairs,
    categories,
    loading,
    error,
    fetchData,
    handleDeleteLocally,
    handleLikeToggleLocally
  } = useHairs();

  // ... rest of state ...
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [showMyCreations, setShowMyCreations] = useState(false);
  const [successAlert, setSuccessAlert] = useState<{ show: boolean; message: string }>({ show: false, message: "" });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 2;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, sortBy, showMyCreations]);

  const handleDelete = async (id: number) => {
    const token = await getToken();
    const res = await fetch(`/api/hairs/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      handleDeleteLocally(id);
      setSuccessAlert({ show: true, message: "¡Cabello eliminado correctamente!" });
    } else {
      window.alert("Error al eliminar");
    }
  };

  const handleCreateSuccess = () => {
    fetchData();
    setSuccessAlert({ show: true, message: "¡Cabello publicado correctamente!" });
  };

  const handleUpdateSuccess = () => {
    fetchData();
    setSuccessAlert({ show: true, message: "¡Cabello actualizado correctamente!" });
  };

  const filteredHairs = filterHairs(hairs, searchQuery, selectedCategory, showMyCreations, !!isSignedIn, userId);
  const processedHairs = sortHairs(filteredHairs, sortBy);

  const totalPages = Math.ceil(processedHairs.length / itemsPerPage);
  const currentItems = processedHairs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const categoryOptions = useMemo(() => [
    { id: "all", label: t('hairSalon.filterAll') },
    ...categories.map(c => ({ id: c.id_category, label: c.description }))
  ], [categories, t]);

  const popularityOptions = useMemo(() => [
    { id: "recent", label: t('hairSalon.sortRecent') },
    { id: "likes", label: t('hairSalon.sortPopular') },
    { id: "oldest", label: t('hairSalon.sortOldest') }
  ], [t]);

  if (!isAuthLoaded || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 animate-pulse">
        <div className="h-10 w-48 bg-glass-strong rounded-2xl"></div>
        <p className="text-muted" data-i18n="hairSalon.preparingCatalog">{t('hairSalon.preparingCatalog')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">

      {/* Búsqueda */}
      <SearchBar onSearch={setSearchQuery} />

      {/* Filtros y acciones */}
      <div className="flex flex-wrap items-center gap-3">
        <FilterDropdown
          label={t('hairSalon.categoriesLabel')}
          options={categoryOptions}
          selectedId={selectedCategory}
          onSelect={setSelectedCategory}
        />
        <FilterDropdown
          label={t('hairSalon.sortLabel')}
          options={popularityOptions}
          selectedId={sortBy}
          onSelect={(id) => setSortBy(String(id))}
        />
        {isSignedIn && (
          <Button
            variant={showMyCreations ? "primary" : "secondary"}
            size="md"
            onClick={() => setShowMyCreations(!showMyCreations)}
          >
            {t('hairSalon.myCreations')}
          </Button>
        )}
        <SignedIn>
          <div className="ml-auto">
            <CreateHairTrigger onSuccess={handleCreateSuccess} />
          </div>
        </SignedIn>
      </div>

      {/* Lista o estado vacío */}
      {processedHairs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 bg-glass rounded-3xl border border-dashed border-glass-strong">
          <span className="material-symbols-outlined text-muted text-6xl">
            search_off
          </span>
          <p className="text-lg text-muted">
            {searchQuery
              ? `${t('hairSalon.noResults')} ("${searchQuery}")`
              : t('hairSalon.noResults')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {currentItems.map((hair) => (
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

      {/* Paginación */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
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