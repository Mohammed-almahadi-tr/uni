'use server';

import { revalidatePath } from 'next/cache';
import type {
  AcademicPeriodStatus,
  DegreeLevel,
  NationalityCategory,
  TermKind,
} from '@/generated/prisma/enums';
import { currentContext } from '@/lib/console/session';
import {
  createAdmissionCategory,
  createBatch,
  createDepartment,
  createFaculty,
  createNationality,
  createProgramme,
  deactivate,
  openAcademicYear,
  setTermStatus,
  type DeactivatableEntity,
  setApplicationWindow,
} from '@/lib/academic/structure';

/**
 * Academic structure (Track D4, SRS Module 2).
 *
 * ## What a faculty used to be
 *
 * ```vb
 * Dim cmd As New SqlCommand("Select Distinct ProgramName From Programs", cnn)
 * ```
 * ([frmListPrograms.vb:83](Nile%20College%20E-University%20System/Oasis%20-%20E-University/Registration%20System/Forms/frmListPrograms.vb))
 *
 * A programme was a **text column discovered by `SELECT DISTINCT`**, inserted
 * by string concatenation. A batch was the same, in a table named
 * `AcademicYear` — the academic year itself existed nowhere. A faculty was
 * not a table at all: it was a string copied onto every row that mentioned
 * it.
 *
 * Identity was therefore the name, exactly as it was in the chart of accounts
 * before A1. **Renaming a faculty orphaned every record pointing at it**,
 * silently, because the join was on the text.
 *
 * And the delete:
 *
 *     Delete From AcademicYear Where Batch=N'..'
 *
 * with no check for the students admitted under it. Here the database refuses
 * once anything refers to the row, and `deactivate` is the operation people
 * actually wanted — which is why this screen offers no delete at all.
 */

export interface StructureState {
  error: string | null;
  added: string | null;
  message: string | null;
}

function blank(): StructureState {
  return { error: null, added: null, message: null };
}

const str = (f: FormData, k: string): string => {
  const v = f.get(k);
  return typeof v === 'string' ? v.trim() : '';
};

const num = (f: FormData, k: string, fallback: number): number => {
  const n = Number.parseInt(str(f, k), 10);
  return Number.isFinite(n) ? n : fallback;
};

const date = (f: FormData, k: string): Date | null => {
  const v = str(f, k);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00.000Z`) : null;
};

function explain(e: unknown): string {
  if (e instanceof Error && e.name !== 'Error' && e.message) return e.message;
  console.error('[structure]', e);
  return 'That could not be completed.';
}

function refresh(): void {
  revalidatePath('/console/academic/structure');
  revalidatePath('/console/academic/fees');
  revalidatePath('/console/academic/capacity');
}

/**
 * One action for six kinds of row.
 *
 * They differ only in which fields they carry, and splitting them into six
 * near-identical exports would put the same `currentContext` / `explain`
 * scaffolding in six places for no separation of concern — every one of them
 * lands on `academic.manage` and the module that owns the rule.
 */
export async function addStructure(
  _prev: StructureState,
  form: FormData,
): Promise<StructureState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const p = ctx.principal;
  const kind = str(form, 'kind');
  const base = { code: str(form, 'code'), nameAr: str(form, 'nameAr'), nameEn: str(form, 'nameEn') };

  try {
    switch (kind) {
      case 'faculty':
        await createFaculty(p, { ...base, costCenterId: str(form, 'costCenterId') || null });
        break;
      case 'department':
        await createDepartment(p, { ...base, facultyId: str(form, 'facultyId') });
        break;
      case 'programme':
        await createProgramme(p, {
          ...base,
          facultyId: str(form, 'facultyId'),
          departmentId: str(form, 'departmentId') || null,
          degreeLevel: str(form, 'degreeLevel') as DegreeLevel,
          durationYears: num(form, 'durationYears', 4),
          durationTerms: num(form, 'durationTerms', 8),
          creditsRequired: str(form, 'creditsRequired')
            ? num(form, 'creditsRequired', 0)
            : null,
        });
        break;
      case 'batch':
        await createBatch(p, {
          ...base,
          admissionYear: num(form, 'admissionYear', new Date().getUTCFullYear()),
        });
        break;
      case 'category':
        await createAdmissionCategory(p, { ...base, sortOrder: num(form, 'sortOrder', 0) });
        break;
      case 'nationality':
        await createNationality(p, {
          ...base,
          category: str(form, 'category') as NationalityCategory,
        });
        break;
      default:
        return { ...blank(), error: 'Unknown kind.' };
    }
    refresh();
    return { ...blank(), added: base.code };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/**
 * Open an academic year with its terms, in one transaction.
 *
 * The terms go in with the year because a year without them prices nothing
 * and registers nobody — and because `openAcademicYear` checks they neither
 * overlap nor leave gaps, which it can only do with the whole set in hand.
 */
export async function openYear(
  _prev: StructureState,
  form: FormData,
): Promise<StructureState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const start = date(form, 'startDate');
  const end = date(form, 'endDate');
  if (!start || !end) return { ...blank(), error: 'Give the dates the year runs between.' };

  // Terms arrive as term_<i>_* rows.
  const seqs = new Set<number>();
  for (const key of form.keys()) {
    const m = key.match(/^term_(\d+)_seq$/);
    if (m) seqs.add(Number(m[1]));
  }

  const terms = [...seqs]
    .sort((a, b) => a - b)
    .map((i) => ({
      seq: num(form, `term_${i}_seq`, i + 1),
      kind: str(form, `term_${i}_kind`) as TermKind,
      nameAr: str(form, `term_${i}_nameAr`),
      nameEn: str(form, `term_${i}_nameEn`),
      startDate: date(form, `term_${i}_startDate`) ?? start,
      endDate: date(form, `term_${i}_endDate`) ?? end,
      registrationClosesOn: date(form, `term_${i}_registrationClosesOn`),
    }))
    .filter((t) => t.nameEn || t.nameAr);

  try {
    await openAcademicYear(ctx.principal, {
      code: str(form, 'code'),
      nameAr: str(form, 'nameAr'),
      nameEn: str(form, 'nameEn'),
      startDate: start,
      endDate: end,
      terms,
    });
    refresh();
    return { ...blank(), message: `${str(form, 'code')}|${terms.length}` };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/** Move a term between planned, active and closed. */
export async function changeTermStatus(
  _prev: StructureState,
  form: FormData,
): Promise<StructureState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    await setTermStatus(
      ctx.principal,
      str(form, 'academicTermId'),
      str(form, 'status') as AcademicPeriodStatus,
    );
    refresh();
    return { ...blank(), message: 'ok' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/**
 * Withdraw a row from use.
 *
 * Not a delete, and there is no delete on this screen. The database refuses
 * to remove a faculty a programme points at; what an administrator wants when
 * they reach for delete is for it to stop appearing in next year's dropdowns,
 * which is this.
 */
export async function withdraw(
  _prev: StructureState,
  form: FormData,
): Promise<StructureState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    await deactivate(
      ctx.principal,
      str(form, 'entity') as DeactivatableEntity,
      str(form, 'id'),
    );
    refresh();
    return { ...blank(), message: 'withdrawn' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/**
 * Open or close the public application portal for a batch (Track C2).
 *
 * Clearing both dates closes it. That is offered as a button rather than as
 * "empty the fields and save", because closing admissions in a hurry — a
 * quota filled, a ministry instruction — is the case where a form somebody
 * has to blank two boxes in is a form they get wrong.
 */
export async function setWindow(
  _prev: StructureState,
  form: FormData,
): Promise<StructureState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const close = str(form, 'how') === 'close';
  const from = str(form, 'from');
  const to = str(form, 'to');

  try {
    await setApplicationWindow(ctx.principal, str(form, 'batchId'), {
      from: close || !from ? null : new Date(`${from}T00:00:00.000Z`),
      to: close || !to ? null : new Date(`${to}T00:00:00.000Z`),
    });
    refresh();
    return { ...blank(), message: close ? 'closed' : 'saved' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}
