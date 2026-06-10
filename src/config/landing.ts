/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  LANDING PAGE CONTENT — edit this file to change what the home page shows.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  ▸ HERO VIDEOS  (`heroVideos`)
 *    Drop your showcase clips into `public/videos/` and list them below.
 *    They auto-play muted in the intro, cross-fading from one to the next.
 *    If the list is empty the hero falls back to the static artwork.
 *
 *  ▸ MEDIA SHOWCASE  (`showcaseItems`)
 *    Each entry renders a full section with an animated GIF (or video/image)
 *    next to a title + subtitle. Drop files into `public/media/` and add as
 *    many entries as you want — sections alternate left/right automatically.
 *
 *  Text fields accept either a plain string (shown for every language) or a
 *  per-language object: `{ es: "…", en: "…", pt: "…" }`.
 */

export type LocalizedText = string | { es?: string; en?: string; pt?: string };

export interface ShowcaseVideo {
    /** Path under /public, e.g. "/videos/kamehameha.mp4" */
    src: string;
    /** Optional poster image shown while the video loads. */
    poster?: string;
    /** Optional caption shown while this clip plays. */
    label?: LocalizedText;
}

export interface ShowcaseItem {
    /** Path under /public — .gif, .webp, .png, .jpg or .mp4/.webm */
    media: string;
    /** Small accent tag rendered above the title (optional). */
    eyebrow?: LocalizedText;
    title: LocalizedText;
    subtitle: LocalizedText;
    /** Longer body text under the subtitle (optional). */
    description?: LocalizedText;
    /** Optional call-to-action button. */
    cta?: { label: LocalizedText; href: string };
}

/* ── Intro videos ───────────────────────────────────────────────────────────
 * Add your clips here, e.g.:
 *   { src: "/videos/transformation.mp4", label: { en: "New transformations", es: "Nuevas transformaciones", pt: "Novas transformações" } },
 */
export const heroVideos: ShowcaseVideo[] = [
    // { src: "/videos/showcase-1.mp4" },
    // { src: "/videos/showcase-2.mp4", label: "Kamehameha!" },
];

/* ── Mod showcase sections (GIFs + subtitles) ───────────────────────────────
 * Replace the placeholder images with your GIFs, e.g.:
 *   media: "/media/kamehameha.gif",
 */
export const showcaseItems: ShowcaseItem[] = [
    {
        media: "/media/showcase-combat.png",
        eyebrow: { es: "Combate", en: "Combat", pt: "Combate" },
        title: {
            es: "COMBATE QUE SE SIENTE REAL",
            en: "COMBAT THAT FEELS REAL",
            pt: "COMBATE QUE PARECE REAL",
        },
        subtitle: {
            es: "Ráfagas de ki, combos cuerpo a cuerpo y técnicas legendarias con efectos visuales de nueva generación.",
            en: "Ki blasts, melee combos and legendary techniques with next-gen visual effects.",
            pt: "Rajadas de ki, combos corpo a corpo e técnicas lendárias com efeitos visuais de nova geração.",
        },
    },
    {
        media: "/media/showcase-transformations.png",
        eyebrow: { es: "Transformaciones", en: "Transformations", pt: "Transformações" },
        title: {
            es: "DESPIERTA TU PODER OCULTO",
            en: "AWAKEN YOUR HIDDEN POWER",
            pt: "DESPERTE SEU PODER OCULTO",
        },
        subtitle: {
            es: "Del estado base al Super Saiyan 3: cada transformación cambia tu apariencia, tu aura y tu poder.",
            en: "From base form to Super Saiyan 3: every transformation changes your look, your aura and your power.",
            pt: "Da forma base ao Super Saiyajin 3: cada transformação muda sua aparência, sua aura e seu poder.",
        },
    },
    {
        media: "/media/showcase-world.png",
        eyebrow: { es: "Mundo", en: "World", pt: "Mundo" },
        title: {
            es: "UN UNIVERSO POR EXPLORAR",
            en: "A UNIVERSE TO EXPLORE",
            pt: "UM UNIVERSO PARA EXPLORAR",
        },
        subtitle: {
            es: "Estructuras icónicas, sagas completas y las Esferas del Dragón esperándote en cada rincón del mundo.",
            en: "Iconic structures, full sagas and the Dragon Balls waiting for you in every corner of the world.",
            pt: "Estruturas icônicas, sagas completas e as Esferas do Dragão esperando por você em cada canto do mundo.",
        },
    },
];

/** Resolves a LocalizedText for the active language with sensible fallbacks. */
export function resolveText(
    text: LocalizedText | undefined,
    lang: string,
): string {
    if (text === undefined) return "";
    if (typeof text === "string") return text;
    const byLang = text as Record<string, string | undefined>;
    return byLang[lang] ?? byLang.es ?? byLang.en ?? byLang.pt ?? "";
}
