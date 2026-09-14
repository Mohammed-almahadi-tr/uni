import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { verifyRegistrationCard } from '@/lib/registration/card';
import { localeOf } from '@/components/site/chrome';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('verify');
  return { title: t('title'), robots: { index: false, follow: false } };
}

/**
 * Verifying a registration card (SRS REQ-REG-05, Track C).
 *
 * B4 built the token, D3 rendered the QR code and D5 put it on the printed
 * card. **This is the page the QR code resolves to**, and it is the last thing
 * Track C still owed from either — named in B4's deferrals as "genuinely
 * public and stays in Track C".
 *
 * ## Who is reading it
 *
 * A landlord, a bank clerk, a registrar at another institution, a ministry
 * officer. They have a piece of paper and a telephone camera, they are not a
 * user of this system, and they will never be. So:
 *
 *   · **No session and no tenant context.** `verifyRegistrationCard` runs
 *     through `withSystem` because the scanner has no tenant identity — the
 *     token *is* the scope, selecting at most one row across the platform by a
 *     unique index over 128 bits of randomness.
 *   · **No site chrome.** No header, no footer, no navigation — this is an
 *     answer to one question, and a verifier standing at a counter should not
 *     have to find it among a university's menus. (The tenant's palette still
 *     comes from the locale layout when the host resolves to one, and that is
 *     fine: what makes the page trustworthy is the token behind it, not the
 *     colour of it. Anyone can copy a stylesheet; nobody can guess 128 bits.)
 *   · **No money, ever.** What a student paid is not a fact a QR scan should
 *     disclose, and a verifier does not need it to answer the question they
 *     are asking.
 *   · **Not indexed.** `robots: noindex` — a search engine crawling one
 *     verification URL is a search engine publishing it.
 *
 * ## A cancelled card says so
 *
 * Found but not valid, rather than unknown. Somebody presenting a card for a
 * registration reversed last month should be told exactly that; "no such
 * registration" reads as a forgery and sends them to the wrong desk.
 *
 * ## What this replaces
 *
 * `printFile(File2)` (frmStudentRegisteration.vb:524) — a Crystal Report
 * printed from the same screen that saved the row, with nothing on it a third
 * party could check. A student presenting that printout was presenting a piece
 * of paper.
 */
export default async function VerifyRegistrationPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale: raw, token } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const t = await getTranslations('verify');
  const r = await getTranslations('registry.regStatus');
  const result = await verifyRegistrationCard(token);
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);

  const reg = result.registration;
  const live = result.valid;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-10">
      <div
        className={
          live
            ? 'rounded-lg border-2 border-success bg-success/10 p-6'
            : 'rounded-lg border-2 border-destructive bg-destructive/10 p-6'
        }
      >
        {/* The verdict first, in words, before any detail. Somebody standing
            at a counter with a queue behind them needs the answer, not a
            table to read. */}
        <p className="text-lg font-bold">{live ? t('valid') : t('notValid')}</p>
        <p className="mt-1 text-sm">{result.message}</p>
      </div>

      {reg && (
        <dl className="mt-6 space-y-4 rounded-lg border border-border bg-card p-6">
          <Fact label={t('university')}>
            {pick(reg.universityNameAr, reg.universityNameEn)}
          </Fact>
          <Fact label={t('student')}>
            <span className="block">{reg.studentNameAr}</span>
            <span className="block text-sm text-muted-foreground" dir="ltr">
              {reg.studentNameEn}
            </span>
          </Fact>
          <Fact label={t('studentNo')}>
            <span className="numeric">{reg.studentNo}</span>
          </Fact>
          <Fact label={t('programme')}>
            {pick(reg.programmeNameAr, reg.programmeNameEn)}
          </Fact>
          <Fact label={t('term')}>
            {pick(reg.termNameAr, reg.termNameEn)}{' '}
            <span className="numeric text-muted-foreground">{reg.academicYearCode}</span>
          </Fact>
          <Fact label={t('registrationNo')}>
            <span className="numeric">{reg.registrationNo}</span>
          </Fact>
          <Fact label={t('status')}>{r(reg.status)}</Fact>
        </dl>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">{t('footer')}</p>
    </main>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
