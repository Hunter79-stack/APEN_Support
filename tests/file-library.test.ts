/**
 * proxy/file-library.mjs — the guards that stand between /admin and a webroot.
 *
 * These cover the only logic in the upload path that can hurt: filename
 * validation (traversal, dotfiles, reserved suffixes) and the extension
 * allowlist that keeps a .sh or .php out of a directory nginx serves.
 */

import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  BUILT_IN_LIBRARY_DIRS,
  PART_SUFFIX,
  fileExtension,
  findLibraryDir,
  libraryPaths,
  libraryUrlPath,
  safeLibraryName,
  validateLibraryDir,
} from '../proxy/file-library.mjs'

const isos = findLibraryDir('isos')

test('deleting a server file goes through the same name guard as uploading, and refuses while linked', () => {
  // The delete endpoint unlinks real files from a webroot, so the two things
  // that must never regress are: it resolves the name through safeLibraryName
  // (containment — no traversal, no disallowed extension), and it will not
  // remove a file the site still links unless the caller explicitly forces it.
  // Asserted against the proxy source the way ui-behavior.test.ts does, since
  // the handler is not exported.
  const proxySource = readFileSync(join('proxy', 'site-stats.mjs'), 'utf8')
  const route = proxySource.slice(proxySource.indexOf("url === '/api/admin/file-delete'"))
  assert.ok(route.length > 0, 'the DELETE /api/admin/file-delete route must exist')

  const handler = route.slice(0, route.indexOf('/* ── ADMIN: content overrides'))
  assert.match(handler, /authorizeAdmin\(req\)/, 'delete must be admin-gated')
  assert.match(handler, /safeLibraryName\(entry,/, 'the filename must go through the containment guard')
  assert.match(handler, /countOverrideReferences\(fileUrl\)/)
  assert.match(handler, /countBuiltReferences\(fileUrl\)/)
  assert.match(handler, /references > 0 && data\.force !== true/, 'a linked file must be refused unless forced')
  assert.match(handler, /writeHead\(409/, 'the refusal must be a 409 so the UI can offer the override')
  assert.match(handler, /kind: 'file\.delete'/, 'every delete must be audited')
  // The unlink must come AFTER the guard, never before it.
  assert.ok(
    handler.indexOf('references > 0 && data.force !== true') < handler.indexOf('unlinkSync('),
    'the reference guard must run before the file is unlinked',
  )
})

test('every target declares a relative dir and at least one extension', () => {
  for (const entry of BUILT_IN_LIBRARY_DIRS) {
    assert.ok(entry.extensions.length > 0, `${entry.key} must allowlist extensions`)
    assert.ok(!entry.dir.startsWith('/'), `${entry.key} dir must be relative to the library root`)
    assert.equal(libraryUrlPath(entry), `/${entry.dir}`)
  }
})

test('VMware targets exist for each product directory', () => {
  for (const key of ['vmware-7', 'vmware-8', 'vmware-9', 'vmware-tools', 'vmware']) {
    const entry = findLibraryDir(key)
    assert.ok(entry, `${key} should be a known target`)
    assert.ok(entry.extensions.includes('iso') || entry.extensions.includes('exe'))
    assert.ok(entry.extensions.includes('zip'), 'VMware ships ESXi depots as .zip')
  }
  assert.equal(findLibraryDir('vmware-9').dir, 'vmware/9')
})

test('unknown directory keys resolve to null', () => {
  assert.equal(findLibraryDir('does-not-exist'), null)
  assert.equal(findLibraryDir(''), null)
  assert.equal(findLibraryDir(undefined), null)
})

test('accepts a normal ISO name', () => {
  const result = safeLibraryName(isos, 'ubuntu-24.04.4-live-server-amd64.iso')
  assert.deepEqual(result, { ok: true, name: 'ubuntu-24.04.4-live-server-amd64.iso' })
})

test('path traversal is stripped to the basename, never escapes the directory', () => {
  const result = safeLibraryName(isos, '../../etc/cron.d/payload.iso')
  assert.equal(result.ok, true)
  assert.equal(result.name, 'payload.iso')
  const { dirPath, finalPath } = libraryPaths(isos, result.name)
  assert.equal(finalPath, `${dirPath}/payload.iso`)
})

test('rejects an extension the directory does not allow', () => {
  const result = safeLibraryName(isos, 'installer.sh')
  assert.equal(result.ok, false)
  assert.match(String(result.error), /isn't allowed/)
})

test('rejects dotfiles, empty names, missing extensions, and ".."', () => {
  for (const name of ['.bashrc', '', 'noextension', 'a..b.iso', '   ']) {
    assert.equal(safeLibraryName(isos, name).ok, false, `expected ${JSON.stringify(name)} to be refused`)
  }
})

test('rejects the reserved in-progress suffix', () => {
  const result = safeLibraryName(isos, `sneaky.iso${PART_SUFFIX}`)
  assert.equal(result.ok, false)
})

test('the part file is hidden and distinct from rsync partials', () => {
  const { dirPath, partPath } = libraryPaths(isos, 'example.iso')
  assert.equal(partPath, `${dirPath}/.example.iso${PART_SUFFIX}`)
  assert.notEqual(partPath, `${dirPath}/.example.iso.part`)
})

test('extension detection is case-insensitive and tail-anchored', () => {
  assert.equal(fileExtension('Windows11.ISO'), 'iso')
  assert.equal(fileExtension('bundle.tar.gz'), 'gz')
  assert.equal(fileExtension('no-dot'), '')
})

test('an uppercase extension still passes the allowlist', () => {
  assert.equal(safeLibraryName(isos, 'Win11_24H2_English_x64.ISO').ok, true)
})

/* ─── Admin-added locations ─── */

const validDir = { key: 'cisco-fw', label: 'Cisco firmware', family: 'Cisco', dir: 'cisco/firmware', extensions: 'bin, tar, .zip' }

test('a well-formed custom location normalizes its extensions', () => {
  const result = validateLibraryDir(validDir)
  assert.equal(result.ok, true)
  assert.ok(result.entry)
  assert.deepEqual(result.entry.extensions, ['bin', 'tar', 'zip'])
  assert.equal(result.entry.dir, 'cisco/firmware')
})

test('custom locations cannot escape the webroot', () => {
  for (const dir of ['../../etc', '/etc/nginx', 'ok/../../..', 'a b', '']) {
    assert.equal(validateLibraryDir({ ...validDir, dir }).ok, false, `expected ${JSON.stringify(dir)} to be refused`)
  }
})

test('custom locations cannot shadow a built-in key', () => {
  const result = validateLibraryDir({ ...validDir, key: 'isos' })
  assert.equal(result.ok, false)
  assert.match(String(result.error), /built-in/)
})

test('web-executable extensions are refused however they are written', () => {
  for (const extension of ['php', '.PHP', 'html', 'svg', 'js', 'conf']) {
    const result = validateLibraryDir({ ...validDir, extensions: extension })
    assert.equal(result.ok, false, `expected .${extension} to be refused`)
    assert.match(String(result.error), /can't be allowed|isn't a valid/)
  }
})

test('installer script types stay allowed — nginx serves them as downloads', () => {
  assert.equal(validateLibraryDir({ ...validDir, extensions: 'sh, ps1, bat' }).ok, true)
})

test('a location needs a name, an id, and at least one extension', () => {
  assert.equal(validateLibraryDir({ ...validDir, label: '  ' }).ok, false)
  assert.equal(validateLibraryDir({ ...validDir, key: 'A_B' }).ok, false)
  assert.equal(validateLibraryDir({ ...validDir, extensions: '' }).ok, false)
})

test('duplicate ids are rejected against the existing list', () => {
  const result = validateLibraryDir(validDir, { existingKeys: new Set(['cisco-fw']) })
  assert.equal(result.ok, false)
  assert.match(String(result.error), /already uses/)
})
