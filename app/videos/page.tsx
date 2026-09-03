import { PageHeader, SectionTitle } from '@/components/layout/PageHeader'
import { VideosCategoryCards } from './VideosCategoryCards'
import { VIDEOS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Video Guides' }

export default function VideosPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Video Guides"
        subtitle="Offline repository of instructional video guides hosted by the CESC. Select a category below to browse available videos."
        badge="Home"
        backHref="/home"
        backColor="violet"
        logo={VIDEOS_PAGE_LOGOS['/videos']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <SectionTitle>Video Categories</SectionTitle>
        <VideosCategoryCards />
      </div>
    </div>
  )
}
