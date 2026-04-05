import type { Hair } from "../../types/hair";
import Button from "../../ui/Button";
import { useHairForm } from "../../../hooks/useHairForm";

export default function CreateHairForm({
  onSuccess,
  initialData,
}: {
  onSuccess?: () => void;
  initialData?: Hair;
}) {
  const {
    isLoaded,
    fetchingUser,
    loading,
    error,
    formData,
    setFormData,
    selectedCategories,
    toggleCategory,
    filteredCategories,
    handleSubmit,
    isEditing
  } = useHairForm(initialData, onSuccess);

  if (!isLoaded || fetchingUser) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
          {isEditing ? "Editar Cabello" : "Publicar Cabello"}
        </h2>
        <p className="text-muted text-sm md:text-base">
          {isEditing
            ? "Actualiza la información de tu publicación"
            : "Recuerda colocar la información correcta antes de publicar tu cabello"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-200 ml-1">
            Nombre
          </label>
          <input
            type="text"
            required
            placeholder="Escribe el nombre del cabello"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-5 py-3 bg-black/40 border border-glass rounded-2xl text-white placeholder:text-gray-600 focus:outline-none focus:border-white/60 transition-all shadow-inner"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-200 ml-1">
            Código
          </label>
          <input
            type="text"
            required
            placeholder="Escribe el código del cabello"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            className="w-full px-5 py-3 bg-black/40 border border-glass rounded-2xl text-white placeholder:text-gray-600 focus:outline-none focus:border-white/60 transition-all shadow-inner"
          />
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-200 ml-1">
            Categorías
          </label>
          <div className="flex flex-wrap gap-2">
            {filteredCategories.map((cat) => (
              <button
                key={cat.id_category}
                type="button"
                onClick={() => toggleCategory(cat.id_category)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${selectedCategories.includes(cat.id_category)
                  ? "bg-white text-black shadow-glow"
                  : "bg-glass text-muted hover:bg-glass-strong hover:text-white"
                  }`}
              >
                {cat.description}
              </button>
            ))}
            {filteredCategories.length === 0 && (
              <p className="text-xs text-gray-500 italic ml-1">
                Ingresa un código válido para ver categorías
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-200 ml-1">
            Imagen
          </label>
          <input
            type="url"
            required
            placeholder="Escribe la URL de la imagen del cabello"
            value={formData.image_url}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            className="w-full px-5 py-3 bg-black/40 border border-glass rounded-2xl text-white placeholder:text-gray-600 focus:outline-none focus:border-white/60 transition-all shadow-inner"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-200 ml-1">
            Descripción
          </label>
          <textarea
            placeholder="Escribe la descripción del cabello"
            rows={2}
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="w-full px-5 py-3 bg-black/40 border border-glass rounded-2xl text-white placeholder:text-gray-600 focus:outline-none focus:border-white/60 transition-all shadow-inner resize-none"
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm animate-shake">
            {error}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 border-2 border-black/20 border-t-black rounded-full animate-spin"></div>
                {isEditing ? "Actualizando..." : "Publicando..."}
              </>
            ) : isEditing ? (
              "Guardar Cambios"
            ) : (
              "Publicar Cabello"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
