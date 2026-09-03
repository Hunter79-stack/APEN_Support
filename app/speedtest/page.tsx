import { RedirectStub } from '@/components/common/RedirectStub'

export const metadata = { title: 'Moved — Speed Test' }

// Moved during the Tools reorganization; Tools now lives under Applications.
// /speedtest/ (trailing slash) is reverse-proxied by nginx to the Python
// speedtest service (PM2 app "apen-speedtest"); this stub only catches the
// bare /speedtest route so old bookmarks land on the wrapped tools page.
export default function SpeedTestMoved() {
  return <RedirectStub to="/applications/speedtest" />
}
