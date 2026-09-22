/**
 * proxy/state-files.mjs — the one load/save path for every proxy state file.
 *
 *  - absent / empty file  -> fallback, nothing written
 *  - corrupt / wrong shape -> fallback AND the bad file is moved aside, never overwritten
 *  - saveJson              -> atomic, 0600, no temp file left behind
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { loadJson, saveJson, stateFileProblems } from '../proxy/state-files.mjs'

test('state files: bad data is quarantined, never overwritten; saves are atomic and 0600', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'state-files-'))
  try {
    const file = path.join(dir, 'store.json')
    assert.deepEqual(loadJson(file, ['default'], Array.isArray), ['default'], 'absent -> fallback')
    fs.writeFileSync(file, '')
    assert.deepEqual(loadJson(file, [], Array.isArray), [], 'empty -> fallback')
    assert.equal(stateFileProblems.length, 0)

    for (const bad of ['{"half": ', '{"an":"object"}']) {
      fs.writeFileSync(file, bad)
      assert.deepEqual(loadJson(file, [], Array.isArray), [])
      assert.equal(fs.existsSync(file), false, 'bad file moved out of the way')
      // quarantine and temp names end in .json so ignore globs on proxy/*.json keep covering them
      const aside = fs.readdirSync(dir).filter((f) => /^store\.json\.corrupt-\d+\.json$/.test(f))
      assert.ok(aside.some((f) => fs.readFileSync(path.join(dir, f), 'utf8') === bad), 'original bytes preserved')
    }
    assert.equal(stateFileProblems.length, 2)

    assert.equal(saveJson(file, [1, 2, 3]), true)
    assert.deepEqual(loadJson(file, [], Array.isArray), [1, 2, 3])
    assert.equal(fs.statSync(file).mode & 0o777, 0o600)
    assert.deepEqual(fs.readdirSync(dir).filter((f) => f.includes('.tmp-')), [])
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
