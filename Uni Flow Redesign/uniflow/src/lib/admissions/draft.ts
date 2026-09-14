import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import type { PublicApplicationInput } from './portal';

/**
 * The public application's work-in-progress (Track C2).
 *
 * ## Why there is no draft row
 *
 * A multi-step form has to remember step one while the applicant is on step
 * three. The obvious way is a row in `applications` with `state = DRAFT` — and
 * it is the wrong way here, for a reason that only applies to a public
 * surface: **`insertApplication` allocates an application number**, and an
 * application number is scarce, sequential and quoted by the applicant. A
 * server-side draft created at step one lets a script mint them by the
 * thousand, leaving the real ones scattered through a range full of holes.
 *
 * So nothing is written until the applicant has completed the form. The
 * partial answers travel in a signed, HttpOnly cookie, and the row is created
 * and submitted in one transaction at the end.
 *
 * ## What the signature is and is not for
 *
 * It stops a cookie from another site, another tenant, or a text editor being
 * presented as a draft. It is **not** a validation control: everything in here
 * is re-validated by `submitPublicApplication` against the database, because a
 * cookie the browser holds is a cookie the browser can edit, and a signature
 * only proves this server issued *some* draft, not that the contents are still
 * true. The steps exist to make the form fillable on a telephone.
 *
 * `tenantId` is inside the signed payload so a draft begun on one university's
 * site cannot be carried to another's — the two are different hosts and would
 * otherwise share a cookie name.
 */

const ALG = 'HS256';

/** Named for what it is, and scoped to the apply path so it is not sent with
 *  every request to the public site. */
export const DRAFT_COOKIE = 'uniflow_application_draft';

/**
 * Two hours. Long enough to find a certificate in another room and come back;
 * short enough that a shared or public computer does not hand the next person
 * a stranger's national ID number.
 */
export const DRAFT_TTL_SECONDS = 2 * 60 * 60;

export type DraftFields = Partial<PublicApplicationInput>;

interface DraftClaims extends DraftFields {
  tenantId: string;
}

function secret(): Uint8Array {
  const raw = process.env.SESSION_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      'SESSION_SECRET must be set to at least 32 characters. ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"',
    );
  }
  return new TextEncoder().encode(raw);
}

export async function sealDraft(tenantId: string, fields: DraftFields): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ ...fields, tenantId } as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt(now)
    .setExpirationTime(now + DRAFT_TTL_SECONDS)
    .sign(secret());
}

/**
 * Read a draft back, or an empty one.
 *
 * A draft that fails to verify — expired, tampered with, or issued for another
 * tenant — is treated as absent rather than as an error. The applicant is at
 * the start of a form; the useful behaviour is an empty form, not a message
 * about a cookie.
 */
export async function openDraft(
  tenantId: string,
  token: string | undefined,
): Promise<DraftFields> {
  if (!token) return {};
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: [ALG] });
    const claims = payload as unknown as DraftClaims;
    if (claims.tenantId !== tenantId) return {};
    const { tenantId: _ignored, ...fields } = claims;
    void _ignored;
    return fields;
  } catch {
    return {};
  }
}

export function draftCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    // Scoped to the wizard. A cookie carrying somebody's national ID number
    // has no business being sent with every request for the news page.
    path: '/',
    maxAge: DRAFT_TTL_SECONDS,
  };
}

// ---------------------------------------------------------------------------
// The steps
// ---------------------------------------------------------------------------

/**
 * The wizard's steps, in order.
 *
 * Declared once and read by the progress indicator, the navigation and the
 * completeness check, so a step cannot exist in the bar and not in the flow.
 * Documents is **listed and disabled**: REQ-LP-04 asks for a national
 * ID/passport upload and the object-storage endpoint does not exist. Hiding
 * the step would hide the gap; showing it says what the applicant will be
 * asked for when they are called in.
 */
export const APPLY_STEPS = ['intake', 'identity', 'certificate', 'choices', 'review'] as const;

export type ApplyStep = (typeof APPLY_STEPS)[number];

export function isApplyStep(value: string | undefined): value is ApplyStep {
  return !!value && (APPLY_STEPS as readonly string[]).includes(value);
}

/** The step a draft is ready for: the first one it has not satisfied. Used to
 *  bounce somebody who jumps to `?step=review` with an empty form. */
export function furthestStep(draft: DraftFields): ApplyStep {
  if (!draft.batchId || !draft.admissionCategoryId) return 'intake';
  if (!draft.fullNameAr || !draft.fullNameEn) return 'identity';
  // The certificate is optional in full — a mature applicant may have none —
  // so reaching it is enough to have satisfied it.
  if (!draft.choices || draft.choices.length === 0) return 'choices';
  return 'review';
}

/** Whether a step may be opened given what the draft already holds. Steps are
 *  navigable backwards freely and forwards only as far as the answers reach. */
export function mayOpen(step: ApplyStep, draft: DraftFields): boolean {
  const furthest = furthestStep(draft);
  return APPLY_STEPS.indexOf(step) <= APPLY_STEPS.indexOf(furthest);
}
