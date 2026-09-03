'use client'

import { useState, useRef } from 'react'
import { PageHeader, SectionTitle } from '@/components/layout/PageHeader'
import { Play, ChevronRight } from 'lucide-react'
import { URLS } from '@/lib/data/constants'
import { VIDEOS_PAGE_LOGOS } from '@/lib/data/logos'

const BASE = URLS.videosFacpro

interface FacProVideo { id: string; series: string; title: string; file: string; duration: string }

// The real FacilitatePro video library staged at /videos/facpro/ — 24 videos
// across 4 series, matching the legacy site's titles, ordering, and durations.
const videos: FacProVideo[] = [
  // Leader Guide Tutorial Series
  { id: 'leader-1', series: 'Leader Guide Tutorial Series', title: 'Getting Started',                file: 'leader_guide_tutorial_series1.mp4', duration: '4:27' },
  { id: 'leader-2', series: 'Leader Guide Tutorial Series', title: 'Managing your Participants',      file: 'leader_guide_tutorial_series2.mp4', duration: '2:48' },
  { id: 'leader-3', series: 'Leader Guide Tutorial Series', title: 'Brainstorming',                   file: 'leader_guide_tutorial_series3.mp4', duration: '5:09' },
  { id: 'leader-4', series: 'Leader Guide Tutorial Series', title: 'Voting',                          file: 'leader_guide_tutorial_series4.mp4', duration: '2:59' },
  { id: 'leader-5', series: 'Leader Guide Tutorial Series', title: 'Results',                         file: 'leader_guide_tutorial_series5.mp4', duration: '3:23' },
  { id: 'leader-6', series: 'Leader Guide Tutorial Series', title: 'Editing Topics and Settings',     file: 'leader_guide_tutorial_series6.mp4', duration: '4:01' },
  { id: 'leader-7', series: 'Leader Guide Tutorial Series', title: 'Printing and Next Steps',         file: 'leader_guide_tutorial_series7.mp4', duration: '3:50' },
  // FacilitatePro Overviews
  { id: 'overview-1', series: 'FacilitatePro Overviews', title: 'Overview',            file: 'facpro_overview1.mp4', duration: '2:54' },
  { id: 'overview-2', series: 'FacilitatePro Overviews', title: 'Basic',               file: 'facpro_overview2.mp4', duration: '2:28' },
  { id: 'overview-3', series: 'FacilitatePro Overviews', title: 'Plus',                file: 'facpro_overview3.mp4', duration: '2:45' },
  { id: 'overview-4', series: 'FacilitatePro Overviews', title: 'Premium',             file: 'facpro_overview4.mp4', duration: '3:08' },
  { id: 'overview-5', series: 'FacilitatePro Overviews', title: 'Professional Level',  file: 'facpro_overview5.mp4', duration: '3:26' },
  // Classic Training Videos
  { id: 'classic-1',  series: 'Classic Training Videos', title: 'Overview',                     file: 'classic_training_videos1.mp4',  duration: '5:25' },
  { id: 'classic-2',  series: 'Classic Training Videos', title: 'Building an Agenda',            file: 'classic_training_videos2.mp4',  duration: '4:08' },
  { id: 'classic-3',  series: 'Classic Training Videos', title: 'Managing Participant Access',   file: 'classic_training_videos3.mp4',  duration: '3:01' },
  { id: 'classic-4',  series: 'Classic Training Videos', title: 'Brainstorming and Editing',     file: 'classic_training_videos4.mp4',  duration: '3:11' },
  { id: 'classic-5',  series: 'Classic Training Videos', title: 'Categorizing Items',            file: 'classic_training_videos5.mp4',  duration: '4:39' },
  { id: 'classic-6',  series: 'Classic Training Videos', title: 'Prioritizing and Voting',       file: 'classic_training_videos6.mp4',  duration: '5:43' },
  { id: 'classic-7',  series: 'Classic Training Videos', title: 'Printing',                      file: 'classic_training_videos7.mp4',  duration: '3:34' },
  { id: 'classic-8',  series: 'Classic Training Videos', title: 'Follow Me',                     file: 'classic_training_videos8.mp4',  duration: '3:56' },
  { id: 'classic-9',  series: 'Classic Training Videos', title: 'Topic Modes',                   file: 'classic_training_videos9.mp4',  duration: '3:18' },
  { id: 'classic-10', series: 'Classic Training Videos', title: 'Ready for More / ExpressPlus',  file: 'classic_training_videos10.mp4', duration: '7:50' },
  // How To Videos
  { id: 'howto-1', series: 'How To Videos', title: 'Manual vs Auto Modes', file: 'how_to_videos1.mp4', duration: '2:50' },
  { id: 'howto-2', series: 'How To Videos', title: 'Create User ID',       file: 'how_to_videos2.mp4', duration: '1:51' },
]

const seriesOrder = ['Leader Guide Tutorial Series', 'FacilitatePro Overviews', 'Classic Training Videos', 'How To Videos']

export default function FacProVideosPage() {
  const [activeVideo, setActiveVideo] = useState(videos[0])
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleSelect = (v: typeof videos[0]) => {
    setActiveVideo(v)
    // Give the DOM a tick to swap the src, then play
    setTimeout(() => videoRef.current?.play(), 100)
  }

  return (
    <div className="page-enter">
      <PageHeader
        title="FacilitatePro Video Guides"
        subtitle="Offline-hosted step-by-step video tutorials for the FacilitatePro platform."
        badge="Videos"
        backHref="/videos"
        backColor="violet"
        logo={VIDEOS_PAGE_LOGOS['/videos/facpro']}
      />

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Video player */}
          <div className="flex-1 min-w-0">
            <div className="rounded-xl overflow-hidden bg-black border border-white/10 shadow-card">
              <video
                ref={videoRef}
                key={activeVideo.id}
                controls
                className="w-full aspect-video"
                preload="metadata"
              >
                <source src={`${BASE}/${activeVideo.file}`} type="video/mp4" />
                <p className="p-6 text-slate-400 text-sm">
                  Your browser does not support embedded video.{' '}
                  <a href={`${BASE}/${activeVideo.file}`} className="text-cyan-400 hover:underline">
                    Click here to download.
                  </a>
                </p>
              </video>
            </div>
            <div className="mt-4 px-1">
              <h2 className="text-base font-semibold text-white">{activeVideo.title}</h2>
              <p className="text-xs text-slate-500 mt-1">Duration: {activeVideo.duration}</p>
            </div>
          </div>

          {/* Playlist — grouped by series */}
          <div className="lg:w-80 flex-shrink-0">
            <SectionTitle>Playlist</SectionTitle>
            <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-4">
              {seriesOrder.map((series) => (
                <div key={series}>
                  <p className="px-1 pb-1.5 text-[10px] font-black uppercase tracking-widest text-cyan-300/80">{series}</p>
                  <div className="space-y-1">
                    {videos.filter((v) => v.series === series).map((v, i) => (
                      <button
                        key={v.id}
                        onClick={() => handleSelect(v)}
                        className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200
                          ${activeVideo.id === v.id
                            ? 'bg-cyan-400/10 border border-cyan-400/25'
                            : 'hover:bg-white/5 border border-transparent'}`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5
                          ${activeVideo.id === v.id ? 'bg-cyan-400/20 text-cyan-400' : 'bg-white/5 text-slate-600'}`}>
                          {activeVideo.id === v.id
                            ? <Play size={12} className="ml-0.5" />
                            : <span className="text-xs font-mono">{String(i + 1).padStart(2, '0')}</span>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${activeVideo.id === v.id ? 'text-cyan-400' : 'text-slate-300'}`}>
                            {v.title}
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5">{v.duration}</p>
                        </div>
                        {activeVideo.id === v.id && (
                          <ChevronRight size={14} className="text-cyan-400 flex-shrink-0 mt-1" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
