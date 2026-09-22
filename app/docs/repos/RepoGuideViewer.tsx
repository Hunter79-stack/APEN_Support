'use client'

/**
 * RepoGuideViewer — renders the ported legacy repo client guides natively.
 *
 * Left: a filterable, grouped list of guides (Jammy/Noble/Resolute/Universal
 * for deb; Enterprise Linux for rpm). Right: the selected guide's steps, each
 * command in a copy-to-clipboard CodeBlock. The boilerplate intro is rendered
 * here (apt vs yum, and the CA-trust link) rather than stored per guide.
 */

import { useMemo, useState } from 'react'
import { GlowCard } from '@/components/ui/spotlight-card'
import { CodeBlock } from '@/components/common/CodeBlock'
import { StaticLink } from '@/components/common/StaticLink'
import { Search, ShieldAlert, ChevronDown } from 'lucide-react'
import type { RepoGuideGroup } from '@/lib/data/repo-guides'

export function RepoGuideViewer({ groups, kind }: { groups: RepoGuideGroup[]; kind: 'deb' | 'rpm' | 'pip' }) {
  const allGuides = useMemo(() => groups.flatMap((g) => g.guides), [groups])
  const [activeId, setActiveId] = useState(allGuides[0]?.id ?? '')
  const [filter, setFilter] = useState('')

  const active = allGuides.find((g) => g.id === activeId) ?? allGuides[0]
  const q = filter.trim().toLowerCase()

  // Accordion: each OS group is collapsed; clicking one expands just that OS
  // and collapses the rest. Start with the active guide's OS open so the
  // current selection is visible. While filtering, all matching groups expand.
  const groupOfActive = useMemo(
    () => groups.find((g) => g.guides.some((gu) => gu.id === active?.id))?.name ?? groups[0]?.name ?? '',
    [groups, active?.id],
  )
  const [openGroup, setOpenGroup] = useState(groupOfActive)

  const filteredGroups = useMemo(() => {
    if (!q) return groups
    return groups
      .map((g) => ({ ...g, guides: g.guides.filter((gu) => gu.label.toLowerCase().includes(q) || gu.title.toLowerCase().includes(q)) }))
      .filter((g) => g.guides.length > 0)
  }, [groups, q])

  const pkg = kind === 'rpm' ? 'yum' : 'apt'
  const caHref = kind === 'rpm' ? '/docs/el/certificates' : '/docs/ub/certificates'
  // The boilerplate below is about fetching a .list/.repo file onto a Linux
  // box. pip and uv are cross-platform, install nothing with apt/yum, and
  // already carry their own trust flags (--trusted-host, UV_INSECURE_HOST) in
  // the guide text, so showing it there would be advice that does not apply.
  const showLinuxBoilerplate = kind !== 'pip'

  if (!active) return <p className="text-sm text-slate-400">No guides available.</p>

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      {/* Sidebar */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="relative mb-3">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter guides…"
            className="h-10 w-full rounded-lg border border-white/10 bg-black/30 pl-9 pr-3 text-sm text-white outline-none focus:border-cyan-400/60"
          />
        </div>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          {filteredGroups.map((g) => {
            const isOpen = q ? true : openGroup === g.name
            return (
              <div key={g.name}>
                <button
                  type="button"
                  onClick={() => setOpenGroup((cur) => (cur === g.name ? '' : g.name))}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-1.5 text-left text-[10px] font-black uppercase tracking-widest text-cyan-300/80 transition-colors hover:text-cyan-200"
                >
                  <span className="truncate">{g.name}</span>
                  <ChevronDown size={12} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="space-y-0.5 pb-1">
                    {g.guides.map((gu) => (
                      <button
                        key={gu.id}
                        onClick={() => setActiveId(gu.id)}
                        className={`block w-full truncate rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                          gu.id === active.id
                            ? 'bg-cyan-400/15 font-semibold text-cyan-200'
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                        }`}
                        title={gu.label}
                      >
                        {gu.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {filteredGroups.length === 0 && <p className="px-1 text-xs text-slate-400">No guides match “{filter}”.</p>}
        </div>
      </aside>

      {/* Content */}
      <main className="min-w-0">
        <GlowCard glowColor="cyan" className="p-6">
          <h2 className="text-xl font-bold text-white">{active.title}</h2>

          {/* Standardised boilerplate intro */}
          {showLinuxBoilerplate && (
          <div className="mt-4 space-y-2 rounded-lg border border-amber-400/20 bg-amber-400/5 p-4">
            <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-300">
              <ShieldAlert size={14} className="mt-0.5 shrink-0 text-amber-300" />
              <span><strong className="text-amber-200">Important:</strong> Linux is case sensitive when specifying or making directories, accounts, or other tasks.</span>
            </p>
            <p className="text-xs leading-relaxed text-slate-400">
              <strong className="text-slate-300">Note:</strong> Some Linux distributions don&apos;t ship <code className="text-cyan-400">wget</code> or
              <code className="mx-1 text-cyan-400">curl</code>. Install with <code className="text-cyan-400">sudo {pkg} install wget</code> or
              <code className="mx-1 text-cyan-400">sudo {pkg} install curl</code>.
            </p>
            <p className="text-xs leading-relaxed text-slate-400">
              <strong className="text-slate-300">Note:</strong> For certificate-trust errors over HTTPS, see{' '}
              <StaticLink href={caHref} className="text-cyan-400 underline hover:text-cyan-300">Add CA Certificate to Trusted CAs</StaticLink>.
            </p>
          </div>
          )}

          {/* Guide sections */}
          <div className="mt-6 space-y-6">
            {active.sections.map((section, si) => (
              <section key={si}>
                {section.heading && (
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-white">{section.heading}</h3>
                )}
                <div className="space-y-2">
                  {section.items.map((item, ii) =>
                    item.type === 'code' ? (
                      <CodeBlock key={ii} code={item.code ?? ''} />
                    ) : /^option\s+\d+$/i.test(item.text ?? '') ? (
                      <p key={ii} className="pt-1 text-[10px] font-black uppercase tracking-widest text-cyan-300/70">{item.text}</p>
                    ) : (
                      <p key={ii} className="text-xs leading-relaxed text-slate-400">{item.text}</p>
                    ),
                  )}
                </div>
              </section>
            ))}
          </div>
          {active.source && (
            <p className="mt-6 border-t border-white/10 pt-3 text-[11px] leading-relaxed text-slate-400">{active.source}</p>
          )}
        </GlowCard>
      </main>
    </div>
  )
}
