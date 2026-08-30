'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import {
  addEvent,
  decidePost,
  publishEvent,
  saveHero,
  saveSection,
  writePost,
  type ContentState,
} from './actions';

const initial: ContentState = { error: null, message: null };

/** The three kinds the academic calendar owns are absent by construction. */
const EVENT_KINDS = ['EXAM', 'HOLIDAY', 'EVENT'] as const;
const POST_KINDS = ['NEWS', 'ANNOUNCEMENT'] as const;

const field = 'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';
const small = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm';
const area = 'w-full rounded-md border border-input bg-background p-3 text-sm';

const Feedback = ({ state }: { state: ContentState }) => {
  const c = useTranslations('settings.common');
  if (state.error) {
    return (
      <p
        role="alert"
        className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
      >
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
        {c('saved')}
      </p>
    );
  }
  return null;
};

/** One landing section: shown or not, and what it is called. */
export function SectionRow({
  kind,
  isEnabled,
  sortOrder,
  headingAr,
  headingEn,
}: {
  kind: string;
  isEnabled: boolean;
  sortOrder: number;
  headingAr: string | null;
  headingEn: string | null;
}) {
  const [state, action, pending] = useActionState(saveSection, initial);
  const t = useTranslations('settings.content');
  const c = useTranslations('settings.common');

  return (
    <form action={action} className="space-y-2 py-3">
      <input type="hidden" name="kind" value={kind} />
      <Feedback state={state} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex items-center gap-2 text-sm">
          <span className="numeric font-medium">{kind}</span>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isEnabled"
            defaultChecked={isEnabled}
            className="h-5 w-5"
          />
          {isEnabled ? t('visible') : t('hidden')}
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">{t('order')}</span>
          <input
            name="sortOrder"
            type="number"
            defaultValue={sortOrder}
            className={`numeric ${small}`}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">{c('nameAr')}</span>
          <input name="headingAr" defaultValue={headingAr ?? ''} dir="rtl" className={small} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">{c('nameEn')}</span>
          <input name="headingEn" defaultValue={headingEn ?? ''} dir="ltr" className={small} />
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50"
      >
        {pending ? c('working') : c('save')}
      </button>
    </form>
  );
}

export function HeroForm({
  headlineAr,
  headlineEn,
  subheadlineAr,
  subheadlineEn,
}: {
  headlineAr: string;
  headlineEn: string;
  subheadlineAr: string | null;
  subheadlineEn: string | null;
}) {
  const [state, action, pending] = useActionState(saveHero, initial);
  const t = useTranslations('settings.content');
  const c = useTranslations('settings.common');

  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('headlineAr')}</span>
          <input name="headlineAr" required defaultValue={headlineAr} dir="rtl" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('headlineEn')}</span>
          <input name="headlineEn" required defaultValue={headlineEn} dir="ltr" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('subheadAr')}</span>
          <input
            name="subheadlineAr"
            defaultValue={subheadlineAr ?? ''}
            dir="rtl"
            className={field}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('subheadEn')}</span>
          <input
            name="subheadlineEn"
            defaultValue={subheadlineEn ?? ''}
            dir="ltr"
            className={field}
          />
        </label>
      </div>
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

/** Write a post. Both languages, because publishing will demand them. */
export function WritePost() {
  const [state, action, pending] = useActionState(writePost, initial);
  const t = useTranslations('settings.content');
  const c = useTranslations('settings.common');

  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('slug')}</span>
          <input name="slug" required dir="ltr" className={`numeric ${field}`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('kind')}</span>
          <select name="kind" defaultValue="NEWS" className={field}>
            {POST_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('titleAr')}</span>
          <input name="titleAr" required dir="rtl" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('titleEn')}</span>
          <input name="titleEn" required dir="ltr" className={field} />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium">{t('bodyAr')}</span>
          <textarea name="bodyAr" required rows={6} dir="rtl" className={area} />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium">{t('bodyEn')}</span>
          <textarea name="bodyEn" required rows={6} dir="ltr" className={area} />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">{t('bothLanguages')}</p>
      <p className="text-xs text-muted-foreground">{t('richTextHint')}</p>
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : t('createPost')}
      </button>
    </form>
  );
}

/** Publish or archive one post. Archiving keeps its address reachable. */
export function PostDecision({ postId, status }: { postId: string; status: string }) {
  const [state, action, pending] = useActionState(decidePost, initial);
  const t = useTranslations('settings.content');
  const c = useTranslations('settings.common');

  if (state.message === 'published') return <p className="text-sm text-success">{t('published')}</p>;
  if (state.message === 'archived') {
    return <p className="text-sm text-muted-foreground">{t('archived')}</p>;
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="postId" value={postId} />
      {state.error && (
        <p role="alert" className="w-full text-xs text-destructive">
          {state.error}
        </p>
      )}
      {status !== 'PUBLISHED' && (
        <button
          type="submit"
          name="how"
          value="publish"
          disabled={pending}
          className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending ? c('working') : t('publish')}
        </button>
      )}
      {status !== 'ARCHIVED' && (
        <button
          type="submit"
          name="how"
          value="archive"
          disabled={pending}
          className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50"
        >
          {t('archive')}
        </button>
      )}
    </form>
  );
}

/** A calendar entry. The derived kinds are not on the list — see actions.ts. */
export function AddEvent() {
  const [state, action, pending] = useActionState(addEvent, initial);
  const t = useTranslations('settings.content');
  const c = useTranslations('settings.common');

  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('eventKind')}</span>
          <select name="kind" defaultValue="EVENT" className={field}>
            {EVENT_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('startsOn')}</span>
          <input name="startDate" type="date" required className={`numeric ${field}`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('endsOn')}</span>
          <input name="endDate" type="date" className={`numeric ${field}`} />
        </label>
        <div />
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('titleAr')}</span>
          <input name="titleAr" required dir="rtl" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('titleEn')}</span>
          <input name="titleEn" required dir="ltr" className={field} />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">{t('derivedHint')}</p>
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : t('addEvent')}
      </button>
    </form>
  );
}

export function PublishEvent({ eventId }: { eventId: string }) {
  const [state, action, pending] = useActionState(publishEvent, initial);
  const t = useTranslations('settings.content');
  const c = useTranslations('settings.common');

  if (state.message === 'published') return <p className="text-xs text-success">{t('published')}</p>;

  return (
    <form action={action}>
      <input type="hidden" name="eventId" value={eventId} />
      {state.error && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50"
      >
        {pending ? c('working') : t('publish')}
      </button>
    </form>
  );
}
