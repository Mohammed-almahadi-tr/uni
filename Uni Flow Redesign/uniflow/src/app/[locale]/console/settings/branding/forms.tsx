'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ALLOWED_FONTS, type BrandingTokens, type Hsl } from '@/lib/cms/theme';
import { save, saveLinks, type BrandingState } from './actions';

const initial: BrandingState = { error: null, saved: false };

const PLATFORMS = [
  'FACEBOOK',
  'X',
  'INSTAGRAM',
  'YOUTUBE',
  'LINKEDIN',
  'TELEGRAM',
  'WHATSAPP',
  'TIKTOK',
] as const;

const field = 'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';
const small = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm';

/**
 * Three HSL channels, with a live swatch (Track D4 / tenant administration).
 *
 * HSL rather than a hex picker because the product's own tokens are HSL: the
 * derived shades and the derived ink are computed from lightness, so choosing
 * in the same space is choosing the thing that is actually stored. The
 * swatch is the only client state here and it exists because a palette
 * nobody can see before saving is a palette that gets saved wrong.
 *
 * The channel ranges are also a database constraint — `chk_branding_hsl` —
 * so these `min`/`max` attributes are a courtesy, not the control.
 */
function ColourFields({
  name,
  label,
  value,
}: {
  name: string;
  label: string;
  value: Hsl;
}) {
  const [hsl, setHsl] = useState(value);
  const t = useTranslations('settings.branding');

  return (
    <fieldset className="rounded-lg border border-border p-4">
      <legend className="px-2 text-sm font-medium">{label}</legend>
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className="h-11 w-11 shrink-0 rounded-md border border-border"
          style={{ background: `hsl(${hsl.h} ${hsl.s}% ${hsl.l}%)` }}
        />
        <div className="grid flex-1 gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">{t('hue')}</span>
            <input
              name={`${name}_h`}
              type="number"
              min={0}
              max={360}
              value={hsl.h}
              onChange={(e) => setHsl({ ...hsl, h: Number(e.target.value) })}
              className={`numeric ${small}`}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">
              {t('saturation')}
            </span>
            <input
              name={`${name}_s`}
              type="number"
              min={0}
              max={100}
              value={hsl.s}
              onChange={(e) => setHsl({ ...hsl, s: Number(e.target.value) })}
              className={`numeric ${small}`}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">
              {t('lightness')}
            </span>
            <input
              name={`${name}_l`}
              type="number"
              min={0}
              max={100}
              value={hsl.l}
              onChange={(e) => setHsl({ ...hsl, l: Number(e.target.value) })}
              className={`numeric ${small}`}
            />
          </label>
        </div>
      </div>
    </fieldset>
  );
}

export function BrandingForm({ branding }: { branding: BrandingTokens }) {
  const [state, action, pending] = useActionState(save, initial);
  const t = useTranslations('settings.branding');
  const c = useTranslations('settings.common');

  return (
    <form action={action} className="space-y-5">
      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {state.error}
        </p>
      )}
      {state.saved && (
        <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
          {c('saved')}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('shortCode')}</span>
          <input
            name="shortCode"
            required
            maxLength={8}
            defaultValue={branding.shortCode}
            dir="ltr"
            className={`numeric ${field}`}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('mottoAr')}</span>
          <input
            name="mottoAr"
            defaultValue={branding.mottoAr ?? ''}
            dir="rtl"
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('mottoEn')}</span>
          <input
            name="mottoEn"
            defaultValue={branding.mottoEn ?? ''}
            dir="ltr"
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('logoUrl')}</span>
          <input
            name="logoUrl"
            defaultValue={branding.logoUrl ?? ''}
            dir="ltr"
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('logoDarkUrl')}</span>
          <input
            name="logoDarkUrl"
            defaultValue={branding.logoDarkUrl ?? ''}
            dir="ltr"
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('faviconUrl')}</span>
          <input
            name="faviconUrl"
            defaultValue={branding.faviconUrl ?? ''}
            dir="ltr"
            className={field}
          />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">{t('urlHint')}</p>

      <div className="grid gap-4 lg:grid-cols-3">
        <ColourFields name="primary" label={t('primary')} value={branding.primary} />
        <ColourFields name="secondary" label={t('secondary')} value={branding.secondary} />
        <ColourFields name="accent" label={t('accent')} value={branding.accent} />
      </div>
      <p className="text-xs text-muted-foreground">{t('inkHint')}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('headingFont')}</span>
          <select name="headingFont" defaultValue={branding.headingFont} className={field}>
            {ALLOWED_FONTS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('bodyFont')}</span>
          <select name="bodyFont" defaultValue={branding.bodyFont} className={field}>
            {ALLOWED_FONTS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-xs text-muted-foreground">{t('fontHint')}</p>

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : c('save')}
      </button>
    </form>
  );
}

/** The whole set of social links, replaced together. */
export function SocialLinks({
  links,
}: {
  links: Array<{ platform: string; url: string }>;
}) {
  const [state, action, pending] = useActionState(saveLinks, initial);
  const t = useTranslations('settings.branding');
  const c = useTranslations('settings.common');
  const p = useTranslations('settings.platform');

  // One spare row beyond what exists, so adding the next one needs no button.
  const rows = Array.from({ length: Math.max(links.length + 1, 4) }, (_, i) => links[i]);

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {state.error}
        </p>
      )}
      {state.saved && (
        <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
          {c('saved')}
        </p>
      )}

      <div className="space-y-3">
        {rows.map((link, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">
                {t('platform')}
              </span>
              <select
                name={`link_${i}_platform`}
                defaultValue={link?.platform ?? 'FACEBOOK'}
                className={small}
              >
                {PLATFORMS.map((k) => (
                  <option key={k} value={k}>
                    {p(k)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs text-muted-foreground">{t('url')}</span>
              <input
                name={`link_${i}_url`}
                type="url"
                defaultValue={link?.url ?? ''}
                dir="ltr"
                placeholder="https://"
                className={small}
              />
            </label>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">{t('httpsOnly')}</p>

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md border border-border px-5 text-sm font-medium hover:bg-muted disabled:opacity-50"
      >
        {pending ? c('working') : c('save')}
      </button>
    </form>
  );
}
