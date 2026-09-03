/**
 * Footer Configuration
 */

import { LOGOS } from '@/lib/data/logos'

export const quickLinks = [
  // Footer Home points at the support hub at /home (same as the sidebar)
  // rather than the click-through intro at /. Visitors who reach the
  // footer have clearly already entered the site.
  { label: 'Home',                                      href: '/home' },
  { label: 'Authority, Mission & Org',                  href: '/mission' },
  { label: 'Terms of Use',                              href: '/terms' },
  { label: 'FOIA',                                      href: '/foia' },
  { label: 'No Fear Act Data',                          href: '/nofear' },
  { label: 'Links Disclaimer',                          href: '/links-disclaimer' },
  { label: 'Accessibility',                             href: '/accessibility' },
  { label: 'Privacy & Security (Policy/Program)',       href: '/privacy-security' },
  { label: 'Open Gov (Plain Writing/Strategic Plans)',  href: '/open-gov' },
  { label: 'Information Quality',                       href: '/information-quality' },
  { label: "Veteran's Crisis Line",                     href: '/veterans-crisis-line' },
];

export const contactInfo = {
  email: {
    label: 'FCC CESC Helpdesk',
    href: 'mailto:cesc@army.mil',
  },
  phone: {
    label: '(DSN): 706-791-5858',
  },
};

export const footerLogos = {
  fcc: LOGOS.fcc,
  apen: LOGOS.apenFooter,
};