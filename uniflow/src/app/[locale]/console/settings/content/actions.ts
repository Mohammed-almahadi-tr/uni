'use server';

import { revalidatePath } from 'next/cache';
import type {
  CalendarEventKind,
  LandingSectionKind,
  PostKind,
} from '@/generated/prisma/enums';
import { currentContext } from '@/lib/console/session';
import {
  archivePost,
  createCalendarEvent,
  createPost,
  publishCalendarEvent,
  publishPost,
  setHero,
  setSection,
} from '@/lib/cms/content';

/**
 * Website content (tenant administration, SRS REQ-LP-02/04/05).
 *
 * Two rules from C1 that this screen exists to obey rather than to enforce:
 *
 * **Publishing needs both languages complete.** `chk_post_published_complete`
 * refuses a PUBLISHED post with an empty title or body in either language. A
 * half-translated page on a public site is worse than one that is not there,
 * and the constraint means no code path can produce one.
 *
 * **The website cannot disagree with the system.** Semester dates and the
 * registration deadline are read from `academic_terms` — the same column
 * `assert_registration_term_open` enforces — and
 * `chk_calendar_event_not_derived` refuses to store them here. So the three
 * derived kinds are absent from the form, and if somebody posts one anyway
 * the database says no.
 */

export interface ContentState {
  error: string | null;
  message: string | null;
}

const blank = (): ContentState => ({ error: null, message: null });

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
  console.error('[content]', e);
  return 'That could not be completed.';
}

function refresh(): void {
  revalidatePath('/console/settings/content');
  revalidatePath('/', 'layout');
}

/** Turn a landing section on or off, and retitle it. */
export async function saveSection(
  _prev: ContentState,
  form: FormData,
): Promise<ContentState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    await setSection(ctx.principal, {
      kind: str(form, 'kind') as LandingSectionKind,
      isEnabled: form.get('isEnabled') === 'on',
      sortOrder: num(form, 'sortOrder', 0),
      headingAr: str(form, 'headingAr') || null,
      headingEn: str(form, 'headingEn') || null,
      blurbAr: str(form, 'blurbAr') || null,
      blurbEn: str(form, 'blurbEn') || null,
    });
    refresh();
    return { ...blank(), message: 'saved' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

export async function saveHero(_prev: ContentState, form: FormData): Promise<ContentState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    await setHero(ctx.principal, {
      headlineAr: str(form, 'headlineAr'),
      headlineEn: str(form, 'headlineEn'),
      subheadlineAr: str(form, 'subheadlineAr') || null,
      subheadlineEn: str(form, 'subheadlineEn') || null,
    });
    refresh();
    return { ...blank(), message: 'saved' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/** Write a post. It is a draft; publishing is a separate act. */
export async function writePost(_prev: ContentState, form: FormData): Promise<ContentState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    await createPost(ctx.principal, {
      slug: str(form, 'slug'),
      kind: (str(form, 'kind') || 'NEWS') as PostKind,
      titleAr: str(form, 'titleAr'),
      titleEn: str(form, 'titleEn'),
      bodyAr: str(form, 'bodyAr'),
      bodyEn: str(form, 'bodyEn'),
      excerptAr: str(form, 'excerptAr') || null,
      excerptEn: str(form, 'excerptEn') || null,
    });
    refresh();
    return { ...blank(), message: 'added' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/**
 * Publish or archive.
 *
 * Separate from `cms.manage`: writing a post and putting it on the front page
 * of a university's website are different authorities, and C1 gave them
 * different permissions for that reason.
 */
export async function decidePost(
  _prev: ContentState,
  form: FormData,
): Promise<ContentState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const postId = str(form, 'postId');
  try {
    if (str(form, 'how') === 'archive') {
      await archivePost(ctx.principal, postId);
      refresh();
      return { ...blank(), message: 'archived' };
    }
    await publishPost(ctx.principal, postId);
    refresh();
    return { ...blank(), message: 'published' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/**
 * Add a calendar entry.
 *
 * The three derived kinds are not offered, and `chk_calendar_event_not_derived`
 * refuses them anyway — semester dates and the registration deadline come from
 * `academic_terms`, and a website that can contradict the system about when
 * registration closes will eventually do it.
 */
export async function addEvent(_prev: ContentState, form: FormData): Promise<ContentState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const startDate = date(form, 'startDate');
  if (!startDate) return { ...blank(), error: 'Give the date it starts.' };

  try {
    await createCalendarEvent(ctx.principal, {
      kind: str(form, 'kind') as CalendarEventKind,
      titleAr: str(form, 'titleAr'),
      titleEn: str(form, 'titleEn'),
      descriptionAr: str(form, 'descriptionAr') || null,
      descriptionEn: str(form, 'descriptionEn') || null,
      startDate,
      endDate: date(form, 'endDate'),
    });
    refresh();
    return { ...blank(), message: 'added' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

export async function publishEvent(
  _prev: ContentState,
  form: FormData,
): Promise<ContentState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    await publishCalendarEvent(ctx.principal, str(form, 'eventId'));
    refresh();
    return { ...blank(), message: 'published' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}
