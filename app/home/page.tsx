import type { Metadata } from 'next'
import { HomeSupportPathway } from '@/components/HomeSupportPathway'
import { HomeHero } from '@/components/home/HomeHero'
import { AnnouncementSection } from '@/components/home/AnnouncementSection'
import { LinksGrid } from '@/components/home/LinksGrid'
import { Footer } from '@/components/layout/Footer'
import {
  serviceLinkColors,
  serviceLinks,
  servicePortalColors,
  servicePortals,
  supportLinkColors,
  supportLinks,
} from '@/lib/data/homepage'

export const metadata: Metadata = {
  title: 'APEN Service & Support',
  description: 'APEN service desk, documentation, downloads, repositories, and platform-specific support resources.',
}

export default function HomePage() {
  return (
    <div className="page-enter">
      <HomeHero />

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
        {/*
          Each section has its OWN heightClass + cardMaxWidth knobs so
          you can tune them independently:

            - heightClass   how tall each card is in this section.
            - cardMaxWidth  width cap on each card. Required if you don't
                            want cards to stretch to fill the row when the
                            section has few entries.

          The section BOX itself is always full-width (sits inside the
          `max-w-7xl mx-auto` wrapper above), which is what keeps the
          three sections looking uniform side-by-side regardless of
          card count or card size.
        */}

        <HomeSupportPathway />

        <LinksGrid
          title="Operational Services"
          items={serviceLinks}
          scope="home/services"
          colors={serviceLinkColors}
          heightClass="h-32"
          cardMaxWidth="14rem"
        />

        <LinksGrid
          title="Service Portals"
          items={servicePortals}
          scope="home/service-portals"
          colors={servicePortalColors}
          heightClass="h-32"
          cardMaxWidth="14rem"
        />

        <LinksGrid
          title="Quick Reference"
          items={supportLinks}
          scope="home/quick-links"
          colors={supportLinkColors}
          heightClass="h-32"
          cardMaxWidth="14rem"
        />

        <AnnouncementSection />
      </div>

      {/* Visible breathing room between the Announcements list and the footer rule. */}
      <div className="h-16 md:h-20" aria-hidden="true" />

      {/* Only displays on the home/landing page */}
      <Footer />
    </div>
  )
}
