'use server';

import { blankApplyState, type ApplyState } from './state';
import { cookies } from 'next/headers';
import { currentTenant } from '@/lib/cms/request';
import { ApplicationError } from '@/lib/admissions/applications';
import {
  MAX_CHOICES,
  PortalClosedError,
  submitPublicApplication,
  type PublicApplicationInput,
} from '@/lib/admissions/portal';
import {
  DRAFT_COOKIE,
  draftCookieOptions,
  openDraft,
  sealDraft,
  type ApplyStep,
  type DraftFields,
} from '@/lib/admissions/draft';

/**
 * The public application wizard's server actions (SRS REQ-LP-04, Track C2).
 *
 * ## The tenant is the host
 *
 * Taken from `currentTenant()` and never from the form body, exactly as C1's
 * enquiry form does. A hidden field naming the university would let anyone
 * post into any university's admissions queue on the platform; the host is
 * the one piece of the request whose meaning the sender does not control.
 *
 * ## What an error message may say
 *
 * A validation message is written for the applicant and is safe to show. Any
 * other failure is not — it would describe the shape of the system to an
 * unauthenticated caller — so it returns a sentinel the client renders from
 * the message catalogue, and the generic failure stays bilingual like
 * everything else on the page.
 */

const str = (f: FormData, k: string): string => {
  const v = f.get(k);
  return typeof v === 'string' ? v.trim() : '';
};

/**
 * Save one step and move on.
 *
 * Each step merges into the draft rather than replacing it, so going back to
 * correct a name does not silently clear the programme choices made after it.
 */
export async function saveStep(_prev: ApplyState, form: FormData): Promise<ApplyState> {
  const tenant = await currentTenant();
  if (!tenant) return { ...blankApplyState, errorKey: 'noSite' };

  const jar = await cookies();
  const draft = await openDraft(tenant.tenantId, jar.get(DRAFT_COOKIE)?.value);
  const step = str(form, 'step') as ApplyStep;

  const merged: DraftFields = { ...draft, ...readStep(step, form) };
  jar.set(DRAFT_COOKIE, await sealDraft(tenant.tenantId, merged), draftCookieOptions());

  return blankApplyState;
}

function readStep(step: ApplyStep, form: FormData): DraftFields {
  switch (step) {
    case 'intake':
      return {
        batchId: str(form, 'batchId'),
        admissionCategoryId: str(form, 'admissionCategoryId'),
      };

    case 'identity':
      return {
        fullNameAr: str(form, 'fullNameAr'),
        fullNameEn: str(form, 'fullNameEn'),
        nationalId: str(form, 'nationalId') || null,
        passportNo: str(form, 'passportNo') || null,
        dateOfBirth: str(form, 'dateOfBirth') || null,
        nationalityId: str(form, 'nationalityId') || null,
        email: str(form, 'email') || null,
        phone: str(form, 'phone') || null,
      };

    case 'certificate':
      return {
        certificateTypeId: str(form, 'certificateTypeId') || null,
        certificateScore: str(form, 'certificateScore') || null,
        certificateYear: Number(str(form, 'certificateYear')) || null,
        // Comma or newline separated, as somebody copying from a certificate
        // will type it. Split here rather than asking for a strict format.
        subjects: str(form, 'subjects')
          .split(/[,\n]/)
          .map((v) => v.trim())
          .filter(Boolean)
          .slice(0, 20),
      };

    case 'choices': {
      // The ranked choices arrive as three named selects, so the rank is the
      // field's position and not something the applicant sorts. Blank entries
      // are dropped, which is how somebody names one choice instead of three.
      const chosen: string[] = [];
      for (let i = 0; i < MAX_CHOICES; i += 1) {
        const value = str(form, `choice_${i}`);
        if (value && !chosen.includes(value)) chosen.push(value);
      }
      return { choices: chosen };
    }

    default:
      return {};
  }
}

/**
 * Submit.
 *
 * The draft is validated in full by `submitPublicApplication` against the
 * database — the wizard's step-by-step checks are for the applicant's benefit
 * and are not a control, because a cookie the browser holds is a cookie the
 * browser can edit.
 *
 * The cookie is cleared only on success. A submission that failed still has
 * the applicant's work in it, and dropping it would make them start again for
 * a reason that was not their fault.
 */
export async function submitApplication(): Promise<ApplyState> {
  const tenant = await currentTenant();
  if (!tenant) return { ...blankApplyState, errorKey: 'noSite' };

  const jar = await cookies();
  const draft = await openDraft(tenant.tenantId, jar.get(DRAFT_COOKIE)?.value);

  if (!draft.batchId || !draft.admissionCategoryId || !draft.choices?.length) {
    return { ...blankApplyState, errorKey: 'incomplete' };
  }

  try {
    const receipt = await submitPublicApplication(
      tenant.tenantId,
      draft as PublicApplicationInput,
    );
    jar.delete(DRAFT_COOKIE);
    return { ...blankApplyState, receipt };
  } catch (e) {
    if (e instanceof PortalClosedError || e instanceof ApplicationError) {
      return { ...blankApplyState, error: e.message };
    }
    console.error('[apply]', e);
    return { ...blankApplyState, errorKey: 'failed' };
  }
}

/** Start again. Offered on the review step, because the alternative — waiting
 *  two hours for the cookie to expire — is not something a user can be asked
 *  to do. */
export async function discardDraft(): Promise<void> {
  const jar = await cookies();
  jar.delete(DRAFT_COOKIE);
}
