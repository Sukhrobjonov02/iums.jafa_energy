export const MONTHS_UZ = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

const uzDate = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;

/** What a report is called: on its first line and in the header of every printed page. */
export function reportTitle(r: { period: 'day' | 'month' | 'year'; from: string; contractYear: number | null }): string {
  if (r.period === 'day') return `Kunlik hisobot: ${uzDate(r.from)}`;
  if (r.period === 'year') return `Yillik hisobot: ${r.contractYear}-shartnoma yili`;
  return `Oylik hisobot: ${MONTHS_UZ[Number(r.from.slice(5, 7)) - 1]} ${r.from.slice(0, 4)}`;
}

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
.om-report th.r { white-space: normal; }
.om-report .nw { white-space: nowrap; }
.om-report table.compact th, .om-report table.compact td { padding: 3px 6px; font-size: 11px; }
.om-report table.meta { width: auto; }
.om-report table.meta th, .om-report table.meta td { border: none; padding: 2px 14px 2px 0; }
.om-report table.meta th { color: #52606d; font-weight: 500; white-space: nowrap; }
.om-report .tiles { display: flex; gap: 8px; margin: 14px 0 4px; }
.om-report .tiles div { flex: 1; min-width: 0; border: 1px solid #d9e2ec; border-radius: 6px; padding: 8px 10px; display: flex; flex-direction: column; justify-content: space-between; }
.om-report .tiles span { display: block; color: #52606d; font-size: 10.5px; }
.om-report .tiles b { font-size: 16px; white-space: nowrap; }
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
.om-report tfoot { display: table-row-group; }
.om-report tr, .om-report table.keep, .om-report .note, .om-report .foot, .om-report .tiles, .om-report .closing { break-inside: avoid; page-break-inside: avoid; }
.om-report h2, .om-report h3, .om-report .lead { break-after: avoid; page-break-after: avoid; }
.om-report .foot { break-before: avoid; page-break-before: avoid; }
.om-report p { orphans: 3; widows: 3; }
@page { size: A4; margin: 16mm 12mm 15mm; }
`;

// "<" is written as its CSS escape so that a name can never close the style element it is printed in.
const cssString = (text: string) => `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/</g, '\\3c ').replace(/[\r\n]+/g, ' ')}"`;

/**
 * The page header and footer for printing from the browser: who made the report, what it is, and
 * the page number. Chrome and Edge then leave out their own line of page title, address and date;
 * Firefox and Safari ignore these rules, which is why the PDF button has the server make the file.
 */
export const pageMarginCss = (title: string) => `
@page {
  @top-left { content: "JAFA ENERGY"; font: 600 9px Arial, sans-serif; color: #047857; letter-spacing: 1px; }
  @top-right { content: ${cssString(title)}; font: 9px Arial, sans-serif; color: #52606d; }
  @bottom-left { content: "IUMS monitoring tizimi"; font: 9px Arial, sans-serif; color: #52606d; }
  @bottom-right { content: counter(page) " / " counter(pages); font: 9px Arial, sans-serif; color: #52606d; }
}
`;

/** The report as a document of its own: what the print frame shows and what the server turns into a PDF. */
export const reportDocumentHtml = (reportHtml: string, extraCss = '') =>
  `<!doctype html><html><head><meta charset="utf-8"><title></title><style>body{margin:0}${REPORT_CSS}${extraCss}</style></head><body>${reportHtml}</body></html>`;
