'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { CostCenterOption } from '@/lib/console/finance';
import type { Named } from '@/lib/console/backoffice';
import {
  addStructure,
  changeTermStatus,
  openYear,
  setWindow,
  withdraw,
  type StructureState,
} from './actions';

const initial: StructureState = { error: null, added: null, message: null };

const DEGREE_LEVELS = ['DIPLOMA', 'BACHELOR', 'MASTER', 'PHD'] as const;
const TERM_KINDS = ['FALL', 'SPRING', 'SUMMER'] as const;
const TERM_STATUSES = ['PLANNED', 'ACTIVE', 'CLOSED'] as const;
const NATIONALITY_CATEGORIES = ['NATIONAL', 'ARAB', 'FOREIGN'] as const;

const field =
  'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';

/**
 * Add a structural row (Track D4).
 *
 * Six kinds, one form, because they differ only in which fields they carry.
 * All three of code, Arabic name and English name are required on every one —
 * the legacy tables had a single name column, which is why a bilingual
 * institution ended up with faculty names in whichever language the clerk who
 * created the row was working in.
 */
export function AddStructure({
  kind,
  faculties,
  departments,
  costCentres,
  locale,
}: {
  kind: 'faculty' | 'department' | 'programme' | 'batch' | 'category' | 'nationality';
  faculties: Named[];
  departments: Array<Named & { facultyId: string }>;
  costCentres: CostCenterOption[];
  locale: 'ar' | 'en';
}) {
  const [state, action, pending] = useActionState(addStructure, initial);
  const [facultyId, setFacultyId] = useState(faculties[0]?.id ?? '');
  const t = useTranslations('academic.structure');
  const c = useTranslations('academic.common');
  const dl = useTranslations('academic.degreeLevel');
  const nc = useTranslations('academic.nationalityCategory');
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);

  const inFaculty = departments.filter((d) => d.facultyId === facultyId);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="kind" value={kind} />

      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {state.error}
        </p>
      )}
      {state.added && (
        <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
          {c('added')}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{c('code')}</span>
          <input name="code" required dir="ltr" className={`numeric ${field}`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{c('nameAr')}</span>
          <input name="nameAr" required dir="rtl" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{c('nameEn')}</span>
          <input name="nameEn" required dir="ltr" className={field} />
        </label>

        {kind === 'faculty' && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t('costCentre')}</span>
            <select name="costCenterId" defaultValue="" className={field}>
              <option value="">{c('none')}</option>
              {costCentres.map((cc) => (
                <option key={cc.id} value={cc.id}>
                  {cc.code} · {pick(cc.nameAr, cc.nameEn)}
                </option>
              ))}
            </select>
          </label>
        )}

        {(kind === 'department' || kind === 'programme') && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t('faculty')}</span>
            <select
              name="facultyId"
              required
              value={facultyId}
              onChange={(e) => setFacultyId(e.target.value)}
              className={field}
            >
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.code} · {pick(f.nameAr, f.nameEn)}
                </option>
              ))}
            </select>
          </label>
        )}

        {kind === 'programme' && (
          <>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">{t('department')}</span>
              <select name="departmentId" defaultValue="" className={field}>
                <option value="">{c('none')}</option>
                {inFaculty.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} · {pick(d.nameAr, d.nameEn)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">{t('degreeLevel')}</span>
              <select name="degreeLevel" defaultValue="BACHELOR" className={field}>
                {DEGREE_LEVELS.map((d) => (
                  <option key={d} value={d}>
                    {dl(d)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">{t('durationYears')}</span>
              <input
                name="durationYears"
                type="number"
                min={1}
                max={10}
                defaultValue={4}
                required
                className={`numeric ${field}`}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">{t('durationTerms')}</span>
              <input
                name="durationTerms"
                type="number"
                min={1}
                max={40}
                defaultValue={8}
                required
                className={`numeric ${field}`}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">{t('credits')}</span>
              <input name="creditsRequired" type="number" min={0} className={`numeric ${field}`} />
            </label>
          </>
        )}

        {kind === 'batch' && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t('admissionYear')}</span>
            <input
              name="admissionYear"
              type="number"
              min={2000}
              max={2100}
              defaultValue={new Date().getUTCFullYear()}
              required
              className={`numeric ${field}`}
            />
          </label>
        )}

        {kind === 'category' && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t('sortOrder')}</span>
            <input name="sortOrder" type="number" defaultValue={0} className={`numeric ${field}`} />
          </label>
        )}

        {kind === 'nationality' && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t('category')}</span>
            <select name="category" defaultValue="FOREIGN" className={field}>
              {NATIONALITY_CATEGORIES.map((n) => (
                <option key={n} value={n}>
                  {nc(n)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : c('add')}
      </button>
    </form>
  );
}

/** Withdraw a row from use. There is no delete on this screen; see actions.ts. */
export function Withdraw({
  entity,
  id,
}: {
  entity: string;
  id: string;
}) {
  const [state, action, pending] = useActionState(withdraw, initial);
  const c = useTranslations('academic.common');

  if (state.message === 'withdrawn') {
    return <span className="text-xs text-muted-foreground">{c('deactivated')}</span>;
  }

  return (
    <form action={action}>
      <input type="hidden" name="entity" value={entity} />
      <input type="hidden" name="id" value={id} />
      {state.error && (
        <span role="alert" className="block text-xs text-destructive">
          {state.error}
        </span>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-md px-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
      >
        {pending ? c('working') : c('deactivate')}
      </button>
    </form>
  );
}

/**
 * Open an academic year with its terms (Track D4).
 *
 * Three term rows, because that is what the shipped calendar uses and a
 * fourth is one more row rather than a different screen. The year and its
 * terms go in together: `openAcademicYear` checks the terms neither overlap
 * nor leave gaps, and it can only do that with the whole set in hand.
 */
export function OpenYear() {
  const [state, action, pending] = useActionState(openYear, initial);
  const t = useTranslations('academic.structure');
  const c = useTranslations('academic.common');
  const tk = useTranslations('academic.termKind');
  const rows = [0, 1, 2];

  if (state.message && state.message.includes('|')) {
    const [code, terms] = state.message.split('|');
    return (
      <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
        {t('yearOpened', { code, terms })}
      </p>
    );
  }

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('yearCode')}</span>
          <input name="code" required dir="ltr" className={`numeric ${field}`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{c('nameAr')}</span>
          <input name="nameAr" required dir="rtl" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{c('nameEn')}</span>
          <input name="nameEn" required dir="ltr" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('startDate')}</span>
          <input name="startDate" type="date" required className={`numeric ${field}`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('endDate')}</span>
          <input name="endDate" type="date" required className={`numeric ${field}`} />
        </label>
      </div>

      <fieldset className="rounded-lg border border-border p-4">
        <legend className="px-2 text-sm font-medium">{t('terms')}</legend>
        <div className="space-y-4">
          {rows.map((i) => (
            <div key={i} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <input type="hidden" name={`term_${i}_seq`} value={i + 1} />
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">{t('termKind')}</span>
                <select
                  name={`term_${i}_kind`}
                  defaultValue={TERM_KINDS[i] ?? 'FALL'}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  {TERM_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {tk(k)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">{c('nameAr')}</span>
                <input
                  name={`term_${i}_nameAr`}
                  dir="rtl"
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">{c('nameEn')}</span>
                <input
                  name={`term_${i}_nameEn`}
                  dir="ltr"
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">{t('startDate')}</span>
                <input
                  name={`term_${i}_startDate`}
                  type="date"
                  className="numeric h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">{t('endDate')}</span>
                <input
                  name={`term_${i}_endDate`}
                  type="date"
                  className="numeric h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">
                  {t('registrationCloses')}
                </span>
                <input
                  name={`term_${i}_registrationClosesOn`}
                  type="date"
                  className="numeric h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                />
              </label>
            </div>
          ))}
        </div>
      </fieldset>

      <p className="text-xs text-muted-foreground">{t('notFiscal')}</p>

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : t('openYear')}
      </button>
    </form>
  );
}

/** Move one term between planned, active and closed. */
export function TermStatus({
  academicTermId,
  status,
}: {
  academicTermId: string;
  status: string;
}) {
  const [state, action, pending] = useActionState(changeTermStatus, initial);
  const t = useTranslations('academic.structure');
  const c = useTranslations('academic.common');
  const as = useTranslations('academic.academicStatus');

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="academicTermId" value={academicTermId} />
      {state.error && (
        <span role="alert" className="w-full text-xs text-destructive">
          {state.error}
        </span>
      )}
      <label className="block">
        <span className="mb-1 block text-xs text-muted-foreground">{t('termStatus')}</span>
        <select
          name="status"
          defaultValue={status}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {TERM_STATUSES.map((s) => (
            <option key={s} value={s}>
              {as(s)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50"
      >
        {pending ? c('working') : t('setStatus')}
      </button>
    </form>
  );
}

/**
 * The public application window for one batch (Track C2, SRS REQ-LP-04).
 *
 * ## Why it is here
 *
 * Applications are made *into* a batch, so the window lives on the batch. The
 * website could have carried its own "applications open" banner and its own
 * dates; it would then be a second copy of a fact the portal enforces, and the
 * two would disagree the first time somebody extended a deadline without
 * telling whoever edits the site.
 *
 * ## Closing is a button
 *
 * Not "empty two fields and save". Closing admissions in a hurry — a quota
 * filled, a ministry instruction — is exactly the case where a form somebody
 * has to blank two boxes in is a form they get wrong under pressure.
 */
export function ApplicationWindow({
  batchId,
  from,
  to,
  open,
}: {
  batchId: string;
  from: string | null;
  to: string | null;
  /** Whether the window contains today, resolved on the server so the console
   *  and the public page cannot disagree about what "open" means. */
  open: boolean;
}) {
  const [state, action, pending] = useActionState(setWindow, initial);
  const t = useTranslations('academic.structure');
  const c = useTranslations('academic.common');

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="batchId" value={batchId} />
      {state.error && (
        <p role="alert" className="w-full text-xs text-destructive">
          {state.error}
        </p>
      )}
      {state.message && <span className="w-full text-xs text-success">{c('saved')}</span>}

      <label className="block">
        <span className="mb-1 block text-xs text-muted-foreground">{t('opensOn')}</span>
        <input
          name="from"
          type="date"
          defaultValue={from ?? ''}
          className="numeric h-9 rounded-md border border-input bg-background px-2 text-sm"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-muted-foreground">{t('closesOn')}</span>
        <input
          name="to"
          type="date"
          defaultValue={to ?? ''}
          className="numeric h-9 rounded-md border border-input bg-background px-2 text-sm"
        />
      </label>

      <button
        type="submit"
        name="how"
        value="save"
        disabled={pending}
        className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : t('setWindow')}
      </button>

      {(from || to) && (
        <button
          type="submit"
          name="how"
          value="close"
          disabled={pending}
          className="h-9 rounded-md border border-destructive/50 px-3 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          {t('closePortal')}
        </button>
      )}

      <span
        className={
          open
            ? 'inline-block rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-xs text-success'
            : 'inline-block rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground'
        }
      >
        {open ? t('portalOpen') : t('portalClosed')}
      </span>
    </form>
  );
}
