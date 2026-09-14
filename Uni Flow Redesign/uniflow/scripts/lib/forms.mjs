/**
 * Reading a rendered form back out of the HTML, for the HTTP harnesses.
 *
 * Every form in this application is a server action rendered with its full
 * progressive-enhancement fields — the `$ACTION_*` hidden inputs are in the
 * markup — so a submission without JavaScript is a plain multipart POST back
 * to the same URL. Take the form's own hidden fields, fill in the visible
 * ones, post them, and the server runs the same action a click would.
 *
 * Shared by `smoke.mjs` and `press-buttons.mjs` rather than written twice.
 * The second copy of a parser is the one that is subtly wrong, and this one
 * has already been wrong twice in ways that produced confident, false
 * results: a regex mangled into matching a literal backspace, and assertions
 * made against page text when next-intl ships the entire message catalogue to
 * the client on every render. Neither mistake is available to a caller of
 * this module.
 */

const decode = (s) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'");

/** Every form on the page, in document order, with its hidden fields. */
export function forms(html) {
  const out = [];
  const re = /<form\b[^>]*>([\s\S]*?)<\/form>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const fields = {};
    for (const [tag] of m[1].matchAll(/<input\b[^>]*>/g)) {
      const name = /name="([^"]*)"/.exec(tag)?.[1];
      if (!name) continue;
      fields[decode(name)] = decode(/value="([^"]*)"/.exec(tag)?.[1] ?? '');
    }
    out.push({ inner: m[1], fields });
  }
  return out;
}

/**
 * The page's own heading.
 *
 * The only honest way to ask what a page rendered. Matching on body text says
 * yes to strings that are merely in the serialised message catalogue — which
 * is how a working console read as "forbidden" three times over.
 */
export function heading(html) {
  return /<h1[^>]*>([^<]*)</.exec(html)?.[1] ?? null;
}

/** Submit one form: its own hidden fields, plus what a person would type. */
export async function submitForm(base, path, form, typed, cookie) {
  const body = new FormData();
  for (const [k, v] of Object.entries(form.fields)) body.append(k, v);
  for (const [k, v] of Object.entries(typed)) body.set(k, v);

  const res = await fetch(base + path, {
    method: 'POST',
    headers: cookie ? { cookie } : {},
    body,
    redirect: 'manual',
  });
  const text = res.status >= 200 && res.status < 300 ? await res.text() : '';
  return { res, text, setCookie: res.headers.get('set-cookie') ?? '' };
}

/**
 * Sign in the way a person does, and return the cookie it issued.
 *
 * Not a minted token. The first cut of `smoke.mjs` minted the staff session
 * with `mfaVerified: true` — a session no sign-in produces, because a
 * password alone never satisfies the second factor — so it walked the console
 * under a session nobody holds and could not have told you whether staff
 * could reach the console at all.
 */
export async function signIn(base, path, email, password, cookieName) {
  const [form] = forms(await (await fetch(base + path)).text());
  if (!form) throw new Error(`no form on ${path}`);

  const { setCookie } = await submitForm(base, path, form, { email, password });
  const token = new RegExp(`${cookieName}=([^;]+)`).exec(setCookie)?.[1];
  if (!token) throw new Error(`${email} could not sign in at ${path}`);
  return `${cookieName}=${token}`;
}
