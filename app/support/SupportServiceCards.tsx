'use client'

import Link from 'next/link'
import { Ticket, Activity, BookOpen, ExternalLink } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { GlowCard } from '@/components/ui/spotlight-card'
import type { GlowColorName } from '@/lib/data/card-colors'
import { SUPPORT_SERVICE_CARDS } from '@/lib/data/support'
import { useCardOverrides } from '@/lib/data/admin-content'

const serviceIcons: Record<string, LucideIcon> = {
  activity: Activity,
  book: BookOpen,
  ticket: Ticket,
}

interface ServiceCard {
  id: string
  title: string
  description: string
  icon: string
  href: string
  glowColor: string
}

export function SupportServiceCards() {
  // Layer admin edits (/admin > Edit pages & cards) over the static catalog.
  const services = useCardOverrides<ServiceCard>('support/services', [...SUPPORT_SERVICE_CARDS])
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {services.map((service) => {
        const Icon = serviceIcons[service.icon] ?? Ticket
        return (
          <Link key={service.id} href={service.href} className="group block h-full">
            <GlowCard glowColor={service.glowColor as GlowColorName} className="p-6 flex flex-col gap-4 group h-full">
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-lg bg-white/5 border border-white/10 text-${service.glowColor}-400`}>
                  <Icon size={24} />
                </div>
                <ExternalLink size={16} className="text-slate-400 group-hover:text-cyan-400/50 transition-colors" />
              </div>
              <div>
                <p className="text-lg font-semibold text-white leading-snug group-hover:text-white transition-colors">{service.title}</p>
                <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{service.description}</p>
              </div>
            </GlowCard>
          </Link>
        )
      })}
    </div>
  )
}
