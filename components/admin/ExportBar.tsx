'use client'

import { FileText, FileSpreadsheet, Printer } from 'lucide-react'
import { exportToCsv, exportToMarkdown, exportToPdf, type ExportColumn } from '@/lib/admin/export'

/**
 * Drop-in export controls for any admin panel that renders a list/log of
 * records — feedback, custom pages, chat transcripts.
 * The panel just describes its rows as flat columns; this owns the three
 * output formats (see lib/admin/export.ts).
 */
export function ExportBar<T>({
  rows,
  columns,
  filenameBase,
  title,
}: {
  rows: T[]
  columns: ExportColumn<T>[]
  filenameBase: string
  title: string
}) {
  if (rows.length === 0) return null

  const buttonClass = 'inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-300'

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Export</span>
      <button onClick={() => exportToMarkdown(rows, columns, filenameBase, title)} className={buttonClass} title="Export as Markdown">
        <FileText size={12} aria-hidden="true" /> MD
      </button>
      <button onClick={() => exportToCsv(rows, columns, filenameBase)} className={buttonClass} title="Export as CSV">
        <FileSpreadsheet size={12} aria-hidden="true" /> CSV
      </button>
      <button onClick={() => exportToPdf(rows, columns, title)} className={buttonClass} title="Export as PDF (print dialog)">
        <Printer size={12} aria-hidden="true" /> PDF
      </button>
    </div>
  )
}
