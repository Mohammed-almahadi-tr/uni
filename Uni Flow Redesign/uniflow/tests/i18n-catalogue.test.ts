/**
 * Message catalogue parity.
 *
 * A key present in one language and missing from the other renders as the raw
 * key path on screen — "nav.chartOfAccounts" instead of "دليل الحسابات". That
 * is the standard way a bilingual interface rots: English gets a new string,
 * Arabic does not, and nobody notices until a user does.
 */
import { describe, expect, it } from 'vitest';
import ar from '../messages/ar.json';
import en from '../messages/en.json';
import { directionOf, routing } from '@/i18n/routing';

function flatten(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v !== null && typeof v === 'object'
      ? flatten(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
}

describe('message catalogues', () => {
  it('have identical key sets', () => {
    const a = flatten(ar).sort();
    const e = flatten(en).sort();
    expect(a).toEqual(e);
  });

  it('have no empty translations', () => {
    for (const [name, cat] of [['ar', ar], ['en', en]] as const) {
      const walk = (o: Record<string, unknown>, p = ''): void => {
        for (const [k, v] of Object.entries(o)) {
          if (v !== null && typeof v === 'object') walk(v as Record<string, unknown>, `${p}${k}.`);
          else expect(String(v).trim(), `${name}:${p}${k} is empty`).not.toBe('');
        }
      };
      walk(cat as Record<string, unknown>);
    }
  });

  it('Arabic catalogue is actually in Arabic', () => {
    // Guards against an untranslated English string being pasted in.
    const arabicScript = /[\u0600-\u06FF]/;
    const walk = (o: Record<string, unknown>, p = ''): void => {
      for (const [k, v] of Object.entries(o)) {
        if (v !== null && typeof v === 'object') walk(v as Record<string, unknown>, `${p}${k}.`);
        else expect(arabicScript.test(String(v)), `ar:${p}${k} has no Arabic script`).toBe(true);
      }
    };
    walk(ar as Record<string, unknown>);
  });
});

describe('locale routing', () => {
  it('defaults to Arabic', () => {
    // These are Sudanese institutions; Arabic is the working language and the
    // legacy system's own forms were RTL.
    expect(routing.defaultLocale).toBe('ar');
  });

  it('maps locale to text direction', () => {
    expect(directionOf('ar')).toBe('rtl');
    expect(directionOf('en')).toBe('ltr');
  });
});
