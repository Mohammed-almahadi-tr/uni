'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { uploadMinistryRoster, type MinistryUploadState } from './actions';

const initial: MinistryUploadState = { error: null, issues: [], imported: null };

export function MinistryImportForm() {
  const [state, action, pending] = useActionState(uploadMinistryRoster, initial);
  const t = useTranslations('registry.ministryImport');
  return (
    <form action={action} className="space-y-4" encType="multipart/form-data">
      {state.error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">{state.error}</p>}
      {state.imported !== null && <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">{t('imported', { count: state.imported })}</p>}
      <label className="block">
        <span className="mb-1 block text-sm font-medium">{t('file')}</span>
        <input name="roster" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required className="block w-full text-sm" />
      </label>
      <p className="text-xs text-muted-foreground">{t('hint')}</p>
      {state.issues.length > 0 && <ul className="list-disc space-y-1 ps-5 text-sm text-destructive">{state.issues.map((issue, index) => <li key={`${issue.rowNumber}-${issue.field}-${index}`}>{t('rowIssue', { row: issue.rowNumber, field: issue.field, message: issue.message })}</li>)}</ul>}
      <button type="submit" disabled={pending} className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">{pending ? t('working') : t('submit')}</button>
    </form>
  );
}
