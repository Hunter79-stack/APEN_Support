'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import Link from 'next/link'
import { RouteThemedLogo } from '@/components/common/RouteThemedLogo'
import { GlowCard } from '@/components/ui/spotlight-card'
import { CodeBlock } from '@/components/common/CodeBlock'
import { Callout } from '@/components/layout/PageHeader'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'
import { URLS } from '@/lib/data/constants'

interface ELDistro {
  id: string
  distro: string
  version: string
  forceFlag: string
  rhel: string
  prereqPkg: string
  glowColor: 'cyan' | 'indigo' | 'orange'
  tags: string[]
  isNew?: boolean
}

// CentOS 7 runs with NO --ForceSTIG (empty forceFlag); Alma/Rocky use the
// RHEL8/RHEL9 compatibility flag exactly as the legacy guides documented.
const distros: ELDistro[] = [
  { id: 'alma8',   distro: 'AlmaLinux',   version: '8',  forceFlag: 'RHEL8',  rhel: '8',  prereqPkg: 'libicu lshw', glowColor: 'cyan',   tags: ['AlmaLinux 8',   'RHEL8']  },
  { id: 'alma9',   distro: 'AlmaLinux',   version: '9',  forceFlag: 'RHEL9',  rhel: '9',  prereqPkg: 'libicu lshw', glowColor: 'cyan',   tags: ['AlmaLinux 9',   'RHEL9']  },
  { id: 'centos7', distro: 'CentOS',      version: '7',  forceFlag: '',       rhel: '7',  prereqPkg: 'libicu lshw', glowColor: 'indigo', tags: ['CentOS 7']  },
  { id: 'rocky8',  distro: 'Rocky Linux', version: '8',  forceFlag: 'RHEL8',  rhel: '8',  prereqPkg: 'libicu lshw', glowColor: 'indigo', tags: ['Rocky Linux 8', 'RHEL8']  },
  { id: 'rocky9',  distro: 'Rocky Linux', version: '9',  forceFlag: 'RHEL9',  rhel: '9',  prereqPkg: 'libicu lshw', glowColor: 'indigo', tags: ['Rocky Linux 9', 'RHEL9']  },
]

function Step({ n, text }: { n: number; text: string }) {
  return (
    <p className="text-xs text-slate-400">
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-cyan-400/20 text-cyan-400 text-[10px] font-bold mr-1.5">{n}</span>
      {text}
    </p>
  )
}

function GuideContent({ d }: { d: ELDistro }) {
  const cmd = `sudo bash Evaluate-STIG_Bash.sh --ScanType Classified${d.forceFlag ? ` --ForceSTIG ${d.forceFlag}` : ''} --Output CKL --OutputPath /var/evaluate-stig`
  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Prerequisites</p>
      <div className="space-y-2">
        <Step n={1} text="Install required libraries." />
        <CodeBlock code={`sudo yum install ${d.prereqPkg}`} />
      </div>
      <div className="space-y-2">
        <Step n={2} text="Install PowerShell (recommended)." />
        <CodeBlock code="sudo yum update" />
        <CodeBlock className="mt-1" code="sudo yum install powershell" />
      </div>

      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-2">How to Run</p>
      <div className="space-y-2">
        <Step n={1} text="Create a local directory." />
        <CodeBlock code="sudo mkdir /var/evaluate-stig" />
      </div>
      <div className="space-y-2">
        <Step n={2} text="Download Evaluate-STIG." />
        <CodeBlock code={`sudo curl ${URLS.evaluateStigDownload}/Evaluate-STIG.tar.gz -o /var/evaluate-stig/Evaluate-STIG.tar.gz`} />
        <p className="text-xs text-slate-400 mt-1">
          For certificate trust errors, see{' '}
          <Link href="/docs/el/certificates" className="text-cyan-400 hover:underline">Add CA Certificate to Trusted CAs</Link>.
        </p>
      </div>
      <div className="space-y-2">
        <Step n={3} text="Extract and clean up." />
        <CodeBlock code="cd /var/evaluate-stig" />
        <CodeBlock className="mt-1" code="sudo tar -xzf Evaluate-STIG.tar.gz" />
        <CodeBlock className="mt-1" code="sudo rm -rf Evaluate-STIG.tar.gz" />
      </div>
      <div className="space-y-2">
        <Step n={4} text="Run the scan (must be executed as sudo)." />
        <CodeBlock code="cd /var/evaluate-stig/Evaluate-STIG" />
        <CodeBlock className="mt-1" code={cmd} />
      </div>
      <Callout type="info">
        To list all supported checklists: <CodeBlock className="mt-1" code="sudo bash Evaluate-STIG_Bash.sh --ListSupportedProducts" />
      </Callout>
    </div>
  )
}

export function STIGEnterpriseLinuxCard() {
  const [openCard, setOpenCard] = useState<string | null>(null)
  function toggle(id: string) { setOpenCard((prev) => (prev === id ? null : id)) }

  return (
    <div className="relative">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start">
        {distros.map((d, index) => {
          const isOpen = openCard === d.id
          return (
            <div key={d.id} className="relative">
              <div onClick={() => toggle(d.id)} className="cursor-pointer select-none transition-all duration-300 ease-out"
                role="button" aria-expanded={isOpen} tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggle(d.id)}>
                <GlowCard className={`p-8 flex flex-col gap-6 w-full transition-all duration-300 ${isOpen ? 'ring-2 ring-cyan-400 shadow-[0_0_90px_rgba(0,212,255,0.8)]' : 'hover:ring-2 hover:ring-sky-300/70'}`} glowColor={getCardGlowColor(index)}>
                  <div className="flex items-start justify-between">
                    <RouteThemedLogo route="/docs/evaluate-stig/linux/enterprise" fallbackSrc={DOCS_PAGE_LOGOS['/docs/evaluate-stig/linux/enterprise']} alt="Evaluate-STIG" size="xl" glass glow variant="square" />
                    {isOpen && <button onClick={(e) => { e.stopPropagation(); setOpenCard(null) }} className="text-slate-400 hover:text-white transition-colors p-1 rounded" aria-label="Close"><X size={14} /></button>}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold text-white">STIG for {d.distro} {d.version}</p>
                      {d.isNew && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-400/20 text-emerald-400 border border-emerald-400/30">New</span>}
                    </div>
                    <p className={`text-sm leading-relaxed mt-1.5 ${isOpen ? 'text-slate-300' : 'text-slate-400'}`}>
                      Run Evaluate-STIG{d.forceFlag && <> with <code className="code-inline">--ForceSTIG {d.forceFlag}</code></>} on {d.distro} {d.version}.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {d.tags.map((t) => <span key={t} className="px-2 py-0.5 rounded-md text-xs bg-white/5 text-slate-400 border border-white/5">{t}</span>)}
                  </div>
                  {!isOpen && <p className="text-xs text-cyan-400 mt-auto">Click to view guide →</p>}
                  {isOpen && (
                    <div className="border-t border-white/10 pt-3">
                      <GuideContent d={d} />
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
