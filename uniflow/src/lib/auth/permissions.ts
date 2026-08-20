/**
 * Permission catalogue and segregation-of-duties matrix (SRS REQ-ADM-02,
 * REQ-SOD-01).
 *
 * The legacy system had no roles whatsoever. `Users` carried a `Status` column
 * with the values 'Enable' and 'Disable', and that was the entire access
 * model — every authenticated user could open every screen, including voucher
 * approval and the chart of accounts. A cashier could approve their own
 * receipts.
 *
 * Two ideas here, and they are different:
 *
 *   PERMISSIONS  — what a role may do. Additive; a role is the union of its
 *                  permissions.
 *
 *   SoD CONFLICTS — pairs of permissions that must not be held by the same
 *                  person, regardless of how senior they are. Not additive,
 *                  not overridable, and checked when a role is SAVED rather
 *                  than when it is used. A control that only fires at the
 *                  moment of misuse has already failed.
 */

/** Dotted `resource.action`. The string is the identity — it is stored in
 *  `role_permissions.permission_key` and must stay stable. */
export type PermissionKey = (typeof PERMISSIONS)[number]['key'];

export const PERMISSIONS = [
  // ---- Platform ---------------------------------------------------------
  { key: 'tenant.manage', description: 'Create and configure university tenants' },
  { key: 'user.read', description: 'View staff accounts' },
  { key: 'user.manage', description: 'Create, edit and deactivate staff accounts' },
  { key: 'role.read', description: 'View roles and permissions' },
  { key: 'role.manage', description: 'Create and edit roles' },
  { key: 'audit.read', description: 'Read the audit trail' },

  // ---- Academic structure ----------------------------------------------
  { key: 'academic.read', description: 'View faculties, programmes and batches' },
  { key: 'academic.manage', description: 'Maintain faculties, programmes and batches' },
  { key: 'feematrix.read', description: 'View the fee matrix' },
  { key: 'feematrix.manage', description: 'Maintain the fee matrix and fee items' },

  // ---- Admissions and students -----------------------------------------
  { key: 'application.read', description: 'View admission applications' },
  { key: 'application.decide', description: 'Accept, waitlist or reject applications' },
  { key: 'student.read', description: 'View student profiles' },
  { key: 'student.manage', description: 'Create and edit student profiles' },
  { key: 'student.status', description: 'Change student status (defer, withdraw, readmit)' },
  { key: 'medical.read', description: 'View student medical records' },
  { key: 'medical.manage', description: 'Record medical examinations and fitness' },

  // ---- Registration -----------------------------------------------------
  { key: 'registration.read', description: 'View registrations' },
  { key: 'registration.create', description: 'Register students for a term' },
  { key: 'registration.cancel', description: 'Cancel a registration' },
  { key: 'registration.transfer', description: 'Transfer a student between programmes' },
  { key: 'hold.manage', description: 'Place and clear holds' },

  // ---- Discounts and sponsors ------------------------------------------
  { key: 'discount.apply', description: 'Apply a discount to a registration' },
  { key: 'discount.approve', description: 'Approve a discount above threshold' },
  { key: 'sponsor.manage', description: 'Maintain sponsors and sponsorship contracts' },
  { key: 'sponsor.invoice', description: 'Raise and settle sponsor invoices' },

  // ---- Ledger -----------------------------------------------------------
  { key: 'coa.read', description: 'View the chart of accounts' },
  { key: 'coa.manage', description: 'Maintain the chart of accounts and cost centres' },
  { key: 'voucher.read', description: 'View vouchers' },
  { key: 'voucher.create', description: 'Draft a voucher (maker)' },
  { key: 'voucher.review', description: 'Review a drafted voucher (checker, stage 1)' },
  { key: 'voucher.approve', description: 'Approve and post a voucher (checker, stage 2)' },
  { key: 'voucher.reverse', description: 'Reverse a posted voucher' },

  // ---- Cash -------------------------------------------------------------
  { key: 'receipt.create', description: 'Take student fee payments' },
  { key: 'receipt.cancel', description: 'Cancel a receipt issued today' },
  { key: 'payment.create', description: 'Draft payment vouchers' },
  { key: 'cheque.manage', description: 'Maintain the cheque portfolio and clearing' },

  // ---- Period and budget ------------------------------------------------
  { key: 'period.read', description: 'View the fiscal calendar' },
  { key: 'period.close', description: 'Open and close fiscal periods' },
  { key: 'openingbalance.manage', description: 'Enter opening balances during onboarding' },
  { key: 'budget.read', description: 'View budgets' },
  { key: 'budget.manage', description: 'Prepare and revise budgets' },
  { key: 'budget.approve', description: 'Approve a budget version' },

  // ---- Procurement ------------------------------------------------------
  { key: 'vendor.manage', description: 'Maintain vendors, including bank details' },
  { key: 'po.create', description: 'Raise purchase requisitions and orders' },
  { key: 'po.approve', description: 'Approve purchase orders (creates encumbrance)' },
  { key: 'grn.create', description: 'Record goods and service receipts' },

  // ---- Assets and reports ----------------------------------------------
  { key: 'asset.manage', description: 'Maintain the fixed asset register' },
  { key: 'asset.depreciate', description: 'Run the depreciation batch' },
  { key: 'report.financial', description: 'Run financial statements' },
  { key: 'report.student', description: 'Run student and registration reports' },
] as const;

export const PERMISSION_KEYS: readonly PermissionKey[] = PERMISSIONS.map((p) => p.key);

const PERMISSION_SET = new Set<string>(PERMISSION_KEYS);

export function isPermissionKey(value: string): value is PermissionKey {
  return PERMISSION_SET.has(value);
}

/**
 * Pairs that may not be held together.
 *
 * `reason` is shown to the administrator who tried to save the role. It is
 * written to be read by a university registrar, not a developer — someone
 * denied a permission deserves to know which control they have run into and
 * why it exists.
 */
export interface SodConflict {
  a: PermissionKey;
  b: PermissionKey;
  reason: string;
}

export const SOD_CONFLICTS: readonly SodConflict[] = [
  {
    a: 'voucher.create',
    b: 'voucher.approve',
    reason:
      'Maker-checker: whoever drafts a voucher must not be the one who approves it. ' +
      'This is the control the whole approval workflow exists to provide.',
  },
  {
    a: 'voucher.create',
    b: 'voucher.review',
    reason: 'Maker-checker: a voucher cannot be reviewed by the person who drafted it.',
  },
  {
    a: 'voucher.review',
    b: 'voucher.approve',
    reason:
      'The two checker stages must be separate people, or the second review adds nothing.',
  },
  {
    a: 'feematrix.manage',
    b: 'discount.approve',
    reason:
      'Whoever sets the published fee must not also approve departures from it — ' +
      'together they can price any individual student at will, with no second signature.',
  },
  {
    a: 'discount.apply',
    b: 'discount.approve',
    reason: 'A discount must be approved by someone other than the person who applied it.',
  },
  {
    a: 'vendor.manage',
    b: 'payment.create',
    reason:
      'Whoever can change a vendor bank account must not also raise payments to it. ' +
      'That combination is how invoice-redirection fraud works.',
  },
  {
    a: 'po.create',
    b: 'po.approve',
    reason: 'A purchase order must be approved by someone other than the person who raised it.',
  },
  {
    a: 'po.approve',
    b: 'grn.create',
    reason:
      'Approving the order and confirming its receipt must be separate, or goods that ' +
      'never arrived can be paid for.',
  },
  {
    a: 'voucher.create',
    b: 'period.close',
    reason:
      'Whoever posts entries must not control which periods are open, or a bad entry ' +
      'can be sealed into a closed period by the person who made it.',
  },
  {
    a: 'receipt.create',
    b: 'receipt.cancel',
    reason:
      'A cashier who can both take a payment and cancel it can pocket cash and erase ' +
      'the record. Cancellation belongs to a supervisor.',
  },
  {
    a: 'receipt.create',
    b: 'voucher.approve',
    reason: 'A cashier must not approve the ledger entries their own till produces.',
  },
  {
    a: 'budget.manage',
    b: 'budget.approve',
    reason: 'A budget must be approved by someone other than the person who prepared it.',
  },
  {
    a: 'openingbalance.manage',
    b: 'period.close',
    reason:
      'Opening balances set the starting position of the books; sealing periods locks it in. ' +
      'One person holding both can establish an unchallenged opening position.',
  },
];

export interface SodViolation extends SodConflict {}

/**
 * Check a proposed permission set against the matrix.
 *
 * Called when a role is saved and when permissions are granted to a user, not
 * when a permission is exercised. A control that only fires at the moment of
 * misuse has already failed — by then the conflicting role has existed for
 * months and someone has been using it.
 */
export function findSodViolations(permissions: Iterable<string>): SodViolation[] {
  const held = new Set(permissions);
  return SOD_CONFLICTS.filter((c) => held.has(c.a) && held.has(c.b));
}

export class SodViolationError extends Error {
  constructor(readonly violations: SodViolation[]) {
    super(
      `Segregation of duties prevents this combination:\n` +
        violations.map((v) => `  · "${v.a}" + "${v.b}" — ${v.reason}`).join('\n'),
    );
    this.name = 'SodViolationError';
  }
}

/** Throws unless the permission set is conflict-free. */
export function assertNoSodViolation(permissions: Iterable<string>): void {
  const violations = findSodViolations(permissions);
  if (violations.length > 0) throw new SodViolationError(violations);
}

/**
 * Default roles offered at tenant onboarding, matching the eight user classes
 * in SRS §2.3. Every one is SoD-clean — asserted by test, because a shipped
 * default that violates the matrix would be adopted by every tenant.
 *
 * These are a starting point, not a constraint; tenants may define their own.
 */
export const DEFAULT_ROLES: Record<
  string,
  { nameAr: string; permissions: PermissionKey[] }
> = {
  'University Admin': {
    nameAr: 'مدير الجامعة',
    permissions: [
      'user.read', 'user.manage', 'role.read', 'role.manage', 'audit.read',
      'academic.read', 'academic.manage', 'coa.read', 'period.read',
      'report.financial', 'report.student',
    ],
  },
  Registrar: {
    nameAr: 'المسجل',
    permissions: [
      'academic.read', 'feematrix.read', 'application.read', 'application.decide',
      'student.read', 'student.manage', 'student.status', 'medical.read',
      'registration.read', 'registration.create', 'registration.cancel',
      'registration.transfer', 'hold.manage', 'discount.apply', 'report.student',
    ],
  },
  'Financial Controller': {
    nameAr: 'المدير المالي',
    permissions: [
      'coa.read', 'voucher.read', 'voucher.approve', 'voucher.reverse',
      'period.read', 'period.close', 'budget.read', 'budget.approve',
      'discount.approve', 'po.approve', 'report.financial', 'audit.read',
    ],
  },
  'Financial Auditor': {
    nameAr: 'المراجع المالي',
    permissions: [
      'coa.read', 'voucher.read', 'voucher.review', 'period.read',
      'budget.read', 'report.financial', 'audit.read',
    ],
  },
  'Senior Accountant': {
    nameAr: 'محاسب أول',
    permissions: [
      'coa.read', 'coa.manage', 'voucher.read', 'voucher.create',
      'payment.create', 'cheque.manage', 'asset.manage', 'asset.depreciate',
      'budget.read', 'budget.manage', 'grn.create', 'period.read',
      'report.financial',
    ],
  },
  Cashier: {
    nameAr: 'أمين الصندوق',
    permissions: [
      'student.read', 'registration.read', 'receipt.create', 'voucher.read',
      'period.read',
    ],
  },
  'Cashier Supervisor': {
    nameAr: 'مشرف الصندوق',
    permissions: [
      'student.read', 'registration.read', 'receipt.cancel', 'voucher.read',
      'cheque.manage', 'period.read', 'report.financial',
    ],
  },
  Dean: {
    nameAr: 'العميد',
    permissions: [
      'academic.read', 'student.read', 'registration.read', 'application.read',
      'report.student',
    ],
  },
  'Procurement Officer': {
    nameAr: 'مسؤول المشتريات',
    permissions: ['vendor.manage', 'po.create', 'budget.read'],
  },
};
