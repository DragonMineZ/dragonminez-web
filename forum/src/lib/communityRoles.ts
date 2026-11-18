// Cosmetic community roles (name + color). Pure helpers; the colors are validated hex by roleSchema before they are stored.
export type RoleChip = { id: number; name: string; color: string };

/** Roles of a user, oldest role first, from the `roles: { select: { role } }` include. */
export const chips = (rows: { role: RoleChip }[]): RoleChip[] => rows.map((r) => r.role).sort((a, b) => a.id - b.id);

/** Name color: the first role's, else none (inherit). */
export const nameColor = (roles: RoleChip[]): string | undefined => roles[0]?.color;

export const chipStyle = (color: string): string =>
  `background-color: color-mix(in srgb, ${color} 18%, transparent); color: ${color}; border: 1px solid color-mix(in srgb, ${color} 40%, transparent)`;
