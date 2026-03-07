import { useAuth } from "@clerk/astro/react";
import { useState, useEffect } from "react";
import type { Hair } from "./types/hair";
import HairCard from "./HairCard";
import SearchBar from "./SearchBar";

export default function HairList() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [hairs, setHairs] = useState<Hair[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/hairs")
      .then((res) => res.json())
      .then((data) => {
        setHairs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este cabello?")) return;

    const token = await getToken();
    const res = await fetch(`/api/hairs/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      setHairs(hairs.filter((h: Hair) => h.id_hair !== id));
    } else {
      alert("Error al eliminar");
    }
  };

  const filteredHairs = hairs.filter((hair) =>
    hair.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hair.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      <div className="max-w-2xl mx-auto">
        <SearchBar onSearch={setSearchQuery} />
      </div>

      {loading ? (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 md:h-52 bg-white/5 rounded-[32px] animate-pulse" />
          ))}
        </div>
      ) : filteredHairs.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10 max-w-4xl mx-auto">
          <span className="material-symbols-outlined text-gray-600 text-6xl mb-4">
            search_off
          </span>
          <p className="text-xl text-gray-500">
            {searchQuery ? `No se encontraron resultados para "${searchQuery}"` : "No hay estilos disponibles todavía."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto">
          {filteredHairs.map((hair: Hair) => (
            <HairCard
              key={hair.id_hair}
              hair={hair}
              isSignedIn={isSignedIn || false}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
