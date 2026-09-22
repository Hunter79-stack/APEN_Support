/**
 * The page wizard derives a download row's base / filename from its href on
 * every render (no per-row state), so this split must be stable and lossless.
 */
import assert from 'node:assert/strict'
import test from 'node:test'

import { DOWNLOAD_BASE_PRESETS, splitDownloadHref } from '../lib/data/admin-content'

test('splitDownloadHref picks the longest preset and never loses characters', () => {
  const root = DOWNLOAD_BASE_PRESETS.find((p) => p.label.endsWith('root'))!.value
  const vmware = DOWNLOAD_BASE_PRESETS.find((p) => p.label.endsWith('VMware'))!.value
  assert.ok(vmware.startsWith(root), 'fixture: VMware preset sits under the root preset')

  assert.deepEqual(splitDownloadHref(`${vmware}esxi.iso`, DOWNLOAD_BASE_PRESETS), { base: vmware, filename: 'esxi.iso' })
  assert.deepEqual(splitDownloadHref(`${root}other/x.zip`, DOWNLOAD_BASE_PRESETS), { base: root, filename: 'other/x.zip' })
  // No preset matches: external URL, href untouched.
  assert.deepEqual(splitDownloadHref('https://example.com/f.pdf', DOWNLOAD_BASE_PRESETS), { base: '', filename: 'https://example.com/f.pdf' })
  assert.deepEqual(splitDownloadHref('', DOWNLOAD_BASE_PRESETS), { base: '', filename: '' })
  for (const href of [`${vmware}a b.iso`, '/docs/local.pdf', root]) {
    const { base, filename } = splitDownloadHref(href, DOWNLOAD_BASE_PRESETS)
    assert.equal(base + filename, href)
  }
})
