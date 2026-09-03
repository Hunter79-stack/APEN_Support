import { AnnouncementList } from '@/components/home/AnnouncementList'
import { SectionTitle } from '@/components/layout/PageHeader'
import { getAnnouncements } from '@/lib/data/site-updates'

export function AnnouncementSection() {
  const announcements = getAnnouncements()

  return (
    <section>
      <SectionTitle>
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          Announcements
        </span>
      </SectionTitle>
      <AnnouncementList announcements={announcements} />
    </section>
  )
}
