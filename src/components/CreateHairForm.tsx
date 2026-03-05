import { useAuth } from "@clerk/astro/react";
import { useState, useEffect } from "react";

interface User {
  id_user: number;
}

export default function CreateHairForm() {
  const { isLoaded, isSignedIn, getToken, userId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingUser, setFetchingUser] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    image_url: "",
    description: "",
  });

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      const fetchUser = async () => {
        const token = await getToken();
        const res = await fetch("/api/user/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const user = await res.json();
          setCurrentUser(user);
        }
        setFetchingUser(false);
      };
      fetchUser();
    } else if (isLoaded) {
      setFetchingUser(false);
    }
  }, [isLoaded, isSignedIn, getToken]);

  if (!isLoaded || fetchingUser) {
    return <div className="text-center py-10">Cargando...</div>;
  }

  if (!isSignedIn) {
    return (
      <div className="text-center py-10">
        <p className="mb-4">Debes iniciar sesión para crear un cabello</p>
        <a
          href="/sign-in"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
        >
          Iniciar Sesión
        </a>
      </div>
    );
  }

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
        }),
      });

      if (res.ok) {
        window.location.href = "/hairsalon";
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

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-3xl font-bold mb-8">Crear Nuevo Cabello</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Nombre</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Código</label>
          <input
            type="text"
            required
            value={formData.code}
            onChange={(e) =>
              setFormData({ ...formData, code: e.target.value })
            }
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">URL de Imagen</label>
          <input
            type="url"
            required
            value={formData.image_url}
            onChange={(e) =>
              setFormData({ ...formData, image_url: e.target.value })
            }
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Descripción</label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={3}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 rounded-lg transition-colors"
        >
          {loading ? "Creando..." : "Crear Cabello"}
        </button>
      </form>
    </div>
  );
}
