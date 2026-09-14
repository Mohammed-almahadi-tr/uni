import 'server-only';
import type { NationalityCategory } from '@/generated/prisma/enums';
import { withSystem } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';

/**
 * Admission categories, nationalities and certificate types installed at
 * tenant onboarding (SRS REQ-AC-05, REQ-ADM-CAP-02).
 *
 * The fee matrix is keyed on an admission category, so a university with none
 * cannot price anything. These are shipped as data rather than as an enum
 * precisely so an institution can add its own — the four below are what the
 * legacy `Type` column actually contained across the Nile College and Ribat
 * databases, not an invention.
 *
 * Run after the chart of accounts and the fee catalogue. Idempotent: an
 * existing code is left exactly as the tenant has edited it.
 */

export interface AcademicDefaultsResult {
  admissionCategoriesCreated: number;
  admissionCategoriesSkipped: number;
  nationalitiesCreated: number;
  nationalitiesSkipped: number;
  certificateTypesCreated: number;
  certificateTypesSkipped: number;
}

interface CertificateSeed extends CategorySeed {
  /** The mark the certificate is reported out of. */
  maxScore: string;
}

/**
 * School-leaving certificates, with the scale each is reported on.
 *
 * The scale is the load-bearing field. An eligibility rule is written as a
 * percentage, so a score of 620 means nothing until it is known whether the
 * certificate runs to 700 or to 100. Screening normalises against this before
 * it compares anything — see `admissions/eligibility.ts`.
 */
export const STANDARD_CERTIFICATE_TYPES: readonly CertificateSeed[] = [
  { code: 'SD_SECONDARY', nameAr: 'الشهادة السودانية', nameEn: 'Sudanese Secondary Certificate', maxScore: '100' },
  { code: 'ARAB_SECONDARY', nameAr: 'شهادة ثانوية عربية', nameEn: 'Arab Secondary Certificate', maxScore: '100' },
  { code: 'IGCSE', nameAr: 'شهادة IGCSE', nameEn: 'IGCSE / GCE', maxScore: '100' },
  { code: 'IB', nameAr: 'البكالوريا الدولية', nameEn: 'International Baccalaureate', maxScore: '45' },
  { code: 'AMERICAN_DIPLOMA', nameAr: 'الدبلوم الأمريكي', nameEn: 'American High School Diploma', maxScore: '4' },
  { code: 'OTHER', nameAr: 'شهادة أخرى', nameEn: 'Other Certificate', maxScore: '100' },
];

interface CategorySeed {
  code: string;
  nameAr: string;
  nameEn: string;
}

/** The legacy `TuitionFees.Type` values, normalised. */
export const STANDARD_ADMISSION_CATEGORIES: readonly CategorySeed[] = [
  { code: 'GENERAL', nameAr: 'عام', nameEn: 'General' },
  { code: 'PRIVATE', nameAr: 'خاص', nameEn: 'Private' },
  { code: 'FOREIGN', nameAr: 'وافد', nameEn: 'Foreign' },
  { code: 'STAFF_CHILD', nameAr: 'أبناء العاملين', nameEn: 'Staff Child' },
];

interface NationalitySeed extends CategorySeed {
  category: NationalityCategory;
}

/**
 * A starting list, not a complete one.
 *
 * Sudan as the national category, the neighbouring and Gulf states an
 * institution in Khartoum actually enrols from as ARAB, and one explicit
 * FOREIGN row so the third category is never empty on day one. A registrar
 * adds the rest; nothing here is load-bearing except the category, which is
 * what the fee matrix prices on.
 */
export const STARTER_NATIONALITIES: readonly NationalitySeed[] = [
  { code: 'SD', nameAr: 'السودان', nameEn: 'Sudan', category: 'NATIONAL' },
  { code: 'SS', nameAr: 'جنوب السودان', nameEn: 'South Sudan', category: 'FOREIGN' },
  { code: 'EG', nameAr: 'مصر', nameEn: 'Egypt', category: 'ARAB' },
  { code: 'SA', nameAr: 'السعودية', nameEn: 'Saudi Arabia', category: 'ARAB' },
  { code: 'AE', nameAr: 'الإمارات', nameEn: 'United Arab Emirates', category: 'ARAB' },
  { code: 'QA', nameAr: 'قطر', nameEn: 'Qatar', category: 'ARAB' },
  { code: 'YE', nameAr: 'اليمن', nameEn: 'Yemen', category: 'ARAB' },
  { code: 'SY', nameAr: 'سوريا', nameEn: 'Syria', category: 'ARAB' },
  { code: 'JO', nameAr: 'الأردن', nameEn: 'Jordan', category: 'ARAB' },
  { code: 'ER', nameAr: 'إريتريا', nameEn: 'Eritrea', category: 'FOREIGN' },
  { code: 'ET', nameAr: 'إثيوبيا', nameEn: 'Ethiopia', category: 'FOREIGN' },
  { code: 'TD', nameAr: 'تشاد', nameEn: 'Chad', category: 'FOREIGN' },
  { code: 'OTHER', nameAr: 'أخرى', nameEn: 'Other', category: 'FOREIGN' },
];

export async function installAcademicDefaults(
  tenantId: string,
  actorId: string | null = null,
): Promise<AcademicDefaultsResult> {
  return withSystem(async (tx) => {
    let admissionCategoriesCreated = 0;
    let admissionCategoriesSkipped = 0;

    for (const [i, c] of STANDARD_ADMISSION_CATEGORIES.entries()) {
      const existing = await tx.admissionCategory.findUnique({
        where: { tenantId_code: { tenantId, code: c.code } },
        select: { id: true },
      });
      if (existing) {
        admissionCategoriesSkipped += 1;
        continue;
      }
      await tx.admissionCategory.create({
        data: {
          tenantId,
          code: c.code,
          nameAr: c.nameAr,
          nameEn: c.nameEn,
          sortOrder: i,
        },
      });
      admissionCategoriesCreated += 1;
    }

    let nationalitiesCreated = 0;
    let nationalitiesSkipped = 0;

    for (const n of STARTER_NATIONALITIES) {
      const existing = await tx.nationality.findUnique({
        where: { tenantId_code: { tenantId, code: n.code } },
        select: { id: true },
      });
      if (existing) {
        nationalitiesSkipped += 1;
        continue;
      }
      await tx.nationality.create({
        data: {
          tenantId,
          code: n.code,
          nameAr: n.nameAr,
          nameEn: n.nameEn,
          category: n.category,
        },
      });
      nationalitiesCreated += 1;
    }

    let certificateTypesCreated = 0;
    let certificateTypesSkipped = 0;

    for (const [i, c] of STANDARD_CERTIFICATE_TYPES.entries()) {
      const existing = await tx.certificateType.findUnique({
        where: { tenantId_code: { tenantId, code: c.code } },
        select: { id: true },
      });
      if (existing) {
        certificateTypesSkipped += 1;
        continue;
      }
      await tx.certificateType.create({
        data: {
          tenantId,
          code: c.code,
          nameAr: c.nameAr,
          nameEn: c.nameEn,
          maxScore: c.maxScore,
          sortOrder: i,
        },
      });
      certificateTypesCreated += 1;
    }

    if (actorId) {
      await audit(tx, tenantId, {
        actorId,
        action: 'INSERT',
        resourceType: 'academic_defaults',
        resourceId: tenantId,
        after: {
          admissionCategoriesCreated,
          admissionCategoriesSkipped,
          nationalitiesCreated,
          nationalitiesSkipped,
          certificateTypesCreated,
          certificateTypesSkipped,
        },
      });
    }

    return {
      admissionCategoriesCreated,
      admissionCategoriesSkipped,
      nationalitiesCreated,
      nationalitiesSkipped,
      certificateTypesCreated,
      certificateTypesSkipped,
    };
  });
}
