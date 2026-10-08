export const INHERIT = -1;

const HEX_PATTERN = /^[0-9a-fA-F]{6}$/;

export function parseColor(hex: string | null | undefined): number {
    if (hex === null || hex === undefined) return INHERIT;
    let value = hex.trim();
    if (value.startsWith('#')) value = value.substring(1);
    if (!HEX_PATTERN.test(value)) return INHERIT;
    return parseInt(value, 16) & 0xffffff;
}

export function normalizeColor(hex: string | null | undefined): string | null {
    const rgb = parseColor(hex);
    return rgb === INHERIT ? null : formatColor(rgb);
}

export function formatColor(rgb: number): string {
    return '#' + (rgb & 0xffffff).toString(16).toUpperCase().padStart(6, '0');
}

export function lerpColor(from: number, to: number, factor: number): number {
    if (factor <= 0) return from;
    if (factor >= 1) return to;
    const r = Math.round(((from >> 16) & 0xff) + (((to >> 16) & 0xff) - ((from >> 16) & 0xff)) * factor);
    const g = Math.round(((from >> 8) & 0xff) + (((to >> 8) & 0xff) - ((from >> 8) & 0xff)) * factor);
    const b = Math.round((from & 0xff) + ((to & 0xff) - (from & 0xff)) * factor);
    return (r << 16) | (g << 8) | b;
}
