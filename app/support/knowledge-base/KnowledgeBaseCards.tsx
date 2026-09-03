'use client'

import Link from 'next/link'
import { Server, Shield, MonitorPlay, HardDrive } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { GlowCard } from '@/components/ui/spotlight-card'
import type { GlowColorName } from '@/lib/data/card-colors'
import { KNOWLEDGE_BASE_CATEGORIES } from '@/lib/data/support'
import { useCardOverrides } from '@/lib/data/admin-content'

const categoryIcons: Record<string, LucideIcon> = {
  hardDrive: HardDrive,
  monitor: MonitorPlay,
  server: Server,
  shield: Shield,
}

interface KnowledgeBaseCategory {
  id: string
  title: string
  icon: string
  color: string
  href: string
}

export function KnowledgeBaseCards() {
  // Layer admin edits (/admin > Edit pages & cards) over the static categories.
  const categories = useCardOverrides<KnowledgeBaseCategory>('support/knowledge-base', [...KNOWLEDGE_BASE_CATEGORIES])
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {categories.map((cat) => {
        const Icon = categoryIcons[cat.icon] ?? Shield
        return (
          <Link key={cat.id} href={cat.href} className="group block h-full">
            <GlowCard glowColor={cat.color as GlowColorName} className="p-6 flex items-center gap-4 h-full transition-all">
              <div className={`p-2 bg-${cat.color}-500/10 rounded-lg text-${cat.color}-400 border border-${cat.color}-500/20`}>
                <Icon size={20} />
              </div>
              <span className="text-white font-medium group-hover:text-white transition-colors">{cat.title}</span>
            </GlowCard>
          </Link>
        )
      })}
    </div>
  )
}
