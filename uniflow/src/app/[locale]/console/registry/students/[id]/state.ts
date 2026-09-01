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
export interface PortalAccessState {
  ok: boolean;
  error: string | null;
  /** The invitation code, shown to the registrar **once**, to hand over. It
   *  is never stored in clear and cannot be shown again — a second look
   *  means issuing a second invitation, which is the correct amount of
   *  friction for handing somebody a credential. */
  code: string | null;
  expiresAt: string | null;
}

export const blankAccess: PortalAccessState = {
  ok: false,
  error: null,
  code: null,
  expiresAt: null,
};
