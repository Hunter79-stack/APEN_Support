/**
 * Behavioural UI tests: import the component modules and assert on what
 * their exported helpers return. The source-text guards that used to sit
 * beside these are in tests/source-guards.test.ts.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

type ModuleExports = Record<string, unknown>

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
  // Changing period must drop a bucket that no longer means anything.
  assert.match(chart, /React\.useEffect\(\(\) => \{ setBucketIndex\(null\) \}, \[selected\]\)/)

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
