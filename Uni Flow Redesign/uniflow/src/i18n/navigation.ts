import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/** Locale-aware Link/redirect/router. Use these, not next/link directly, or
 *  navigation silently drops the locale prefix. */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
