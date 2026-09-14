/**
 * Presses the buttons.
 *
 * Every form in this application is a server action rendered with full
 * progressive-enhancement fields — the `$ACTION_*` hidden inputs are in the
 * HTML — so a submission without JavaScript is a plain multipart POST back to
 * the same URL. That is exactly what this does: read the page, take the form's
 * own hidden fields, fill in the visible ones, and post it. The server runs
 * the same action a click would.
 */
import 'dotenv/config';
import pg from 'pg';
import { SignJWT } from 'jose';
import { forms, submitForm } from './lib/forms.mjs';

const BASE = 'http://localhost:3000';
const secret = new TextEncoder().encode(process.env.SESSION_SECRET);

const mint = async (claims, aud) => {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .setIssuer('uniflow')
    .setAudience(aud)
    .sign(secret);
};

const c = new pg.Client({ connectionString: process.env.DIRECT_URL });
await c.connect();
const q = async (sql, params) => (await c.query(sql, params)).rows;

const tenant = (
  await q(
    `SELECT t.id FROM tenants t JOIN tenant_domains d ON d.tenant_id=t.id WHERE d.host='localhost'`,
  )
)[0].id;
const staff = (
  await q(`SELECT id, session_version FROM users WHERE tenant_id=$1 AND email='admin@demo.test'`, [
    tenant,
  ])
)[0];
const parent = (
  await q(
    `SELECT id, session_version FROM portal_accounts WHERE tenant_id=$1 AND email='parent@demo.test'`,
    [tenant],
  )
)[0];
const student = (
  await q(`SELECT id, student_no FROM students WHERE tenant_id=$1 ORDER BY student_no LIMIT 1`, [
    tenant,
  ])
)[0];
const pendingCode = process.argv[2];

const staffCookie = `uniflow_session=${await mint(
  { tenantId: tenant, userId: staff.id, mfaVerified: true, version: staff.session_version },
  'uniflow-app',
)}`;
const parentCookie = `uniflow_portal=${await mint(
  { tenantId: tenant, accountId: parent.id, version: parent.session_version },
  'uniflow-portal',
)}`;

const results = [];
const check = (label, problems) =>
  results.push({ label, ok: problems.length === 0, problems });

/** Submit one form against this base URL. */
const submit = (path, form, typed, cookie) => submitForm(BASE, path, form, typed, cookie);

async function page(path, cookie) {
  const res = await fetch(BASE + path, { headers: cookie ? { cookie } : {} });
  return await res.text();
}

// ===========================================================================
// 1. The portal sign-in button
// ===========================================================================
{
  const html = await page('/en/portal/login');
  const [form] = forms(html);

  const wrong = await submit(
    '/en/portal/login',
    form,
    { email: 'student@demo.test', password: 'DefinitelyWrong1' },
    undefined,
  );
  check('sign in · wrong password is refused', [
    ...(wrong.text.includes('do not match') ? [] : ['no "do not match" message']),
    ...(wrong.setCookie.includes('uniflow_portal=ey') ? ['a session was issued anyway'] : []),
  ]);

  const unknown = await submit(
    '/en/portal/login',
    form,
    { email: 'nobody@demo.test', password: 'DefinitelyWrong1' },
    undefined,
  );
  check('sign in · an unknown address gets the identical answer', [
    ...(unknown.text.includes('do not match') ? [] : ['different message for an unknown address']),
  ]);

  const good = await submit(
    '/en/portal/login',
    form,
    { email: 'student@demo.test', password: 'Khartoum2026Portal' },
    undefined,
  );
  check('sign in · the right password issues a session', [
    ...(good.setCookie.includes('uniflow_portal=') ? [] : ['no portal cookie was set']),
    ...(good.setCookie.toLowerCase().includes('httponly') ? [] : ['cookie is not HttpOnly']),
  ]);
}

// ===========================================================================
// 2. The two-step activation
// ===========================================================================
if (pendingCode) {
  const html = await page('/en/portal/activate');
  const [form] = forms(html);

  const bad = await submit('/en/portal/activate', form, { code: 'f'.repeat(32) }, undefined);
  // Looked for inside the <form>, not anywhere on the page: next-intl ships
  // the whole message catalogue to the client, so "Choose a password" is in
  // the payload of every render of this route whether or not it is on screen.
  // Asserting against the page text was this harness's second false positive.
  const badForm = forms(bad.text)[0]?.inner ?? '';
  check('activate · an unknown code is refused', [
    ...(bad.text.includes('not valid') ? [] : ['no refusal message']),
    ...(/name="password"/.test(badForm) ? ['it advanced to the password step'] : []),
    ...(/<input[^>]*name="code"[^>]*>/.test(badForm) ? [] : ['the code field is gone']),
  ]);

  const step1 = await submit('/en/portal/activate', form, { code: pendingCode }, undefined);
  check('activate · a good code shows what it is for, before anything is set', [
    ...(step1.text.includes('Yousif Osman Eltayeb') ? [] : ['the student was not named']),
    ...(step1.text.includes('Choose a password') ? [] : ['it did not reach the password step']),
  ]);

  const [form2] = forms(step1.text);
  const weak = await submit(
    '/en/portal/activate',
    form2,
    { password: 'short', confirm: 'short' },
    undefined,
  );
  check('activate · a weak password is refused, with the reasons', [
    ...(weak.text.includes('does not meet the policy') ? [] : ['no policy message']),
    ...(weak.text.includes('at least 12 characters') ? [] : ['the reasons were not listed']),
  ]);

  const [form3] = forms(weak.text);
  const mismatch = await submit(
    '/en/portal/activate',
    form3,
    { password: 'GoodPassword123', confirm: 'GoodPassword124' },
    undefined,
  );
  check('activate · two different passwords are refused', [
    ...(mismatch.text.includes('not the same') ? [] : ['no mismatch message']),
  ]);

  const [form4] = forms(mismatch.text);
  const done = await submit(
    '/en/portal/activate',
    form4,
    { password: 'GoodPassword123', confirm: 'GoodPassword123' },
    undefined,
  );
  check('activate · a good password creates the account and signs it in', [
    ...(done.setCookie.includes('uniflow_portal=') ? [] : ['no portal cookie was set']),
  ]);

  const rows = await q(
    `SELECT a.email, x.student_id FROM portal_accounts a
       JOIN portal_access x ON x.account_id=a.id AND x.revoked_at IS NULL
      WHERE a.tenant_id=$1 AND a.email='yousif@demo.test'`,
    [tenant],
  );
  check('activate · the account and its access both exist afterwards', [
    ...(rows.length === 1 ? [] : [`${rows.length} live grants, wanted 1`]),
  ]);

  const reuse = await submit('/en/portal/activate', form, { code: pendingCode }, undefined);
  check('activate · the code cannot be used a second time', [
    ...(reuse.text.includes('not valid') ? [] : ['a used code was accepted again']),
  ]);
} else {
  check('activate · (no code passed on the command line)', ['skipped']);
}

// ===========================================================================
// 3. Changing a password from the portal
// ===========================================================================
{
  const html = await page('/en/portal/settings', parentCookie);
  const [form] = forms(html);

  const wrong = await submit(
    '/en/portal/settings',
    form,
    { current: 'NotThePassword1', password: 'BrandNewPassword1', confirm: 'BrandNewPassword1' },
    parentCookie,
  );
  check('password · the current one is required', [
    ...(wrong.text.includes('could not be completed') || wrong.text.includes('not right')
      ? []
      : ['no refusal message']),
  ]);

  const mismatch = await submit(
    '/en/portal/settings',
    form,
    { current: 'Khartoum2026Portal', password: 'BrandNewPassword1', confirm: 'Different2' },
    parentCookie,
  );
  check('password · the confirmation must match', [
    ...(mismatch.text.includes('not the same') ? [] : ['no mismatch message']),
  ]);

  const ok = await submit(
    '/en/portal/settings',
    form,
    {
      current: 'Khartoum2026Portal',
      password: 'BrandNewPassword1',
      confirm: 'BrandNewPassword1',
    },
    parentCookie,
  );
  check('password · changing it signs the other devices out and keeps this one', [
    ...(ok.text.includes('has been changed') ? [] : ['no confirmation message']),
    ...(ok.setCookie.includes('uniflow_portal=') ? [] : ['no replacement cookie']),
  ]);

  // The old session token is now dead: the version moved.
  const stale = await fetch(BASE + '/en/portal/settings', {
    headers: { cookie: parentCookie },
    redirect: 'manual',
  });
  check('password · the session that was live before it is now refused', [
    ...(stale.status === 307 || stale.status === 308
      ? []
      : [`stale token still served ${stale.status}`]),
  ]);

  // Put it back, so the demonstration credentials in the seed output still work.
  const fresh = `uniflow_portal=${
    /uniflow_portal=([^;]+)/.exec(ok.setCookie)?.[1] ?? ''
  }`;
  const html2 = await page('/en/portal/settings', fresh);
  const [form2] = forms(html2);
  const back = await submit(
    '/en/portal/settings',
    form2,
    {
      current: 'BrandNewPassword1',
      password: 'Khartoum2026Portal',
      confirm: 'Khartoum2026Portal',
    },
    fresh,
  );
  check('password · and back again, so the seeded credentials still work', [
    ...(back.text.includes('has been changed') ? [] : ['could not restore it']),
  ]);
}

// ===========================================================================
// 4. Granting and withdrawing portal access, from the console
// ===========================================================================
{
  const path = `/en/console/registry/students/${student.id}`;
  const html = await page(path, staffCookie);
  const inviteForm = forms(html).find((f) => f.inner.includes('Issue invitation'));
  if (!inviteForm) {
    check('console · the invitation form is on the student record', ['form not found']);
  } else {
    const guardianMissingRelationship = await submit(
      path,
      inviteForm,
      {
        fullName: 'An Aunt',
        email: 'aunt@demo.test',
        role: 'GUARDIAN',
        relationship: '',
      },
      staffCookie,
    );
    check('console · a guardian must say how they are related', [
      ...(guardianMissingRelationship.text.includes('how the guardian is related')
        ? []
        : ['the invitation was issued without a relationship']),
    ]);

    const issued = await submit(
      path,
      inviteForm,
      {
        fullName: 'An Aunt',
        email: 'aunt@demo.test',
        role: 'GUARDIAN',
        relationship: 'Aunt',
      },
      staffCookie,
    );
    const code = /class="numeric mt-2 select-all break-all[^"]*"[^>]*>([0-9a-f]{32})</.exec(
      issued.text,
    )?.[1];
    check('console · issuing an invitation shows the code once', [
      ...(code ? [] : ['no 32-character code on the page']),
      ...(issued.text.includes('shown once') ? [] : ['it does not say the code is shown once']),
    ]);

    const stored = await q(
      `SELECT token_hash FROM portal_invitations WHERE tenant_id=$1 AND email='aunt@demo.test'`,
      [tenant],
    );
    check('console · and stores it hashed, not as it was handed over', [
      ...(stored.length === 1 ? [] : [`${stored.length} invitations`]),
      ...(stored[0] && stored[0].token_hash !== code ? [] : ['the code was stored in clear']),
      ...(stored[0] && /^[0-9a-f]{64}$/.test(stored[0].token_hash) ? [] : ['not a sha-256 digest']),
    ]);

    const again = await submit(
      path,
      inviteForm,
      {
        fullName: 'The Student',
        email: 'student@demo.test',
        role: 'STUDENT',
        relationship: '',
      },
      staffCookie,
    );
    check('console · an address that can already see the student is refused', [
      ...(again.text.includes('already see this student')
        ? []
        : ['a duplicate invitation was issued']),
    ]);

    // Withdraw the student's own access, then confirm the row survives as a
    // withdrawn one and the session it had is dead.
    const listing = await page(path, staffCookie);
    const withdrawForm = forms(listing).find((f) => f.inner.includes('Withdraw'));
    check('console · a withdraw button is on each live grant', [
      ...(withdrawForm ? [] : ['no withdraw form found']),
    ]);
    if (withdrawForm) {
      const before = await q(
        `SELECT count(*)::int n FROM portal_access WHERE tenant_id=$1 AND revoked_at IS NULL`,
        [tenant],
      );
      const after = await submit(path, withdrawForm, {}, staffCookie);
      const now = await q(
        `SELECT count(*)::int live,
                (SELECT count(*)::int FROM portal_access WHERE tenant_id=$1) total
           FROM portal_access WHERE tenant_id=$1 AND revoked_at IS NULL`,
        [tenant],
      );
      check('console · withdrawing revokes the row rather than deleting it', [
        ...(now[0].live === before[0].n - 1 ? [] : ['the live count did not drop by one']),
        ...(now[0].total >= before[0].n ? [] : ['a row was deleted']),
        ...(after.text.includes('Withdrawn') ? [] : ['the withdrawn row is not shown as such']),
      ]);
    }
  }
}

await c.end();

const bad = results.filter((r) => !r.ok);
console.log('');
for (const r of results) {
  console.log((r.ok ? ' ok  ' : 'FAIL ') + r.label + (r.ok ? '' : '   [' + r.problems.join('; ') + ']'));
}
console.log(`\n${results.length - bad.length}/${results.length} passed`);
process.exit(bad.length === 0 ? 0 : 1);
