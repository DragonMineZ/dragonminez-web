import { useAuth } from "@clerk/astro/react";
import { useState, useEffect } from "react";

interface Hair {
  id_hair: number;
  name: string;
  code: string;
  image_url: string;
  description: string | null;
  artist: {
    id_user: number;
    username: string;
    avatar_url: string;
  };
}

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
    return <div className="text-center py-10">Cargando...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Catálogo de Cabellos</h1>
        {isSignedIn && (
          <a
            href="/createhair"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            + Crear Cabello
          </a>
        )}
      </div>

      {loading ? (
        <p className="text-center py-10">Cargando...</p>
      ) : hairs.length === 0 ? (
        <p className="text-center py-10 text-gray-400">No hay cabello todavía</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hairs.map((hair) => (
            <div
              key={hair.id_hair}
              className="bg-white/5 rounded-xl overflow-hidden border border-white/10"
            >
              <img
                src={hair.image_url}
                alt={hair.name}
                className="w-full h-48 object-cover"
              />
              <div className="p-4 space-y-2">
                <h3 className="text-xl font-semibold">{hair.name}</h3>
                <p className="text-sm text-gray-400">Código: {hair.code}</p>
                {hair.description && (
                  <p className="text-sm text-gray-300">{hair.description}</p>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <img
                    src={hair.artist.avatar_url}
                    alt={hair.artist.username}
                    className="w-6 h-6 rounded-full"
                  />
                  <span className="text-sm text-gray-400">
                    {hair.artist.username}
                  </span>
                </div>
                {isSignedIn && userId && (
                  <button
                    onClick={() => handleDelete(hair.id_hair)}
                    className="mt-2 text-red-400 hover:text-red-300 text-sm"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
