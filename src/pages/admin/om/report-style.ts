export const MONTHS_UZ = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

/** The report's own stylesheet: used on the page and, alone, in the print frame. */
export const REPORT_CSS = `
.om-report { font-family: Inter, 'Segoe UI', Arial, sans-serif; color: #1f2933; font-size: 12px; line-height: 1.45; }
.om-report * { box-sizing: border-box; }
.om-report .brand { font-weight: 700; letter-spacing: 2px; color: #047857; font-size: 13px; }
.om-report h1 { font-size: 22px; margin: 6px 0 2px; }
.om-report .sub { margin: 0 0 12px; color: #52606d; }
.om-report h2 { font-size: 15px; margin: 22px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #047857; }
.om-report h3 { font-size: 12.5px; margin: 14px 0 6px; }
.om-report table { width: 100%; border-collapse: collapse; margin: 0 0 6px; }
.om-report th, .om-report td { border: 1px solid #d9e2ec; padding: 5px 7px; text-align: left; vertical-align: top; }
.om-report thead th { background: #e8f0ea; font-weight: 600; }
.om-report tfoot td { font-weight: 700; background: #f5f7fa; }
.om-report .r { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.om-report table.compact th, .om-report table.compact td { padding: 3px 6px; font-size: 11px; }
.om-report table.meta { width: auto; }
.om-report table.meta th, .om-report table.meta td { border: none; padding: 2px 14px 2px 0; }
.om-report table.meta th { color: #52606d; font-weight: 500; white-space: nowrap; }
.om-report .tiles { display: flex; gap: 8px; margin: 14px 0 4px; }
.om-report .tiles div { flex: 1; border: 1px solid #d9e2ec; border-radius: 6px; padding: 8px 10px; }
.om-report .tiles span { display: block; color: #52606d; font-size: 11px; }
.om-report .tiles b { font-size: 16px; }
.om-report .ok { color: #047857; }
.om-report .bad { color: #cf1322; }
.om-report .warn { color: #b45309; }
.om-report .note { margin: 4px 0 8px; white-space: pre-wrap; }
.om-report .note.empty { color: #9aa5b1; font-style: italic; }
.om-report .foot { color: #52606d; font-size: 10.5px; margin: 4px 0 0; }
.om-report .signatures { display: flex; gap: 40px; margin-top: 40px; page-break-inside: avoid; }
.om-report .signatures div { flex: 1; }
.om-report .signatures span { display: block; margin-top: 28px; }
.om-report thead { display: table-header-group; }
.om-report tr { page-break-inside: avoid; }
.om-report h2, .om-report h3 { page-break-after: avoid; }
@page { size: A4; margin: 14mm 12mm; }
`;
