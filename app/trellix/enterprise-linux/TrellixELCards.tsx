'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import Link from 'next/link'
import { RouteThemedLogo } from '@/components/common/RouteThemedLogo'
import { GlowCard } from '@/components/ui/spotlight-card'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { CodeBlock } from '@/components/common/CodeBlock'
import { Callout } from '@/components/layout/PageHeader'
import { TRELLIX_PAGE_LOGOS } from '@/lib/data/logos'
import { URLS } from '@/lib/data/constants'

const BASE = URLS.trellixAgent

function Step({ n, text }: { n: number; text: string }) {
  return (
    <p className="text-xs text-slate-400">
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-cyan-400/20 text-cyan-400 text-[10px] font-bold mr-1.5">{n}</span>
      {text}
    </p>
  )
}

function AgentContent() {
  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <Callout type="important">
        It is the site&apos;s responsibility to ensure all required CSSP software is installed.
        Both <strong>On Access Scan</strong> and <strong>GTI</strong> are disabled during ENS installation.
      </Callout>
      <p className="text-xs text-slate-400 italic">Tested on AlmaLinux 8, AlmaLinux 9, RockyLinux 8, and CentOS 7.</p>

      <div className="space-y-2">
        <Step n={1} text="Disable and stop the firewall, then verify." />
        <CodeBlock code="sudo systemctl disable firewalld.service" />
        <CodeBlock className="mt-1" code="sudo systemctl stop firewalld.service" />
        <CodeBlock className="mt-1" code="sudo systemctl status firewalld.service" />
      </div>
      <div className="space-y-2"><Step n={2} text="Ensure unzip is installed." /><CodeBlock code="sudo yum install unzip" /></div>
      <div className="space-y-2"><Step n={3} text="Create a temporary directory." /><CodeBlock code="sudo mkdir /trellixtemp" /></div>
      <div className="space-y-2"><Step n={4} text="Change to the directory." /><CodeBlock code="cd /trellixtemp" /></div>
      <div className="space-y-2">
        <Step n={5} text="Download install scripts." />
        <p className="text-xs text-slate-500">For certificate trust errors see <Link href="/docs/el/certificates" className="text-cyan-400 hover:underline">Add CA Certificate to Trusted CAs</Link>.</p>
        <CodeBlock code={`sudo wget ${BASE}/install.sh`} />
        <CodeBlock className="mt-1" code={`sudo wget ${BASE}/installrpm.sh`} />
      </div>
      <div className="space-y-2">
        <Step n={6} text="Set permissions and run." />
        <CodeBlock code="sudo chmod +x install.sh installrpm.sh" />
        <CodeBlock className="mt-1" code="sudo ./install.sh -i" />
      </div>
      <div className="space-y-2"><Step n={7} text="Verify installation." /><CodeBlock code="ls /opt/McAfee/agent/bin" /></div>
      <div className="space-y-2"><Step n={8} text="Verify version." /><CodeBlock code="cd /opt/McAfee/agent/bin && sudo ./cmdagent -i" /></div>
      <div className="space-y-2"><Step n={9} text="Delete temp directory." /><CodeBlock code="sudo rm -rf /trellixtemp" /></div>
      <div className="space-y-2">
        <Step n={10} text="Re-enable and start the firewall." />
        <CodeBlock code="sudo systemctl enable firewalld.service" />
        <CodeBlock className="mt-1" code="sudo systemctl start firewalld.service" />
        <CodeBlock className="mt-1" code="sudo systemctl status firewalld.service" />
      </div>
    </div>
  )
}

function ENSContent() {
  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <Callout type="info">
        ENS installation guides are currently restricted to authorized administrators. Contact the CESC team for access.
      </Callout>
    </div>
  )
}

const cards = [
  {
    id: 'el-agent',
    title: 'Trellix Agent Installation',
    description: 'Install the Trellix Agent on Enterprise Linux (AlmaLinux 8/9, Rocky Linux 8, CentOS 7).',
    tags: ['Agent', 'RPM', 'AlmaLinux', 'CentOS'],
    glowColor: 'cyan' as const,
  },
  {
    id: 'el-ens',
    title: 'Trellix ENS Installation',
    description: 'Install Trellix Endpoint Security (ENS) on Enterprise Linux. Contact CESC for access.',
    tags: ['ENS', 'Endpoint Security', 'Restricted'],
    glowColor: 'indigo' as const,
  },
]

const contentMap: Record<string, React.ReactNode> = {
  'el-agent': <AgentContent />,
  'el-ens':   <ENSContent />,
}

export function TrellixELCards() {
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
                    <RouteThemedLogo route="/trellix/enterprise-linux" fallbackSrc={TRELLIX_PAGE_LOGOS['/trellix/enterprise-linux']} alt="Trellix" size="xl" glass glow variant="square" />
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

