import type { Hair } from "../../types/hair";
import Button from "../../ui/Button";
import Field from "../../ui/Field";
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
        <div className="h-10 w-10 border-4 border-foreground/20 border-t-foreground rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full max-h-[85vh]">
      {/* Sticky Header */}
      <div className="shrink-0 p-6 md:p-8 pb-4 sticky top-0 bg-background z-20 w-full flex flex-col">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          {isEditing ? "Editar Cabello" : "Publicar Cabello"}
        </h2>
        <p className="text-muted text-sm md:text-base">
          {isEditing
            ? "Actualiza la información de tu publicación"
            : "Recuerda colocar la información correcta antes de publicar tu cabello"}
        </p>
      </div>

      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-hide">
        <form id="hair-form" onSubmit={handleSubmit} className="space-y-6">
          <Field
            label="Nombre"
            type="text"
            required
            placeholder="Escribe el nombre del cabello"
            value={formData.name}
            onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
          />

          <Field
            label="Código"
            as="textarea"
            required
            placeholder="Escribe el código del cabello"
            value={formData.code}
            onChange={(e: any) => setFormData({ ...formData, code: e.target.value })}
            maxLength={5000}
            className="font-mono text-sm"
          />

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-foreground/70 ml-1">
              Categorías
            </label>
            <div className="flex flex-wrap gap-2">
              {filteredCategories.map((cat) => (
                <button
                  key={cat.id_category}
                  type="button"
                  onClick={() => toggleCategory(cat.id_category)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${selectedCategories.includes(cat.id_category)
                    ? "bg-foreground text-background shadow-glow"
                    : "bg-glass text-muted hover:bg-glass-strong hover:text-foreground"
                    }`}
                >
                  {cat.description}
                </button>
              ))}
              {filteredCategories.length === 0 && (
                <p className="text-xs text-muted italic ml-1">
                  Ingresa un código válido para ver categorías
                </p>
              )}
            </div>
          </div>

          <Field
            label="Imagen"
            type="url"
            required
            placeholder="Escribe la URL de la imagen del cabello"
            value={formData.image_url}
            onChange={(e: any) => setFormData({ ...formData, image_url: e.target.value })}
          />

          <Field
            label="Descripción"
            as="textarea"
            placeholder="Escribe la descripción del cabello"
            rows={2}
            value={formData.description}
            onChange={(e: any) =>
              setFormData({ ...formData, description: e.target.value })
            }
          />

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm animate-shake">
              {error}
            </div>
          )}
        </form>
      </div>

      {/* Sticky Footer */}
      <div className="shrink-0 p-6 md:p-8 pt-4 sticky bottom-0 bg-background z-20 w-full flex justify-end">
        <Button
          type="submit"
          form="hair-form"
          disabled={loading}
          className="flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="h-4 w-4 border-2 border-background/20 border-t-background rounded-full animate-spin"></div>
              {isEditing ? "Actualizando..." : "Publicando..."}
            </>
          ) : isEditing ? (
            "Guardar Cambios"
          ) : (
            "Publicar Cabello"
          )}
        </Button>
      </div>
    </div>
  );
}
