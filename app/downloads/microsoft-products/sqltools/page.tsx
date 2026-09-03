import { PageHeader, SectionTitle, Callout } from '@/components/layout/PageHeader'
import { SSMSReleaseTable } from './SSMSReleaseTable'
import { DOWNLOADS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'SQL Server Tools' }

export default function SQLToolsPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="SQL Server Tools"
        subtitle="SQL Server Management Studio (SSMS) — a free integrated environment for managing SQL Server and Azure SQL databases."
        badge="Microsoft Products"
        backHref="/downloads/microsoft-products"
        backColor="sky"
        logo={DOWNLOADS_PAGE_LOGOS['/downloads/microsoft-products/sqltools']}
      />

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <div>
          <p className="text-slate-400 text-sm leading-relaxed mb-4">
            SSMS is an integrated environment for managing SQL Server infrastructure. It provides
            tools to configure, monitor, and administer instances and databases of SQL Server and
            Azure SQL Database. Use SSMS to deploy, monitor, and upgrade data-tier components,
            as well as build queries and scripts.
          </p>
          <Callout type="info">
            SSMS is a free download and does not require a SQL Server license to install.
          </Callout>
        </div>

        <section>
          <SectionTitle>SQL Server Management Studio (SSMS)</SectionTitle>
          <SSMSReleaseTable />
        </section>
      </div>
    </div>
  )
}
