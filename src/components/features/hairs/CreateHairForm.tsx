import type { Hair } from "../../types/hair";
import Button from "../../ui/Button";
import Field from "../../ui/Field";
import ErrorAlert from "../../ui/ErrorAlert";
import { useHairForm } from "../../../hooks/useHairForm";
import { useLanguage } from "../../../i18n";

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
        errors,
        formData,
        updateField,
        selectedCategories,
        toggleCategory,
        filteredCategories,
        handleSubmit,
        isEditing,
        setError
    } = useHairForm(initialData, onSuccess);
    const { t } = useLanguage();

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
                    {isEditing ? t('hairSalon.editTitle') : t('hairSalon.publishTitle')}
                </h2>
                <p className="text-muted text-sm md:text-base">
                    {isEditing
                        ? t('hairSalon.editDesc')
                        : t('hairSalon.publishDesc')}
                </p>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-hide">
                <form id="hair-form" onSubmit={handleSubmit} noValidate className="space-y-6">
                    <Field
                        label={t('hairSalon.formName')}
                        type="text"
                        required
                        placeholder={t('hairSalon.formNamePlaceholder')}
                        value={formData.name}
                        error={errors.name ? t(`hairSalon.${errors.name}` as any) : undefined}
                        onChange={(e: any) => updateField('name', e.target.value)}
                    />

                    <Field
                        label={t('hairSalon.formCode')}
                        as="textarea"
                        required
                        placeholder={t('hairSalon.formCodePlaceholder')}
                        value={formData.code}
                        error={errors.code ? t(`hairSalon.${errors.code}` as any) : undefined}
                        onChange={(e: any) => updateField('code', e.target.value)}
                        maxLength={10000}
                        className="font-mono text-sm"
                    />

                    <div className="space-y-3">
                        <label className="block text-sm font-semibold text-foreground/70 ml-1">
                            {t('hairSalon.formCategories')}
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
                                    {t('hairSalon.formCategoriesEmpty')}
                                </p>
                            )}
                        </div>
                    </div>

                    <Field
                        label={t('hairSalon.formImage')}
                        type="url"
                        required
                        placeholder={t('hairSalon.formImagePlaceholder')}
                        value={formData.image_url}
                        error={errors.image_url ? t(`hairSalon.${errors.image_url}` as any) : undefined}
                        onChange={(e: any) => updateField('image_url', e.target.value)}
                    />

                    <Field
                        label={t('hairSalon.formDescription')}
                        as="textarea"
                        placeholder={t('hairSalon.formDescriptionPlaceholder')}
                        rows={2}
                        value={formData.description}
                        onChange={(e: any) => updateField('description', e.target.value)}
                    />

                    <ErrorAlert
                        show={!!error}
                        message={error.includes('.') ? t(error as any) : (error === 'formInvalidFields' ? t('hairSalon.formInvalidFields') : error)}
                        onClose={() => setError('')}
                    />
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
              {isEditing ? t('hairSalon.updating') : t('hairSalon.publishing')}
            </>
          ) : isEditing ? (
            t('hairSalon.saveChanges')
          ) : (
            t('hairSalon.publishTitle')
          )}
        </Button>
      </div>
    </div>
  );
}
