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

const AGENT_BASE = URLS.drenTrellixAgent
const ENS_BASE   = URLS.drenTrellixEns
const PAA_BASE   = URLS.drenTrellixPolicyAuditor

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
      This guide is <strong>DREN-specific</strong>. Scripts are downloaded from the DREN-side server
      and are restricted to internal DREN and OOBN addresses. Ensure your system is on the approved
      network before proceeding.
    </Callout>
  )
}

function AgentContent() {
  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <DRENNotice />
      <p className="text-xs text-slate-400 italic">Tested on Ubuntu 22 and Ubuntu 24.</p>
      <div className="space-y-2"><Step n={1} text="Disable ufw and verify." /><CodeBlock code="sudo ufw disable && sudo ufw status" /></div>
      <div className="space-y-2"><Step n={2} text="Ensure unzip is installed." /><CodeBlock code="sudo apt install unzip" /></div>
      <div className="space-y-2"><Step n={3} text="Create temp directory." /><CodeBlock code="sudo mkdir /trellixtemp" /></div>
      <div className="space-y-2"><Step n={4} text="Change to directory." /><CodeBlock code="cd /trellixtemp" /></div>
      <div className="space-y-2">
        <Step n={5} text="Download install scripts from the DREN server." />
        <p className="text-xs text-slate-500">For certificate trust errors see <Link href="/docs/ub/certificates" className="text-cyan-400 hover:underline">Add CA Certificate to Trusted CAs</Link>.</p>
        <CodeBlock code={`sudo wget ${AGENT_BASE}/install.sh`} />
        <CodeBlock className="mt-1" code={`sudo wget ${AGENT_BASE}/installdeb.sh`} />
      </div>
      <div className="space-y-2">
        <Step n={6} text="Set permissions and run." />
        <CodeBlock code="sudo chmod +x install.sh installdeb.sh" />
        <CodeBlock className="mt-1" code="sudo ./install.sh -i" />
      </div>
      <div className="space-y-2"><Step n={7} text="Verify installation." /><CodeBlock code="ls /opt/McAfee/agent/bin" /></div>
      <div className="space-y-2"><Step n={8} text="Verify version." /><CodeBlock code="cd /opt/McAfee/agent/bin && sudo ./cmdagent -i" /></div>
      <div className="space-y-2"><Step n={9} text="Delete temp directory." /><CodeBlock code="sudo rm -rf /trellixtemp" /></div>
      <div className="space-y-2"><Step n={10} text="Re-enable ufw." /><CodeBlock code="sudo ufw enable && sudo ufw status" /></div>
    </div>
  )
}

function ENSContent() {
  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <DRENNotice />
      <p className="text-xs text-slate-400 italic">Tested on Ubuntu 22 and Ubuntu 24.</p>
      <div className="space-y-2"><Step n={1} text="Disable ufw and verify." /><CodeBlock code="sudo ufw disable && sudo ufw status" /></div>
      <div className="space-y-2"><Step n={2} text="Create temp directory." /><CodeBlock code="sudo mkdir /trellixtemp" /></div>
      <div className="space-y-2"><Step n={3} text="Change to directory." /><CodeBlock code="cd /trellixtemp" /></div>
      <div className="space-y-2">
        <Step n={4} text="Download the ENS package from the DREN server." />
        <p className="text-xs text-slate-500">For certificate trust errors see <Link href="/docs/ub/certificates" className="text-cyan-400 hover:underline">Add CA Certificate to Trusted CAs</Link>.</p>
        <CodeBlock code={`sudo curl ${ENS_BASE}/ens_tp.tar.gz -o ens_tp.tar.gz`} />
      </div>
      <div className="space-y-2"><Step n={5} text="Extract the installation files." /><CodeBlock code="sudo tar -zxvf ens_tp.tar.gz" /></div>
      <div className="space-y-2">
        <Step n={6} text="Run the installer (scroll to bottom of EULA, type 'accept')." />
        <Callout type="important">The <code className="code-inline">oasoff</code> flag prevents OAS from being enabled during installation.</Callout>
        <CodeBlock code="sudo ./install-mfetp.sh oasoff" />
      </div>
      <div className="space-y-2">
        <Step n={7} text="Disable McAfee GTI (BLCSE is not internet-connected)." />
        <CodeBlock code="cd /opt/McAfee/ens/tp/bin" />
        <CodeBlock className="mt-1" code="sudo ./mfetpcli --setoasglobalconfig --gti --state disable" />
        <CodeBlock className="mt-1" code="sudo ./mfetpcli --getoasconfig --summary" />
      </div>
      <div className="space-y-2"><Step n={8} text="Delete temp directory." /><CodeBlock code="sudo rm -rf /trellixtemp" /></div>
      <div className="space-y-2"><Step n={9} text="Re-enable ufw." /><CodeBlock code="sudo ufw enable && sudo ufw status" /></div>
    </div>
  )
}

function PAAContent() {
  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <DRENNotice />
      <p className="text-xs text-slate-400 italic">Tested on Ubuntu 22 and Ubuntu 24.</p>
      <div className="space-y-2"><Step n={1} text="Disable ufw and verify." /><CodeBlock code="sudo ufw disable && sudo ufw status" /></div>
      <div className="space-y-2"><Step n={2} text="Create temp directory." /><CodeBlock code="sudo mkdir /trellixtemp" /></div>
      <div className="space-y-2"><Step n={3} text="Change to directory." /><CodeBlock code="cd /trellixtemp" /></div>
      <div className="space-y-2">
        <Step n={4} text="Download Policy Auditor files from the DREN server." />
        <p className="text-xs text-slate-500">For certificate trust errors see <Link href="/docs/ub/certificates" className="text-cyan-400 hover:underline">Add CA Certificate to Trusted CAs</Link>.</p>
        <CodeBlock code={`sudo curl ${PAA_BASE}/install.sh -o install.sh`} />
        <CodeBlock className="mt-1" code={`sudo curl ${PAA_BASE}/paa-install.tar -o paa-install.tar`} />
      </div>
      <div className="space-y-2"><Step n={5} text="Run the installation shell." /><CodeBlock code="sudo bash install.sh" /></div>
      <div className="space-y-2">
        <Step n={6} text="Run the installer (scroll to bottom of EULA, type 'accept')." />
        <Callout type="important">The <code className="code-inline">oasoff</code> flag prevents OAS from being enabled during installation.</Callout>
        <CodeBlock code="sudo ./install-mfetp.sh oasoff" />
      </div>
      <div className="space-y-2">
        <Step n={7} text="Disable McAfee GTI (BLCSE is not internet-connected)." />
        <CodeBlock code="cd /opt/McAfee/ens/tp/bin" />
        <CodeBlock className="mt-1" code="sudo ./mfetpcli --setoasglobalconfig --gti --state disable" />
        <CodeBlock className="mt-1" code="sudo ./mfetpcli --getoasconfig --summary" />
      </div>
      <div className="space-y-2"><Step n={8} text="Delete temp directory." /><CodeBlock code="sudo rm -rf /trellixtemp" /></div>
      <div className="space-y-2"><Step n={9} text="Re-enable ufw." /><CodeBlock code="sudo ufw enable && sudo ufw status" /></div>
    </div>
  )
}

const cards = [
  {
    id: 'ub-agent',
    title: 'Trellix Agent Installation',
    description: 'Install the Trellix Agent on Ubuntu 22 and Ubuntu 24 systems via the DREN network.',
    tags: ['Agent', 'DEB', 'Ubuntu 22', 'Ubuntu 24'],
    glowColor: 'cyan' as const,
  },
  {
    id: 'ub-ens',
    title: 'Trellix ENS Installation',
    description: 'Install Trellix Endpoint Security (ENS) on Ubuntu systems via the DREN-side server.',
    tags: ['ENS', 'Endpoint Security', 'DREN'],
    glowColor: 'indigo' as const,
  },
  {
    id: 'ub-paa',
    title: 'Trellix Policy Auditor',
    description: 'Install the Trellix Policy Auditor Agent (PAA) on Ubuntu 22 and Ubuntu 24 via the DREN network.',
    tags: ['PAA', 'Policy Auditor', 'Ubuntu'],
    glowColor: 'orange' as const,
  },
]

const contentMap: Record<string, React.ReactNode> = {
  'ub-agent': <AgentContent />,
  'ub-ens':   <ENSContent />,
  'ub-paa':   <PAAContent />,
}

export function DRENTrellixUbuntuCards() {
  const [openCard, setOpenCard] = useState<string | null>(null)
  function toggle(id: string) { setOpenCard((prev) => (prev === id ? null : id)) }

  return (
    <div className="relative">
      <div className="grid md:grid-cols-3 gap-6 items-start">
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
                    <RouteThemedLogo route="/dren/trellix/ubuntu" fallbackSrc={DREN_PAGE_LOGOS['/dren/trellix/ubuntu']} alt="Trellix DREN" size="xl" glass glow variant="square" />
                    {isOpen && (
                      <button onClick={(e) => { e.stopPropagation(); setOpenCard(null) }}
                        className="text-slate-500 hover:text-white transition-colors p-1 rounded" aria-label="Close">
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

