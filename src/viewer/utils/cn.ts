import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Standard utility merging clsx and tailwind-merge for conflict-free classnames.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

