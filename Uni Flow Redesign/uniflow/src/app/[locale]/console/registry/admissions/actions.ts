'use server';

import { revalidatePath } from 'next/cache';
import type { AdmissionDecision } from '@/generated/prisma/enums';
import { currentContext } from '@/lib/console/session';
import { decideApplication, scoreApplication } from '@/lib/admissions/applications';
import { screenApplication } from '@/lib/admissions/eligibility';
import {
  acceptOffer,
  declineOffer,
  enrolAcceptedOffer,
  issueOffer,
  promoteFromWaitlist,
  withdrawOffer,
} from '@/lib/admissions/offers';

/**
 * The admissions committee (Track D4, SRS REQ-ADM-CAP-03/04).
 *
 * ## The order this screen insists on
 *
 * Screen → decide → offer → accept → enrol, and each step is a separate
 * action because each is a separate decision by a different kind of person.
 * The legacy build had none of them: an admission was a row appearing in the
 * students table, so there was no screening verdict to disagree with, no
 * rationale to look up, no offer to accept or decline, and no seat to run out
 * of. **Deciding and having capacity were the same act**, which is how it
 * over-admitted.
 *
 * `decideApplication` will not issue an offer, and nothing here lets it: an
 * ACCEPT moves the application to OFFERED only once a seat has actually been
 * allocated to it, in `offers.ts`.
 */

export interface CommitteeState {
  error: string | null;
  message: string | null;
  screened: { pass: number; fail: number } | null;
  issued: { applicationNo: string; seatsRemaining: number } | null;
  enrolled: { studentNo: string } | null;
}

function blank(): CommitteeState {
  return { error: null, message: null, screened: null, issued: null, enrolled: null };
}

const str = (f: FormData, k: string): string => {
  const v = f.get(k);
  return typeof v === 'string' ? v.trim() : '';
};

const date = (f: FormData, k: string): Date | null => {
  const v = str(f, k);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00.000Z`) : null;
};

function explain(e: unknown): string {
  if (e instanceof Error && e.name !== 'Error' && e.message) return e.message;
  console.error('[committee]', e);
  return 'That could not be completed.';
}

function refresh(): void {
  revalidatePath('/console/registry/admissions');
  revalidatePath('/console/academic/capacity');
}

/**
 * Screen one application against every programme it asked for.
 *
 * Re-runnable on purpose: a corrected certificate score is re-screened by
 * running it again, and the previous verdict is replaced rather than
 * accumulated. A screening history nobody can act on is noise.
 */
export async function rescreen(
  _prev: CommitteeState,
  form: FormData,
): Promise<CommitteeState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    const result = await screenApplication(ctx.principal, str(form, 'applicationId'));
    refresh();
    return {
      ...blank(),
      screened: {
        pass: result.choices.filter((c) => c.outcome === 'PASS').length,
        fail: result.choices.filter((c) => c.outcome === 'FAIL').length,
      },
    };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/** The committee's own mark, which outranks the certificate in the ordering. */
export async function score(_prev: CommitteeState, form: FormData): Promise<CommitteeState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    await scoreApplication(ctx.principal, str(form, 'applicationId'), str(form, 'score'));
    refresh();
    return { ...blank(), message: 'scored' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/** The verdict, with its mandatory rationale. Issues nothing. */
export async function decide(_prev: CommitteeState, form: FormData): Promise<CommitteeState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    await decideApplication(
      ctx.principal,
      str(form, 'applicationId'),
      str(form, 'decision') as AdmissionDecision,
      str(form, 'note'),
    );
    refresh();
    return { ...blank(), message: 'decided' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/**
 * Offer a place.
 *
 * The override is a separate field and a separate permission, and its reason
 * is stored on the offer. `issueOffer` refuses an override with no reason,
 * because recording that capacity was exceeded without recording why is
 * indistinguishable from never having checked.
 */
export async function offer(_prev: CommitteeState, form: FormData): Promise<CommitteeState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const acceptBy = date(form, 'acceptBy');
  if (!acceptBy) return { ...blank(), error: 'Give the last day the applicant may accept.' };

  const overrideReason = str(form, 'overrideReason');
  const deposit = str(form, 'depositRequired');

  try {
    const result = await issueOffer(ctx.principal, {
      applicationId: str(form, 'applicationId'),
      programmeId: str(form, 'programmeId'),
      acceptBy,
      conditions: str(form, 'conditions') || null,
      depositRequired: deposit || null,
      override: overrideReason ? { reason: overrideReason } : null,
    });
    refresh();
    return {
      ...blank(),
      issued: {
        applicationNo: result.applicationNo,
        seatsRemaining: result.seatsRemaining,
      },
    };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/**
 * The applicant's answer, or the institution's withdrawal.
 *
 * One action for three transitions because they are the same shape and the
 * module distinguishes them: accepting demands the deposit be recorded first,
 * and both closing paths demand a reason and keep the offer.
 */
export async function respond(_prev: CommitteeState, form: FormData): Promise<CommitteeState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const offerId = str(form, 'offerId');
  const how = str(form, 'how');

  try {
    if (how === 'accept') await acceptOffer(ctx.principal, offerId);
    else if (how === 'decline') await declineOffer(ctx.principal, offerId, str(form, 'reason'));
    else if (how === 'withdraw') {
      await withdrawOffer(ctx.principal, offerId, str(form, 'reason'));
    } else return { ...blank(), error: 'Unknown response.' };

    refresh();
    return { ...blank(), message: 'closed' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/**
 * Turn an accepted offer into a student.
 *
 * Atomic with stamping the application, in the module — a student with no
 * application pointing at them, or an application marked ENROLLED with no
 * student, are both states nobody can unpick later.
 */
export async function enrol(_prev: CommitteeState, form: FormData): Promise<CommitteeState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    const result = await enrolAcceptedOffer(ctx.principal, str(form, 'offerId'), {
      studentNo: str(form, 'studentNo'),
    });
    refresh();
    revalidatePath('/console/registry/students');
    return { ...blank(), enrolled: { studentNo: result.studentNo } };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/** Give a seat that came free to somebody on the waiting list. */
export async function promote(_prev: CommitteeState, form: FormData): Promise<CommitteeState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const acceptBy = date(form, 'acceptBy');
  if (!acceptBy) return { ...blank(), error: 'Give the last day the applicant may accept.' };

  try {
    const result = await promoteFromWaitlist(ctx.principal, {
      applicationId: str(form, 'applicationId'),
      programmeId: str(form, 'programmeId'),
      lapsedOfferId: str(form, 'lapsedOfferId'),
      acceptBy,
      conditions: str(form, 'conditions') || null,
      depositRequired: str(form, 'depositRequired') || null,
    });
    refresh();
    return {
      ...blank(),
      issued: {
        applicationNo: result.applicationNo,
        seatsRemaining: result.seatsRemaining,
      },
    };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}
