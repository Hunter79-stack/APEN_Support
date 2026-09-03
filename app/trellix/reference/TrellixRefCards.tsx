'use client'

/**
 * Trellix Agent command reference — one tile per command.
 *
 * Was three GlowCards that each expanded to reveal the commands inside, with
 * membership decided by substring matching on the command text
 * (`['-p','-c','-e','-f'].some(f => cmd.includes(f))`) — which is why
 * `uninstall.sh` needed a separate filter, and why any future command
 * containing "-f" anywhere would silently have joined the ePO group.
 *
 * Now each command carries its own `category` and the three groups are section
 * headings. Nine one-line items is exactly what the compact tile is for, and a
 * copy button replaces the download button: these are commands, not files.
 */

import { useMemo } from 'react'
import { TileGrid, type TileItem } from '@/components/cards/TileGrid'

type RefCategory = 'ePO Communication' | 'Agent Info & Help' | 'Maintenance'

const CATEGORY_ORDER: readonly RefCategory[] = ['ePO Communication', 'Agent Info & Help', 'Maintenance']

const cmds: Array<{ id: string; cmd: string; desc: string; category: RefCategory }> = [
  { id: 'basedir',   cmd: 'sudo /etc/init.d/cma basedir',                desc: 'Locate the Trellix Agent installation directory.', category: 'Agent Info & Help' },
  { id: 'props',     cmd: 'sudo /opt/McAfee/agent/bin/cmdagent -p',      desc: 'Collect and send properties to ePO.',              category: 'ePO Communication' },
  { id: 'checkin',   cmd: 'sudo /opt/McAfee/agent/bin/cmdagent -c',      desc: 'Check for new properties and tasks.',              category: 'ePO Communication' },
  { id: 'enforce',   cmd: 'sudo /opt/McAfee/agent/bin/cmdagent -e',      desc: 'Enforce policies.',                                category: 'ePO Communication' },
  { id: 'info',      cmd: 'sudo /opt/McAfee/agent/bin/cmdagent -i',      desc: 'Show additional agent information.',               category: 'Agent Info & Help' },
  { id: 'forward',   cmd: 'sudo /opt/McAfee/agent/bin/cmdagent -f',      desc: 'Forward events to the ePO server.',                category: 'ePO Communication' },
  { id: 'help',      cmd: 'sudo /opt/McAfee/agent/bin/cmdagent -h',      desc: 'Help — lists all switches and descriptions.',      category: 'Agent Info & Help' },
  { id: 'logpath',   cmd: 'sudo /opt/McAfee/agent/bin/cmdagent -l',      desc: 'Set the location of the log file.',                category: 'Agent Info & Help' },
  { id: 'uninstall', cmd: 'sudo /opt/McAfee/agent/scripts/uninstall.sh', desc: 'Uninstall the Trellix agent.',                     category: 'Maintenance' },
]

export function TrellixRefCards() {
  const items = useMemo<TileItem[]>(
    () => cmds.map((c) => ({
      id: c.id,
      // The command IS the item — as visible text, so it stays selectable and
      // copy-pasteable without JS, and stays in the search index.
      title: c.cmd,
      subtitle: c.desc,
      category: c.category,
      copyText: c.cmd,
    })),
    [],
  )

  return (
    <TileGrid
      items={items}
      categoryOrder={CATEGORY_ORDER}
      showCounts
      unitLabel="command"
      // Every command would otherwise show the same Trellix mark nine times.
      showIcons={false}
      gridCols="sm:grid-cols-2 lg:grid-cols-3"
    />
  )
}
