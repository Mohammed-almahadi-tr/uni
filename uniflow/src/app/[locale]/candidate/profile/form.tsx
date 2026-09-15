'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { initialCandidateProfileState, submitCandidateProfile } from './actions';

const field = 'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';

export function CandidateProfileForm() {
  const [state, action, pending] = useActionState(submitCandidateProfile, initialCandidateProfileState);
  const t = useTranslations('candidatePortal');
  if (state.complete) return <p className="rounded-md border border-success/40 bg-success/10 p-4 text-sm">{t('complete')}</p>;
  return <form action={action} className="space-y-4"><input type="hidden" name="stage" value={state.preview ? 'profile' : 'code'} />{state.error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">{state.error}</p>}{!state.preview ? <><label className="block"><span className="mb-1 block text-sm font-medium">{t('code')}</span><input name="code" required pattern="[0-9a-fA-F]{32}" className={`${field} numeric`} /></label><button className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-50" disabled={pending}>{pending ? t('checking') : t('continue')}</button></> : <><input type="hidden" name="code" value={state.code} /><div className="rounded-md bg-muted p-3 text-sm"><div className="font-medium">{state.preview.fullNameAr}</div><div className="numeric text-xs text-muted-foreground">{state.preview.nationalId}</div></div><label className="block"><span className="mb-1 block text-sm font-medium">{t('nameEn')}</span><input name="fullNameEn" required className={field} /></label><label className="block"><span className="mb-1 block text-sm font-medium">{t('guardian')}</span><input name="guardianName" required className={field} /></label><label className="block"><span className="mb-1 block text-sm font-medium">{t('email')}</span><input name="email" type="email" required className={field} /></label><label className="block"><span className="mb-1 block text-sm font-medium">{t('phone')}</span><input name="phone" type="tel" required className={field} /></label><button className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground disabled:opacity-50" disabled={pending}>{pending ? t('saving') : t('submit')}</button></>}</form>;
}
