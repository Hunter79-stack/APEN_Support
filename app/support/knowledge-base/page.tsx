import { BackNavPill } from '@/components/layout/BackNavPill'
import { KnowledgeBaseCards } from './KnowledgeBaseCards'

export default function KnowledgeBasePage() {
  return (
    <div className="container max-w-4xl py-12 px-6 mx-auto animate-in fade-in duration-500">
      <div className="mb-6">
        <BackNavPill href="/support" label="Support" color="cyan" />
      </div>

      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-white mb-4">Knowledge Base</h1>
        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-400">
          Choose a category for quick checks, what to capture, common scenarios, and when to open a support ticket.
        </p>
      </div>

      <KnowledgeBaseCards />
    </div>
  )
}
