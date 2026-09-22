/**
 * Muted text on the dark theme must stay at slate-400 or lighter: slate-500
 * measures 4.1:1 on --bg-primary (#060b18) and slate-600/700 under 2.6:1, all
 * below the 4.5:1 WCAG AA floor. components/legal renders on white, where the
 * darker shades pass, so it is the one exemption.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name)
    return e.isDirectory() ? walk(p) : e.name.endsWith('.tsx') ? [p] : []
  })
}

test('no text-slate-500/600/700 on dark-background components', () => {
  const offenders: string[] = []
  for (const root of ['app', 'components']) {
    for (const file of walk(path.join(process.cwd(), root))) {
      if (file.includes(`${path.sep}components${path.sep}legal${path.sep}`)) continue
      const src = fs.readFileSync(file, 'utf8')
      for (const m of src.matchAll(/\btext-slate-(500|600|700)\b/g)) offenders.push(`${path.relative(process.cwd(), file)}: ${m[0]}`)
    }
  }
  assert.deepEqual(offenders, [], 'use text-slate-400 (7.7:1) for muted text on the dark background')
})
