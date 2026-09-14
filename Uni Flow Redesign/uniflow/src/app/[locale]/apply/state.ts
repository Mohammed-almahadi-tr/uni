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
export interface ApplyState {
  error: string | null;
  /** A catalogue key the client renders, for failures with nothing safe to say. */
  errorKey: string | null;
  /** Set on the final step. What the applicant must keep. */
  receipt: { applicationNo: string; trackingToken: string } | null;
}

export const blankApplyState: ApplyState = { error: null, errorKey: null, receipt: null };
