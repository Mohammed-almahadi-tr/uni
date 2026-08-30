import 'server-only';
import type { StatusConsequence, StudentStatus } from '@/generated/prisma/enums';

/**
 * The student status state machine (SRS REQ-LIF-01/02, Track B5).
 *
 * The legacy system has no status column anywhere. A student's standing is
 * **which table their row is in** — `StudentsProfilees` if accepted,
 * `StudentsProfilesIndecent` if not — chosen by the text of a combo box:
 *
 * ```vb
 * If Me.ComboBox1.Text = "يقبل" Then
 *     Delete From StudentsProfilees Where StudentIndex=N'<batch><id>'
 *     Insert Into StudentsProfilees (...)
 * Else
 *     Delete From StudentsProfilesIndecent Where StudentIndex=N'<id>'
 *     Insert Into StudentsProfilesIndecent (..., ReasonofIndecent, ...)
 * End If
 * Update StdForm Set CH=1 Where UnivID=<id>          ' both branches
 * ```
 * (frmStudentProfiles.vb:232-289)
 *
 * Each branch deletes only from the table it is about to write, so changing a
 * verdict leaves the student in **both**. The rejected branch's DELETE keys on
 * `txtStdIndex` while its INSERT writes `TxtYear + txtStdIndex`, so it never
 * matches its own insert. `CH=1` is set either way, so the admission form
 * cannot tell the two verdicts apart. There is no effective date, no approver
 * — `Employee` is the clerk who typed it — and no history: deferral,
 * suspension, dismissal and re-admission have nowhere at all to be recorded.
 *
 * This file is the specification of what may happen instead. Each transition
 * declares its **financial consequence** (REQ-LIF-02) rather than leaving a
 * reader to infer it from the ledger afterwards.
 *
 * ## One deliberate departure from the SRS diagram
 *
 * REQ-LIF-01 draws `Applicant --> Rejected`. There is no `REJECTED` student
 * status here and there should not be: a rejected applicant is an
 * **application** with a REJECT decision (B2), and never becomes a student
 * record at all. Making rejection a student state is precisely the legacy
 * mistake — `StudentsProfilesIndecent` is a table of people the institution
 * decided were not its students, keyed and reported as though they were.
 */

export interface Transition {
  from: StudentStatus;
  to: StudentStatus;
  /** What this does to the student's money. */
  consequence: StatusConsequence;
  /** Shown in the UI and recorded on the history row. */
  label: string;
  /**
   * Placing a hold is part of the transition itself for suspension: a
   * suspended student who can still register is not suspended.
   */
  placesHold?: 'DISCIPLINARY';
  /** Clearing them is part of lifting the suspension. */
  clearsHolds?: boolean;
  /** Requires a named approver on the history row. */
  requiresApproval: boolean;
}

/**
 * Every legal transition. Anything not here is refused, by name, with the list
 * of what *is* possible from where the student currently stands.
 */
export const TRANSITIONS: readonly Transition[] = [
  // ---- Entry ------------------------------------------------------------
  {
    from: 'APPLICANT',
    to: 'ADMITTED',
    consequence: 'NONE',
    label: 'Offer accepted',
    requiresApproval: false,
  },
  {
    from: 'ADMITTED',
    to: 'ACTIVE',
    consequence: 'NONE',
    label: 'First registration',
    requiresApproval: false,
  },
  {
    // Not in the SRS diagram, and necessary: an admitted student who never
    // turns up has to go somewhere. Leaving them ADMITTED for ever is how a
    // cohort's headcount stops matching its registrations.
    from: 'ADMITTED',
    to: 'WITHDRAWN',
    consequence: 'RETAIN_CHARGES',
    label: 'Admitted but never registered',
    requiresApproval: false,
  },

  // ---- Leaving, temporarily ---------------------------------------------
  {
    from: 'ACTIVE',
    to: 'DEFERRED',
    // A deferral is not a withdrawal: the term is unwound in full and what
    // was paid waits on the account for the student's return.
    consequence: 'REVERSE_TERM_BILLING',
    label: 'Approved deferral',
    requiresApproval: true,
  },
  {
    from: 'ACTIVE',
    to: 'SUSPENDED',
    consequence: 'RETAIN_CHARGES',
    label: 'Suspended — disciplinary or financial',
    placesHold: 'DISCIPLINARY',
    requiresApproval: true,
  },

  // ---- Leaving, for good -------------------------------------------------
  {
    from: 'ACTIVE',
    to: 'WITHDRAWN',
    consequence: 'APPLY_REFUND_POLICY',
    label: 'Student withdrawal',
    requiresApproval: true,
  },
  {
    from: 'ACTIVE',
    to: 'DISMISSED',
    consequence: 'RETAIN_CHARGES',
    label: 'Academic dismissal',
    requiresApproval: true,
  },
  {
    from: 'SUSPENDED',
    to: 'DISMISSED',
    consequence: 'RETAIN_CHARGES',
    label: 'Dismissed following suspension',
    requiresApproval: true,
  },
  {
    from: 'ACTIVE',
    to: 'TRANSFERRED_OUT',
    consequence: 'APPLY_REFUND_POLICY',
    label: 'Transfer to another institution',
    requiresApproval: true,
  },
  {
    from: 'ACTIVE',
    to: 'GRADUATED',
    consequence: 'RETAIN_CHARGES',
    label: 'Programme completed',
    requiresApproval: true,
  },

  // ---- Coming back -------------------------------------------------------
  {
    from: 'DEFERRED',
    to: 'ACTIVE',
    consequence: 'NONE',
    label: 'Re-admission',
    requiresApproval: true,
  },
  {
    from: 'SUSPENDED',
    to: 'ACTIVE',
    consequence: 'NONE',
    label: 'Suspension lifted',
    clearsHolds: true,
    requiresApproval: true,
  },
  {
    from: 'WITHDRAWN',
    to: 'ACTIVE',
    consequence: 'NONE',
    label: 'Re-admission approved',
    requiresApproval: true,
  },

  // ---- After -------------------------------------------------------------
  {
    from: 'GRADUATED',
    to: 'ALUMNUS',
    consequence: 'RETAIN_CHARGES',
    label: 'Graduation conferred',
    requiresApproval: false,
  },
];

/**
 * Statuses nothing leads out of.
 *
 * `DISMISSED` and `TRANSFERRED_OUT` are terminal by design: a reinstated
 * student is a re-admission decision, and re-admission after dismissal is a
 * different act from lifting a suspension. Until an institution tells us what
 * governs it, refusing is better than inventing a transition that quietly
 * erases a dismissal.
 */
export const TERMINAL: readonly StudentStatus[] = [
  'DISMISSED',
  'TRANSFERRED_OUT',
  'ALUMNUS',
];

export function transitionFor(
  from: StudentStatus,
  to: StudentStatus,
): Transition | null {
  return TRANSITIONS.find((t) => t.from === from && t.to === to) ?? null;
}

export function transitionsFrom(from: StudentStatus): readonly Transition[] {
  return TRANSITIONS.filter((t) => t.from === from);
}

/** Human-readable list of where a student can go from where they are. */
export function describeOptions(from: StudentStatus): string {
  const options = transitionsFrom(from);
  if (options.length === 0) {
    return `${humanise(from)} is a terminal status; nothing leads out of it.`;
  }
  return options.map((t) => `${humanise(t.to)} (${t.label})`).join(', ');
}

export function humanise(status: StudentStatus): string {
  return status.toLowerCase().replace(/_/g, ' ');
}
