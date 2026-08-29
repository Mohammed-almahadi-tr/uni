import 'server-only';
import { withTenant, type Tx } from '@/lib/db/client';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { money, sum, ZERO, type Money } from '@/lib/money';
import { reconcileStudentSubledger } from '@/lib/students/account';
import { vendorSubledgerVariance } from '@/lib/procurement/invoices';
import { reconcileAssetRegister } from '@/lib/assets/depreciation';

/**
 * Sub-ledger reconciliation report (SRS REQ-RPT-06).
 *
 * Every control account against the sub-ledger that is supposed to explain it,
 * in one place, from one snapshot of the ledger.
 *
 * The three checks already existed — A3 built the student one, A5 the asset
 * register, A6 the vendor payables — but each was reached from a different
 * module and each opened its own transaction. Run one after another they can
 * disagree with each other for no better reason than that a receipt posted
 * between two of them. Here they run inside a single read transaction, so a
 * variance the report shows is a variance that exists.
 *
 * ## The rule this report enforces
 *
 * A non-zero variance is a **P1 data-integrity alert**, not a rounding
 * observation to be filed. It means one of two numbers describing the same
 * money is wrong and nobody yet knows which. The legacy system could not
 * compute this at all: it kept two ledger tables (`Transactions` and
 * `Transactionees`) with two amount-column pairs, written by different
 * screens, so there was no single control balance for a sub-ledger to be
 * compared against.
 *
 * ## The fourth check
 *
 * Beyond the three named sub-ledgers there is a structural one: every balance
 * sitting on a control account must carry the party it belongs to. A control
 * account holding an unattributed amount has no sub-ledger to reconcile
 * against, so it would pass the first three checks by being invisible to them.
 * `orphanedControlBalances` is what makes that visible.
 */

export type ReconciliationSeverity = 'OK' | 'VARIANCE';

export interface ReconciliationLine {
  key: string;
  labelEn: string;
  labelAr: string;
  /** What the sub-ledger — the detail records — says. */
  subledger: string;
  /** What the general ledger control account says. */
  control: string;
  variance: string;
  severity: ReconciliationSeverity;
  /** Populated when the variance needs explaining beyond the numbers. */
  note?: string;
}

export interface ReconciliationReport {
  asOf: string;
  currency: string;
  lines: ReconciliationLine[];
  /** True when every line is flat. Anything else is a P1. */
  ok: boolean;
  /** Lines with a non-zero variance, for alerting without re-scanning. */
  breaches: ReconciliationLine[];
}

export async function subledgerReconciliation(
  principal: Principal,
): Promise<ReconciliationReport> {
  requirePermission(principal, 'report.financial');
  return withTenant(principal.tenantId, (tx) =>
    buildReconciliation(tx, principal.tenantId),
  );
}

export async function buildReconciliation(
  tx: Tx,
  tenantId: string,
): Promise<ReconciliationReport> {
  const tenant = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { functionalCurrency: true },
  });

  const lines: ReconciliationLine[] = [];

  const students = await reconcileStudentSubledger(tx, tenantId);
  lines.push(
    line(
      'student-receivable',
      'Student receivables vs AR control',
      'ذمم الطلاب مقابل حساب المراقبة',
      students.subledgerReceivable,
      students.controlReceivable,
      students.receivableVariance,
    ),
  );
  lines.push(
    line(
      'student-credit',
      'Student credit balances vs overpayments control',
      'أرصدة الطلاب الدائنة مقابل حساب المدفوعات الزائدة',
      students.subledgerCredit,
      students.controlCredit,
      students.creditVariance,
    ),
  );

  // Procurement is optional at go-live: a university with no vendor mapping
  // yet has nothing to reconcile, and a missing mapping is a setup state, not
  // a data-integrity breach. Anything else propagates.
  try {
    const vendors = await vendorSubledgerVariance(tx, tenantId);
    lines.push(
      line(
        'vendor-payable',
        'Vendor payables vs AP control',
        'ذمم الموردين مقابل حساب المراقبة',
        vendors.subledger,
        vendors.control,
        vendors.variance,
      ),
    );
  } catch (err) {
    if (!isMappingMissing(err)) throw err;
  }

  const assets = await reconcileAssetRegister(tx, tenantId);
  lines.push(
    line(
      'asset-cost',
      'Fixed asset cost vs asset accounts',
      'تكلفة الأصول الثابتة مقابل حسابات الأصول',
      assets.registerCost,
      assets.ledgerCost,
      assets.costVariance,
    ),
  );
  lines.push(
    line(
      'asset-accumulated',
      'Accumulated depreciation vs contra accounts',
      'مجمع الإهلاك مقابل الحسابات المقابلة',
      assets.registerAccumulated,
      assets.ledgerAccumulated,
      assets.accumulatedVariance,
    ),
  );

  for (const orphan of await orphanedControlBalances(tx, tenantId)) {
    lines.push({
      key: `control-unattributed-${orphan.code}`,
      labelEn: `${orphan.code} ${orphan.nameEn} — balances carrying a party`,
      labelAr: `${orphan.code} ${orphan.nameAr} — أرصدة منسوبة لأطرافها`,
      subledger: orphan.attributed.toFixed(4),
      control: orphan.total.toFixed(4),
      variance: orphan.unattributed.toFixed(4),
      severity: orphan.unattributed.isZero() ? 'OK' : 'VARIANCE',
      note: orphan.unattributed.isZero()
        ? undefined
        : `${orphan.unattributed.toFixed(2)} sits on this control account with no party ` +
          `attached, so no sub-ledger can account for it and no one can be asked to settle it.`,
    });
  }

  const breaches = lines.filter((l) => l.severity === 'VARIANCE');

  return {
    asOf: new Date().toISOString().slice(0, 10),
    currency: tenant.functionalCurrency.trim(),
    lines,
    ok: breaches.length === 0,
    breaches,
  };
}

function line(
  key: string,
  labelEn: string,
  labelAr: string,
  subledger: string,
  control: string,
  variance: string,
): ReconciliationLine {
  return {
    key,
    labelEn,
    labelAr,
    subledger,
    control,
    variance,
    severity: money(variance).isZero() ? 'OK' : 'VARIANCE',
  };
}

function isMappingMissing(err: unknown): boolean {
  return err instanceof Error && err.name === 'AccountMappingMissingError';
}

interface OrphanRow {
  code: string;
  nameEn: string;
  nameAr: string;
  total: Money;
  attributed: Money;
  unattributed: Money;
}

/**
 * Control-account balances with no sub-ledger party attached.
 *
 * The posting engine and the database both refuse a control-account line
 * without an identity, so in a healthy system every row here reads zero. That
 * is the point: this check is worth keeping precisely because it should never
 * fire, and if it ever does the refusal has been bypassed by something writing
 * to the ledger outside `post()`.
 */
async function orphanedControlBalances(
  tx: Tx,
  tenantId: string,
): Promise<OrphanRow[]> {
  const controls = await tx.account.findMany({
    where: { tenantId, isControlAccount: true },
    select: { id: true, code: true, nameEn: true, nameAr: true },
    orderBy: { code: 'asc' },
  });

  const out: OrphanRow[] = [];
  for (const c of controls) {
    const rows = await tx.transactionLine.findMany({
      where: { accountId: c.id, header: { tenantId } },
      select: { debitAmount: true, creditAmount: true, subledgerId: true },
    });
    if (rows.length === 0) continue;

    const total = sum(rows.map((r) => r.debitAmount.minus(r.creditAmount)));
    const attributed = sum(
      rows.filter((r) => r.subledgerId !== null).map((r) => r.debitAmount.minus(r.creditAmount)),
    );

    out.push({
      code: c.code,
      nameEn: c.nameEn,
      nameAr: c.nameAr,
      total,
      attributed,
      unattributed: total.minus(attributed),
    });
  }
  return out;
}

/** Zero as a formatted string, for callers assembling an empty report. */
export const NIL = ZERO.toFixed(4);
