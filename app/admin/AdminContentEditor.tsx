'use client'

/**
 * AdminContentEditor — browse all editable card scopes, change a field, hit Save.
 *
 * Each "scope" is a path-like string (e.g. "vmware/v9/products"). The editor lets
 * an admin patch any card by id without touching source files. Reverting clears
 * the override and the page falls back to the static defaults shipped at build.
 */

import { useEffect, useMemo, useState } from 'react'
import { GlowCard } from '@/components/ui/spotlight-card'
import {
  adminContentClient,
  type CustomPage,
  type OverrideMap,
  type AuditEntry,
  type BuildStatus,
  type PublishTarget,
} from '@/lib/data/admin-content'
import { setDeep, deepMerge } from '@/lib/data/deep-patch'
import { AdminFileLibraryPanel, type AttachResult, type AttachTarget } from './AdminFileLibraryPanel'
import { API_ENDPOINTS } from '@/lib/data/runtime'
import { vmware9Products, vmware8Products, vmware7Products, vmwareToolCards, vmwareCategoryCards, vmwareDocCards } from '@/lib/data/vmware'
import { trellixCategoryCards, trellixDocCards } from '@/lib/data/trellix'
import { isoCategoryCards, linuxISOCards, ubuntuISOCards, windowsISOCards } from '@/lib/data/isos'
import { microsoftCategoryCards, microsoftOfficeCards, microsoftAppxCards, microsoftDocCards } from '@/lib/data/microsoft'
import { visualStudioCards, visualStudioReleases } from '@/lib/data/visual-studio'
import { ssmsReleaseCards } from '@/lib/data/sql-tools'
import { pdqCards } from '@/lib/data/pdq'
import { drenToolCards } from '@/lib/data/dren'
import { evaluateSTIGCategoryCards, evalDocCards, evalToolCards, evalStigDocCards } from '@/lib/data/evaluate-stig'
import { docsCategoryCards, elCategoryCards, ubCategoryCards, facproCategoryCards, faqCards } from '@/lib/data/docs'
import { reposCategoryCards } from '@/lib/data/repos'
import { certsrvCards } from '@/lib/data/certsrv'
import { homepageSupportPathways, serviceLinks, servicePortals, supportLinks } from '@/lib/data/homepage'
import { SUPPORT_SERVICE_CARDS, KNOWLEDGE_BASE_CATEGORIES } from '@/lib/data/support'
import { PAGE_LOGOS, PAGE_LOGO_SECTIONS, type LogoKey, type PageLogoRoute } from '@/lib/data/logos'
import {
  ROUTE_IMAGE_CATALOG,
  ROUTE_IMAGE_OVERRIDE_SCOPE,
  findLogoKeyBySource,
  isSafeCustomRouteImageSource,
  normalizeRouteImageRegistry,
  resolveRouteImage,
  type RouteImageReference,
  type RouteImageRegistryValue,
} from '@/lib/data/route-images'
import { CheckCircle2, Edit3, LayoutGrid, Plus, RotateCcw, Save, ShieldAlert, X, AlertTriangle, Trash2, UploadCloud, Loader2, ChevronDown, ImageIcon, LogOut } from 'lucide-react'

/* ─── Editable scopes ─── */

interface EditableScalarField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'url' | 'tags'
  full?: boolean
}

/**
 * A card field holding a LIST of rows — `downloads`, `links`, `patches`.
 *
 * The old approach flattened these into fixed indexed scalars
 * (downloads.0.href … downloads.2.href), which capped every card at three rows
 * and offered no way to remove one. A list field renders the real array
 * instead: add, edit, and delete rows, however many there are.
 *
 * Row columns are named `field`, NOT `key`, on purpose. tests/card-overrides.ts
 * parses this file for `key:` to check every offered field addresses something
 * a card actually has; a column keyed `build` would resolve to a root of
 * "build", which is on no card, and fail that test. The list's own
 * `key: 'patches'` is the honest root, and it is the only one the parser sees.
 */
interface EditableListField {
  key: string
  label: string
  type: 'list'
  columns: { field: string; label: string; type: 'text' | 'url'; full?: boolean }[]
  /** Button text, e.g. "Add patch". Defaults to "Add row". */
  addLabel?: string
  full?: boolean
}

type EditableField = EditableScalarField | EditableListField

function isListField(field: EditableField): field is EditableListField {
  return field.type === 'list'
}

interface EditableScope {
  scope: string
  /** Top-level group the dropdown uses for its <optgroup> headers (e.g. "VMware"). */
  productFamily: string
  /** Concise dropdown option label without the family prefix (e.g. "Landing page categories"). */
  sectionName: string
  /** Long-form label kept for backwards compatibility / display in the audit log. */
  label: string
  description: string
  /** Static defaults the editor compares against to pre-fill the form. */
  defaults: Array<Record<string, unknown> & { id: string; title: string }>
  fields: EditableField[]
}

/** Common card-shape fields. Centralised so each scope reuses them. */
const COMMON_CARD_FIELDS: EditableField[] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'description', label: 'Description', type: 'textarea', full: true },
  { key: 'logo', label: 'Logo path/URL', type: 'url' },
  { key: 'tags', label: 'Tags', type: 'tags' },
]

/**
 * Cards that carry a LIST of downloads (label + href per row) rather than one
 * installer href. This used to be three fixed slots, which meant a card could
 * never gain a fourth link or lose one — the reason VMware Workstation Pro's
 * builds and the VMware 8 patch history had to be maintained by hand.
 */
const DOWNLOAD_LIST_FIELDS: EditableField[] = [
  {
    key: 'downloads',
    label: 'Download links',
    type: 'list',
    addLabel: 'Add download',
    full: true,
    columns: [
      { field: 'label', label: 'Label', type: 'text', full: true },
      { field: 'href', label: 'URL', type: 'url', full: true },
    ],
  },
]

/**
 * Documentation cards keep their links in a `links` list (label + href + kind).
 * `kind` is not offered: it only picks the link icon, and the source default
 * survives a row edit because rows deep-merge slot by slot.
 */
const LINKS_LIST_FIELDS: EditableField[] = [
  {
    key: 'links',
    label: 'Document links',
    type: 'list',
    addLabel: 'Add link',
    full: true,
    columns: [
      { field: 'label', label: 'Label', type: 'text', full: true },
      { field: 'href', label: 'URL', type: 'url', full: true },
    ],
  },
]

/**
 * VMware product cards keep their update history in a `patches` array. Until
 * now nothing in Admin addressed it, so publishing a new ESXi or vCenter patch
 * meant editing lib/data/vmware.ts by hand — or editing the legacy HTML under
 * /var/www/html/vmware, which is what admins actually did.
 */
const PATCH_LIST_FIELDS: EditableField[] = [
  {
    key: 'patches',
    label: 'Patch history',
    type: 'list',
    addLabel: 'Add patch',
    full: true,
    columns: [
      { field: 'build', label: 'Build', type: 'text' },
      { field: 'release', label: 'Release date (YYYY-MM-DD)', type: 'text' },
      { field: 'dlHref', label: 'Download URL', type: 'url', full: true },
      { field: 'notesHref', label: 'Release notes URL', type: 'url', full: true },
    ],
  },
]

/** Route-linked cards use the dedicated route-image registry below so one
 * Admin choice updates their header, card, and navigation icon together. */
const REGISTRY_LOGO_CARD_FIELDS: EditableField[] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'description', label: 'Description', type: 'textarea', full: true },
  { key: 'tags', label: 'Tags', type: 'tags' },
]

/** Link-tile fields for the /home grids — these cards carry a logo + href but
 *  no tags. */
const LINK_TILE_FIELDS: EditableField[] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'description', label: 'Description', type: 'textarea', full: true },
  { key: 'logo', label: 'Logo path/URL', type: 'url' },
  { key: 'href', label: 'Link URL', type: 'url', full: true },
]

const EDITABLE_SCOPE_DEFINITIONS: EditableScope[] = [

  /* ─── Certificate Services ────────────────────────────── */
  {
    scope: 'certsrv/cards',
    productFamily: 'Certificate Services',
    sectionName: 'CA / Cert request wizards',
    label: 'Certificate Services — wizard cards',
    description: 'Two cards on /certsrv — the CA Certificate Setup Wizard and the Cert Request Wizard.',
    defaults: certsrvCards as unknown as EditableScope['defaults'],
    fields: [...COMMON_CARD_FIELDS, { key: 'itemCount', label: 'Item-count badge', type: 'text' }],
  },

  /* ─── Documentation ───────────────────────────────────── */
  {
    scope: 'docs/landing/cards',
    productFamily: 'Documentation',
    sectionName: 'Landing page categories',
    label: 'Docs — landing categories',
    description: 'Top-level cards on /docs — Enterprise Linux, Ubuntu, and FacilitatePro.',
    defaults: docsCategoryCards as unknown as EditableScope['defaults'],
    fields: REGISTRY_LOGO_CARD_FIELDS,
  },
  {
    scope: 'docs/el/categories',
    productFamily: 'Documentation',
    sectionName: 'Enterprise Linux sub-categories',
    label: 'Docs — Enterprise Linux sub-categories',
    description: 'AD, certificates, system-settings sub-cards on /docs/el.',
    defaults: elCategoryCards as unknown as EditableScope['defaults'],
    fields: REGISTRY_LOGO_CARD_FIELDS,
  },
  {
    scope: 'docs/ub/categories',
    productFamily: 'Documentation',
    sectionName: 'Ubuntu sub-categories',
    label: 'Docs — Ubuntu sub-categories',
    description: 'AD, certificates, storage, system-settings sub-cards on /docs/ub.',
    defaults: ubCategoryCards as unknown as EditableScope['defaults'],
    fields: REGISTRY_LOGO_CARD_FIELDS,
  },
  {
    scope: 'docs/facpro/categories',
    productFamily: 'Documentation',
    sectionName: 'FacilitatePro sub-categories',
    label: 'Docs — FacilitatePro sub-categories',
    description: 'Video Guides and FAQ sub-cards on /docs/facpro.',
    defaults: facproCategoryCards as unknown as EditableScope['defaults'],
    fields: [...REGISTRY_LOGO_CARD_FIELDS, { key: 'itemCount', label: 'Item-count badge', type: 'text' }],
  },
  {
    scope: 'docs/facpro/faq',
    productFamily: 'Documentation',
    sectionName: 'FacilitatePro FAQ entries',
    label: 'Docs — FacilitatePro FAQ entries',
    description: 'Question-and-answer cards on /docs/facpro/faq.',
    defaults: faqCards as unknown as EditableScope['defaults'],
    fields: [
      { key: 'title', label: 'Question', type: 'text', full: true },
      { key: 'answer', label: 'Answer', type: 'textarea', full: true },
      { key: 'tags', label: 'Tags', type: 'tags' },
    ],
  },

  /* ─── DREN Admin Tools ────────────────────────────────── */
  {
    scope: 'dren/landing/cards',
    productFamily: 'DREN',
    sectionName: 'DREN admin tools',
    label: 'DREN — admin tools',
    description: 'Tool cards on /dren — Trellix for Linux on DREN and the Cisco DREN Repository.',
    defaults: drenToolCards as unknown as EditableScope['defaults'],
    fields: [
      ...COMMON_CARD_FIELDS,
      { key: 'href', label: 'Tool URL', type: 'url', full: true },
    ],
  },

  /* ─── Evaluate-STIG ───────────────────────────────────── */
  {
    scope: 'evaluate-stig/landing/cards',
    productFamily: 'Evaluate-STIG',
    sectionName: 'Landing page categories',
    label: 'Evaluate-STIG — landing categories',
    description: 'Top-level categories on /evaluate-stig — Documents, Enterprise Linux, Ubuntu.',
    defaults: evaluateSTIGCategoryCards as unknown as EditableScope['defaults'],
    fields: COMMON_CARD_FIELDS,
  },
  {
    scope: 'evaluate-stig/documents',
    productFamily: 'Evaluate-STIG',
    sectionName: 'Document & viewer downloads',
    label: 'Evaluate-STIG — document & viewer downloads',
    description: 'User Guide, ChangeLog, and the STIG-Manager guide on /docs/evaluate-stig/documents.',
    defaults: evalDocCards as unknown as EditableScope['defaults'],
    // The cards carry a `downloads` list like evaluate-stig/downloads below;
    // with COMMON_CARD_FIELDS alone the PDF rows were neither editable nor
    // offered by "Use in a card".
    fields: [...COMMON_CARD_FIELDS, ...DOWNLOAD_LIST_FIELDS],
  },
  {
    scope: 'evaluate-stig/downloads',
    productFamily: 'Evaluate-STIG',
    sectionName: 'Tool downloads (STIG Viewer, STIG library)',
    label: 'Evaluate-STIG — tool downloads',
    description: 'STIG Viewer builds and the STIG library / GPO package on /downloads/evaluate-stig.',
    defaults: evalToolCards as unknown as EditableScope['defaults'],
    fields: [...COMMON_CARD_FIELDS, ...DOWNLOAD_LIST_FIELDS],
  },

  /* ─── Homepage ────────────────────────────────────────── */
  {
    scope: 'home/pathways',
    productFamily: 'Homepage',
    sectionName: 'Where should I start? pathways',
    label: 'Homepage — "Where should I start?" pathways',
    description: 'Entry-point tiles in the "Where should I start?" grid on /home.',
    defaults: homepageSupportPathways as unknown as EditableScope['defaults'],
    fields: LINK_TILE_FIELDS,
  },
  {
    scope: 'home/services',
    productFamily: 'Homepage',
    sectionName: 'Operational Services tiles',
    label: 'Homepage — Operational Services tiles',
    description: 'Live operational service tiles in the "Operational Services" grid on /home.',
    defaults: serviceLinks as unknown as EditableScope['defaults'],
    fields: LINK_TILE_FIELDS,
  },
  {
    scope: 'home/service-portals',
    productFamily: 'Homepage',
    sectionName: 'Service Portals tiles',
    label: 'Homepage — Service Portals tiles',
    description: 'Enclave-only on-network portal tiles in the "Service Portals" grid on /home.',
    defaults: servicePortals as unknown as EditableScope['defaults'],
    fields: LINK_TILE_FIELDS,
  },
  {
    scope: 'home/quick-links',
    productFamily: 'Homepage',
    sectionName: 'Quick Links Library tiles',
    label: 'Homepage — Quick Links Library tiles',
    description: 'Reference tiles in the "Quick Links Library" grid on /home.',
    defaults: supportLinks as unknown as EditableScope['defaults'],
    fields: LINK_TILE_FIELDS,
  },

  /* ─── ISOs ────────────────────────────────────────────── */
  {
    scope: 'isos/landing/groups',
    productFamily: 'ISOs',
    sectionName: 'Landing page categories',
    label: 'ISOs — landing page categories',
    description: 'Top-level groups on /isos linking to Enterprise Linux, Ubuntu, and Windows ISO collections.',
    defaults: isoCategoryCards as unknown as EditableScope['defaults'],
    fields: COMMON_CARD_FIELDS,
  },
  {
    scope: 'isos/enterprise-linux',
    productFamily: 'ISOs',
    sectionName: 'Enterprise Linux ISOs',
    label: 'ISOs — Enterprise Linux',
    description: 'AlmaLinux, RockyLinux, and CentOS DVD ISO download cards on /isos/enterprise-linux.',
    defaults: linuxISOCards as unknown as EditableScope['defaults'],
    fields: [
      ...COMMON_CARD_FIELDS,
      { key: 'file', label: 'Filename', type: 'text', full: true },
      { key: 'href', label: 'Download URL', type: 'url', full: true },
    ],
  },
  {
    scope: 'isos/ubuntu',
    productFamily: 'ISOs',
    sectionName: 'Ubuntu ISOs',
    label: 'ISOs — Ubuntu',
    description: 'Ubuntu Desktop and Server ISO download cards on /isos/ubuntu.',
    defaults: ubuntuISOCards as unknown as EditableScope['defaults'],
    fields: [
      ...COMMON_CARD_FIELDS,
      { key: 'file', label: 'Filename', type: 'text', full: true },
      { key: 'href', label: 'Download URL', type: 'url', full: true },
    ],
  },
  {
    scope: 'isos/windows',
    productFamily: 'ISOs',
    sectionName: 'Windows ISOs / Admin Center',
    label: 'ISOs — Windows',
    description: 'Windows 11, Windows Server, and Admin Center download cards on /isos/windows.',
    defaults: windowsISOCards as unknown as EditableScope['defaults'],
    fields: [
      ...COMMON_CARD_FIELDS,
      { key: 'file', label: 'Filename', type: 'text', full: true },
      { key: 'href', label: 'Download URL', type: 'url', full: true },
    ],
  },

  /* ─── Microsoft Products ──────────────────────────────── */
  {
    scope: 'microsoft/landing/cards',
    productFamily: 'Microsoft',
    sectionName: 'Landing page categories',
    label: 'Microsoft — landing page categories',
    description: 'Cards on /microsoft-products that link to Office, Store apps, Visual Studio, and SQL Tools.',
    defaults: microsoftCategoryCards as unknown as EditableScope['defaults'],
    fields: COMMON_CARD_FIELDS,
  },
  {
    scope: 'microsoft/office',
    productFamily: 'Microsoft',
    sectionName: 'Office downloads',
    label: 'Microsoft Office downloads',
    description: 'Office, Project, and Visio Professional 2021 and 2024 (ODT packages) on /downloads/microsoft-products/office.',
    defaults: microsoftOfficeCards as unknown as EditableScope['defaults'],
    // Was COMMON_CARD_FIELDS alone, which left the actual download rows and the
    // deployment instructions uneditable — an admin could reword the blurb but
    // not repoint setup.exe or fix the /configure command.
    // No command/note fields: this page is prerendered, so anything typed into
    // them would be published to every domain user. Deployment detail for these
    // titles stays with the packages in the PDQ repository.
    fields: [
      ...COMMON_CARD_FIELDS,
      {
        key: 'items',
        label: 'Download links',
        type: 'list',
        addLabel: 'Add download',
        full: true,
        columns: [
          { field: 'label', label: 'Label', type: 'text', full: true },
          { field: 'href', label: 'URL', type: 'url', full: true },
          { field: 'ext', label: 'Extension badge', type: 'text' },
        ],
      },
    ],
  },
  {
    scope: 'microsoft/store/appx',
    productFamily: 'Microsoft',
    sectionName: 'Store / AppX packages',
    label: 'Microsoft Store AppX packages',
    description: 'Paint, Snipping Tool, Windows Terminal, codecs, and other AppX packages on /microsoft-products/store.',
    defaults: microsoftAppxCards as unknown as EditableScope['defaults'],
    fields: [
      ...COMMON_CARD_FIELDS,
      { key: 'filename', label: 'AppX filename', type: 'text', full: true },
    ],
  },

  /* ─── PDQ ─────────────────────────────────────────────── */
  {
    scope: 'pdq/cards',
    productFamily: 'PDQ',
    sectionName: 'Deploy / Inventory / Repository cards',
    label: 'PDQ — Deploy, Inventory, Repository',
    description: 'Three cards on /PDQ — Deploy, Inventory, and the CESC Repository.',
    defaults: pdqCards as unknown as EditableScope['defaults'],
    fields: [
      ...COMMON_CARD_FIELDS,
      { key: 'downloadHref', label: 'Installer URL', type: 'url', full: true },
      { key: 'downloadLabel', label: 'Installer label', type: 'text', full: true },
      { key: 'repoHref', label: 'Repository URL', type: 'url', full: true },
      { key: 'xmlHref', label: 'Packages.xml URL', type: 'url', full: true },
    ],
  },

  /* ─── Repositories ────────────────────────────────────── */
  {
    scope: 'repos/landing/cards',
    productFamily: 'Repos',
    sectionName: 'Landing page categories',
    label: 'Repos — landing page categories',
    description: 'Category cards on /repos — Enterprise Linux (RPM), Ubuntu (DEB), and PIP repositories.',
    defaults: reposCategoryCards as unknown as EditableScope['defaults'],
    fields: [
      ...COMMON_CARD_FIELDS,
      { key: 'hrefLabel', label: 'Link label', type: 'text', full: true },
    ],
  },
  /* Repos — the per-distro DEB/RPM card scopes were removed: /docs/repos/deb
     and /docs/repos/rpm render RepoGuideViewer(repo-guides.json), so editing
     debRepoCards/rpmRepoCards changed nothing a visitor could ever see. A
     control that silently does nothing is worse than no control. Repo guide
     text is script-generated (scripts/extract-repo-guides.mjs) and is not
     admin-editable yet — that is a separate feature, not a scope entry. */

  /* ─── SQL Tools ───────────────────────────────────────── */
  {
    scope: 'sqltools/ssms',
    productFamily: 'SQL Tools',
    sectionName: 'SSMS release cards',
    label: 'SSMS release cards',
    description: 'SQL Server Management Studio release cards on /sqltools.',
    defaults: ssmsReleaseCards as unknown as EditableScope['defaults'],
    fields: [
      ...COMMON_CARD_FIELDS,
      { key: 'version', label: 'Version', type: 'text' },
      { key: 'date', label: 'Release date (YYYY-MM-DD)', type: 'text' },
      { key: 'installerHref', label: 'Installer download URL', type: 'url', full: true },
      { key: 'notesHref', label: 'Release notes PDF URL', type: 'url', full: true },
    ],
  },

  /* ─── Support ─────────────────────────────────────────── */
  {
    scope: 'support/services',
    productFamily: 'Support',
    sectionName: 'Service catalog cards',
    label: 'Support — service catalog cards',
    description: 'The IT Service Catalog cards on /support — Open a Ticket, Track My Tickets, Knowledge Base.',
    defaults: SUPPORT_SERVICE_CARDS as unknown as EditableScope['defaults'],
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea', full: true },
      { key: 'href', label: 'Link URL', type: 'url', full: true },
      { key: 'icon', label: 'Icon key', type: 'text' },
    ],
  },
  {
    scope: 'support/knowledge-base',
    productFamily: 'Support',
    sectionName: 'Knowledge-base categories',
    label: 'Support — knowledge-base categories',
    description: 'Category cards on /support/knowledge-base — Account Access, Network, Hardware, Software.',
    defaults: KNOWLEDGE_BASE_CATEGORIES as unknown as EditableScope['defaults'],
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'href', label: 'Link URL', type: 'url', full: true },
      { key: 'icon', label: 'Icon key', type: 'text' },
      { key: 'color', label: 'Glow color', type: 'text' },
    ],
  },

  /* ─── Trellix ─────────────────────────────────────────── */
  {
    scope: 'trellix/landing/cards',
    productFamily: 'Trellix',
    sectionName: 'Landing page categories',
    label: 'Trellix — landing page categories',
    description: 'Cards on /trellix that link to Enterprise Linux, Ubuntu, and Reference guides.',
    defaults: trellixCategoryCards as unknown as EditableScope['defaults'],
    fields: COMMON_CARD_FIELDS,
  },

  /* ─── Visual Studio ───────────────────────────────────── */
  {
    scope: 'visual-studio/editions',
    productFamily: 'Visual Studio',
    sectionName: 'Edition cards (Enterprise / Pro / Community)',
    label: 'Visual Studio — edition cards',
    description: 'Three edition cards on /downloads/microsoft-products/VisualStudio — the links out to each edition page.',
    defaults: visualStudioCards as unknown as EditableScope['defaults'],
    fields: [
      ...COMMON_CARD_FIELDS,
      { key: 'license', label: 'License note', type: 'textarea', full: true },
      { key: 'latestVersion', label: 'Latest version', type: 'text' },
      { key: 'latestDate', label: 'Latest version date', type: 'text' },
    ],
  },
  {
    scope: 'visual-studio/releases',
    productFamily: 'Visual Studio',
    sectionName: 'Release rows (all three editions)',
    label: 'Visual Studio — release rows',
    description: 'The release row on each edition page: /downloads/microsoft-products/VisualStudio/enterprise, /professional and /community. One entry per edition.',
    defaults: visualStudioReleases as unknown as EditableScope['defaults'],
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'version', label: 'Version label', type: 'text', full: true },
      { key: 'date', label: 'Release date', type: 'text' },
      { key: 'installerHref', label: 'Install guide URL', type: 'url', full: true },
      { key: 'layoutHref', label: 'Offline layout URL', type: 'url', full: true },
      { key: 'notesHref', label: 'Release notes URL', type: 'url', full: true },
    ],
  },

  /* ─── VMware ───────────────────────────────────────────── */
  {
    scope: 'vmware/landing/cards',
    productFamily: 'VMware',
    sectionName: 'Landing page categories',
    label: 'VMware — landing page categories',
    description: 'The four cards on /vmware that link to v7 / v8 / v9 / Tools.',
    defaults: vmwareCategoryCards as unknown as EditableScope['defaults'],
    fields: [...COMMON_CARD_FIELDS, { key: 'itemCount', label: 'Item-count badge', type: 'text' }],
  },
  {
    scope: 'vmware/v7/products',
    productFamily: 'VMware',
    sectionName: 'VMware 7 product cards',
    label: 'VMware 7 — product cards',
    description: 'vCenter 7 + ESXi 7 installer cards shown on /vmware/v7 (patch lists rendered alongside).',
    defaults: vmware7Products as unknown as EditableScope['defaults'],
    fields: [
      ...COMMON_CARD_FIELDS,
      { key: 'installer.label', label: 'Installer label', type: 'text', full: true },
      { key: 'installer.href', label: 'Installer href', type: 'url', full: true },
      ...PATCH_LIST_FIELDS,
    ],
  },
  {
    scope: 'vmware/v8/products',
    productFamily: 'VMware',
    sectionName: 'VMware 8 product cards',
    label: 'VMware 8 — product cards',
    description: 'vCenter 8 + ESXi 8 installer cards shown on /vmware/v8 (patch lists rendered alongside).',
    defaults: vmware8Products as unknown as EditableScope['defaults'],
    fields: [
      ...COMMON_CARD_FIELDS,
      { key: 'installer.label', label: 'Installer label', type: 'text', full: true },
      { key: 'installer.href', label: 'Installer href', type: 'url', full: true },
      { key: 'installer.desc', label: 'Installer description', type: 'textarea', full: true },
      { key: 'updateBundle.label', label: 'Update bundle label', type: 'text', full: true },
      { key: 'updateBundle.href', label: 'Update bundle URL', type: 'url', full: true },
      { key: 'updateBundle.desc', label: 'Update bundle description', type: 'textarea', full: true },
      ...PATCH_LIST_FIELDS,
    ],
  },
  {
    scope: 'vmware/v9/products',
    productFamily: 'VMware',
    sectionName: 'VMware 9 product cards',
    label: 'VMware 9 — product cards',
    description: 'vCenter 9 + ESXi 9 installer cards shown on /vmware/v9.',
    defaults: vmware9Products as unknown as EditableScope['defaults'],
    fields: [
      ...COMMON_CARD_FIELDS,
      { key: 'version', label: 'Version label', type: 'text' },
      { key: 'installer.label', label: 'Installer label', type: 'text', full: true },
      { key: 'installer.href', label: 'Installer href', type: 'url', full: true },
      { key: 'installer.desc', label: 'Installer description', type: 'textarea', full: true },
      ...PATCH_LIST_FIELDS,
    ],
  },
  {
    scope: 'vmware/tools',
    productFamily: 'VMware',
    sectionName: 'Tools / VMRC / Upgrade Guide',
    label: 'VMware Tools / VMRC / Upgrade Guide',
    description: 'Three cards on /vmware/tools — VMware Tools, VMRC, and the upgrade guide PDF.',
    defaults: vmwareToolCards as unknown as EditableScope['defaults'],
    // These cards hold their links in a `downloads` LIST, not a single href, so
    // they need indexed fields. Without them the scope had no URL field at all:
    // DOWNLOAD_ATTACH_SCOPES skipped it, "Use in a card" never offered VMware
    // Tools, and an admin could edit the wording but never the download links.
    fields: [...COMMON_CARD_FIELDS, ...DOWNLOAD_LIST_FIELDS],
  },

  /* ─── Documentation pages ─────────────────────────────────
   * The four /docs product pages were the only card grids on the site an admin
   * could not edit — their arrays rendered directly, with no scope here. */
  {
    scope: 'docs/vmware/cards',
    productFamily: 'Documentation',
    sectionName: 'VMware docs',
    label: 'VMware documentation cards',
    description: 'Upgrade guide and release-note cards shown on /docs/vmware.',
    defaults: vmwareDocCards as unknown as EditableScope['defaults'],
    fields: [...COMMON_CARD_FIELDS, ...LINKS_LIST_FIELDS],
  },
  {
    scope: 'docs/trellix/cards',
    productFamily: 'Documentation',
    sectionName: 'Trellix docs',
    label: 'Trellix documentation cards',
    description: 'Documentation cards shown on /docs/trellix.',
    defaults: trellixDocCards as unknown as EditableScope['defaults'],
    fields: [...COMMON_CARD_FIELDS, ...LINKS_LIST_FIELDS],
  },
  {
    scope: 'docs/evaluate-stig/cards',
    productFamily: 'Documentation',
    sectionName: 'Evaluate-STIG docs',
    label: 'Evaluate-STIG documentation cards',
    description: 'Documentation cards shown on /docs/evaluate-stig.',
    defaults: evalStigDocCards as unknown as EditableScope['defaults'],
    fields: [...COMMON_CARD_FIELDS, ...LINKS_LIST_FIELDS],
  },
  {
    scope: 'docs/microsoft-products/cards',
    productFamily: 'Documentation',
    sectionName: 'Microsoft docs',
    label: 'Microsoft documentation cards',
    description: 'SSMS and Visual Studio release-note cards shown on /docs/microsoft-products.',
    defaults: microsoftDocCards as unknown as EditableScope['defaults'],
    fields: [...COMMON_CARD_FIELDS, ...LINKS_LIST_FIELDS],
  },
]

const EDITABLE_SCOPES: EditableScope[] = EDITABLE_SCOPE_DEFINITIONS.map((scope) => {
  const defaultsWithLogos = scope.defaults.filter((item) => typeof item.logo === 'string')
  const allLogosManagedByRoutes = defaultsWithLogos.length > 0 && defaultsWithLogos.every((item) => (
    typeof item.href === 'string' && Object.prototype.hasOwnProperty.call(PAGE_LOGOS, item.href)
  ))

  return allLogosManagedByRoutes
    ? { ...scope, fields: scope.fields.filter((field) => field.key !== 'logo') }
    : scope
})

/* ─── Download-attach targets ─── */

/** Fields that carry a download URL, most specific first. */
const URL_FIELD_KEYS = ['downloadHref', 'installerHref', 'installer.href', 'href', 'downloads.0.href', 'links.0.href', 'items.0.href']
/** Fields that carry a bare filename alongside the URL. */
const FILE_FIELD_KEYS = ['file', 'filename']
/**
 * URL fields that may hold a site route rather than a file: category cards use
 * `href` for /downloads/iso/…, and doc rows link to pages as well as PDFs.
 * Every other name in URL_FIELD_KEYS promises a download by its wording alone
 * (installer.href, downloadHref…), so those sections qualify even while a
 * default still points at a placeholder — VMware 9's "/support" until the
 * media is mirrored.
 */
const ROUTE_CAPABLE_URL_KEYS = new Set(['href', 'links.0.href'])

/**
 * The download folder a link resolves to — "/vmware/8" for "/vmware/8/x.iso" or
 * "https://host/vmware/8/x.iso" — and "" for anything that is not a file: site
 * routes (/downloads/…), card artwork (/logos/…), extensionless paths. Links are
 * site-relative here (APENSUPPORT_BASE is ''), so this must never demand a
 * scheme; requiring https:// once dropped every VMware section from the attach
 * list.
 */
function downloadFolderOf(value: unknown): string {
  if (typeof value !== 'string') return ''
  const path = value.replace(/^https?:\/\/[^/]+/, '')
  if (!path.startsWith('/') || path.startsWith('/downloads/') || path.startsWith('/logos/')) return ''
  return /^(\/.*)\/[^/]+\.[A-Za-z0-9]{1,12}$/.exec(path)?.[1] ?? ''
}

/**
 * Sections an uploaded file can be wired into. A section qualifies when its
 * link field is a download slot by name, or when its defaults show that field
 * holding a file — category cards use `href` for a site route
 * (/downloads/iso/…), and pointing one of those at an ISO would break
 * navigation instead of publishing a download. Exported for the test.
 */
/**
 * Every dotted path a scope can address. A list field is edited a row at a
 * time, and the attach flow ("Use in a card") always fills the FIRST row, so a
 * list contributes `<key>.0.<column>` for each of its columns — the same paths
 * the fixed three-slot fields used to declare literally. Without this expansion
 * every downloads/links scope drops out of DOWNLOAD_ATTACH_SCOPES below and
 * "Use in a card" silently stops offering VMware Tools and the docs pages.
 */
function addressableFieldKeys(fields: EditableField[]): string[] {
  return fields.flatMap((field) => (
    isListField(field)
      ? field.columns.map((column) => `${field.key}.0.${column.field}`)
      : [field.key]
  ))
}

export const DOWNLOAD_ATTACH_SCOPES = EDITABLE_SCOPES.flatMap((scope) => {
  const addressable = addressableFieldKeys(scope.fields)
  const urlField = URL_FIELD_KEYS.find((key) => addressable.includes(key))
  if (!urlField) return []
  const fileField = FILE_FIELD_KEYS.find((key) => addressable.includes(key))
  const linksToFiles = Boolean(fileField)
    || !ROUTE_CAPABLE_URL_KEYS.has(urlField)
    || scope.defaults.some((card) => {
      const value = getDeep(card, urlField)
      // Absolute links still count so the tiles that point off-site keep
      // their (pre-existing) attach option.
      return typeof value === 'string' && (/^https?:\/\//.test(value) || downloadFolderOf(value) !== '')
    })
  if (!linksToFiles) return []
  return [{ scope, urlField, fileField }]
})

/**
 * The download folder a section's files already live in, e.g. "/vmware/8".
 *
 * Read off the section's own default links rather than configured per scope, so
 * a new section needs no extra wiring and the two can't drift. Every string in
 * the card that looks like a path to a file votes for its directory; the
 * directory most of them agree on wins. Cards whose links are site routes
 * (/downloads/…) yield nothing, which is the correct answer for them.
 */
function downloadPrefixVotes(cards: ReadonlyArray<Record<string, unknown>>): Map<string, number> {
  const votes = new Map<string, number>()
  const walk = (value: unknown, seen: Set<object>) => {
    if (typeof value === 'string') {
      // Same file-vs-route rule the attach list uses, so a section can never
      // be offered for attaching yet map to no folder (or vice versa).
      const folder = downloadFolderOf(value)
      if (folder) votes.set(folder, (votes.get(folder) ?? 0) + 1)
      return
    }
    if (!value || typeof value !== 'object' || seen.has(value)) return
    seen.add(value)
    for (const child of Object.values(value)) walk(child, seen)
  }
  for (const card of cards) walk(card, new Set())
  return votes
}

function commonDownloadPrefix(cards: ReadonlyArray<Record<string, unknown>>): string {
  let best = ''
  let bestCount = 0
  for (const [prefix, count] of downloadPrefixVotes(cards)) {
    if (count > bestCount) { best = prefix; bestCount = count }
  }
  return best
}

/** EVERY folder a section's cards link into, most-linked first. A section like
 *  Tools / VMRC spans two folders — its URL dropdown must offer both. */
function downloadPrefixes(cards: ReadonlyArray<Record<string, unknown>>): string[] {
  return [...downloadPrefixVotes(cards).entries()].sort((a, b) => b[1] - a[1]).map(([prefix]) => prefix)
}

/**
 * The page a scope edits, read out of its own description (every description
 * names its route, e.g. "shown on /docs/vmware"). Shown in the pickers so an
 * admin never has to guess which page a section maps to — and derived rather
 * than configured, so it can't go stale separately.
 */
function scopeRoute(description: string): string {
  return /(\/[A-Za-z0-9_/-]+)/.exec(description)?.[1] ?? ''
}

/* ─── Field helpers ─── */

function getDeep(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in acc) {
      return (acc as Record<string, unknown>)[part]
    }
    return undefined
  }, obj)
}


function fieldStringValue(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function parseFieldValue(field: EditableField, raw: string): unknown {
  if (field.type === 'tags') {
    return raw.split(',').map((t) => t.trim()).filter(Boolean)
  }
  return raw
}

/** Derive a stable, url-safe card id from a title, e.g. "Ubuntu 26.04 Desktop"
 *  → "ubuntu-26-04-desktop". Used to auto-suggest a new id when an admin renames
 *  a card, until they hand-edit the id field themselves. */
function slugify(input: string): string {
  return String(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // any run of non-alphanumerics → single hyphen
    .replace(/^-+|-+$/g, '')     // trim leading/trailing hyphens
}

/* ─── Token gate ─── */

/**
 * Probes the admin API on mount. Three outcomes:
 *
 *   - "open"       — the proxy has no ADMIN_API_TOKEN configured. Skip the
 *                    token form entirely and unlock the editor.
 *   - "needToken"  — proxy returned 401. Show the form so the admin can paste
 *                    the value from their .env.local.
 *   - "offline"    — couldn't reach the proxy at all. Show a helpful error.
 */
/**
 * SessionGate — LDAP-bound login form for the admin area.
 *
 * Probe order on mount:
 *   1) whoami() — do we already have a valid session cookie? If yes, unlock.
 *   2) GET /api/admin/content-overrides — does the proxy accept us anyway?
 *      (proxy may be running without ADMIN_API_TOKEN set, or nginx may have
 *      injected the legacy token for us.) If yes, unlock.
 *   3) Render the login form. Submitting calls /api/auth/login, which LDAP-
 *      binds and (on success) sets a HttpOnly session cookie. If the server
 *      reports LDAP-not-configured (503), fall back to the legacy paste-token
 *      form so the existing flow keeps working until LDAP is wired up.
 */
function SessionGate({ onAuthorized }: { onAuthorized: () => void }) {
  const [pasteToken, setPasteToken] = useState('')
  const [error, setError] = useState('')
  const [probeState, setProbeState] = useState<'probing' | 'open' | 'needLogin' | 'insufficientPrivileges' | 'needToken' | 'offline'>('probing')
  const [whoamiUsername, setWhoamiUsername] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // 1) Session cookie path. By the time anyone reaches /admin, nginx's
      // site-wide auth_request gate has already required SOME valid session
      // (general or admin) — so "not authenticated at all" here should only
      // happen via direct proxy access during development, not in normal
      // browser use. A general (non-admin) session is the expected case for
      // someone on an allowlisted IP who hasn't been added to the admin
      // group yet.
      const who = await adminContentClient.whoami()
      if (cancelled) return
      if (who && who.admin) {
        setProbeState('open')
        onAuthorized()
        return
      }
      if (who && who.username) {
        setWhoamiUsername(who.username)
        setProbeState('insufficientPrivileges')
        return
      }
      // 2) Open-proxy path (or nginx-injected token) — legacy fallback for
      // when LDAP isn't configured at all yet.
      adminContentClient.clearToken()
      try {
        const res = await fetch(API_ENDPOINTS.adminContentOverrides, { cache: 'no-store', credentials: 'include' })
        if (cancelled) return
        if (res.ok) {
          const data = await res.json().catch(() => null)
          if (data && data.adminTokenRequired === false) {
            setProbeState('open')
            onAuthorized()
            return
          }
        }
        if (res.status === 401) { setProbeState('needLogin'); return }
        setProbeState('offline')
      } catch {
        if (!cancelled) setProbeState('offline')
      }
    })()
    return () => { cancelled = true }
  }, [onAuthorized])

  if (probeState === 'probing' || probeState === 'open') {
    return (
      <GlowCard glowColor="cyan" className="p-5">
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Checking admin session…</p>
      </GlowCard>
    )
  }

  if (probeState === 'offline') {
    return (
      <GlowCard glowColor="orange" className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-amber-300" />
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white">Admin proxy unreachable</p>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          The browser couldn&apos;t reach <code className="text-cyan-400">/api/admin/content-overrides</code>. Make sure the
          site-stats proxy is running alongside Next.js:
        </p>
        <pre className="mt-3 p-3 rounded-lg bg-black/40 border border-white/10 text-xs text-cyan-300 font-mono overflow-x-auto">npm run dev:all</pre>
        <button
          onClick={() => setProbeState('probing')}
          className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 text-[10px] font-black uppercase tracking-widest text-cyan-300 hover:bg-cyan-400/20"
        >
          Retry
        </button>
      </GlowCard>
    )
  }

  if (probeState === 'needToken') {
    // LDAP isn't configured on this server — show the legacy paste form.
    return (
      <GlowCard glowColor="cyan" className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert size={16} className="text-cyan-300" />
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white">Admin Token Required (legacy)</p>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed mb-3">
          LDAP login isn&apos;t configured yet on this server. Use the legacy
          token from <code className="text-cyan-400">.env.local</code>&apos;s
          <code className="text-cyan-400 mx-1">ADMIN_API_TOKEN</code> entry to unlock the editor.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setError('')
            adminContentClient.setToken(pasteToken)
            const data = await adminContentClient.fetchAll()
            if (!data) {
              setError('Token rejected by the proxy. Double-check the value of ADMIN_API_TOKEN in .env.local.')
              return
            }
            onAuthorized()
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            type="password"
            value={pasteToken}
            onChange={(e) => setPasteToken(e.target.value)}
            placeholder="Paste the value of ADMIN_API_TOKEN"
            className="h-10 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
          />
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 text-[10px] font-black uppercase tracking-widest text-cyan-300 hover:bg-cyan-400/20"
          >
            Unlock editor
          </button>
        </form>
        {error && (
          <p className="mt-3 flex items-center gap-2 text-xs text-red-300">
            <AlertTriangle size={12} /> {error}
          </p>
        )}
      </GlowCard>
    )
  }

  if (probeState === 'insufficientPrivileges') {
    // A valid, logged-in (general) session, but not admin-kind — reachable
    // when someone on an allowlisted admin-workstation IP hasn't been added
    // to the realm's admin group. There's no in-page login form anymore:
    // the site-wide gate at /login/ already handled authentication before
    // this component ever mounted, so the only thing missing is privilege,
    // not identity.
    return (
      <GlowCard glowColor="orange" className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert size={16} className="text-amber-300" />
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white">Not an admin</p>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          You&apos;re signed in as <span className="text-cyan-300 font-semibold">{whoamiUsername}</span>, but
          that account isn&apos;t a member of the admin group for its realm. Contact a CESC administrator if you
          need admin access.
        </p>
        <p className="mt-3 text-xs text-slate-500 leading-relaxed">
          Just been added to the admin group? Your current session was issued before that change — sign out and
          back in to pick it up (session privilege is decided once, at login, not re-checked on every page).
        </p>
        <button
          onClick={async () => { await adminContentClient.logout(); window.location.href = '/login/' }}
          className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-cyan-400/30 hover:text-cyan-300"
        >
          <LogOut size={12} /> Sign out
        </button>
      </GlowCard>
    )
  }

  // Default: needLogin. Normally unreachable in production — nginx's
  // site-wide auth_request gate redirects an unauthenticated visitor to
  // /login/ before this page's JS ever runs. Kept as a defensive fallback
  // (e.g. hitting the dev server directly without nginx in front of it).
  return (
    <GlowCard glowColor="cyan" className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert size={16} className="text-cyan-300" />
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white">Sign-in required</p>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed mb-4">
        No active session was found. Sign in first, then come back to this page.
      </p>
      <a
        href="/login/"
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 text-[10px] font-black uppercase tracking-widest text-cyan-300 hover:bg-cyan-400/20"
      >
        Go to sign in
      </a>
    </GlowCard>
  )
}

/* ─── Registered route-image editor ─── */

type RouteImageSourceMode = 'catalog' | 'asset' | 'path' | 'upload'

interface RouteImageEditorDraft {
  route: PageLogoRoute
  sourceMode: RouteImageSourceMode
  catalogKey: LogoKey
  assetId: string
  customPath: string
  uploadFile: File | null
}

const ROUTE_IMAGE_SECTION_OPTIONS = Object.entries(PAGE_LOGO_SECTIONS) as Array<[
  string,
  Readonly<Record<string, string>>,
]>
const FIRST_REGISTERED_ROUTE = Object.keys(PAGE_LOGOS)[0] as PageLogoRoute

function createRouteImageEditorDraft(
  route: PageLogoRoute,
  registry: RouteImageRegistryValue,
): RouteImageEditorDraft {
  const reference = registry.routes[route]
  const fallbackKey = findLogoKeyBySource(PAGE_LOGOS[route]) ?? ROUTE_IMAGE_CATALOG[0].key
  return {
    route,
    sourceMode: reference?.kind === 'asset' ? 'asset' : 'catalog',
    catalogKey: reference?.kind === 'catalog' ? reference.key : fallbackKey,
    assetId: reference?.kind === 'asset' ? reference.id : '',
    customPath: '',
    uploadFile: null,
  }
}

function routeImageStateSignature(registry: RouteImageRegistryValue, route: PageLogoRoute) {
  const reference = registry.routes[route]
  const asset = reference?.kind === 'asset' ? registry.assets[reference.id] : undefined
  return JSON.stringify({ reference: reference ?? null, asset: asset ?? null })
}

function pruneUnusedRouteAssets(registry: RouteImageRegistryValue): RouteImageRegistryValue {
  const usedIds = new Set(
    Object.values(registry.routes)
      .filter((reference): reference is Extract<RouteImageReference, { kind: 'asset' }> => reference?.kind === 'asset')
      .map((reference) => reference.id),
  )
  return {
    schemaVersion: 1,
    routes: registry.routes,
    assets: Object.fromEntries(Object.entries(registry.assets).filter(([id]) => usedIds.has(id))),
  }
}

function createRouteAssetId(label: string) {
  const stem = slugify(label).slice(0, 52) || 'route-image'
  return `${stem}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function RegisteredRouteImageEditor({
  overrides,
  published,
  onSaved,
}: {
  overrides: OverrideMap
  published: OverrideMap
  onSaved: () => Promise<void>
}) {
  // `selectedRoute` always holds a valid route so every derived value below
  // stays type-safe; `routeChosen` is what decides whether the editor is shown,
  // so the card opens blank instead of pre-selecting the first route.
  const [selectedRoute, setSelectedRoute] = useState<PageLogoRoute>(FIRST_REGISTERED_ROUTE)
  const [routeChosen, setRouteChosen] = useState(false)
  const [draft, setDraft] = useState<RouteImageEditorDraft | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const liveValue = overrides[ROUTE_IMAGE_OVERRIDE_SCOPE]?.value
  const publishedValue = published[ROUTE_IMAGE_OVERRIDE_SCOPE]?.value
  const liveRegistry = useMemo(() => normalizeRouteImageRegistry(liveValue), [liveValue])
  const publishedRegistry = useMemo(() => normalizeRouteImageRegistry(publishedValue), [publishedValue])
  const availableAssets = useMemo(
    () => ({ ...publishedRegistry.assets, ...liveRegistry.assets }),
    [liveRegistry.assets, publishedRegistry.assets],
  )
  const activeDraft = draft?.route === selectedRoute
    ? draft
    : createRouteImageEditorDraft(selectedRoute, liveRegistry)
  const { sourceMode, catalogKey, assetId, customPath, uploadFile } = activeDraft
  const unpublishedRouteCount = useMemo(
    () => (Object.keys(PAGE_LOGOS) as PageLogoRoute[]).filter((route) => (
      routeImageStateSignature(liveRegistry, route) !== routeImageStateSignature(publishedRegistry, route)
    )).length,
    [liveRegistry, publishedRegistry],
  )

  const currentReference = liveRegistry.routes[selectedRoute]
  const effectiveSrc = resolveRouteImage(selectedRoute, liveValue, PAGE_LOGOS[selectedRoute]) ?? PAGE_LOGOS[selectedRoute]
  const defaultKey = findLogoKeyBySource(PAGE_LOGOS[selectedRoute])
  const hasRouteOverride = Boolean(currentReference)

  const draftPreview = sourceMode === 'catalog'
    ? ROUTE_IMAGE_CATALOG.find((entry) => entry.key === catalogKey)?.src
    : sourceMode === 'asset'
      ? availableAssets[assetId]?.src
      : sourceMode === 'path' && isSafeCustomRouteImageSource(customPath)
        ? customPath.trim()
        : effectiveSrc

  async function saveRouteImage() {
    if (status === 'saving') return
    setStatus('saving')
    setMessage('')

    const next: RouteImageRegistryValue = {
      schemaVersion: 1,
      routes: { ...liveRegistry.routes },
      assets: { ...liveRegistry.assets },
    }
    let reference: RouteImageReference

    if (sourceMode === 'catalog') {
      reference = { kind: 'catalog', key: catalogKey }
    } else if (sourceMode === 'asset') {
      const asset = availableAssets[assetId]
      if (!asset) {
        setStatus('error')
        setMessage('Choose an uploaded image first.')
        return
      }
      next.assets[assetId] = asset
      reference = { kind: 'asset', id: assetId }
    } else if (sourceMode === 'path') {
      const src = customPath.trim()
      if (!isSafeCustomRouteImageSource(src)) {
        setStatus('error')
        setMessage('Use a same-origin image path inside the site logo directory.')
        return
      }
      const existing = Object.entries(next.assets).find(([, asset]) => asset.src === src)
      const id = existing?.[0] ?? createRouteAssetId(src.split('/').pop() || 'route-image')
      next.assets[id] = existing?.[1] ?? { src, label: src.split('/').pop() || id }
      reference = { kind: 'asset', id }
    } else {
      if (!uploadFile) {
        setStatus('error')
        setMessage('Choose a PNG, JPEG, WebP, or GIF file first.')
        return
      }
      const upload = await adminContentClient.uploadLogo(uploadFile)
      if (!upload.ok || !isSafeCustomRouteImageSource(upload.src)) {
        setStatus('error')
        setMessage(upload.ok ? 'The server returned an invalid image path.' : upload.error)
        return
      }
      const id = createRouteAssetId(upload.filename)
      next.assets[id] = {
        src: upload.src,
        label: uploadFile.name,
        mime: upload.contentType,
        uploadedAt: new Date().toISOString(),
      }
      reference = { kind: 'asset', id }
    }

    next.routes[selectedRoute] = reference
    const result = await adminContentClient.saveOverride(
      ROUTE_IMAGE_OVERRIDE_SCOPE,
      pruneUnusedRouteAssets(next),
      'admin-ui',
    )
    if (!result.ok) {
      setStatus('error')
      setMessage(result.error)
      return
    }
    setStatus('saved')
    setMessage('Live across registered route consumers now; Publish to bake it into the static build.')
    setDraft(null)
    setFileInputKey((value) => value + 1)
    await onSaved()
  }

  async function revertRouteImage() {
    if (!hasRouteOverride || status === 'saving') return
    setStatus('saving')
    setMessage('')
    const next: RouteImageRegistryValue = {
      schemaVersion: 1,
      routes: { ...liveRegistry.routes },
      assets: { ...liveRegistry.assets },
    }
    delete next.routes[selectedRoute]
    const pruned = pruneUnusedRouteAssets(next)
    const result = Object.keys(pruned.routes).length === 0
      ? await adminContentClient.revertOverride(ROUTE_IMAGE_OVERRIDE_SCOPE, 'admin-ui')
      : await adminContentClient.saveOverride(ROUTE_IMAGE_OVERRIDE_SCOPE, pruned, 'admin-ui')
    if (!result.ok) {
      setStatus('error')
      setMessage(result.error)
      return
    }
    setStatus('saved')
    setMessage('Reverted live to the logos.ts route default. Publish to make the revert durable.')
    setDraft(null)
    await onSaved()
  }

  return (
    <div id="registered-route-images">
    <GlowCard glowColor={unpublishedRouteCount > 0 ? 'amber' : 'cyan'} className="p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ImageIcon size={16} className="text-cyan-300" />
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-white">Registered route images</h3>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
            One saved choice updates the selected route&apos;s page header, linked cards, and navigation icon.
            Catalog choices keep pointing to a semantic key in <code className="text-cyan-300">logos.ts</code>;
            uploads are stored once and referenced by id.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-300">
            {Object.keys(PAGE_LOGOS).length} routes
          </span>
          {unpublishedRouteCount > 0 && (
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-200">
              ⚑ {unpublishedRouteCount} unpublished
            </span>
          )}
        </div>
      </div>

      {/* Route picker stays visible; everything below it waits for a choice. */}
      <div className="mt-5 lg:max-w-md">
        <label htmlFor="route-image-route" className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Registered route
        </label>
        <select
          id="route-image-route"
          value={routeChosen ? selectedRoute : ''}
          onChange={(event) => {
            const next = event.target.value
            setRouteChosen(next !== '')
            if (next !== '') setSelectedRoute(next as PageLogoRoute)
            setDraft(null)
            setStatus('idle')
            setMessage('')
            setFileInputKey((value) => value + 1)
          }}
          className="mt-1 h-11 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
        >
          <option value="">— Choose a route —</option>
          {ROUTE_IMAGE_SECTION_OPTIONS.map(([section, routes]) => (
            <optgroup key={section} label={section}>
              {Object.keys(routes).map((route) => <option key={route} value={route}>{route}</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      {!routeChosen && (
        <p className="mt-4 rounded-lg border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center text-xs text-slate-500">
          Choose a route above to see its current image and change it.
        </p>
      )}

      {routeChosen && (
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="route-image-source-mode" className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Image source
              </label>
              <select
                id="route-image-source-mode"
                value={sourceMode}
                onChange={(event) => setDraft({ ...activeDraft, sourceMode: event.target.value as RouteImageSourceMode })}
                className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
              >
                <option value="catalog">logos.ts catalog</option>
                <option value="asset" disabled={Object.keys(availableAssets).length === 0}>Previously uploaded image</option>
                <option value="path">Existing site image path</option>
                <option value="upload">Upload a new image</option>
              </select>
            </div>

            {sourceMode === 'catalog' && (
              <div>
                <label htmlFor="route-image-catalog" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Catalog key</label>
                <select
                  id="route-image-catalog"
                  value={catalogKey}
                  onChange={(event) => setDraft({ ...activeDraft, catalogKey: event.target.value as LogoKey })}
                  className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
                >
                  {ROUTE_IMAGE_CATALOG.map((entry) => <option key={entry.key} value={entry.key}>{entry.key}</option>)}
                </select>
              </div>
            )}

            {sourceMode === 'asset' && (
              <div>
                <label htmlFor="route-image-asset" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Uploaded image</label>
                <select
                  id="route-image-asset"
                  value={assetId}
                  onChange={(event) => setDraft({ ...activeDraft, assetId: event.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
                >
                  <option value="">Choose an image…</option>
                  {Object.entries(availableAssets).map(([id, asset]) => <option key={id} value={id}>{asset.label}</option>)}
                </select>
              </div>
            )}

            {sourceMode === 'path' && (
              <div>
                <label htmlFor="route-image-path" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Same-origin image path</label>
                <input
                  id="route-image-path"
                  type="text"
                  value={customPath}
                  onChange={(event) => setDraft({ ...activeDraft, customPath: event.target.value })}
                  placeholder="Root-relative path in the site logo directory"
                  className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
                />
              </div>
            )}

            {sourceMode === 'upload' && (
              <div>
                <label htmlFor="route-image-upload" className="text-[10px] font-black uppercase tracking-widest text-slate-500">PNG, JPEG, WebP, or GIF · max 6 MiB</label>
                <input
                  key={fileInputKey}
                  id="route-image-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(event) => setDraft({ ...activeDraft, uploadFile: event.target.files?.[0] ?? null })}
                  className="mt-1 block w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-300 file:mr-3 file:rounded file:border-0 file:bg-cyan-400/10 file:px-2 file:py-1 file:text-cyan-200"
                />
              </div>
            )}
          </div>

          <div className="rounded-lg border border-white/8 bg-black/20 p-3 text-[10px] font-mono leading-relaxed text-slate-500">
            <p><span className="text-slate-600">source default:</span> {defaultKey ?? 'catalog key unavailable'} · {PAGE_LOGOS[selectedRoute]}</p>
            <p className="truncate"><span className="text-slate-600">effective live:</span> {effectiveSrc}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={saveRouteImage}
              disabled={status === 'saving'}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 text-[10px] font-black uppercase tracking-widest text-emerald-300 hover:bg-emerald-400/20 disabled:opacity-50"
            >
              {status === 'saving' ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {sourceMode === 'upload' ? 'Upload & save live' : 'Save live'}
            </button>
            <button
              type="button"
              onClick={revertRouteImage}
              disabled={!hasRouteOverride || status === 'saving'}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-amber-400/40 hover:text-amber-300 disabled:opacity-40"
            >
              <RotateCcw size={12} /> Revert route
            </button>
            {message && (
              <span className={`text-[10px] font-bold ${status === 'error' ? 'text-red-300' : 'text-emerald-300'}`}>
                {message}
              </span>
            )}
          </div>
        </div>

        <div className="flex min-h-44 items-center justify-center rounded-xl border border-white/10 bg-black/30 p-4">
          {draftPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draftPreview} alt={`Preview for ${selectedRoute}`} className="max-h-36 w-full object-contain" />
          ) : (
            <p className="text-center text-xs text-slate-600">Choose a valid image to preview it.</p>
          )}
        </div>
      </div>
      )}
    </GlowCard>
    </div>
  )
}

/* ─── List-row helpers ─── */

/**
 * One row of a `downloads` / `links` / `patches` list while it is being edited.
 * `__deleted` marks a source row the admin removed; the row keeps its slot so
 * the saved patch stays base-indexed. `__extra` carries any fields the editor
 * does not offer a column for (a DocLink's `kind`, say) so saving a row never
 * silently drops them.
 */
interface ListRow {
  values: Record<string, string>
  __extra: Record<string, unknown>
  __deleted?: boolean
}

/** Read a card's list field into editable rows. Non-arrays read as empty. */
function toListRows(value: unknown): ListRow[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => {
    const row: ListRow = { values: {}, __extra: {} }
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      for (const [key, val] of Object.entries(item as Record<string, unknown>)) {
        if (typeof val === 'string' || typeof val === 'number') row.values[key] = String(val)
        else row.__extra[key] = val
      }
    }
    return row
  })
}

/** A row back to the shape the card data uses. Tombstones stay tombstones. */
function serializeRow(row: ListRow): Record<string, unknown> {
  if (row.__deleted) return { __deleted: true }
  return { ...row.__extra, ...row.values }
}

/** True once a row has anything in at least one of its offered columns. */
function rowHasContent(row: ListRow, field: EditableListField): boolean {
  return field.columns.some((column) => (row.values[column.field] ?? '').trim() !== '')
}

/** Cheap structural compare so an untouched list is left out of the patch. */
function listRowsChanged(before: ListRow[], after: ListRow[]): boolean {
  return JSON.stringify(before.map(serializeRow)) !== JSON.stringify(after.map(serializeRow))
}

/**
 * Editor for one list field. Rows render in source order with tombstones
 * hidden; "Restore" brings a just-deleted row back so a misclick is not a trip
 * to the source file. Nothing here writes anything — the parent's Save does.
 */
function ListRowsEditor({
  field,
  rows,
  onChange,
}: {
  field: EditableListField
  rows: ListRow[]
  onChange: (next: ListRow[]) => void
}) {
  const liveCount = rows.filter((row) => !row.__deleted).length
  const removedCount = rows.length - liveCount

  function patchRow(index: number, columnField: string, value: string) {
    onChange(rows.map((row, i) => (
      i === index ? { ...row, values: { ...row.values, [columnField]: value } } : row
    )))
  }

  function setDeleted(index: number, deleted: boolean) {
    onChange(rows.map((row, i) => (i === index ? { ...row, __deleted: deleted || undefined } : row)))
  }

  return (
    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {field.label}
        </p>
        <p className="text-[10px] font-mono text-slate-600">
          {liveCount} {liveCount === 1 ? 'row' : 'rows'}
          {removedCount > 0 ? ` · ${removedCount} removed` : ''}
        </p>
      </div>

      <div className="space-y-2">
        {rows.map((row, index) => (
          row.__deleted ? (
            <div
              key={index}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-400/20 bg-red-500/5 px-3 py-2"
            >
              <p className="min-w-0 flex-1 truncate text-[11px] font-mono text-slate-500 line-through">
                {field.columns.map((c) => row.values[c.field]).filter(Boolean)[0] || `row ${index + 1}`}
              </p>
              <button
                type="button"
                onClick={() => setDeleted(index, false)}
                className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-emerald-400/40 hover:text-emerald-300"
              >
                <RotateCcw size={11} /> Restore
              </button>
            </div>
          ) : (
            <div key={index} className="rounded-lg border border-white/10 bg-black/30 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600">
                  {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => setDeleted(index, true)}
                  aria-label={`Remove ${field.label} row ${index + 1}`}
                  className="inline-flex h-7 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-red-400/40 hover:text-red-300"
                >
                  <Trash2 size={11} /> Remove
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {field.columns.map((column) => (
                  <div key={column.field} className={column.full ? 'sm:col-span-2' : ''}>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      {column.label}
                    </label>
                    <input
                      type={column.type === 'url' ? 'url' : 'text'}
                      value={row.values[column.field] ?? ''}
                      onChange={(e) => patchRow(index, column.field, e.target.value)}
                      list={column.type === 'url' ? 'admin-scope-file-options' : undefined}
                      title={column.type === 'url'
                        ? 'Click to pick from the files already on the download server for this section, or paste any URL.'
                        : undefined}
                      className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-black/30 px-2 text-xs text-white outline-none focus:border-cyan-400/60"
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
      </div>

      {liveCount === 0 && (
        <p className="py-3 text-center text-[11px] font-mono text-slate-600">
          No rows. Add one below.
        </p>
      )}

      <button
        type="button"
        onClick={() => onChange([...rows, { values: {}, __extra: {} }])}
        className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 text-[10px] font-black uppercase tracking-widest text-cyan-300 hover:bg-cyan-400/20"
      >
        <Plus size={12} /> {field.addLabel ?? 'Add row'}
      </button>
    </div>
  )
}

/* ─── Card editor row ─── */

function CardRowEditor({
  scope,
  card,
  override,
  publishedOverride,
  scopeOverride,
  allCards,
  fields,
  adminAdded = false,
  onSaved,
}: {
  scope: string
  card: Record<string, unknown> & { id: string; title: string }
  /** True when this card exists ONLY as an override (added from Admin, not in
   *  source). Its patch IS the whole card, so a save must extend that patch
   *  rather than replace it with a diff taken against itself. */
  adminAdded?: boolean
  /** Per-card DRAFT override patch (undefined when this card hasn't been edited). */
  override?: Record<string, unknown>
  /** Per-card PUBLISHED override patch — the last snapshot baked into the build.
   *  Compared against `override` to tell pending edits from permanent ones. */
  publishedOverride?: Record<string, unknown>
  /** Full scope-wide draft override map; kept so save preserves siblings' patches. */
  scopeOverride: Record<string, unknown>
  /** Every source card in this scope — used to keep a renamed id unique. */
  allCards: Array<Record<string, unknown> & { id: string; title: string }>
  fields: EditableField[]
  onSaved: () => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Record<string, string>>({})
  /**
   * List fields (downloads / links / patches) held as real rows, one entry per
   * SOURCE index. A deleted row keeps its slot as a tombstone instead of being
   * spliced out: the saved patch is always base-indexed, so removing row 1
   * never makes a later edit to row 2 land on row 3.
   */
  const [rows, setRows] = useState<Record<string, ListRow[]>>({})
  const [idDraft, setIdDraft] = useState('')
  const [idTouched, setIdTouched] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Effective (merged) card = source defaults + this card's draft patch. Drives
  // the row header so it shows the admin-edited name/id, not stale source values.
  const merged = useMemo(() => ({ ...card, ...(override || {}) }), [card, override])

  function toggleEditor() {
    if (open) {
      setOpen(false)
      return
    }
    const initial: Record<string, string> = {}
    const initialRows: Record<string, ListRow[]> = {}
    for (const field of fields) {
      if (isListField(field)) {
        initialRows[field.key] = toListRows(getDeep(merged, field.key))
        continue
      }
      initial[field.key] = fieldStringValue(getDeep(merged, field.key))
    }
    setDraft(initial)
    setRows(initialRows)
    setIdDraft(String(merged.id ?? ''))
    setIdTouched(false)
    setStatus('idle')
    setErrorMsg('')
    setOpen(true)
  }

  const isOverridden = Boolean(override && Object.keys(override).length > 0)
  // Unpublished = live draft differs from the last published snapshot. Published
  // overrides (draft === published) are permanent, not pending — they must NOT
  // trigger the amber "pending" styling or the section-picker flags.
  const isUnpublished = JSON.stringify(override ?? null) !== JSON.stringify(publishedOverride ?? null)

  // Editing a field. When the title changes we auto-suggest a matching id until
  // the admin hand-edits the id field themselves.
  function handleFieldChange(key: string, value: string) {
    setDraft((d) => ({ ...d, [key]: value }))
    if (key === 'title' && !idTouched) setIdDraft(slugify(value))
  }

  async function handleSave() {
    setStatus('saving')
    // Build the patch diff — only fields that differ from the static default.
    // An admin-added card has no static default (its patch is the card), so we
    // start from the existing patch or the save would drop every field the
    // admin didn't just retype.
    const patch: Record<string, unknown> = adminAdded ? { ...(override || {}) } : {}
    for (const field of fields) {
      if (isListField(field)) continue
      const original = fieldStringValue(getDeep(card, field.key))
      const next = draft[field.key] ?? ''
      if (next !== original) {
        // Use setDeep so dotted keys like "installer.label" build a nested object
        const parsedValue = parseFieldValue(field, next)
        const nested = setDeep({}, field.key, parsedValue)
        // Merge into patch
        Object.assign(patch, deepMerge(patch, nested))
      }
    }
    // List fields. A list is written WHOLE and base-indexed — never sparse —
    // because that is what keeps tombstones aligned with the source rows they
    // remove. deepMerge slot-merges it over the source array and drops the
    // tombstones, so the page sees exactly the rows shown in this editor.
    for (const field of fields) {
      if (!isListField(field)) continue
      const sourceRows = toListRows(getDeep(card, field.key))
      const nextRows = rows[field.key] ?? []
      if (!listRowsChanged(sourceRows, nextRows)) continue
      const emptyRow = nextRows.findIndex((row) => !row.__deleted && !rowHasContent(row, field))
      if (emptyRow !== -1) {
        setStatus('error')
        setErrorMsg(`${field.label}: row ${emptyRow + 1} is empty. Fill it in or remove it.`)
        return
      }
      Object.assign(patch, deepMerge(patch, { [field.key]: nextRows.map(serializeRow) }))
    }
    // Card id rename (optional). The patch stays keyed by the card's SOURCE id
    // (card.id) — the stable join key — and records the new id INSIDE the patch
    // so applyScopeOverride renames the card on the live pages.
    const nextId = idDraft.trim()
    if (nextId !== card.id) {
      if (!nextId) {
        setStatus('error'); setErrorMsg('Card ID cannot be empty.'); return
      }
      if (!/^[a-z0-9][a-z0-9-]*$/.test(nextId)) {
        setStatus('error'); setErrorMsg('Card ID must be lowercase letters, numbers, and hyphens (e.g. ubuntu-26-04-desktop).'); return
      }
      // Uniqueness — no OTHER card in this scope may already resolve to nextId,
      // or the live grid would render two cards with the same React key.
      const defaultIds = new Set(allCards.map((c) => c.id))
      const taken = new Set<string>()
      for (const c of allCards) {
        if (c.id === card.id) continue
        const ov = scopeOverride[c.id] as Record<string, unknown> | undefined
        taken.add(String((ov?.id as string) ?? c.id))
      }
      for (const [key, p] of Object.entries(scopeOverride)) {
        if (defaultIds.has(key) || key === card.id) continue
        const pr = p as Record<string, unknown>
        taken.add(String((pr?.id as string) ?? key))
      }
      if (taken.has(nextId)) {
        setStatus('error'); setErrorMsg(`Another card already uses the id "${nextId}".`); return
      }
      patch.id = nextId
    }
    if (Object.keys(patch).length === 0) {
      setStatus('idle')
      setErrorMsg('No changes to save.')
      return
    }
    // Read existing override map for this scope and patch only this card.
    // Using scopeOverride (passed from the parent) ensures sibling cards'
    // patches survive even if this card has no patch yet.
    const nextValueForScope = { ...scopeOverride, [card.id]: patch }
    const result = await adminContentClient.saveOverride(scope, nextValueForScope, 'admin-ui')
    if (result.ok) {
      setStatus('saved')
      onSaved()
      setTimeout(() => setOpen(false), 800)
    } else {
      setStatus('error')
      setErrorMsg(result.error)
    }
  }

  async function handleRevert() {
    setStatus('saving')
    // Remove this card's entry from the scope. If the scope becomes empty,
    // we DELETE the override record entirely (cleaner audit log) rather than
    // saving an empty object.
    const nextScope = { ...scopeOverride }
    delete nextScope[card.id]
    const result = Object.keys(nextScope).length === 0
      ? await adminContentClient.revertOverride(scope, 'admin-ui')
      : await adminContentClient.saveOverride(scope, nextScope, 'admin-ui')
    if (result.ok) {
      setStatus('saved')
      onSaved()
      setTimeout(() => setOpen(false), 600)
    } else {
      setStatus('error')
      setErrorMsg(result.error)
    }
  }

  // Amber ONLY while an edit is unpublished (pending). Once published, the card
  // looks fully clean — default border, no status badge, and no collapsed Revert
  // (the edit is now the baked-in truth, not a pending "override"). A published
  // edit can still be undone from inside its editor ("Revert to default").
  const borderClass = isUnpublished
    ? 'border-amber-400/30 bg-amber-400/5'
    : 'border-white/10 bg-black/20'

  return (
    <div className={`rounded-lg border ${borderClass} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{String(merged.title)}</p>
          <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
            id: {String(merged.id)}{String(merged.id) !== card.id ? ` (was ${card.id})` : ''}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {/* Revert only while an edit is UNPUBLISHED (undo the pending change).
              Published cards look clean — undo one from inside its editor. */}
          {isUnpublished && (
            <button
              onClick={handleRevert}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-amber-400/40 hover:text-amber-300"
            >
              <RotateCcw size={12} /> Revert
            </button>
          )}
          <button
            onClick={toggleEditor}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 text-[10px] font-black uppercase tracking-widest text-cyan-300 hover:bg-cyan-400/20"
          >
            {open ? <X size={12} /> : <Edit3 size={12} />} {open ? 'Close' : 'Edit'}
          </button>
        </div>
      </div>
      {!open && isUnpublished && (
        <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-amber-300">
          ⚑ Unpublished override — live now, not yet baked into the build
        </p>
      )}
      {open && (
        <div className="mt-4 space-y-4">
          {/* Card ID — auto-suggested from the title, editable for a specific id.
              The "From title" button re-syncs a stale id to the current title in
              one click (useful when the title was renamed earlier). */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Card ID</label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={idDraft}
                onChange={(e) => { setIdDraft(e.target.value); setIdTouched(true) }}
                className="h-10 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-sm font-mono text-white outline-none focus:border-cyan-400/60"
              />
              <button
                type="button"
                onClick={() => { setIdDraft(slugify(draft.title ?? String(merged.title ?? ''))); setIdTouched(false) }}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 text-[10px] font-black uppercase tracking-widest text-cyan-300 hover:bg-cyan-400/20"
                title="Set the id to a slug of the current title"
              >
                <RotateCcw size={12} /> From title
              </button>
            </div>
            <p className="mt-1 text-[10px] font-mono text-slate-700 truncate">
              {idTouched ? 'custom id' : 'auto-suggested from title'} · source id: {card.id}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              isListField(field) ? (
                <div key={field.key} className="sm:col-span-2">
                  <ListRowsEditor
                    field={field}
                    rows={rows[field.key] ?? []}
                    onChange={(next) => setRows((current) => ({ ...current, [field.key]: next }))}
                  />
                </div>
              ) : (
              <div key={field.key} className={field.full || field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{field.label}</label>
                {field.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={draft[field.key] ?? ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60"
                  />
                ) : (
                  <input
                    type={field.type === 'url' ? 'url' : 'text'}
                    value={draft[field.key] ?? ''}
                    onChange={(e) => handleFieldChange(field.key, e.target.value)}
                    list={field.type === 'url' ? 'admin-scope-file-options' : undefined}
                    placeholder={field.type === 'tags'
                      ? 'comma, separated, values'
                      : field.type === 'url' ? 'pick a server file from the list, or paste any URL' : ''}
                    title={field.type === 'url'
                      ? 'Click to pick from the files already on the download server for this section, or paste any URL.'
                      : undefined}
                    className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
                  />
                )}
                <p className="mt-1 text-[10px] font-mono text-slate-700 truncate">
                  default: {fieldStringValue(getDeep(card, field.key)) || '—'}
                </p>
              </div>
              )
            ))}
            <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <button
              onClick={handleSave}
              disabled={status === 'saving'}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 text-[10px] font-black uppercase tracking-widest text-emerald-300 hover:bg-emerald-400/20 disabled:opacity-50"
            >
              <Save size={12} /> {status === 'saving' ? 'Saving…' : 'Save override'}
            </button>
            {/* Undo an override entirely — reachable here so published cards stay
                clean when collapsed but can still be reverted (then re-published). */}
            {isOverridden && (
              <button
                onClick={handleRevert}
                disabled={status === 'saving'}
                title="Remove this card's override and go back to the source default (publish to bake it in)"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-amber-400/40 hover:text-amber-300 disabled:opacity-50"
              >
                <RotateCcw size={12} /> Revert to default
              </button>
            )}
            {status === 'saved' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                <CheckCircle2 size={12} /> Saved
              </span>
            )}
            {status === 'error' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-red-300">
                <AlertTriangle size={12} /> {errorMsg || 'Save failed'}
              </span>
            )}
            {status === 'idle' && errorMsg && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{errorMsg}</span>
            )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Tiny deep-merge that the editor uses when several fields update inside one
 *  patch (e.g. installer.label and installer.href both changed). */

/* ─── Main editor surface ─── */

export function AdminContentEditor({ onCustomPagesChanged }: { onCustomPagesChanged?: () => void }) {
  const [authorized, setAuthorized] = useState(false)
  // Same pattern as the two cards above: `scopeKey` always names a real scope so
  // the derived lookups stay simple, and `scopeChosen` gates the UI so the
  // section picker and its card list start blank.
  const [scopeKey, setScopeKey] = useState<string>(EDITABLE_SCOPES[0].scope)
  const [scopeChosen, setScopeChosen] = useState(false)
  const [overrides, setOverrides] = useState<OverrideMap>({})
  const [published, setPublished] = useState<OverrideMap>({})
  const [buildStatus, setBuildStatus] = useState<BuildStatus | null>(null)
  const [publishTarget, setPublishTarget] = useState<PublishTarget | null>(null)
  // Files uploaded this session. They are already live off the download server,
  // but they only become permanent once the cards pointing at them are baked in,
  // so they belong in the same pending list as unpublished text edits.
  const [pendingUploads, setPendingUploads] = useState<Array<{ name: string; url: string }>>([])
  const [publishing, setPublishing] = useState(false)
  const [customPages, setCustomPages] = useState<CustomPage[]>([])
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])

  async function refresh() {
    const data = await adminContentClient.fetchAll()
    if (data) {
      setOverrides(data.overrides || {})
      setPublished(data.published || {})
      setBuildStatus(data.buildStatus || null)
      setPublishTarget(data.publishTarget || null)
      setCustomPages(data.customPages || [])
      setAuditLog(data.auditLog || [])
    }
  }

  /** Scopes whose live (draft) value differs from the last published snapshot —
   *  i.e. edits that are showing via the runtime overlay but aren't yet baked
   *  into the build. Compared by serialised value so reverts count too. */
  const unpublishedScopes = useMemo(() => {
    const keys = new Set([...Object.keys(overrides), ...Object.keys(published)])
    const changed: string[] = []
    for (const key of keys) {
      const live = JSON.stringify(overrides[key]?.value ?? null)
      const base = JSON.stringify(published[key]?.value ?? null)
      if (live !== base) changed.push(key)
    }
    return changed
  }, [overrides, published])

  const building = buildStatus?.state === 'running' || publishing

  // While a build is running, poll its status until it settles, then refresh
  // so the published snapshot + unpublished count update.
  useEffect(() => {
    if (buildStatus?.state !== 'running') return
    let cancelled = false
    const timer = setInterval(async () => {
      const status = await adminContentClient.getBuildStatus()
      if (cancelled) return
      if (status) setBuildStatus(status)
      if (status && status.state !== 'running') {
        clearInterval(timer)
        refresh()
      }
    }, 2500)
    return () => { cancelled = true; clearInterval(timer) }
  }, [buildStatus?.state])

  async function handlePublish() {
    if (building) return
    setPublishing(true)
    const result = await adminContentClient.publish('admin-ui')
    setPublishing(false)
    if (result.ok) {
      setBuildStatus(result.status)
      // Read the snapshot back instead of assuming it landed. The old code set
      // `published = overrides` optimistically, so a snapshot the proxy could
      // NOT write (unwritable published-content.json) still cleared the flags —
      // until the next refresh restored them, which is the flag that "wouldn't
      // clear" after Publish. The server now 500s on a failed write, and this
      // reflects whatever actually made it to disk.
      await refresh()
    } else {
      setBuildStatus({ state: 'error', message: result.error })
    }
  }

  /** Point one existing card at an uploaded file (URL + filename fields). */
  async function attachUploadToCard(target: AttachTarget, cardId: string, file: { name: string; url: string }): Promise<AttachResult> {
    const scopeMap = (overrides[target.scope]?.value as Record<string, unknown>) || {}
    const existing = (scopeMap[cardId] as Record<string, unknown>) || {}
    let patch = deepMerge(existing, setDeep({}, target.urlField, file.url))
    if (target.fileField) patch = deepMerge(patch, setDeep({}, target.fileField, file.name))
    const result = await adminContentClient.saveOverride(target.scope, { ...scopeMap, [cardId]: patch }, 'admin-ui')
    if (!result.ok) return { ok: false, error: result.error }
    await refresh()
    selectScope(target.scope)
    return { ok: true }
  }

  /**
   * Add a brand-new download card for an uploaded file. applyScopeOverride
   * appends any patch whose key isn't a source id, so a card that exists only in
   * the override map renders on the live page — and, because the editor lists
   * those extras too, stays editable and removable afterwards.
   */
  async function createCardForUpload(target: AttachTarget, title: string, file: { name: string; url: string }): Promise<AttachResult> {
    if (!title) return { ok: false, error: 'Give the new card a title.' }
    const baseId = slugify(title)
    if (!baseId) return { ok: false, error: 'The title needs at least one letter or number.' }

    const definition = EDITABLE_SCOPES.find((s) => s.scope === target.scope)
    const sample = definition?.defaults[0] as Record<string, unknown> | undefined
    const scopeMap = (overrides[target.scope]?.value as Record<string, unknown>) || {}
    const taken = new Set([...(definition?.defaults.map((c) => c.id) ?? []), ...Object.keys(scopeMap)])
    let id = baseId
    for (let suffix = 2; taken.has(id); suffix += 1) id = `${baseId}-${suffix}`

    // Borrow presentation fields from a sibling so the new card doesn't render
    // logo-less (and so `tags` is never undefined where a grid maps over it).
    let card: Record<string, unknown> = {
      title,
      description: `Download ${file.name}.`,
      ...(typeof sample?.logo === 'string' ? { logo: sample.logo } : {}),
      ...(typeof sample?.glowColor === 'string' ? { glowColor: sample.glowColor } : {}),
      ...(Array.isArray(sample?.tags) ? { tags: [] as string[] } : {}),
    }
    card = deepMerge(card, setDeep({}, target.urlField, file.url))
    if (target.fileField) card = deepMerge(card, setDeep({}, target.fileField, file.name))

    const result = await adminContentClient.saveOverride(target.scope, { ...scopeMap, [id]: card }, 'admin-ui')
    if (!result.ok) return { ok: false, error: result.error }
    await refresh()
    selectScope(target.scope)
    return { ok: true }
  }

  // Server files offered by the URL-field dropdowns for the ACTIVE scope. Read
  // from the same library the upload panel writes to, scoped to the folder this
  // section's links already live in — so "Download 2 URL" offers the actual
  // contents of /vmware/vmware-tools instead of asking the admin to remember a
  // path. Empty for sections whose links aren't server files (site routes).
  const [scopeFileOptions, setScopeFileOptions] = useState<string[]>([])

  const activeScope = useMemo(
    () => EDITABLE_SCOPES.find((s) => s.scope === scopeKey) || EDITABLE_SCOPES[0],
    [scopeKey],
  )

  /** Open a section — used by the picker, the unpublished-changes shortcuts,
   *  and the upload panel after it wires a file into a card. */
  function selectScope(scope: string) {
    setScopeKey(scope)
    setScopeChosen(true)
    // The section now starts collapsed, so a caller further up the page (the
    // unpublished-changes list, the upload panel) would otherwise expand a card
    // below the fold with no visible feedback.
    document.getElementById('page-card-text')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const scopeOverride = (overrides[scopeKey]?.value as Record<string, unknown>) || {}
  const publishedScopeOverride = (published[scopeKey]?.value as Record<string, unknown>) || {}

  /** Counts cards with UNPUBLISHED changes per scope (draft patch differs from
   *  the published snapshot). Drives the dropdown + summary flags so published
   *  overrides — permanent, not pending — stop flagging a section after a
   *  successful Publish. */
  const unpublishedCountByScope = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of EDITABLE_SCOPES) {
      const draftMap = (overrides[s.scope]?.value as Record<string, unknown>) || {}
      const pubMap = (published[s.scope]?.value as Record<string, unknown>) || {}
      const ids = new Set([...Object.keys(draftMap), ...Object.keys(pubMap)])
      let n = 0
      for (const id of ids) {
        if (JSON.stringify(draftMap[id] ?? null) !== JSON.stringify(pubMap[id] ?? null)) n++
      }
      counts[s.scope] = n
    }
    return counts
  }, [overrides, published])

  /** Groups the editable scopes by product family for the dropdown's optgroups.
   *  Adding a new family in EDITABLE_SCOPES automatically gets its own group. */
  const scopesByFamily = useMemo(() => {
    const groups = new Map<string, EditableScope[]>()
    for (const s of EDITABLE_SCOPES) {
      const list = groups.get(s.productFamily) ?? []
      list.push(s)
      groups.set(s.productFamily, list)
    }
    return Array.from(groups.entries())
  }, [])

  /** Source cards plus any the admin added from the upload panel, so extras
   *  stay editable (and removable via Revert) after they're created. */
  const activeScopeCards = useMemo(() => {
    const defaultIds = new Set(activeScope.defaults.map((card) => card.id))
    const extras = Object.entries(scopeOverride)
      .filter(([id, patch]) => !defaultIds.has(id) && patch && typeof patch === 'object')
      .map(([id, patch]) => ({ id, title: id, ...(patch as Record<string, unknown>) } as EditableScope['defaults'][number]))
    return { cards: [...activeScope.defaults, ...extras], defaultIds }
  }, [activeScope, scopeOverride])

  /** Sections the upload panel can wire a finished file into, including cards
   *  the admin added earlier. */
  const attachTargets = useMemo<AttachTarget[]>(() => DOWNLOAD_ATTACH_SCOPES.map(({ scope, urlField, fileField }) => {
    const patchMap = (overrides[scope.scope]?.value as Record<string, unknown>) || {}
    const defaultIds = new Set(scope.defaults.map((card) => card.id))
    const extras = Object.entries(patchMap)
      .filter(([id, patch]) => !defaultIds.has(id) && patch && typeof patch === 'object')
      .map(([id, patch]) => ({ id, title: String((patch as Record<string, unknown>).title ?? id) }))
    return {
      scope: scope.scope,
      family: scope.productFamily,
      label: `${scope.productFamily} — ${scope.sectionName}${scopeRoute(scope.description) ? ` (${scopeRoute(scope.description)})` : ''}`,
      urlPrefix: commonDownloadPrefix(scope.defaults),
      urlField,
      fileField,
      cards: [
        ...scope.defaults.map((card) => ({
          id: card.id,
          title: String((patchMap[card.id] as Record<string, unknown>)?.title ?? card.title),
        })),
        ...extras,
      ],
    }
  }), [overrides])

  useEffect(() => {
    let cancelled = false
    const prefixes = downloadPrefixes(activeScope.defaults)
    if (prefixes.length === 0) { setScopeFileOptions([]); return }
    void (async () => {
      const listing = await adminContentClient.listFileLibrary('')
      const matching = (listing?.dirs ?? []).filter((entry) => prefixes.includes(entry.urlPath))
      const collected: string[] = []
      for (const dir of matching) {
        const withFiles = await adminContentClient.listFileLibrary(dir.key)
        for (const file of withFiles?.files ?? []) {
          if (!file.partial) collected.push(file.url)
        }
      }
      if (!cancelled) setScopeFileOptions(collected)
    })()
    return () => { cancelled = true }
  }, [activeScope])

  const activeScopeUnpublishedCount = unpublishedCountByScope[activeScope.scope] ?? 0
  const activeScopeCardCount = activeScopeCards.cards.length

  if (!authorized) {
    return <SessionGate onAuthorized={() => { setAuthorized(true); void refresh() }} />
  }

  return (
    <div className="space-y-6">
      {/* Publish bar — promotes draft edits into the committed, build-baked
          snapshot and rebuilds the static site so changes become permanent. */}
      <div id="publish-changes">
      <GlowCard glowColor={unpublishedScopes.length > 0 || pendingUploads.length > 0 ? 'amber' : 'cyan'} className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <UploadCloud size={16} className="text-cyan-300" />
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white">Publish changes</p>
            </div>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed max-w-xl">
              Saved edits show on the live site immediately. <strong className="text-slate-200">Publish</strong> bakes them
              into the build so they become permanent defaults that survive site updates — no source editing required.
            </p>
            {unpublishedScopes.length > 0 ? (
              <details className="group mt-2">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-300 marker:hidden">
                  <ChevronDown size={12} className="transition-transform group-open:rotate-180" />
                  ⚑ {unpublishedScopes.length} section{unpublishedScopes.length === 1 ? '' : 's'} with unpublished changes
                </summary>
                <ul className="mt-2 space-y-1 border-l border-amber-300/20 pl-3">
                  {unpublishedScopes.map((scope) => {
                    const meta = EDITABLE_SCOPES.find((s) => s.scope === scope)
                    const isRouteImages = scope === ROUTE_IMAGE_OVERRIDE_SCOPE
                    const name = meta
                      ? `${meta.productFamily} — ${meta.sectionName}`
                      : isRouteImages ? 'Site images — registered routes' : scope
                    return (
                      <li key={scope}>
                        {meta || isRouteImages ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (meta) selectScope(scope)
                              else document.getElementById('registered-route-images')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }}
                            className="text-left text-[11px] font-medium text-slate-300 underline-offset-2 hover:text-amber-200 hover:underline"
                          >
                            {name}
                          </button>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-400">{name}</span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </details>
            ) : pendingUploads.length === 0 ? (
              <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-emerald-300/80">
                ✓ All changes published
              </p>
            ) : null}
            {pendingUploads.length > 0 && (
              <details className="group mt-2" open>
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-300 marker:hidden">
                  <ChevronDown size={12} className="transition-transform group-open:rotate-180" />
                  ⚑ {pendingUploads.length} file{pendingUploads.length === 1 ? '' : 's'} uploaded this session
                </summary>
                <ul className="mt-2 space-y-1 border-l border-amber-300/20 pl-3">
                  {pendingUploads.map((file) => (
                    <li key={file.url} className="text-[11px] font-medium text-slate-300">
                      <span className="font-mono">{file.name}</span>
                      <span className="text-slate-500"> → {file.url}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {publishTarget && !publishTarget.writable && (
              <p className="mt-2 flex items-start gap-2 text-[11px] leading-relaxed text-red-300">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                <span>
                  Publishing will fail: the proxy can&apos;t write{' '}
                  <span className="font-mono">{publishTarget.path}</span>. Fix its ownership on the web server
                  (<span className="font-mono">chown $PM2_USER {publishTarget.path}</span>) — until then edits stay
                  live-only and keep showing as unpublished.
                </span>
              </p>
            )}
            {buildStatus && buildStatus.state !== 'idle' && (
              <p className={`mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${
                buildStatus.state === 'running' ? 'text-cyan-300'
                : buildStatus.state === 'success' ? 'text-emerald-300'
                : 'text-red-300'
              }`}>
                {buildStatus.state === 'running' && <Loader2 size={12} className="animate-spin" />}
                {buildStatus.state === 'success' && <CheckCircle2 size={12} />}
                {buildStatus.state === 'error' && <AlertTriangle size={12} />}
                {buildStatus.state === 'running' ? 'Rebuilding the site…'
                  : buildStatus.state === 'success' ? (buildStatus.message || 'Build complete — changes are permanent.')
                  : `Build failed: ${buildStatus.message || 'unknown error'}`}
              </p>
            )}
          </div>
          <div className="shrink-0">
            <button
              onClick={() => { setPendingUploads([]); void handlePublish() }}
              disabled={building || (unpublishedScopes.length === 0 && pendingUploads.length === 0)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 text-[10px] font-black uppercase tracking-widest text-emerald-300 hover:bg-emerald-400/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {building
                ? (<><Loader2 size={12} className="animate-spin" /> Building…</>)
                : (<><UploadCloud size={12} /> Publish &amp; rebuild</>)}
            </button>
          </div>
        </div>
      </GlowCard>
      </div>

      <AdminFileLibraryPanel
        attachTargets={attachTargets}
        onAttach={attachUploadToCard}
        onCreateCard={createCardForUpload}
        onUploaded={(file) => setPendingUploads((list) => (
          list.some((item) => item.url === file.url) ? list : [...list, file]
        ))}
      />

      <RegisteredRouteImageEditor
        overrides={overrides}
        published={published}
        onSaved={refresh}
      />

      {/* Section picker — single dropdown grouped by product family. Selecting
          a different option swaps the card list below. */}
      <div id="page-card-text">
      <GlowCard glowColor="cyan" className="p-5">
        {/* Titled like the two cards above so the three read as one set. */}
        <div className="flex items-center gap-2">
          <LayoutGrid size={16} className="text-cyan-300" />
          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-white">Page card text &amp; links</h3>
        </div>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
          Edit the wording on any product page card — its title, description, tags, and the link or filename it points
          at. Saved edits go live immediately; Publish &amp; rebuild bakes them in.
        </p>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500" htmlFor="admin-scope-select">
              Choose a section to edit
            </label>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Pick the part of the site you want to update. Sections are grouped by product family.
            </p>
            <select
              id="admin-scope-select"
              value={scopeChosen ? scopeKey : ''}
              onChange={(e) => {
                const next = e.target.value
                setScopeChosen(next !== '')
                if (next !== '') setScopeKey(next)
              }}
              className="mt-3 h-11 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-cyan-400/60 lg:max-w-md"
            >
              <option value="">— Choose a section —</option>
              {scopesByFamily.map(([family, list]) => (
                <optgroup key={family} label={family}>
                  {list.map((s) => {
                    const unpublishedCount = unpublishedCountByScope[s.scope] ?? 0
                    const flag = unpublishedCount > 0 ? `  ⚑ ${unpublishedCount}` : ''
                    const route = scopeRoute(s.description)
                    return (
                      <option key={s.scope} value={s.scope}>
                        {s.sectionName}{route ? ` — ${route}` : ''}{flag}
                      </option>
                    )
                  })}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Selection summary chips on the right side of the dropdown row.
              These react to the dropdown selection so the admin can see
              "what am I about to edit" at a glance. */}
          <div className="flex flex-wrap items-center gap-2 lg:justify-end lg:max-w-xs">
            {!scopeChosen && (
              <span className="text-[11px] text-slate-500">Nothing selected yet.</span>
            )}
            {scopeChosen && (
            <>
            <span className="inline-flex h-7 items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 text-[10px] font-black uppercase tracking-widest text-cyan-200">
              {activeScope.productFamily}
            </span>
            <span className="inline-flex h-7 items-center rounded-full border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-300">
              {activeScopeCardCount} card{activeScopeCardCount === 1 ? '' : 's'}
            </span>
            {activeScopeUnpublishedCount > 0 && (
              <span className="inline-flex h-7 items-center rounded-full border border-amber-400/30 bg-amber-400/10 px-3 text-[10px] font-black uppercase tracking-widest text-amber-200">
                ⚑ {activeScopeUnpublishedCount} unpublished
              </span>
            )}
            </>
            )}
          </div>
        </div>
      </GlowCard>
      </div>

      {/* Cards for the currently selected section — hidden until one is picked,
          matching the two cards above. The header reflects the dropdown choice. */}
      {scopeChosen && (
      <GlowCard glowColor="indigo" className="p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-2">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{activeScope.productFamily}</p>
            <h3 className="text-base font-bold text-white truncate">{activeScope.sectionName}</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">{activeScope.scope}</span>
            <button
              onClick={refresh}
              className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-cyan-300"
            >
              ↻ Refresh
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-4">{activeScope.description}</p>
        <div className="space-y-3">
          {/* One datalist shared by every URL field below — the browser shows it
              as a dropdown on the input. Free text still works for routes and
              external links; an empty list degrades to a plain input. */}
          <datalist id="admin-scope-file-options">
            {scopeFileOptions.map((url) => <option key={url} value={url} />)}
          </datalist>
          {activeScopeCards.cards.map((card) => (
            <CardRowEditor
              key={card.id}
              scope={activeScope.scope}
              card={card}
              adminAdded={!activeScopeCards.defaultIds.has(card.id)}
              override={scopeOverride[card.id] as Record<string, unknown> | undefined}
              publishedOverride={publishedScopeOverride[card.id] as Record<string, unknown> | undefined}
              scopeOverride={scopeOverride}
              allCards={activeScope.defaults}
              fields={activeScope.fields}
              onSaved={refresh}
            />
          ))}
        </div>
      </GlowCard>
      )}

      {/* Custom pages list */}
      {customPages.length > 0 && (
        <GlowCard glowColor="cyan" className="p-5">
          <h3 className="text-base font-bold text-white mb-3">Custom pages (created via wizard)</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {customPages.map((page) => (
              <div key={page.slug} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{page.title}</p>
                    <p className="text-[10px] font-mono text-slate-600">/custom-pages/?slug={page.slug}</p>
                  </div>
                  <button
                    onClick={async () => {
                      if (!window.confirm(`Delete custom page "${page.title}"?`)) return
                      const result = await adminContentClient.deleteCustomPage(page.slug, 'admin-ui')
                      if (result.ok) {
                        await refresh()
                        onCustomPagesChanged?.()
                      } else {
                        window.alert(result.error)
                      }
                    }}
                    className="text-slate-600 hover:text-red-300"
                    aria-label={`Delete ${page.title}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500 line-clamp-2">{page.subtitle}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-slate-400">{page.cards.length} cards</span>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-slate-400">{page.category}</span>
                </div>
              </div>
            ))}
          </div>
        </GlowCard>
      )}

      {/* Audit log */}
      {auditLog.length > 0 && (
        <GlowCard glowColor="indigo" className="p-5">
          <h3 className="text-base font-bold text-white mb-3">Recent admin activity</h3>
          <ul className="space-y-1.5 text-xs">
            {auditLog.slice(0, 12).map((entry) => (
              <li key={entry.id} className="flex flex-wrap gap-2 items-baseline">
                <span className="font-mono text-slate-600">{new Date(entry.at).toLocaleString()}</span>
                <span className="text-cyan-300 font-semibold">{entry.kind}</span>
                <span className="text-slate-300 truncate">{entry.scope || entry.slug || ''}</span>
                <span className="text-slate-500">
                  by <span className="text-slate-300">{entry.by || 'admin'}</span>
                  {entry.workstation && (
                    <span className="text-slate-500"> @ <span className="text-slate-400 font-mono">{entry.workstation}</span></span>
                  )}
                  {entry.ip && <span className="text-slate-700 font-mono"> ({entry.ip})</span>}
                </span>
              </li>
            ))}
          </ul>
        </GlowCard>
      )}
    </div>
  )
}
