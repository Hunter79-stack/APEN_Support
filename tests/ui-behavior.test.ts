/**
 * Behavioural UI tests: import the component modules and assert on what
 * their exported helpers return. The source-text guards that used to sit
 * beside these are in tests/source-guards.test.ts.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import type { ComponentType } from 'react'

type ModuleExports = Record<string, unknown>

/** Server-render a component the way a static export does (no effects run). */
async function renderStatic(component: unknown, props: Record<string, unknown> = {}): Promise<string> {
  const { renderToStaticMarkup } = await import('react-dom/server')
  const { createElement } = await import('react')
  return renderToStaticMarkup(createElement(component as ComponentType<Record<string, unknown>>, props))
}

/** What a visitor reads: tags stripped, the entities React escapes decoded. */
function visibleText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
}

/** A page's default export. The path goes through a variable on purpose:
 *  a literal '.tsx' specifier in import() is a TS5097 error under tsc. */
async function importDefault(path: string): Promise<unknown> {
  return (await import(path)).default
}

async function importComponentModule(path: string): Promise<ModuleExports> {
  const imported = await import(path)
  return (
    (imported['module.exports' as keyof typeof imported] as ModuleExports | undefined) ??
    (imported.default as ModuleExports | undefined) ??
    (imported as ModuleExports)
  )
}

test('activity chart falls back to array data when live data is not an array', async () => {
  const chartModule = await importComponentModule('../components/ui/activity-chart-card.tsx')
  const resolveActivityChartData = chartModule.resolveActivityChartData as
    | ((args: Record<string, unknown>) => {
        activeData: Array<{ day: string; value: number }>
        activeTotal: string
        topIPs: unknown[]
      })
    | undefined

  assert.equal(typeof resolveActivityChartData, 'function')
  assert.ok(resolveActivityChartData)

  const resolved = resolveActivityChartData({
    selected: 'Daily',
    today: 'Fri Apr 24 2026',
    live: true,
    stats: {
      chart: { Daily: false },
      totals: { Daily: '2' },
      topIPs: { Daily: 'not-an-array' },
      totalToday: 2,
    },
    showTopIPs: true,
  })

  assert.equal(Array.isArray(resolved.activeData), true)
  assert.equal(resolved.activeData.length, 12)
  assert.equal(resolved.activeTotal, '2')
  assert.deepEqual(resolved.topIPs, [])
})

test('activity chart uses live arrays and top IP arrays when available', async () => {
  const chartModule = await importComponentModule('../components/ui/activity-chart-card.tsx')
  const resolveActivityChartData = chartModule.resolveActivityChartData as (args: Record<string, unknown>) => {
    activeData: Array<{ day: string; value: number }>
    activeTotal: string
    topIPs: Array<{ ip: string; count: number }>
  }

  const livePoint = { day: '9a', value: 7 }
  const liveTopIP = { ip: '192.0.2.1', count: 3 }

  const resolved = resolveActivityChartData({
    selected: 'Daily',
    today: 'Fri Apr 24 2026',
    live: true,
    stats: {
      chart: { Daily: [livePoint] },
      totals: { Daily: '7' },
      topIPs: { Daily: [liveTopIP] },
      totalToday: 7,
    },
    showTopIPs: true,
  })

  assert.deepEqual(resolved.activeData, [livePoint])
  assert.equal(resolved.activeTotal, '7')
  assert.deepEqual(resolved.topIPs, [liveTopIP])
})

test('AI assistant idle auto-open only happens once when closed with no text selection', async () => {
  const assistantModule = await importComponentModule('../components/ui/APEN-chat-assistant.tsx')
  const shouldAutoOpenAssistant = assistantModule.shouldAutoOpenAssistant as
    | ((args: { open: boolean; hasAutoOpened: boolean; selectedText: string; lowPowerMode?: boolean }) => boolean)
    | undefined

  assert.equal(typeof shouldAutoOpenAssistant, 'function')
  assert.ok(shouldAutoOpenAssistant)
  assert.equal(shouldAutoOpenAssistant({ open: false, hasAutoOpened: false, selectedText: '' }), true)
  assert.equal(shouldAutoOpenAssistant({ open: true, hasAutoOpened: false, selectedText: '' }), false)
  assert.equal(shouldAutoOpenAssistant({ open: false, hasAutoOpened: true, selectedText: '' }), false)
  assert.equal(shouldAutoOpenAssistant({ open: false, hasAutoOpened: false, selectedText: 'selected' }), false)
  assert.equal(shouldAutoOpenAssistant({ open: false, hasAutoOpened: false, selectedText: '', lowPowerMode: true }), false)
})

test('AI assistant uses the Voltron custom image', async () => {
  const assistantModule = await importComponentModule('../components/ui/APEN-chat-assistant.tsx')
  assert.equal(assistantModule.VOLTRON_IMAGE_SRC, '/logos/brands/VOLTRON.webp')
})

test('AI assistant panel opens fully on-screen from a bottom-right anchor', async () => {
  const assistantModule = await importComponentModule('../components/ui/APEN-chat-assistant.tsx')
  const getAssistantPanelPosition = assistantModule.getAssistantPanelPosition as (
    button: { x: number; y: number },
    viewport: { width: number; height: number },
    panelSize: { width: number; height: number },
  ) => { x: number; y: number }

  assert.equal(typeof getAssistantPanelPosition, 'function')

  // The panel must be placed using the size it actually RENDERS at, not a
  // smaller fixed assumption — otherwise its bottom/right edges spill off the
  // viewport and the window opens barely visible in the corner. Positioning a
  // large panel from an inset bottom-right button must keep it fully on-screen.
  const viewport = { width: 1920, height: 1080 }
  const button = { x: 1815, y: 975 }        // inset bottom-right anchor
  const panelSize = { width: 620, height: 880 } // real default open size

  const pos = getAssistantPanelPosition(button, viewport, panelSize)

  assert.ok(pos.x >= 0, `panel left ${pos.x} must be >= 0`)
  assert.ok(pos.y >= 0, `panel top ${pos.y} must be >= 0`)
  assert.ok(
    pos.x + panelSize.width <= viewport.width,
    `panel right ${pos.x + panelSize.width} must be <= viewport width ${viewport.width}`,
  )
  assert.ok(
    pos.y + panelSize.height <= viewport.height,
    `panel bottom ${pos.y + panelSize.height} must be <= viewport height ${viewport.height}`,
  )
})

test('AI assistant name pill and greeting card flip away from the nearest screen edge', async () => {
  const assistantModule = await importComponentModule('../components/ui/APEN-chat-assistant.tsx')
  const getAssistantCalloutAnchor = assistantModule.getAssistantCalloutAnchor as (
    button: { x: number; y: number } | null,
    viewport: { width: number; height: number },
    buttonSize?: number,
  ) => { horizontal: 'left' | 'right'; vertical: 'up' | 'down' }

  assert.equal(typeof getAssistantCalloutAnchor, 'function')

  const viewport = { width: 1920, height: 1080 }

  // Resting bottom-right anchor: both callouts must grow inward (left / up),
  // or the "Voltron Virtual Assistant" label runs straight off the screen.
  assert.deepEqual(
    getAssistantCalloutAnchor({ x: 1815, y: 975 }, viewport),
    { horizontal: 'left', vertical: 'up' },
  )

  // Dragged to the opposite corner, they must mirror rather than clip.
  assert.deepEqual(
    getAssistantCalloutAnchor({ x: 16, y: 16 }, viewport),
    { horizontal: 'right', vertical: 'down' },
  )

  // Pre-hydration (no stored position yet) the button is CSS-anchored
  // bottom-right, so the callouts must already be aimed left/up — anything
  // else produces a visible flip on the first client render.
  assert.deepEqual(
    getAssistantCalloutAnchor(null, viewport),
    { horizontal: 'left', vertical: 'up' },
  )
  assert.deepEqual(
    getAssistantCalloutAnchor({ x: 1815, y: 975 }, { width: 0, height: 0 }),
    { horizontal: 'left', vertical: 'up' },
  )
})

test('assistant feedback uses local AI-style moderation to flag offensive comments', async () => {
  const moderationModule = await importComponentModule('../lib/feedback-moderation.strict.ts')
  const analyzeFeedbackContent = moderationModule.analyzeFeedbackContent as
    | ((text: string) => { flagged: boolean; severity: string; reasons: string[]; guidance: string })
    | undefined
  // Moderation runs inside the feedback form component (code-quality #76).
  const assistantSource = fs.readFileSync(path.join('components', 'assistant', 'FeedbackForm.tsx'), 'utf8')
  const proxySource = fs.readFileSync(path.join('proxy', 'site-stats.mjs'), 'utf8')

  assert.equal(typeof analyzeFeedbackContent, 'function')
  assert.ok(analyzeFeedbackContent)

  const clean = analyzeFeedbackContent('The VMware card is missing the checksum link.')
  assert.equal(clean.flagged, false)
  assert.equal(clean.severity, 'clear')

  const hostile = analyzeFeedbackContent('The help flow is stupid and the owner is an idiot.')
  assert.equal(hostile.flagged, true)
  assert.equal(hostile.severity, 'review')
  assert.ok(hostile.reasons.includes('Personal attack'))
  assert.match(hostile.guidance, /revise/i)

  assert.match(assistantSource, /analyzeFeedbackContent/)
  assert.match(assistantSource, /feedbackModeration\.flagged/)
  assert.match(assistantSource, /Local AI/)
  assert.match(assistantSource, /moderation: feedbackModeration/)
  assert.match(proxySource, /data\.moderation/)
  assert.match(proxySource, /Flagged by Local AI/)
})

test('static links use the Next router only for application routes', async () => {
  const staticLinkModule = await importComponentModule('../lib/utils/static-link.ts')
  const isClientRoutableHref = staticLinkModule.isClientRoutableHref as (href: string) => boolean
  assert.equal(isClientRoutableHref('/docs/repos'), true)
  assert.equal(isClientRoutableHref('/downloads/file.msi'), false)
  assert.equal(isClientRoutableHref('/speedtest/'), false)
  assert.equal(isClientRoutableHref('https://example.test'), false)
})

test('assistant attachment policy rejects large and unsupported files', async () => {
  const policyModule = await importComponentModule('../lib/assistant/policy.ts')
  const validate = policyModule.validateAssistantAttachment as (file: { name: string; size: number }) => string | null
  const limitLabel = policyModule.ASSISTANT_ATTACHMENT_LIMIT_LABEL as string
  const maxBytes = policyModule.MAX_ASSISTANT_ATTACHMENT_BYTES as number

  assert.equal(validate({ name: 'notes.txt', size: 1024 }), null)
  assert.match(validate({ name: 'payload.exe', size: 1024 }) ?? '', /approved text/i)
  assert.equal(validate({ name: 'empty.log', size: 0 }), 'The selected file is empty.')

  // The cap was deliberately raised from 256 KB to 10 MB (support tickets carry
  // real log dumps); this assertion tracked the OLD number and had to be fixed.
  // A 300 KB log is now perfectly valid.
  assert.equal(validate({ name: 'large.log', size: 300_000 }), null)

  // Oversize files must still be refused, and the message must quote the same
  // label the attach tooltip shows — that pairing is what went stale before.
  assert.equal(limitLabel, '10 MB')
  assert.match(validate({ name: 'huge.log', size: maxBytes + 1 }) ?? '', new RegExp(limitLabel))
})

test('idle sessions are redirected to the sign-in host after 30 minutes', async () => {
  const idleModule = await importComponentModule('../lib/data/session-idle.ts')
  const SESSION_IDLE = idleModule.SESSION_IDLE as { timeoutMs: number; redirectUrl: string; pollMs: number }
  const hasSessionGoneIdle = idleModule.hasSessionGoneIdle as (last: number, now: number, timeout?: number) => boolean
  const isExempt = idleModule.isSessionIdleExemptPath as (p: string | null) => boolean

  assert.equal(SESSION_IDLE.timeoutMs, 30 * 60_000)
  // Root-relative on purpose: an absolute host here would send idle users to
  // whatever the site used to be called. '/' follows any rename for free.
  assert.equal(SESSION_IDLE.redirectUrl, '/')
  assert.doesNotMatch(SESSION_IDLE.redirectUrl, /^https?:\/\//)

  // Boundary: expiry is inclusive at exactly the timeout.
  const t0 = 1_000_000
  assert.equal(hasSessionGoneIdle(t0, t0 + SESSION_IDLE.timeoutMs - 1), false)
  assert.equal(hasSessionGoneIdle(t0, t0 + SESSION_IDLE.timeoutMs), true)
  // "Stale" — machine slept for hours — must read the same as plain idle.
  assert.equal(hasSessionGoneIdle(t0, t0 + 6 * 60 * 60_000), true)

  // The poll must be well under the timeout, or the redirect lands late.
  assert.ok(SESSION_IDLE.pollMs > 0 && SESSION_IDLE.pollMs < SESSION_IDLE.timeoutMs / 10)

  // Redirecting these would reload the page the user is already on, in a loop.
  for (const p of ['/', '/login', '/login/', '']) assert.equal(isExempt(p), true, `${p} must be exempt`)
  for (const p of ['/support', '/applications/speedtest/', '/admin']) {
    assert.equal(isExempt(p), false, `${p} must NOT be exempt`)
  }

  const watcherSource = fs.readFileSync(path.join('components', 'layout', 'SessionIdleRedirect.tsx'), 'utf8')
  // Wall-clock polling, not one long timer: background tabs throttle timers and
  // suspended machines stop them, so a single setTimeout fires late or never.
  assert.match(watcherSource, /setInterval/)
  assert.match(watcherSource, /visibilitychange/)
  // replace(), not assign() — Back must not restore the dead page.
  assert.match(watcherSource, /window\.location\.replace/)
  assert.doesNotMatch(watcherSource, /window\.location\.assign|location\.href\s*=/)
  // Activity means real input. Network traffic must NOT count: the background
  // pollers would otherwise hold the session open forever.
  for (const evt of ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll']) {
    assert.ok(watcherSource.includes(`'${evt}'`), `${evt} must count as activity`)
  }

  const shellSource = fs.readFileSync(path.join('components', 'layout', 'AppShell.tsx'), 'utf8')
  // Must be mounted on BOTH branches, or chromeless routes skip the timeout.
  assert.equal((shellSource.match(/<SessionIdleRedirect \/>/g) ?? []).length, 2)
})

test('patching one download row keeps the rest of the list intact', async () => {
  const patchModule = await importComponentModule('../lib/data/deep-patch.ts')
  const setDeep = patchModule.setDeep as (o: Record<string, unknown>, p: string, v: unknown) => Record<string, unknown>
  const deepMerge = patchModule.deepMerge as (a: Record<string, unknown>, b: Record<string, unknown>) => Record<string, unknown>

  // A numeric segment must build a real array. When this produced {"0": …} the
  // card's downloads stopped being a list and the page rendered no links at all.
  const patch = setDeep({}, 'downloads.0.href', '/vmware/vmware-tools/new.exe')
  assert.equal(Array.isArray(patch.downloads), true)
  assert.deepEqual(patch.downloads, [{ href: '/vmware/vmware-tools/new.exe' }])

  // Merging that sparse patch onto a real card must touch row 0 only — a
  // wholesale array replace would silently delete rows 1 and 2.
  const card = {
    id: 'vmtools',
    downloads: [
      { label: 'Windows (.exe)', href: '/vmware/vmware-tools/old.exe' },
      { label: 'Windows (.iso)', href: '/vmware/vmware-tools/old.iso' },
      { label: 'Depot (.zip)', href: '/vmware/vmware-tools/old.zip' },
    ],
  }
  const merged = deepMerge(card, patch)
  assert.deepEqual(merged.downloads, [
    { label: 'Windows (.exe)', href: '/vmware/vmware-tools/new.exe' },
    { label: 'Windows (.iso)', href: '/vmware/vmware-tools/old.iso' },
    { label: 'Depot (.zip)', href: '/vmware/vmware-tools/old.zip' },
  ])

  // A longer patch may still append a row the card didn't have — and the JSON
  // round trip stores skipped slots as null, which must mean "keep the base
  // row", not "blank it out".
  const appended = deepMerge(card, JSON.parse(JSON.stringify(setDeep({}, 'downloads.3.href', '/vmware/vmware-tools/extra.pdf'))))
  assert.equal((appended.downloads as unknown[]).length, 4)
  assert.deepEqual((appended.downloads as unknown[])[1], { label: 'Windows (.iso)', href: '/vmware/vmware-tools/old.iso' })

  // Primitive arrays (tags) replace wholesale — slot-merge would make removing
  // a tag impossible, since base rows beyond the patch length would survive.
  assert.deepEqual(
    deepMerge({ tags: ['a', 'b', 'c'] }, { tags: ['x'] }),
    { tags: ['x'] },
  )

  // Plain nested objects must keep merging as before.
  assert.deepEqual(
    deepMerge({ installer: { label: 'keep', href: 'old' } }, setDeep({}, 'installer.href', 'new')),
    { installer: { label: 'keep', href: 'new' } },
  )
})

test('sections whose download links are site-relative paths are still "Use in a card" targets', async () => {
  const editor = await importComponentModule('../app/admin/AdminContentEditor.tsx')
  const offered = (editor.DOWNLOAD_ATTACH_SCOPES as Array<{ scope: { scope: string } }>).map((entry) => entry.scope.scope)
  // APENSUPPORT_BASE is '' so every VMware href is "/vmware/8/x.iso", not
  // "https://…". The attach filter only accepted https links, so the whole
  // VMware family vanished: an admin who uploaded a vCenter ISO under
  // "VMware 8 (vCenter / ESXi)" found no VMware section to point at it.
  // Office keeps its links in an `items` list and Evaluate-STIG documents had
  // no download field at all — both were unreachable for the same admin flow.
  for (const scope of ['vmware/v7/products', 'vmware/v8/products', 'vmware/v9/products', 'vmware/tools', 'docs/vmware/cards', 'microsoft/office', 'evaluate-stig/documents']) {
    assert.ok(offered.includes(scope), `${scope} must be offered by "Use in a card"`)
  }
  // Category cards link to site routes, not files — pointing one at an ISO
  // would break navigation, so they stay out.
  assert.equal(offered.includes('vmware/landing/cards'), false)
  assert.equal(offered.includes('isos/landing/groups'), false)
})

test('home announcements carry product and document updates only', async () => {
  const mod = await importComponentModule('../components/home/AnnouncementList.tsx')
  const mergeAnnouncements = mod.mergeAnnouncements as (items: unknown[]) => Array<{ text: string }>

  const merged = mergeAnnouncements([
    // Curated entries. These reach the list from a different argument than the
    // live feed, and the gate used to sit only on the live side — so a
    // retirement notice rendered on the home page under a "NEW" dot.
    { text: 'Decommissioned application pages removed — Ansible, AtomEngine, and RStudio are no longer accessible on the APEN.', date: '2026-07-20', category: 'Site Update' },
    { text: 'APEN Support Site redesigned. The new Applications hub brings the consoles into the modern interface.', date: '2026-06-30', category: 'Site Update' },
    { text: 'VMware vCenter 8.0 Update 3i patches added.', date: '2026-05-15', category: 'VMware' },
    { text: 'Evaluate-STIG User Guide PDF updated.', date: '2026-05-14', category: 'Docs' },
    // Live proxy noise: a raw directory listing, tagged as a product category.
    { text: 'PIP Repository uploads detected: index.html, index.html, and 1092 more.', date: '2026-08-14', category: 'Software' },
    // A retirement mis-tagged as a product update must still be dropped.
    { text: 'AtomEngine console removed from the applications hub.', date: '2026-07-19', category: 'Software' },
  ])

  assert.deepEqual(merged.map((a) => a.text), [
    'VMware vCenter 8.0 Update 3i patches added.',
    'Evaluate-STIG User Guide PDF updated.',
  ])
})

test('every curated announcement is dated: the feed only announces additions', async () => {
  // The home feed tells visitors what they can now view or download and sorts
  // by date. An undated entry can neither sort nor earn its NEW badge, so the
  // undated legacy backlog was dropped rather than given invented dates.
  const announcements = await importComponentModule('../lib/data/announcements.ts')
  const manual = announcements.MANUAL_ANNOUNCEMENTS as Array<{ date: string; text: string }>
  assert.ok(manual.length > 0)
  for (const a of manual) assert.match(a.date, /^\d{4}-\d{2}-\d{2}$/, `undated announcement: ${a.text}`)
})

test('site history is hidden from home and listed in the admin console', async () => {
  const announcements = await importComponentModule('../lib/data/announcements.ts')
  const isSiteHistory = announcements.isSiteHistoryAnnouncement as (a: { text: string; category?: string }) => boolean
  const history = announcements.SITE_HISTORY_ANNOUNCEMENTS as Array<{ text: string; date: string }>
  const dashboard = fs.readFileSync(path.join('app', 'admin', 'AdminDashboard.tsx'), 'utf8')
  const home = fs.readFileSync(path.join('components', 'home', 'AnnouncementList.tsx'), 'utf8')

  // One predicate, both surfaces — a record the home page hides must be one the
  // console shows, or an entry can fall through the gap and be visible nowhere.
  assert.match(home, /!isSiteHistoryAnnouncement\(item\)/)
  assert.match(dashboard, /SITE_HISTORY_ANNOUNCEMENTS/)
  assert.equal(history.every(isSiteHistory), true)
  // The retirement notice that prompted this must be in the record, not lost.
  assert.equal(history.some((a) => /decommissioned application pages removed/i.test(a.text)), true)
})

test('a sparse patch renders without destroying the card it edits', async () => {
  const adminContent = await importComponentModule('../lib/data/admin-content.ts')
  const applyScopeOverride = adminContent.applyScopeOverride as (
    defaults: Array<Record<string, unknown>>,
    record: { value: Record<string, unknown> } | undefined,
  ) => Array<Record<string, unknown>>

  const defaults = [{
    id: 'vcenter8',
    installer: { label: 'VCSA 8 (ISO)', href: '/vmware/8/old.iso', desc: 'Full installer.' },
    downloads: [
      { label: 'Windows (.exe)', href: '/a.exe' },
      { label: 'Windows (.iso)', href: '/a.iso' },
    ],
    tags: ['vCenter', 'ISO'],
  }]

  // Exactly what the editor stores for an installer.href edit — sparse. The old
  // shallow spread replaced the whole installer object, silently dropping its
  // label and description from the LIVE card.
  const [merged] = applyScopeOverride(defaults, {
    value: { vcenter8: { installer: { href: '/vmware/8/new.iso' }, downloads: [{ href: '/b.exe' }] } },
  })
  assert.deepEqual(merged.installer, { label: 'VCSA 8 (ISO)', href: '/vmware/8/new.iso', desc: 'Full installer.' })
  assert.deepEqual(merged.downloads, [
    { label: 'Windows (.exe)', href: '/b.exe' },
    { label: 'Windows (.iso)', href: '/a.iso' },
  ])
  assert.deepEqual(merged.tags, ['vCenter', 'ISO'])
})

test('clicking a traffic bar shows THAT bucket, not the whole period', async () => {
  // The Real-Time Traffic card on /admin#monitor. Hovering 4p showed 300 while
  // the expanded list showed every connection of the day, because topIPs is
  // keyed by period. The proxy now emits bucketIPs[period][i] aligned with
  // chart[period][i], and a bar click scopes the list to that index.
  const chart = fs.readFileSync(path.join('components', 'ui', 'activity-chart-card.tsx'), 'utf8')

  // Native button, not a cursor-pointer div — so it is keyboard reachable.
  assert.match(chart, /<button\n\s*key=\{i\}\n\s*type="button"/)
  assert.match(chart, /onClick=\{\(\) => openConnections\(i\)\}/)
  assert.match(chart, /aria-controls=\{showTopIPs \? connectionsPanelId : undefined\}/)
  assert.match(chart, /<div id=\{connectionsPanelId\}/)
  // Changing period must drop a bucket that no longer means anything — reset
  // where the period is chosen, not in an effect.
  assert.match(chart, /const selectPeriod = \(opt: typeof selected\) => \{\n\s*setSelected\(opt\)\n\s*setBucketIndex\(null\)/)
  assert.match(chart, /onSelect=\{\(\) => selectPeriod\(opt\)\}/)

  // A scoped list must never silently fall back to the window-wide one.
  const resolver = await importComponentModule('../components/ui/activity-chart-card.tsx')
  const resolve = resolver.resolveActivityChartData as (a: Record<string, unknown>) => {
    topIPs: Array<{ ip: string }>
    bucketLabel: string | null
  }
  const stats = {
    chart: { Daily: [{ day: '3p', value: 10, connections: 1 }, { day: '4p', value: 300, connections: 4 }] },
    totals: { Daily: '15' },
    topIPs: { Daily: Array.from({ length: 15 }, (_, i) => ({ ip: `10.0.0.${i}`, count: 1 })) },
    bucketIPs: { Daily: [[{ ip: '10.0.0.1', count: 10 }], [{ ip: '10.0.0.2', count: 300 }]] },
    totalToday: 15,
  }
  const base = { selected: 'Daily', today: 'x', live: true, stats, showTopIPs: true }

  const whole = resolve({ ...base, bucketIndex: null })
  assert.equal(whole.topIPs.length, 15, 'no bucket selected still shows the window')
  assert.equal(whole.bucketLabel, null)

  const fourPm = resolve({ ...base, bucketIndex: 1 })
  assert.deepEqual(fourPm.topIPs.map((e) => e.ip), ['10.0.0.2'], '4p must show only its own connections')
  assert.equal(fourPm.bucketLabel, '4p', 'the panel must name the bucket it is showing')

  // A quiet bucket shows nothing, NOT the whole period.
  const empty = resolve({ ...base, bucketIndex: 5 })
  assert.deepEqual(empty.topIPs, [], 'a bucket with no data must not fall back to the window list')
})

test('assistant answers render bold-wrapped links as one clickable anchor', async () => {
  // The assistant lists resources as "- **[Label](/path)** — description".
  // Linkifying before splitting bold left the wrapping ** stranded on either
  // side of the anchor, so users saw literal asterisks around every link.
  const { renderToStaticMarkup } = await import('react-dom/server')
  const formatted = await importComponentModule('../components/assistant/FormattedMessage.tsx')
  const FormattedMessage = formatted.FormattedMessage as (props: {
    text: string
    validRoutes: Set<string> | null
  }) => ReturnType<typeof import('react').createElement>

  const html = renderToStaticMarkup(
    FormattedMessage({
      text: [
        '**Downloads**',
        '- **[Windows ISOs](/downloads/iso/windows)** — Windows 11 and Server 2022',
        '- [APEN Voltron](https://voltron.apen.mil/) — on-network AI assistant',
      ].join('\n'),
      validRoutes: null,
    }),
  )

  assert.ok(!html.includes('**'), `literal asterisks leaked into the rendered answer:\n${html}`)
  assert.ok(html.includes('<strong'), 'bold lead-in line did not render as bold')
  assert.ok(html.includes('href="/downloads/iso/windows"'), 'bold-wrapped internal link lost its href')
  assert.ok(
    html.includes('href="https://voltron.apen.mil/"'),
    'off-site link lost its href',
  )
  assert.ok(html.includes('<ul'), 'bullet list did not render as a list')
})

test('an admin knowledge override cannot drop the assistant behavior rules', async () => {
  // The console edits only the persona + "what the APEN offers" half. The
  // response-format and anti-hallucination rules encode what the chat panel
  // can render and what stops invented links, so they are appended after the
  // admin's text no matter what — a bad paste degrades the answers' content,
  // never the widget itself.
  const knowledge = await import('../proxy/assistant-knowledge.mjs')
  const compose = knowledge.composeAssistantSystemPrompt as (override?: string | null) => string
  const fallback = knowledge.DEFAULT_ASSISTANT_KNOWLEDGE as string

  for (const marker of ['== RESPONSE FORMAT ==', '== STRICT RULES ==']) {
    assert.ok(compose(null).includes(marker), `default prompt lost ${marker}`)
    assert.ok(compose('replaced wholesale').includes(marker), `override dropped ${marker}`)
  }
  assert.ok(compose('replaced wholesale').startsWith('replaced wholesale'))
  // Blank or whitespace-only overrides fall back rather than shipping a prompt
  // with no site knowledge at all.
  assert.ok(compose('   ').startsWith(fallback.slice(0, 40)))
  assert.ok(compose(null).startsWith(fallback.slice(0, 40)))
})

test('the assistant knows the APEN AI services by name and destination', async () => {
  // "Where is Voltron" was answered with an invented /applications/ path
  // because no AI service was enumerated anywhere in the prompt. Each of these
  // is a real tile with a real destination; losing one puts that service back
  // into guess territory.
  const knowledge = await import('../proxy/assistant-knowledge.mjs')
  const block = knowledge.DEFAULT_ASSISTANT_KNOWLEDGE as string

  assert.ok(block.includes('https://fcc.apen.mil/'), 'the APEN portal section is gone')
  for (const destination of [
    'https://voltron.apen.mil',        // APEN AI — VOLTRON Platform
    'https://fcc.apen.mil/hub/',       // APEN AI HUB
    'https://fcc.apen.mil/qpro/',      // APEN Quantum — QPro M&S
    'https://fcc.apen.mil/hpc/',       // APEN HPC
    'https://fcc.apen.mil/cui/',       // APEN CUI Enclave
    'https://qspace.blcse.mil/',
    'https://jupyterhub.blcse.mil/',
  ]) {
    assert.ok(block.includes(destination), `${destination} is no longer listed among the APEN services`)
  }
  assert.ok(
    /Voltron Virtual Assistant/.test(block),
    'the persona no longer matches the widget branding (VOLTRON / Virtual Assistant)',
  )
})

test('assistant list shapes render as links, whatever spacing the model emits', async () => {
  // Three shapes seen in live answers, all of which must reach the user as one
  // clickable anchor: the canonical form, a bold-wrapped link, and the
  // "[Label] (url)" form with a stray space that strict markdown drops.
  const { renderToStaticMarkup } = await import('react-dom/server')
  const formatted = await importComponentModule('../components/assistant/FormattedMessage.tsx')
  const FormattedMessage = formatted.FormattedMessage as (props: {
    text: string
    validRoutes: Set<string> | null
  }) => ReturnType<typeof import('react').createElement>

  const html = renderToStaticMarkup(
    FormattedMessage({
      text: [
        '**APEN services**',
        '- [APEN HPC](https://fcc.apen.mil/hpc/) — compute fabric',
        '- **[APEN AI HUB](https://fcc.apen.mil/hub/)** — deploy AI applications',
        '- [ACAS] (https://acas.blcse.mil/) — vulnerability dashboards',
        '  - [QPro M&S](https://fcc.apen.mil/qpro/) — quantum modeling',
      ].join('\n'),
      validRoutes: null,
    }),
  )

  for (const href of [
    'https://fcc.apen.mil/hpc/',
    'https://fcc.apen.mil/hub/',
    'https://acas.blcse.mil/',
    'https://fcc.apen.mil/qpro/',
  ]) {
    assert.ok(html.includes(`href="${href}"`), `${href} did not render as a link`)
  }
  // Check the visible text, not the markup — Tailwind class names like
  // "list-[circle]" legitimately contain brackets.
  const visible = html.replace(/<[^>]+>/g, '')
  assert.ok(!visible.includes('['), `literal brackets leaked into the rendered answer: ${visible}`)
  // The indented item nests one level instead of landing beside its sibling.
  assert.ok(/<ul[^>]*>[\s\S]*<ul/.test(html), 'nested bullet did not render as a nested list')
})

test('the assistant is hidden on the admin console and only there', async () => {
  const m = await importComponentModule('../components/ui/APEN-chat-assistant.tsx')
  const shouldShow = m.shouldShowAssistant as (p: string | null) => boolean
  for (const p of ['/admin', '/admin/', '/ADMIN/content', '/admin#monitor']) assert.equal(shouldShow(p), false, p)
  // The rule is a path PREFIX, so a sibling route starting with /admin would be hidden too; none exists.
  for (const p of ['/', '/home', '/docs/admin-tools', '/applications', null]) assert.equal(shouldShow(p), true, String(p))
})

test('a dragged launcher never lands off-screen, and a trapped one resets to the default corner', async () => {
  const m = await importComponentModule('../components/ui/APEN-chat-assistant.tsx')
  const clamp = m.clampAssistantPosition as (p: { x: number; y: number }, v: { width: number; height: number }) => { x: number; y: number }
  const trapped = m.isAssistantPositionTrapped as (p: { x: number; y: number }, v: { width: number; height: number }) => boolean
  const resolve = m.resolveAssistantPositionForViewportChange as (a: {
    currentPosition: { x: number; y: number } | null
    viewport: { width: number; height: number }
    storedPosition: { x: number; y: number }
    resetToDefault?: boolean
  }) => { x: number; y: number }
  const viewport = { width: 1280, height: 800 }
  const stored = { x: 600, y: 400 }

  // Clamping keeps the whole 65 px button inside the viewport with a 16 px margin.
  assert.deepEqual(clamp({ x: -50, y: -50 }, viewport), { x: 16, y: 16 })
  assert.deepEqual(clamp({ x: 5000, y: 5000 }, viewport), { x: 1280 - 65 - 16, y: 800 - 65 - 16 })
  assert.deepEqual(clamp({ x: 300, y: 200 }, viewport), { x: 300, y: 200 }, 'an in-bounds position is untouched')

  // The top-left corner is the trap (the deprecated left anchor); anywhere else is not.
  assert.equal(trapped({ x: 16, y: 16 }, viewport), true)
  assert.equal(trapped({ x: 300, y: 200 }, viewport), false)
  assert.equal(trapped({ x: 16, y: 16 }, { width: 80, height: 80 }), false, 'no room to reset on a tiny viewport')

  // On a viewport change: a trapped position falls back to the stored one, a
  // usable one is clamped, and resetToDefault ignores both.
  assert.deepEqual(resolve({ currentPosition: { x: 16, y: 16 }, viewport, storedPosition: stored }), stored)
  assert.deepEqual(resolve({ currentPosition: { x: 5000, y: 200 }, viewport, storedPosition: stored }), { x: 1280 - 65 - 16, y: 200 })
  assert.deepEqual(resolve({ currentPosition: null, viewport, storedPosition: stored }), stored)
  const reset = resolve({ currentPosition: { x: 300, y: 200 }, viewport, storedPosition: stored, resetToDefault: true })
  assert.deepEqual(reset, { x: 1280 - 65 - 40, y: 800 - 65 - 40 }, 'default = bottom-right, inset 40 px')
})

test('a download row names its link after the file, on custom pages too', async () => {
  // Code-quality #71: the visible label sits in a sibling <p>, so an anchor
  // whose only text is ".iso" read as ".iso, link" to a screen reader.
  const rows = await importComponentModule('../components/cards/DownloadRow.tsx')
  const iso = await renderStatic(rows.DownloadRow, { label: 'vCenter 8 (ISO)', href: '/vmware/8/VCSA.iso' })
  assert.match(iso, /<a href="\/vmware\/8\/VCSA\.iso" aria-label="vCenter 8 \(ISO\) \(\.iso\)"/)
  assert.doesNotMatch(iso, /target="_blank"/, 'a site-relative installer downloads in place')
  const pdf = await renderStatic(rows.DownloadRow, { label: 'Guide', href: '/docs/guide.pdf' })
  assert.match(pdf, /aria-label="Guide \(\.pdf\)"/)
  assert.match(pdf, /target="_blank" rel="noopener noreferrer"/, 'documents open in a tab')
  const forced = await renderStatic(rows.DownloadRow, { label: 'Notes', href: '/x/notes.docx', external: true })
  assert.match(forced, /target="_blank"/, 'an admin-marked document opens in a tab whatever its extension')

  // Admin-authored pages render that same row (they carried a private copy
  // with no accessible name), and each expandable card is ONE native
  // disclosure button — never a widget role wrapped around nested controls.
  const view = await importComponentModule('../components/common/CustomPageView.tsx')
  const html = await renderStatic(view.CustomPageView, {
    page: {
      slug: 'p',
      title: 'P',
      cards: [
        { id: 'a', title: 'A', description: 'd', tags: [], downloads: [{ label: 'L', href: '/f.zip' }] },
        { id: 'b', title: 'B', description: 'd', tags: [] },
      ],
    },
  })
  assert.match(html, /<button type="button"[^>]*aria-expanded="false"[^>]*aria-controls="custom-card-panel-a"/)
  assert.equal((html.match(/<button/g) ?? []).length, 1, 'a card with nothing to expand is not a button')
  assert.doesNotMatch(html, /role="button"/)
})

test('the feedback form labels its fields and counts characters against the real limit', async () => {
  const form = await importComponentModule('../components/assistant/FeedbackForm.tsx')
  const { ASSISTANT_CONFIG } = await importComponentModule('../lib/data/assistant.ts') as { ASSISTANT_CONFIG: { maxFeedbackChars: number } }
  const html = await renderStatic(form.FeedbackForm, { hidden: false, seed: null, toolBtnClass: '', onBack() {} })

  // Every control has a real <label for>, and the name says it is optional.
  assert.match(html, /<label for="feedback-name"[^>]*>Name \(Optional\)<\/label>/)
  assert.match(html, /<input id="feedback-name"/)
  assert.match(html, /<label for="feedback-details"/)
  // The live counter and the textarea's hard cap quote the same limit, and the
  // textarea points at both the counter and the moderation status.
  const max = ASSISTANT_CONFIG.maxFeedbackChars
  assert.match(html, new RegExp(`<span id="feedback-character-count" aria-live="polite"[^>]*>0 / ${max}</span>`))
  assert.match(html, new RegExp(`<textarea id="feedback-details"[^>]*maxLength="${max}"`))
  assert.match(html, /aria-describedby="feedback-character-count feedback-moderation\.strict-status"/)
})

test('SVG logos load eagerly only when marked priority, and hover cards always mark theirs', async () => {
  const logo = await importComponentModule('../components/common/ThemedLogo.tsx')
  assert.match(await renderStatic(logo.ThemedLogo, { src: '/logos/x.svg', alt: 'x', priority: true }), /<img[^>]*loading="eager"/)
  assert.match(await renderStatic(logo.ThemedLogo, { src: '/logos/x.svg', alt: 'x' }), /<img[^>]*loading="lazy"/)
  // A hover card's logo is revealed with streamed content, so it must not
  // wait for a lazy trigger, and it is sized so the reveal never reflows.
  const hover = await importComponentModule('../components/cards/HoverRevealCard.tsx')
  const card = await renderStatic(hover.HoverRevealCard, { title: 'T', description: 'd', href: '/x', logo: '/logos/x.svg' })
  assert.match(card, /<img src="\/logos\/x\.svg"[^>]*loading="eager"[^>]*decoding="async"[^>]*width="56" height="56"/)
})

test('home support pathways lead to ticket intake and the knowledge base, nowhere else', async () => {
  const home = await importComponentModule('../lib/data/homepage.ts')
  const support = await importComponentModule('../lib/data/support.ts')
  type Link = { href: string; title: string; external?: boolean }
  const pathways = home.homepageSupportPathways as readonly Link[]
  const serviceCards = support.SUPPORT_SERVICE_CARDS as readonly Link[]

  // Technician intake appears exactly once per surface, and the retired
  // account-access / password-reset shortcuts never come back.
  assert.deepEqual(pathways.map((p) => p.href), ['/support/ticket', '/support/knowledge-base'])
  assert.equal(pathways[0].title, 'Open a support ticket')
  assert.equal(serviceCards.filter((c) => c.href === '/support/ticket').length, 1)
  for (const link of [...pathways, ...serviceCards]) {
    assert.doesNotMatch(link.href, /password-reset/, link.title)
    assert.doesNotMatch(link.title, /Account & Access Help|Request account access help|Report an outage or blocker/)
    assert.notEqual(link.external, true, `${link.href} must stay an internal route`)
  }
  // The hero is copy only: the intake actions live in the pathway section under it.
  const hero = await importComponentModule('../components/home/HomeHero.tsx')
  assert.doesNotMatch(await renderStatic(hero.HomeHero), /Open Support Request|Track Requests|<a |<button/)

  // Every site-relative link on the home page and support hub is an exported
  // App Router page — a closed enclave has no server to catch a 404.
  const lists = [pathways, home.serviceLinks, home.servicePortals, home.supportLinks, serviceCards, support.KNOWLEDGE_BASE_CATEGORIES] as ReadonlyArray<readonly Link[]>
  const missing = lists.flat().map((l) => l.href)
    .filter((href) => href.startsWith('/') && href !== '#')
    .filter((href) => !fs.existsSync(path.join('app', ...href.split(/[?#]/)[0].split('/').filter(Boolean), 'page.tsx')))
  assert.deepEqual(missing, [])
})

test('knowledge base categories each ship quick checks and ticket details, and the pages render them', async () => {
  const support = await importComponentModule('../lib/data/support.ts')
  const details = support.KNOWLEDGE_BASE_CATEGORY_DETAILS as Record<string, { quickChecks: string[]; ticketDetails: string[] }>
  const categories = support.KNOWLEDGE_BASE_CATEGORIES as Array<{ id: string; title: string; href: string }>
  assert.deepEqual(categories.map((c) => c.id).sort(), Object.keys(details).sort())

  const page = await importComponentModule('../components/common/SupportKnowledgeCategoryPage.tsx')
  for (const [key, category] of Object.entries(details)) {
    assert.ok(fs.existsSync(path.join('app', 'support', 'knowledge-base', key, 'page.tsx')), `${key} has no route`)
    assert.ok(category.quickChecks.length > 0 && category.ticketDetails.length > 0, `${key} has no guidance`)
    const text = visibleText(await renderStatic(page.SupportKnowledgeCategoryPage, { categoryKey: key }))
    for (const line of [...category.quickChecks, ...category.ticketDetails]) {
      assert.ok(text.includes(line), `${key}: "${line}" is not rendered`)
    }
  }
  // The hub offers the categories, not a search box that goes nowhere.
  const hubHtml = await renderStatic(await importDefault('../app/support/knowledge-base/page.tsx'))
  assert.doesNotMatch(hubHtml, /placeholder="Search/)
  for (const category of categories) assert.ok(hubHtml.includes(`href="${category.href}"`), `${category.title} is not linked from the hub`)
})

test('the ticket status page sends visitors to TrackIt and promises requester-scoped lookup only', async () => {
  // The guard this replaces pinned phrases living in a commented-out mock
  // block; this reads what the visitor actually sees.
  const html = await renderStatic(await importDefault('../app/support/status/page.tsx'))
  const text = visibleText(html)
  assert.match(text, /TrackIt/)
  assert.match(text, /Requester-scoped status tracking/)
  assert.match(html, /href="\/support\/knowledge-base"/)
})

test('the footer renders both logos lazily at one height and every quick link in the compact row', async () => {
  const footer = await importComponentModule('../components/layout/Footer.tsx')
  const data = await importComponentModule('../lib/data/footer.ts')
  const html = await renderStatic(footer.Footer)
  for (const alt of ['FCC', 'APEN']) {
    assert.match(html, new RegExp(`<img alt="${alt}"[^>]*loading="lazy"[^>]*class="h-20 w-auto opacity-60 hover:opacity-100 transition-opacity"`))
  }
  const compact = 'flex flex-wrap justify-center gap-x-6 gap-y-2 text-[10px] font-bold uppercase tracking-widest text-gray-400'
  assert.equal(html.split(compact).length - 1, 2, 'the links row and the support group share the compact style')

  // Every quick link is rendered, and every internal one is an exported App Router page.
  const quickLinks = data.quickLinks as Array<{ label: string; href: string }>
  const missing: string[] = []
  for (const link of quickLinks) {
    assert.ok(html.includes(`href="${link.href.replace(/&/g, '&amp;')}"`), `${link.label} is not rendered`)
    if (link.href.startsWith('/') && !fs.existsSync(path.join('app', ...link.href.split('/').filter(Boolean), 'page.tsx'))) {
      missing.push(`${link.label} -> ${link.href}`)
    }
  }
  assert.deepEqual(missing, [])
})

test('the card palette hands out unique glows across every home-page group', async () => {
  const colors = await importComponentModule('../lib/data/card-colors.ts')
  const families = colors.TAILSCAN_COLOR_FAMILIES as readonly string[]
  const shades = colors.CARD_GLOW_SHADES as readonly string[]
  const palette = colors.CARD_GLOW_PALETTE as readonly string[]
  const getCardGlowColor = colors.getCardGlowColor as (index: number, offset?: number) => string
  const getUnique = colors.getUniqueCardGlowColors as (count: number, offset?: number) => string[]
  const define = colors.getCardColorDefinition as (color: string) => { hue: [number, number]; from: string }
  const spotlight = colors.getGlowSpotlightDefinition as (color: string) => { base: number; spread: number }

  assert.equal(new Set(palette).size, families.length * shades.length)
  assert.ok(palette.every((entry) => /^[a-z]+-\d{3}$/.test(entry)))
  // Index wraps instead of running off the end, negatives included.
  assert.equal(getCardGlowColor(palette.length), palette[0])
  assert.equal(getCardGlowColor(-1), palette[palette.length - 1])
  assert.equal(new Set(getUnique(palette.length)).size, palette.length)
  assert.throws(() => getUnique(palette.length + 1))
  // A bare family means its 500 shade; other shades of it differ in lightness, not hue.
  assert.deepEqual(define('cyan'), define('cyan-500'))
  assert.notEqual(define('cyan-300').from, define('cyan-700').from)
  assert.equal(spotlight('cyan').base, spotlight('cyan-300').base)

  // Each home-page group has at least as many distinct glows as cards, so no two neighbours share one.
  const home = await importComponentModule('../lib/data/homepage.ts')
  for (const [colorsKey, listKey] of [
    ['supportPathwayColors', 'homepageSupportPathways'],
    ['serviceLinkColors', 'serviceLinks'],
    ['servicePortalColors', 'servicePortals'],
    ['supportLinkColors', 'supportLinks'],
  ] as const) {
    const list = home[colorsKey] as string[]
    assert.equal(new Set(list).size, list.length, `${colorsKey} repeats a colour`)
    assert.ok(list.length >= (home[listKey] as unknown[]).length, `${colorsKey} has fewer colours than ${listKey} has cards`)
  }
})

test('VMware Tools exposes its download list to the attach and edit flows', async () => {
  const editor = await importComponentModule('../app/admin/AdminContentEditor.tsx')
  type Cards = Array<Record<string, unknown>>
  const attach = editor.DOWNLOAD_ATTACH_SCOPES as Array<{ scope: { scope: string; defaults: Cards }; urlField: string }>
  // Its links live in a `downloads` list, not a single href; without a
  // list-aware URL field the section had no "Use in a card" and no editable links.
  const tools = attach.find((entry) => entry.scope.scope === 'vmware/tools')
  assert.ok(tools, 'vmware/tools is not an attach target')
  assert.equal(tools.urlField, 'downloads.0.href')
  // The section spans two folders: the URL dropdown must offer both, and the
  // upload target is the folder most of its links agree on.
  const downloadPrefixes = editor.downloadPrefixes as (cards: Cards) => string[]
  const commonDownloadPrefix = editor.commonDownloadPrefix as (cards: Cards) => string
  const prefixes = downloadPrefixes(tools.scope.defaults)
  assert.ok(prefixes.includes('/vmware/vmware-tools') && prefixes.includes('/vmware/vmrc'), prefixes.join(', '))
  assert.equal(commonDownloadPrefix(tools.scope.defaults), prefixes[0])
  // Cards that link to site routes map to no folder at all.
  assert.equal(commonDownloadPrefix([{ href: '/downloads/iso' }, { links: [{ href: '/docs/vmware' }] }]), '')
})

test('every documentation page has an editable scope whose description names its route', async () => {
  const editor = await importComponentModule('../app/admin/AdminContentEditor.tsx')
  type Field = { key: string; type: string; columns?: Array<{ field: string }> }
  const scopes = editor.EDITABLE_SCOPES as Array<{ scope: string; description: string; fields: Field[] }>
  const scopeRoute = editor.scopeRoute as (description: string) => string

  // The four /docs pages were the only card grids with no admin scope at all.
  for (const name of ['docs/vmware/cards', 'docs/trellix/cards', 'docs/evaluate-stig/cards', 'docs/microsoft-products/cards']) {
    const scope = scopes.find((s) => s.scope === name)
    assert.ok(scope, `${name} is not editable`)
    const links = scope.fields.find((f) => f.key === 'links')
    assert.equal(links?.type, 'list', `${name} has no document-link list`)
    assert.ok(links?.columns?.some((c) => c.field === 'href'), `${name} has no editable link URL`)
  }
  // Pickers show "section — /route", derived from each description, so every
  // description must carry a route for it to derive.
  assert.ok(scopes.length >= 30, `only ${scopes.length} scopes`)
  for (const scope of scopes) assert.notEqual(scopeRoute(scope.description), '', `no route in "${scope.description}"`)
  assert.equal(scopeRoute('Three cards on /vmware/tools — VMware Tools.'), '/vmware/tools')
  assert.equal(scopeRoute('no route here'), '')
  // AMI is spelled out on the upgrade-guide card.
  const vmware = await importComponentModule('../lib/data/vmware.ts')
  assert.ok(JSON.stringify(vmware.vmwareDocCards).includes('Upgrade vCenter using the Appliance Management Interface (PDF)'))
})

test('the launcher and greeting name the assistant, and the greeting is remembered per browser', async () => {
  const data = await importComponentModule('../lib/data/assistant.ts')
  const launcher = data.ASSISTANT_LAUNCHER as { brand: string; role: string; fullName: string; openLabel: string; closeLabel: string }
  const greeting = data.ASSISTANT_GREETING as { storageKey: string; delayMs: number; autoHideMs: number }
  // The floating robot head must never again ship as an unlabeled icon.
  assert.equal(launcher.fullName, 'Voltron Virtual Assistant')
  assert.equal(`${launcher.brand} ${launcher.role}`.toLowerCase(), launcher.fullName.toLowerCase())
  for (const label of [launcher.openLabel, launcher.closeLabel]) assert.ok(label.includes(launcher.fullName), label)
  assert.equal(greeting.storageKey, 'apen-ai-assistant-greeting-seen')
  assert.ok(greeting.autoHideMs > greeting.delayMs, 'the card must stay long enough to be read')
})

/* ── Converted from tests/source-guards.test.ts (code-quality #98) ──────────
 * Rendered markup and exported helpers replace source-text regexes. */

/** Server-render under a fixed pathname, the way next/navigation's usePathname sees it. */
async function renderAt(pathname: string, component: unknown, props: Record<string, unknown> = {}): Promise<string> {
  const { renderToStaticMarkup } = await import('react-dom/server')
  const { createElement } = await import('react')
  const contextPath = 'next/dist/shared/lib/hooks-client-context.shared-runtime.js'
  const { PathnameContext } = (await import(contextPath)) as { PathnameContext: import('react').Context<string | null> }
  return renderToStaticMarkup(
    createElement(PathnameContext.Provider, { value: pathname }, createElement(component as ComponentType<Record<string, unknown>>, props)),
  )
}

test('AI assistant launcher head sits inside the capsule', async () => {
  const assistant = await importComponentModule('../components/ui/APEN-chat-assistant.tsx')
  const visual = assistant.LAUNCHER_VISUAL_SIZE as number
  const head = assistant.LAUNCHER_HEAD_SIZE as number
  assert.ok(Number.isInteger(visual) && Number.isInteger(head))
  assert.ok(head < visual, `head ${head} must be smaller than the capsule height ${visual} to sit inside it`)
})

test('the admin badge counts live and static alerts minus everything acknowledged or dismissed', async () => {
  const hook = await importComponentModule('../lib/hooks/useAdminNotificationCounts.ts')
  const countsFor = hook.adminNotificationCountsFor as (
    live: unknown[] | null,
    seen: { acknowledged: string[]; dismissed: string[] },
  ) => { systemEvents: number; feedback: number }
  const live = [
    { id: 'ev-1', category: 'system', title: 'a' },
    { id: 'fb-1', category: 'feedback', title: 'b' },
    { id: 'ev-2', category: 'system', title: 'c' },
  ]
  assert.deepEqual(countsFor(live, { acknowledged: [], dismissed: [] }), { systemEvents: 2, feedback: 1 })
  assert.deepEqual(countsFor(live, { acknowledged: ['ev-1'], dismissed: ['fb-1'] }), { systemEvents: 1, feedback: 0 })
  // Proxy unreachable: only the static alerts remain, and they are still filtered.
  const admin = await importComponentModule('../lib/data/admin.ts')
  const staticIds = (admin.STATIC_ADMIN_ALERTS as Array<{ id: string }>).map((alert) => alert.id)
  assert.deepEqual(countsFor(null, { acknowledged: staticIds, dismissed: [] }), { systemEvents: 0, feedback: 0 })
})

test('desktop navigation triggers expose closed menu disclosure semantics', async () => {
  const nav = await importComponentModule('../components/layout/Navbar.tsx')
  const html = await renderAt('/home', nav.Navbar)
  const triggers = html.match(/<a [^>]*aria-haspopup="menu"[^>]*>/g) ?? []
  assert.ok(triggers.length > 0, 'the section triggers must render as menu-owning links')
  for (const trigger of triggers) {
    assert.match(trigger, /aria-expanded="false"/)
    assert.match(trigger, /aria-controls="desktop-nav-menu-/)
  }
  assert.doesNotMatch(html, /role="menuitem"/, 'no flyout is open before a click')
})

test('the admin console renders the notification settings and its default-tab anchors', async () => {
  const html = await renderAt('/admin', await importDefault('../app/admin/AdminDashboard.tsx'))
  assert.match(html, /<input[^>]*type="email"/)
  assert.match(html, /id="system-events-feedback"/)
  assert.match(html, /id="system-events"/)
  assert.match(html, /id="site-history"/)
})

test('the file library and route-image editors start blank until a location is chosen', async () => {
  const library = await importComponentModule('../app/admin/AdminFileLibraryPanel.tsx')
  const panel = await renderStatic(library.AdminFileLibraryPanel, {
    attachTargets: [],
    onAttach: async () => ({ ok: true }),
    onCreateCard: async () => ({ ok: true }),
  })
  assert.match(panel, /— Choose a product section —/)
  assert.match(panel, /1\. Choose what you are updating/)
  assert.doesNotMatch(panel, /type="file"|2\. Choose the files to upload|Files on the server/)

  const routes = await importComponentModule('../app/admin/RouteImageEditor.tsx')
  const editor = await renderStatic(routes.RegisteredRouteImageEditor, { overrides: {}, published: {}, onSaved() {} })
  assert.match(editor, /— Choose a route —/)
  assert.doesNotMatch(editor, /<img/)
})

test('the attach editor always lands on a real card of the open section', async () => {
  const library = await importComponentModule('../app/admin/AdminFileLibraryPanel.tsx')
  const resolve = library.resolveAttachSelection as (
    targets: unknown[],
    scope: string,
    cardId: string,
  ) => { target: unknown; cardId: string } | null
  const targets = [
    { scope: 'iso', cards: [{ id: 'ubuntu' }, { id: 'rocky' }] },
    { scope: 'vmware', cards: [{ id: 'vcsa' }] },
  ]
  assert.equal(resolve([], 'iso', ''), null)
  // Section pre-armed without a card: its first card, never ''.
  assert.deepEqual(resolve(targets, 'iso', ''), { target: targets[0], cardId: 'ubuntu' })
  // Card picked under another section: falls to the open section's first card.
  assert.deepEqual(resolve(targets, 'vmware', 'rocky'), { target: targets[1], cardId: 'vcsa' })
  // Unknown section: the first section, keeping a card that really belongs to it.
  assert.deepEqual(resolve(targets, 'gone', 'rocky'), { target: targets[0], cardId: 'rocky' })
  // "New card" survives, and a section with no cards offers it.
  assert.equal(resolve(targets, 'iso', '__new__')?.cardId, '__new__')
  assert.equal(resolve([{ scope: 'empty', cards: [] }], 'empty', 'x')?.cardId, '__new__')
})

test('the home page mounts the support pathway and hero, and the root route shows the intro logo', async () => {
  const homeHtml = await renderAt('/home', await importDefault('../app/home/page.tsx'))
  const text = visibleText(homeHtml)
  const data = await importComponentModule('../lib/data/homepage.ts')
  assert.ok(text.includes('Where should I start?'))
  for (const pathway of data.homepageSupportPathways as Array<{ title: string; href: string }>) {
    assert.ok(text.includes(pathway.title), `${pathway.title} is not rendered`)
    assert.ok(homeHtml.includes(`href="${pathway.href}"`), `${pathway.href} is not linked`)
  }
  assert.ok(text.includes('APEN Service & Support'), 'the hero heading is missing')

  const logos = await importComponentModule('../lib/data/logos.ts')
  const rootLogo = (logos.ROOT_PAGE_LOGOS as Record<string, string>)['/']
  const rootHtml = await renderAt('/', await importDefault('../app/page.tsx'))
  assert.ok(rootHtml.includes(rootLogo), 'the root intro must show the registered root logo')
})

test('the footer feedback link opens the assistant feedback form through the shared event', async () => {
  const footer = await importComponentModule('../components/layout/Footer.tsx')
  assert.match(await renderStatic(footer.Footer), /<button[^>]*aria-label="Open site feedback form"[^>]*>Feedback<\/button>/)

  const link = await importComponentModule('../components/ui/FeedbackLink.tsx')
  const config = await importComponentModule('../lib/data/assistant.ts')
  const element = (link.FeedbackLink as () => { props: { onClick: () => void } })()
  const dispatched: string[] = []
  const globals = globalThis as { window?: unknown }
  const hadWindow = 'window' in globals
  const saved = globals.window
  globals.window = { dispatchEvent: (event: { type: string }) => { dispatched.push(event.type); return true } }
  try {
    element.props.onClick()
  } finally {
    if (hadWindow) globals.window = saved
    else delete globals.window
  }
  assert.deepEqual(dispatched, [(config.ASSISTANT_CONFIG as { openFeedbackEvent: string }).openFeedbackEvent])
})
