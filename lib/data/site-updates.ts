import { existsSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, extname, join, relative, sep } from 'node:path'
import {
  DEFAULT_VISIBLE,
  MANUAL_ANNOUNCEMENTS,
  type Announcement,
} from '@/lib/data/announcements'
import { visualStudioCards } from '@/lib/data/visual-studio'
import { vmware7Products, vmware8Products, vmware9Products } from '@/lib/data/vmware'
import type { VMwareProductCard } from '@/lib/types/cards'

const APP_DIR = join(process.cwd(), 'app')
const PUBLIC_DIR = join(process.cwd(), 'public')

const AUTO_LINK_LABEL = 'View'
const MAX_ROUTE_LABELS = 4
const MAX_UPLOAD_LABELS = 3

const IGNORED_ROUTES = new Set(['/403', '/404', '/admin'])
const IGNORED_PUBLIC_TOP_LEVEL = new Set(['logos'])
const IGNORED_PUBLIC_FILES = new Set(['robots.txt'])

type DatedFile = {
  label: string
  href: string
  date: string
  path: string
  topLevel?: string
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function isPageFile(path: string): boolean {
  return basename(path) === 'page.tsx'
}

function titleCase(value: string): string {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase()
      if (['ad', 'ai', 'ca', 'csr', 'deb', 'dren', 'el', 'faq', 'foia', 'iso', 'isos', 'ms', 'pdq', 'pip', 'rpm', 'sql', 'stig', 'ub', 'vmware'].includes(lower)) {
        return lower.toUpperCase()
      }
      return `${word.charAt(0).toUpperCase()}${word.slice(1)}`
    })
    .join(' ')
}

function routeLabel(route: string): string {
  if (route === '/') return 'Home'

  const parts = route.split('/').filter(Boolean)
  return parts.map(titleCase).join(' / ')
}

function publicFolderLabel(folder: string | undefined): string {
  if (!folder) return 'Site assets'
  return titleCase(folder)
}

function walkFiles(root: string): string[] {
  if (!existsSync(root)) return []

  const entries = readdirSync(root, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const fullPath = join(root, entry.name)
    if (entry.isDirectory()) return walkFiles(fullPath)
    return entry.isFile() ? [fullPath] : []
  })
}

function pagePathToRoute(pagePath: string): string | null {
  const relDir = relative(APP_DIR, dirname(pagePath))
  const parts = relDir === '' ? [] : relDir.split(sep)

  if (parts.some((part) => part.startsWith('_') || part.startsWith('(') || part.startsWith('@'))) {
    return null
  }

  const route = parts.length === 0 ? '/' : `/${parts.join('/')}`
  if (IGNORED_ROUTES.has(route)) return null

  return route
}

function getRouteActivity(): Announcement[] {
  const pages = walkFiles(APP_DIR)
    .filter(isPageFile)
    .map((path): DatedFile | null => {
      const href = pagePathToRoute(path)
      if (!href) return null

      const stats = statSync(path)
      return {
        label: routeLabel(href),
        href,
        date: formatDate(stats.mtime),
        path,
      }
    })
    .filter((item): item is DatedFile => item !== null)

  const latestByDate = new Map<string, DatedFile[]>()
  for (const page of pages) {
    const group = latestByDate.get(page.date) ?? []
    group.push(page)
    latestByDate.set(page.date, group)
  }

  return Array.from(latestByDate.entries()).map(([date, group]) => {
    const sorted = group.sort((a, b) => b.path.localeCompare(a.path))
    const labels = sorted.slice(0, MAX_ROUTE_LABELS).map((item) => item.label)
    const remaining = sorted.length - labels.length
    const suffix = remaining > 0 ? `, and ${remaining} more` : ''

    return {
      text: `Site pages created or updated: ${labels.join(', ')}${suffix}.`,
      href: sorted[0]?.href ?? '/',
      linkLabel: AUTO_LINK_LABEL,
      date,
      category: 'Site Update',
    }
  })
}

function publicFileToItem(path: string): DatedFile | null {
  const relPath = relative(PUBLIC_DIR, path)
  const parts = relPath.split(sep)
  const topLevel = parts.length > 1 ? parts[0] : undefined

  if (IGNORED_PUBLIC_FILES.has(parts[0])) return null
  if (topLevel && IGNORED_PUBLIC_TOP_LEVEL.has(topLevel)) return null

  const stats = statSync(path)
  const normalizedPath = relPath.split(sep).join('/')
  const extension = extname(path).replace('.', '').toUpperCase()
  const label = extension ? `${basename(path)} (${extension})` : basename(path)

  return {
    label,
    href: `/${normalizedPath}`,
    date: formatDate(stats.mtime),
    path,
    topLevel,
  }
}

function getPublicUploadActivity(): Announcement[] {
  const uploads = walkFiles(PUBLIC_DIR)
    .map(publicFileToItem)
    .filter((item): item is DatedFile => item !== null)

  const groups = new Map<string, DatedFile[]>()
  for (const upload of uploads) {
    const groupKey = `${upload.date}|${upload.topLevel ?? 'root'}`
    const group = groups.get(groupKey) ?? []
    group.push(upload)
    groups.set(groupKey, group)
  }

  return Array.from(groups.values()).map((group) => {
    const sorted = group.sort((a, b) => b.path.localeCompare(a.path))
    const date = sorted[0]?.date ?? formatDate(new Date())
    const labels = sorted.slice(0, MAX_UPLOAD_LABELS).map((item) => item.label)
    const remaining = sorted.length - labels.length
    const suffix = remaining > 0 ? `, and ${remaining} more` : ''
    const folder = publicFolderLabel(sorted[0]?.topLevel)

    return {
      text: `${folder} uploads detected: ${labels.join(', ')}${suffix}.`,
      href: sorted[0]?.href ?? '/',
      linkLabel: AUTO_LINK_LABEL,
      date,
      category: 'Site Update',
    }
  })
}

function vmwarePatchLabel(product: VMwareProductCard, build: string): string {
  const releaseName = build.split('—')[0]?.trim() ?? build

  if (product.title.includes('vCenter')) {
    return `${product.title.replace(/^VMware\s+/, '')} ${releaseName}`
  }

  return releaseName
}

function getVmwarePatchAnnouncements(): Announcement[] {
  const patchGroups = new Map<string, string[]>()
  const products = [...vmware9Products, ...vmware8Products, ...vmware7Products]

  for (const product of products) {
    for (const patch of product.patches ?? []) {
      const labels = patchGroups.get(patch.release) ?? []
      labels.push(vmwarePatchLabel(product, patch.build))
      patchGroups.set(patch.release, labels)
    }
  }

  return Array.from(patchGroups.entries()).map(([date, labels]) => ({
    text: `VMware patch updates added: ${labels.join('; ')}.`,
    href: '/downloads/vmware',
    linkLabel: 'View Patches',
    date,
    category: 'VMware',
  }))
}

function getStructuredReleaseAnnouncements(): Announcement[] {
  return [
    ...getVmwarePatchAnnouncements(),
    ...visualStudioCards.map((card): Announcement => ({
      text: `${card.title} updated to version ${card.latestVersion}.`,
      href: card.href,
      linkLabel: AUTO_LINK_LABEL,
      date: card.latestDate,
      category: 'Software',
    })),
  ]
}

function sortAnnouncements(items: Announcement[]): Announcement[] {
  return [...items].sort((a, b) => b.date.localeCompare(a.date))
}

function mergeAnnouncements(items: Announcement[]): Announcement[] {
  const seen = new Set<string>()

  return items.filter((item) => {
    const key = `${item.date}|${item.category ?? ''}|${item.href ?? ''}|${item.text}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function getAnnouncements(): Announcement[] {
  // Auto-discovered route/upload activity is intentionally excluded.
  // Only curated manual announcements and structured release entries
  // (VMware patch bundles, Visual Studio versions) reach /home.
  const detected = getStructuredReleaseAnnouncements()

  return sortAnnouncements(mergeAnnouncements([...MANUAL_ANNOUNCEMENTS, ...detected]))
}

export { DEFAULT_VISIBLE }
