import { useAuth, SignedIn } from "@clerk/astro/react";
import { useState, useEffect } from "react";
import type { Hair, Category } from "./types/hair";
import HairCard from "./HairCard";
import SearchBar from "./SearchBar";
import FilterDropdown from "./FilterDropdown";
import CreateHairTrigger from "./CreateHairTrigger";
import SuccessAlert from "./SuccessAlert";
import Pagination from "./Pagination";

export default function HairList() {
  const { isLoaded, isSignedIn, getToken, userId } = useAuth();
  const [hairs, setHairs] = useState<Hair[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | string>("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [showMyCreations, setShowMyCreations] = useState(false);
  const [successAlert, setSuccessAlert] = useState<{ show: boolean; message: string }>({ show: false, message: "" });

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 2; // Para pruebas usamos 2, después será 5

  const fetchData = async () => {
    try {
      const [hairsRes, catsRes] = await Promise.all([
        fetch("/api/hairs"),
        fetch("/api/categories")
      ]);

      const hairsData = await hairsRes.json();
      const catsData = await catsRes.json();

      setHairs(hairsData);
      setCategories(catsData);
    } catch (error) {
      console.error("Error loading data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Reiniciar página al filtrar
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
      setHairs(hairs.filter((h: Hair) => h.id_hair !== id));
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

  // Lógica de filtrado y ordenamiento
  const processedHairs = hairs
    .filter((hair) => {
      // Filtro por búsqueda
      const matchesSearch =
        hair.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hair.description?.toLowerCase().includes(searchQuery.toLowerCase());

      // Filtro por categoría
      const matchesCategory = selectedCategory === "all" ||
        hair.categories?.some(cat => cat.id_category === Number(selectedCategory));

      // Filtro por "Mis Creaciones"
      const matchesMyCreations = !showMyCreations || (isSignedIn && hair.artist?.clerk_id === userId);

      return matchesSearch && matchesCategory && matchesMyCreations;
    })
    .sort((a, b) => {
      if (sortBy === "likes") {
        return (b._count?.likes || 0) - (a._count?.likes || 0);
      }
      if (sortBy === "oldest") {
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

  // Cálculo de paginación
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

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <div className="h-10 w-48 bg-white/10 rounded-full mb-4"></div>
        <p className="text-gray-500">Preparando catálogo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 px-4 md:px-0">
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
            <button
              onClick={() => setShowMyCreations(!showMyCreations)}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all border ${showMyCreations
                ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                : "bg-[#121214] border-white/5 text-gray-400 hover:border-white/10 hover:text-white"
                }`}
            >
              Mis Creaciones
            </button>
          )}

          <SignedIn>
            <div className="ml-auto">
              <CreateHairTrigger onSuccess={handleCreateSuccess} />
            </div>
          </SignedIn>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 md:h-52 bg-white/5 rounded-[32px] animate-pulse" />
          ))}
        </div>
      ) : processedHairs.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10 max-w-4xl mx-auto">
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
            {currentItems.map((hair: Hair) => (
              <HairCard
                key={hair.id_hair}
                hair={hair}
                isSignedIn={isSignedIn || false}
                onDelete={handleDelete}
                onUpdateSuccess={handleUpdateSuccess}
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
