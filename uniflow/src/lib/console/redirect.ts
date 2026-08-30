import 'server-only';
import { redirect as nextRedirect } from 'next/navigation';
import { getPathname } from '@/i18n/navigation';

type Href = Parameters<typeof getPathname>[0]['href'];

/**
 * Redirect, keeping the locale prefix, and tell TypeScript it does not return.
 *
 * `next/navigation`'s `redirect` is typed `never`, which is what lets a guard
 * narrow a nullable session afterwards; next-intl's locale-aware wrapper is
 * not. Composing the two — build the localised path, then throw through
 * Next's redirect — gets both the prefix and the narrowing, instead of
 * scattering `!` assertions after every redirect in the console.
 */
export function redirectLocalised(locale: string, href: Href): never {
  nextRedirect(getPathname({ href, locale }));
}
