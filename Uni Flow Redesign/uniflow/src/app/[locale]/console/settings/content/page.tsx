import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { withTenant } from '@/lib/db/client';
import { calendarEntries } from '@/lib/console/backoffice';
import { heroInTx, listPosts, sectionsInTx } from '@/lib/cms/content';
import { ForbiddenScreen, localeOf, pickText } from '@/components/console/text';
import { Empty, PageHeader, Panel, Pill } from '@/components/console/ui';
import {
  AddEvent,
  HeroForm,
  PostDecision,
  PublishEvent,
  SectionRow,
  WritePost,
} from './forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('settings.content');
  return { title: t('title') };
}

/**
 * Website content (SRS REQ-LP-02/04/05).
 *
 * The other end of everything C1 built. Two of its decisions show through
 * here and both are constraints rather than conventions:
 *
 * **Publishing needs both languages.** `chk_post_published_complete` refuses
 * a published post with an empty title or body in either, so no code path can
 * put a half-translated page on a public site.
 *
 * **The three derived calendar kinds are absent from the form.** Semester
 * dates and the registration deadline come from `academic_terms` — the same
 * column the registration engine enforces — and
 * `chk_calendar_event_not_derived` refuses to store them here. A website that
 * can contradict the system about when registration closes will eventually
 * do it.
 */
export default async function ContentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'settings/content');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('settings.content');
  const c = await getTranslations('settings.common');
  const ps = await getTranslations('settings.postStatus');

  const mayManage = principal.permissions.has('cms.manage');
  const mayPublish = principal.permissions.has('cms.publish');

  if (!mayManage) {
    // Every read here is `cms.manage`; somebody holding only `cms.publish`
    // reaches the route and would otherwise meet a permission error rendered
    // as a broken page.
    return (
      <div className="space-y-6">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />
        <Panel>
          <Empty>{c('nothing')}</Empty>
        </Panel>
      </div>
    );
  }

  const [{ sections, hero }, posts, events] = await Promise.all([
    withTenant(principal.tenantId, async (tx) => ({
      sections: await sectionsInTx(tx, principal.tenantId),
      hero: await heroInTx(tx, principal.tenantId),
    })),
    listPosts(principal),
    calendarEntries(principal),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <Panel title={t('hero')}>
        <HeroForm
          headlineAr={hero?.headlineAr ?? ''}
          headlineEn={hero?.headlineEn ?? ''}
          subheadlineAr={hero?.subheadlineAr ?? null}
          subheadlineEn={hero?.subheadlineEn ?? null}
        />
      </Panel>

      <Panel title={t('sections')}>
        {sections.length === 0 ? (
          <Empty>{c('nothing')}</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {sections.map((s) => (
              <li key={s.kind}>
                <SectionRow
                  kind={s.kind}
                  isEnabled={s.isEnabled}
                  sortOrder={s.sortOrder}
                  headingAr={s.headingAr}
                  headingEn={s.headingEn}
                />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={t('news')}>
        {posts.length === 0 ? (
          <Empty>{t('noPosts')}</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {posts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-4 py-3">
                <span className="numeric text-xs text-muted-foreground">{p.slug}</span>
                <span className="min-w-48 flex-1">
                  {pickText(locale, p.titleAr, p.titleEn)}
                </span>
                <Pill
                  tone={
                    p.status === 'PUBLISHED'
                      ? 'good'
                      : p.status === 'ARCHIVED'
                        ? 'neutral'
                        : 'warn'
                  }
                >
                  {ps(p.status)}
                </Pill>
                {mayPublish && <PostDecision postId={p.id} status={p.status} />}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={t('createPost')}>
        <WritePost />
      </Panel>

      <Panel title={t('calendar')}>
        {events.length === 0 ? (
          <Empty>{t('noEvents')}</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {events.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-4 py-3">
                <span className="numeric text-xs text-muted-foreground">{e.kind}</span>
                <span className="min-w-48 flex-1">
                  {pickText(locale, e.titleAr, e.titleEn)}
                </span>
                <span className="numeric text-xs text-muted-foreground">
                  {e.startDate}
                  {e.endDate && ` → ${e.endDate}`}
                </span>
                <Pill tone={e.status === 'PUBLISHED' ? 'good' : 'warn'}>{ps(e.status)}</Pill>
                {mayPublish && e.status !== 'PUBLISHED' && <PublishEvent eventId={e.id} />}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted-foreground">{t('derivedHint')}</p>
      </Panel>

      <Panel title={t('addEvent')}>
        <AddEvent />
      </Panel>
    </div>
  );
}
