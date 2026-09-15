'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { decideInterview, finalizeAdmission, type InterviewActionState } from './actions';

const initial: InterviewActionState = { error: null, done: false };
const input = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';
const button = 'h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50';
const State = ({ state }: { state: InterviewActionState }) => state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : state.done ? <p className="text-sm text-success">✓</p> : null;

export function InterviewDecisionForm({ candidateId, programmes }: { candidateId: string; programmes: Array<{ id: string; label: string }> }) {
  const [state, action, pending] = useActionState(decideInterview, initial);
  const t = useTranslations('registry.candidateInterviews');
  return <form action={action} className="space-y-4"><input type="hidden" name="candidateId" value={candidateId} /><State state={state} />
    <label className="block text-sm">{t('programme')}<select required name="programmeId" defaultValue="" className={input}><option value="" disabled>{t('chooseProgramme')}</option>{programmes.map((programme) => <option key={programme.id} value={programme.id}>{programme.label}</option>)}</select></label>
    <label className="block text-sm">{t('decision')}<select required name="decision" defaultValue="ACCEPT" className={input}><option value="ACCEPT">{t('ACCEPT')}</option><option value="REJECT">{t('REJECT')}</option></select></label>
    <label className="block text-sm">{t('notes')}<textarea name="notes" className="min-h-20 w-full rounded-md border border-input bg-background p-3 text-sm" /></label>
    <button disabled={pending} className={button}>{pending ? t('working') : t('record')}</button>
  </form>;
}

export function FinalizeAdmissionForm({ candidateId }: { candidateId: string }) {
  const [state, action, pending] = useActionState(finalizeAdmission, initial);
  const t = useTranslations('registry.candidateInterviews');
  return <form action={action} className="space-y-2"><input type="hidden" name="candidateId" value={candidateId} /><State state={state} /><button disabled={pending} className={button}>{pending ? t('working') : t('finalize')}</button></form>;
}
