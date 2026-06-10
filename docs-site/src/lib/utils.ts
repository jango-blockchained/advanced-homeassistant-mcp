import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Compose Tailwind class strings safely.
 *
 * `clsx` resolves conditional/falsy values, `tailwind-merge` dedupes
 * conflicting Tailwind classes (e.g. `p-2 p-4` → `p-4`). Use this
 * everywhere a component accepts a `class` prop.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
