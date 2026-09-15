const path = require('node:path');

module.exports = {
  stylesheet: [path.join(__dirname, 'user-manual-ar-pdf.css')],
  document_title: 'دليل استخدام نظام جامعة امدرمان الاهلية',
  page_media_type: 'print',
  md_file_encoding: 'utf-8',
  stylesheet_encoding: 'utf-8',
  launch_options: {
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox'],
  },
  pdf_options: {
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    margin: {
      top: '19mm',
      right: '16mm',
      bottom: '18mm',
      left: '16mm',
    },
    headerTemplate: `
      <div style="width:100%;font-size:8px;color:#718287;text-align:center;font-family:Tahoma,Arial;direction:rtl">
        جامعة امدرمان الاهلية — دليل نظام UniFlow
      </div>`,
    footerTemplate: `
      <div style="width:100%;font-size:8px;color:#718287;text-align:center;font-family:Arial">
        <span class="pageNumber"></span> / <span class="totalPages"></span>
      </div>`,
  },
};
