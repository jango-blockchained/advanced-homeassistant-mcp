/**
 * Tailwind class composition helper.
 *
 * Standard shadcn `cn()` pattern: filters falsy values, joins the
 * remaining strings with a space. Works with arrays, objects, and
 * strings, so callers can use conditionals like
 * `cn("base", isActive && "active", { "selected": id === 1 })`.
 */
export type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ClassValue[]
  | { [key: string]: boolean | null | undefined };

/** Flatten a class value into a string, dropping falsy entries. */
function flatten(value: ClassValue): string[] {
  if (value === null || value === undefined || value === false || value === true) {
    return [];
  }
  if (typeof value === "string" || typeof value === "number") {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap(flatten);
  }
  return Object.entries(value)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([cls]) => cls);
}

export function cn(...inputs: ClassValue[]): string {
  return inputs.flatMap(flatten).join(" ");
}
