const ONE_YEAR = 60 * 60 * 24 * 365;
const SHARED_DOMAIN = 'dragonminez.com';

export const THEME_COOKIE = 'dmz_theme';
export const LANG_COOKIE = 'dmz_lang';

export function readSharedPref(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
}

export function writeSharedPref(name: string, value: string): void {
    if (typeof document === 'undefined') return;
    const host = window.location.hostname;
    const domain = host === SHARED_DOMAIN || host.endsWith(`.${SHARED_DOMAIN}`) ? `; Domain=.${SHARED_DOMAIN}` : '';
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax${domain}${secure}`;
}
