/**
 * proxy/http-body.mjs — the one request-body reader for the proxy processes.
 */
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import test from 'node:test'

import { readBody, readJsonBody } from '../proxy/http-body.mjs'

const request = (...chunks: Buffer[]) => Readable.from(chunks) as unknown as import('node:http').IncomingMessage

test('readBody decodes once, so a character split across chunks survives', async () => {
  const bytes = Buffer.from('{"name":"José — 강동윤"}', 'utf8')
  const cut = bytes.indexOf(0xc3) + 1 // inside the two-byte "é"
  assert.equal(await readBody(request(bytes.subarray(0, cut), bytes.subarray(cut)), 1000), bytes.toString('utf8'))
  assert.deepEqual(await readJsonBody(request(bytes.subarray(0, cut), bytes.subarray(cut)), 1000), { name: 'José — 강동윤' })
})

test('readBody enforces the cap with a 413 and readJsonBody reports bad JSON as 400', async () => {
  await assert.rejects(readBody(request(Buffer.alloc(600), Buffer.alloc(600)), 1000), { status: 413 })
  await assert.rejects(readJsonBody(request(Buffer.from('{"half":')), 1000), { status: 400 })
  assert.deepEqual(await readJsonBody(request(), 1000), {}, 'empty body parses as {}')
})
