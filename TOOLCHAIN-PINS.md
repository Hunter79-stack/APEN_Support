# Toolchain pins — why `typescript` and `eslint` are not on the newest major

Two dependencies are deliberately held one major behind "latest". Both were bumped to latest on
**2026-08-21 11:02** during ACAS remediation, and both broke the build. This file exists so the
next security-driven update does not repeat it.

## `typescript` — pinned to `^6.0.3` (not 7.x)

TypeScript 7 is the native (Go) port. Its npm package exports only `version` and
`versionMajorMinor` — **the JavaScript compiler API is gone**.

What broke on 7.0.2:

| Consumer | Needed | Result |
|---|---|---|
| `typescript-eslint@8.67.0` (latest, via `eslint-config-next`) | TS API | `typescript-eslint does not support TS 7.0` — peer range is `>=4.8.4 <6.1.0` |

`npm run lint` fails outright, so `npm run validate` fails — and **the admin Publish button runs
`npm run build`**, so a broken toolchain locks sysadmins out of publishing.

**Upgrade to 7.x only when `typescript-eslint` ships TS 7 support**
(https://github.com/typescript-eslint/typescript-eslint/issues/10940). Microsoft's own guidance is
to run the TS 6 API side by side until then. TS 6.0.3 is a current, supported release and audits
clean — it is not a stale package.

## `eslint` — pinned to `^9.39.5` (not 10.x)

ESLint 10 removed `context.getFilename()`. `eslint-plugin-react@7.37.5` (already the latest release,
pulled in by `eslint-config-next`) still calls it, and its peer range is `^3 || … || ^9.7`:

```
TypeError: Error while loading rule 'react/display-name':
           contextOrFilename.getFilename is not a function
```

Both 10.8.1 and 10.9.0 fail identically — this is not a patch-level issue. **Upgrade to 10.x only
once `eslint-plugin-react` declares ESLint 10 support.**

## What was rewritten rather than pinned

`scripts/typescript-test-loader.mjs` and `scripts/validate-image-registry.mjs` used to call the
TypeScript compiler API directly (`transpileModule`, `createSourceFile`). They now use **Babel 8**
(`@babel/core`, `@babel/parser`, `@babel/traverse` + the TS/JSX transform plugins), so they work on
any TypeScript version — including a future move to 7.x. Do not revert them to the TS API.

The image validator's two SELECTION rules were re-verified after the rewrite by planting deliberate
violations and confirming both still fire with correct line numbers. If you touch that file, do the
same — a validator that silently matches nothing still prints "Image registry OK".

## Context: the CVE that triggered all this

ACAS reported **CVE-2026-71871**. That is a code-execution flaw in **Orval** (an OpenAPI→TypeScript
client generator), fixed in Orval 8.21.0. It has nothing to do with the `typescript` package.

Orval is **not** a dependency of this project — not in `node_modules`, not in `package.json`, not
installed globally, and not found anywhere under `/var/www`, `/home`, `/opt`, `/usr/lib/node_modules`
or `/root`. This project was never exposed. `npm audit` reports **0 vulnerabilities**.

If ACAS still reports it against this host, the finding is coming from somewhere outside these
paths (another host in the report, a container image, or a cached artifact) — the fix there is
`orval >= 8.21.0`, not a TypeScript upgrade.
