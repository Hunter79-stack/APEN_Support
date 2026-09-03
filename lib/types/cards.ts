/**
 * Shared card type definitions — APEN Support Site
 *
 * All card data arrays across the site extend these base types.
 * Import from '@/lib/types/cards' in both data files and components.
 */

import type { ReactNode } from 'react'
import type { GlowColorName } from '@/lib/data/card-colors'

/* ─── Glow colour palette (matches spotlight-card.tsx) ───── */
export type GlowColor = GlowColorName

/* ─── Base card — every card type extends this ───────────── */
export interface BaseCard {
  id: string
  title: string
  description: string
  glowColor: GlowColor
  tags: string[]
}

/* ─── Navigation card — links to another page ────────────── */
export interface NavCard extends BaseCard {
  logo: string
  href: string
  hrefLabel: string
  itemCount?: string
}

/* ─── Download card — one or more download links ─────────── */
export interface DownloadLink {
  label: string
  href: string
  desc?: string
  isDoc?: boolean
}

export interface DownloadCard extends BaseCard {
  logo: string
  downloads: DownloadLink[]
}

/* ─── Documentation card — release notes / guides / references ─── */
export interface DocLink {
  label: string
  href: string
  /** Visual hint for the link icon. Internal hrefs (starting with "/") render
   *  as in-app navigation; everything else opens in a new tab. */
  kind?: 'release-notes' | 'upgrade' | 'guide' | 'reference' | 'doc'
}

export interface DocCard extends BaseCard {
  logo?: string
  links: DocLink[]
}

/* ─── ISO card — single-file download ────────────────────── */
export interface ISOCard extends BaseCard {
  logo: string
  file: string
  /** Full download URL (derived from BASE + file) */
  href: string
}

/* ─── VMware product card — installer + optional patches ─── */
export interface PatchEntry {
  build: string
  release: string
  dlHref: string
  notesHref: string
}

export interface InstallerInfo {
  label: string
  href: string
  desc: string
}

export interface VMwareProductCard extends BaseCard {
  logo: string
  version?: string
  installer: InstallerInfo
  updateBundle?: InstallerInfo
  patches?: PatchEntry[]
}

/* ─── Repo card — repository setup with code snippets ────── */
export interface RepoCard extends BaseCard {
  logo: string
  codename?: string
  repoLine: string
  sourceFile: string
}

/* ─── RPM repo card — grouped repo files ─────────────────── */
export interface RepoFileEntry {
  label: string
  file: string
  href: string
}

export interface RPMRepoCard extends BaseCard {
  logo: string
  accent?: string
  repos: RepoFileEntry[]
}

/* ─── FAQ card ────────────────────────────────────────────── */
export interface FAQCard extends BaseCard {
  answer: string
}

/* ─── Grid configuration ─────────────────────────────────── */
export interface CardGridConfig {
  /** Tailwind grid classes, e.g. 'sm:grid-cols-2 lg:grid-cols-4' */
  gridCols: string
  /** Scale factor when card is expanded (default 1.08) */
  scaleFactor?: number
  /** Gap class override (default 'gap-6') */
  gap?: string
}

/* ─── ExpandableCardGrid props ───────────────────────────── */
export interface ExpandableCardGridProps<T extends BaseCard> {
  cards: T[]
  config: CardGridConfig
  /** Render the card body (logo, title, desc, tags). Uses default if omitted. */
  renderCard?: (card: T, isOpen: boolean) => ReactNode
  /** Render expanded content below the card body */
  renderExpanded?: (card: T) => ReactNode
  /** Render the collapsed footer hint. Defaults to "Click to view →" */
  renderFooter?: (card: T) => ReactNode
}
