import { PageHeader } from '@/components/layout/PageHeader'
import { SearchClient } from './SearchClient'

export const metadata = { title: 'Search' }

export default function SearchPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Search"
        subtitle="Full-text search across every page on the support site — docs, downloads, repo guides, knowledge base, and tools."
        badge="Site Search"
        backHref="/home"
        backColor="cyan"
      />
      <div className="max-w-4xl mx-auto px-6 py-10">
        <SearchClient />
      </div>
    </div>
  )
}
