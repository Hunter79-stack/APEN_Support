import { ADMIN_SECTIONS } from '@/lib/data/admin-sections'

export interface NavChild {
  label: string
  href: string
}

export interface NavItem {
  label: string
  href: string
  children?: NavChild[]
}

// The route → logo map now lives in lib/data/logos.ts (the single logo
// registry) so every nav item icon can be changed in one place. It is
// re-exported here so existing importers (e.g. the Navbar) keep working
// unchanged. To edit a nav item's logo, update navItemLogos in logos.ts.
export { navItemLogos } from '@/lib/data/logos'

export const publicNavItems: NavItem[] = [
  // Home points at the support hub at /home, NOT the click-through intro
  // page that lives at /. The intro is a once-per-arrival landing — once
  // a visitor is inside the site, the sidebar Home icon should take them
  // back to the actual hub, not bounce them through the intro again.
  { label: 'Home', href: '/home' },
  // Full-text search over the static export (index built at build time).
  { label: 'Search', href: '/search' },
  // Documentation and Downloads are product-centric: the same product
  // families appear under both, Documentation → that product's docs/release
  // notes, Downloads → that product's download page. New product families are
  // added here (and custom pages auto-merge in via buildNavItemsWithCustomPages).
  {
    label: 'Documentation',
    href: '/docs',
    children: [
      { label: 'Linux Repositories', href: '/docs/repos' },
      { label: 'VMware', href: '/docs/vmware' },
      { label: 'Microsoft', href: '/docs/microsoft-products' },
      { label: 'Security', href: '/security' },
      { label: 'PDQ', href: '/PDQ' },
    ],
  },
  {
    label: 'Downloads',
    href: '/downloads',
    children: [
      // Software & ISOs moved here from the Documentation menu — it's a
      // downloads destination (points at the ISO aggregator page).
      { label: 'Software & ISOs', href: '/downloads/iso' },
      // Enterprise Linux + Ubuntu combined into a single "Linux" entry that
      // lands on /downloads/iso/linux (both distro families side by side).
      { label: 'Linux', href: '/downloads/iso/linux' },
      { label: 'VMware', href: '/downloads/vmware' },
      { label: 'Microsoft', href: '/downloads/microsoft-products' },
      { label: 'PDQ', href: '/PDQ' },
    ],
  },
  {
    label: 'Security',
    href: '/security',
    children: [
      { label: 'Evaluate-STIG', href: '/security/evaluate-stig' },
      { label: 'Trellix (CUI)', href: '/trellix' },
      { label: 'Certificate Services', href: '/certsrv' },
    ],
  },
  // Applications Tools — on-network apps and utilities unique to the
  // restricted enclave. Ansible, AtomEngine, Openfire Chat, VASSAL, and AFSIM
  // were removed 2026-07 (services no longer accessible), and the Tools
  // section merged in here during the same cleanup. The sub-menu carries the
  // two browser tools directly; the Network Analysis tab bar (Speed Test /
  // Network Diagnostics) lives on the Speed Test page only. Custom tool pages
  // published from /admin merge in after these two at render time.
  {
    label: 'Applications Tools',
    href: '/applications',
    children: [
      { label: 'Color Picker', href: '/applications/color-picker' },
      { label: 'Speed Test', href: '/applications/speedtest' },
    ],
  },
  // Videos grows over time (more custom demo videos) — add children here, or
  // publish them as custom pages in /admin.
  {
    label: 'Videos',
    href: '/videos',
    children: [
      { label: 'FacilitatePro', href: '/videos/facpro' },
    ],
  },
]

export const adminNavItems: NavItem[] = [
  {
    label: 'Admin',
    href: '/admin',
    // Each console section becomes a sub-item that deep-links to /admin#<id>;
    // AdminDashboard opens that section from the hash. Driven by the shared
    // ADMIN_SECTIONS list so the nav and the dashboard stay in sync.
    children: ADMIN_SECTIONS.map((s) => ({ label: s.label, href: `/admin#${s.id}` })),
  },
]
