'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { RouteThemedLogo } from '@/components/common/RouteThemedLogo'
import { GlowCard } from '@/components/ui/spotlight-card'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { CodeBlock } from '@/components/common/CodeBlock'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'

interface GuideCard { id: string; title: string; description: string; tags: string[]; glowColor: 'cyan' | 'indigo' | 'orange' }

const cards: GuideCard[] = [
  {
    id: 'cron',
    title: 'Cron Jobs',
    description: 'Schedule recurring tasks using crontab on Enterprise Linux systems.',
    tags: ['Cron', 'crontab', 'Scheduling'],
    glowColor: 'cyan',
  },
  {
    id: 'systemctl',
    title: 'System Startup Service',
    description: 'Create and enable a custom systemd service that starts automatically at boot.',
    tags: ['systemd', 'systemctl', 'Service'],
    glowColor: 'indigo',
  },
  {
    id: 'ntp',
    title: 'NTP and Timezone',
    description: 'Configure the system timezone and synchronize time using NTP/chronyd.',
    tags: ['NTP', 'Timezone', 'chrony', 'timedatectl'],
    glowColor: 'orange',
  },
]

function Step({ n, text }: { n: number; text: string }) {
  return (
    <p className="text-xs text-slate-400">
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-cyan-400/20 text-cyan-400 text-[10px] font-bold mr-1.5">{n}</span>
      {text}
    </p>
  )
}

function CronContent() {
  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <p className="text-xs text-slate-400">Cron is a popular tool in Linux for scheduling tasks to run periodically.</p>
      <p className="text-xs font-semibold text-slate-300">Cron File Locations</p>
      <p className="text-xs text-slate-400"><code className="code-inline">/etc/crontab</code>: System-wide cron jobs (root privileges needed to edit)<br /><code className="code-inline">/etc/cron.d/</code>: Directory for per-user cron jobs. Note: cron.daily, cron.hourly, cron.weekly, and cron.monthly are symbolic links pointing to /etc/cron.d.</p>
      <p className="text-xs font-semibold text-slate-300">View CRON Job Runs</p>
      <CodeBlock code="grep CRON /var/log/cron" />
      <p className="text-xs font-semibold text-slate-300">Cron Job Format</p>
      <div className="p-2.5 rounded-lg border border-white/5 font-mono text-xs text-slate-300" style={{ background: 'rgba(10,15,35,0.7)' }}>
        <div>minute hour day_of_month month day_of_week command_to_run</div>
        <div className="text-slate-400 mt-1">minute (0-59) · hour (0-23) · day_of_month (1-31) · month (1-12) · day_of_week (0-6, 0=Sunday)</div>
        <div className="text-slate-400 mt-1">*=every  ,=multiple values  -=range  /=interval (e.g. */2)</div>
      </div>
      <p className="text-xs font-semibold text-slate-300">Examples</p>
      <div className="p-2.5 rounded-lg border border-white/5 font-mono text-xs text-slate-300 space-y-1" style={{ background: 'rgba(10,15,35,0.7)' }}>
        <div><span className="text-slate-400"># Daily at midnight</span></div>
        <div>0 0 * * * /path/to/backup.sh</div>
        <div className="mt-1"><span className="text-slate-400"># Every Sunday at 2:00 AM</span></div>
        <div>0 2 * * 0 sudo apt update &amp;&amp; sudo apt upgrade</div>
        <div className="mt-1"><span className="text-slate-400"># 1st of every month at 10:00 PM</span></div>
        <div>0 22 1 * * ./clean_disk.sh</div>
      </div>
      <p className="text-xs font-semibold text-slate-300">Root Crontab</p>
      <p className="text-xs text-slate-400">Important: Be cautious when editing the root crontab, as mistakes can affect system tasks.</p>
      <div className="space-y-2">
        <Step n={1} text="Edit the system-wide crontab." /><CodeBlock code="sudo vi /etc/crontab" />
        <Step n={2} text="Add a new line following the cron job format above, then save and close." />
      </div>
      <p className="text-xs font-semibold text-slate-300">User Crontab</p>
      <div className="space-y-2">
        <Step n={1} text="Create/edit a file in /etc/cron.d/ (replace 'task' with your desired name)." /><CodeBlock code="sudo vi /etc/cron.d/task.txt" />
        <Step n={2} text="Add a new line following the cron format. Note: this file is specific to your user. Save and close." />
        <Step n={3} text="Load the newly created cron jobs." /><CodeBlock code="sudo crontab /etc/cron.d/task.txt" />
      </div>
      <p className="text-xs font-semibold text-slate-300">Manage the Crontab Cache</p>
      <p className="text-xs text-slate-400">The cache automatically refreshes based on the latest crontab files.</p>
      <div className="space-y-1">
        <CodeBlock code="crontab -l" /><p className="text-xs text-slate-400 ml-1">List all cached jobs for current user.</p>
        <CodeBlock code="crontab -e" /><p className="text-xs text-slate-400 ml-1">Edit the cached list (does not affect persistent jobs).</p>
        <CodeBlock code="crontab -r" /><p className="text-xs text-slate-400 ml-1">Remove all cached jobs. Jobs will not run again until the crontab is repopulated.</p>
      </div>
      <p className="text-xs font-semibold text-slate-300">Disable or Delete a Job</p>
      <p className="text-xs text-slate-400">Note: After disabling or removing a task, it remains in the cache until the machine reboots, the cache is manually cleared, or the machine updates the cache automatically.</p>
      <p className="text-xs text-slate-400">To temporarily disable: comment out the line in the cron file. To permanently remove: delete the line or the file.</p>
    </div>
  )
}

function SystemctlContent() {
  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <p className="text-xs text-slate-400">Note: The example below is structured to disable a NIC at startup, but can be adapted for other startup tasks. The service name can be changed as long as it is unique and ends in .service.</p>
      <div className="space-y-2">
        <Step n={1} text="Create the service file." />
        <CodeBlock code="sudo touch /etc/systemd/system/disable-interface.service" />
      </div>
      <div className="space-y-2">
        <Step n={2} text="Open the file for editing." />
        <CodeBlock code="sudo vi /etc/systemd/system/disable-interface.service" />
      </div>
      <div className="space-y-2">
        <Step n={3} text="Add the following content, replacing interface_name with your actual NIC name." />
        <div className="p-2.5 rounded-lg border border-white/5 font-mono text-xs text-slate-300 space-y-0.5" style={{ background: 'rgba(10,15,35,0.7)' }}>
          <div className="text-cyan-400">[Unit]</div>
          <div>Description=Disable Network Interface at Startup</div>
          <div>After=network.target</div>
          <div className="mt-1 text-cyan-400">[Service]</div>
          <div>Type=oneshot</div>
          <div>ExecStart=ip link set <span className="italic text-slate-400">interface_name</span> down</div>
          <div className="mt-1 text-cyan-400">[Install]</div>
          <div>WantedBy=multi-user.target</div>
        </div>
      </div>
      <div className="space-y-2"><Step n={4} text="Save the file." /></div>
      <div className="space-y-2"><Step n={5} text="Enable the new service." /><CodeBlock code="sudo systemctl enable disable-interface.service" /></div>
      <div className="space-y-2"><Step n={6} text="Reload the systemctl daemon." /><CodeBlock code="sudo systemctl daemon-reload" /></div>
    </div>
  )
}

function NTPContent() {
  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <p className="text-xs font-semibold text-slate-300">Set Timezone</p>
      <div className="space-y-2">
        <Step n={1} text="Verify the timezone name for your region." /><CodeBlock code="timedatectl list-timezones" />
        <Step n={2} text="Set your timezone. Example: Eastern Time Zone." /><CodeBlock code="timedatectl set-timezone America/New_York" />
      </div>
      <p className="text-xs font-semibold text-slate-300">Set NTP — AlmaLinux 8, AlmaLinux 9, RockyLinux 8</p>
      <div className="space-y-2">
        <Step n={1} text="Install the chrony application (if not already installed)." /><CodeBlock code="yum install chrony" />
        <Step n={2} text="Edit the pool in /etc/chrony.conf to reflect your NTP server. Example: pool NTP_IP_Address" /><CodeBlock code="vi /etc/chrony.conf" />
        <Step n={3} text="Restart the chronyd service." /><CodeBlock code="systemctl restart chronyd" />
        <Step n={4} text="Verify NTP sources are reflecting your changes." /><CodeBlock code="chronyc sources" />
        <Step n={5} text="Verify the current time reflects correctly." /><CodeBlock code="timedatectl status" />
      </div>
      <p className="text-xs font-semibold text-slate-300">Set NTP — CentOS 7</p>
      <div className="space-y-2">
        <Step n={1} text="Install the chrony application (if not already installed)." /><CodeBlock code="yum install chrony" />
        <Step n={2} text="Edit the server in /etc/chrony.conf to reflect your NTP server. Example: server NTP_IP_Address" /><CodeBlock code="vi /etc/chrony.conf" />
        <Step n={3} text="Restart the chronyd service." /><CodeBlock code="systemctl restart chronyd" />
        <Step n={4} text="Verify NTP sources are reflecting your changes." /><CodeBlock code="chronyc sources" />
        <Step n={5} text="Verify the current time reflects correctly." /><CodeBlock code="timedatectl status" />
      </div>
    </div>
  )
}

const contentMap: Record<string, React.ReactNode> = {
  cron:      <CronContent />,
  systemctl: <SystemctlContent />,
  ntp:       <NTPContent />,
}

export function SystemSettingCards() {
  const [openCard, setOpenCard] = useState<string | null>(null)

  function toggle(id: string) {
    setOpenCard((prev) => (prev === id ? null : id))
  }

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
                    <RouteThemedLogo route="/docs/el/system-settings" fallbackSrc={DOCS_PAGE_LOGOS['/docs/el/system-settings']} alt="Enterprise Linux" size="xl" glass glow variant="square" />
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

