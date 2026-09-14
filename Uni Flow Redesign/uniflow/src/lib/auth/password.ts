import 'server-only';
import { hash, verify } from '@node-rs/argon2';

/**
 * Password hashing (SRS REQ-NFR-05).
 *
 * The legacy system stored passwords in cleartext and compared them in
 * application code:
 *
 *     Dim cmd As New SqlCommand("Select Pass,Status From Users Where SNo=" & ...)
 *     Pass = CStr(Reader.Item(0))
 *     If Pass = CStr(Me.txtPassWord.Text) Then
 *
 * — see frmLogin.vb:200-213. Anyone with read access to `Users`, which
 * included every workstation because the `sa` credentials were compiled into
 * the executable, had every staff password.
 *
 * Argon2id, because it resists both GPU and side-channel attack. Parameters
 * follow OWASP's current guidance (19 MiB, t=2, p=1) — deliberately modest on
 * memory, since this runs on whatever hardware the university has rather than
 * on rented cloud instances.
 */

/**
 * `Algorithm` in @node-rs/argon2 is an ambient `const enum`, which has no
 * runtime value and cannot be referenced under `isolatedModules`. Argon2id is
 * 2 in that enum; naming the constant here keeps the intent visible.
 */
const ARGON2ID = 2;

const PARAMS = {
  algorithm: ARGON2ID,
  memoryCost: 19_456, // KiB — 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

/** Argon2 has a 4 GiB input limit, but the real reason to cap is that an
 *  unbounded password is a denial-of-service vector: hashing is expensive by
 *  design and the attacker chooses the length. */
const MAX_PASSWORD_BYTES = 1024;

export class WeakPasswordError extends Error {
  constructor(readonly problems: string[]) {
    super(`Password rejected: ${problems.join(' ')}`);
    this.name = 'WeakPasswordError';
  }
}

/**
 * Policy check.
 *
 * Length first, because length beats composition. The composition rules are
 * here because auditors in this sector ask for them, not because they add much
 * — say so plainly rather than pretending otherwise.
 */
export function checkPasswordStrength(password: string): string[] {
  const problems: string[] = [];
  if (password.length < 12) problems.push('Must be at least 12 characters.');
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    problems.push('Is too long.');
  }
  if (!/[a-z]/.test(password)) problems.push('Must contain a lowercase letter.');
  if (!/[A-Z]/.test(password)) problems.push('Must contain an uppercase letter.');
  if (!/[0-9]/.test(password)) problems.push('Must contain a digit.');
  if (/^\s|\s$/.test(password)) problems.push('Must not begin or end with a space.');
  return problems;
}

export async function hashPassword(password: string): Promise<string> {
  const problems = checkPasswordStrength(password);
  if (problems.length > 0) throw new WeakPasswordError(problems);
  return hash(password, PARAMS);
}

/**
 * Verify a password against a stored hash.
 *
 * Returns false rather than throwing on a malformed hash, so that a corrupted
 * row is a failed login rather than a 500 that reveals the row exists.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash || Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) return false;
  try {
    return await verify(storedHash, password, PARAMS);
  } catch {
    return false;
  }
}

/**
 * A hash of a password nobody holds.
 *
 * Login must take the same time whether or not the account exists. Without
 * this, an attacker distinguishes real accounts from fake ones purely by
 * response time, which turns a login form into an account enumerator.
 */
let dummyHashPromise: Promise<string> | null = null;
export function dummyHash(): Promise<string> {
  dummyHashPromise ??= hash('nonexistent-account-timing-equaliser', PARAMS);
  return dummyHashPromise;
}
