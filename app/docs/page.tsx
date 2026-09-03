import { PageHeader } from '@/components/layout/PageHeader'
import { DocsCategoryCards } from './DocsCategoryCards'
import { CategoryCustomPages } from '@/components/common/CategoryCustomPages'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'OS & Application Documents' }

export default function DocsPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="OS & Application Documents"
        subtitle="Step-by-step guides for Enterprise Linux, Ubuntu, and FacilitatePro. Select a category below to browse available documentation."
        badge="Home"
        backHref="/home"
        backColor="indigo"
        logo={DOCS_PAGE_LOGOS['/docs']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        <DocsCategoryCards />
        <CategoryCustomPages category="docs" />
      </div>
    </div>
  )
}
