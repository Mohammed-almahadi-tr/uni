import 'server-only';
import { withTenant } from '@/lib/db/client';
import type { Principal } from '@/lib/auth/rbac';
import { bareLetterhead, type Letterhead } from './sheet';

/**
 * Loading the letterhead (Track D5).
 *
 * Deliberately **ungated**, on the same reasoning as `tenantCurrency`: the
 * name of the university a member of staff is signed in to is not a secret
 * they are being told, it is the header of the page they are already looking
 * at. Gating it would mean a document printing without its own letterhead for
 * a user who may read the document — which is a worse failure than the
 * disclosure it would prevent, because an unheaded receipt is not a receipt.
 *
 * The address comes from the **primary** campus, which the database already
 * guarantees is at most one per tenant by partial unique index. A tenant with
 * no primary campus gets a name and no address rather than an error: a
 * document still has to print.
 */
export async function letterheadFor(principal: Principal): Promise<Letterhead> {
  return withTenant(principal.tenantId, async (tx) => {
    const tenant = await tx.tenant.findUniqueOrThrow({
      where: { id: principal.tenantId },
      select: { nameAr: true, nameEn: true },
    });

    const branding = await tx.tenantBranding.findUnique({
      where: { tenantId: principal.tenantId },
      select: {
        shortCode: true,
        mottoAr: true,
        mottoEn: true,
        logoUrl: true,
      },
    });

    const campus = await tx.campus.findFirst({
      where: { tenantId: principal.tenantId, isPrimary: true, isActive: true },
      select: {
        addressAr: true,
        addressEn: true,
        city: true,
        phone: true,
        email: true,
      },
    });

    const base = bareLetterhead(tenant.nameAr, tenant.nameEn);
    if (!branding && !campus) return base;

    // Blank strings are dropped rather than printed. A letterhead line
    // containing nothing still occupies a line, and three of them push the
    // title block off the header.
    const compact = (...parts: Array<string | null | undefined>): string[] =>
      parts.map((p) => (p ?? '').trim()).filter((p) => p.length > 0);

    return {
      ...base,
      shortCode: branding?.shortCode ?? '',
      mottoAr: branding?.mottoAr ?? null,
      mottoEn: branding?.mottoEn ?? null,
      logoUrl: branding?.logoUrl ?? null,
      linesAr: compact(campus?.addressAr, campus?.city, campus?.phone, campus?.email),
      linesEn: compact(campus?.addressEn, campus?.city, campus?.phone, campus?.email),
    };
  });
}
