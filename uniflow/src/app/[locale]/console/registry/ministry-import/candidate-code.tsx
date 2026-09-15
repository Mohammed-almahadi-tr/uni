'use client';

import { useActionState } from 'react';
import { issueProfileCode, type CandidateCodeState } from './candidate-actions';

const initial: CandidateCodeState = { error: null, code: null, expiresAt: null };

export function CandidateCode({ candidateId }: { candidateId: string }) {
  const [state, action, pending] = useActionState(issueProfileCode, initial);
  if (state.code) return <div className="space-y-1 text-xs"><span className="block text-muted-foreground">Give this code to the candidate (expires {state.expiresAt}):</span><code className="block select-all break-all rounded bg-muted p-2 text-foreground">{state.code}</code></div>;
  return <form action={action} className="space-y-1"><input type="hidden" name="candidateId" value={candidateId} />{state.error && <p className="text-xs text-destructive">{state.error}</p>}<button disabled={pending} className="text-xs underline disabled:opacity-50">{pending ? 'Issuing…' : 'Issue profile code'}</button></form>;
}
