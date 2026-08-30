import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { searchDirectory } from '@/lib/students/directory';
import type { Principal } from '@/lib/auth/rbac';
import { pickText, type Locale } from './text';
import { Empty, Panel } from './ui';

/**
 * "Which student?" (Track D3.)
 *
 * Four screens need it and they all need the same thing: a search over the
 * normalised key so either script finds the same person, and a link that
 * carries the choice on in the query string. A GET form rather than a
 * combobox, so the result survives a reload and can be sent to a colleague.
 */
export async function StudentPicker({
  principal,
  locale,
  query,
  basePath,
}: {
  principal: Principal;
  locale: Locale;
  query: string;
  basePath: string;
}) {
  const t = await getTranslations('registry');
  const q = query.trim();
  const results = q
    ? await searchDirectory(principal, q, { includeInactive: true }, { take: 20 })
    : { rows: [], total: 0 };

  return (
    <Panel title={t('common.student')}>
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="block min-w-64 flex-1">
          <span className="mb-1 block text-sm font-medium">{t('register.student')}</span>
          <input
            name="q"
            defaultValue={q}
            autoFocus
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            {t('register.studentHint')}
          </span>
        </label>
        <button
          type="submit"
          className="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {t('common.search')}
        </button>
      </form>

      <div className="mt-5">
        {q && results.rows.length === 0 && <Empty>{t('common.notFound')}</Empty>}
        {!q && <Empty>{t('common.chooseStudent')}</Empty>}
        <ul className="divide-y divide-border">
          {results.rows.map((s) => (
            <li key={s.id} className="py-3">
              <Link
                href={`${basePath}?student=${s.id}`}
                className="flex flex-wrap items-baseline gap-3 hover:underline"
              >
                <span className="numeric text-sm text-muted-foreground">{s.studentNo}</span>
                <span>{pickText(locale, s.fullNameAr, s.fullNameEn)}</span>
                <span className="text-xs text-muted-foreground">
                  {t(`status.${s.status}`)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}
