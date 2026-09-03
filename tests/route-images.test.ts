import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import {
  DOCS_PAGE_LOGOS,
  DOWNLOADS_PAGE_LOGOS,
  LOGOS,
  PAGE_LOGOS,
} from '../lib/data/logos'
import {
  isSafeCustomRouteImageSource,
  normalizeRegisteredRoute,
  normalizeRouteImageRegistry,
  resolveRouteImage,
  resolveRouteImageReference,
} from '../lib/data/route-images'

test('docs and downloads resolve their source defaults from PAGE_LOGOS', () => {
  assert.equal(PAGE_LOGOS['/docs'], DOCS_PAGE_LOGOS['/docs'])
  assert.equal(PAGE_LOGOS['/downloads'], DOWNLOADS_PAGE_LOGOS['/downloads'])

  assert.equal(resolveRouteImage('/docs/', undefined, 'unused-fallback'), PAGE_LOGOS['/docs'])
  assert.equal(
    resolveRouteImage('/downloads/?view=all#recent', undefined, 'unused-fallback'),
    PAGE_LOGOS['/downloads'],
  )
})

test('catalog references resolve through their semantic LOGOS key', () => {
  const registry = {
    schemaVersion: 1,
    routes: {
      '/docs': { kind: 'catalog', key: 'ubuntu' },
    },
    assets: {},
  }

  assert.equal(resolveRouteImage('/docs', registry), LOGOS.ubuntu)
  assert.equal(resolveRouteImageReference({ kind: 'catalog', key: 'ubuntu' }, {}), LOGOS.ubuntu)
})

test('uploaded assets resolve only when the route points to a safe registered asset', () => {
  const uploadedSource = '/logos/no_backgrounds/admin/docs-20260714.png'
  const validRegistry = {
    schemaVersion: 1,
    routes: {
      '/docs': { kind: 'asset', id: 'docs-upload' },
    },
    assets: {
      'docs-upload': { src: uploadedSource, label: 'Updated docs artwork' },
    },
  }

  assert.equal(resolveRouteImage('/docs', validRegistry), uploadedSource)

  const missingAssetRegistry = {
    schemaVersion: 1,
    routes: {
      '/docs': { kind: 'asset', id: 'not-registered' },
    },
    assets: {},
  }
  assert.equal(resolveRouteImage('/docs', missingAssetRegistry), PAGE_LOGOS['/docs'])

  const externalAssetRegistry = {
    schemaVersion: 1,
    routes: {
      '/docs': { kind: 'asset', id: 'external' },
    },
    assets: {
      external: { src: 'https://example.test/logo.png', label: 'External artwork' },
    },
  }
  assert.equal(resolveRouteImage('/docs', externalAssetRegistry), PAGE_LOGOS['/docs'])
})

test('invalid routes and unsafe custom paths are rejected and use the caller fallback', () => {
  assert.equal(normalizeRegisteredRoute('/docs/'), '/docs')
  assert.equal(normalizeRegisteredRoute('/not-a-registered-page'), null)
  assert.equal(normalizeRegisteredRoute('//docs'), null)
  assert.equal(normalizeRegisteredRoute('https://example.test/docs'), null)
  assert.equal(normalizeRegisteredRoute('/docs/../../private'), null)

  assert.equal(isSafeCustomRouteImageSource('/logos/no_backgrounds/admin/valid.webp'), true)
  assert.equal(isSafeCustomRouteImageSource('https://example.test/logo.webp'), false)
  assert.equal(isSafeCustomRouteImageSource('//example.test/logo.webp'), false)
  assert.equal(isSafeCustomRouteImageSource('/logos/../private/logo.webp'), false)
  assert.equal(isSafeCustomRouteImageSource('/logos/%2e%2e/private/logo.webp'), false)

  assert.equal(
    resolveRouteImage('/docs/../../private', undefined, '/logos/fallback.svg'),
    '/logos/fallback.svg',
  )
})

test('registry normalization drops invalid assets, routes, and references', () => {
  const registry = normalizeRouteImageRegistry({
    schemaVersion: 99,
    routes: {
      '/docs': { kind: 'catalog', key: 'ubuntu' },
      '/downloads': { kind: 'catalog', key: 'notInTheCatalog' },
      '/docs/repos': { kind: 'asset', id: 'safe-upload' },
      '/docs/repos/deb': { kind: 'asset', id: 'missing-upload' },
      '/applications/color-picker': { kind: 'catalog', key: 'tenableIris' },
      '/not-a-registered-page': { kind: 'catalog', key: 'ubuntu' },
    },
    assets: {
      'safe-upload': {
        src: '/logos/no_backgrounds/admin/repository.png',
        label: '  Repository artwork  ',
      },
      external: {
        src: 'https://example.test/repository.png',
        label: 'External artwork',
      },
      traversal: {
        src: '/logos/no_backgrounds/../private.png',
        label: 'Traversal artwork',
      },
    },
  })

  assert.equal(registry.schemaVersion, 1)
  assert.deepEqual(Object.keys(registry.assets), ['safe-upload'])
  assert.equal(registry.assets['safe-upload']?.label, 'Repository artwork')
  assert.deepEqual(Object.keys(registry.routes).sort(), [
    '/applications/color-picker',
    '/docs',
    '/docs/repos',
  ])
  assert.deepEqual(registry.routes['/docs'], { kind: 'catalog', key: 'ubuntu' })
  assert.deepEqual(registry.routes['/docs/repos'], { kind: 'asset', id: 'safe-upload' })
  assert.deepEqual(registry.routes['/applications/color-picker'], {
    kind: 'catalog',
    key: 'tenableIris',
  })
})

test('runtime source retains the public live overlay poll and protected upload validation', () => {
  const adminContentSource = fs.readFileSync(path.join('lib', 'data', 'admin-content.ts'), 'utf8')
  const routeHookSource = fs.readFileSync(path.join('lib', 'hooks', 'useRouteImage.ts'), 'utf8')
  const proxySource = fs.readFileSync(path.join('proxy', 'site-stats.mjs'), 'utf8')

  assert.match(adminContentSource, /fetch\(API_ENDPOINTS\.contentOverrides,\s*\{\s*cache:\s*'no-store'\s*\}\)/)
  assert.match(adminContentSource, /window\.setInterval\([\s\S]*?RUNTIME_INTERVALS\.contentOverridesRefreshMs/)
  assert.match(adminContentSource, /export function useLiveContentOverrides\(\)/)
  assert.match(routeHookSource, /live !== null[\s\S]*?publishedContent\[ROUTE_IMAGE_OVERRIDE_SCOPE\]/)
  assert.match(routeHookSource, /resolveRouteImage\(route, scopeValue, fallback\)/)

  const publicReadStart = proxySource.indexOf("req.method === 'GET' && url === '/api/content-overrides'")
  assert.notEqual(publicReadStart, -1)
  const publicReadSource = proxySource.slice(publicReadStart, publicReadStart + 1_800)
  assert.match(publicReadSource, /publicOverrides/)
  assert.match(publicReadSource, /entry\.value/)
  assert.match(publicReadSource, /Cache-Control': 'no-store'/)

  const uploadStart = proxySource.indexOf("req.method === 'POST' && url === '/api/admin/logo-upload'")
  assert.notEqual(uploadStart, -1)
  const uploadSource = proxySource.slice(uploadStart, uploadStart + 3_200)
  assert.match(uploadSource, /authorizeAdmin\(req\)/)
  assert.match(uploadSource, /MAX_ADMIN_LOGO_BYTES/)
  assert.match(uploadSource, /detectAdminLogoType\(buffer\)/)
  assert.match(uploadSource, /storeAdminLogo\(buffer/)

  assert.match(proxySource, /function sanitizeRouteImageRegistry\(value\)/)
  assert.match(
    proxySource,
    /scope === ROUTE_IMAGE_OVERRIDE_SCOPE\s*\? sanitizeRouteImageRegistry\(data\.value\)\s*:\s*data\.value/,
  )
})
