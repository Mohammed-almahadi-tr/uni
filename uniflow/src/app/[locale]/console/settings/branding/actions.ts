'use server';

import { revalidatePath } from 'next/cache';
import type { SocialPlatform } from '@/generated/prisma/enums';
import { currentContext } from '@/lib/console/session';
import {
  ALLOWED_FONTS,
  setBranding,
  setSocialLinks,
  type AllowedFont,
  type SocialLinkInput,
} from '@/lib/cms/branding';

/**
 * Tenant identity (tenant administration, SRS REQ-LP-01).
 *
 * Everything here is constrained somewhere other than this file:
 *
 *   · the three colours are HSL channels with `chk_branding_hsl` refusing
 *     anything outside 0-360 and 0-100, so a palette cannot be stored that no
 *     browser can render;
 *   · fonts come from a shipped allow-list, because a face named but not
 *     shipped renders as the browser's fallback — usually wrong for Arabic
 *     and always ugly;
 *   · text colour is **derived** from each colour's lightness rather than
 *     configured, so nobody can choose white on yellow;
 *   · social links are https only, by constraint, because a footer link on
 *     every page is the least-examined link on a site.
 *
 * This action's whole job is to read the form and hand it over.
 */

export interface BrandingState {
  error: string | null;
  saved: boolean;
}

const blank = (): BrandingState => ({ error: null, saved: false });

const str = (f: FormData, k: string): string => {
  const v = f.get(k);
  return typeof v === 'string' ? v.trim() : '';
};

const num = (f: FormData, k: string, fallback: number): number => {
  const n = Number(str(f, k));
  return Number.isFinite(n) ? n : fallback;
};

const hsl = (f: FormData, prefix: string, fallback: [number, number, number]) => ({
  h: num(f, `${prefix}_h`, fallback[0]),
  s: num(f, `${prefix}_s`, fallback[1]),
  l: num(f, `${prefix}_l`, fallback[2]),
});

const font = (f: FormData, k: string, fallback: AllowedFont): AllowedFont => {
  const v = str(f, k);
  return (ALLOWED_FONTS as readonly string[]).includes(v) ? (v as AllowedFont) : fallback;
};

function explain(e: unknown): string {
  if (e instanceof Error && e.name !== 'Error' && e.message) return e.message;
  console.error('[branding]', e);
  return 'That could not be completed.';
}

export async function save(_prev: BrandingState, form: FormData): Promise<BrandingState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    await setBranding(ctx.principal, {
      shortCode: str(form, 'shortCode'),
      mottoAr: str(form, 'mottoAr') || null,
      mottoEn: str(form, 'mottoEn') || null,
      logoUrl: str(form, 'logoUrl') || null,
      logoDarkUrl: str(form, 'logoDarkUrl') || null,
      faviconUrl: str(form, 'faviconUrl') || null,
      primary: hsl(form, 'primary', [176, 82, 27]),
      secondary: hsl(form, 'secondary', [176, 40, 40]),
      accent: hsl(form, 'accent', [38, 92, 50]),
      headingFont: font(form, 'headingFont', 'Cairo'),
      bodyFont: font(form, 'bodyFont', 'Cairo'),
    });

    // The console renders the same tokens the public site does — one theme
    // path, not two — so both have to be revalidated when they change.
    revalidatePath('/console/settings/branding', 'layout');
    revalidatePath('/', 'layout');
    return { error: null, saved: true };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/**
 * Replace the social links wholesale.
 *
 * Whole-set replacement rather than per-row edits, matching the module: the
 * ordering is part of the value, and a partial update leaves it ambiguous.
 */
export async function saveLinks(
  _prev: BrandingState,
  form: FormData,
): Promise<BrandingState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const indices = new Set<number>();
  for (const key of form.keys()) {
    const m = key.match(/^link_(\d+)_url$/);
    if (m) indices.add(Number(m[1]));
  }

  const links: SocialLinkInput[] = [];
  for (const i of [...indices].sort((a, b) => a - b)) {
    const url = str(form, `link_${i}_url`);
    if (!url) continue;
    links.push({
      platform: str(form, `link_${i}_platform`) as SocialPlatform,
      url,
      sortOrder: links.length,
    });
  }

  try {
    await setSocialLinks(ctx.principal, links);
    revalidatePath('/console/settings/branding');
    revalidatePath('/', 'layout');
    return { error: null, saved: true };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}
