import type { Metadata } from 'next'

// page.tsx is a client component (form state, fetch calls) and can't export
// metadata directly — this layout supplies the page title instead.
export const metadata: Metadata = { title: 'Sign In' }

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
