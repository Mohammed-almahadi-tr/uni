import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { disconnectAll, makePrincipal, makeUniversity, type University } from './helpers';
import {
  BUILT_PHASES,
  CONSOLE_ROUTES,
  CONSOLE_SECTIONS,
  isBuilt,
  navigationFor,
  normaliseConsolePath,
  ruleFor,
  satisfies,
  sectionOf,
} from '@/lib/console/navigation';
import { safeNext } from '@/lib/console/navigation';
import { sessionServes } from '@/lib/console/tenancy';
import { addDomain, resolveTenantByHost } from '@/lib/cms/hosts';
import { login, resolvePrincipal } from '@/lib/auth/login';
import { provisionTenant, syncPermissions } from '@/lib/auth/provisioning';
import {
  DEFAULT_ROLES,
  findSodViolations,
  isPermissionKey,
  PERMISSION_KEYS,
  type PermissionKey,
} from '@/lib/auth/permissions';

/**
 * The staff console shell (Track D1).
 *
 * The legacy baseline is a role that exists and is never read:
 *
 *     Select PWD,Priv From Users Where UserName=N'" & Me.txtUserName.Text & "'"
 *     Priv = Reader.Item(1)                            ' frmLogin.vb:44, 54
 *
 * `Priv` holds one of two strings typed into a combo box — general manager or
 * collector — is assigned to a module-level global at sign-in, and is then
 * never consulted anywhere in the application. The column's only other
 * appearance is `Where Priv=N'محصل'` populating a dropdown on a report filter.
 * Every authenticated user could open every screen, including voucher
 * approval and the chart of accounts. The Nile build's login does not even
 * select the column: `'Priv = Reader.Item(1)` is commented out.
 *
 * So the property under test is: **the menu is generated from the permission
 * set, and the route is refused by the same declaration.** Not hidden — a
 * control hidden by CSS with its route left open is the version of this that
 * passes a demonstration and fails an audit.
 */

afterAll(disconnectAll);

const setOf = (...keys: PermissionKey[]) => new Set<PermissionKey>(keys);

// ---------------------------------------------------------------------------
// One declaration, read by both the menu and the guard
// ---------------------------------------------------------------------------

describe('the route table is the single declaration', () => {
  it('names only real permissions', () => {
    for (const route of CONSOLE_ROUTES) {
      for (const key of route.anyOf) {
        expect(isPermissionKey(key), `${route.path} names "${key}"`).toBe(true);
      }
    }
  });

  it('declares every path once', () => {
    const paths = CONSOLE_ROUTES.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('puts every item under its own section', () => {
    for (const section of CONSOLE_SECTIONS) {
      for (const item of section.items) {
        expect(item.path.startsWith(`${section.path}/`), `${item.path} vs ${section.path}`).toBe(
          true,
        );
      }
    }
  });

  it('reaches a section on the union of what it contains', () => {
    // A section a user can see nothing inside must not open, and a section
    // holding something they may reach must. Union rather than a permission
    // of its own, so the two cannot drift apart.
    for (const section of CONSOLE_SECTIONS) {
      const rule = ruleFor(section.path)!;
      const union = new Set(section.items.flatMap((i) => i.anyOf));
      expect(new Set(rule.anyOf)).toEqual(union);
    }
  });

  it('refuses a path nobody declared', () => {
    // Not "allows by default". A route this table does not describe is a
    // route for which nobody decided the access rules.
    expect(ruleFor('finance/secret-ledger')).toBeNull();
    expect(ruleFor('../settings/users')).toBeNull();
    expect(ruleFor('settings/users')).not.toBeNull();
  });

  it('normalises the path it is asked about', () => {
    expect(normaliseConsolePath('/finance/vouchers/')).toBe('finance/vouchers');
    expect(ruleFor('/finance/vouchers/')).not.toBeNull();
  });

  it('locates the section a path belongs to', () => {
    expect(sectionOf('finance/vouchers')?.key).toBe('finance');
    expect(sectionOf('finance')?.key).toBe('finance');
    expect(sectionOf('financial')).toBeNull();
    expect(sectionOf('')).toBeNull();
  });

  /**
   * The structural one. Adding a screen and forgetting its guard is otherwise
   * silent — the page renders for whoever reaches it. This walks the console
   * routes on disk rather than a list somebody maintains, in the same spirit
   * as the RLS coverage test in §9.3.
   */
  it('declares every console page that exists on disk', () => {
    const root = resolve(__dirname, '..', 'src', 'app', '[locale]', 'console');

    const pages: string[] = [];
    const walk = (dir: string, prefix: string): void => {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full, prefix ? `${prefix}/${entry}` : entry);
        } else if (entry === 'page.tsx') {
          pages.push(prefix);
        }
      }
    };
    walk(root, '');

    expect(pages.length).toBeGreaterThan(0);
    const undeclared = pages.filter((p) => ruleFor(p) === null);
    expect(undeclared).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The menu is generated, not filtered
// ---------------------------------------------------------------------------

describe('navigation is generated from the permission set', () => {
  it('gives a user with no permissions nothing at all', () => {
    expect(navigationFor(setOf())).toEqual([]);
  });

  it('gives a cashier the till and not the approval queue', () => {
    const cashier = setOf('student.read', 'registration.read', 'receipt.create', 'voucher.read', 'period.read');
    const nav = navigationFor(cashier);

    const finance = nav.find((s) => s.key === 'finance');
    expect(finance).toBeDefined();
    const keys = finance!.items.map((i) => i.key);
    expect(keys).toContain('cashierDesk');
    expect(keys).toContain('vouchers');
    expect(keys).not.toContain('approvals');
    expect(keys).not.toContain('payments');
  });

  it('shows a cashier no settings section whatsoever', () => {
    const cashier = setOf('student.read', 'registration.read', 'receipt.create', 'voucher.read');
    expect(navigationFor(cashier).map((s) => s.key)).not.toContain('settings');
  });

  it('never renders an empty section heading', () => {
    // An empty heading tells a user that something exists which they do not
    // have, which the console has no reason to volunteer.
    for (const role of Object.values(DEFAULT_ROLES)) {
      const nav = navigationFor(new Set(role.permissions));
      for (const section of nav) expect(section.items.length).toBeGreaterThan(0);
    }
  });

  it('only ever offers items the same declaration would let through', () => {
    // The menu and the guard cannot disagree, because this is the property
    // that makes hiding-by-CSS unnecessary.
    for (const role of Object.values(DEFAULT_ROLES)) {
      const held = new Set(role.permissions);
      for (const section of navigationFor(held)) {
        expect(satisfies(held, ruleFor(section.path)!.anyOf)).toBe(true);
        for (const item of section.items) {
          expect(satisfies(held, ruleFor(item.path)!.anyOf)).toBe(true);
        }
      }
    }
  });

  it('withholds every item the role does not carry', () => {
    // The other direction: nothing is offered that should not be.
    for (const role of Object.values(DEFAULT_ROLES)) {
      const held = new Set(role.permissions);
      const offered = new Set(navigationFor(held).flatMap((s) => s.items.map((i) => i.path)));
      for (const section of CONSOLE_SECTIONS) {
        for (const item of section.items) {
          if (!satisfies(held, item.anyOf)) expect(offered.has(item.path)).toBe(false);
        }
      }
    }
  });

  it('gives the Financial Controller approvals but not the cashier desk', () => {
    const nav = navigationFor(new Set(DEFAULT_ROLES['Financial Controller'].permissions));
    const finance = nav.find((s) => s.key === 'finance')!;
    const keys = finance.items.map((i) => i.key);
    expect(keys).toContain('approvals');
    expect(keys).not.toContain('cashierDesk');
  });

  it('gives the Stores Officer a single section and a single screen', () => {
    // grn.create and voucher.read, and deliberately nothing else — the one
    // independent piece of evidence in the three-way match.
    const nav = navigationFor(new Set(DEFAULT_ROLES['Stores Officer'].permissions));
    expect(nav.map((s) => s.key).sort()).toEqual(['finance', 'procurement']);
    expect(nav.find((s) => s.key === 'procurement')!.items.map((i) => i.key)).toEqual([
      'receiving',
    ]);
  });

  it('marks a screen that is declared and not yet built', () => {
    const nav = navigationFor(new Set(DEFAULT_ROLES.Registrar.permissions));
    const items = nav.flatMap((s) => s.items);
    expect(items.length).toBeGreaterThan(0);
    // A screen is a link when the phase that builds it has landed, and a name
    // with a phase against it when it has not. `BUILT_PHASES` is the one place
    // that changes as Track D proceeds.
    // Compared against the *declaration*, not against the rendered item —
    // `isBuilt(i)` on an already-resolved VisibleItem would be tautological.
    const declared = new Map(
      CONSOLE_SECTIONS.flatMap((s) => s.items).map((i) => [i.path, i]),
    );
    expect(items.every((i) => i.built === isBuilt(declared.get(i.path)!))).toBe(true);
    // …and there is still something waiting, or this test has stopped saying
    // anything.
    expect(items.some((i) => !i.built)).toBe(true);
  });

  it('lets the console root through on authentication alone', () => {
    // The dashboard answers "what may I do here?", which is exactly the
    // question a user with no permissions still needs answered.
    expect(satisfies(setOf(), ruleFor('')!.anyOf)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Where sign-in sends you
// ---------------------------------------------------------------------------

describe('the sign-in redirect cannot be pointed elsewhere', () => {
  it('accepts a declared console path', () => {
    expect(safeNext('/console/finance/vouchers')).toBe('/console/finance/vouchers');
    expect(safeNext('/console')).toBe('/console');
  });

  it('falls back to the dashboard for anything else', () => {
    for (const hostile of [
      'https://evil.example/steal',
      '//evil.example/steal',
      '/console/../../etc',
      '/login',
      '/programmes',
      '/console/finance/not-a-screen',
      '',
      null,
      undefined,
    ]) {
      expect(safeNext(hostile), String(hostile)).toBe('/console');
    }
  });
});

// ---------------------------------------------------------------------------
// A session belongs to one university
// ---------------------------------------------------------------------------

describe('a session is bound to the university whose address it arrived on', () => {
  it('resolves a real principal and matches its own host', async () => {
    await syncPermissions();
    const slug = `d1a${Date.now().toString(36)}`;
    const t = await provisionTenant({
      slug,
      nameEn: 'Console University A',
      nameAr: 'جامعة الواجهة أ',
      admin: { email: `admin@${slug}.test`, fullName: 'Console Admin', password: 'Khartoum2026Uni' },
    });

    const platform = await makePrincipal(t.tenantId, ['tenant.manage'], { name: 'platformA' });
    const host = `${slug}.example.edu`;
    await addDomain(platform, t.tenantId, { host, canonical: true });

    const result = await login(t.tenantId, `admin@${slug}.test`, 'Khartoum2026Uni');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const principal = await resolvePrincipal(result.token);
    expect(principal).not.toBeNull();

    const tenant = await resolveTenantByHost(host);
    expect(tenant).not.toBeNull();
    expect(sessionServes(principal!, tenant!)).toBe(true);

    // …and the navigation it produces is the admin's, not everyone's.
    const nav = navigationFor(principal!.permissions);
    expect(nav.map((s) => s.key)).toContain('settings');
    expect(nav.find((s) => s.key === 'finance')?.items.map((i) => i.key) ?? []).not.toContain(
      'cashierDesk',
    );
  });

  it('refuses a token from one university on another university’s address', async () => {
    await syncPermissions();
    const slugA = `d1b${Date.now().toString(36)}`;
    const slugB = `d1c${Date.now().toString(36)}`;

    const a = await provisionTenant({
      slug: slugA,
      nameEn: 'Console University B',
      nameAr: 'جامعة الواجهة ب',
      admin: { email: `admin@${slugA}.test`, fullName: 'Admin B', password: 'Khartoum2026Uni' },
    });
    const b = await provisionTenant({
      slug: slugB,
      nameEn: 'Console University C',
      nameAr: 'جامعة الواجهة ج',
      admin: { email: `admin@${slugB}.test`, fullName: 'Admin C', password: 'Khartoum2026Uni' },
    });

    const platformA = await makePrincipal(a.tenantId, ['tenant.manage'], { name: 'platB' });
    const platformB = await makePrincipal(b.tenantId, ['tenant.manage'], { name: 'platC' });
    await addDomain(platformA, a.tenantId, { host: `${slugA}.example.edu`, canonical: true });
    await addDomain(platformB, b.tenantId, { host: `${slugB}.example.edu`, canonical: true });

    const signedInAtA = await login(a.tenantId, `admin@${slugA}.test`, 'Khartoum2026Uni');
    expect(signedInAtA.ok).toBe(true);
    if (!signedInAtA.ok) return;

    const principal = (await resolvePrincipal(signedInAtA.token))!;
    const hostB = (await resolveTenantByHost(`${slugB}.example.edu`))!;

    // The token verifies and the user is live. It is still not a session for
    // this address — otherwise a cookie the browser is happy to send would
    // carry one university's operator onto another's console.
    expect(principal.tenantId).toBe(a.tenantId);
    expect(sessionServes(principal, hostB)).toBe(false);

    const hostA = (await resolveTenantByHost(`${slugA}.example.edu`))!;
    expect(sessionServes(principal, hostA)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Every shipped role reaches something
// ---------------------------------------------------------------------------

describe('the shipped roles are usable', () => {
  let uni: University;

  it('gives every default role at least one screen', async () => {
    uni = await makeUniversity();
    expect(uni.tenantId).toBeTruthy();

    for (const [name, role] of Object.entries(DEFAULT_ROLES)) {
      const nav = navigationFor(new Set(role.permissions));
      expect(nav.length, `${name} can reach nothing`).toBeGreaterThan(0);
    }
  });

  it('names every navigation label in both catalogues', async () => {
    // A missing label renders as the raw key path in the menu of the screen
    // every member of staff opens first.
    const en = (await import('../messages/en.json')).default;
    const ar = (await import('../messages/ar.json')).default;

    for (const cat of [en, ar]) {
      const console_ = cat.console as {
        sections: Record<string, string>;
        items: Record<string, string>;
      };
      for (const section of CONSOLE_SECTIONS) {
        expect(console_.sections[section.key], `sections.${section.key}`).toBeTruthy();
        for (const item of section.items) {
          expect(console_.items[item.key], `items.${item.key}`).toBeTruthy();
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// D3: the screens that now exist
// ---------------------------------------------------------------------------

describe('the registry screens are declared and reachable', () => {
  it('gives a detail route the same permissions as the list it came from', () => {
    // A detail page is the same screen with one row selected. Giving it a
    // looser rule than its list is how a "read" permission turns into a way
    // to enumerate by guessing identifiers.
    for (const section of CONSOLE_SECTIONS) {
      for (const item of section.items) {
        if (!item.detail) continue;
        expect(item.detail.startsWith(`${item.path}/`)).toBe(true);
        expect(ruleFor(item.detail)).not.toBeNull();
        expect(new Set(ruleFor(item.detail)!.anyOf)).toEqual(new Set(item.anyOf));
      }
    }
  });

  it('has a page on disk for every screen it says is built', () => {
    const root = resolve(__dirname, '..', 'src', 'app', '[locale]', 'console');
    const exists = (p: string) => existsSync(join(root, ...p.split('/'), 'page.tsx'));

    const built = CONSOLE_SECTIONS.flatMap((s) => s.items).filter(isBuilt);
    expect(built.length).toBeGreaterThan(0);

    for (const item of built) {
      expect(exists(item.path), `${item.path} claims to be built`).toBe(true);
      if (item.detail) {
        expect(exists(item.detail), `${item.detail} claims to be built`).toBe(true);
      }
    }
  });

  it('does not link to a screen that has no page', () => {
    // The inverse of the test above, and the one that matters to a user: an
    // item is a link only when its page exists, so nothing on the console
    // leads to a 404.
    const root = resolve(__dirname, '..', 'src', 'app', '[locale]', 'console');
    const nav = navigationFor(new Set(PERMISSION_KEYS));
    for (const section of nav) {
      for (const item of section.items) {
        if (!item.built) continue;
        expect(existsSync(join(root, ...item.path.split('/'), 'page.tsx'))).toBe(true);
      }
    }
  });

  it('separates looking at a student from registering one', () => {
    // A dean reads the directory; a registrar works the desk. The legacy
    // build had one privilege column and never read it, so both were the
    // same person by default.
    const reader = new Set<PermissionKey>(['student.read', 'registration.read']);
    const registrar = new Set<PermissionKey>([
      'student.read',
      'registration.read',
      'registration.create',
    ]);

    const readerItems = navigationFor(reader).flatMap((s) => s.items.map((i) => i.key));
    const registrarItems = navigationFor(registrar).flatMap((s) => s.items.map((i) => i.key));

    expect(readerItems).toContain('students');
    expect(readerItems).not.toContain('registrationDesk');
    expect(registrarItems).toContain('registrationDesk');
  });

  it('keeps holds, standing and medical behind their own permissions', () => {
    const base = new Set<PermissionKey>(['student.read']);
    const items = navigationFor(base).flatMap((s) => s.items.map((i) => i.key));
    expect(items).not.toContain('holds');
    expect(items).not.toContain('lifecycle');
    expect(items).not.toContain('medical');
    expect(items).not.toContain('documents');

    expect(
      navigationFor(new Set<PermissionKey>(['hold.manage']))
        .flatMap((s) => s.items.map((i) => i.key)),
    ).toContain('holds');
    expect(
      navigationFor(new Set<PermissionKey>(['document.verify']))
        .flatMap((s) => s.items.map((i) => i.key)),
    ).toContain('documents');
  });

  it('lets the Registrar reach every registry screen D3 built', () => {
    const nav = navigationFor(new Set(DEFAULT_ROLES.Registrar.permissions));
    const registry = nav.find((s) => s.key === 'registry');
    expect(registry).toBeDefined();
    const built = registry!.items.filter((i) => i.built).map((i) => i.key);
    expect(built).toEqual(
      expect.arrayContaining([
        'students',
        'registrationDesk',
        'registrations',
        'holds',
        'lifecycle',
        'documents',
        'medical',
      ]),
    );
  });
});

// ---------------------------------------------------------------------------
// D2: the finance desks
// ---------------------------------------------------------------------------

describe('the finance screens are declared and separated', () => {
  it('gives the cashier the desk and the register, and nothing that checks work', () => {
    // The shipped Cashier holds `receipt.create` and `voucher.read`. The
    // segregation matrix forbids `receipt.cancel` alongside `receipt.create`,
    // so a cashier reaches the register to see what they took and cannot
    // cancel from it; and they see the voucher list without the queue that
    // approves one.
    const nav = navigationFor(new Set(DEFAULT_ROLES.Cashier.permissions));
    const finance = nav.find((s) => s.key === 'finance')!;
    const keys = finance.items.map((i) => i.key);

    expect(keys).toContain('cashierDesk');
    expect(keys).toContain('receipts');
    expect(keys).toContain('vouchers');
    expect(keys).not.toContain('approvals');
    expect(keys).not.toContain('cheques');
    expect(keys).not.toContain('tills');
  });

  it('keeps the till assignment on the permission `assignTill` actually demands', () => {
    // The menu and the module name the same permission rather than two that
    // happen to overlap today. A cashier assigning their own till would make
    // the per-cashier safe meaningless.
    expect(ruleFor('finance/tills')!.anyOf).toEqual(['coa.manage']);

    const cashier = new Set<PermissionKey>(['receipt.create', 'student.read']);
    expect(satisfies(cashier, ruleFor('finance/tills')!.anyOf)).toBe(false);

    const accountant = new Set(DEFAULT_ROLES['Senior Accountant'].permissions);
    expect(satisfies(accountant, ruleFor('finance/tills')!.anyOf)).toBe(true);
  });

  it('separates preparing a voucher from checking one, all the way to the menu', () => {
    // The legacy build could not: `Priv` was read at login and never
    // consulted, so anybody who opened frmApprovingVouchers could approve
    // their own work.
    const maker = navigationFor(new Set(DEFAULT_ROLES['Senior Accountant'].permissions))
      .flatMap((s) => s.items.map((i) => i.key));
    const reviewer = navigationFor(new Set(DEFAULT_ROLES['Financial Auditor'].permissions))
      .flatMap((s) => s.items.map((i) => i.key));
    const approver = navigationFor(new Set(DEFAULT_ROLES['Financial Controller'].permissions))
      .flatMap((s) => s.items.map((i) => i.key));

    expect(maker).toContain('vouchers');
    expect(maker).not.toContain('approvals');
    expect(reviewer).toContain('approvals');
    expect(approver).toContain('approvals');
    expect(approver).not.toContain('cashierDesk');
  });

  it('never lets one person hold both halves of a check', () => {
    // The menu separation above is only presentation. This is the control:
    // the matrix refuses the pair when the role is saved, not when it is used.
    expect(findSodViolations(['voucher.create', 'voucher.approve']).length).toBeGreaterThan(0);
    expect(findSodViolations(['receipt.create', 'receipt.cancel']).length).toBeGreaterThan(0);
    expect(findSodViolations(['receipt.create', 'cheque.manage']).length).toBeGreaterThan(0);
  });

  it('bars taking a cheque and handing it back only by way of `cheque.manage`', () => {
    // Written down because building the cheque screen turned up a comment in
    // `pipeline.ts` claiming the matrix barred `receipt.create` with
    // `cheque.cancel`. It does not — the declared pair is `cheque.manage`.
    //
    // No shipped role is affected: `Cashier Supervisor` is the only holder of
    // `cheque.cancel` and holds `cheque.manage` with it, so the declared pair
    // catches it. But a hand-written role carrying `receipt.create` and
    // `cheque.cancel` and nothing else would be accepted today. Recorded as a
    // finding against A2 rather than fixed here: adding a conflict is a rule,
    // and Track D does not write those.
    expect(findSodViolations(['receipt.create', 'cheque.cancel'])).toEqual([]);
    expect(
      findSodViolations(DEFAULT_ROLES['Cashier Supervisor'].permissions),
    ).toEqual([]);
    expect(DEFAULT_ROLES['Cashier Supervisor'].permissions).toContain('cheque.manage');
  });

  it('gives the cheque and voucher detail routes their list’s own permissions', () => {
    for (const path of ['finance/cheques/[id]', 'finance/vouchers/[id]']) {
      const detail = ruleFor(path);
      const list = ruleFor(path.replace('/[id]', ''));
      expect(detail, path).not.toBeNull();
      expect(new Set(detail!.anyOf)).toEqual(new Set(list!.anyOf));
    }
  });

  it('leaves supplier payments to the phase that builds procure-to-pay', () => {
    // `finance/payments` sits in the finance menu and was declared D2 for
    // that reason alone. §8 gives procure-to-pay *through payment* to D4, so
    // the row now says what actually builds it — and the screen renders as a
    // name with a phase against it rather than a link to nothing.
    const item = CONSOLE_SECTIONS.find((s) => s.key === 'finance')!.items.find(
      (i) => i.key === 'payments',
    )!;
    expect(item.phase).toBe('D4');
    expect(BUILT_PHASES.has(item.phase)).toBe(false);
  });

  it('lets every finance screen D2 built be reached by somebody the roles ship', () => {
    // A screen no shipped role can open is a screen nobody will find.
    const built = CONSOLE_SECTIONS.find((s) => s.key === 'finance')!.items.filter(isBuilt);
    expect(built.map((i) => i.key).sort()).toEqual([
      'approvals',
      'cashierDesk',
      'cheques',
      'receipts',
      'tills',
      'vouchers',
    ]);

    for (const item of built) {
      const reachable = Object.values(DEFAULT_ROLES).some((role) =>
        satisfies(new Set(role.permissions), item.anyOf),
      );
      expect(reachable, `${item.path} is unreachable by every shipped role`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// D4: a phase that lands in groups
// ---------------------------------------------------------------------------

describe('a screen may be built before its phase is', () => {
  it('never says built:true on a screen whose whole phase has landed', () => {
    // Two ways to say the same thing is the drift CONSOLE_ROUTES exists to
    // prevent. `built` is for a phase in flight and nothing else.
    for (const section of CONSOLE_SECTIONS) {
      for (const item of section.items) {
        if (BUILT_PHASES.has(item.phase)) {
          expect(item.built, `${item.path}`).toBeUndefined();
        }
      }
    }
  });

  it('resolves built from one predicate, whichever way it was said', () => {
    for (const section of CONSOLE_SECTIONS) {
      for (const item of section.items) {
        expect(isBuilt(item)).toBe(item.built === true || BUILT_PHASES.has(item.phase));
      }
    }
  });

  it('has a page on disk for the D4 screens that claim to exist', () => {
    const root = resolve(__dirname, '..', 'src', 'app', '[locale]', 'console');
    const early = CONSOLE_SECTIONS.flatMap((s) => s.items).filter((i) => i.built === true);
    expect(early.length).toBeGreaterThan(0);
    for (const item of early) {
      expect(existsSync(join(root, ...item.path.split('/'), 'page.tsx')), item.path).toBe(true);
      expect(BUILT_PHASES.has(item.phase), `${item.path} phase`).toBe(false);
    }
  });

  it('still has D4 work outstanding, or this flag has outlived its purpose', () => {
    const d4 = CONSOLE_SECTIONS.flatMap((s) => s.items).filter((i) => i.phase === 'D4');
    expect(d4.some((i) => !isBuilt(i))).toBe(true);
  });
});
