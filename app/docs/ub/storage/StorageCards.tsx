'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { RouteThemedLogo } from '@/components/common/RouteThemedLogo'
import { GlowCard } from '@/components/ui/spotlight-card'
import { getCardGlowColor } from '@/lib/data/card-colors'
import { CodeBlock } from '@/components/common/CodeBlock'
import { Callout } from '@/components/layout/PageHeader'
import { DOCS_PAGE_LOGOS } from '@/lib/data/logos'

function Step({ n, text }: { n: number; text: string }) {
  return (
    <p className="text-xs text-slate-400">
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-cyan-400/20 text-cyan-400 text-[10px] font-bold mr-1.5">{n}</span>
      {text}
    </p>
  )
}

function FstabContent() {
  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <div className="space-y-2">
        <Step n={1} text="Identify disk and partition." />
        <CodeBlock code="lsblk" />
        <CodeBlock className="mt-1" code="sudo blkid" />
      </div>
      <div className="space-y-2"><Step n={2} text="Create mount point." /><CodeBlock code="sudo mkdir -p /mnt/mydata" /></div>
      <div className="space-y-2">
        <Step n={3} text="Edit /etc/fstab using UUID from blkid." />
        <CodeBlock code="sudo vi /etc/fstab" />
        <div className="p-2.5 rounded-lg border border-white/5 font-mono text-xs text-slate-300 mt-1" style={{ background: 'rgba(10,15,35,0.7)' }}>
          UUID=your-uuid-here  /mnt/mydata  ext4  nofail,x-systemd.device-timeout=10  0  2
        </div>
        <p className="text-xs text-slate-500 mt-1">
          The <code className="code-inline">nofail</code> option lets the system boot even if the drive is missing;
          <code className="code-inline">x-systemd.device-timeout=10</code> caps the wait at 10 seconds.
        </p>
      </div>
      <div className="space-y-2"><Step n={4} text="Reload units and test without rebooting." /><CodeBlock code="sudo systemctl daemon-reload" /><CodeBlock className="mt-1" code="sudo mount -a" /></div>
      <div className="space-y-2"><Step n={5} text="Verify." /><CodeBlock code="df -h | grep mydata" /></div>
    </div>
  )
}

function LvmContent() {
  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <p className="text-xs text-slate-500">Create an LVM logical volume on a fresh secondary disk (e.g. <code className="code-inline">/dev/sdb</code>) and mount it at <code className="code-inline">/mnt/storage</code>.</p>
      <div className="space-y-2"><Step n={1} text="Install LVM tools." /><CodeBlock code="sudo apt update && sudo apt install -y lvm2" /></div>
      <div className="space-y-2"><Step n={2} text="Create a physical volume on the new disk." /><CodeBlock code="sudo pvcreate /dev/sdb" /></div>
      <div className="space-y-2"><Step n={3} text="Create a volume group." /><CodeBlock code="sudo vgcreate vg_storage /dev/sdb" /></div>
      <div className="space-y-2"><Step n={4} text="Create a logical volume using all free space." /><CodeBlock code="sudo lvcreate -l 100%FREE -n lv_storage vg_storage" /></div>
      <div className="space-y-2"><Step n={5} text="Format the logical volume." /><CodeBlock code="sudo mkfs.ext4 /dev/vg_storage/lv_storage" /></div>
      <div className="space-y-2"><Step n={6} text="Create the mount point." /><CodeBlock code="sudo mkdir -p /mnt/storage" /></div>
      <div className="space-y-2">
        <Step n={7} text="Add a persistent fstab entry." />
        <CodeBlock code="echo '/dev/vg_storage/lv_storage  /mnt/storage  ext4  defaults  0  2' | sudo tee -a /etc/fstab" />
      </div>
      <div className="space-y-2"><Step n={8} text="Reload units and mount." /><CodeBlock code="sudo systemctl daemon-reload" /><CodeBlock className="mt-1" code="sudo mount -a" /></div>
    </div>
  )
}

function PartitionContent() {
  return (
    <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
      <Callout type="warning">
        Always back up your data before resizing partitions. These operations can result in data loss if performed incorrectly.
      </Callout>
      <div className="space-y-2"><Step n={1} text="Install tools." /><CodeBlock code="sudo apt install cloud-guest-utils e2fsprogs" /></div>
      <div className="space-y-2"><Step n={2} text="Identify disk." /><CodeBlock code="lsblk" /></div>
      <div className="space-y-2"><Step n={3} text="Grow partition." /><CodeBlock code="sudo growpart /dev/sda 1" /></div>
      <div className="space-y-2"><Step n={4} text="Resize filesystem." /><CodeBlock code="sudo resize2fs /dev/sda1" /></div>
      <div className="space-y-2"><Step n={5} text="Verify." /><CodeBlock code="df -h /" /></div>
    </div>
  )
}

const cards = [
  { id: 'fstab',     title: 'fstab Storage Mount', description: 'Persistently mount a filesystem using /etc/fstab with UUID-based entries.', tags: ['fstab', 'Mount', 'UUID', 'ext4'], glowColor: 'cyan'   as const },
  { id: 'lvm',       title: 'Logical Volume (LVM)', description: 'Create an LVM physical volume, volume group, and logical volume on a secondary drive.', tags: ['LVM', 'pvcreate', 'vgcreate', 'lvcreate'], glowColor: 'indigo' as const },
  { id: 'partition', title: 'Partition Resize',     description: 'Grow a partition and resize the filesystem online using growpart and resize2fs.', tags: ['Partition', 'Resize', 'growpart'], glowColor: 'orange' as const },
]

const contentMap: Record<string, React.ReactNode> = {
  fstab:     <FstabContent />,
  lvm:       <LvmContent />,
  partition: <PartitionContent />,
}

export function StorageCards() {
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
                <GlowCard className={`p-8 flex flex-col gap-6 w-full transition-all duration-300 ${isOpen ? 'ring-2 ring-cyan-400 shadow-[0_0_90px_rgba(0,212,255,0.8)]' : 'hover:ring-2 hover:ring-sky-300/70'}`} glowColor={getCardGlowColor(index)}>
                  <div className="flex items-start justify-between">
                    <RouteThemedLogo route="/docs/ub/storage" fallbackSrc={DOCS_PAGE_LOGOS['/docs/ub/storage']} alt="Ubuntu" size="xl" glass glow variant="square" />
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
