/* Every download path in lib/data, resolved through the real modules, checked
 * against the webroot. Catches links the static HTML never renders because the
 * card that holds them is client-side. */
import { readdirSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import { pathToFileURL } from 'node:url'

const WEBROOT = '/var/www/html'
const OUT = '/var/www/apen_support_nextjs/out'
const DATA = '/var/www/apen_support_nextjs/lib/data'
const FILE_EXT = new Set(['.iso','.exe','.msi','.zip','.tar','.gz','.tgz','.bundle','.pdf','.appx','.msix','.msixbundle','.cab','.deb','.rpm','.run','.bin','.xml','.json','.mp4','.7z','.img','.ova','.txt','.ps1','.sh'])

const found = new Map() // path -> Set(module:export)

function walk(value, origin, seen = new Set()) {
  if (typeof value === 'string') {
    if (value.startsWith('/') && FILE_EXT.has(extname(value).toLowerCase())) {
      if (!found.has(value)) found.set(value, new Set())
      found.get(value).add(origin)
    }
    return
  }
  if (!value || typeof value !== 'object' || seen.has(value)) return
  seen.add(value)
  for (const child of Object.values(value)) walk(child, origin, seen)
}

for (const name of readdirSync(DATA).filter((f) => f.endsWith('.ts'))) {
  let mod
  try {
    mod = await import(pathToFileURL(join(DATA, name)).href)
  } catch (err) {
    console.log(`  (skipped ${name}: ${err.message.split('\n')[0]})`)
    continue
  }
  for (const [key, value] of Object.entries(mod)) walk(value, `${name}:${key}`)
}

const broken = []
for (const [path, origins] of found) {
  // Hrefs are URL-encoded (%20 for vendor filenames with spaces); the
  // filesystem check needs the decoded form.
  const decoded = decodeURIComponent(path)
  if (existsSync(join(OUT, decoded)) || existsSync(join(WEBROOT, decoded))) continue
  broken.push({ path, origins: [...origins] })
}
broken.sort((a, b) => a.path.localeCompare(b.path))
if (process.argv.includes('--json')) {
  // Machine mode for the publish flow: the proxy runs this after every build
  // and folds the verdict into the build status an admin sees.
  console.log(JSON.stringify({ checked: found.size, broken }))
} else {
  console.log(`\nchecked ${found.size} download paths from lib/data`)
  console.log(`BROKEN: ${broken.length}\n`)
  for (const b of broken) console.log(`${b.path}\n    ${b.origins.join(', ')}`)
}
