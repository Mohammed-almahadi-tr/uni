/**
 * The palette, as pure values (Track C1, extracted during D4).
 *
 * `branding.ts` reads and writes these; this file only describes them. The
 * split exists because the branding editor is a client component: importing
 * the font allow-list from `branding.ts` pulls `server-only`, the RBAC layer
 * and the Prisma client into the browser bundle, and Turbopack refuses it.
 *
 * The same shape as `lib/currency.ts`, and for the same reason — a rule two
 * runtimes both need belongs in a module neither of them has to fake. There
 * is exactly one `ALLOWED_FONTS`, one `inkFor`, one `themeTokens`, and the
 * server validates against the list the form was rendered from.
 */

export class BrandingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BrandingError';
  }
}

/**
 * The faces the application ships and that carry a complete Arabic range.
 *
 * An allow-list rather than free text, because the value is interpolated into
 * a `font-family` declaration; and because a face without proper Arabic
 * coverage falls back mid-word with different metrics, which is the failure
 * the layout already describes as "reads as a defect to whoever signs it".
 */
export const ALLOWED_FONTS = [
  'Cairo',
  'Tajawal',
  'IBM Plex Sans Arabic',
  'Noto Naskh Arabic',
] as const;

export type AllowedFont = (typeof ALLOWED_FONTS)[number];

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export interface BrandingTokens {
  shortCode: string;
  mottoAr: string | null;
  mottoEn: string | null;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  primary: Hsl;
  secondary: Hsl;
  accent: Hsl;
  headingFont: AllowedFont;
  bodyFont: AllowedFont;
}

/**
 * What a tenant with no branding row renders as.
 *
 * The deep teal from `globals.css`, so an unconfigured tenant looks like the
 * product rather than like a broken page. The fallback is deliberate: a
 * missing row must degrade to something legible, not to the browser's idea of
 * an unset custom property.
 */
export const DEFAULT_BRANDING: BrandingTokens = {
  shortCode: 'UNI',
  mottoAr: null,
  mottoEn: null,
  logoUrl: null,
  logoDarkUrl: null,
  faviconUrl: null,
  primary: { h: 176, s: 82, l: 27 },
  secondary: { h: 222, s: 47, l: 11 },
  accent: { h: 38, s: 92, l: 42 },
  headingFont: 'Cairo',
  bodyFont: 'Cairo',
};

export function assertHsl(label: string, c: Hsl): void {
  const whole = (n: number) => Number.isInteger(n);
  if (!whole(c.h) || !whole(c.s) || !whole(c.l)) {
    throw new BrandingError(`${label} must be whole numbers: hue, saturation %, lightness %.`);
  }
  if (c.h < 0 || c.h > 360) {
    throw new BrandingError(`${label} hue is ${c.h}; a hue is 0-360 degrees.`);
  }
  if (c.s < 0 || c.s > 100 || c.l < 0 || c.l > 100) {
    throw new BrandingError(`${label} saturation and lightness are percentages, 0-100.`);
  }
}

/**
 * Which ink is legible on a surface of this lightness.
 *
 * A white-label palette is chosen by a university, not by a designer, and the
 * most common thing it does is pick a pale brand colour and then find its
 * buttons unreadable. Rather than store a foreground the tenant can also get
 * wrong, the ink is derived: light surfaces take the dark foreground, dark
 * surfaces take white. The threshold is on lightness rather than on full WCAG
 * relative luminance, which is an approximation — but it is an approximation
 * that cannot be configured into the wrong answer.
 */
export function inkFor(lightness: number): 'light' | 'dark' {
  return lightness >= 62 ? 'dark' : 'light';
}

/**
 * Adjust a lightness by a number of points, staying inside the range.
 * Hover states and muted surfaces are derived this way rather than stored,
 * so a tenant cannot end up with a hover colour that has drifted from its base.
 */
export function shade(c: Hsl, delta: number): Hsl {
  return { ...c, l: Math.min(100, Math.max(0, c.l + delta)) };
}

const hsl = (c: Hsl) => `${c.h} ${c.s}% ${c.l}%`;

/**
 * The CSS custom properties for a palette.
 *
 * The names match the tokens `globals.css` already declares on `:root`, so
 * this overrides the shipped defaults rather than introducing a parallel set.
 * Track D's console renders the same tokens — one theme path, not two.
 */
export function themeTokens(b: BrandingTokens): Record<string, string> {
  const ink = inkFor(b.primary.l);
  return {
    '--primary-h': String(b.primary.h),
    '--primary-s': `${b.primary.s}%`,
    '--primary-l': `${b.primary.l}%`,
    '--primary': hsl(b.primary),
    '--primary-foreground': ink === 'light' ? '0 0% 100%' : '222 47% 11%',
    '--secondary': hsl(b.secondary),
    '--secondary-foreground':
      inkFor(b.secondary.l) === 'light' ? '0 0% 100%' : '222 47% 11%',
    '--accent': hsl(b.accent),
    '--accent-foreground': inkFor(b.accent.l) === 'light' ? '0 0% 100%' : '222 47% 11%',
    '--ring': hsl(b.primary),
    '--brand-heading-font': b.headingFont,
    '--brand-body-font': b.bodyFont,
  };
}

/**
 * The palette as a stylesheet fragment, ready to inline into `<head>`.
 *
 * Inlined rather than fetched: the palette is different per host, so it
 * cannot be a cached static file, and a separate request for it means the
 * page paints once in the default teal and again in the tenant's colours.
 *
 * Every value is a number or a member of `ALLOWED_FONTS`, so there is nothing
 * here for a tenant to inject — but the escape is applied anyway, because
 * "the values are constrained upstream" is the sentence that precedes most
 * injection bugs.
 */
export function themeStyle(b: BrandingTokens): string {
  const safe = (v: string) => v.replace(/[^a-zA-Z0-9%.,\s#-]/g, '');
  const body = Object.entries(themeTokens(b))
    .map(([k, v]) => `${k}: ${safe(v)};`)
    .join('\n  ');
  return `:root {\n  ${body}\n}`;
}
