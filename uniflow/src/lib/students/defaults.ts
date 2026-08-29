import 'server-only';
import { withSystem } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';

/**
 * The document types a Sudanese university actually collects, installed at
 * tenant onboarding (SRS REQ-ST-05).
 *
 * Shipped as data rather than as an enum so a registry office can add its own.
 * The list below is what the legacy screens implied they were collecting
 * without ever storing: `TxtNatioNo` (national number), `CombTypeofCer`
 * (certificate type) and `TxtSchool` were all captured as text with no
 * document behind them, and there is no file upload anywhere in the legacy
 * codebase — no `PictureBox`, no `OpenFileDialog`, no binary column. The
 * scans lived in a filing cabinet, which is why "verified" was never a state
 * anything recorded.
 */

export interface DocumentTypeSeed {
  code: string;
  nameAr: string;
  nameEn: string;
  /** Types that go stale. An upload of one must carry an expiry, by trigger. */
  requiresExpiry?: boolean;
}

export const STANDARD_DOCUMENT_TYPES: readonly DocumentTypeSeed[] = [
  { code: 'PHOTO', nameAr: 'صورة شخصية', nameEn: 'Passport Photograph' },
  { code: 'NATIONAL_ID', nameAr: 'الرقم الوطني', nameEn: 'National ID Card' },
  { code: 'BIRTH_CERT', nameAr: 'شهادة الميلاد', nameEn: 'Birth Certificate' },
  { code: 'SECONDARY_CERT', nameAr: 'الشهادة الثانوية', nameEn: 'Secondary School Certificate' },
  { code: 'MEDICAL_CERT', nameAr: 'الشهادة الطبية', nameEn: 'Medical Fitness Certificate' },
  { code: 'PASSPORT', nameAr: 'جواز السفر', nameEn: 'Passport', requiresExpiry: true },
  { code: 'RESIDENCE_PERMIT', nameAr: 'الإقامة', nameEn: 'Residence Permit', requiresExpiry: true },
  { code: 'TRANSFER_LETTER', nameAr: 'خطاب انتقال', nameEn: 'Transfer Letter' },
];

export interface DocumentDefaultsResult {
  created: number;
  skipped: number;
}

export async function installDocumentTypes(
  tenantId: string,
  actorId: string | null = null,
): Promise<DocumentDefaultsResult> {
  return withSystem(async (tx) => {
    let created = 0;
    let skipped = 0;

    for (const [i, d] of STANDARD_DOCUMENT_TYPES.entries()) {
      const existing = await tx.documentType.findUnique({
        where: { tenantId_code: { tenantId, code: d.code } },
        select: { id: true },
      });
      if (existing) {
        skipped += 1;
        continue;
      }
      await tx.documentType.create({
        data: {
          tenantId,
          code: d.code,
          nameAr: d.nameAr,
          nameEn: d.nameEn,
          requiresExpiry: d.requiresExpiry ?? false,
          sortOrder: i,
        },
      });
      created += 1;
    }

    if (actorId) {
      await audit(tx, tenantId, {
        actorId,
        action: 'INSERT',
        resourceType: 'document_types',
        resourceId: tenantId,
        after: { created, skipped },
      });
    }

    return { created, skipped };
  });
}
