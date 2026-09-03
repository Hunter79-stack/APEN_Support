'use client'

import { PageHeader } from '@/components/layout/PageHeader'
import { GlowCard } from '@/components/ui/spotlight-card'
import { ShieldAlert, Construction } from 'lucide-react'
import { DREN_PAGE_LOGOS } from '@/lib/data/logos'

export default function CiscoRepoPage() {
  return (
    <div className="page-enter">
      <PageHeader
        title="Cisco DREN Repository"
        subtitle="Restricted software and configuration repository for DREN-side administration."
        badge="DREN"
        backHref="/dren"
        backColor="cyan"
        logo={DREN_PAGE_LOGOS['/dren/cisco']}
      />
      
      <div className="max-w-4xl mx-auto px-6 py-20 flex flex-col items-center justify-center">
        <GlowCard className="p-12 text-center border border-white/5" glowColor="cyan">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6">
            <Construction size={32} />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-4">Repository Under Construction</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed mb-8">
            This software repository is currently being provisioned for authorized CESC personnel. 
            Automated sync services are being configured.
          </p>
          
          <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-500/5 py-2 px-4 rounded-full border border-red-500/10">
            <ShieldAlert size={12} />
            DREN-Side Access Only
          </div>
        </GlowCard>
      </div>
    </div>
  )
}
