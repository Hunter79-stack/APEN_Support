/**
 * Card and tile accessibility sweep.
 *
 * The repo had already ruled on this shape once — ui-behavior.test.ts bans a
 * widget role wrapping nested interactive controls for CustomPageView — but the
 * rule was pinned to that one file, so the first draft of the Store tile
 * reintroduced it: a `div role="checkbox"` containing both the download link
 * and a real checkbox. ARIA treats a widget role's children as presentational,
 * so those controls were unreachable and the item announced two checkboxes.
 *
 * This sweep makes the rule site-wide. The pre-existing offenders are listed in
 * LEGACY_WIDGET_ROLE_CARDS: that list may SHRINK (convert a page, delete its
 * entry) but must never grow.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

/** Comments must go first: TileGrid's own header explains why it does NOT use
 *  role="checkbox", and a naive scan flags that prose as a violation. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

function componentFiles(): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      // The admin console is an internal tool, not a visitor-facing page.
      if (entry.isDirectory()) { if (full !== path.join('app', 'admin')) walk(full) }
      else if (full.endsWith('.tsx')) out.push(full)
    }
  }
  walk('app'); walk('components')
  return out.sort()
}

/** Expanding GlowCard pages not yet converted. Shrink this list, never grow it. */
const LEGACY_WIDGET_ROLE_CARDS = new Set([
  'app/docs/el/ad/ADMgmtCards.tsx',
  'app/docs/el/certificates/CryptoCards.tsx',
  'app/docs/el/system-settings/SystemSettingCards.tsx',
  'app/docs/evaluate-stig/linux/enterprise/STIGEnterpriseLinuxCard.tsx',
  'app/docs/evaluate-stig/linux/ubuntu/STIGUbuntuCards.tsx',
  'app/docs/ub/ad/ADMgmtCards.tsx',
  'app/docs/ub/certificates/CryptoCards.tsx',
  'app/docs/ub/storage/StorageCards.tsx',
  'app/docs/ub/system-settings/SystemSettingCards.tsx',
  'app/dren/trellix/DRENTrellixELCards.tsx',
  'app/dren/trellix/DRENTrellixUbuntuCards.tsx',
  'app/trellix/enterprise-linux/TrellixELCards.tsx',
  'app/trellix/ubuntu/TrellixUbuntuCards.tsx',
  'components/cards/ExpandableCardGrid.tsx',
])

function widgetRoleViolations(): string[] {
  return componentFiles().filter((file) => {
    const src = stripComments(fs.readFileSync(file, 'utf8'))
    return /role="(button|checkbox)"/.test(src) && /<(a\s|button|input)/.test(src)
  })
}

test('no NEW component wraps interactive controls in an ARIA widget role', () => {
  const added = widgetRoleViolations().filter((f) => !LEGACY_WIDGET_ROLE_CARDS.has(f))
  assert.deepEqual(added, [], `these files put a link/button/checkbox inside role="button|checkbox":\n${added.join('\n')}`)
})

test('the legacy list stays honest — converted pages are removed from it', () => {
  const stillOffending = new Set(widgetRoleViolations())
  const staleEntries = [...LEGACY_WIDGET_ROLE_CARDS].filter((f) => !stillOffending.has(f))
  assert.deepEqual(
    staleEntries, [],
    `these are clean now (or gone) and must be deleted from LEGACY_WIDGET_ROLE_CARDS:\n${staleEntries.join('\n')}`,
  )
})

test('the shared tile grid uses native controls, not ARIA impersonations', () => {
  const code = stripComments(fs.readFileSync(path.join('components', 'cards', 'TileGrid.tsx'), 'utf8'))

  // Selection is a real checkbox bound by htmlFor — one control, announced once.
  assert.match(code, /<input[\s\S]*?type="checkbox"/)
  assert.match(code, /htmlFor=\{checkboxId\}/)
  assert.doesNotMatch(code, /role="(button|checkbox)"/)

  // Disclosure is a native button that names the panel it controls.
  assert.match(code, /<button[\s\S]*?type="button"/)
  assert.match(code, /aria-expanded=\{open\}/)
  assert.match(code, /aria-controls=\{panelId\}/)

  // A tile must never be made keyboard-unreachable by a conditional tabIndex —
  // the offline/fallback path would strand every tile on the page.
  assert.doesNotMatch(code, /tabIndex=\{[^}]*\?[^}]*:\s*-1\s*\}/)
})

test('converted tile pages carry no hand-rolled card widget', () => {
  const converted = [
    'app/downloads/microsoft-products/store/MSStoreAppxCards.tsx',
    'app/downloads/iso/ISOTiles.tsx',
    'app/downloads/iso/linux/ubuntu/UbuntuOSCards.tsx',
    'app/downloads/iso/linux/enterprise/LINUXOSCards.tsx',
    'app/downloads/iso/windows/WindowsOSCards.tsx',
    'app/trellix/reference/TrellixRefCards.tsx',
    'app/docs/facpro/faq/FAQCards.tsx',
    'app/docs/evaluate-stig/documents/EvalDocsCards.tsx',
    'app/downloads/microsoft-products/office/MicrosoftOfficeCards.tsx',
    'app/downloads/microsoft-products/sqltools/SSMSReleaseTable.tsx',
    'app/downloads/microsoft-products/VisualStudio/VSReleaseTable.tsx',
    'app/downloads/vmware/VMwareProductTiles.tsx',
    'app/downloads/vmware/v7/VMware7Cards.tsx',
    'app/downloads/vmware/v8/VMware8Cards.tsx',
    'app/downloads/vmware/v9/VMware9Cards.tsx',
    'app/downloads/vmware/tools/VMwareToolsCards.tsx',
  ]
  for (const file of converted) {
    const code = stripComments(fs.readFileSync(file, 'utf8'))
    assert.doesNotMatch(code, /role="(button|checkbox)"/, `${file} reintroduced a widget-role card`)
    assert.doesNotMatch(
      code,
      /onKeyDown=\{\(e\) => \(e\.key === 'Enter'/,
      `${file} hand-rolls key handling that a native control already provides`,
    )
  }
})
