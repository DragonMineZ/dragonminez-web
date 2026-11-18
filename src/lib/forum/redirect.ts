// Where a form sends the visitor back to. Pure, so tests can import it.

/** A same-site relative path (the page a form came from), else `fallback`. */
export function safeNext(value: string | undefined | null, fallback = "/forum"): string {
  if (!value || value.length > 500) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  // Browsers strip tabs and newlines from URLs and read "\" as "/".
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}
