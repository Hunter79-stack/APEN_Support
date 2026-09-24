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
import { adminContentClient } from '@/lib/data/admin-content'
import { setDeep, deepMerge } from '@/lib/data/deep-patch'
import { AdminFileLibraryPanel, type AttachResult, type AttachTarget } from './AdminFileLibraryPanel'
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
import { PAGE_LOGOS } from '@/lib/data/logos'
import { ROUTE_IMAGE_OVERRIDE_SCOPE } from '@/lib/data/route-images'
import { CheckCircle2, LayoutGrid, AlertTriangle, Trash2, UploadCloud, Loader2, ChevronDown } from 'lucide-react'
import { SessionGate } from './SessionGate'
import { RegisteredRouteImageEditor } from './RouteImageEditor'
import { CardRowEditor } from './CardRowEditor'
import { getDeep, isListField, slugify, type EditableField, type EditableScope } from './content-editor-fields'
import { useContentOverrides } from '@/lib/hooks/useContentOverrides'

/* ─── Editable scopes ─── */


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

export const EDITABLE_SCOPES: EditableScope[] = EDITABLE_SCOPE_DEFINITIONS.map((scope) => {
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

export function commonDownloadPrefix(cards: ReadonlyArray<Record<string, unknown>>): string {
  let best = ''
  let bestCount = 0
  for (const [prefix, count] of downloadPrefixVotes(cards)) {
    if (count > bestCount) { best = prefix; bestCount = count }
  }
  return best
}

/** EVERY folder a section's cards link into, most-linked first. A section like
 *  Tools / VMRC spans two folders — its URL dropdown must offer both. */
export function downloadPrefixes(cards: ReadonlyArray<Record<string, unknown>>): string[] {
  return [...downloadPrefixVotes(cards).entries()].sort((a, b) => b[1] - a[1]).map(([prefix]) => prefix)
}

/**
 * The page a scope edits, read out of its own description (every description
 * names its route, e.g. "shown on /docs/vmware"). Shown in the pickers so an
 * admin never has to guess which page a section maps to — and derived rather
 * than configured, so it can't go stale separately.
 */
export function scopeRoute(description: string): string {
  return /(\/[A-Za-z0-9_/-]+)/.exec(description)?.[1] ?? ''
}

/* ─── Field helpers ─── */


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
export function AdminContentEditor({ onCustomPagesChanged }: { onCustomPagesChanged?: () => void }) {
  const [authorized, setAuthorized] = useState(false)
  // Same pattern as the two cards above: `scopeKey` always names a real scope so
  // the derived lookups stay simple, and `scopeChosen` gates the UI so the
  // section picker and its card list start blank.
  const [scopeKey, setScopeKey] = useState<string>(EDITABLE_SCOPES[0].scope)
  const [scopeChosen, setScopeChosen] = useState(false)
  const {
    overrides, published, buildStatus, publishTarget, customPages, auditLog,
    unpublishedScopes, building, refresh, publish: handlePublish,
  } = useContentOverrides()
  // Files uploaded this session. They are already live off the download server,
  // but they only become permanent once the cards pointing at them are baked in,
  // so they belong in the same pending list as unpublished text edits.
  const [pendingUploads, setPendingUploads] = useState<Array<{ name: string; url: string }>>([])

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

  const scopeOverride = useMemo(() => (overrides[scopeKey]?.value as Record<string, unknown>) || {}, [overrides, scopeKey])
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
                      <span className="text-slate-400"> → {file.url}</span>
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
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400" htmlFor="admin-scope-select">
              Choose a section to edit
            </label>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
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
              <span className="text-[11px] text-slate-400">Nothing selected yet.</span>
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
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{activeScope.productFamily}</p>
            <h3 className="text-base font-bold text-white truncate">{activeScope.sectionName}</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">{activeScope.scope}</span>
            <button
              onClick={refresh}
              className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-cyan-300"
            >
              ↻ Refresh
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-400 mb-4">{activeScope.description}</p>
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
                    <p className="text-[10px] font-mono text-slate-400">/custom-pages/?slug={page.slug}</p>
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
                    className="text-slate-400 hover:text-red-300"
                    aria-label={`Delete ${page.title}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-400 line-clamp-2">{page.subtitle}</p>
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
                <span className="font-mono text-slate-400">{new Date(entry.at).toLocaleString()}</span>
                <span className="text-cyan-300 font-semibold">{entry.kind}</span>
                <span className="text-slate-300 truncate">{entry.scope || entry.slug || ''}</span>
                <span className="text-slate-400">
                  by <span className="text-slate-300">{entry.by || 'admin'}</span>
                  {entry.workstation && (
                    <span className="text-slate-400"> @ <span className="text-slate-400 font-mono">{entry.workstation}</span></span>
                  )}
                  {entry.ip && <span className="text-slate-400 font-mono"> ({entry.ip})</span>}
                </span>
              </li>
            ))}
          </ul>
        </GlowCard>
      )}
    </div>
  )
}
