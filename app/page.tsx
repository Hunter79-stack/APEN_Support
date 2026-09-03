import type { Metadata } from 'next'
import { LegacyIntro } from '@/components/landing/LegacyIntro'
import { ROOT_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata: Metadata = {
  title: 'Welcome — APEN Services & Support',
  description:
    'The APEN Services & Support hub — service desk, documentation, downloads, certificates, and tooling for the local fleet.',
}

/** Root production intro. The full support hub remains at /home. */
export default function IntroPage() {
  return <LegacyIntro logoSrc={ROOT_PAGE_LOGOS['/']} />
}
