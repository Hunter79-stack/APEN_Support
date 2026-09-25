/**
 * Source guards — lint-style rules written as tests.
 *
 * Every test here reads a source file and asserts that a token is (or is
 * not) present. They pin decisions that are easy to undo by accident
 * (an accessibility attribute, a security header, a removed feature), NOT
 * behaviour: a passing guard says the text is there, not that it works.
 * Behavioural tests, which import the code and assert on return values,
 * live in tests/ui-behavior.test.ts and the other *.test.ts files.
 *
 * Adding one: only when the claim is genuinely "this token must (not)
 * appear"; otherwise export the helper and test it for real.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

test('AI assistant launcher names itself to first-time visitors', () => {
  // The launcher's intro state and greeting card live beside the component (code-quality #76).
  // Capsule geometry (head smaller than the pill) is asserted on the exported
  // constants in ui-behavior.test.ts; the widget only mounts client-side, so
  // its accessibility attributes stay pinned here.
  const assistantSource = [
    path.join('components', 'ui', 'APEN-chat-assistant.tsx'),
    path.join('lib', 'hooks', 'useLauncherIntro.ts'),
    path.join('components', 'assistant', 'GreetingCard.tsx'),
  ].map((f) => fs.readFileSync(f, 'utf8')).join('\n')
  const globalStyles = fs.readFileSync(path.join('app', 'globals.css'), 'utf8')

  // The floating robot head must never again ship as an unlabeled icon.
  assert.match(assistantSource, /ASSISTANT_LAUNCHER\.brand/)
  assert.match(assistantSource, /ASSISTANT_LAUNCHER\.role/)
  assert.match(assistantSource, /assistant-launcher-pill/)
  assert.match(globalStyles, /\.assistant-launcher-pill/)

  // The pill must be a non-focusable aria-hidden <span> nested in the trigger,
  // never its own <button>: a button takes focus on click even with
  // tabIndex={-1}, which put focus inside an aria-hidden subtree.
  assert.match(assistantSource, /<span[\s\S]{0,240}aria-hidden="true"[\s\S]{0,240}assistant-launcher-pill/)
  const assistantCode = assistantSource.replace(/\/\*[\s\S]*?\*\//g, '')
  assert.doesNotMatch(assistantCode, /<button[^>]*assistant-launcher-pill/)

  // Trigger carries a real accessible name plus disclosure semantics.
  assert.match(assistantSource, /aria-haspopup="dialog"/)
  assert.match(assistantSource, /aria-expanded=\{open\}/)
  assert.match(assistantSource, /aria-controls="apen-assistant-panel"/)
  assert.doesNotMatch(assistantSource, /alt="AI"/)

  // First-visit greeting is shown at most once per browser.
  assert.match(assistantSource, /assistant-greeting-card/)
  assert.match(assistantSource, /hasSeenAssistantGreeting/)
  assert.match(assistantSource, /markAssistantGreetingSeen/)

  // Keyboard access and the AI transparency line.
  assert.match(assistantSource, /ASSISTANT_SHORTCUT\.key/)
  assert.match(assistantSource, /id="assistant-ai-disclaimer"/)
  assert.match(assistantSource, /ASSISTANT_INPUT_PLACEHOLDER/)
})

test('AI assistant drag is wired through window pointer events, and nothing hides it below lg', () => {
  const assistantSource = fs.readFileSync(path.join('components', 'ui', 'APEN-chat-assistant.tsx'), 'utf8')
  assert.match(assistantSource, /onPointerDown/)
  assert.match(assistantSource, /window\.addEventListener\('pointermove'/)
  assert.match(assistantSource, /window\.addEventListener\('pointerup'/)
  assert.match(assistantSource, /window\.removeEventListener\('pointermove'/)
  assert.match(assistantSource, /setPointerCapture/)
  assert.match(assistantSource, /onDoubleClick/)
  assert.match(assistantSource, /window\.addEventListener\('resize', handleResize\)/)
  assert.match(assistantSource, /window\.removeEventListener\('resize', handleResize\)/)
  assert.doesNotMatch(assistantSource, /hidden[\s\S]*lg:block/)
})

test('AI assistant keeps the red pulse glow and listens for the footer feedback event', () => {
  // The footer side (button rendered, event dispatched) is a behavioural test
  // in ui-behavior.test.ts; the receiving side only mounts client-side.
  const assistantSource = fs.readFileSync(path.join('components', 'ui', 'APEN-chat-assistant.tsx'), 'utf8')
  const globalStyles = fs.readFileSync(path.join('app', 'globals.css'), 'utf8')
  assert.match(assistantSource, /assistant-red-pulse/)
  assert.match(assistantSource, /window\.addEventListener\(ASSISTANT_CONFIG\.openFeedbackEvent/)
  assert.match(assistantSource, /setTab\('feedback'\)/)
  assert.match(globalStyles, /\.assistant-red-pulse/)
  assert.match(globalStyles, /@keyframes assistantRedPulse/)
  assert.match(globalStyles, /body\[data-gpu-tier="none"\] \.assistant-red-pulse/)
})

test('AI assistant closes when clicking outside the assistant', () => {
  const assistantSource = fs.readFileSync(path.join('components', 'ui', 'APEN-chat-assistant.tsx'), 'utf8')
  assert.match(assistantSource, /document\.addEventListener\('pointerdown', handleDocumentPointerDown/)
  assert.match(assistantSource, /assistantRootRef\.current\?\.contains\(target\)/)
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

test('raster card logos pass priority through to next/image', () => {
  // The SVG branch and the hover card are rendered in ui-behavior.test.ts;
  // this pins the raster branch, which the test loader cannot render.
  const expandableGridSource = fs.readFileSync(path.join('components', 'cards', 'ExpandableCardGrid.tsx'), 'utf8')
  const themedLogoSource = fs.readFileSync(path.join('components', 'common', 'ThemedLogo.tsx'), 'utf8')
  assert.match(expandableGridSource, /<ThemedLogo[\s\S]*src=\{card\.logo\}[\s\S]*priority/)
  assert.match(themedLogoSource, /priority=\{priority\}/)
})

test('the admin badge is wired through the shared count hook and stays labelled', () => {
  // Counting (live + static minus acknowledged/dismissed) is a behavioural test
  // on adminNotificationCountsFor in ui-behavior.test.ts, and the proxy's
  // acknowledged-alerts store is exercised over HTTP in site-stats-http.test.ts.
  const navSource = fs.readFileSync(path.join('components', 'layout', 'Navbar.tsx'), 'utf8')
  const hookSource = fs.readFileSync(path.join('lib', 'hooks', 'useAdminNotificationCounts.ts'), 'utf8')
  assert.match(navSource, /useAdminNotificationCounts/)
  assert.match(navSource, /AdminNotificationCountBadge/)
  assert.match(navSource, /aria-label=\{isAdminItem \? adminNotificationLabel : undefined\}/)
  // The /api/site-stats fallback must still FILTER, not count raw — otherwise a
  // proxy outage lights the cog over handled items.
  assert.match(hookSource, /!response\.ok[\s\S]*adminNotificationCountsFor\(null, seen\)/)
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

test('page card grids take their glow from the shared palette', () => {
  // The palette's size, wrap-around and uniqueness per home group are
  // asserted on the module in ui-behavior.test.ts; this pins the consumers.
  for (const file of [
    path.join('components', 'home', 'LinksGrid.tsx'),
    path.join('components', 'cards', 'HoverRevealGrid.tsx'),
    path.join('components', 'cards', 'ExpandableCardGrid.tsx'),
    path.join('components', 'home', 'AnnouncementList.tsx'),
  ]) {
    assert.match(fs.readFileSync(file, 'utf8'), /getCardGlowColor/, `${file} does not use the shared palette`)
  }
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

test('desktop navigation flyouts keep menu semantics and keyboard handling', () => {
  // Closed-state disclosure attributes are asserted on rendered markup in
  // ui-behavior.test.ts; an open flyout needs a click, so its items stay pinned.
  const source = fs.readFileSync(path.join('components', 'layout', 'Navbar.tsx'), 'utf8')
  assert.match(source, /role="menuitem"/)
  assert.match(source, /handleDesktopTriggerKeyDown/)
  assert.match(source, /handleFlyoutKeyDown/)
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

test('the admin content editor starts blank until a section is chosen', () => {
  // The file library and route-image editor are rendered blank in
  // ui-behavior.test.ts; the content editor sits behind SessionGate, so its
  // picker stays pinned here.
  const contentEditor = fs.readFileSync(path.join('app', 'admin', 'AdminContentEditor.tsx'), 'utf8')
  assert.match(contentEditor, /<option value="">— Choose a section —<\/option>/)
  assert.match(contentEditor, /\{scopeChosen && \(/)
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

test('the upload panel takes several files and numbers its steps 1-2-3', () => {
  // Server-side rename rules are exercised over HTTP in site-stats-http.test.ts.
  const libraryPanel = fs.readFileSync(path.join('app', 'admin', 'AdminFileLibraryPanel.tsx'), 'utf8')
  assert.match(libraryPanel, /type="file"\s+multiple/)
  assert.match(libraryPanel, /1\. Choose what you are updating/)
  assert.match(libraryPanel, /2\. Choose the files to upload/)
  assert.match(libraryPanel, /3\. Files on the server/)
  assert.doesNotMatch(libraryPanel, /4\. Files on the server/)
  // Folders no section claims must still be reachable, or files become orphaned.
  assert.match(libraryPanel, /no card points here yet/)
})

test('a finished upload becomes a pending item on the publish card', () => {
  const editor = fs.readFileSync(path.join('app', 'admin', 'AdminContentEditor.tsx'), 'utf8')
  assert.match(editor, /<div id="publish-changes">/)
  // Uploads alone must light and enable Publish, not just unpublished text edits.
  assert.match(editor, /unpublishedScopes\.length > 0 \|\| pendingUploads\.length > 0/)
})

test('the attach editor cannot submit without a card selected', () => {
  // Landing on a real card is resolveAttachSelection, tested in ui-behavior.test.ts.
  const libraryPanel = fs.readFileSync(path.join('app', 'admin', 'AdminFileLibraryPanel.tsx'), 'utf8')
  assert.match(libraryPanel, /disabled=\{attachState === 'saving' \|\| !attachTarget \|\| !attachCardId \|\|/)
})

test('stat tiles open the console section holding their detail', () => {
  // The default tab's anchors are asserted on rendered markup in ui-behavior.test.ts.
  const dashboard = fs.readFileSync(path.join('app', 'admin', 'AdminDashboard.tsx'), 'utf8')
  assert.match(dashboard, /onOpen=\{\(\) => openSection\('monitor', 'system-events'\)\}/)
  assert.match(dashboard, /onOpen=\{\(\) => openSection\('pages', 'custom-pages'\)\}/)
  assert.match(dashboard, /onOpen=\{\(\) => openSection\('transcripts', 'chat-transcripts'\)\}/)
  for (const anchor of ['custom-pages', 'chat-transcripts']) {
    assert.match(dashboard, new RegExp(`id="${anchor}"`), `missing scroll anchor #${anchor}`)
  }
})

test('every documentation page is wired to its editable scope', () => {
  // The scopes, their link fields and the route in every description are
  // asserted on EDITABLE_SCOPES in ui-behavior.test.ts; this pins the wiring.
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
  // Pickers name the page each section edits.
  const editor = fs.readFileSync(path.join('app', 'admin', 'AdminContentEditor.tsx'), 'utf8')
  assert.match(editor, /\{s\.sectionName\}\{route \? ` — \$\{route\}` : ''\}\{flag\}/)
})

test('URL fields offer the server files of every folder their section links into', () => {
  const editor = fs.readFileSync(path.join('app', 'admin', 'AdminContentEditor.tsx'), 'utf8')
  const rowEditor = fs.readFileSync(path.join('app', 'admin', 'CardRowEditor.tsx'), 'utf8')
  // One datalist (in the editor), referenced by every url-type input (in the
  // row editor) — native dropdown with free text preserved for routes and
  // external links.
  assert.match(editor, /<datalist id="admin-scope-file-options">/)
  assert.match(rowEditor, /list=\{field\.type === 'url' \? 'admin-scope-file-options' : undefined\}/)
  // Unfinished uploads never appear as pickable URLs.
  assert.match(editor, /if \(!file\.partial\) collected\.push\(file\.url\)/)
})

test('a server-file rename cannot leave stale links behind silently', () => {
  const proxy = fs.readFileSync(path.join('proxy', 'site-stats.mjs'), 'utf8')
  const panel = fs.readFileSync(path.join('app', 'admin', 'AdminFileLibraryPanel.tsx'), 'utf8')
  const audit = fs.readFileSync(path.join('scripts', 'audit-download-links.mjs'), 'utf8')

  // Layer 1 (overrides follow the rename) is exercised over HTTP in site-stats-http.test.ts.
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
    // Admin-authored pages (code-quality #71): the row's accessible name comes from the shared component.
    'components/common/CustomPageView.tsx',
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
