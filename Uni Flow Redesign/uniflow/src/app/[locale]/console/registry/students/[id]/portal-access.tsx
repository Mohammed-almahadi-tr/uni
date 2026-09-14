'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import type { AccessRow, PendingInvitation } from '@/lib/portal/account';
import { Empty, Field, Pill, Select, Table, TableWrap, Td, Th } from '@/components/console/ui';
import { invite, withdraw } from './actions';
import { blankAccess } from './state';

/**
 * Who can see this student's account, and how somebody comes to (Track C3).
 *
 * ## The code is shown once
 *
 * It is stored as a SHA-256 digest, so it cannot be shown again — a second
 * look means issuing a second invitation. That is the correct amount of
 * friction for handing somebody a credential, and it is what makes the
 * registrar's copy of it worth nothing after they have handed it over.
 *
 * ## Revoked rows stay on the list
 *
 * Struck through, with the date. *Who could see this student's account in
 * March* is a question a registry office is asked after a custody dispute,
 * and a list showing only live access cannot answer it.
 */
export function PortalAccessPanel({
  studentId,
  access,
  pending,
}: {
  studentId: string;
  access: AccessRow[];
  pending: PendingInvitation[];
}) {
  const [inviteState, inviteAction, inviting] = useActionState(invite, blankAccess);
  const [withdrawState, withdrawAction, withdrawing] = useActionState(withdraw, blankAccess);
  const t = useTranslations('registry.portalAccess');
  const roles = useTranslations('portal.role');

  const iso = (d: Date) => new Date(d).toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      {inviteState.code && (
        <div className="rounded-md border-2 border-success bg-success/10 p-4">
          <p className="text-sm font-medium">{t('codeIssued')}</p>
          <p className="numeric mt-2 select-all break-all text-lg font-bold" dir="ltr">
            {inviteState.code}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {t('codeHint', { date: inviteState.expiresAt ?? '' })}
          </p>
        </div>
      )}

      {(inviteState.error || withdrawState.error) && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {inviteState.error ?? withdrawState.error}
        </p>
      )}

      {access.length === 0 && pending.length === 0 ? (
        <Empty>{t('none')}</Empty>
      ) : (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>{t('who')}</Th>
                <Th>{t('kind')}</Th>
                <Th>{t('state')}</Th>
                <Th>{t('lastSignIn')}</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {access.map((a) => (
                <tr key={a.accessId} className={a.revokedAt ? 'text-muted-foreground' : ''}>
                  <Td>
                    <span className={a.revokedAt ? 'line-through' : undefined}>
                      {a.fullName}
                    </span>
                    <span className="block text-xs text-muted-foreground" dir="ltr">
                      {a.email}
                    </span>
                  </Td>
                  <Td>
                    {roles(a.role)}
                    {a.relationship && (
                      <span className="block text-xs text-muted-foreground">
                        {a.relationship}
                      </span>
                    )}
                  </Td>
                  <Td>
                    {a.revokedAt ? (
                      <Pill tone="bad">{t('withdrawnOn', { date: iso(a.revokedAt) })}</Pill>
                    ) : (
                      <Pill tone="good">{t('active')}</Pill>
                    )}
                  </Td>
                  <Td>
                    <span className="numeric">
                      {a.lastLoginAt ? iso(a.lastLoginAt) : '—'}
                    </span>
                  </Td>
                  <Td>
                    {!a.revokedAt && (
                      <form action={withdrawAction}>
                        <input type="hidden" name="studentId" value={studentId} />
                        <input type="hidden" name="accessId" value={a.accessId} />
                        <button
                          type="submit"
                          disabled={withdrawing}
                          className="text-sm text-destructive underline disabled:opacity-50"
                        >
                          {t('withdraw')}
                        </button>
                      </form>
                    )}
                  </Td>
                </tr>
              ))}

              {pending.map((p) => (
                <tr key={p.invitationId}>
                  <Td>
                    {p.fullName}
                    <span className="block text-xs text-muted-foreground" dir="ltr">
                      {p.email}
                    </span>
                  </Td>
                  <Td>
                    {roles(p.role)}
                    {p.relationship && (
                      <span className="block text-xs text-muted-foreground">
                        {p.relationship}
                      </span>
                    )}
                  </Td>
                  <Td>
                    <Pill tone={p.expired ? 'bad' : 'warn'}>
                      {p.expired
                        ? t('expiredOn', { date: iso(p.expiresAt) })
                        : t('invitedUntil', { date: iso(p.expiresAt) })}
                    </Pill>
                  </Td>
                  <Td>—</Td>
                  <Td>
                    <form action={withdrawAction}>
                      <input type="hidden" name="studentId" value={studentId} />
                      <input type="hidden" name="invitationId" value={p.invitationId} />
                      <button
                        type="submit"
                        disabled={withdrawing}
                        className="text-sm text-destructive underline disabled:opacity-50"
                      >
                        {t('cancelInvitation')}
                      </button>
                    </form>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}

      <form action={inviteAction} className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
        <input type="hidden" name="studentId" value={studentId} />
        <Field name="fullName" label={t('name')} required />
        <Field name="email" label={t('email')} type="email" required dir="ltr" />
        <Select
          name="role"
          label={t('kind')}
          defaultValue="STUDENT"
          options={[
            { value: 'STUDENT', label: roles('STUDENT') },
            { value: 'GUARDIAN', label: roles('GUARDIAN') },
          ]}
        />
        {/* Required of a guardian by a CHECK constraint, and refused for a
            student by the same one. The form asks for it always rather than
            switching on the select, because a field that appears and vanishes
            under somebody's cursor is a field they mistrust. */}
        <Field name="relationship" label={t('relationship')} hint={t('relationshipHint')} />
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={inviting}
            className="h-11 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {inviting ? t('working') : t('inviteButton')}
          </button>
        </div>
      </form>
    </div>
  );
}
