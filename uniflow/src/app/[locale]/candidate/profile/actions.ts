'use server';

import { completeCandidateProfile, previewCandidateProfile, CandidateProfileError } from '@/lib/admissions/candidate-profile';
import { currentTenant } from '@/lib/cms/request';

export interface CandidateProfileState { code: string; preview: { fullNameAr: string; nationalId: string; admissionYear: number } | null; error: string | null; complete: boolean; }
export const initialCandidateProfileState: CandidateProfileState = { code: '', preview: null, error: null, complete: false };

const value = (form: FormData, name: string) => typeof form.get(name) === 'string' ? String(form.get(name)).trim() : '';

export async function submitCandidateProfile(previous: CandidateProfileState, form: FormData): Promise<CandidateProfileState> {
  const tenant = await currentTenant();
  if (!tenant) return { ...initialCandidateProfileState, error: 'This university site is not configured.' };
  const code = value(form, 'code') || previous.code;
  if (value(form, 'stage') === 'code' || !previous.preview) {
    const preview = await previewCandidateProfile(tenant.tenantId, code);
    return preview ? { ...initialCandidateProfileState, code, preview } : { ...initialCandidateProfileState, error: 'This profile code is not valid.' };
  }
  try {
    await completeCandidateProfile(tenant.tenantId, code, { fullNameEn: value(form, 'fullNameEn'), guardianName: value(form, 'guardianName'), email: value(form, 'email'), phone: value(form, 'phone') });
    return { ...previous, error: null, complete: true };
  } catch (error) {
    return { ...previous, error: error instanceof CandidateProfileError ? error.message : 'Your profile could not be saved.' };
  }
}
