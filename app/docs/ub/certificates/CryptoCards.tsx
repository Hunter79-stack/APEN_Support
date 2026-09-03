'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { RouteThemedLogo } from '@/components/common/RouteThemedLogo'
import { GlowCard } from '@/components/ui/spotlight-card'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { CodeBlock } from '@/components/common/CodeBlock'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'
import { APENSUPPORT_CERT_DOWNLOAD_BASE } from '@/lib/data/constants'

function Step({ n, text }: { n: number; text: string }) {
  return (
    <p className="text-xs text-slate-400">
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-cyan-400/20 text-cyan-400 text-[10px] font-bold mr-1.5">{n}</span>
      {text}
    </p>
  )
}

function CAContent() {
  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <div className="space-y-2"><Step n={1} text="Curl the CA cert to the local machine." /><CodeBlock code={`sudo curl ${APENSUPPORT_CERT_DOWNLOAD_BASE}/cuica.crt -o /usr/local/share/ca-certificates/cuica.crt`} /></div>
      <div className="space-y-2"><Step n={2} text="Tell the machine to update its CA certificate store." /><CodeBlock code="sudo update-ca-certificates" /></div>
      <div className="space-y-2"><Step n={3} text="View the list of trusted CAs." /><CodeBlock code="cat /etc/ssl/certs/ca-certificates.crt" /></div>
      <div className="space-y-2"><Step n={4} text="Verify the public key at the bottom of the trusted CAs matches the newly added certificate." /><CodeBlock code="cat /usr/local/share/ca-certificates/cuica.crt" /></div>
      <p className="text-xs text-slate-500">Note: Newly added CA certificates are typically added to the bottom of the list.</p>
    </div>
  )
}

function OpenSSLContent() {
  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <div className="space-y-2"><Step n={1} text="DER → PEM." /><CodeBlock code="openssl x509 -inform der -in certificate.cer -out certificate.pem" /></div>
      <div className="space-y-2"><Step n={2} text="PEM → DER." /><CodeBlock code="openssl x509 -outform der -in certificate.pem -out certificate.der" /></div>
      <div className="space-y-2">
        <Step n={3} text="PFX → PEM." />
        <CodeBlock code="openssl pkcs12 -in certificate.pfx -nocerts -out key.pem" />
        <CodeBlock className="mt-1" code="openssl pkcs12 -in certificate.pfx -clcerts -nokeys -out cert.pem" />
      </div>
      <div className="space-y-2"><Step n={4} text="View certificate details." /><CodeBlock code="openssl x509 -in certificate.pem -text -noout" /></div>
    </div>
  )
}

function SSHContent() {
  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <p className="text-xs font-semibold text-slate-300">Linux → Enterprise Linux / Ubuntu</p>
      <p className="text-xs text-slate-500">Creates an RSA keypair to SSH without a password. The passphrase you set will become your new SSH password.</p>
      <div className="space-y-2">
        <Step n={1} text="Generate an RSA keypair. Press Enter to accept the default save location, then enter a passphrase." />
        <CodeBlock code="ssh-keygen -t rsa -b 4096" />
      </div>
      <div className="space-y-2">
        <Step n={2} text="Copy the public key to the remote server." />
        <CodeBlock code="ssh-copy-id user@ip-address" />
      </div>
      <div className="space-y-2">
        <Step n={3} text="Configure the SSH daemon (Advanced). Edit the sshd_config file." />
        <CodeBlock code="sudo vi /etc/ssh/sshd_config" />
        <p className="text-xs text-slate-500 mt-1">Ensure the following lines are set. Warning: disabling PasswordAuthentication will block SSH from any machine without an RSA keypair trust.</p>
        <div className="p-2.5 rounded-lg border border-white/5 font-mono text-xs text-slate-300 space-y-0.5 mt-1" style={{ background: 'rgba(10,15,35,0.7)' }}>
          <div>PubkeyAuthentication yes</div>
          <div>AuthorizedKeysFile .ssh/authorized_keys .ssh/authorized_keys2</div>
          <div>PasswordAuthentication no</div>
        </div>
        <CodeBlock className="mt-1" code="sudo systemctl restart sshd" />
      </div>
      <div className="space-y-2">
        <Step n={4} text="Test SSH key authentication." />
        <CodeBlock code="ssh user@ip-address" />
      </div>
      <p className="text-xs font-semibold text-slate-300 mt-2">Windows 11 → Enterprise Linux / Ubuntu</p>
      <p className="text-xs text-slate-500">Note: Most Ubuntu machines already have <code className="code-inline">~/.ssh/authorized_keys</code>. Enterprise Linux machines may not — run <code className="code-inline">ssh-keygen -t rsa -b 4096</code> on the target profile to create it first.</p>
      <div className="space-y-2">
        <Step n={1} text="Open Windows Terminal and generate your RSA keypair." />
        <CodeBlock code="ssh-keygen -t rsa -b 4096" />
      </div>
      <div className="space-y-2">
        <Step n={2} text="Retrieve your public key." />
        <CodeBlock code="cat ~/.ssh/id_rsa.pub" />
      </div>
      <div className="space-y-2">
        <Step n={3} text="SSH to the target machine and append the public key to the authorized_keys file." />
        <CodeBlock code="/home/username/.ssh/authorized_keys" />
      </div>
      <div className="space-y-2">
        <Step n={4} text="Test the connection from Windows." />
        <CodeBlock code="ssh user@ip-address" />
      </div>
    </div>
  )
}

const cards = [
  { id: 'ca',      title: 'Add CA Certificate',           description: 'Add a CA certificate to the Ubuntu system trust store.',                         tags: ['CA Cert', 'Trust Store', 'PKI'], glowColor: 'cyan'   as const },
  { id: 'openssl', title: 'Modify Certificates (OpenSSL)', description: 'Convert certificate formats (DER, PEM, PFX) and inspect certs using OpenSSL.',   tags: ['OpenSSL', 'DER', 'PEM', 'PFX'],  glowColor: 'indigo' as const },
  { id: 'ssh',     title: 'SSH RSA Keypair',               description: 'Generate an RSA keypair and configure passwordless SSH authentication.',           tags: ['SSH', 'RSA', 'Keypair'],          glowColor: 'orange' as const },
]

const contentMap: Record<string, React.ReactNode> = {
  ca:      <CAContent />,
  openssl: <OpenSSLContent />,
  ssh:     <SSHContent />,
}

export function CryptoCards() {
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
                <GlowCard className={`p-8 flex flex-col gap-6 w-full transition-all duration-300 ${isOpen ? 'ring-2 ring-cyan-400 shadow-[0_0_90px_rgba(0,212,255,0.8)]' : 'hover:ring-2 hover:ring-sky-300/70'}`} glowColor={getCardGlowColor(index)}>
                  <div className="flex items-start justify-between">
                    <RouteThemedLogo route="/docs/ub/certificates" fallbackSrc={DOCS_PAGE_LOGOS['/docs/ub/certificates']} alt="Ubuntu" size="xl" glass glow variant="square" />
                    {isOpen && <button onClick={(e) => { e.stopPropagation(); setOpenCard(null) }} className="text-slate-500 hover:text-white transition-colors p-1 rounded" aria-label="Close"><X size={14} /></button>}
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-semibold text-white">{card.title}</p>
                    <p className={`text-sm leading-relaxed mt-1.5 ${isOpen ? 'text-slate-300' : 'text-slate-400'}`}>{card.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {card.tags.map((t) => <span key={t} className="px-2 py-0.5 rounded-md text-xs bg-white/5 text-slate-400 border border-white/5">{t}</span>)}
                  </div>
                  {!isOpen && <p className="text-xs text-cyan-400 mt-auto">Click to view guide →</p>}
                  {isOpen && <div className="border-t border-white/10 pt-3">{contentMap[card.id]}</div>}
                </GlowCard>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

