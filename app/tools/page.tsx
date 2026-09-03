import { RedirectStub } from '@/components/common/RedirectStub'

export const metadata = { title: 'Moved — Tools' }

// The Tools section merged into /applications (its pages live directly at
// /applications/color-picker and /applications/speedtest). This stub keeps
// old bookmarks and external links working.
export default function ToolsMoved() {
  return <RedirectStub to="/applications" />
}
