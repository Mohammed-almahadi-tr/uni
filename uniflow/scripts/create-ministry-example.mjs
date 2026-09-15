import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const here = path.dirname(fileURLToPath(import.meta.url));
const output = path.resolve(here, '..', 'docs', 'ministry-candidates-example-2026.xlsx');

const workbook = XLSX.utils.book_new();
workbook.Props = {
  Title: 'مثال كشف مرشحي وزارة التعليم العالي 2026',
  Subject: 'ملف تجريبي لمسار القبول في UniFlow',
  Author: 'جامعة امدرمان الاهلية',
  Company: 'جامعة امدرمان الاهلية',
};

const candidates = [
  ['الاسم الرباعي', 'المدرسة', 'الرقم الوطني', 'سنة القبول', 'الدفعة'],
  ['أحمد محمد علي حسن', 'مدرسة امدرمان الثانوية النموذجية', '29999100001', 2026, '2026'],
  ['سارة عبد الله عثمان أحمد', 'مدرسة الخرطوم الثانوية للبنات', '29999100002', 2026, '2026'],
  ['مصطفى خالد يوسف إبراهيم', 'مدرسة بحري الثانوية', '29999100003', 2026, '2026'],
];

const roster = XLSX.utils.aoa_to_sheet(candidates);
roster['!cols'] = [
  { wch: 30 },
  { wch: 38 },
  { wch: 19 },
  { wch: 14 },
  { wch: 12 },
];
roster['!autofilter'] = { ref: `A1:E${candidates.length}` };
roster['!freeze'] = {
  xSplit: 0,
  ySplit: 1,
  topLeftCell: 'A2',
  activePane: 'bottomLeft',
  state: 'frozen',
};

for (let row = 2; row <= candidates.length; row += 1) {
  roster[`C${row}`].t = 's';
  roster[`C${row}`].z = '@';
  roster[`E${row}`].t = 's';
  roster[`E${row}`].z = '@';
}

XLSX.utils.book_append_sheet(workbook, roster, 'قائمة المرشحين');

const instructions = XLSX.utils.aoa_to_sheet([
  ['طريقة اختبار مسار القبول الكامل'],
  ['1', 'سجّل الدخول بحساب المسجل وافتح شؤون الطلاب ← استيراد قوائم الوزارة.'],
  ['2', 'ارفع ورقة قائمة المرشحين من هذا الملف كما هي.'],
  ['3', 'أصدر رمز الملف الشخصي لأحد المرشحين المستوردين.'],
  ['4', 'سجّل الخروج وافتح /ar/candidate/profile ثم أدخل الرمز وأكمل بيانات المرشح.'],
  ['5', 'سجّل الدخول كمسجل وافتح شؤون الطلاب ← قرارات المسجل.'],
  ['6', 'اختر البرنامج ثم جرّب قبول المرشح الأول ورفض المرشح الثاني وترك الثالث قيد الانتظار.'],
  [],
  [
    'مهم',
    'يقرأ النظام أول ورقة غير فارغة فقط، وهي قائمة المرشحين. رمز الدفعة وسنة القبول مضبوطتان على 2026.',
  ],
  [
    'مهم',
    'لا تعد رفع الملف نفسه بعد نجاح الاستيراد لأن الأرقام الوطنية تصبح مسجلة بالفعل.',
  ],
]);
instructions['!cols'] = [{ wch: 10 }, { wch: 105 }];
XLSX.utils.book_append_sheet(workbook, instructions, 'تعليمات الاختبار');

XLSX.writeFile(workbook, output, { bookType: 'xlsx', compression: true });
console.log(output);
