'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import Link from 'next/link'
import { RouteThemedLogo } from '@/components/common/RouteThemedLogo'
import { GlowCard } from '@/components/ui/spotlight-card'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { CodeBlock } from '@/components/common/CodeBlock'
import { Callout } from '@/components/layout/PageHeader'
import { DREN_PAGE_LOGOS } from '@/lib/data/logos'
import { URLS } from '@/lib/data/constants'

const INSTALLER = URLS.drenTrellixInstaller

function Step({ n, text }: { n: number; text: string }) {
  return (
    <p className="text-xs text-slate-400">
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-cyan-400/20 text-cyan-400 text-[10px] font-bold mr-1.5">{n}</span>
      {text}
    </p>
  )
}

function DRENNotice() {
  return (
    <Callout type="important">
      This guide is <strong>DREN-specific</strong>. The installer is downloaded from the DREN-side server
      and is restricted to internal DREN and OOBN addresses. Ensure your system is on the approved
      network before proceeding.
    </Callout>
  )
}

/* One bundle, one script: dren-trellix-install.tar.gz unpacks to ./installer,
 * whose install.sh picks the EL or Ubuntu branch by package manager, adds the
 * CUI CA to the trust store, installs the Trellix Agent, installs ENS Threat
 * Prevention with on-access scan off, syncs policy with ePO and prints the
 * Agent and ENS status. Mirrors the legacy dren-trellix-on-linux page. */
function InstallContent() {
  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <DRENNotice />
      <p className="text-xs text-slate-400 italic">Tested on AlmaLinux 8, AlmaLinux 9, RockyLinux 8, and CentOS 7.</p>
      <Callout type="important">
        One installer does everything: it adds the CUI CA to the trusted store, installs the Trellix Agent,
        installs ENS Threat Prevention with on-access scan off, syncs policy with ePO, and prints the Agent
        and ENS status at the end. Run it as root from any working directory.
      </Callout>
      <div className="space-y-2">
        <Step n={1} text="Download the installer bundle from the DREN server (about 270 MB)." />
        <p className="text-xs text-slate-400">For certificate trust errors see <Link href="/docs/el/certificates" className="text-cyan-400 hover:underline">Add CA Certificate to Trusted CAs</Link>.</p>
        <CodeBlock code={`sudo curl ${INSTALLER} -o dren-trellix-install.tar.gz`} />
      </div>
      <div className="space-y-2">
        <Step n={2} text="Extract the bundle and remove the archive." />
        <CodeBlock code="sudo tar -xzvf dren-trellix-install.tar.gz" />
        <CodeBlock className="mt-1" code="sudo rm dren-trellix-install.tar.gz" />
      </div>
      <div className="space-y-2">
        <Step n={3} text="Run the installer. It detects dnf and runs the Enterprise Linux branch (RPM packages)." />
        <CodeBlock code="sudo bash ./installer/install.sh" />
      </div>
      <div className="space-y-2">
        <Step n={4} text="Check the status block the script prints last (AgentMode, Version, EpoServerList, ENS version), or query it again." />
        <CodeBlock code="sudo /opt/McAfee/agent/bin/cmdagent -i" />
        <CodeBlock className="mt-1" code="sudo /opt/McAfee/ens/tp/bin/mfetpcli --version" />
      </div>
      <div className="space-y-2">
        <Step n={5} text="Disable McAfee GTI lookups (BLCSE is not internet-connected)." />
        <CodeBlock code="sudo /opt/McAfee/ens/tp/bin/mfetpcli --setoasglobalconfig --gti --state disable" />
        <CodeBlock className="mt-1" code="sudo /opt/McAfee/ens/tp/bin/mfetpcli --getoasconfig --summary" />
      </div>
      <div className="space-y-2"><Step n={6} text="Remove the installation files." /><CodeBlock code="sudo rm -rf ./installer" /></div>
    </div>
  )
}

const cards = [
  {
    id: 'el-install',
    title: 'Trellix Agent + ENS Installation',
    description: 'One-shot installer for Enterprise Linux systems on the DREN network: CUI CA trust, Trellix Agent, and ENS Threat Prevention.',
    tags: ['Agent', 'ENS', 'RPM', 'AlmaLinux', 'CentOS'],
    glowColor: 'cyan' as const,
  },
]

const contentMap: Record<string, React.ReactNode> = {
  'el-install': <InstallContent />,
}

export function DRENTrellixELCards() {
  const [openCard, setOpenCard] = useState<string | null>(null)
  function toggle(id: string) { setOpenCard((prev) => (prev === id ? null : id)) }

  return (
    <div className="relative">
      <div className="grid md:grid-cols-2 gap-6 items-start">
        {cards.map((card, index) => {
          const isOpen = openCard === card.id
          return (
            <div key={card.id} className="relative">
              <div onClick={() => toggle(card.id)} className="cursor-pointer select-none transition-all duration-300 ease-out"
                role="button" aria-expanded={isOpen} tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggle(card.id)}>
                <GlowCard
                  className={`p-8 flex flex-col gap-6 w-full transition-all duration-300
                    ${isOpen ? 'ring-2 ring-cyan-400 shadow-[0_0_90px_rgba(0,212,255,0.8)]' : 'hover:ring-2 hover:ring-sky-300/70'}`}
                  glowColor={getCardGlowColor(index)}
                >
                  <div className="flex items-start justify-between">
                    <RouteThemedLogo route="/dren/trellix/enterprise-linux" fallbackSrc={DREN_PAGE_LOGOS['/dren/trellix/enterprise-linux']} alt="Trellix DREN" size="xl" glass glow variant="square" />
                    {isOpen && (
                      <button onClick={(e) => { e.stopPropagation(); setOpenCard(null) }}
                        className="text-slate-400 hover:text-white transition-colors p-1 rounded" aria-label="Close">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-white">{card.title}</p>
                    <p className={`text-sm leading-relaxed mt-1.5 ${isOpen ? 'text-slate-300' : 'text-slate-400'}`}>{card.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {card.tags.map((t) => <span key={t} className="px-2 py-0.5 rounded-md text-xs bg-white/5 text-slate-400 border border-white/5">{t}</span>)}
                  </div>
                  {!isOpen && <p className="text-xs text-cyan-400 mt-auto">Click to view guide →</p>}
                  {isOpen && (
                    <div className="border-t border-white/10 pt-3">
                      {contentMap[card.id]}
                    </div>
                  )}
                </GlowCard>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
