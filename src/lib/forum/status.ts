// Status of suggestions and bug reports. Pure: no imports, so tests and pages share it.
export const STATUSES: Record<string, readonly string[]> = {
  suggestions: ["open", "planned", "done", "declined"],
  bugs: ["open", "confirmed", "fixed", "wontfix"],
};

/** Tailwind classes of a status badge (full class names so Tailwind picks them up). */
export const STATUS_STYLE: Record<string, string> = {
  open: "bg-white/10 text-muted",
  planned: "bg-violet-500/15 text-violet-300",
  confirmed: "bg-amber-500/15 text-amber-300",
  done: "bg-emerald-500/15 text-emerald-300",
  fixed: "bg-emerald-500/15 text-emerald-300",
  declined: "bg-red-500/15 text-red-300",
  wontfix: "bg-red-500/15 text-red-300",
};

export const isStatus = (kind: string, value: string): boolean => STATUSES[kind]?.includes(value) ?? false;
