import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge conditional class names (clsx) and de-duplicate conflicting Tailwind
 * utilities (tailwind-merge). Standard Shadcn UI helper used by all UI
 * primitives so later dashboard tasks share one class-composition path.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
