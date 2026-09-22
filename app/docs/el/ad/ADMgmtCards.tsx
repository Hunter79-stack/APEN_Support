'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { RouteThemedLogo } from '@/components/common/RouteThemedLogo'
import { GlowCard } from '@/components/ui/spotlight-card'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { CodeBlock } from '@/components/common/CodeBlock'
import { Callout } from '@/components/layout/PageHeader'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'

interface GuideCard { id: string; title: string; description: string; tags: string[] }

const cards: GuideCard[] = [
  {
    id: 'join',
    title: 'Add to Active Directory',
    description: 'Join an Enterprise Linux machine to the BLCSE.MIL Active Directory domain using Realmd.',
    tags: ['Realmd', 'SSSD', 'Domain Join'],
  },
  {
    id: 'leave',
    title: 'Leave Active Directory',
    description: 'Remove an Enterprise Linux machine from the BLCSE.MIL Active Directory domain.',
    tags: ['Realmd', 'Domain Leave'],
  },
]

function JoinContent() {
  return (
    <div className="space-y-3 text-sm" onClick={(e) => e.stopPropagation()}>
      <div className="space-y-2">
        <Step n={1} text="Install required packages." />
        <CodeBlock code="sudo yum install realmd sssd oddjob oddjob-mkhomedir adcli sssd-ad cifs-utils msktutil krb5-workstation krb5-libs samba-common-tools" />
      </div>
      <div className="space-y-2">
        <Step n={2} text="Set hostname to the FQDN (e.g. hostname.blcse.mil)." />
        <CodeBlock code="sudo hostnamectl set-hostname FQDN" />
      </div>
      <div className="space-y-2">
        <Step n={3} text="Verify DNS and Search domain settings via nmtui." />
        <CodeBlock code="sudo nmtui" />
        <p className="text-xs text-slate-400">Select the interface in use and follow the onscreen prompts.</p>
      </div>
      <div className="space-y-2">
        <Step n={4} text="Reload NetworkManager config." />
        <CodeBlock code="sudo systemctl reload NetworkManager" />
      </div>
      <div className="space-y-2">
        <Step n={5} text="Join Active Directory." />
        <CodeBlock code="sudo realm join BLCSE.MIL -U username" />
        <Callout type="info">
          If you receive an error about a parent/child domain conflict, run{' '}
          <code className="code-inline">sudo realm discover BLCSE.MIL</code> and attempt to join again.
        </Callout>
      </div>
      <div className="space-y-2">
        <Step n={6} text="Verify domain join." />
        <CodeBlock code="realm list" />
      </div>
      <div className="space-y-2">
        <Step n={7} text="Configure sssd-nss.socket and sssd-pam.socket." />
        <p className="text-xs text-slate-400">a. Remove <code className="code-inline">nss</code> and <code className="code-inline">pam</code> from services in <code className="code-inline">/etc/sssd/sssd.conf</code>.</p>
        <CodeBlock code="sudo vi /etc/sssd/sssd.conf" />
        <p className="text-xs text-slate-400 mt-1">b. Remove <code className="code-inline">User=sssd</code>, <code className="code-inline">Group=sssd</code>, and <code className="code-inline">PermissionsStartOnly=true</code> from <strong className="text-white">[Service]</strong> in <code className="code-inline">/usr/lib/systemd/system/sssd-pam.service</code>.</p>
        <CodeBlock code="vi /usr/lib/systemd/system/sssd-pam.service" />
        <p className="text-xs text-slate-400 mt-1">c. Enable and restart sssd.</p>
        <CodeBlock code="sudo systemctl enable sssd sssd-nss.socket sssd-pam.socket" />
        <CodeBlock className="mt-1" code="sudo systemctl restart sssd sssd-nss.socket sssd-pam.socket" />
        <p className="text-xs text-slate-400 mt-1">d. Reboot, then check status.</p>
        <CodeBlock code="sudo systemctl status sssd sssd-nss.socket sssd-pam.socket" />
      </div>
    </div>
  )
}

function LeaveContent() {
  return (
    <div className="space-y-3 text-sm" onClick={(e) => e.stopPropagation()}>
      <div className="space-y-2">
        <Step n={1} text="Leave the domain." />
        <CodeBlock code="sudo realm leave BLCSE.MIL" />
      </div>
      <div className="space-y-2">
        <Step n={2} text="Verify the machine left the domain." />
        <CodeBlock code="realm list" />
      </div>
    </div>
  )
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <p className="text-xs text-slate-400">
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-cyan-400/20 text-cyan-400 text-[10px] font-bold mr-1.5">{n}</span>
      {text}
    </p>
  )
}

const contentMap: Record<string, React.ReactNode> = {
  join:  <JoinContent />,
  leave: <LeaveContent />,
}

export function ADMgmtCards() {
  const [openCard, setOpenCard] = useState<string | null>(null)

  function toggle(id: string) {
    setOpenCard((prev) => (prev === id ? null : id))
  }

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
                    <RouteThemedLogo route="/docs/el/ad" fallbackSrc={DOCS_PAGE_LOGOS['/docs/el/ad']} alt="Enterprise Linux" size="xl" glass glow variant="square" />
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
                    {card.tags.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded-md text-xs bg-white/5 text-slate-400 border border-white/5">{t}</span>
                    ))}
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

