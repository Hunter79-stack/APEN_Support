import { BookOpen, CheckCircle2, ClipboardList } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { BackNavPill } from '@/components/layout/BackNavPill'
import { KNOWLEDGE_BASE_CATEGORY_DETAILS, type KnowledgeBaseCategoryKey } from '@/lib/data/support'

interface SupportKnowledgeCategoryPageProps {
  categoryKey: KnowledgeBaseCategoryKey
}

export function SupportKnowledgeCategoryPage({ categoryKey }: SupportKnowledgeCategoryPageProps) {
  const category = KNOWLEDGE_BASE_CATEGORY_DETAILS[categoryKey]

  return (
    <div className="container max-w-4xl py-12 px-6 mx-auto animate-in fade-in duration-500">
      <div className="mb-6">
        <BackNavPill href="/support/knowledge-base" label="Knowledge Base" color="cyan" />
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">{category.title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">{category.description}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-emerald-400/15 bg-emerald-400/[0.04]">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                <CheckCircle2 size={18} aria-hidden="true" />
              </span>
              <p className="text-sm font-semibold text-white">Quick checks</p>
            </div>
            <ul className="space-y-2 text-sm leading-relaxed text-slate-400">
              {category.quickChecks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="border-amber-400/15 bg-amber-400/[0.04]">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-400/20 bg-amber-400/10 text-amber-300">
                <ClipboardList size={18} aria-hidden="true" />
              </span>
              <p className="text-sm font-semibold text-white">Include in a ticket</p>
            </div>
            <ul className="space-y-2 text-sm leading-relaxed text-slate-400">
              {category.ticketDetails.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4">
        {category.articles.map((article) => (
          <Card key={article.title} className="border-white/5 bg-white/[0.02]">
            <CardContent className="flex gap-4 p-5">
              <span className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
                <BookOpen size={18} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-semibold text-white">{article.title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-slate-400">{article.detail}</span>
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Hidden until the new ticketing system endpoints are wired up.
      <Card className="mt-6 border-cyan-400/15 bg-cyan-400/[0.04]">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">Need hands-on help?</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">
              Use support intake when the issue needs technician action or an approval chain.
            </p>
          </div>
          <Button asChild className="w-full flex-shrink-0 sm:w-auto">
            <StaticLink href="/support/ticket">
              <LifeBuoy size={16} className="mr-2" />
              Open Support Request
              <ArrowRight size={15} className="ml-2" />
            </StaticLink>
          </Button>
        </CardContent>
      </Card>
      */}
    </div>
  )
}
