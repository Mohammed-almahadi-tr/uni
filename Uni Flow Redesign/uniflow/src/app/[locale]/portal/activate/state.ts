import type { InvitationPreview } from '@/lib/portal/account';

/**
 * The shape of this form's action state, and its initial value.
 *
 * In a plain module rather than beside the action, because a `'use server'`
 * file may export **async functions and nothing else**. Any other export
 * becomes a server reference and Next refuses the whole module — at the
 * moment an action is invoked, not at build time. So exporting the initial
 * state from `actions.ts` type-checks, lints and builds cleanly, and then
 * every form on the page returns 500 the first time somebody presses the
 * button.
 *
 * One definition, imported by both the action and the component it feeds.
 */
export interface ActivateState {
  step: 'code' | 'password';
  preview: InvitationPreview | null;
  /** The code is held across the two steps in the form's own state rather
   *  than in a cookie: it is a one-time secret, and putting it anywhere
   *  durable is the thing this flow is avoiding. */
  code: string;
  error: string | null;
  /** Password policy failures, in the words the policy uses. */
  problems: string[];
  ok: boolean;
}

export const blankActivate: ActivateState = {
  step: 'code',
  preview: null,
  code: '',
  error: null,
  problems: [],
  ok: false,
};
