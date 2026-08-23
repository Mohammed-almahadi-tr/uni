import 'server-only';
import type { NormalBalance, SubledgerType } from '@/generated/prisma/enums';
import { withSystem } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { TEMPLATE_ACCOUNT_ROLES } from './mapping';

/**
 * Standard university chart of accounts (SRS §6 step 1).
 *
 * Installed at tenant onboarding so an institution starts from a working
 * chart rather than a blank tree. Modelled on what the legacy databases
 * actually contained — student debtors, tuition revenue by faculty, cash and
 * bank, the Ribat build's custody (العهد) accounts — but normalised, coded,
 * and with the control accounts and contra-assets the legacy chart lacked.
 *
 * Codes follow the conventional 1-5 major classes:
 *   1 Assets · 2 Liabilities · 3 Equity · 4 Revenue · 5 Expenses
 *
 * Level 5 rows are postable; everything above aggregates. Tenants add their
 * own level-5 detail (specific banks, specific faculties) after onboarding.
 */

export interface TemplateAccount {
  code: string;
  nameAr: string;
  nameEn: string;
  normalBalance?: NormalBalance;
  isControlAccount?: boolean;
  subledgerType?: SubledgerType;
  requiresCostCenter?: boolean;
  children?: TemplateAccount[];
}

export const UNIVERSITY_COA: TemplateAccount[] = [
  {
    code: '1',
    nameAr: 'الأصول',
    nameEn: 'Assets',
    normalBalance: 'DEBIT',
    children: [
      {
        code: '11',
        nameAr: 'الأصول المتداولة',
        nameEn: 'Current Assets',
        children: [
          {
            code: '111',
            nameAr: 'النقدية وما في حكمها',
            nameEn: 'Cash and Cash Equivalents',
            children: [
              {
                code: '1111',
                nameAr: 'النقدية بالصندوق',
                nameEn: 'Cash on Hand',
                children: [
                  { code: '11111', nameAr: 'الخزينة الرئيسية', nameEn: 'Main Safe' },
                  { code: '11112', nameAr: 'صندوق المصروفات النثرية', nameEn: 'Petty Cash' },
                ],
              },
              {
                code: '1112',
                nameAr: 'البنوك',
                nameEn: 'Banks',
                children: [
                  { code: '11121', nameAr: 'الحساب البنكي الرئيسي', nameEn: 'Main Bank Account' },
                ],
              },
              {
                code: '1113',
                nameAr: 'العهد',
                nameEn: 'Staff Imprest and Advances',
                // Recovered from the Ribat build's frmCustody. Legacy held
                // these as free-text account names under a parent called
                // "العهد" with no per-holder ledger.
                children: [
                  { code: '11131', nameAr: 'عهد الموظفين', nameEn: 'Staff Imprest' },
                ],
              },
            ],
          },
          {
            code: '112',
            nameAr: 'المدينون',
            nameEn: 'Receivables',
            children: [
              {
                code: '1121',
                nameAr: 'مدينون (الطلاب)',
                nameEn: 'Student Debtors',
                children: [
                  {
                    code: '11211',
                    nameAr: 'حساب مراقبة الطلاب',
                    nameEn: 'Student AR Control',
                    isControlAccount: true,
                    subledgerType: 'STUDENT',
                  },
                ],
              },
              {
                code: '1122',
                nameAr: 'مدينون (الجهات الراعية)',
                nameEn: 'Sponsor Debtors',
                children: [
                  {
                    code: '11221',
                    nameAr: 'حساب مراقبة الجهات الراعية',
                    nameEn: 'Sponsor AR Control',
                    isControlAccount: true,
                    subledgerType: 'SPONSOR',
                  },
                ],
              },
              {
                code: '1123',
                nameAr: 'شيكات تحت التحصيل',
                nameEn: 'Cheques Under Collection',
                // Two accounts, not one. "What is in our safe" and "what is
                // with the bank for collection" are different questions, and
                // a cheque moving between them is a real movement of value —
                // SRS REQ-CHQ-01 asks for custody, and custody the ledger
                // cannot report is custody nobody can audit.
                children: [
                  { code: '11231', nameAr: 'شيكات بالخزينة', nameEn: 'Cheques on Hand' },
                  {
                    code: '11232',
                    nameAr: 'شيكات بالبنك برسم التحصيل',
                    nameEn: 'Cheques with Bank for Collection',
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        code: '12',
        nameAr: 'الأصول الثابتة',
        nameEn: 'Fixed Assets',
        children: [
          {
            code: '121',
            nameAr: 'الأصول الثابتة بالتكلفة',
            nameEn: 'Fixed Assets at Cost',
            children: [
              {
                code: '1211',
                nameAr: 'المباني والإنشاءات',
                nameEn: 'Buildings',
                children: [{ code: '12111', nameAr: 'المباني', nameEn: 'Buildings' }],
              },
              {
                code: '1212',
                nameAr: 'الأجهزة والمعدات',
                nameEn: 'Equipment',
                children: [
                  { code: '12121', nameAr: 'أجهزة المعامل', nameEn: 'Laboratory Equipment' },
                  { code: '12122', nameAr: 'أجهزة الحاسوب', nameEn: 'IT Equipment' },
                ],
              },
              {
                code: '1213',
                nameAr: 'الأثاث والتجهيزات',
                nameEn: 'Furniture and Fittings',
                children: [{ code: '12131', nameAr: 'الأثاث', nameEn: 'Furniture' }],
              },
              {
                code: '1214',
                nameAr: 'وسائل النقل',
                nameEn: 'Vehicles',
                children: [{ code: '12141', nameAr: 'السيارات', nameEn: 'Motor Vehicles' }],
              },
            ],
          },
          {
            code: '122',
            nameAr: 'مجمع الإهلاك',
            nameEn: 'Accumulated Depreciation',
            // Contra-asset: sits under Assets but carries a credit balance.
            // The legacy depreciation routine had no accumulated-depreciation
            // account at all, so net book value could not be derived.
            normalBalance: 'CREDIT',
            children: [
              {
                code: '1221',
                nameAr: 'مجمع إهلاك الأصول',
                nameEn: 'Accumulated Depreciation',
                children: [
                  { code: '12211', nameAr: 'مجمع إهلاك المباني', nameEn: 'Acc. Dep. — Buildings' },
                  { code: '12212', nameAr: 'مجمع إهلاك الأجهزة', nameEn: 'Acc. Dep. — Equipment' },
                  { code: '12213', nameAr: 'مجمع إهلاك الأثاث', nameEn: 'Acc. Dep. — Furniture' },
                  { code: '12214', nameAr: 'مجمع إهلاك السيارات', nameEn: 'Acc. Dep. — Vehicles' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    code: '2',
    nameAr: 'الخصوم',
    nameEn: 'Liabilities',
    normalBalance: 'CREDIT',
    children: [
      {
        code: '21',
        nameAr: 'الخصوم المتداولة',
        nameEn: 'Current Liabilities',
        children: [
          {
            code: '211',
            nameAr: 'الإيرادات المؤجلة',
            nameEn: 'Deferred Income',
            children: [
              {
                code: '2111',
                nameAr: 'رسوم غير مكتسبة',
                nameEn: 'Unearned Fees',
                // SRS REQ-FEE-02. The legacy system recognised a full year's
                // tuition on registration day; billing credits this instead
                // and revenue is recognised across the term.
                children: [
                  { code: '21111', nameAr: 'رسوم دراسية غير مكتسبة', nameEn: 'Unearned Tuition' },
                  { code: '21112', nameAr: 'رسوم أخرى غير مكتسبة', nameEn: 'Unearned Other Fees' },
                ],
              },
            ],
          },
          {
            code: '212',
            nameAr: 'الدائنون',
            nameEn: 'Payables',
            children: [
              {
                code: '2121',
                nameAr: 'الموردون',
                nameEn: 'Vendors',
                children: [
                  {
                    code: '21211',
                    nameAr: 'حساب مراقبة الموردين',
                    nameEn: 'Vendor AP Control',
                    isControlAccount: true,
                    subledgerType: 'VENDOR',
                  },
                ],
              },
              {
                code: '2122',
                nameAr: 'أرصدة دائنة للطلاب',
                nameEn: 'Student Credit Balances',
                // SRS REQ-FEE-04: overpayments are a liability, not revenue.
                // A control account with student identity, exactly like AR —
                // otherwise a per-student credit balance is a number in the
                // sub-ledger with nothing in the general ledger to check it
                // against, which is how the legacy `Remain` column drifted.
                children: [
                  {
                    code: '21221',
                    nameAr: 'مدفوعات زائدة للطلاب',
                    nameEn: 'Student Overpayments',
                    isControlAccount: true,
                    subledgerType: 'STUDENT',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    code: '3',
    nameAr: 'حقوق الملكية',
    nameEn: 'Equity',
    normalBalance: 'CREDIT',
    children: [
      {
        code: '31',
        nameAr: 'رأس المال والاحتياطيات',
        nameEn: 'Capital and Reserves',
        children: [
          {
            code: '311',
            nameAr: 'رأس المال',
            nameEn: 'Capital',
            children: [
              {
                code: '3111',
                nameAr: 'رأس المال المدفوع',
                nameEn: 'Paid-in Capital',
                children: [{ code: '31111', nameAr: 'رأس المال', nameEn: 'Capital' }],
              },
            ],
          },
          {
            code: '312',
            nameAr: 'الفائض المتراكم',
            nameEn: 'Accumulated Surplus',
            children: [
              {
                code: '3121',
                nameAr: 'الفائض المرحّل',
                nameEn: 'Retained Surplus',
                // Year-end close rolls revenue and expense here — SRS REQ-PER-04.
                children: [
                  { code: '31211', nameAr: 'الفائض المرحّل', nameEn: 'Retained Surplus' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    code: '4',
    nameAr: 'الإيرادات',
    nameEn: 'Revenues',
    normalBalance: 'CREDIT',
    children: [
      {
        code: '41',
        nameAr: 'إيرادات الرسوم',
        nameEn: 'Fee Revenue',
        children: [
          {
            code: '411',
            nameAr: 'الرسوم الدراسية',
            nameEn: 'Tuition Fees',
            children: [
              {
                code: '4111',
                nameAr: 'الرسوم الدراسية حسب الكلية',
                nameEn: 'Tuition by Faculty',
                // One level-5 child per faculty is added at onboarding; the
                // template ships a general account so a tenant can post from
                // day one.
                children: [
                  {
                    code: '41111',
                    nameAr: 'رسوم دراسية عامة',
                    nameEn: 'Tuition — General',
                    requiresCostCenter: true,
                  },
                ],
              },
            ],
          },
          {
            code: '412',
            nameAr: 'رسوم أخرى',
            nameEn: 'Other Fees',
            children: [
              {
                code: '4121',
                nameAr: 'رسوم إدارية',
                nameEn: 'Administrative Fees',
                children: [
                  { code: '41211', nameAr: 'رسوم التسجيل', nameEn: 'Registration Fees' },
                  { code: '41212', nameAr: 'رسوم الامتحانات', nameEn: 'Examination Fees' },
                  { code: '41213', nameAr: 'رسوم المعامل', nameEn: 'Laboratory Fees' },
                  { code: '41214', nameAr: 'رسوم البطاقات والشهادات', nameEn: 'Cards and Certificates' },
                  { code: '41215', nameAr: 'غرامات', nameEn: 'Fines and Penalties' },
                  // The fee catalogue (REQ-FEE-01) bills fifteen heads. Several
                  // share a revenue line on purpose: the fee item carries the
                  // granularity a bursar needs, the account carries the
                  // granularity a financial statement needs.
                  {
                    code: '41216',
                    nameAr: 'رسوم المكتبة والخدمات الطلابية',
                    nameEn: 'Library and Student Services',
                  },
                  {
                    code: '41217',
                    nameAr: 'رسوم السكن والترحيل',
                    nameEn: 'Accommodation and Transport',
                  },
                  {
                    code: '41218',
                    nameAr: 'رسوم التأمين والدمغة',
                    nameEn: 'Insurance and Stamp Duty',
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        code: '42',
        nameAr: 'إيرادات أخرى',
        nameEn: 'Other Income',
        children: [
          {
            code: '421',
            nameAr: 'المنح والتبرعات',
            nameEn: 'Grants and Donations',
            children: [
              {
                code: '4211',
                nameAr: 'المنح',
                nameEn: 'Grants',
                children: [{ code: '42111', nameAr: 'منح بحثية', nameEn: 'Research Grants' }],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    code: '5',
    nameAr: 'المصروفات',
    nameEn: 'Expenses',
    normalBalance: 'DEBIT',
    children: [
      {
        code: '51',
        nameAr: 'المصروفات التشغيلية',
        nameEn: 'Operating Expenses',
        children: [
          {
            code: '511',
            nameAr: 'تكاليف العاملين',
            nameEn: 'Staff Costs',
            children: [
              {
                code: '5111',
                nameAr: 'الرواتب والأجور',
                nameEn: 'Salaries and Wages',
                children: [
                  {
                    code: '51111',
                    nameAr: 'رواتب أكاديمية',
                    nameEn: 'Academic Salaries',
                    requiresCostCenter: true,
                  },
                  {
                    code: '51112',
                    nameAr: 'رواتب إدارية',
                    nameEn: 'Administrative Salaries',
                    requiresCostCenter: true,
                  },
                ],
              },
            ],
          },
          {
            code: '512',
            nameAr: 'المصروفات العمومية',
            nameEn: 'General Expenses',
            children: [
              {
                code: '5121',
                nameAr: 'مصروفات إدارية',
                nameEn: 'Administrative Expenses',
                children: [
                  { code: '51211', nameAr: 'الكهرباء والمياه', nameEn: 'Utilities' },
                  { code: '51212', nameAr: 'الإيجارات', nameEn: 'Rent' },
                  { code: '51213', nameAr: 'الصيانة', nameEn: 'Maintenance' },
                  { code: '51214', nameAr: 'مستهلكات المعامل', nameEn: 'Laboratory Consumables', requiresCostCenter: true },
                  { code: '51215', nameAr: 'مصروفات بنكية', nameEn: 'Bank Charges' },
                ],
              },
            ],
          },
          {
            code: '513',
            nameAr: 'الإهلاك',
            nameEn: 'Depreciation',
            children: [
              {
                code: '5131',
                nameAr: 'مصروف الإهلاك',
                nameEn: 'Depreciation Expense',
                children: [
                  {
                    code: '51311',
                    nameAr: 'مصروف إهلاك',
                    nameEn: 'Depreciation Expense',
                    requiresCostCenter: true,
                  },
                ],
              },
            ],
          },
          {
            code: '514',
            nameAr: 'الخصومات والمنح الدراسية',
            nameEn: 'Discounts and Scholarships',
            children: [
              {
                code: '5141',
                nameAr: 'المنح الدراسية',
                nameEn: 'Scholarships',
                // Held as an expense rather than netted off revenue, so that
                // discount exposure is visible on its own line — the report
                // the legacy `viewDiscount` view existed to produce.
                children: [
                  { code: '51411', nameAr: 'منح دراسية', nameEn: 'Scholarship Awards' },
                  { code: '51412', nameAr: 'خصومات أبناء العاملين', nameEn: 'Staff Child Discounts' },
                ],
              },
            ],
          },
        ],
      },
      {
        code: '52',
        nameAr: 'فروق العملة',
        nameEn: 'Exchange Differences',
        children: [
          {
            code: '521',
            nameAr: 'فروق أسعار الصرف',
            nameEn: 'Foreign Exchange Differences',
            children: [
              {
                code: '5211',
                nameAr: 'فروق الصرف',
                nameEn: 'FX Gain or Loss',
                // SRS REQ-FIN-03. Legacy had no currency field at all.
                children: [
                  { code: '52111', nameAr: 'أرباح وخسائر الصرف المحققة', nameEn: 'Realised FX Gain/Loss' },
                  { code: '52112', nameAr: 'أرباح وخسائر الصرف غير المحققة', nameEn: 'Unrealised FX Gain/Loss' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

/** Cost centres a university needs on day one. */
export const DEFAULT_COST_CENTERS = [
  { code: 'CC-ADM', nameAr: 'الإدارة', nameEn: 'Administration' },
  { code: 'CC-MED', nameAr: 'كلية الطب', nameEn: 'Faculty of Medicine' },
  { code: 'CC-DEN', nameAr: 'كلية طب الأسنان', nameEn: 'Faculty of Dentistry' },
  { code: 'CC-PHA', nameAr: 'كلية الصيدلة', nameEn: 'Faculty of Pharmacy' },
  { code: 'CC-NUR', nameAr: 'كلية التمريض', nameEn: 'Faculty of Nursing' },
  { code: 'CC-LAB', nameAr: 'كلية المختبرات الطبية', nameEn: 'Faculty of Medical Laboratories' },
  { code: 'CC-CS', nameAr: 'كلية نظم المعلومات', nameEn: 'Faculty of Information Systems' },
];

export interface InstallResult {
  accounts: number;
  costCenters: number;
  /** Structural roles bound to accounts — see coa/mapping.ts. */
  mappings: number;
}

/**
 * Install the template into a tenant.
 *
 * Runs as the owner role because onboarding happens before any staff user
 * exists to hold `coa.manage`. Idempotent by account code, so re-running
 * after a partial failure is safe.
 */
export async function installChartOfAccounts(
  tenantId: string,
  actorId: string | null = null,
): Promise<InstallResult> {
  return withSystem(async (tx) => {
    let accounts = 0;

    const insert = async (
      node: TemplateAccount,
      parentId: string | null,
      level: number,
      inheritedBalance: NormalBalance,
    ): Promise<void> => {
      const normalBalance = node.normalBalance ?? inheritedBalance;
      const isLeaf = !node.children || node.children.length === 0;

      const existing = await tx.account.findUnique({
        where: { tenantId_code: { tenantId, code: node.code } },
        select: { id: true },
      });

      const id =
        existing?.id ??
        (
          await tx.account.create({
            data: {
              tenantId,
              code: node.code,
              nameAr: node.nameAr,
              nameEn: node.nameEn,
              level,
              parentId,
              normalBalance,
              isPostable: isLeaf && level === 5,
              isControlAccount: node.isControlAccount ?? false,
              subledgerType: node.subledgerType ?? null,
              requiresCostCenter: node.requiresCostCenter ?? false,
            },
            select: { id: true },
          })
        ).id;

      if (!existing) accounts += 1;

      for (const child of node.children ?? []) {
        await insert(child, id, level + 1, normalBalance);
      }
    };

    for (const root of UNIVERSITY_COA) {
      await insert(root, null, 1, root.normalBalance ?? 'DEBIT');
    }

    const cc = await tx.costCenter.createMany({
      data: DEFAULT_COST_CENTERS.map((c) => ({ tenantId, ...c })),
      skipDuplicates: true,
    });

    // Bind the structural roles the rest of the product asks for by name.
    // Without these a freshly onboarded tenant has a complete chart and no way
    // to take a payment, because nothing knows which account is student AR.
    const byCode = new Map(
      (
        await tx.account.findMany({
          where: { tenantId },
          select: { id: true, code: true },
        })
      ).map((a) => [a.code, a.id]),
    );

    let mappings = 0;
    for (const [role, code] of Object.entries(TEMPLATE_ACCOUNT_ROLES)) {
      const accountId = byCode.get(code);
      if (!accountId) continue;
      const result = await tx.accountMapping.upsert({
        where: { tenantId_role: { tenantId, role: role as never } },
        create: { tenantId, role: role as never, accountId },
        update: {},
        select: { accountId: true },
      });
      if (result.accountId === accountId) mappings += 1;
    }

    if (actorId) {
      await audit(tx, tenantId, {
        actorId,
        action: 'INSERT',
        resourceType: 'chart_of_accounts',
        resourceId: tenantId,
        after: { accountsCreated: accounts, costCentresCreated: cc.count, mappings },
      });
    }

    return { accounts, costCenters: cc.count, mappings };
  });
}

/** Walk the template without touching the database — used by tests and by the
 *  onboarding preview. */
export function walkTemplate(
  nodes: TemplateAccount[] = UNIVERSITY_COA,
  level = 1,
): Array<TemplateAccount & { level: number }> {
  return nodes.flatMap((n) => [
    { ...n, level },
    ...walkTemplate(n.children ?? [], level + 1),
  ]);
}
