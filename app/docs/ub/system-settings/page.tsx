import { PageHeader } from '@/components/layout/PageHeader'
import { SystemSettingCards } from './SystemSettingCards'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'

export const metadata = { title: 'Ubuntu System Settings' }

export default function UbuntuSystemSettingsPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="System Settings"
        subtitle="Schedule cron jobs, create systemd startup services, and manage NTP and timezone settings on Ubuntu systems."
        badge="Ubuntu"
        backHref="/docs/ub"
        backColor="orange"
        logo={DOCS_PAGE_LOGOS['/docs/ub/system-settings']}
      />
      <div className="max-w-7xl mx-auto px-6 py-10">
        <SystemSettingCards />
      </div>
    </div>
  )
}
