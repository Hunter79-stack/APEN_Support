import type { Metadata } from 'next'

// page.tsx is a client component and cannot export metadata; this layout
// supplies the page title instead of the generic site default.
export const metadata: Metadata = { title: 'HEX Color Picker' }

export default function ColorPickerLayout({ children }: { children: React.ReactNode }) {
  return children
}
