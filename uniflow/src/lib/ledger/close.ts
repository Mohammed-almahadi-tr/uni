import 'server-only';
import type { Tx } from '@/lib/db/client';
import { withTenant } from '@/lib/db/client';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { buildReconciliation } from '@/lib/reports/reconciliation';
import { buildTrialBalance } from '@/lib/reports/trial-balance';

/**
 * The pre-close checklist (Track D5, SRS REQ-PER-02).
 *
 * A7 built every figure this needs and deferred the gate itself, because a
 * hard block on `setPeriodStatus` with no screen to explain it would be a
 * refusal a controller could not act on. D5 has the screen, so here is the
 * gate.
 *
 * ## What closing a period means
 *
 * Nothing can post into it afterwards. That is what makes last month's trial
 * balance stay what it was when it was signed — and it is why closing a period
 * whose books are not yet straight is the one irreversible-in-practice mistake
 * in this module. Reopening is possible and audited, but by then the figure
 * has been reported.
 *
 * So the checklist runs **before** the state changes, inside the same
 * transaction, and a failing blocking check refuses the close.
 *
 * ## Blocking and advisory
 *
 * Not every check is a block, and pretending otherwise produces a gate people
 * route around.
 *
 *   · **Vouchers awaiting approval** blocks. Closing would shut the period
 *     those vouchers must post into, so the close would silently destroy work
 *     already done and waiting on somebody's signature.
 *   · **Sub-ledger reconciliation** blocks. A variance means two records of
 *     the same money differ and nobody yet knows which is wrong. Closing over
 *     it freezes the wrong one.
 *   · **The trial balance balancing** blocks. If it does not, something has
 *     written to the ledger outside the posting engine, and the period's
 *     figures are not figures.
 *   · **Depreciation** and **revenue recognition** are advisory. A period with
 *     no assets and no deferred fee items legitimately has neither, and a
 *     block that fires on an empty register is a block somebody disables.
 *     They are reported with their counts so a controller can see the
 *     difference between "nothing to post" and "not posted yet".
 *   · **FX revaluation** is reported as not applicable. There is no second
 *     currency to revalue until a tenant runs one, and a check that always
 *     passes for a reason nobody has written down is a check that will be
 *     wrong the first time it matters.
 */

export type CheckStatus = 'PASS' | 'FAIL' | 'NOT_APPLICABLE';

export interface CloseCheck {
  key: string;
  labelAr: string;
  labelEn: string;
  status: CheckStatus;
  /** A failing blocking check refuses the close. */
  blocking: boolean;
  /** What the reader has to do about it, in the language of the problem. */
  detailAr: string;
  detailEn: string;
}

export interface PreCloseReport {
  fiscalPeriodId: string;
  periodLabel: string;
  checks: CloseCheck[];
  /** Every blocking check passed. Advisory failures do not clear this. */
  mayClose: boolean;
  /** Failing checks that are not blocking — worth reading before closing. */
  warnings: CloseCheck[];
}

/**
 * The checklist for one period.
 *
 * Readable on **either** `period.read` or `period.close`, which is the one
 * place in this module that accepts a choice of permission. The reason is that
 * the two say different things and both of them answer yes here: `period.read`
 * is "may see the fiscal calendar", and the checklist is a fact about the
 * calendar; `period.close` is "may move the boundary", and refusing somebody
 * the reasons for a refusal they are about to receive is how a gate becomes a
 * mystery.
 *
 * The shipped Financial Controller holds both, so this changes nothing about
 * the delivered roles — it stops the module depending on that being true.
 */
export async function preCloseChecklist(
  principal: Principal,
  fiscalPeriodId: string,
): Promise<PreCloseReport> {
  if (!principal.permissions.has('period.read')) {
    requirePermission(principal, 'period.close');
  }
  return withTenant(principal.tenantId, (tx) =>
    buildPreCloseChecklist(tx, principal.tenantId, fiscalPeriodId),
  );
}

/**
 * The same checklist without a principal, so the close can run it inside the
 * transaction that is about to change the state.
 *
 * Running it in a separate transaction and then closing would leave a window
 * in which a voucher is approved between the check and the close — and the
 * check would have said the period was clear.
 */
export async function buildPreCloseChecklist(
  tx: Tx,
  tenantId: string,
  fiscalPeriodId: string,
): Promise<PreCloseReport> {
  const period = await tx.fiscalPeriod.findUnique({
    where: { id: fiscalPeriodId },
    select: {
      id: true,
      seq: true,
      startDate: true,
      endDate: true,
      fiscalYear: { select: { tenantId: true, name: true } },
    },
  });
  if (!period || period.fiscalYear.tenantId !== tenantId) {
    throw new PreCloseError('That fiscal period does not belong to this university.');
  }

  const periodLabel = `${period.seq}/${period.fiscalYear.name}`;
  const checks: CloseCheck[] = [];

  // ---- 1. Vouchers awaiting a decision -----------------------------------
  //
  // Dated inside the period, in a state that still expects to post. A DRAFT
  // counts: its maker has not finished, and closing takes away the period they
  // were writing it into.
  const pending = await tx.voucherDraft.count({
    where: {
      tenantId,
      docDate: { gte: period.startDate, lte: period.endDate },
      state: { in: ['DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL'] },
    },
  });
  checks.push({
    key: 'vouchers',
    labelAr: 'لا سندات معلّقة',
    labelEn: 'No vouchers awaiting approval',
    status: pending === 0 ? 'PASS' : 'FAIL',
    blocking: true,
    detailAr:
      pending === 0
        ? 'لا يوجد سند في هذه الفترة ينتظر مراجعة أو اعتماداً.'
        : `${pending} سند في هذه الفترة ما زال ينتظر قراراً. الإقفال يغلق الفترة التي يجب أن تُقيَّد فيها.`,
    detailEn:
      pending === 0
        ? 'Nothing in this period is waiting on a review or an approval.'
        : `${pending} voucher(s) dated in this period are still awaiting a decision. ` +
          'Closing would shut the period they must post into.',
  });

  // ---- 2. Sub-ledger reconciliation --------------------------------------
  const rr = await buildReconciliation(tx, tenantId);
  checks.push({
    key: 'reconciliation',
    labelAr: 'الدفاتر المساعدة مطابقة',
    labelEn: 'Sub-ledgers reconciled',
    status: rr.ok ? 'PASS' : 'FAIL',
    blocking: true,
    detailAr: rr.ok
      ? 'كل حساب مراقبة يطابق دفتره المساعد.'
      : `${rr.breaches.length} من حسابات المراقبة لا تطابق دفاترها. الإقفال يثبّت الرقم الخطأ.`,
    detailEn: rr.ok
      ? 'Every control account agrees with the sub-ledger that explains it.'
      : `${rr.breaches.length} control account(s) disagree with their sub-ledger. ` +
        'Closing freezes whichever of the two is wrong.',
  });

  // ---- 3. The ledger balances --------------------------------------------
  //
  // Since inception to the end of the period, not just the period's own
  // movement: an imbalance carried in from an earlier period is still an
  // imbalance in the closing figures this period will be signed on.
  const tb = await buildTrialBalance(tx, tenantId, {
    from: period.startDate,
    to: period.endDate,
  });
  checks.push({
    key: 'balanced',
    labelAr: 'الميزان متوازن',
    labelEn: 'Trial balance balances',
    status: tb.balanced ? 'PASS' : 'FAIL',
    blocking: true,
    detailAr: tb.balanced
      ? 'مجموع المدين يساوي مجموع الدائن في الأعمدة الثلاثة.'
      : 'مجموع المدين لا يساوي مجموع الدائن. جهة ما كتبت في دفتر الأستاذ من خارج محرك القيد.',
    detailEn: tb.balanced
      ? 'Total debits equal total credits in all three column pairs.'
      : 'Total debits differ from total credits. Something has written to the ledger ' +
        'outside the posting engine, and this period’s figures are not figures.',
  });

  // ---- 4. Depreciation ---------------------------------------------------
  const [depTotal, depPosted] = await Promise.all([
    tx.depreciationEntry.count({ where: { tenantId, fiscalPeriodId } }),
    tx.depreciationEntry.count({
      where: { tenantId, fiscalPeriodId, postedAt: { not: null } },
    }),
  ]);
  const assetsInService = await tx.fixedAsset.count({
    where: { tenantId, status: 'IN_SERVICE' },
  });
  checks.push({
    key: 'depreciation',
    labelAr: 'الإهلاك مُقيَّد',
    labelEn: 'Depreciation posted',
    status:
      assetsInService === 0
        ? 'NOT_APPLICABLE'
        : depTotal > 0 && depPosted === depTotal
          ? 'PASS'
          : 'FAIL',
    blocking: false,
    detailAr:
      assetsInService === 0
        ? 'لا أصول في الخدمة، فلا إهلاك يُقيَّد.'
        : depTotal === 0
          ? `${assetsInService} أصل في الخدمة ولم يُشغَّل الإهلاك لهذه الفترة بعد.`
          : `${depPosted} من ${depTotal} قيد إهلاك مُقيَّد.`,
    detailEn:
      assetsInService === 0
        ? 'No assets in service, so there is no depreciation to post.'
        : depTotal === 0
          ? `${assetsInService} asset(s) in service and depreciation has not been run for this period.`
          : `${depPosted} of ${depTotal} depreciation entries posted.`,
  });

  // ---- 5. Revenue recognition --------------------------------------------
  const [recTotal, recPosted] = await Promise.all([
    tx.recognitionEntry.count({ where: { tenantId, fiscalPeriodId } }),
    tx.recognitionEntry.count({
      where: { tenantId, fiscalPeriodId, recognisedAt: { not: null } },
    }),
  ]);
  checks.push({
    key: 'recognition',
    labelAr: 'إثبات الإيراد مُقيَّد',
    labelEn: 'Revenue recognition posted',
    status:
      recTotal === 0 ? 'NOT_APPLICABLE' : recPosted === recTotal ? 'PASS' : 'FAIL',
    blocking: false,
    detailAr:
      recTotal === 0
        ? 'لا إيراد مؤجل يخص هذه الفترة.'
        : `${recPosted} من ${recTotal} قيد إثبات إيراد مُقيَّد.`,
    detailEn:
      recTotal === 0
        ? 'No deferred income relates to this period.'
        : `${recPosted} of ${recTotal} recognition entries posted.`,
  });

  // ---- 6. FX revaluation --------------------------------------------------
  //
  // Reported rather than silently omitted. REQ-PER-02 lists it; there is no
  // exchange-rate data to revalue until a tenant runs a second currency, and a
  // check that quietly passes for a reason nobody wrote down is a check that
  // will be wrong the first time it matters.
  const rates = await tx.exchangeRate.count({ where: { tenantId } });
  checks.push({
    key: 'fx',
    labelAr: 'إعادة تقييم العملات',
    labelEn: 'FX revaluation',
    status: rates === 0 ? 'NOT_APPLICABLE' : 'FAIL',
    blocking: false,
    detailAr:
      rates === 0
        ? 'الدفاتر بعملة واحدة، فلا شيء يُعاد تقييمه.'
        : 'توجد أسعار صرف مسجّلة، وإعادة التقييم لم تُبنَ بعد. تُراجع الأرصدة بالعملات الأجنبية يدوياً.',
    detailEn:
      rates === 0
        ? 'The books are kept in one currency, so there is nothing to revalue.'
        : 'Exchange rates exist and the revaluation run has not been built yet. ' +
          'Review foreign-currency balances by hand before closing.',
  });

  const warnings = checks.filter((c) => c.status === 'FAIL' && !c.blocking);
  const mayClose = checks.every((c) => !c.blocking || c.status !== 'FAIL');

  return { fiscalPeriodId, periodLabel, checks, mayClose, warnings };
}

/** Refused because the books are not ready, as opposed to refused because the
 *  user may not close periods at all. The message names the failing checks,
 *  because "the checklist failed" tells a controller nothing they can act on. */
export class PreCloseError extends Error {
  readonly failures: CloseCheck[];

  constructor(message: string, failures: CloseCheck[] = []) {
    super(message);
    this.name = 'PreCloseError';
    this.failures = failures;
  }
}

/** Build the refusal for a checklist that did not clear. */
export function refuseClose(report: PreCloseReport): PreCloseError {
  const failed = report.checks.filter((c) => c.blocking && c.status === 'FAIL');
  return new PreCloseError(
    `Period ${report.periodLabel} cannot be closed yet. ` +
      failed.map((c) => c.detailEn).join(' '),
    failed,
  );
}
