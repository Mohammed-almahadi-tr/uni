import 'server-only';
import type { SocialPlatform } from '@/generated/prisma/enums';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import {
  ALLOWED_FONTS,
  assertHsl,
  BrandingError,
  DEFAULT_BRANDING,
  inkFor,
  shade,
  themeStyle,
  themeTokens,
  type AllowedFont,
  type BrandingTokens,
  type Hsl,
} from './theme';

// Re-exported so every existing caller of `branding.ts` is unchanged by
// the split. The definitions live in `theme.ts`; this is the same module
// surface it always had.
export {
  ALLOWED_FONTS,
  assertHsl,
  BrandingError,
  DEFAULT_BRANDING,
  inkFor,
  shade,
  themeStyle,
  themeTokens,
  type AllowedFont,
  type BrandingTokens,
  type Hsl,
};

/**
 * The theme engine (SRS REQ-LP-01, Track C1).
 *
 * ## What it replaces
 *
 * ```vb
 * Me.BackgroundImage = Global.Rebat_University.My.Resources.Resources.BG1
 * ```
 * ([frmMain.designer.vb:225](Nile College System - Ribat Univ/Rebat University Application/Form/frmMain.designer.vb#L225))
 *
 * Branding lived in `My Project\Resources` and was compiled into the binary.
 * To white-label the product you copied the source tree and swapped the
 * bitmaps, which is why the Ribat build's window title is the vendor's name
 * and the Nile build's is a third institution's. Identity was a constant, so
 * it could not be wrong for one customer — only for everybody.
 *
 * ## Colours are channels, not colours
 *
 * `globals.css` already defines its palette as HSL channels —
 * `--primary: <h> <s>% <l>%` — precisely so a tenant can override three custom
 * properties at runtime without a rebuild. This module stores the same three
 * numbers per colour and writes them back out.
 *
 * Storing channels rather than `"#0d5f57"` buys two things. The database can
 * range-check them, which a hex string or a colour name cannot be; and a
 * derived shade (a hover state, a muted surface, the ring) is a lightness
 * adjustment rather than a second stored value that drifts from the first.
 *
 * A hue of 400 does not fail loudly. It produces an invalid CSS declaration,
 * the custom property falls back to its initial value, and the university's
 * site renders in a colour nobody chose — on a page the vendor never loads.
 * `chk_branding_hsl` refuses it at the database instead.
 */

export interface SetBrandingInput {
  shortCode: string;
  mottoAr?: string | null;
  mottoEn?: string | null;
  logoUrl?: string | null;
  logoDarkUrl?: string | null;
  faviconUrl?: string | null;
  primary: Hsl;
  secondary: Hsl;
  accent: Hsl;
  headingFont?: AllowedFont;
  bodyFont?: AllowedFont;
}

/**
 * Set a tenant's identity. Upsert: there is one branding row per tenant, by
 * unique index, because "which of these two palettes is live" is not a
 * question a white-label product should be able to ask.
 */
export async function setBranding(
  principal: Principal,
  input: SetBrandingInput,
): Promise<{ id: string }> {
  requirePermission(principal, 'cms.manage');

  const shortCode = input.shortCode?.trim().toUpperCase();
  if (!shortCode || !/^[A-Z0-9][A-Z0-9-]{0,11}$/.test(shortCode)) {
    throw new BrandingError(
      `"${input.shortCode}" is not a short code. Up to 12 characters, letters, digits and ` +
        `hyphens — it goes on a certificate and an ID card.`,
    );
  }

  assertHsl('Primary', input.primary);
  assertHsl('Secondary', input.secondary);
  assertHsl('Accent', input.accent);

  const headingFont = input.headingFont ?? 'Cairo';
  const bodyFont = input.bodyFont ?? 'Cairo';
  for (const [label, font] of [
    ['Heading font', headingFont],
    ['Body font', bodyFont],
  ] as const) {
    if (!ALLOWED_FONTS.includes(font)) {
      throw new BrandingError(
        `${label} "${font}" is not one of the faces this application ships. ` +
          `Choose from: ${ALLOWED_FONTS.join(', ')}. A face without full Arabic coverage ` +
          `breaks mid-word on every Arabic page.`,
      );
    }
  }

  return withTenant(principal.tenantId, async (tx) => {
    const before = await tx.tenantBranding.findUnique({
      where: { tenantId: principal.tenantId },
      select: { id: true, shortCode: true, primaryH: true, primaryS: true, primaryL: true },
    });

    const data = {
      shortCode,
      mottoAr: input.mottoAr?.trim() || null,
      mottoEn: input.mottoEn?.trim() || null,
      logoUrl: input.logoUrl?.trim() || null,
      logoDarkUrl: input.logoDarkUrl?.trim() || null,
      faviconUrl: input.faviconUrl?.trim() || null,
      primaryH: input.primary.h,
      primaryS: input.primary.s,
      primaryL: input.primary.l,
      secondaryH: input.secondary.h,
      secondaryS: input.secondary.s,
      secondaryL: input.secondary.l,
      accentH: input.accent.h,
      accentS: input.accent.s,
      accentL: input.accent.l,
      headingFont,
      bodyFont,
      updatedById: principal.userId,
    };

    const row = await tx.tenantBranding.upsert({
      where: { tenantId: principal.tenantId },
      create: { tenantId: principal.tenantId, ...data },
      update: data,
      select: { id: true },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: before ? 'UPDATE' : 'INSERT',
      resourceType: 'TenantBranding',
      resourceId: row.id,
      before: before ?? undefined,
      after: { shortCode, primary: input.primary },
    });

    return row;
  });
}

function toTokens(row: {
  shortCode: string;
  mottoAr: string | null;
  mottoEn: string | null;
  logoUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  primaryH: number;
  primaryS: number;
  primaryL: number;
  secondaryH: number;
  secondaryS: number;
  secondaryL: number;
  accentH: number;
  accentS: number;
  accentL: number;
  headingFont: string;
  bodyFont: string;
}): BrandingTokens {
  const font = (v: string): AllowedFont =>
    (ALLOWED_FONTS as readonly string[]).includes(v) ? (v as AllowedFont) : 'Cairo';
  return {
    shortCode: row.shortCode,
    mottoAr: row.mottoAr,
    mottoEn: row.mottoEn,
    logoUrl: row.logoUrl,
    logoDarkUrl: row.logoDarkUrl,
    faviconUrl: row.faviconUrl,
    primary: { h: row.primaryH, s: row.primaryS, l: row.primaryL },
    secondary: { h: row.secondaryH, s: row.secondaryS, l: row.secondaryL },
    accent: { h: row.accentH, s: row.accentS, l: row.accentL },
    headingFont: font(row.headingFont),
    bodyFont: font(row.bodyFont),
  };
}

/** Read the palette inside an open transaction. Falls back to the default. */
export async function brandingInTx(tx: Tx, tenantId: string): Promise<BrandingTokens> {
  const row = await tx.tenantBranding.findUnique({ where: { tenantId } });
  return row ? toTokens(row) : DEFAULT_BRANDING;
}

/** Read a tenant's palette. Public — the landing page needs it before login. */
export async function brandingFor(tenantId: string): Promise<BrandingTokens> {
  return withTenant(tenantId, (tx) => brandingInTx(tx, tenantId));
}

export interface SocialLinkInput {
  platform: SocialPlatform;
  url: string;
  sortOrder?: number;
}

/**
 * Replace the social links. Whole-set replacement rather than per-row edits,
 * because the ordering is part of the value and a partial update leaves it
 * ambiguous.
 *
 * https only — `chk_social_url_https`. A social link is a footer element on
 * every page, which makes it the least-examined link on the site.
 */
export async function setSocialLinks(
  principal: Principal,
  links: SocialLinkInput[],
): Promise<number> {
  requirePermission(principal, 'cms.manage');

  const seen = new Set<string>();
  for (const l of links) {
    if (seen.has(l.platform)) {
      throw new BrandingError(`Two links given for ${l.platform}. One account per platform.`);
    }
    seen.add(l.platform);
    if (!/^https:\/\/\S+$/.test(l.url.trim())) {
      throw new BrandingError(
        `"${l.url}" is not an https URL. Social links appear in the footer of every page.`,
      );
    }
  }

  return withTenant(principal.tenantId, async (tx) => {
    await tx.tenantSocialLink.deleteMany({ where: { tenantId: principal.tenantId } });
    if (links.length > 0) {
      await tx.tenantSocialLink.createMany({
        data: links.map((l, i) => ({
          tenantId: principal.tenantId,
          platform: l.platform,
          url: l.url.trim(),
          sortOrder: l.sortOrder ?? i,
        })),
      });
    }
    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'TenantSocialLink',
      resourceId: principal.tenantId,
      after: { count: links.length },
    });
    return links.length;
  });
}

export async function socialLinksInTx(
  tx: Tx,
  tenantId: string,
): Promise<{ platform: SocialPlatform; url: string }[]> {
  return tx.tenantSocialLink.findMany({
    where: { tenantId },
    orderBy: { sortOrder: 'asc' },
    select: { platform: true, url: true },
  });
}
