import { useAuth } from "@clerk/astro/react";
import { useState, useEffect } from "react";
import type { Hair } from "./types/hair";
import HairCard from "./HairCard";

export default function HairList() {
  const { isLoaded, isSignedIn, getToken, userId } = useAuth();
  const [hairs, setHairs] = useState<Hair[]>([]);
  const [loading, setLoading] = useState(true);

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
      setHairs(hairs.filter((h) => h.id_hair !== id));
    } else {
      alert("Error al eliminar");
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <div className="h-10 w-48 bg-white/10 rounded-full mb-4"></div>
        <p className="text-gray-500">Preparando catálogo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Catálogo de <span className="text-orange-500">Cabellos</span>
          </h1>
          <p className="mt-2 text-gray-400">Personaliza tu personaje con los mejores estilos.</p>
        </div>

        {isSignedIn && (
          <a
            href="/createhair"
            className="group relative inline-flex items-center gap-2 px-6 py-3 font-bold text-white transition-all bg-orange-600 rounded-xl hover:bg-orange-500 hover:shadow-[0_0_20px_rgba(234,88,12,0.4)] active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Crear Cabello
          </a>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 md:h-52 bg-white/5 rounded-[32px] animate-pulse" />
          ))}
        </div>
      ) : hairs.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
          <p className="text-xl text-gray-500">No hay estilos disponibles todavía.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto">
          {hairs.map((hair) => (
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
