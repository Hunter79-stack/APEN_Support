/**
 * Attribution page and third-party notices stay in step with what ships.
 *
 *  - every licence file the page links to exists under public/
 *  - every vendored asset class the page names still has its files
 *  - public/THIRD-PARTY-NOTICES.txt matches a fresh generation, so a
 *    dependency bump cannot silently ship stale notices
 *  - the footer links to /attribution
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { generate, OUTPUT } from '../scripts/build-third-party-notices.mjs'

const ROOT = process.cwd()
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

test('every licence file linked from /attribution ships in public/', () => {
  const page = read('components/legal/attribution.tsx')
  const hrefs = [...page.matchAll(/href: '(\/[^']+)'/g)].map((m) => m[1])
  assert.ok(hrefs.length >= 4, `expected licence links, found ${hrefs.length}`)
  for (const href of hrefs) {
    assert.ok(fs.existsSync(path.join(ROOT, 'public', href)), `${href} missing from public/`)
  }
})

test('vendored assets named on /attribution exist and carry their notices', () => {
  for (const f of [
    'public/vendor/lottie_light.min.js',
    'public/vendor/lottie_light.LICENSE.txt',
    'public/fonts/inter-latin.woff2',
    'public/fonts/Inter-OFL.txt',
    'public/fonts/jetbrains-mono-latin.woff2',
    'public/fonts/JetBrainsMono-OFL.txt',
  ]) assert.ok(fs.existsSync(path.join(ROOT, f)), `${f} missing`)
  assert.match(read('public/vendor/lottie_light.min.js').slice(0, 300), /MIT License.*Bodymovin/, 'lottie banner stripped')
  assert.match(read('public/fonts/Inter-OFL.txt'), /SIL OPEN FONT LICENSE Version 1\.1/)
  assert.match(read('public/fonts/JetBrainsMono-OFL.txt'), /SIL OPEN FONT LICENSE Version 1\.1/)
  for (const f of ['components/ui/button.tsx', 'components/ui/card.tsx', 'components/ui/dropdown-menu.tsx', 'lib/data/utils.ts']) {
    assert.match(read(f), /Origin: shadcn\/ui/, `${f} lost its origin header`)
  }
})

// The committed file describes the linux-x64 install (platform-specific optional packages).
const notLinuxX64 = process.platform !== 'linux' || process.arch !== 'x64'
test('THIRD-PARTY-NOTICES.txt is current for the installed dependency closure', { skip: notLinuxX64 }, () => {
  assert.equal(fs.readFileSync(OUTPUT, 'utf8'), generate(), 'run `npm run notices` and commit the result')
})

test('footer links to /attribution', () => {
  assert.match(read('lib/data/footer.ts'), /href: '\/attribution'/)
  assert.match(read('components/layout/Footer.tsx'), /href="\/attribution"/)
})
