import {
  DEFAULT_VISIBLE,
  MANUAL_ANNOUNCEMENTS,
  type Announcement,
} from '@/lib/data/announcements'
import { visualStudioCards } from '@/lib/data/visual-studio'
import { vmware7Products, vmware8Products, vmware9Products } from '@/lib/data/vmware'
import type { VMwareProductCard } from '@/lib/types/cards'

const AUTO_LINK_LABEL = 'View'

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
  // Auto-discovered route/upload activity is intentionally excluded (the
  // filesystem walkers that produced it were deleted as dead code, 2026-09-23).
  // Only curated manual announcements and structured release entries
  // (VMware patch bundles, Visual Studio versions) reach /home.
  const detected = getStructuredReleaseAnnouncements()

  return sortAnnouncements(mergeAnnouncements([...MANUAL_ANNOUNCEMENTS, ...detected]))
}

export { DEFAULT_VISIBLE }
