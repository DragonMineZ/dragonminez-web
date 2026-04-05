import { useAuth, SignedIn } from "@clerk/astro/react";
import { useState, useEffect } from "react";
import HairCard from "./HairCard";
import SearchBar from "../../ui/SearchBar";
import FilterDropdown from "../../ui/FilterDropdown";
import CreateHairTrigger from "./CreateHairTrigger";
import SuccessAlert from "../../ui/SuccessAlert";
import Pagination from "../../ui/Pagination";
import Button from "../../ui/Button";
import { useHairs } from "../../../hooks/useHairs";
import { filterHairs, sortHairs } from "../../../lib/hairFilters";

export default function HairList() {
  const { isLoaded, isSignedIn, getToken, userId } = useAuth();

  const {
    hairs,
    categories,
    loading,
    error,
    fetchData,
    handleDeleteLocally,
    handleLikeToggleLocally
  } = useHairs();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [showMyCreations, setShowMyCreations] = useState(false);
  const [successAlert, setSuccessAlert] = useState<{ show: boolean; message: string }>({ show: false, message: "" });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 2; // Para pruebas usamos 2, después será 5

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
      window.alert("Error al eliminar"); // Consider switching to a modern toast
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

  const categoryOptions = [
    { id: "all", label: "Todas" },
    ...categories.map(c => ({ id: c.id_category, label: c.description }))
  ];

  const popularityOptions = [
    { id: "recent", label: "Más recientes" },
    { id: "likes", label: "Más populares" },
    { id: "oldest", label: "Antiguos" }
  ];

  if (!isLoaded || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <div className="h-10 w-48 bg-glass-strong rounded-full mb-4"></div>
        <p className="text-gray-500">Preparando catálogo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-red-500">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 px-4 md:px-0">
      {/* ... Filters Header ... */}
      <div className="flex flex-col gap-6 w-full">
        <div className="w-full max-w-2xl mx-auto">
          <SearchBar onSearch={setSearchQuery} />
        </div>

        <div className="flex flex-wrap items-center justify-start gap-4">
          <FilterDropdown
            label="Categoría"
            options={categoryOptions}
            selectedId={selectedCategory}
            onSelect={setSelectedCategory}
          />
          <FilterDropdown
            label="Popularidad"
            options={popularityOptions}
            selectedId={sortBy}
            onSelect={(id) => setSortBy(String(id))}
          />

          {isSignedIn && (
            <Button
              variant={showMyCreations ? "primary" : "secondary"}
              onClick={() => setShowMyCreations(!showMyCreations)}
              className="px-6 py-2.5"
            >
              Mis Creaciones
            </Button>
          )}

          <SignedIn>
            <div className="ml-auto">
              <CreateHairTrigger onSuccess={handleCreateSuccess} />
            </div>
          </SignedIn>
        </div>
      </div>

      {/* ... Empty or List ... */}
      {processedHairs.length === 0 ? (
        <div className="text-center py-20 bg-glass rounded-3xl border border-dashed border-glass-strong max-w-4xl mx-auto">
          <span className="material-symbols-outlined text-gray-600 text-6xl mb-4">
            search_off
          </span>
          <p className="text-xl text-gray-500">
            {searchQuery ? `No se encontraron resultados para "${searchQuery}"` : "No hay estilos que coincidan con los filtros."}
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-6 max-w-4xl mx-auto">
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

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      <SuccessAlert
        show={successAlert.show}
        message={successAlert.message}
        onClose={() => setSuccessAlert({ ...successAlert, show: false })}
      />
    </div>
  );
}
