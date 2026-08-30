'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { record, type MedicalState } from './actions';

const initial: MedicalState = { error: null, recorded: false };

const BLOOD_GROUPS = ['A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG'];
const SCREENING = ['NOT_TESTED', 'NEGATIVE', 'POSITIVE'] as const;
const VERDICTS = ['FIT', 'CONDITIONAL', 'UNFIT'] as const;

const LABEL: Record<string, string> = {
  A_POS: 'A+',
  A_NEG: 'A−',
  B_POS: 'B+',
  B_NEG: 'B−',
  AB_POS: 'AB+',
  AB_NEG: 'AB−',
  O_POS: 'O+',
  O_NEG: 'O−',
};

/**
 * Recording an examination (Track D3, SRS REQ-ST-02).
 *
 * Two things the legacy form did not do. The screening selects start at
 * *not tested* and are always submitted, so a blank is never silently stored
 * as a negative result. And the verdict is a required field with its own note
 * — the legacy system recorded results and no verdict at all, leaving whether
 * a student was fit to enrol as something somebody said out loud.
 */
export function RecordExamination({ studentId }: { studentId: string }) {
  const [state, action, pending] = useActionState(record, initial);
  const [verdict, setVerdict] = useState<string>('FIT');
  const t = useTranslations('registry');
  const c = useTranslations('registry.common');

  if (state.recorded) {
    return (
      <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
        {t('medical.recorded')}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="studentId" value={studentId} />

      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('medical.examDate')}</span>
          <input
            name="examDate"
            type="date"
            required
            className="numeric h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('medical.officer')}</span>
          <input
            name="medicalOfficer"
            required
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('medical.bloodGroup')}</span>
          <select
            name="bloodGroup"
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">{c('none')}</option>
            {BLOOD_GROUPS.map((b) => (
              <option key={b} value={b}>
                {LABEL[b]}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('medical.hepatitisB')}</span>
          <select
            name="hepatitisB"
            defaultValue="NOT_TESTED"
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {SCREENING.map((s) => (
              <option key={s} value={s}>
                {t(`medical.${s}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('medical.hiv')}</span>
          <select
            name="hiv"
            defaultValue="NOT_TESTED"
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {SCREENING.map((s) => (
              <option key={s} value={s}>
                {t(`medical.${s}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('medical.validUntil')}</span>
          <input
            name="validUntil"
            type="date"
            className="numeric h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('medical.allergies')}</span>
          <input
            name="allergies"
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('medical.chronic')}</span>
          <input
            name="chronicConditions"
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('medical.verdict')}</span>
          <select
            name="verdict"
            required
            value={verdict}
            onChange={(e) => setVerdict(e.target.value)}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {VERDICTS.map((v) => (
              <option key={v} value={v}>
                {t(`medical.${v}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">{t('medical.verdictNote')}</span>
        <input
          name="verdictNote"
          required={verdict !== 'FIT'}
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
        <span className="mt-1 block text-xs text-muted-foreground">
          {t('medical.verdictNoteHint')}
        </span>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">{t('medical.notes')}</span>
        <textarea
          name="officerNotes"
          rows={2}
          className="w-full rounded-md border border-input bg-background p-3 text-sm"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : t('medical.record')}
      </button>
    </form>
  );
}
