import assert from 'node:assert/strict'
import test from 'node:test'

test('packInstallScript emits one winget install line per selected app', async () => {
  const mod = await import('../lib/data/winget-catalog')
  const packInstallScript = mod.packInstallScript as (pkgs: unknown[]) => string
  const installCommand = mod.installCommand as (pkg: unknown) => string
  const apps = [
    { packageIdentifier: 'Microsoft.PowerToys' },
    { packageIdentifier: 'Microsoft.WindowsTerminal' },
  ]
  const script = packInstallScript(apps)
  assert.ok(script.includes('2 Microsoft Store app(s)'))
  for (const app of apps) {
    assert.ok(script.includes(installCommand(app)))
  }
})
