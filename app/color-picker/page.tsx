import { RedirectStub } from '@/components/common/RedirectStub'

export const metadata = { title: 'Moved — HEX Color Picker' }

// Moved during the Tools reorganization; Tools now lives under Applications.
export default function ColorPickerMoved() {
  return <RedirectStub to="/applications/color-picker" />
}
