import { useAuth } from "@clerk/astro/react";
import { useState, useEffect } from "react";
import type { Category } from "./types/hair";

interface User {
  id_user: number;
}

export default function CreateHairForm({ onSuccess }: { onSuccess?: () => void }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingUser, setFetchingUser] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    image_url: "",
    description: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      if (isLoaded && isSignedIn) {
        const token = await getToken();

        // Fetch User
        const userRes = await fetch("/api/user/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (userRes.ok) {
          const user = await userRes.json();
          setCurrentUser(user);
        }

        // Fetch Categories
        try {
          const catRes = await fetch("/api/categories");
          if (catRes.ok) {
            const data = await catRes.json();
            setCategories(data);
          }
        } catch (e) {
          console.error("Error fetching categories", e);
        }

        setFetchingUser(false);
      } else if (isLoaded) {
        setFetchingUser(false);
      }
    };
    fetchData();
  }, [isLoaded, isSignedIn, getToken]);

  // Lógica automática para categorías basada en el prefijo del código
  useEffect(() => {
    if (formData.code.startsWith("DMZF")) {
      const fullCategory = categories.find(c => c.description === "Full");
      if (fullCategory) {
        setSelectedCategories([fullCategory.id_category]);
      }
    } else if (formData.code.startsWith("DMZ")) {
      // Si empieza con DMZ (pero no DMZF), quitamos la categoría Full si estaba seleccionada
      const fullCategory = categories.find(c => c.description === "Full");
      if (fullCategory && selectedCategories.includes(fullCategory.id_category)) {
        setSelectedCategories(prev => prev.filter(id => id !== fullCategory.id_category));
      }
    } else {
      // Si no empieza con DMZ ni DMZF, opcionalmente podrías limpiar o dejarlo como está
      // Por ahora lo dejamos para no ser intrusivos si el usuario borra el texto
    }
  }, [formData.code, categories]);

  const filteredCategories = categories.filter(cat => {
    if (formData.code.startsWith("DMZF")) {
      return cat.description === "Full";
    }
    if (formData.code.startsWith("DMZ")) {
      return cat.description !== "Full";
    }
    return true; // Mostrar todas si no hay prefijo reconocido
  });

  const toggleCategory = (id: number) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          ...formData,
          artistId: currentUser?.id_user,
          categoryIds: selectedCategories,
        }),
      });

      if (res.ok) {
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.href = "/hairsalon";
        }
      } else {
        const data = await res.json();
        setError(data.error || "Error al crear el cabello");
      }
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || fetchingUser) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 border-4 border-orange-600/30 border-t-orange-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Publicar Cabello</h2>
        <p className="text-gray-400 text-sm md:text-base">
          Recuerda colocar la información correcta antes de publicar tu cabello
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-200 ml-1">Nombre</label>
          <input
            type="text"
            required
            placeholder="Escribe el nombre del cabello"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-5 py-3 bg-black/40 border border-white/5 rounded-2xl text-white placeholder:text-gray-600 focus:outline-none focus:border-white/60 transition-all shadow-inner"
          />
        </div>


        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-200 ml-1">Código</label>
          <input
            type="text"
            required
            placeholder="Escribe el código del cabello"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            className="w-full px-5 py-3 bg-black/40 border border-white/5 rounded-2xl text-white placeholder:text-gray-600 focus:outline-none focus:border-white/60 transition-all shadow-inner"
          />
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-200 ml-1">Categorías</label>
          <div className="flex flex-wrap gap-2">
            {filteredCategories.map((cat) => (
              <button
                key={cat.id_category}
                type="button"
                onClick={() => toggleCategory(cat.id_category)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${selectedCategories.includes(cat.id_category)
                  ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                  }`}
              >
                {cat.description}
              </button>
            ))}
            {filteredCategories.length === 0 && (
              <p className="text-xs text-gray-500 italic ml-1">Ingresa un código válido para ver categorías</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-200 ml-1">Imagen</label>
          <input
            type="url"
            required
            placeholder="Escribe la URL de la imagen del cabello"
            value={formData.image_url}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            className="w-full px-5 py-3 bg-black/40 border border-white/5 rounded-2xl text-white placeholder:text-gray-600 focus:outline-none focus:border-white/60 transition-all shadow-inner"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-200 ml-1">Descripción</label>
          <textarea
            placeholder="Escribe la descripción del cabello"
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-5 py-3 bg-black/40 border border-white/5 rounded-2xl text-white placeholder:text-gray-600 focus:outline-none focus:border-white/60 transition-all shadow-inner resize-none"
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm animate-shake">
            {error}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-white text-black font-bold rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                Publicando...
              </>
            ) : (
              "Publicar Cabello"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
