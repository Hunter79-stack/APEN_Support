/** Trigger a browser download of in-memory content — no server round-trip. */
export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * "Export to PDF" without a PDF library — this project can't `npm install`
 * one (root-owned node_modules) and has no CDN access to vendor one either.
 * Opening a clean, print-styled HTML document and calling the browser's own
 * print() lets the user "Save as PDF" via the native print dialog, which
 * produces a real PDF using the browser's own (far more robust) engine.
 */
export function openPrintableReport(html: string) {
  const w = window.open('', '_blank', 'width=800,height=900')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => { try { w.print() } catch { /* ignore */ } }, 350)
}
