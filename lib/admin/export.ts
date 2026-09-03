/**
 * Generic tabular export for admin panels — Markdown / CSV / print-to-PDF.
 * Any panel showing a list of records (feedback, custom pages, chat
 * transcripts) can export by describing its rows as a flat
 * set of columns; this module owns the three output formats so panels don't
 * each reinvent CSV escaping or a print-view HTML shell.
 */
import { downloadFile, openPrintableReport } from '@/lib/utils/download-file'

export interface ExportColumn<T> {
  label: string
  value: (row: T) => string
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ))
}

export function exportToCsv<T>(rows: T[], columns: ExportColumn<T>[], filenameBase: string) {
  const header = columns.map((c) => csvEscape(c.label)).join(',')
  const lines = rows.map((row) => columns.map((c) => csvEscape(c.value(row))).join(','))
  downloadFile(`${filenameBase}.csv`, [header, ...lines].join('\r\n'), 'text/csv')
}

export function exportToMarkdown<T>(rows: T[], columns: ExportColumn<T>[], filenameBase: string, title: string) {
  const clean = (v: string) => v.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
  const header = `| ${columns.map((c) => c.label).join(' | ')} |`
  const divider = `| ${columns.map(() => '---').join(' | ')} |`
  const lines = rows.map((row) => `| ${columns.map((c) => clean(c.value(row))).join(' | ')} |`)
  downloadFile(`${filenameBase}.md`, [`# ${title}`, '', header, divider, ...lines].join('\n'), 'text/markdown')
}

export function exportToPdf<T>(rows: T[], columns: ExportColumn<T>[], title: string) {
  const headerRow = `<tr>${columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('')}</tr>`
  const bodyRows = rows.map((row) =>
    `<tr>${columns.map((c) => `<td>${escapeHtml(c.value(row))}</td>`).join('')}</tr>`).join('\n')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    body{font-family:system-ui,-apple-system,sans-serif;margin:24px;color:#111}
    h1{font-size:18px;margin:0 0 4px}
    p.meta{font-size:11px;color:#666;margin:0 0 16px;text-transform:uppercase;letter-spacing:.06em}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:top}
    th{background:#f2f2f2}
    @media print { body{margin:0} }
  </style></head><body><h1>${escapeHtml(title)}</h1><p class="meta">${rows.length} record${rows.length === 1 ? '' : 's'} — exported ${new Date().toLocaleString()}</p><table>${headerRow}${bodyRows}</table></body></html>`
  openPrintableReport(html)
}
