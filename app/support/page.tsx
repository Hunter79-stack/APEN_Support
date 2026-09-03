import { BackNavPill } from '@/components/layout/BackNavPill'
import { SupportServiceCards } from './SupportServiceCards'
import { CategoryCustomPages } from '@/components/common/CategoryCustomPages'

export default function SupportDashboard() {
  return (
    <div className="container max-w-5xl py-12 px-6 mx-auto animate-in fade-in duration-500">
      <div className="mb-6">
        <BackNavPill href="/home" label="Home" color="cyan" />
      </div>

      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">IT Service Catalog</h1>
        <p className="text-slate-400">Select a service below to get started.</p>
      </div>

      <SupportServiceCards />

      <div className="mt-12">
        <CategoryCustomPages category="support" />
      </div>
    </div>
  )
}
