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

test('AI assistant launcher names itself to first-time visitors', () => {
  const assistantSource = fs.readFileSync(path.join('components', 'ui', 'APEN-chat-assistant.tsx'), 'utf8')
  const assistantData = fs.readFileSync(path.join('lib', 'data', 'assistant.ts'), 'utf8')
  const globalStyles = fs.readFileSync(path.join('app', 'globals.css'), 'utf8')

  // The floating robot head must never again ship as an unlabeled icon.
  assert.match(assistantData, /fullName: 'Voltron Virtual Assistant'/)
  assert.match(assistantSource, /ASSISTANT_LAUNCHER\.brand/)
  assert.match(assistantSource, /ASSISTANT_LAUNCHER\.role/)
  assert.match(assistantSource, /assistant-launcher-pill/)
  assert.match(globalStyles, /\.assistant-launcher-pill/)

  // The capsule must draw ONE outline. When pill and circle are fused, the
  // pulse ring belongs to the pill (wrapping the whole capsule); leaving it on
  // the button painted a full circle through the pill body, which is what made
  // the head look like a separate icon sitting on a box.
  assert.match(assistantSource, /assistant-launcher-pill assistant-red-pulse/)
  assert.match(assistantSource, /capsuleAssembled/)
  assert.match(assistantSource, /capsuleAssembled\s*$/m)

  // The pill must be a non-focusable <span> nested in the trigger, never its
  // own <button>. tabIndex={-1} keeps an element out of the TAB order but a
  // <button> still takes focus when clicked — which focused an aria-hidden
  // element and tripped the browser's "focus hidden from assistive
  // technology" violation. A span can never hold focus, so aria-hidden is
  // valid and clicks bubble to the one real control.
  // Order-independent: the pill's opening tag must be a <span> carrying
  // aria-hidden, and must never be a <button> (which would take focus on
  // click and put focus inside an aria-hidden subtree).
  assert.match(assistantSource, /<span[\s\S]{0,240}aria-hidden="true"[\s\S]{0,240}assistant-launcher-pill/)

  // Capsule alignment is pinned INLINE, never through spacing utilities. The
  // pill's height must equal the trigger's diameter (so its cap is concentric
  // with the head) and the head must be smaller than that diameter (so it sits
  // inside the capsule with a ring of pill body around it, rather than capping
  // it). Anchoring is a plain right/left 0 against the button — the earlier
  // `right-full` + negative-margin pairing stranded the head outside the pill
  // whenever the negative margin failed to apply.
  assert.match(assistantSource, /const LAUNCHER_VISUAL_SIZE = (\d+)/)
  assert.match(assistantSource, /const LAUNCHER_HEAD_SIZE = (\d+)/)
  const visual = Number(assistantSource.match(/const LAUNCHER_VISUAL_SIZE = (\d+)/)![1])
  const head = Number(assistantSource.match(/const LAUNCHER_HEAD_SIZE = (\d+)/)![1])
  assert.ok(head < visual, `head ${head} must be smaller than the capsule height ${visual} to sit inside it`)
  assert.match(assistantSource, /height: LAUNCHER_VISUAL_SIZE/)
  assert.match(assistantSource, /height: LAUNCHER_HEAD_SIZE, width: LAUNCHER_HEAD_SIZE/)
  assert.match(assistantSource, /\?\s*\{\s*right: 0,/)
  assert.match(assistantSource, /:\s*\{\s*left: 0,/)
  // Strip comments first — the block explaining WHY those utilities were
  // removed legitimately names them, and must not trip this check.
  const assistantCode = assistantSource.replace(/\/\*[\s\S]*?\*\//g, '')
  assert.doesNotMatch(assistantCode, /-mr-14|-ml-14|right-full|left-full/)
  assert.doesNotMatch(assistantCode, /<button[^>]*assistant-launcher-pill/)

  // The pill retracts around the head once its introduction is over, and
  // hover/keyboard focus brings it back.
  assert.match(assistantSource, /const pillExpanded = !pillIntroDone \|\| pillHovered \|\| pillFocused/)
  assert.match(assistantSource, /maxWidth: pillExpanded \? \(pillNaturalWidth \?\? undefined\) : LAUNCHER_VISUAL_SIZE/)
  assert.match(assistantSource, /onMouseEnter=\{\(\) => setPillHovered\(true\)\}/)
  assert.match(assistantSource, /onMouseLeave=\{\(\) => setPillHovered\(false\)\}/)
  assert.match(assistantSource, /onFocus=\{\(\) => setPillFocused\(true\)\}/)
  assert.match(assistantSource, /onBlur=\{\(\) => setPillFocused\(false\)\}/)

  // Padding must collapse with the width. Under border-box sizing, padding
  // larger than max-width becomes the floor for the used width, so leaving it
  // in place would stop the capsule well short of the head's diameter.
  assert.match(assistantSource, /paddingLeft: pillExpanded \? PILL_OUTER_PADDING : 0/)
  assert.match(assistantSource, /paddingRight: pillExpanded \? PILL_CAP_PADDING : 0/)

  // The pulse ring lives at inset -2px OUTSIDE the pill, so the pill itself
  // must never clip: overflow belongs on the inner label wrapper only.
  assert.doesNotMatch(assistantCode, /overflow: 'hidden'/)
  assert.match(assistantSource, /className="block min-w-0 overflow-hidden leading-none"/)

  // Trigger carries a real accessible name plus disclosure semantics.
  assert.match(assistantSource, /aria-haspopup="dialog"/)
  assert.match(assistantSource, /aria-expanded=\{open\}/)
  assert.match(assistantSource, /aria-controls="apen-assistant-panel"/)
  assert.doesNotMatch(assistantSource, /alt="AI"/)

  // First-visit greeting is shown at most once per browser.
  assert.match(assistantSource, /assistant-greeting-card/)
  assert.match(assistantSource, /hasSeenAssistantGreeting/)
  assert.match(assistantSource, /markAssistantGreetingSeen/)
  assert.match(assistantData, /storageKey: 'apen-ai-assistant-greeting-seen'/)

  // Keyboard access and the AI transparency line.
  assert.match(assistantSource, /window\.addEventListener\('keydown', handleKeyDown\)/)
  assert.match(assistantSource, /window\.removeEventListener\('keydown', handleKeyDown\)/)
  assert.match(assistantSource, /ASSISTANT_SHORTCUT\.key/)
  assert.match(assistantSource, /id="assistant-ai-disclaimer"/)
  assert.match(assistantSource, /ASSISTANT_INPUT_PLACEHOLDER/)
})

test('AI assistant is movable across the site and hidden from the admin console', () => {
  const assistantSource = fs.readFileSync(path.join('components', 'ui', 'APEN-chat-assistant.tsx'), 'utf8')

  assert.match(assistantSource, /usePathname/)
  assert.match(assistantSource, /export function shouldShowAssistant\(pathname: string \| null\)/)
  assert.match(assistantSource, /startsWith\('\/admin'\)/)
  assert.match(assistantSource, /export function clampAssistantPosition/)
  assert.match(assistantSource, /Math\.max\(margin, viewport\.width - size - margin\)/)
  assert.match(assistantSource, /Math\.max\(margin, viewport\.height - size - margin\)/)
  assert.match(assistantSource, /localStorage/)
  assert.match(assistantSource, /onPointerDown/)
  assert.match(assistantSource, /window\.addEventListener\('pointermove'/)
  assert.match(assistantSource, /setPointerCapture/)
  assert.doesNotMatch(assistantSource, /hidden[\s\S]*lg:block/)
})

test('AI assistant drag cannot stay trapped in the upper-left corner', () => {
  const assistantSource = fs.readFileSync(path.join('components', 'ui', 'APEN-chat-assistant.tsx'), 'utf8')

  assert.match(assistantSource, /isAssistantPositionTrapped/)
  assert.match(assistantSource, /return defaultAssistantPosition\(viewport\)/)
  assert.match(assistantSource, /window\.addEventListener\('pointermove'/)
  assert.match(assistantSource, /window\.addEventListener\('pointerup'/)
  assert.match(assistantSource, /window\.removeEventListener\('pointermove'/)
  assert.match(assistantSource, /resetAssistantPosition/)
  assert.match(assistantSource, /onDoubleClick/)
})

test('AI assistant snaps back to its default position when the viewport changes', () => {
  const assistantSource = fs.readFileSync(path.join('components', 'ui', 'APEN-chat-assistant.tsx'), 'utf8')

  assert.match(assistantSource, /resolveAssistantPositionForViewportChange/)
  assert.match(assistantSource, /resetToDefault/)
  assert.match(assistantSource, /resetToDefault[\s\S]*defaultAssistantPosition\(viewport\)/)
  assert.match(assistantSource, /const handleResize = \(\) => syncPosition\(true\)/)
  assert.match(assistantSource, /window\.addEventListener\('resize', handleResize\)/)
  assert.match(assistantSource, /window\.removeEventListener\('resize', handleResize\)/)
  assert.doesNotMatch(assistantSource, /window\.addEventListener\('resize', syncPosition\)/)
})

test('AI assistant keeps red pulse glow and footer feedback opens the feedback form', () => {
  const assistantSource = fs.readFileSync(path.join('components', 'ui', 'APEN-chat-assistant.tsx'), 'utf8')
  const feedbackLinkSource = fs.readFileSync(path.join('components', 'ui', 'FeedbackLink.tsx'), 'utf8')
  const footerSource = fs.readFileSync(path.join('components', 'layout', 'Footer.tsx'), 'utf8')
  const globalStyles = fs.readFileSync(path.join('app', 'globals.css'), 'utf8')

  assert.match(assistantSource, /assistant-red-pulse/)
  assert.match(assistantSource, /window\.addEventListener\(ASSISTANT_CONFIG\.openFeedbackEvent/)
  assert.match(assistantSource, /setOpen\(true\)/)
  assert.match(assistantSource, /setTab\('feedback'\)/)
  assert.match(assistantSource, /window\.removeEventListener\(ASSISTANT_CONFIG\.openFeedbackEvent/)
  assert.match(feedbackLinkSource, /window\.dispatchEvent\(new Event\(ASSISTANT_CONFIG\.openFeedbackEvent\)\)/)
  assert.match(footerSource, /<FeedbackLink \/>/)
  assert.match(globalStyles, /\.assistant-red-pulse/)
  assert.match(globalStyles, /@keyframes assistantRedPulse/)
  assert.match(globalStyles, /body\[data-gpu-tier="none"\] \.assistant-red-pulse/)
})

test('AI assistant closes when clicking outside the assistant', () => {
  const assistantSource = fs.readFileSync(path.join('components', 'ui', 'APEN-chat-assistant.tsx'), 'utf8')

  assert.match(assistantSource, /assistantRootRef/)
  assert.match(assistantSource, /document\.addEventListener\('pointerdown', handleDocumentPointerDown/)
  assert.match(assistantSource, /document\.removeEventListener\('pointerdown', handleDocumentPointerDown/)
  assert.match(assistantSource, /assistantRootRef\.current\?\.contains\(target\)/)
  assert.match(assistantSource, /setOpen\(false\)/)
  assert.match(assistantSource, /if \(!open \|\| !isVisible\) return/)
  assert.match(assistantSource, /ref=\{assistantRootRef\}/)
})

test('assistant feedback collects optional name and warns before details exceed the limit', () => {
  const assistantSource = fs.readFileSync(path.join('components', 'ui', 'APEN-chat-assistant.tsx'), 'utf8')

  assert.match(assistantSource, /id="feedback-name"/)
  assert.match(assistantSource, /Name \(Optional\)/)
  assert.match(assistantSource, /value=\{fbName\}/)
  assert.match(assistantSource, /setFbName\(event\.target\.value\)/)
  assert.match(assistantSource, /id="feedback-character-count"/)
  assert.match(assistantSource, /fbMessage\.length\} \/ \{ASSISTANT_CONFIG\.maxFeedbackChars\}/)
  assert.match(assistantSource, /maxLength=\{ASSISTANT_CONFIG\.maxFeedbackChars\}/)
  assert.match(assistantSource, /aria-describedby="feedback-character-count feedback-moderation.strict-status"/)
})

test('assistant feedback uses local AI-style moderation to flag offensive comments', async () => {
  const moderationModule = await importComponentModule('../lib/feedback-moderation.strict.ts')
  const analyzeFeedbackContent = moderationModule.analyzeFeedbackContent as
    | ((text: string) => { flagged: boolean; severity: string; reasons: string[]; guidance: string })
    | undefined
  const assistantSource = fs.readFileSync(path.join('components', 'ui', 'APEN-chat-assistant.tsx'), 'utf8')
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

test('site inspection is blocked for everyone except admin-ACL members', () => {
  const guardPath = path.join('components', 'common', 'SiteInspectionGuard.tsx')
  const guardSource = fs.readFileSync(guardPath, 'utf8')
  const layoutSource = fs.readFileSync(path.join('app', 'layout.tsx'), 'utf8')

  // The guard exists and is wired site-wide from the root layout.
  assert.equal(fs.existsSync(guardPath), true)
  assert.match(layoutSource, /SiteInspectionGuard/)

  // It gates on ACL membership (whoami — an LDAP admin session or an
  // allowlisted workstation IP) and only attaches the context-menu /
  // devtools-shortcut blockers when the visitor is NOT an ACL member.
  assert.match(guardSource, /whoami/)
  assert.match(guardSource, /aclMember/)
  assert.match(guardSource, /if \(aclMember\) return/)
  assert.match(guardSource, /addEventListener\('contextmenu'/)
  assert.match(guardSource, /addEventListener\('keydown'/)
})

test('card logos load eagerly after streamed static page content is revealed', () => {
  const hoverCardSource = fs.readFileSync(path.join('components', 'cards', 'HoverRevealCard.tsx'), 'utf8')
  const expandableGridSource = fs.readFileSync(path.join('components', 'cards', 'ExpandableCardGrid.tsx'), 'utf8')
  const themedLogoSource = fs.readFileSync(path.join('components', 'common', 'ThemedLogo.tsx'), 'utf8')

  assert.match(hoverCardSource, /<img[\s\S]*src=\{logo\}[\s\S]*loading="eager"/)
  assert.match(hoverCardSource, /decoding="async"/)
  assert.match(hoverCardSource, /width=\{56\}/)
  assert.match(hoverCardSource, /height=\{56\}/)
  assert.doesNotMatch(hoverCardSource, /src=\{logo\}[\s\S]*loading="lazy"/)
  assert.match(expandableGridSource, /<ThemedLogo[\s\S]*src=\{card\.logo\}[\s\S]*priority/)
  assert.match(themedLogoSource, /loading=\{priority \? 'eager' : 'lazy'\}/)
  assert.match(themedLogoSource, /priority=\{priority\}/)
})

test('homepage prioritizes APEN service and support intake routes', () => {
  // The home hub page moved from app/page.tsx (now the intro) to app/home/page.tsx
  // when the click-through intro was added. The hero was also slimmed: it no
  // longer renders the SUPPORT_SERVICE_CARDS side panel, nor the "Open Support
  // Request" / "Track Requests" action buttons — those support-intake actions
  // are already the focus of the HomeSupportPathway section directly below, so
  // the duplicate hero controls were dropped. The hero is now just the heading
  // and intro copy; the intake routes are asserted via the pathway/data below.
  const pageSource = fs.readFileSync(path.join('app', 'home', 'page.tsx'), 'utf8')
  const heroSource = fs.readFileSync(path.join('components', 'home', 'HomeHero.tsx'), 'utf8')
  const pathwaySource = fs.readFileSync(path.join('components', 'HomeSupportPathway.tsx'), 'utf8')
  const homepageDataSource = fs.readFileSync(path.join('lib', 'data', 'homepage.ts'), 'utf8')
  const supportDataSource = fs.readFileSync(path.join('lib', 'data', 'support.ts'), 'utf8')

  assert.match(pageSource, /HomeSupportPathway/)
  assert.doesNotMatch(heroSource, /Open Support Request/)
  assert.doesNotMatch(heroSource, /Track Requests/)
  assert.match(pathwaySource, /homepageSupportPathways/)
  assert.match(homepageDataSource, /homepageSupportPathways/)
  assert.match(homepageDataSource, /support\/ticket/)
  assert.match(homepageDataSource, /support\/knowledge-base/)
  assert.match(homepageDataSource, /Open a support ticket/)
  assert.doesNotMatch(homepageDataSource, /Request account access help/)
  assert.doesNotMatch(homepageDataSource, /Report an outage or blocker/)
  assert.doesNotMatch(homepageDataSource, /support\/password-reset/)
  assert.doesNotMatch(supportDataSource, /support\/password-reset/)
  assert.doesNotMatch(supportDataSource, /Unlock your AD account or reset your password/)

  const pathwayListSource = homepageDataSource.match(/homepageSupportPathways = \[([\s\S]*?)\] as const/)?.[1] ?? ''
  const supportCardListSource = supportDataSource.match(/SUPPORT_SERVICE_CARDS = \[([\s\S]*?)\] as const/)?.[1] ?? ''

  assert.equal((pathwayListSource.match(/href:\s*'\/support\/ticket'/g) ?? []).length, 1)
  assert.equal((supportCardListSource.match(/href:\s*'\/support\/ticket'/g) ?? []).length, 1)
  assert.doesNotMatch(supportCardListSource, /Account & Access Help/)
})

test('homepage and support entry links stay inside exported app routes for closed environments', () => {
  const homepageDataSource = fs.readFileSync(path.join('lib', 'data', 'homepage.ts'), 'utf8')
  const supportDataSource = fs.readFileSync(path.join('lib', 'data', 'support.ts'), 'utf8')

  assert.doesNotMatch(homepageDataSource, /external:\s*true/)
  assert.doesNotMatch(homepageDataSource, /EXTERNAL_URLS\./)

  const internalLinks = Array.from(
    `${homepageDataSource}\n${supportDataSource}`.matchAll(/href:\s*['"]([^'"]+)['"]/g),
  )
    .map((match) => match[1])
    .filter((href) => href.startsWith('/'))

  const missingRoutes = internalLinks
    .filter((href) => href !== '#')
    .filter((href) => !fs.existsSync(path.join('app', ...href.split('/').filter(Boolean), 'page.tsx')))
    .sort()

  assert.deepEqual(missingRoutes, [])
})

test('support knowledge base category routes provide usable guidance', () => {
  const supportDataSource = fs.readFileSync(path.join('lib', 'data', 'support.ts'), 'utf8')
  const knowledgePageSource = fs.readFileSync(path.join('app', 'support', 'knowledge-base', 'page.tsx'), 'utf8')
  const categoryPageSource = fs.readFileSync(path.join('components', 'common', 'SupportKnowledgeCategoryPage.tsx'), 'utf8')

  for (const category of ['network', 'hardware', 'access', 'software']) {
    assert.ok(fs.existsSync(path.join('app', 'support', 'knowledge-base', category, 'page.tsx')))
    assert.match(supportDataSource, new RegExp(`${category}:\\s*{`))
  }

  assert.match(supportDataSource, /quickChecks/)
  assert.match(supportDataSource, /ticketDetails/)
  assert.match(categoryPageSource, /category\.quickChecks\.map/)
  assert.match(categoryPageSource, /category\.ticketDetails\.map/)
  assert.doesNotMatch(knowledgePageSource, /placeholder="Search for articles, guides, or error codes/)
})

test('ticket status page explains requester-only scope', () => {
  const statusPageSource = fs.readFileSync(path.join('app', 'support', 'status', 'page.tsx'), 'utf8')

  assert.match(statusPageSource, /Requester scope/)
  assert.match(statusPageSource, /not a global ticket queue/)
  assert.match(statusPageSource, /customer\.email/)
  assert.match(statusPageSource, /signed-in requester/)
  assert.match(statusPageSource, /Static preview/)
})

test('admin nav shows event and feedback notification badges with dashboard email settings', () => {
  const adminSource = fs.readFileSync(path.join('app', 'admin', 'AdminDashboard.tsx'), 'utf8')
  const adminDataSource = fs.readFileSync(path.join('lib', 'data', 'admin.ts'), 'utf8')
  const navSource = fs.readFileSync(path.join('components', 'layout', 'Navbar.tsx'), 'utf8')
  const runtimeSource = fs.readFileSync(path.join('lib', 'data', 'runtime.ts'), 'utf8')
  const proxySource = fs.readFileSync(path.join('proxy', 'site-stats.mjs'), 'utf8')
  const adminHealthSource = fs.readFileSync(path.join('lib', 'data', 'admin-health.ts'), 'utf8')

  assert.match(adminDataSource, /ADMIN_NOTIFICATION_SETTINGS_STORAGE_KEY/)
  assert.match(adminDataSource, /DEFAULT_ADMIN_NOTIFICATION_SETTINGS/)
  assert.match(adminDataSource, /ADMIN_ACKNOWLEDGED_ALERTS_CHANGED_EVENT/)
  assert.match(adminDataSource, /countAdminNotifications/)
  // The ack/dismiss filtering rules moved out of admin.ts into their own pure
  // module (Admin IA Phase 0). They used to be written out separately in the
  // Navbar and in AdminDashboard and could drift; these assertions follow them
  // to admin-health.ts rather than pinning the old inline helper.
  assert.match(adminHealthSource, /export function visibleAlerts/)
  assert.match(adminHealthSource, /export function alertsNeedingAttention/)
  assert.match(runtimeSource, /notificationSettings/)
  assert.match(runtimeSource, /acknowledgedAlerts/)
  assert.match(navSource, /useAdminNotificationCounts/)
  assert.match(navSource, /AdminNotificationCountBadge/)
  assert.match(navSource, /isAdminRoute/)
  assert.match(navSource, /pathname\?\.startsWith\('\/admin'\)/)
  assert.match(navSource, /countAdminNotifications/)
  assert.match(navSource, /alertsNeedingAttention/)
  assert.match(navSource, /ADMIN_ACKNOWLEDGED_ALERTS_STORAGE_KEY/)
  assert.match(navSource, /ADMIN_ACKNOWLEDGED_ALERTS_CHANGED_EVENT/)
  assert.match(navSource, /readAcknowledgedAlertIdsFromStorage/)
  assert.match(navSource, /window\.addEventListener\(ADMIN_ACKNOWLEDGED_ALERTS_CHANGED_EVENT/)
  assert.doesNotMatch(navSource, /window\.addEventListener\('storage'/)
  assert.match(navSource, /event instanceof CustomEvent/)
  assert.match(navSource, /normalizeAcknowledgedAlertIds\(event\.detail\)/)
  assert.match(navSource, /item\.label === 'Admin'/)
  assert.match(navSource, /aria-label=\{isAdminItem \? adminNotificationLabel : undefined\}/)
  assert.match(navSource, /<Icon size=\{22\} aria-hidden="true" \/>/)
  assert.match(navSource, /<Icon size=\{16\} aria-hidden="true" \/>/)
  assert.match(navSource, /API_ENDPOINTS\.siteStats/)
  assert.match(navSource, /RUNTIME_INTERVALS\.adminStatsRefreshMs/)
  // The /api/site-stats fallback must still FILTER the static alerts, not count
  // them raw — otherwise a proxy outage lights the cog over handled items.
  assert.match(navSource, /!response\.ok[\s\S]*alertsNeedingAttention\(STATIC_ADMIN_ALERTS/)
  assert.doesNotMatch(navSource, /AdminNotificationNavBadge/)
  assert.doesNotMatch(navSource, /BellRing/)
  assert.doesNotMatch(navSource, /\/admin\/#system-events-feedback/)
  assert.match(adminSource, /id="system-events-feedback"/)
  assert.doesNotMatch(adminSource, /NotificationSummary/)
  assert.doesNotMatch(adminSource, /unreadSystemEventCount/)
  assert.doesNotMatch(adminSource, /unreadFeedbackCount/)
  assert.match(adminSource, /NotificationSettingsPanel/)
  assert.match(adminSource, /type="email"/)
  assert.match(adminSource, /ADMIN_NOTIFICATION_SETTINGS_STORAGE_KEY/)
  assert.match(adminSource, /ADMIN_ACKNOWLEDGED_ALERTS_STORAGE_KEY/)
  assert.match(adminSource, /ADMIN_ACKNOWLEDGED_ALERTS_CHANGED_EVENT/)
  assert.match(adminSource, /acknowledgeAlert/)
  assert.match(adminSource, /removeAlertFromView/)
  // Dismissals are server-shared and attributed: keyed by id in a Map, restorable.
  assert.match(adminSource, /dismissalsById/)
  assert.match(adminSource, /restoreAlert/)
  assert.match(adminSource, /Dismissed by \{dismissal\.by\}/)
  assert.match(adminSource, /Remove from view/)
  assert.match(adminSource, /aria-label=\{`Remove \$\{alert\.title\} from view`\}/)
  assert.match(adminSource, /readAcknowledgedAlertIdsFromStorage/)
  assert.match(adminSource, /syncAcknowledgedAlertIdsFromStorage/)
  assert.doesNotMatch(adminSource, /loadAcknowledgedAlertIds/)
  assert.match(adminSource, /useState<Set<string>>\(\(\) => new Set\(\)\)/)
  assert.doesNotMatch(adminSource, /filterAcknowledgedAlerts/)
  assert.match(adminSource, /const acknowledged = acknowledgedAlertIds\.has\(alert\.id\)/)
  assert.match(adminSource, /Retained for reports/)
  assert.match(adminSource, /Acknowledge/)
  assert.match(adminSource, /window\.localStorage\.setItem\(ADMIN_ACKNOWLEDGED_ALERTS_STORAGE_KEY/)
  assert.match(adminSource, /new CustomEvent\(ADMIN_ACKNOWLEDGED_ALERTS_CHANGED_EVENT/)
  assert.match(adminSource, /detail: \{ alertIds \}/)
  assert.doesNotMatch(adminSource, /API_ENDPOINTS\.acknowledgedAlerts/)
  assert.match(adminSource, /API_ENDPOINTS\.notificationSettings/)
  assert.doesNotMatch(navSource, /loadAcknowledgedAlertIds/)
  assert.doesNotMatch(navSource, /fetch\(API_ENDPOINTS\.acknowledgedAlerts\)/)
  assert.match(proxySource, /\/api\/acknowledged-alerts/)
  assert.match(proxySource, /ACKNOWLEDGED_ALERTS_FILE/)
  const acknowledgeEndpointSource = proxySource.match(/if \(req\.method === 'POST' && url === '\/api\/acknowledged-alerts'\) \{([\s\S]*?)\n  \}/)?.[1] ?? ''
  assert.match(acknowledgeEndpointSource, /commitAcknowledgedAlertIdsToDisk/)
  assert.doesNotMatch(acknowledgeEndpointSource, /commitFeedbackToDisk/)
  assert.doesNotMatch(acknowledgeEndpointSource, /feedbackStorage/)
  assert.match(proxySource, /\/api\/notification-settings/)
  assert.match(proxySource, /NOTIFICATION_SETTINGS_FILE/)
  assert.match(proxySource, /NOTIFICATION_EMAIL_TO/)
})

test('internal footer links resolve to App Router pages', async () => {
  const footerSource = fs.readFileSync(path.join('lib', 'data', 'footer.ts'), 'utf8')
  const quickLinksSource = footerSource.match(/export const quickLinks = \[([\s\S]*?)\];/)?.[1] ?? ''
  const quickLinks = Array.from(quickLinksSource.matchAll(/label:\s*['"]([^'"]+)['"][\s\S]*?href:\s*['"]([^'"]+)['"]/g)).map(
    (match) => ({ label: match[1], href: match[2] }),
  )

  const missingRoutes = quickLinks
    .filter((link) => link.href.startsWith('/'))
    .filter((link) => !fs.existsSync(path.join('app', ...link.href.split('/').filter(Boolean), 'page.tsx')))
    .map((link) => `${link.label} -> ${link.href}`)

  assert.deepEqual(missingRoutes, [])
})

test('footer logos and support group use compact footer styling', () => {
  const footerSource = fs.readFileSync(path.join('components', 'layout', 'Footer.tsx'), 'utf8')

  assert.match(footerSource, /alt="FCC"[\s\S]*?className="h-20 w-auto opacity-60 hover:opacity-100 transition-opacity"/)
  assert.match(footerSource, /alt="APEN"[\s\S]*?className="h-20 w-auto opacity-60 hover:opacity-100 transition-opacity"/)

  const compactLinksClass = 'flex flex-wrap justify-center gap-x-6 gap-y-2 text-[10px] font-bold uppercase tracking-widest text-gray-400'
  assert.equal((footerSource.match(new RegExp(compactLinksClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length, 2)
})

test('shared layouts use responsive grids and viewport-bounded chrome', () => {
  const globalStyles = fs.readFileSync(path.join('app', 'globals.css'), 'utf8')
  const linksGridSource = fs.readFileSync(path.join('components', 'home', 'LinksGrid.tsx'), 'utf8')
  const hoverGridSource = fs.readFileSync(path.join('components', 'cards', 'HoverRevealGrid.tsx'), 'utf8')
  const expandableGridSource = fs.readFileSync(path.join('components', 'cards', 'ExpandableCardGrid.tsx'), 'utf8')
  const footerSource = fs.readFileSync(path.join('components', 'layout', 'Footer.tsx'), 'utf8')
  const heroSource = fs.readFileSync(path.join('components', 'home', 'HomeHero.tsx'), 'utf8')
  const announcementSource = fs.readFileSync(path.join('components', 'home', 'AnnouncementList.tsx'), 'utf8')
  const asideSource = fs.readFileSync(path.join('components', 'layout', 'AsideFrost.tsx'), 'utf8')
  const assistantSource = fs.readFileSync(path.join('components', 'ui', 'APEN-chat-assistant.tsx'), 'utf8')

  assert.match(globalStyles, /\.responsive-card-grid\s*{[\s\S]*auto-fit[\s\S]*minmax/)
  assert.match(globalStyles, /@media \(min-width: 1920px\)[\s\S]*\.max-w-7xl/)
  assert.match(linksGridSource, /responsive-card-grid/)
  assert.match(hoverGridSource, /responsive-card-grid/)
  assert.match(expandableGridSource, /responsive-card-grid/)
  assert.match(footerSource, /xl:flex-row/)
  assert.match(footerSource, /min-w-0/)
  assert.match(heroSource, /w-full[\s\S]*min-w-0/)
  assert.match(heroSource, /break-words/)
  assert.match(announcementSource, /flex-col[\s\S]*sm:flex-row/)
  assert.match(announcementSource, /break-words/)
  assert.match(asideSource, /w-full[\s\S]*lg:w-64/)
  assert.doesNotMatch(assistantSource, /hidden[\s\S]*lg:block/)
  assert.match(assistantSource, /w-\[calc\(100vw-2rem\)\][\s\S]*max-w-\[440px\]/)
})

test('card palette provides enough unique colors for page card groups', () => {
  const paletteSource = fs.readFileSync(path.join('lib', 'data', 'card-colors.ts'), 'utf8')
  const homepageSource = fs.readFileSync(path.join('lib', 'data', 'homepage.ts'), 'utf8')
  const linksGridSource = fs.readFileSync(path.join('components', 'home', 'LinksGrid.tsx'), 'utf8')
  const hoverGridSource = fs.readFileSync(path.join('components', 'cards', 'HoverRevealGrid.tsx'), 'utf8')
  const expandableGridSource = fs.readFileSync(path.join('components', 'cards', 'ExpandableCardGrid.tsx'), 'utf8')
  const announcementSource = fs.readFileSync(path.join('components', 'home', 'AnnouncementList.tsx'), 'utf8')

  const familiesMatch = paletteSource.match(/TAILSCAN_COLOR_FAMILIES\s*=\s*\[([\s\S]*?)\]\s*as const/)
  assert.ok(familiesMatch)
  const families = Array.from(familiesMatch[1].matchAll(/'([^']+)'/g)).map((match) => match[1])
  assert.deepEqual(families, [
    'cyan',
    'emerald',
    'sky',
    'violet',
    'amber',
    'rose',
    'teal',
    'orange',
    'fuchsia',
    'indigo',
    'green',
    'purple',
    'red',
    'lime',
    'yellow',
    'blue',
    'pink',
    'slate',
    'gray',
    'zinc',
    'neutral',
    'stone',
  ])

  const paletteMatch = paletteSource.match(/CARD_GLOW_PALETTE\s*=\s*CARD_GLOW_SHADES\.flatMap/)
  assert.ok(paletteMatch)
  assert.match(paletteSource, /type GlowColorName = TailscanColorFamily \| `\$\{TailscanColorFamily\}-\$\{TailscanColorShade\}`/)
  assert.match(paletteSource, /getCardColorDefinition/)
  assert.match(paletteSource, /getGlowSpotlightDefinition/)
  assert.match(paletteSource, /CARD_GLOW_SHADES[\s\S]*'300'[\s\S]*'700'/)

  for (const exportName of ['serviceLinkColors', 'supportLinkColors']) {
    assert.match(homepageSource, new RegExp(`${exportName}\\s*=\\s*getUniqueCardGlowColors`))
  }

  assert.match(linksGridSource, /getCardGlowColor/)
  assert.match(hoverGridSource, /getCardGlowColor/)
  assert.match(expandableGridSource, /getCardGlowColor/)
  assert.match(announcementSource, /getCardGlowColor/)
})

test('page card components do not hard-code repeated open-state glow colors', () => {
  const appFiles = fs
    .readdirSync('app', { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.tsx'))
    .map((entry) => path.join(entry.parentPath, entry.name))

  const hardCodedCardColors = appFiles
    .filter((file) => /Cards\.tsx$|ReleaseTable\.tsx$/.test(file))
    .filter((file) => fs.readFileSync(file, 'utf8').includes("glowColor={isOpen ? 'cyan'"))

  assert.deepEqual(hardCodedCardColors, [])
})


test('root route uses the production intro and home remains the full support hub', () => {
  const rootSource = fs.readFileSync(path.join('app', 'page.tsx'), 'utf8')
  const introSource = fs.readFileSync(
    path.join('components', 'landing', 'LegacyIntro.tsx'),
    'utf8',
  )
  const homeSource = fs.readFileSync(path.join('app', 'home', 'page.tsx'), 'utf8')
  assert.match(rootSource, /LegacyIntro/)
  assert.match(rootSource, /ROOT_PAGE_LOGOS\['\/'\]/)
  assert.match(introSource, /RouteImage/)
  assert.match(homeSource, /HomeHero/)
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

test('desktop navigation exposes keyboard flyout semantics', () => {
  const source = fs.readFileSync(path.join('components', 'layout', 'Navbar.tsx'), 'utf8')
  assert.match(source, /aria-haspopup="menu"/)
  assert.match(source, /aria-expanded=\{openSection === item\.label\}/)
  assert.match(source, /handleDesktopTriggerKeyDown/)
  assert.match(source, /handleFlyoutKeyDown/)
  assert.match(source, /role="menuitem"/)
})

test('nav sign-out kills the session server-side and forces re-authentication', () => {
  const source = fs.readFileSync(path.join('components', 'layout', 'Navbar.tsx'), 'utf8')

  // The control only appears for a visitor who actually has a session.
  assert.match(source, /const \[signedInUser, setSignedInUser\] = useState<string \| null>\(null\)/)
  assert.match(source, /setSignedInUser\(who \? \(who\.username \|\| 'this session'\) : null\)/)

  // Sign-out must do all three: drop the server-side session (which also
  // expires the HttpOnly cookie), drop the tab-local admin/CSRF token, and
  // leave via a FULL navigation so nginx's auth_request gate re-runs and
  // demands credentials. A client-side router push would skip that gate.
  const handler = source.match(/const handleSignOut = useCallback\(async \(\) => \{[\s\S]*?\}, \[\]\)/)?.[0] ?? ''
  assert.match(handler, /adminContentClient\.logout\(\)/)
  assert.match(handler, /adminContentClient\.clearToken\(\)/)
  assert.match(handler, /window\.location\.replace\('\/login\/'\)/)
  assert.doesNotMatch(handler, /router\.(push|replace)/)

  // Rendered in both navs — beside the CESC • APEN footer on desktop, and at
  // the end of the mobile drawer, which has no such footer.
  assert.match(source, /onClick=\{handleSignOut\}[\s\S]*CESC &bull; APEN/)
  assert.equal(source.match(/onClick=\{handleSignOut\}/g)?.length, 2)
})

test('custom cards use a native disclosure button without nested interactive controls', () => {
  const source = fs.readFileSync(path.join('components', 'common', 'CustomPageView.tsx'), 'utf8')
  assert.match(source, /<button[\s\S]*type="button"[\s\S]*aria-expanded=\{isOpen\}/)
  assert.match(source, /aria-controls=\{panelId\}/)
  assert.doesNotMatch(source, /role=\{isExpandable \? 'button'/)
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

test('privacy headers suppress referrers without blocking same-origin embeds', () => {
  const headerSource = fs.readFileSync(path.join('nginx', 'security-headers.inc'), 'utf8')
  const serverSource = fs.readFileSync(path.join('nginx', 'server.conf'), 'utf8')
  const deploySource = fs.readFileSync('DEPLOY.md', 'utf8')
  // The frame lives under app/applications/speedtest/; the old app/tools/ path
  // went stale when the route moved, so this test had been erroring out on a
  // missing file rather than checking anything.
  const speedtestSource = fs.readFileSync(
    path.join('app', 'applications', 'speedtest', 'SpeedtestFrame.tsx'),
    'utf8',
  )
  assert.match(headerSource, /Referrer-Policy\s+"no-referrer"\s+always/)
  assert.doesNotMatch(headerSource, /strict-origin-when-cross-origin/)
  assert.match(headerSource, /X-Frame-Options\s+"SAMEORIGIN"\s+always/)
  assert.match(headerSource, /frame-ancestors 'self'/)
  assert.doesNotMatch(headerSource, /frame-ancestors 'none'/)
  assert.match(speedtestSource, /src="\/speedtest\/\?embed=1"/)

  // The frame must enforce the chromeless embed contract itself. The speedtest
  // frontend is baked into its Docker image, so a container built before the
  // html.embed rules existed serves a page with no .embed class and no embed
  // CSS — and .backdrop (position: fixed) would then paint its gradient, blobs
  // and grid-overlay across the whole iframe, with min-height: 100vh inflating
  // it past the app's real height.
  assert.match(speedtestSource, /\.backdrop \{ display: none !important; \}/)
  assert.match(speedtestSource, /min-height: 0 !important/)
  assert.match(speedtestSource, /classList\.add\('embed'\)/)
  // Must be applied before the first measurement, or the inflated
  // full-viewport height gets locked in.
  assert.ok(
    speedtestSource.indexOf('applyEmbedContract(doc)') < speedtestSource.indexOf('const sync = () => measure(doc)'),
    'embed contract must be applied before the first measure',
  )
  const securityInclude = serverSource.indexOf('include /etc/nginx/conf.d/apen_support/security-headers.inc;')
  const firstStaticLocation = serverSource.indexOf('location ^~ /403/', securityInclude)
  assert.ok(securityInclude >= 0 && firstStaticLocation > securityInclude)
  assert.doesNotMatch(
    serverSource.slice(securityInclude, firstStaticLocation),
    /add_header Cache-Control/,
  )
  assert.match(
    serverSource,
    /location \/ \{[\s\S]*add_header Cache-Control "no-cache, must-revalidate" always;/,
  )
  assert.match(deploySource, /nginx\/server\.conf nginx\/security-headers\.inc/)
})

test('the admin content panels start blank until a location is chosen', () => {
  const libraryPanel = fs.readFileSync(path.join('app', 'admin', 'AdminFileLibraryPanel.tsx'), 'utf8')
  const contentEditor = fs.readFileSync(path.join('app', 'admin', 'AdminContentEditor.tsx'), 'utf8')

  // Downloads & installers: no directory preselected, and its body is gated.
  // Step 1 names a product section now, not a folder — the folder is derived.
  assert.match(libraryPanel, /<option value="">— Choose a product section —<\/option>/)
  assert.match(libraryPanel, /\{activeDir && \(/)
  assert.doesNotMatch(libraryPanel, /useState\('isos'\)/)

  // Registered route images: a route must be picked before the editor appears.
  assert.match(contentEditor, /const \[routeChosen, setRouteChosen\] = useState\(false\)/)
  assert.match(contentEditor, /<option value="">— Choose a route —<\/option>/)
  assert.match(contentEditor, /\{routeChosen && \(/)

  // Section picker + its card list follow the same pattern.
  assert.match(contentEditor, /const \[scopeChosen, setScopeChosen\] = useState\(false\)/)
  assert.match(contentEditor, /<option value="">— Choose a section —<\/option>/)
  assert.match(contentEditor, /\{scopeChosen && \(/)
  // Jumping to a section from elsewhere must expand it, not just set the key.
  assert.match(contentEditor, /function selectScope\(scope: string\) \{/)
  assert.match(contentEditor, /if \(meta\) selectScope\(scope\)/)
})

test('search state stays in the URL fragment and follows browser history', () => {
  const searchSource = fs.readFileSync(path.join('app', 'search', 'SearchClient.tsx'), 'utf8')
  assert.match(searchSource, /window\.location\.hash\.slice\(1\)/)
  assert.match(searchSource, /window\.addEventListener\('hashchange'/)
  assert.match(searchSource, /window\.addEventListener\('popstate'/)
  assert.match(searchSource, /window\.removeEventListener\('hashchange'/)
  assert.match(searchSource, /requestParameters\.delete\('q'\)/)
  assert.match(searchSource, /requestParameters\.delete\('category'\)/)
  assert.match(searchSource, /`#\$\{parameters\}`/)
  assert.doesNotMatch(searchSource, /setQuery\(requestParameters/)
})

test('the auth subrequest lifts its body-size cap so large uploads are not 500s', () => {
  const serverSource = fs.readFileSync(path.join('nginx', 'server.conf'), 'utf8')
  const authcheck = /location = \/internal\/authcheck \{([\s\S]*?)\n    \}/.exec(serverSource)?.[1]
  assert.ok(authcheck, 'the /internal/authcheck location must exist')
  // nginx size-checks an auth subrequest against ITS OWN location's limit while
  // it inherits the parent's Content-Length, so the 1 MiB default here 413s a
  // multi-GB upload and auth_request relays that to the browser as a bare 500.
  assert.match(authcheck, /client_max_body_size 0;/)
  // The upload endpoint's own cap must stay lifted too — both are required.
  const upload = /location = \/api\/admin\/file-upload \{([\s\S]*?)\n    \}/.exec(serverSource)?.[1]
  assert.ok(upload, 'the /api/admin/file-upload location must exist')
  assert.match(upload, /client_max_body_size 0;/)
})

test('the upload panel queues multiple files, renames them, and numbers its steps 1-2-3', () => {
  const libraryPanel = fs.readFileSync(path.join('app', 'admin', 'AdminFileLibraryPanel.tsx'), 'utf8')

  // Multi-file: the input takes several files and they upload sequentially.
  assert.match(libraryPanel, /type="file"\s+multiple/)
  assert.match(libraryPanel, /addFiles\(e\.dataTransfer\.files\)/)
  // Each queued row's stored name is editable BEFORE upload and validated the
  // same way the server will (extension allowlist + character class), so a bad
  // name stops at the button, not at the end of a 15 GB POST.
  assert.match(libraryPanel, /function queueRowError\(/)
  assert.match(libraryPanel, /disabled=\{!queueReady \|\| uploading \|\| !activeDir\?\.writable\}/)
  assert.match(libraryPanel, /name: item\.name/)

  // Files already on the server can be renamed; the proxy validates both names
  // with the same guard uploads use.
  assert.match(libraryPanel, /renameLibraryFile\(dirKey, renameFrom/)
  const proxy = fs.readFileSync(path.join('proxy', 'site-stats.mjs'), 'utf8')
  assert.match(proxy, /url === '\/api\/admin\/file-rename'/)
  assert.match(proxy, /const to = safeLibraryName\(entry, String\(data\.to \|\| ''\)\)/)

  // Steps read 1, 2, 3 with nothing skipped: type detection lives inside each
  // step-2 row (it only existed for a chosen file, which is why the old
  // standalone step 3 vanished and the numbering jumped 1-2-4).
  assert.match(libraryPanel, /1\. Choose what you are updating/)
  assert.match(libraryPanel, /2\. Choose the files to upload/)
  assert.match(libraryPanel, /3\. Files on the server/)
  assert.doesNotMatch(libraryPanel, /4\. Files on the server/)
})

test('the upload location is derived from the chosen product section', () => {
  const editor = fs.readFileSync(path.join('app', 'admin', 'AdminContentEditor.tsx'), 'utf8')
  const libraryPanel = fs.readFileSync(path.join('app', 'admin', 'AdminFileLibraryPanel.tsx'), 'utf8')
  // The folder comes off the section's own links, so a new section needs no
  // extra wiring and the mapping cannot drift from where files really live.
  assert.match(editor, /function commonDownloadPrefix\(/)
  assert.match(editor, /urlPrefix: commonDownloadPrefix\(scope\.defaults\)/)
  assert.match(libraryPanel, /byUrlPath\.get\(target\.urlPrefix\)/)
  // Folders no section claims must still be reachable, or files become orphaned.
  assert.match(libraryPanel, /no card points here yet/)
})

test('a finished upload becomes a pending item on the publish card', () => {
  const editor = fs.readFileSync(path.join('app', 'admin', 'AdminContentEditor.tsx'), 'utf8')
  const libraryPanel = fs.readFileSync(path.join('app', 'admin', 'AdminFileLibraryPanel.tsx'), 'utf8')
  assert.match(libraryPanel, /onUploaded\?\.\(\{ name: result\.name, url \}\)/)
  // Its row swaps the browse actions for Publish, which jumps to the card.
  assert.match(libraryPanel, /uploadedThisSession\.includes\(file\.name\)/)
  assert.match(libraryPanel, /getElementById\('publish-changes'\)/)
  // The card must highlight and enable Publish for uploads alone, not just for
  // unpublished text edits — otherwise an upload-only session looks finished.
  assert.match(editor, /<div id="publish-changes">/)
  assert.match(editor, /unpublishedScopes\.length > 0 \|\| pendingUploads\.length > 0 \? 'amber'/)
  assert.match(editor, /unpublishedScopes\.length === 0 && pendingUploads\.length === 0/)
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

test('download-list cards expose their links to the attach and edit flows', () => {
  const editor = fs.readFileSync(path.join('app', 'admin', 'AdminContentEditor.tsx'), 'utf8')
  // Without a URL field in its scope, VMware Tools was skipped by
  // DOWNLOAD_ATTACH_SCOPES entirely: no "Use in a card", no editable links.
  assert.match(editor, /const DOWNLOAD_LIST_FIELDS/)
  assert.match(editor, /'downloads\.0\.href'/)
  assert.match(editor, /fields: \[\.\.\.COMMON_CARD_FIELDS, \.\.\.DOWNLOAD_LIST_FIELDS\]/)
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

test('the attach editor never opens without a card selected', () => {
  const libraryPanel = fs.readFileSync(path.join('app', 'admin', 'AdminFileLibraryPanel.tsx'), 'utf8')
  // Step 1 pre-arms the section only; openAttach must pick a card of that
  // section, and Update must stay disabled while none is chosen — otherwise
  // the override was saved under the empty card id ''.
  assert.match(libraryPanel, /const target = attachTargets\.find\(\(t\) => t\.scope === attachScope\) \?\? attachTargets\[0\]/)
  assert.match(libraryPanel, /!target\.cards\.some\(\(card\) => card\.id === attachCardId\)/)
  assert.match(libraryPanel, /disabled=\{attachState === 'saving' \|\| !attachTarget \|\| !attachCardId \|\|/)
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

test('stat tiles open the console section holding their detail', () => {
  const dashboard = fs.readFileSync(path.join('app', 'admin', 'AdminDashboard.tsx'), 'utf8')
  // The counts were inert: an admin saw "5" with no way to reach the five.
  assert.match(dashboard, /onOpen=\{\(\) => openSection\('monitor', 'system-events'\)\}/)
  assert.match(dashboard, /onOpen=\{\(\) => openSection\('pages', 'custom-pages'\)\}/)
  assert.match(dashboard, /onOpen=\{\(\) => openSection\('transcripts', 'chat-transcripts'\)\}/)
  for (const anchor of ['system-events', 'custom-pages', 'chat-transcripts', 'site-history']) {
    assert.match(dashboard, new RegExp(`id="${anchor}"`), `missing scroll anchor #${anchor}`)
  }
  // The target section only mounts once its tab is active, so the scroll must
  // wait a frame — querying in the same tick finds nothing and silently no-ops.
  assert.match(dashboard, /requestAnimationFrame\(\(\) => \{/)
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

test('every documentation page is editable and every picker names its page', async () => {
  const editor = fs.readFileSync(path.join('app', 'admin', 'AdminContentEditor.tsx'), 'utf8')

  // The four /docs pages were the only card grids with no admin scope at all.
  for (const scope of ['docs/vmware/cards', 'docs/trellix/cards', 'docs/evaluate-stig/cards', 'docs/microsoft-products/cards']) {
    assert.match(editor, new RegExp(`scope: '${scope}'`), `missing editable scope ${scope}`)
  }
  assert.match(editor, /const LINKS_LIST_FIELDS/)
  assert.match(editor, /'links\.0\.href'/)

  // Each page passes its scope through the shared grid component.
  for (const [page, scope] of [
    ['vmware', 'docs/vmware/cards'], ['trellix', 'docs/trellix/cards'],
    ['evaluate-stig', 'docs/evaluate-stig/cards'], ['microsoft-products', 'docs/microsoft-products/cards'],
  ]) {
    const source = fs.readFileSync(path.join('app', 'docs', page, 'page.tsx'), 'utf8')
    assert.match(source, new RegExp(`scope="${scope}"`), `${page} page not wired`)
  }
  assert.match(
    fs.readFileSync(path.join('components', 'cards', 'DocumentationCards.tsx'), 'utf8'),
    /useCardOverrides<DocCard>\(scope, cards\)/,
  )

  // Pickers name the page each section edits, derived from its description —
  // and every section's description must actually contain a route to derive.
  assert.match(editor, /function scopeRoute\(/)
  assert.match(editor, /\{s\.sectionName\}\{route \? ` — \$\{route\}` : ''\}\{flag\}/)
  const described = [...editor.matchAll(/description: '([^']+)'/g)].map((m) => m[1])
  assert.ok(described.length >= 30, `only ${described.length} scope descriptions found`)
  for (const description of described) {
    assert.match(description, /\/[A-Za-z0-9_/-]+/, `description lacks a route: "${description}"`)
  }

  // AMI is spelled out on the upgrade-guide card.
  const vmware = fs.readFileSync(path.join('lib', 'data', 'vmware.ts'), 'utf8')
  assert.match(vmware, /Upgrade vCenter using the Appliance Management Interface \(PDF\)/)
})

test('URL fields offer the server files of every folder their section links into', () => {
  const editor = fs.readFileSync(path.join('app', 'admin', 'AdminContentEditor.tsx'), 'utf8')
  // One datalist, referenced by every url-type input — native dropdown with
  // free text preserved for routes and external links.
  assert.match(editor, /<datalist id="admin-scope-file-options">/)
  assert.match(editor, /list=\{field\.type === 'url' \? 'admin-scope-file-options' : undefined\}/)
  // ALL of a section's folders feed it, not just the most-linked one — the
  // Tools / VMRC section spans /vmware/vmware-tools AND /vmware/vmrc, and a
  // best-prefix-only list would leave the VMRC field with nothing to offer.
  assert.match(editor, /function downloadPrefixes\(/)
  assert.match(editor, /prefixes\.includes\(entry\.urlPath\)/)
  // Unfinished uploads never appear as pickable URLs.
  assert.match(editor, /if \(!file\.partial\) collected\.push\(file\.url\)/)
})

test('a server-file rename cannot leave stale links behind silently', () => {
  const proxy = fs.readFileSync(path.join('proxy', 'site-stats.mjs'), 'utf8')
  const panel = fs.readFileSync(path.join('app', 'admin', 'AdminFileLibraryPanel.tsx'), 'utf8')
  const audit = fs.readFileSync(path.join('scripts', 'audit-download-links.mjs'), 'utf8')

  // Layer 1: overrides pointing at the old URL are rewritten with the rename.
  assert.match(proxy, /function rewriteOverrideUrls\(/)
  assert.match(proxy, /rewriteOverrideUrls\(oldUrl, newUrl, req\.adminUser\)/)
  // Layer 2: links baked in from source defaults can't be rewritten — they are
  // counted and reported, and the panel tells the admin exactly what to do.
  assert.match(proxy, /function countBuiltReferences\(/)
  assert.match(panel, /staleBuiltPages > 0/)
  assert.match(panel, /still link/)
  // Layer 3: every publish build runs the link audit and folds the verdict
  // into the build status, so a broken link never survives a publish unnoticed.
  assert.match(proxy, /if \(code === 0\) runLinkAuditIntoBuildStatus\(\)/)
  assert.match(proxy, /download links point at files missing from the server/)
  assert.match(audit, /--json/)
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

test('every download card renders its files through the shared v8-style row', () => {
  // One component owns the row (label left, extension-named button right); the
  // sweep exists because four pages had copy-pasted it and five had drifted.
  const row = fs.readFileSync(path.join('components', 'cards', 'DownloadRow.tsx'), 'utf8')
  assert.match(row, /btn-download flex-shrink-0 ml-2 text-xs px-2 py-1/)
  assert.match(row, /extension \? `\.\$\{extension\}` : 'Download'/)

  const consumers = [
    'app/downloads/vmware/v8/VMware8Cards.tsx',
    'app/downloads/vmware/v7/VMware7Cards.tsx',
    'app/downloads/vmware/v9/VMware9Cards.tsx',
    'app/downloads/vmware/tools/VMwareToolsCards.tsx',
    'app/downloads/microsoft-products/office/MicrosoftOfficeCards.tsx',
    'app/docs/evaluate-stig/documents/EvalDocsCards.tsx',
    'app/downloads/iso/windows/WindowsOSCards.tsx',
    'app/downloads/iso/linux/enterprise/LINUXOSCards.tsx',
    'app/downloads/iso/linux/ubuntu/UbuntuOSCards.tsx',
    'components/cards/DocumentationCards.tsx',
  ]
  // The compact tile layout routes its links through the SAME file: TileGrid
  // renders DownloadButton for a single file and DownloadRow for a list, both
  // exported from DownloadRow.tsx, so extension detection and the new-tab rule
  // stay decided in one place. A converted page therefore satisfies this sweep
  // via <TileGrid — but a page that hand-rolls its own <a> markup still fails.
  const tileGrid = fs.readFileSync(path.join('components', 'cards', 'TileGrid.tsx'), 'utf8')
  assert.match(tileGrid, /import \{ DownloadButton, DownloadRow \} from '@\/components\/cards\/DownloadRow'/)
  assert.match(tileGrid, /<DownloadRow /)
  // ISOTiles is the one shared wrapper the three ISO pages delegate to; it must
  // reach the same shared renderer rather than growing its own link markup.
  for (const wrapper of [
    path.join('app', 'downloads', 'iso', 'ISOTiles.tsx'),
    path.join('app', 'downloads', 'vmware', 'VMwareProductTiles.tsx'),
  ]) {
    const source = fs.readFileSync(wrapper, 'utf8')
    assert.match(source, /<TileGrid/, `${wrapper} must delegate to the shared tile grid`)
    assert.doesNotMatch(source, /<a\s+href=/, `${wrapper} hand-rolls its own link markup`)
  }

  for (const file of consumers) {
    const source = fs.readFileSync(file, 'utf8')
    assert.match(
      source,
      /<DownloadRow |<TileGrid|<ISOTiles|<VMwareProductTiles/,
      `${file} does not route its files through the shared row, tile grid, or a shared tile wrapper`,
    )
    // No page keeps a private copy of the row markup or the old full-width
    // download button beside the shared one.
    assert.doesNotMatch(source, /btn-download w-full justify-center/, `${file} still has a full-width download button`)
    assert.doesNotMatch(source, /btn-primary w-full justify-center[\s\S]{0,200}Download size/, `${file} still has a btn-primary download`)
  }
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
