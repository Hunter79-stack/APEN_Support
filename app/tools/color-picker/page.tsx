import { RedirectStub } from '@/components/common/RedirectStub'

export const metadata = { title: 'Moved — HEX Color Picker' }

// Moved to /applications/color-picker when the Tools section became a
// sub-menu of Applications.
export default function ColorPickerMoved() {
  return <RedirectStub to="/applications/color-picker" />
}
