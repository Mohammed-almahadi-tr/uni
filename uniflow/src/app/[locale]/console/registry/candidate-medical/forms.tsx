'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { addRequirement, deactivateRequirement, placeCandidate, queueInterview, recordAssessment, type CandidateMedicalActionState } from './actions';

const initial: CandidateMedicalActionState = { error: null, done: false };
const FieldState = ({ state }: { state: CandidateMedicalActionState }) => state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : state.done ? <p className="text-sm text-success">✓</p> : null;
const button = 'h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50';
const input = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

export function RequirementForm({ faculties }: { faculties: { id: string; label: string }[] }) {
  const [state, action, pending] = useActionState(addRequirement, initial);
  const t = useTranslations('registry.candidateMedical');
  return <form action={action} className="grid gap-3 md:grid-cols-2">
    <FieldState state={state} />
    <select required name="facultyId" className={input} defaultValue=""><option value="" disabled>{t('faculty')}</option>{faculties.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
    <input required name="code" className={input} placeholder={t('code')} />
    <input required name="nameEn" className={input} placeholder={t('nameEn')} />
    <input required name="nameAr" dir="rtl" className={input} placeholder={t('nameAr')} />
    <label className="flex items-center gap-2 text-sm"><input name="isRequired" type="checkbox" defaultChecked />{t('required')}</label>
    <button disabled={pending} className={button}>{pending ? t('working') : t('addRequirement')}</button>
  </form>;
}

export function DeactivateRequirementForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState(deactivateRequirement, initial);
  const t = useTranslations('registry.candidateMedical');
  return <form action={action} className="flex items-center gap-2"><input type="hidden" name="requirementId" value={id} /><FieldState state={state} /><button disabled={pending} className="text-xs text-destructive underline">{t('deactivate')}</button></form>;
}

export function PlacementForm({ candidateId, programmes, current }: { candidateId: string; programmes: { id: string; label: string }[]; current: string | null }) {
  const [state, action, pending] = useActionState(placeCandidate, initial);
  const t = useTranslations('registry.candidateMedical');
  return <form action={action} className="space-y-3"><input type="hidden" name="candidateId" value={candidateId} /><FieldState state={state} />
    <select required name="programmeId" className={input} defaultValue={current ?? ''}><option value="" disabled>{t('programme')}</option>{programmes.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select>
    <button disabled={pending} className={button}>{pending ? t('working') : t('assign')}</button>
  </form>;
}

export function AssessmentForm({ candidateId, requirements }: { candidateId: string; requirements: { id: string; label: string; required: boolean }[] }) {
  const [state, action, pending] = useActionState(recordAssessment, initial);
  const t = useTranslations('registry.candidateMedical');
  const blood = ['A_POS','A_NEG','B_POS','B_NEG','AB_POS','AB_NEG','O_POS','O_NEG'];
  return <form action={action} className="space-y-4"><input type="hidden" name="candidateId" value={candidateId} /><FieldState state={state} />
    <div className="grid gap-3 md:grid-cols-2"><label className="text-sm">{t('examDate')}<input required type="date" name="examDate" className={input} /></label><label className="text-sm">{t('officer')}<input required name="medicalOfficer" className={input} /></label>
    <label className="text-sm">{t('bloodGroup')}<select required name="bloodGroup" className={input} defaultValue=""><option value="" disabled>—</option>{blood.map((x) => <option key={x} value={x}>{x.replace('_POS', '+').replace('_NEG', '−')}</option>)}</select></label>
    <label className="text-sm">{t('verdict')}<select required name="verdict" className={input} defaultValue="FIT"><option value="FIT">{t('FIT')}</option><option value="CONDITIONAL">{t('CONDITIONAL')}</option><option value="UNFIT">{t('UNFIT')}</option></select></label></div>
    <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">{t('checks')}</legend>{requirements.map((item) => <label key={item.id} className="grid items-center gap-2 rounded-md border border-border p-3 text-sm md:grid-cols-[1fr_12rem]"><span>{item.label}{item.required ? ' *' : ''}</span><select required={item.required} name={`check:${item.id}`} className={input} defaultValue=""><option value="">{t('notRecorded')}</option><option value="PASS">{t('PASS')}</option><option value="FAIL">{t('FAIL')}</option></select></label>)}</fieldset>
    <label className="block text-sm">{t('verdictNote')}<textarea name="verdictNote" className="min-h-20 w-full rounded-md border border-input bg-background p-3 text-sm" /></label>
    <button disabled={pending || requirements.length === 0} className={button}>{pending ? t('working') : t('record')}</button>
  </form>;
}

export function QueueInterviewForm({ candidateId }: { candidateId: string }) {
  const [state, action, pending] = useActionState(queueInterview, initial);
  const t = useTranslations('registry.candidateMedical');
  return <form action={action} className="space-y-2"><input type="hidden" name="candidateId" value={candidateId} /><FieldState state={state} /><button disabled={pending} className={button}>{pending ? t('working') : t('queueInterview')}</button></form>;
}
