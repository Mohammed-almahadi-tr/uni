import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { guardConsole } from '@/lib/console/guard';
import { registrationCard } from '@/lib/registration/card';
import { canonicalHostFor } from '@/lib/cms/hosts';
import { qrSvg, verifyUrl } from '@/lib/console/qr';
import { can } from '@/lib/auth/rbac';
import { ForbiddenScreen, localeOf, pickText } from '@/components/console/text';
import {
  Amount,
  Fact,
  FactGrid,
  PageHeader,
  Panel,
  Pill,
  Table,
  TableWrap,
  Td,
  Th,
} from '@/components/console/ui';
import { ApproveDiscount, CancelRegistration } from './decisions';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('registry.registrations');
  return { title: t('card') };
}

/**
 * One registration, and its card (Track D3, SRS REQ-REG-05).
 *
 * The QR encodes an **absolute** URL built from the tenant's canonical host.
 * `registrationCard` returns only a path on purpose — the module that knows
 * the fee arithmetic has no business knowing which domain the university
 * publishes under — so the origin is joined here, where the host is already
 * known. A card printed with the wrong origin verifies against the wrong site,
 * or against nothing.
 *
 * The card prints. `globals.css` already hides `.no-print` and drops the page
 * to black on white, which is why this screen is a document with controls
 * around it rather than a screen with a print stylesheet bolted on.
 */
export default async function RegistrationDetail({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'registry/registrations/[id]');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  let card;
  try {
    card = await registrationCard(principal, id);
  } catch {
    notFound();
  }

  const t = await getTranslations('registry');
  const p = await getTranslations('print');
  const host = await canonicalHostFor(principal.tenantId);
  const url = verifyUrl(host, card.verifyPath);
  const qr = await qrSvg(url);

  const tone =
    card.status === 'REGISTERED' ? 'good' : card.status === 'CANCELLED' ? 'neutral' : 'warn';

  return (
    <div className="space-y-6">
      <div className="no-print">
        <PageHeader
          title={`${t('registrations.card')} ${card.registrationNo}`}
          actions={
            <>
              <Pill tone={tone}>{t(`regStatus.${card.status}`)}</Pill>
              {/* The printed card, on D5's shared sheet — letterhead, page
                  setup and the registrar's signature block. This screen keeps
                  its own on-screen rendering because it is the one a clerk
                  reads at the desk. */}
              <Link
                href={`/console/registry/registrations/${id}/print`}
                className="inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                {p('print')}
              </Link>
              <Link
                href="/console/registry/registrations"
                className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm hover:bg-muted"
              >
                {t('common.back')}
              </Link>
            </>
          }
        />
      </div>

      {/* ---- The card itself -------------------------------------------- */}
      <section className="rounded-lg border border-border bg-card p-6">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="font-semibold">
              {pickText(locale, card.university.nameAr, card.university.nameEn)}
            </div>
            <div className="text-sm text-muted-foreground">{t('registrations.card')}</div>
          </div>
          <div className="text-end text-sm">
            <div className="numeric font-semibold">{card.registrationNo}</div>
            <div className="numeric text-muted-foreground">{card.issuedOn}</div>
          </div>
        </header>

        <FactGrid>
          <Fact label={t('students.studentNo')}>
            <span className="numeric">{card.student.studentNo}</span>
          </Fact>
          <Fact label={t('students.name')}>
            <span className="block">{card.student.nameAr}</span>
            <span className="block text-sm text-muted-foreground" dir="ltr">
              {card.student.nameEn}
            </span>
          </Fact>
          <Fact label={t('lifecycle.toProgramme')}>
            {pickText(locale, card.student.programmeNameAr, card.student.programmeNameEn)}
          </Fact>
          <Fact label={t('registrations.term')}>
            {pickText(locale, card.term.nameAr, card.term.nameEn)}
            <span className="numeric ms-2 text-muted-foreground">
              {card.term.academicYearCode}
            </span>
          </Fact>
          <Fact label={t('registrations.level')}>
            <span className="numeric">{card.term.levelYear}</span>
          </Fact>
        </FactGrid>

        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <h3 className="mb-2 text-sm font-semibold">{t('registrations.lines')}</h3>
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>{t('register.item')}</Th>
                    <Th numeric>{t('register.net')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {card.fees.lines.map((l) => (
                    <tr key={l.code}>
                      <Td>{pickText(locale, l.nameAr, l.nameEn)}</Td>
                      <Td numeric>
                        <Amount value={l.net} currency={card.fees.currency} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <Td>{t('register.gross')}</Td>
                    <Td numeric>
                      <Amount value={card.fees.gross} currency={card.fees.currency} />
                    </Td>
                  </tr>
                  <tr>
                    <Td>{t('register.discount')}</Td>
                    <Td numeric>
                      <Amount value={card.fees.discount} currency={card.fees.currency} />
                    </Td>
                  </tr>
                  <tr>
                    <Td className="font-semibold">{t('register.total')}</Td>
                    <Td numeric className="font-semibold">
                      <Amount value={card.fees.net} currency={card.fees.currency} />
                    </Td>
                  </tr>
                </tfoot>
              </Table>
            </TableWrap>
          </div>

          <div className="text-center">
            {/* The encoder is a library with its own conformance tests — see
                lib/console/qr.ts for why this is not hand-rolled. */}
            <div
              className="mx-auto h-40 w-40 [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: qr }}
              aria-hidden
            />
            <p className="mt-2 text-xs text-muted-foreground">{t('registrations.verifyAt')}</p>
            <p className="numeric break-all text-xs">{url}</p>
          </div>
        </div>
      </section>

      {/* ---- Decisions --------------------------------------------------- */}
      <div className="no-print space-y-6">
        {card.status === 'PENDING_APPROVAL' && can(principal, 'discount.approve') && (
          <Panel title={t('registrations.approveDiscount')}>
            <ApproveDiscount registrationId={id} />
          </Panel>
        )}

        {card.status !== 'CANCELLED' && can(principal, 'registration.cancel') && (
          <Panel title={t('registrations.cancelTitle')}>
            <CancelRegistration registrationId={id} />
          </Panel>
        )}
      </div>
    </div>
  );
}
