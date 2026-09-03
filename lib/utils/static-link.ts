const EXTERNAL_HREF_PATTERN = /^[a-z][a-z\d+.-]*:|^\/\//i
const FILE_PATH_PATTERN = /\/[^/?#]*\.[^/?#]+$/
const FULL_DOCUMENT_ROUTES = [
  '/speedtest',
  '/netdiag',
  '/network-analysis',
  '/cran-control',
  '/pip-control',
  '/iso-control',
  '/cran',
  '/repos',
  '/winget',
  '/pki',
]

export function normalizeStaticHref(href: string) {
  const value = href.trim()

  if (!value || EXTERNAL_HREF_PATTERN.test(value) || value.startsWith('#') || value.startsWith('?')) {
    return href
  }

  if (!value.startsWith('/')) return href

  try {
    const url = new URL(value, 'https://static-export.local')
    if (url.pathname !== '/' && !url.pathname.endsWith('/') && !FILE_PATH_PATTERN.test(url.pathname)) {
      url.pathname = `${url.pathname}/`
    }
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return href
  }
}

export function isClientRoutableHref(href: string) {
  const normalized = normalizeStaticHref(href)
  if (!normalized.startsWith('/') || normalized.startsWith('//')) return false

  const pathname = normalized.split(/[?#]/, 1)[0]
  if (FILE_PATH_PATTERN.test(pathname)) return false
  if (FULL_DOCUMENT_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return false
  }
  return true
}
