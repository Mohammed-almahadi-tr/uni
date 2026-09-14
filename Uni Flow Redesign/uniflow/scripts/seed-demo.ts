/**
 * A demonstration tenant for the local development server.
 *
 * Builds one university reachable at `localhost`, with the academic structure,
 * an approved fee schedule, two admitted students, a registered term with its
 * receipt, an instalment plan, a hold, and a live portal account — enough for
 * every screen in the console and the student portal to have something real on
 * it.
 *
 * It reuses the test suite's `makeUniversity`, deliberately: a demonstration
 * tenant assembled by a second, hand-written path would drift from the one the
 * tests assert against, and the first thing anybody notices on a demonstration
 * is the screen the fixtures never exercised.
 *
 * Run: npm run seed:demo
 *
 * **Re-running reuses what is already there.** It prints the credentials and
 * stops. Pass `--fresh` to provision a new university instead.
 *
 * The first cut minted a new tenant on every run, and that was wrong in two
 * ways at once: the database gained a dead university per run, and — worse —
 * anybody signed in was silently locked out, because a session is bound to
 * the tenant it was issued for and `localhost` had moved to a different one.
 * Being signed out by somebody else running a seed script is not a thing a
 * demonstration should be able to do to you.
 *
 * `--fresh` **retires** the previous tenant rather than deleting it: its
 * domain is detached and `is_active` goes false, so it stops being served and
 * its rows stay. It cannot be deleted, and the attempt is instructive — the
 * cascade is refused by `assert_audit_append_only()`, because the audit log
 * does not accept a DELETE from anybody. A demonstration's convenience is not
 * a reason to put a hole in that.
 */
import 'dotenv/config';
import { withSystem } from '../src/lib/db/client';
import { makePrincipal, makeUniversity } from '../tests/helpers';
import { approveFeeSchedule, draftFeeSchedule } from '../src/lib/academic/fee-matrix';
import { createStudent } from '../src/lib/students/registry';
import { registerStudent } from '../src/lib/registration/engine';
import { assignTill, takeReceipt } from '../src/lib/cashier/receipt';
import { createInstalmentPlan } from '../src/lib/billing/instalments';
import { placeHold } from '../src/lib/students/holds';
import { acceptInvitation, invitePortalAccount } from '../src/lib/portal/account';
import { setApplicationWindow } from '../src/lib/academic/structure';
import { setSeatQuota } from '../src/lib/admissions/quota';
import { setBranding } from '../src/lib/cms/branding';
import { setProgrammePublication } from '../src/lib/cms/content';
import { hashPassword } from '../src/lib/auth/password';

const HOST = process.env.DEMO_HOST ?? 'localhost';
const STAFF_EMAIL = 'admin@demo.test';
const STAFF_PASSWORD = 'Khartoum2026Demo';
const PORTAL_STUDENT_EMAIL = 'student@demo.test';
const PORTAL_GUARDIAN_EMAIL = 'parent@demo.test';
const PORTAL_PASSWORD = 'Khartoum2026Portal';

const D = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

const NAME_EN = 'Blue Nile University';
const NAME_AR = 'جامعة النيل الأزرق';

/**
 * Remove the previous demonstration tenant, if this script made it.
 *
 * Both conditions have to hold: it serves the development host, and it is the
 * university this file creates. A cascade delete is not something to run on a
 * guess.
 */
async function retirePrevious(): Promise<void> {
  const retired = await withSystem(async (tx) => {
    const previous = await tx.tenant.findMany({
      where: { nameEn: NAME_EN, isActive: true, domains: { some: { host: HOST } } },
      select: { id: true, slug: true },
    });
    for (const t of previous) {
      await tx.tenantDomain.deleteMany({ where: { tenantId: t.id } });
      await tx.tenant.update({ where: { id: t.id }, data: { isActive: false } });
    }
    return previous;
  });
  for (const t of retired) console.log(`  retired previous demonstration tenant ${t.slug}`);
}

/** The demonstration tenant currently serving the development host, if any. */
async function existing() {
  return withSystem((tx) =>
    tx.tenant.findFirst({
      where: { nameEn: NAME_EN, isActive: true, domains: { some: { host: HOST } } },
      select: { id: true, slug: true },
    }),
  );
}

async function main() {
  const fresh = process.argv.includes('--fresh');
  const already = await existing();

  if (already && !fresh) {
    const student = await withSystem((tx) =>
      tx.student.findFirst({
        where: { tenantId: already.id },
        orderBy: { studentNo: 'asc' },
        select: { id: true, studentNo: true },
      }),
    );
    console.log('\n─────────────────────────────────────────────');
    console.log(`  A demonstration tenant is already serving ${HOST}.`);
    console.log(`  tenant        ${already.id}`);
    console.log(`  host          http://${HOST}:3000`);
    console.log(`  console       ${STAFF_EMAIL} / ${STAFF_PASSWORD}`);
    console.log(`  portal        ${PORTAL_STUDENT_EMAIL} / ${PORTAL_PASSWORD}`);
    console.log(`  portal        ${PORTAL_GUARDIAN_EMAIL} / ${PORTAL_PASSWORD}`);
    if (student) console.log(`  student       ${student.studentNo} ${student.id}`);
    console.log('');
    console.log('  Run with --fresh to retire it and build a new one.');
    console.log('  (That signs out anybody holding a session for this one.)');
    console.log('─────────────────────────────────────────────\n');
    return;
  }

  await retirePrevious();

  const u = await makeUniversity({ year: 2026, openPeriods: [1, 2, 3, 4, 5, 6] });

  // ---- The host, so the tenant resolver finds it -------------------------
  await withSystem(async (tx) => {
    await tx.tenantDomain.deleteMany({ where: { host: HOST } });
    await tx.tenantDomain.create({
      data: { tenantId: u.tenantId, host: HOST, isVerified: true, isCanonical: true },
    });
    await tx.tenant.update({
      where: { id: u.tenantId },
      data: { nameAr: NAME_AR, nameEn: NAME_EN },
    });
    await tx.campus.create({
      data: {
        tenantId: u.tenantId,
        code: 'MAIN',
        nameAr: 'الحرم الرئيسي',
        nameEn: 'Main Campus',
        addressAr: 'شارع الجامعة، الخرطوم',
        addressEn: 'University Road, Khartoum',
        phone: '+249 100 000 000',
        email: 'info@demo.test',
        isPrimary: true,
      },
    });
  });

  // Branding through the C1 module rather than a raw insert: the palette is
  // validated there, and a demonstration tenant that skipped the validation
  // would be the one tenant in the system whose colours were never checked.
  const brander = await makePrincipal(u.tenantId, ['cms.manage', 'cms.publish'], {
    name: 'demo-cms',
  });
  await setBranding(brander, {
    shortCode: 'BNU',
    mottoAr: 'العلم نور',
    mottoEn: 'Knowledge is light',
    primary: { h: 205, s: 74, l: 30 },
    secondary: { h: 222, s: 47, l: 11 },
    accent: { h: 38, s: 92, l: 42 },
  });

  // ---- A member of staff who can reach every console screen --------------
  const passwordHash = await hashPassword(STAFF_PASSWORD);
  await withSystem(async (tx) => {
    const roles = await tx.role.findMany({
      where: { tenantId: u.tenantId },
      select: { id: true, name: true },
    });
    await tx.user.update({
      where: { id: u.adminUserId },
      data: { email: STAFF_EMAIL, passwordHash, fullName: 'Demo Administrator' },
    });
    for (const role of roles) {
      await tx.userRole.upsert({
        where: { userId_roleId: { userId: u.adminUserId, roleId: role.id } },
        create: { userId: u.adminUserId, roleId: role.id },
        update: {},
      });
    }
    console.log(`  roles attached: ${roles.map((r) => r.name).join(', ')}`);
  });

  // ---- Fees -------------------------------------------------------------
  const feeSetter = await makePrincipal(u.tenantId, ['feematrix.manage', 'feematrix.read'], {
    name: 'demo-fees',
  });
  const feeApprover = await makePrincipal(u.tenantId, ['feematrix.approve'], {
    name: 'demo-feeapp',
  });
  const draft = await draftFeeSchedule(feeSetter, {
    programmeId: u.programmeIds.MBBS,
    batchId: u.batchId,
    admissionCategoryId: u.admissionCategories.GENERAL,
    currency: 'SDG',
    effectiveFrom: D(2026, 1, 1),
    lines: [
      { feeItemId: u.feeItems.TUITION, amount: '1200000.00', sortOrder: 1 },
      {
        feeItemId: u.feeItems.REGISTRATION,
        amount: '50000.00',
        recurrence: 'ONE_OFF',
        sortOrder: 2,
      },
      { feeItemId: u.feeItems.LAB, amount: '30000.00', isMandatory: false, sortOrder: 3 },
    ],
  });
  await approveFeeSchedule(feeApprover, draft.id);

  // ---- Students ---------------------------------------------------------
  const registry = await makePrincipal(
    u.tenantId,
    ['student.manage', 'student.read', 'charge.create', 'hold.manage', 'registration.read'],
    { name: 'demo-registry' },
  );
  const registrar = await makePrincipal(
    u.tenantId,
    ['registration.create', 'registration.read'],
    { name: 'demo-registrar' },
  );

  const admit = (no: string, ar: string, en: string) =>
    createStudent(registry, {
      studentNo: no,
      fullNameAr: ar,
      fullNameEn: en,
      status: 'ADMITTED',
      programmeId: u.programmeIds.MBBS,
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      nationalityId: u.nationalities.SD,
    });

  const amira = await admit('BNU-2026-0001', 'أميرة عثمان الطيب', 'Amira Osman Eltayeb');
  const yousif = await admit('BNU-2026-0002', 'يوسف عثمان الطيب', 'Yousif Osman Eltayeb');

  const registration = await registerStudent(registrar, {
    studentId: amira.id,
    academicTermId: u.termIds[1],
    levelYear: 1,
    registrationDate: D(2026, 1, 15),
  });
  await registerStudent(registrar, {
    studentId: yousif.id,
    academicTermId: u.termIds[1],
    levelYear: 1,
    registrationDate: D(2026, 1, 15),
  });

  // ---- A payment against the registration fee ---------------------------
  const cashier = await makePrincipal(u.tenantId, ['receipt.create', 'student.read'], {
    name: 'demo-cashier',
  });
  const tillAdmin = await makePrincipal(u.tenantId, ['coa.manage'], { name: 'demo-till' });
  await assignTill(tillAdmin, cashier.userId, u.accounts['11111']);

  const charges = await withSystem((tx) =>
    tx.studentCharge.findMany({
      where: { tenantId: u.tenantId, studentId: amira.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, netAmount: true },
    }),
  );
  await takeReceipt(
    cashier,
    {
      studentId: amira.id,
      docDate: D(2026, 1, 20),
      channel: 'CASH',
      amount: '50000.00',
      allocations: [{ chargeId: charges[charges.length - 1].id, amount: '50000.00' }],
    },
    `demo-receipt-${Date.now()}`,
  );

  await createInstalmentPlan(registry, {
    studentId: amira.id,
    termLabel: 'First Term 2026',
    totalAmount: '1200000.00',
    dueDates: [D(2026, 2, 1), D(2026, 4, 1), D(2026, 6, 1)],
  });

  await placeHold(registry, {
    studentId: amira.id,
    holdType: 'DOCUMENTARY',
    reason: 'Certified secondary certificate not yet on file',
    effectiveFrom: D(2026, 1, 1),
  });

  // ---- The public face of the catalogue ---------------------------------
  //
  // One call per programme, through `setProgrammePublication`, and not an
  // `updateMany` on the column: that function's own docstring says there is no
  // bulk publish-all, because a programme reaches the catalogue when somebody
  // decides it should. A seed that reached past it would be demonstrating a
  // route the product does not have.
  for (const programmeId of [u.programmeIds.MBBS, u.programmeIds.NURS]) {
    await setProgrammePublication(brander, {
      programmeId,
      isPubliclyListed: true,
      overviewAr:
        'برنامج جامعي يمنح درجة البكالوريوس، ويشمل التدريب السريري في المستشفيات التعليمية.',
      overviewEn:
        'An undergraduate degree programme, including clinical training in the teaching hospitals.',
    });
  }

  // ---- Seats, then the application window --------------------------------
  //
  // In that order, and not the other way round: C2 offers a programme only
  // where seats are declared for the intake, because an offer is issued
  // against a quota. A window opened over programmes with no seats is a
  // portal that accepts applications it can never turn into offers.
  const capacity = await makePrincipal(u.tenantId, ['admission.capacity'], {
    name: 'demo-capacity',
  });
  for (const programmeId of [u.programmeIds.MBBS, u.programmeIds.NURS]) {
    await setSeatQuota(capacity, {
      programmeId,
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      seats: 60,
      reservedSeats: 5,
    });
  }

  const academic = await makePrincipal(u.tenantId, ['academic.manage', 'academic.read'], {
    name: 'demo-academic',
  });
  await setApplicationWindow(academic, u.batchId, {
    from: D(2026, 1, 1),
    to: D(2026, 12, 31),
  });

  // ---- Portal accounts --------------------------------------------------
  const own = await invitePortalAccount(registry, {
    studentId: amira.id,
    role: 'STUDENT',
    email: PORTAL_STUDENT_EMAIL,
    fullName: 'Amira Osman Eltayeb',
  });
  await acceptInvitation(u.tenantId, own.code, PORTAL_PASSWORD);

  const parent1 = await invitePortalAccount(registry, {
    studentId: amira.id,
    role: 'GUARDIAN',
    email: PORTAL_GUARDIAN_EMAIL,
    fullName: 'Osman Eltayeb',
    relationship: 'Father',
  });
  await acceptInvitation(u.tenantId, parent1.code, PORTAL_PASSWORD);

  const parent2 = await invitePortalAccount(registry, {
    studentId: yousif.id,
    role: 'GUARDIAN',
    email: PORTAL_GUARDIAN_EMAIL,
    fullName: 'Osman Eltayeb',
    relationship: 'Father',
  });
  await acceptInvitation(u.tenantId, parent2.code, PORTAL_PASSWORD);

  // One invitation left unaccepted, so the console panel has a pending row.
  const pending = await invitePortalAccount(registry, {
    studentId: yousif.id,
    role: 'STUDENT',
    email: 'yousif@demo.test',
    fullName: 'Yousif Osman Eltayeb',
  });

  console.log('\n─────────────────────────────────────────────');
  console.log(`  tenant        ${u.tenantId}`);
  console.log(`  host          http://${HOST}:3000`);
  console.log(`  console       ${STAFF_EMAIL} / ${STAFF_PASSWORD}`);
  console.log(`  portal        ${PORTAL_STUDENT_EMAIL} / ${PORTAL_PASSWORD}   (one student)`);
  console.log(`  portal        ${PORTAL_GUARDIAN_EMAIL} / ${PORTAL_PASSWORD}   (two children)`);
  console.log(`  unused code   ${pending.code}   (/portal/activate)`);
  console.log(`  student       ${amira.studentNo} ${amira.id}`);
  console.log(`  registration  ${registration.registrationNo} ${registration.registrationId}`);
  console.log('─────────────────────────────────────────────\n');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
