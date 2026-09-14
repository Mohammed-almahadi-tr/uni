import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind classes so a later class wins over an earlier conflicting
 *  one. The shadcn convention; every component here takes a `className` and
 *  runs it through this. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
