import type { PermissionKey } from '@/lib/auth/permissions';

/**
 * The staff console's route table and navigation tree (Track D1).
 *
 * ## What this replaces
 *
 * The legacy system had a role column and never read it.
 *
 * ```vb
 * Dim cmd As New SqlCommand(
 *   "Select PWD,Priv From Users Where UserName=N'" & Me.txtUserName.Text & "'", cnn)
 * ...
 * Priv = Reader.Item(1)          ' frmLogin.vb:54
 * ```
 * ([frmLogin.vb:44-54](Nile%20College%20System%20-%20Ribat%20Univ/Rebat%20University%20Application/Form/frmLogin.vb#L44-L54))
 *
 * `Priv` has two possible values, typed into a combo box on the user form —
 * `"مدير عام"` and `"محصل"`, general manager and collector
 * ([frmAddUser.designer.vb:88](Nile%20College%20System%20-%20Ribat%20Univ/Rebat%20University%20Application/Form/frmAddUser.Designer.vb#L88)).
 * It is assigned to a module-level global at login and then **never read
 * again anywhere in the application**. The column's only other appearance is
 * `Select UserName From Users Where Priv=N'محصل'`
 * ([frmVouchersSerialsNo.vb:102](Nile%20College%20System%20-%20Ribat%20Univ/Rebat%20University%20Application/Forms/frmVouchersSerialsNo.vb#L102)),
 * which populates a dropdown of collectors on a report filter. So the role
 * exists, is stored, is loaded — and gates nothing. Every authenticated user
 * could open every screen, including voucher approval and the chart of
 * accounts.
 *
 * The Nile build does not even get that far: its login selects
 * `Pass,Status` and the privilege read is commented out —
 * `'Priv = Reader.Item(1)`
 * ([frmLogin.vb](Nile%20College%20E-University%20System/Oasis%20-%20E-University/frmLogin.vb)).
 *
 * ## The mechanism here
 *
 * This file is the **single declaration** of every console route. The
 * navigation renders from it and the route guard reads the same rows, so a
 * menu item and its page cannot disagree about who may see it. A route with
 * no declaration here is refused rather than served — and a structural test
 * walks `src/app/[locale]/console` and fails if a page exists that this table
 * does not describe, because adding a screen and forgetting its guard is
 * otherwise silent.
 *
 * **The menu is generated, not hidden.** A user without the permission does
 * not receive the item — and typing the URL is refused by the same
 * declaration. Hiding a control while leaving its route open is the shape of
 * access control that looks right in a demonstration and is not one.
 */

/** The build phase that delivers a screen. The rest name what a user is
 *  waiting for rather than pretending it exists. */
export type ConsolePhase = 'D1' | 'D2' | 'D3' | 'D4' | 'D5';

/** Phases whose screens all exist. An item outside this set renders as a name
 *  and a phase rather than a link to a 404. */
export const BUILT_PHASES: ReadonlySet<ConsolePhase> = new Set<ConsolePhase>(['D1', 'D2', 'D3']);

/**
 * Whether a screen exists, in the one place both the menu and the section
 * index ask.
 *
 * D1, D2 and D3 each landed whole, so a phase was a fine unit to track this
 * in. **D4 is twenty screens** and lands in groups, which the phase-level set
 * cannot express — and the alternative, holding twenty finished screens back
 * until the twentieth is done, is how a build stops being shippable.
 *
 * So an item may say `built: true` ahead of its phase. That is a second place
 * the answer can come from, which is exactly the drift `CONSOLE_ROUTES`
 * exists to prevent — so it is one exported predicate, both renderers call
 * it, and the structural test walks `page.tsx` on disk and fails on anything
 * that claims to be built and is not.
 */
export function isBuilt(item: Pick<ConsoleItem, 'phase' | 'built'>): boolean {
  return item.built === true || BUILT_PHASES.has(item.phase);
}

export interface ConsoleItem {
  /** Message key under `console.items`. */
  key: string;
  /** Path below `/console`, or '' for the section index itself. */
  path: string;
  /** Held **any** of these and the item is visible and the route reachable. */
  anyOf: readonly PermissionKey[];
  phase: ConsolePhase;
  /**
   * A dynamic sub-route belonging to this screen — `registry/students/[id]`.
   * Declared rather than inferred, so the guard covers it and the structural
   * test finds it. It carries the item's own permissions: a detail page is
   * the same screen with one row selected, and giving it a looser rule than
   * the list it came from is how a "read" permission turns into a way to
   * enumerate.
   */
  detail?: string;
  /**
   * Set on a screen that exists while its phase is still in flight. Never set
   * on one whose phase is in `BUILT_PHASES` — that would be two ways to say
   * the same thing. Asserted by test.
   */
  built?: true;
}

export interface ConsoleSection {
  key: string;
  path: string;
  items: readonly ConsoleItem[];
}

/**
 * Sections and their screens.
 *
 * A section is visible when the user may reach at least one screen in it, so
 * the section list needs no permission of its own — it is the union of what
 * it contains, which cannot drift from it.
 */
export const CONSOLE_SECTIONS: readonly ConsoleSection[] = [
  {
    key: 'finance',
    path: 'finance',
    items: [
      { key: 'cashierDesk', path: 'finance/cashier', anyOf: ['receipt.create'], phase: 'D2' },
      { key: 'receipts', path: 'finance/receipts', anyOf: ['receipt.create', 'receipt.cancel'], phase: 'D2' },
      { key: 'cheques', path: 'finance/cheques', anyOf: ['cheque.manage', 'cheque.cancel'], phase: 'D2', detail: 'finance/cheques/[id]' },
      { key: 'vouchers', path: 'finance/vouchers', anyOf: ['voucher.read', 'voucher.create'], phase: 'D2', detail: 'finance/vouchers/[id]' },
      { key: 'approvals', path: 'finance/approvals', anyOf: ['voucher.review', 'voucher.approve'], phase: 'D2' },
      // The till a cashier's cash posts to. `assignTill` demands `coa.manage`,
      // so the screen does too — the menu and the module name the same
      // permission rather than two that happen to overlap today.
      { key: 'tills', path: 'finance/tills', anyOf: ['coa.manage'], phase: 'D2' },
      // Paying suppliers, not collecting from students. D2's own description
      // covers the cashier, the cheque pipeline and the voucher workflow;
      // §8 gives procure-to-pay *through payment* to D4, and this row said
      // D2 only because it sits in the finance menu.
      { key: 'payments', path: 'finance/payments', anyOf: ['payment.create', 'payment.approve'], phase: 'D4' },
      { key: 'periods', path: 'finance/periods', anyOf: ['period.read', 'period.close'], phase: 'D4', built: true },
    ],
  },
  {
    key: 'registry',
    path: 'registry',
    items: [
      { key: 'students', path: 'registry/students', anyOf: ['student.read', 'student.manage'], phase: 'D3', detail: 'registry/students/[id]' },
      { key: 'registrationDesk', path: 'registry/register', anyOf: ['registration.create'], phase: 'D3' },
      { key: 'registrations', path: 'registry/registrations', anyOf: ['registration.read'], phase: 'D3', detail: 'registry/registrations/[id]' },
      { key: 'holds', path: 'registry/holds', anyOf: ['hold.manage'], phase: 'D3' },
      { key: 'lifecycle', path: 'registry/lifecycle', anyOf: ['student.status', 'registration.transfer'], phase: 'D3' },
      { key: 'admissions', path: 'registry/admissions', anyOf: ['application.read', 'application.decide', 'application.offer'], phase: 'D4', built: true },
      { key: 'documents', path: 'registry/documents', anyOf: ['document.verify'], phase: 'D3' },
      { key: 'medical', path: 'registry/medical', anyOf: ['medical.read', 'medical.manage'], phase: 'D3' },
    ],
  },
  {
    key: 'academic',
    path: 'academic',
    items: [
      { key: 'structure', path: 'academic/structure', anyOf: ['academic.read', 'academic.manage'], phase: 'D4', built: true },
      { key: 'feeMatrix', path: 'academic/fees', anyOf: ['feematrix.read', 'feematrix.manage', 'feematrix.approve'], phase: 'D4', built: true },
      { key: 'capacity', path: 'academic/capacity', anyOf: ['admission.capacity'], phase: 'D4', built: true },
      { key: 'sponsors', path: 'academic/sponsors', anyOf: ['sponsor.manage', 'sponsor.approve', 'sponsor.invoice'], phase: 'D4', built: true },
      { key: 'scholarships', path: 'academic/scholarships', anyOf: ['scholarship.manage', 'scholarship.approve'], phase: 'D4', built: true },
    ],
  },
  {
    key: 'procurement',
    path: 'procurement',
    items: [
      { key: 'vendors', path: 'procurement/vendors', anyOf: ['vendor.manage', 'vendor.approve'], phase: 'D4', built: true },
      { key: 'orders', path: 'procurement/orders', anyOf: ['po.create', 'po.approve'], phase: 'D4' },
      { key: 'receiving', path: 'procurement/receiving', anyOf: ['grn.create'], phase: 'D4' },
      { key: 'invoices', path: 'procurement/invoices', anyOf: ['apinvoice.record', 'apinvoice.approve'], phase: 'D4' },
      { key: 'budgets', path: 'procurement/budgets', anyOf: ['budget.read', 'budget.manage', 'budget.approve'], phase: 'D4' },
      { key: 'assets', path: 'procurement/assets', anyOf: ['asset.manage', 'asset.depreciate', 'asset.dispose'], phase: 'D4', built: true },
    ],
  },
  {
    key: 'reports',
    path: 'reports',
    items: [
      { key: 'trialBalance', path: 'reports/trial-balance', anyOf: ['report.financial'], phase: 'D5' },
      { key: 'statements', path: 'reports/statements', anyOf: ['report.financial'], phase: 'D5' },
      { key: 'aging', path: 'reports/aging', anyOf: ['report.financial'], phase: 'D5' },
      { key: 'reconciliation', path: 'reports/reconciliation', anyOf: ['report.financial'], phase: 'D5' },
      { key: 'studentAccount', path: 'reports/student-account', anyOf: ['report.student'], phase: 'D5' },
      { key: 'discountExposure', path: 'reports/discounts', anyOf: ['report.student', 'report.financial'], phase: 'D5' },
    ],
  },
  {
    key: 'settings',
    path: 'settings',
    items: [
      { key: 'users', path: 'settings/users', anyOf: ['user.read', 'user.manage'], phase: 'D4', built: true },
      { key: 'roles', path: 'settings/roles', anyOf: ['role.read', 'role.manage'], phase: 'D4', built: true },
      { key: 'branding', path: 'settings/branding', anyOf: ['cms.manage'], phase: 'D4', built: true },
      { key: 'content', path: 'settings/content', anyOf: ['cms.manage', 'cms.publish'], phase: 'D4', built: true },
      { key: 'enquiries', path: 'settings/enquiries', anyOf: ['inquiry.handle'], phase: 'D4', built: true },
      { key: 'audit', path: 'settings/audit', anyOf: ['audit.read'], phase: 'D4', built: true },
    ],
  },
] as const;

/**
 * Every console path and what it demands, section indexes included.
 *
 * The section index is reachable on the union of its items: a section a user
 * can see nothing inside is a section they cannot open.
 */
export interface RouteRule {
  path: string;
  anyOf: readonly PermissionKey[];
}

export const CONSOLE_ROUTES: readonly RouteRule[] = [
  // The console root. Any authenticated member of staff reaches it; it shows
  // them what they may do, which is the one question the legacy build could
  // not answer about itself.
  { path: '', anyOf: [] },
  ...CONSOLE_SECTIONS.map((s) => ({
    path: s.path,
    anyOf: [...new Set(s.items.flatMap((i) => i.anyOf))],
  })),
  ...CONSOLE_SECTIONS.flatMap((s) => s.items.map((i) => ({ path: i.path, anyOf: i.anyOf }))),
  ...CONSOLE_SECTIONS.flatMap((s) =>
    s.items
      .filter((i) => i.detail)
      .map((i) => ({ path: i.detail!, anyOf: i.anyOf })),
  ),
];

const ROUTE_BY_PATH = new Map(CONSOLE_ROUTES.map((r) => [r.path, r]));

/** Normalise a console path: no leading or trailing slash, no locale. */
export function normaliseConsolePath(path: string): string {
  return path.replace(/^\/+|\/+$/g, '');
}

/**
 * What a path demands, or null when it is not declared.
 *
 * Null is refused by the guard rather than allowed. A route this table does
 * not describe is a route nobody decided the access rules for, and the safe
 * reading of that is "no".
 */
export function ruleFor(path: string): RouteRule | null {
  return ROUTE_BY_PATH.get(normaliseConsolePath(path)) ?? null;
}

/** Holding any one of the listed permissions is enough. An empty list means
 *  "authenticated is enough" and is used only by the console root. */
export function satisfies(held: ReadonlySet<PermissionKey>, anyOf: readonly PermissionKey[]): boolean {
  return anyOf.length === 0 || anyOf.some((p) => held.has(p));
}

export interface VisibleItem extends Omit<ConsoleItem, 'built'> {
  /** Resolved by `isBuilt`: false until the screen exists. Widened from the
   *  declaration's `true | undefined`, which is deliberately narrow so a row
   *  cannot say `built: false` and mean something different from omitting it. */
  built: boolean;
}

export interface VisibleSection {
  key: string;
  path: string;
  items: VisibleItem[];
}

/**
 * The navigation for one permission set.
 *
 * A section with no visible items is dropped entirely rather than rendered
 * empty — an empty menu heading tells a user that something exists which they
 * may not have, which is information the console has no reason to give.
 */
export function navigationFor(held: ReadonlySet<PermissionKey>): VisibleSection[] {
  const out: VisibleSection[] = [];
  for (const section of CONSOLE_SECTIONS) {
    const items = section.items
      .filter((i) => satisfies(held, i.anyOf))
      .map((i) => ({ ...i, built: isBuilt(i) }));
    if (items.length > 0) out.push({ key: section.key, path: section.path, items });
  }
  return out;
}

/** The section a path belongs to, for highlighting the current menu entry. */
export function sectionOf(path: string): ConsoleSection | null {
  const p = normaliseConsolePath(path);
  return CONSOLE_SECTIONS.find((s) => p === s.path || p.startsWith(`${s.path}/`)) ?? null;
}

/**
 * Where a signed-in user should land.
 *
 * The dashboard, unless the sign-in carried a `next` — and `next` is accepted
 * only when it is a path inside the console that this table declares. A login
 * form that redirects wherever it is told is an open redirect, which is worth
 * more to an attacker than most bugs in a finance system.
 *
 * It lives beside the route table rather than with the guard because it is
 * entirely a question about that table, and because keeping it free of the
 * Next.js redirect machinery lets it be asserted directly.
 */
export function safeNext(next: string | null | undefined): string {
  if (!next) return '/console';
  if (!next.startsWith('/console')) return '/console';
  const rest = next.slice('/console'.length).replace(/^\/+/, '');
  return ruleFor(rest) ? (rest ? `/console/${rest}` : '/console') : '/console';
}
