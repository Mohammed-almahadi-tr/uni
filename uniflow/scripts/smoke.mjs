import 'dotenv/config';
import pg from 'pg';
import { SignJWT } from 'jose';

const BASE = 'http://localhost:3000';
const secret = new TextEncoder().encode(process.env.SESSION_SECRET);

async function mint(claims, audience) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .setIssuer('uniflow')
    .setAudience(audience)
    .sign(secret);
}

const c = new pg.Client({ connectionString: process.env.DIRECT_URL });
await c.connect();

const tenant = (
  await c.query(
    `SELECT t.id FROM tenants t JOIN tenant_domains d ON d.tenant_id = t.id WHERE d.host='localhost'`,
  )
).rows[0].id;

const staff = (
  await c.query(
    `SELECT id, session_version FROM users WHERE tenant_id=$1 AND email='admin@demo.test'`,
    [tenant],
  )
).rows[0];

const student = (
  await c.query(
    `SELECT id, session_version FROM portal_accounts WHERE tenant_id=$1 AND email='student@demo.test'`,
    [tenant],
  )
).rows[0];

const parent = (
  await c.query(
    `SELECT id, session_version FROM portal_accounts WHERE tenant_id=$1 AND email='parent@demo.test'`,
    [tenant],
  )
).rows[0];

const reg = (
  await c.query(
    `SELECT id, verify_token FROM semester_registrations WHERE tenant_id=$1 ORDER BY registration_no LIMIT 1`,
    [tenant],
  )
).rows[0];

const stu = (
  await c.query(
    `SELECT id FROM students WHERE tenant_id=$1 ORDER BY student_no LIMIT 1`,
    [tenant],
  )
).rows[0];

const kids = (
  await c.query(
    `SELECT student_id FROM portal_access WHERE account_id=$1 AND revoked_at IS NULL ORDER BY granted_at`,
    [parent.id],
  )
).rows.map((r) => r.student_id);

await c.end();

const staffCookie = `uniflow_session=${await mint(
  { tenantId: tenant, userId: staff.id, mfaVerified: true, version: staff.session_version },
  'uniflow-app',
)}`;
const studentCookie = `uniflow_portal=${await mint(
  { tenantId: tenant, accountId: student.id, version: student.session_version },
  'uniflow-portal',
)}`;
const parentCookie = `uniflow_portal=${await mint(
  { tenantId: tenant, accountId: parent.id, version: parent.session_version },
  'uniflow-portal',
)}`;
// A portal token presented at the console, and the reverse.
const crossPortal = `uniflow_session=${await mint(
  { tenantId: tenant, accountId: student.id, version: student.session_version },
  'uniflow-portal',
)}`;

const results = [];

async function get(label, path, { cookie, expect: want = 200, contains, absent } = {}) {
  const res = await fetch(BASE + path, {
    headers: cookie ? { cookie } : {},
    redirect: 'manual',
  });
  // Only a 2xx has a body worth inspecting. A 307's body is Next's own stub
  // page, and reading it was this harness's first false positive.
  const body = res.status >= 200 && res.status < 300 ? await res.text() : '';
  const problems = [];
  if (Array.isArray(want) ? !want.includes(res.status) : res.status !== want) {
    problems.push(`status ${res.status}, wanted ${want}`);
  }
  for (const needle of contains ?? []) {
    if (!body.includes(needle)) problems.push(`missing "${needle}"`);
  }
  for (const needle of absent ?? []) {
    if (body.includes(needle)) problems.push(`LEAKED "${needle}"`);
  }
  // A Next error page still returns 200 in dev; catch the digest marker.
  if (body.includes('__next_error__') || /Application error: a server-side/.test(body)) {
    problems.push('rendered an error page');
  }
  results.push({
    label,
    path,
    status: res.status,
    location: res.headers.get('location') ?? '',
    ok: problems.length === 0,
    problems,
  });
  return body;
}

// ---- Public, no session ---------------------------------------------------
await get('landing (ar)', '/ar', { contains: ['جامعة النيل الأزرق'] });
await get('landing (en)', '/en', { contains: ['Blue Nile University'] });
await get('landing (unprefixed)', '/', { expect: [307, 308] });
await get('programmes', '/en/programmes', { contains: ['Bachelor of Medicine'] });
await get('news', '/en/news');
await get('calendar', '/en/calendar');
await get('contact', '/en/contact', { contains: ['Main Campus'] });
await get('apply', '/en/apply', { contains: ['Batch 2026'] });
await get('apply status', '/en/apply/status');
await get('staff login', '/en/login', { contains: ['Blue Nile University'] });
await get('verify card', `/en/verify/registration/${reg.verify_token}`, {
  contains: ['Amira Osman Eltayeb', 'BNU-2026-0001'],
  // The verification page must never disclose money.
  absent: ['1,200,000', '1200000'],
});
await get('verify card (bad token)', '/en/verify/registration/' + 'f'.repeat(32));

// ---- C3 public doors ------------------------------------------------------
await get('portal login', '/en/portal/login', {
  contains: ['Blue Nile University', 'Set up your account'],
});
await get('portal activate', '/en/portal/activate', { contains: ['Invitation code'] });

// ---- C3 guarded, signed out ----------------------------------------------
for (const p of [
  '/en/portal',
  '/en/portal/account',
  '/en/portal/statement',
  '/en/portal/instalments',
  '/en/portal/registrations',
  '/en/portal/documents',
  '/en/portal/settings',
]) {
  await get(`signed out → ${p}`, p, { expect: [307, 308] });
}

// ---- C3 as the student ----------------------------------------------------
await get('portal overview', '/en/portal', {
  cookie: studentCookie,
  contains: ['Amira Osman Eltayeb', 'BNU-2026-0001', 'You cannot register', 'secondary certificate'],
});
await get('portal account', '/en/portal/account', {
  cookie: studentCookie,
  contains: ['Tuition', 'Received', 'Payment online is not available yet'],
});
await get('portal statement', '/en/portal/statement', {
  cookie: studentCookie,
  contains: ['Opening balance', 'Closing balance'],
});
await get('portal instalments', '/en/portal/instalments', {
  cookie: studentCookie,
  contains: ['Where you stand today', 'Overdue'],
});
await get('portal registrations', '/en/portal/registrations', {
  cookie: studentCookie,
  contains: ['REG-AY-2026-00001', 'Card'],
});
await get('portal card', `/en/portal/registrations/${reg.id}/card`, {
  cookie: studentCookie,
  contains: ['Registration card', '<svg', 'BNU-2026-0001'],
});
await get('portal documents', '/en/portal/documents', {
  cookie: studentCookie,
  contains: ['Bring the originals', 'National'],
});
await get('portal settings', '/en/portal/settings', {
  cookie: studentCookie,
  contains: ['student@demo.test', 'Change password', 'Sign out'],
});
await get('portal overview (ar)', '/ar/portal', {
  cookie: studentCookie,
  contains: ['أميرة عثمان الطيب'],
});

// ---- C3 confinement over HTTP --------------------------------------------
await get('student asks for the sibling', `/en/portal?student=${kids[1] ?? stu.id}`, {
  cookie: studentCookie,
  expect: 404,
});
await get('student asks for a card that is not theirs', '/en/portal/registrations/00000000-0000-0000-0000-000000000000/card', {
  cookie: studentCookie,
  expect: 404,
});

// ---- C3 as the guardian of two ------------------------------------------
await get('guardian overview', '/en/portal', {
  cookie: parentCookie,
  contains: ['Viewing', 'Amira Osman Eltayeb', 'Yousif Osman Eltayeb'],
});
// The sibling's name still appears — in the chooser at the top, which is the
// point of it. What must have changed is the heading and the student number.
const switched = await get('guardian switches child', `/en/portal/account?student=${kids[1]}`, {
  cookie: parentCookie,
  contains: ['Yousif Osman Eltayeb', 'BNU-2026-0002'],
});
{
  const h1 = /<h1[^>]*>([^<]*)<\/h1>/.exec(switched)?.[1] ?? '';
  const last = results[results.length - 1];
  if (!h1.includes('Yousif')) {
    last.ok = false;
    last.problems.push(`heading is "${h1}", wanted Yousif`);
  }
}

// ---- Cross-door tokens ---------------------------------------------------
await get('portal token at the console', '/en/console', {
  cookie: crossPortal,
  expect: [307, 308],
});
await get('console token at the portal', '/en/portal', {
  cookie: staffCookie,
  expect: [307, 308],
});

// ---- The console, as staff ----------------------------------------------
const consolePaths = [
  '/en/console',
  '/en/console/registry',
  '/en/console/registry/students',
  `/en/console/registry/students/${stu.id}`,
  `/en/console/registry/registrations/${reg.id}`,
  `/en/console/registry/registrations/${reg.id}/print`,
  '/en/console/registry/register',
  '/en/console/registry/holds',
  '/en/console/registry/documents',
  '/en/console/finance/cashier',
  '/en/console/finance/receipts',
  '/en/console/academic/structure',
  '/en/console/academic/fees',
  '/en/console/reports/trial-balance',
  '/en/console/reports/student-account',
  '/en/console/settings/users',
];
for (const p of consolePaths) {
  await get(`console ${p.replace('/en/console', '') || '/'}`, p, { cookie: staffCookie });
}
await get('console student record shows portal access', `/en/console/registry/students/${stu.id}`, {
  cookie: staffCookie,
  contains: ['Portal access', 'student@demo.test', 'parent@demo.test', 'Issue invitation'],
});

// ---- Report export route --------------------------------------------------
await get('report export (csv)', '/en/console/reports/export?kind=trial-balance&format=csv', {
  cookie: staffCookie,
});
await get('report export, signed out', '/en/console/reports/export?kind=trial-balance&format=csv', {
  expect: 401,
});

// ---- Report ---------------------------------------------------------------
const bad = results.filter((r) => !r.ok);
const pad = (s, n) => String(s).padEnd(n);
console.log('\n' + pad('', 3) + pad('STATUS', 8) + pad('PATH', 62) + 'LABEL');
for (const r of results) {
  console.log(
    (r.ok ? ' ok' : 'FAIL') +
      ' ' +
      pad(r.status + (r.location ? '→' : ''), 7) +
      pad(r.path.slice(0, 60), 62) +
      r.label +
      (r.ok ? '' : '   [' + r.problems.join('; ') + ']'),
  );
}
console.log(`\n${results.length - bad.length}/${results.length} passed`);
process.exit(bad.length === 0 ? 0 : 1);
