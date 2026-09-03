import { GlowCard } from '@/components/ui/spotlight-card'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { FileText, ExternalLink } from 'lucide-react'
import type { ReleaseNoteGroup } from '@/lib/data/docs-content'

/**
 * Renders compiled release notes — one GlowCard per version line, each listing
 * its releases (version + date + bulleted changes). Shared across the /docs/*
 * product documentation pages.
 */
export function ReleaseNotes({ groups }: { groups: ReleaseNoteGroup[] }) {
  return (
    <div className="space-y-6">
      {groups.map((group, gi) => (
        <GlowCard key={group.id} glowColor={getCardGlowColor(gi)} className="p-5 sm:p-6">
          <h3 className="text-base font-bold text-white">{group.title}</h3>
          {group.summary && <p className="mt-1 text-xs leading-relaxed text-slate-400">{group.summary}</p>}
          <div className="mt-4 space-y-5">
            {group.releases.map((rel) => (
              <div key={rel.version} className="border-l-2 border-white/10 pl-4">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-semibold text-cyan-200">{rel.version}</span>
                  {rel.date && <span className="text-[11px] font-mono text-slate-500">{rel.date}</span>}
                  {rel.href && (
                    <a href={rel.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-cyan-300 hover:text-cyan-200">
                      <FileText size={11} /> Release notes <ExternalLink size={10} className="opacity-50" />
                    </a>
                  )}
                </div>
                <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-slate-300 marker:text-cyan-400/50">
                  {rel.bullets.map((b, i) => <li key={i}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </GlowCard>
      ))}
    </div>
  )
}
