import { RedirectStub } from '@/components/common/RedirectStub'

export const metadata = { title: 'Moved — Speed Test' }

// Moved to /applications/speedtest when the Tools section became a
// sub-menu of Applications. /speedtest/ (trailing slash) is still the nginx
// reverse-proxy to the Python speedtest service (PM2 app "apen-speedtest");
// this stub only catches the bare /tools/speedtest page route.
export default function SpeedTestMoved() {
  return <RedirectStub to="/applications/speedtest" />
}
