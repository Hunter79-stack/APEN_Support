/**
 * build-favicon.mjs
 *
 * Generates the favicon set from public/favicon.png and writes:
 *   - app/favicon.ico         multi-resolution ICO (16/32/48), PNG-in-ICO
 *   - app/apple-icon.png      192×192 PNG used for the iOS home-screen icon
 *   - public/favicon-16.png   small PNG copies, handy if you ever
 *   - public/favicon-32.png   want to reference them explicitly from
 *   - public/favicon-192.png  metadata or HTML
 *
 * Both app/* outputs are picked up automatically by Next.js's App Router
 * file conventions — no metadata edits required after re-running.
 *
 * Run from anywhere:
 *   npm run favicons
 * (or: node scripts/build-favicon.mjs)
 *
 * To regenerate from a different source image, replace
 * public/logos/favicon/favicon.png with the new image. Best results
 * when the source is square and ≥ 192×192.
 *
 * Uses the project-local `sharp` install — no system packages or sudo.
 */
import sharp from 'sharp'
import { writeFileSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const SRC            = resolve(PROJECT_ROOT, 'public/logos/favicon/favicon.png')
const OUT_ICO        = resolve(PROJECT_ROOT, 'app/favicon.ico')
const OUT_APPLE_ICON = resolve(PROJECT_ROOT, 'app/apple-icon.png')
const OUT_192        = resolve(PROJECT_ROOT, 'public/favicon-192.png')
const OUT_32         = resolve(PROJECT_ROOT, 'public/favicon-32.png')
const OUT_16         = resolve(PROJECT_ROOT, 'public/favicon-16.png')

async function rasterize(size) {
  /* SRC is a 1024×1024 raster PNG. Just resize to the target size. */
  return await sharp(readFileSync(SRC))
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer()
}

function buildIcoPngIn([{ size: s16, buf: b16 }, { size: s32, buf: b32 }, { size: s48, buf: b48 }]) {
  // ICONDIR (6 bytes) + 3 × ICONDIRENTRY (16 bytes each) = 54 bytes header
  const headerSize = 6 + 16 * 3
  const dir = Buffer.alloc(6)
  dir.writeUInt16LE(0, 0)    // reserved
  dir.writeUInt16LE(1, 2)    // type 1 = icon
  dir.writeUInt16LE(3, 4)    // 3 images

  const entries = [
    { size: s16, buf: b16 },
    { size: s32, buf: b32 },
    { size: s48, buf: b48 },
  ]

  let offset = headerSize
  const entryBufs = entries.map(({ size, buf }) => {
    const e = Buffer.alloc(16)
    e.writeUInt8(size === 256 ? 0 : size, 0) // width (0 = 256)
    e.writeUInt8(size === 256 ? 0 : size, 1) // height
    e.writeUInt8(0, 2)  // color count
    e.writeUInt8(0, 3)  // reserved
    e.writeUInt16LE(1, 4) // planes (PNG: 1)
    e.writeUInt16LE(32, 6) // bit count
    e.writeUInt32LE(buf.length, 8) // image size
    e.writeUInt32LE(offset, 12) // image offset
    offset += buf.length
    return e
  })

  return Buffer.concat([dir, ...entryBufs, ...entries.map(({ buf }) => buf)])
}

const b16 = await rasterize(16)
const b32 = await rasterize(32)
const b48 = await rasterize(48)
writeFileSync(OUT_16, b16)
writeFileSync(OUT_32, b32)
const b192 = await rasterize(192)
writeFileSync(OUT_192, b192)
writeFileSync(OUT_APPLE_ICON, b192)

const ico = buildIcoPngIn([
  { size: 16, buf: b16 },
  { size: 32, buf: b32 },
  { size: 48, buf: b48 },
])
writeFileSync(OUT_ICO, ico)
console.log('Wrote:', OUT_ICO, '(', ico.length, 'bytes)')
console.log('Wrote:', OUT_16, '(', b16.length, 'bytes)')
console.log('Wrote:', OUT_32, '(', b32.length, 'bytes)')
console.log('Wrote:', OUT_192, '(rasterized 192px PNG)')
