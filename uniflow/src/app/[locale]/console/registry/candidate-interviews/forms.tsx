'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { decideInterview, finalizeAdmission, type InterviewActionState } from './actions';

const initial: InterviewActionState = { error: null, done: false };
const input = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';
const button = 'h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50';
const State = ({ state }: { state: InterviewActionState }) => state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : state.done ? <p className="text-sm text-success">✓</p> : null;

export function InterviewDecisionForm({ candidateId }: { candidateId: string }) {
  const [state, action, pending] = useActionState(decideInterview, initial);
  const t = useTranslations('registry.candidateInterviews');
  return <form action={action} className="space-y-4"><input type="hidden" name="candidateId" value={candidateId} /><State state={state} />
    <div className="grid gap-3 md:grid-cols-2"><label className="text-sm">{t('decision')}<select required name="decision" defaultValue="ACCEPT" className={input}><option value="ACCEPT">{t('ACCEPT')}</option><option value="CONDITIONAL_ACCEPT">{t('CONDITIONAL_ACCEPT')}</option><option value="REJECT">{t('REJECT')}</option></select></label><label className="text-sm">{t('score')}<input type="number" min="0" max="100" step="0.001" name="score" className={input} /></label><label className="text-sm">{t('discount')}<input required type="number" min="0" max="100" step="0.0001" name="discountPct" defaultValue="0" className={input} /></label><label className="text-sm">{t('instalments')}<input required type="number" min="1" max="24" step="1" name="instalmentCount" defaultValue="1" className={input} /></label></div>
    <label className="block text-sm">{t('conditions')}<textarea name="conditions" className="min-h-20 w-full rounded-md border border-input bg-background p-3 text-sm" /></label><label className="block text-sm">{t('notes')}<textarea name="notes" className="min-h-20 w-full rounded-md border border-input bg-background p-3 text-sm" /></label>
    <button disabled={pending} className={button}>{pending ? t('working') : t('record')}</button>
  </form>;
}

export function FinalizeAdmissionForm({ candidateId }: { candidateId: string }) {
  const [state, action, pending] = useActionState(finalizeAdmission, initial);
  const t = useTranslations('registry.candidateInterviews');
  return <form action={action} className="space-y-2"><input type="hidden" name="candidateId" value={candidateId} /><State state={state} /><button disabled={pending} className={button}>{pending ? t('working') : t('finalize')}</button></form>;
}
