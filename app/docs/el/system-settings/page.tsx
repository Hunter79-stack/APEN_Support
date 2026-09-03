import { PageHeader } from '@/components/layout/PageHeader'
import { SystemSettingCards } from './SystemSettingCards'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'EL System Settings' }

export default function ELSystemSettingsPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="System Settings"
        subtitle="Configure cron jobs, create systemd startup services, and manage NTP and timezone settings on Enterprise Linux systems."
        badge="Enterprise Linux"
        backHref="/docs/el"
        backColor="green"
        logo={DOCS_PAGE_LOGOS['/docs/el/system-settings']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <SystemSettingCards />
      </div>
    </div>
  )
}
