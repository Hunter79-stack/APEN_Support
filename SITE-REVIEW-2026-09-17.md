# APEN Support — Full Site Review

**Repository:** `/var/www/apen_support_nextjs` · **Commit:** `df7b285` (branch `main`, clean tree)
**Date:** 2026-09-17 · **Method:** static analysis by 31 finding agents and 231 adversarial verifiers · no runtime testing · no files changed

This review covers security, copyright and copied code, and code quality across the whole tracked tree. Every finding was produced against a cited file and line, then challenged by independent reviewers instructed to refute it. Findings that survived that challenge are listed first.

## Summary

| Outcome | Count | Meaning |
|---|---|---|
| Confirmed | 137 | Survived adversarial review. Act on these. |
| Contested | 7 | Reviewers disagreed. Judge each yourself. |
| Refuted | 44 | Wrong, already mitigated, or not protectable. Listed for the record. |
| Reported only | 124 | Low and informational. Not challenged, by design. |

Confirmed findings by category and severity:

| Category | High | Medium |
|---|---|---|
| Security | 21 | 39 |
| Copyright | 12 | 12 |
| Code quality | 17 | 36 |

## How to read this

Verification used two independent lenses on every high finding and one on every medium. Security findings were challenged on real exploitability and on mitigations the finder may have missed. Copyright findings were challenged on whether the material is genuinely third-party and on what the licence actually obliges. Quality findings were challenged on accuracy and on whether the change is worth making. Where a reviewer corrected a detail without overturning the finding, the correction appears under the finding.

Low and informational findings are listed at the end as a table. They were not verified, so treat them as leads.

---

## Confirmed — high severity

### 1. 24 vendor FacilitatePro training videos rehosted and streamed with no licence or attribution

**Copyright · high** · `app/videos/facpro/page.tsx:13`

```
// The real FacilitatePro video library staged at /videos/facpro/ — 24 videos
// across 4 series, matching the legacy site's titles, ordering, and durations.
{ id: 'leader-1', series: 'Leader Guide Tutorial Series', title: 'Getting Started',                file: 'leader_guide_tutorial_series1.mp4', duration: '4:27' },
```

**What it is.** The page streams 24 MP4 tutorial videos from ${URLS.videosFacpro} = https://apensupport.blcse.mil/videos/facpro (lib/data/constants.ts:85). I confirmed the files are physically staged on this production host at /var/www/html/videos/facpro/ (classic_training_videos1..10.mp4, facpro_overview1..5.mp4, leader_guide_tutorial_series1..7.mp4, how_to_videos1..2.mp4). The series names — "Leader Guide Tutorial Series", "FacilitatePro Overviews", "Classic Training Videos" — and per-title breakdown (Overview / Basic / Plus / Premium / Professional Level, tracking the vendor's licence tiers) identify these as Facilitate.com's own product training library, not APEN-produced material. Nothing in app/videos/facpro/page.tsx or the parent /videos page carries a copyright notice, licence statement, or "used with permission" line, and the `<video>` element at line 75 plus the fallback link at line 85 both offer the file for direct download.

**Impact.** Whole audiovisual works owned by a commercial vendor are being redistributed and offered for download to every user who can reach the site. Audiovisual works attract the strongest statutory damages, and a per-video claim across 24 files is materially larger exposure than the text findings. Also directly contrary to the site's own AR 25-1 Terms of Use.

**Fix.** Confirm with the CESC FacilitatePro contract owner whether the licence/maintenance agreement grants the right to host the vendor's training videos on an internal server. If it does, record the clause and add a visible "© Facilitate.com — hosted under the APEN FacilitatePro licence" notice on /videos/facpro. If it does not, pull the files from /var/www/html/videos/facpro/ and remove the page.

> **provenance review — upheld** (high confidence). Evidence confirms verbatim. app/videos/facpro/page.tsx:13-14 carries the quoted comment; line 17 is the quoted `leader-1` entry; the array (lines 16-46) holds exactly 24 entries across the 4 named series; line 79 `<source src={`${BASE}/${activeVideo.file}`}` and line 85 `Click here to download.` expose the raw MP4. BASE = lib/data/constants.ts:85 `videosFacpro: `${APENSUPPORT_BASE}/videos/facpro``. All 24 MP4s are on disk at /var/www/html/videos/facpro/ (uniform mtime Nov 29 2023), reached via the legacy fallback nginx/server.conf:762-766 (`root /var/www/html`). Provenance is positively established, not inferred: the legacy page this one replaced, /var/www/html/videos/facpro/index.html:58, reads "The videos provided were created by the developers of FacilitatePro." These are vendor audiovisual works, not generic/factual material, so the provenance lens does not refute. grep across app/videos/, app/docs/facpro/, Footer and README finds no copyright/licence/permission notice. Two corrections: the MP4s live outside the audited git tree, and every location inherits `auth_request /internal/authcheck` (nginx/server.conf:194) with no exemption on @legacy_files, so the audience is authenticated enclave users, not "every user".
>
> *Correction:* Accurate on the facts, overstated on impact. app/videos/facpro/page.tsx (lines 13-46, player at 75-88) indexes and streams 24 vendor-authored FacilitatePro tutorial MP4s that are staged outside the repo at /var/www/html/videos/facpro/ and served through the legacy-webroot fallback (nginx/server.conf:762). Origin is settled by the site's own predecessor page, /var/www/html/videos/facpro/index.html:58 ("The videos provided were created by the developers of FacilitatePro."), and the Next.js rewrite dropped that single attribution sentence — so the concrete, verified defect is an attribution regression plus no permission of record, against an obligation the site itself declares at components/legal/Terms.tsx:26 (AR 25-1: no posting of copyrighted material without the holder's permission). The per-video statutory-damages framing and "every user who can reach the site" do not hold: the whole vhost is session-gated by `auth_request /internal/authcheck` (nginx/server.conf:194) with no exemption for @legacy_files, so this is internal distribution to authenticated enclave users, the normal audience for vendor product training under an existing FacilitatePro licence/maintenance agreement, and nothing in code shows whether permission exists either way. Remedy: restore a visible "created by the developers of FacilitatePro / © Facilitate.com" line on /videos/facpro and record the licence clause with the CESC contract owner; pulling the files is warranted only if the contract turns out not to cover internal hosting.

> **obligation review — upheld** (high confidence). Evidence confirmed verbatim. app/videos/facpro/page.tsx:13-14 "// The real FacilitatePro video library staged at /videos/facpro/ — 24 videos"; the 24 entries run to line 42; BASE = URLS.videosFacpro at line 9, defined lib/data/constants.ts:85. Player at page.tsx:80 plus download fallback at :85. 24 .mp4 files exist under /var/www/html/videos/facpro/ and nginx serves that tree (nginx/server.conf:763 "root /var/www/html;"). I grepped the whole app/, components/, lib/ tree and out/videos/facpro/index.html: no copyright, "used with permission", licence or attribution string anywhere. NOTICE (repo root) covers system ownership only, no third-party material. The site's own Terms quotes AR 25-1 at components/legal/Terms.tsx:26.

Two corrections. (1) Attribution is not the obligation: a "© Facilitate.com" line neither cures unauthorised hosting nor is required if hosting is licensed. The only real obligation is permission, which is contractual and not determinable from the repo. (2) Impact is overstated: US-government copyright liability runs under 28 U.S.C. §1498(b) (reasonable compensation), not per-work statutory damages, and the host is an internal .mil vhost (server.conf:117), not public.
>
> *Correction:* The page at app/videos/facpro/page.tsx:13-42 does rehost 24 vendor FacilitatePro tutorial MP4s (confirmed staged under /var/www/html/videos/facpro/ and served via nginx/server.conf:763), and no copyright, licence or permission statement exists anywhere in the repo or the built out/videos/facpro/index.html — the root NOTICE covers system ownership only. What this establishes is an undocumented-permission gap, not a proven infringement: the site's own Terms (components/legal/Terms.tsx:26) quote AR 25-1's rule that copyrighted material may not be posted on an Army website without the holder's permission, and nothing in the repo records that permission. Adding an attribution line is not the remedy and would not cure an unlicensed use; the action item is to obtain and file the licence/maintenance clause (or pull the files). Exposure is also narrower than reported: the vhost is internal .mil (server.conf:117) and copyright claims against the Government run under 28 U.S.C. §1498(b) reasonable compensation, not per-work statutory damages. Medium, not high.

---

### 2. Site violates its own published Copyright Policy - no permission record for any third-party asset

**Copyright · high** · `components/legal/Terms.tsx:26`

```
"Army Regulation 25-1 prohibits the posting of documents or information protected by a copyright on Army websites without the permission of the copyright holder."
```

**What it is.** The public Terms of Use page (/terms) states Army policy at lines 23-26 and quotes the AR 25-1 prohibition verbatim. Against that, the repository ships 213 image files under public/logos plus four OFL fonts and a vendored MIT library, and contains zero permission, license or attribution records: grep -rl 'SIL Open Font License|Permission is hereby granted' outside node_modules/out returns nothing, and git ls-files finds no LICENSE, OFL, CREDITS or ATTRIBUTION file.

**Impact.** The site publicly asserts a compliance posture it does not meet. In an IG, ISSO or vendor-counsel review the Terms page becomes the evidence that the operators knew the rule, which removes any inadvertence defense.

**Fix.** Stand up an /attribution (or /notices) page listing every third-party asset class with its owner and basis of use, link it from the footer, and file the AR 25-1 permission determinations for the vendor artwork that needs one.

> **provenance review — upheld** (high confidence). Evidence verified. components/legal/Terms.tsx:26 quotes the AR 25-1 sentence verbatim (grep -n confirms line 26), under the heading "Copyright Policy (AR 25-1 & 27-60)" at line 22. Third-party material is genuinely third-party and the named origins/licenses are correct: public/vendor/lottie_light.min.js is the lottie-web light UMD build (header `(t="undefined"!=typeof globalThis?globalThis:t||self).lottie=e()`), which is MIT, and `grep -c "MIT\|license\|Copyright"` on it returns 0 — the required MIT copyright notice was stripped. public/fonts/*.woff2 are real WOFF2 TrueType files for Inter and JetBrains Mono, both genuinely OFL-1.1. public/logos/products contains vendor artwork (microsoft-brand-logo.jpg, trellix-logo.png, vmware-long.png, tenable.sc.webp). No /attribution or /credits route exists in git ls-files app. Two inaccuracies: a root NOTICE file does exist (36 lines) — it is an ownership/CM record with no third-party section, so the conclusion survives but the stated "git ls-files finds no ... file" is wrong; and public/logos holds 212 images plus one .json, not 213 images.
>
> *Correction:* The core is confirmed but the framing is overstated. Confirmed and concrete: public/vendor/lottie_light.min.js is a vendored lottie-web light build whose MIT copyright/permission banner has been stripped (zero matches for MIT/license/Copyright in 168KB), which is a direct breach of the MIT license's notice-retention clause; the four public/fonts/*.woff2 files are real Inter and JetBrains Mono WOFF2s under SIL OFL-1.1 with no OFL copy or reserved-font-name notice anywhere in the tree; and public/logos ships 212 images including vendor artwork (microsoft-brand-logo.jpg, trellix-logo.png, vmware-long.png, tenable.sc.webp, Ubuntu mascots, Tux) with no attribution record and no /attribution route. Overstated: a root NOTICE file does exist (it is an ownership/CM-provenance record only, no third-party section), so the claim that no such file is tracked is wrong; and "no permission record for ANY third-party asset" sweeps in vendor logos used to identify the products the site supports, which is ordinary nominative use and is not what the AR 25-1 sentence at Terms.tsx:26 prohibits. The defensible defect is the stripped MIT notice plus missing OFL acknowledgement, not a blanket AR 25-1 violation, so medium rather than high.

> **obligation review — upheld** (high confidence). Evidence at components/legal/Terms.tsx:26 is verbatim correct ("Army Regulation 25-1 prohibits the posting of documents or information protected by a copyright on Army websites without the permission of the copyright holder."), inside the "Copyright Policy (AR 25-1 & 27-60)" heading at line 22. The absence claim largely holds: grep for 'SIL Open Font License|Permission is hereby granted' outside node_modules/out hits only the reviewer's own SITE-REVIEW-2026-09-17.md; app/globals.css:21-45 serves four self-hosted woff2 (Inter, JetBrains Mono, both OFL-1.1) with no OFL.txt anywhere, and out/fonts/ ships them the same way; public/vendor/lottie_light.min.js:1 begins '"undefined"!=typeof navigator&&function(t,e){' with the MIT header stripped. Corrections: a root NOTICE file DOES exist (NOTICE:1-11, ownership/provenance only, zero third-party attribution), and the logo count is 210, not 213. What refutes the framing is the obligation itself: AR 25-1's quoted line governs posting copyrighted documents/information, not nominative use of vendor marks (public/logos/real: cisco.svg, microsoft.svg, debian-linux.svg) identifying products the site supports; no rule requires a public /attribution page or filed permission determinations for those. The real, narrow, unmet obligations are the OFL-1.1 and MIT notice-preservation terms.
>
> *Correction:* The quoted AR 25-1 text at components/legal/Terms.tsx:26 is accurate and the repo does ship third-party material with no license notices, but the finding overstates both the scope and the obligation. What is actually required and missing is narrow notice preservation: the four self-hosted OFL-1.1 fonts declared at app/globals.css:21-45 (Inter, JetBrains Mono) are redistributed in out/fonts/ without the required OFL license text, and public/vendor/lottie_light.min.js:1 is a minified MIT library whose copyright/permission header has been stripped. Both are fixed by dropping two small text files (public/fonts/OFL.txt, a LICENSE header or sibling file for lottie) into the shipped tree. The broader claim — that every one of the 210 (not 213) images under public/logos needs a filed AR 25-1 permission record and a public attribution page — is not supported: AR 25-1's prohibition addresses posting copyrighted documents and information, while items like public/logos/real/cisco.svg, microsoft.svg and debian-linux.svg are vendor marks used referentially to identify supported products, which is ordinary nominative use and requires no published permission record. The repo also is not entirely bare of provenance: a root NOTICE file records owning organization, source of record and CM baseline, though it carries no third-party attribution. Severity is low — a housekeeping license-notice gap, not a compliance posture the site falsely advertises.

---

### 3. components/ui/button.tsx is a verbatim shadcn/ui Button with only the variant color strings changed

**Copyright · high** · `components/ui/button.tsx:6`

```
const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 disabled:pointer-events-none disabled:opacity-50',
```

**What it is.** Every structural element matches shadcn/ui's button.tsx (MIT, Copyright (c) 2023 shadcn) line for line: the `cva` base string (only `ring-ring` swapped for `ring-cyan-400/50`), the identical six variant keys `default | destructive | outline | secondary | ghost | link`, the identical four size keys with shadcn's exact measurements `h-10 px-4 py-2` / `rounded-md px-3 text-xs` / `h-11 rounded-md px-8` / `icon: h-10 w-10` (line 19-22), the `ButtonProps extends React.ButtonHTMLAttributes<...>, VariantProps<typeof buttonVariants>` interface with `asChild?: boolean` (line 29-33), the `const Comp = asChild ? Slot : 'button'` idiom (line 37), and the `export { Button, buttonVariants }` tail (line 48). Only the Tailwind color tokens differ. package.json:27-31 confirms the exact shadcn dependency set (@radix-ui/react-slot, class-variance-authority, clsx, tailwind-merge). No attribution exists anywhere in the repo.

**Impact.** Substantial verbatim copy of MIT-licensed source with the required copyright notice absent. Under shadcn/ui's license the notice must accompany the copy; the repo instead declares itself "license": "UNLICENSED" (package.json:6), asserting proprietary status over code it does not own.

**Fix.** Add a THIRD-PARTY-NOTICES file (or a NOTICE section) carrying shadcn/ui's MIT text and copyright line, and add a one-line header comment to button.tsx, card.tsx and dropdown-menu.tsx naming shadcn/ui as the origin. No code change is needed — only the notice.

> **provenance review — upheld** (high confidence). Evidence at components/ui/button.tsx:6-7 quotes verbatim. Origin is real: I fetched shadcn-ui@0.5.0 apps/www/registry/default/ui/button.tsx — the ButtonProps interface (button.tsx:29-33), the forwardRef body with `const Comp = asChild ? Slot : 'button'` (button.tsx:35-46), and three size strings (`h-10 px-4 py-2`, `h-11 rounded-md px-8`, `h-10 w-10`, lines 19,21,22) match character-for-character. LICENSE.md confirms MIT, "Copyright (c) 2023 shadcn". So provenance and license are correctly named — not refutable.

But "verbatim" is overstated and two specifics are false. Upstream's base string also contains `ring-offset-background` and `focus-visible:ring-offset-2`, both absent at line 7 — not just a `ring-ring` swap. Upstream sm is `h-9 rounded-md px-3`; line 20 is `h-8 rounded-md px-3 text-xs` — the finding wrongly calls `text-xs` "shadcn's exact measurements". All six variant values (lines 11-16) are rewritten.

Also inaccurate: a NOTICE file exists at repo root (36 lines, committed c1e6b03) — it carries no third-party attribution, so the gap is real, but "no attribution exists anywhere" mis-describes the repo.

What remains identical is thin functional scaffold: cva/Radix Slot plumbing and Tailwind measurements.
>
> *Correction:* components/ui/button.tsx is derived from shadcn/ui's Button template (MIT, Copyright (c) 2023 shadcn) — confirmed against shadcn-ui@0.5.0 — but it is not a verbatim copy. What survives unchanged is thin, largely functional scaffold: the 5-line `ButtonProps` interface (lines 29-33), the ~10-line forwardRef/`asChild ? Slot : 'button'` body (lines 35-46), the six variant key names, and three Tailwind size strings (lines 19, 21, 22). The expressive layer was replaced: all six variant color strings (lines 11-16) are rewritten, the `sm` size differs from upstream (`h-8 ... text-xs` vs shadcn's `h-9 rounded-md px-3`, line 20), and the base string at line 7 drops shadcn's `ring-offset-background` and `focus-visible:ring-offset-2` in addition to swapping `ring-ring`. The finder's claims that only the `ring-ring` token changed and that line 20 carries "shadcn's exact measurements" are both wrong. Separately, the repo does have a NOTICE file (root, 36 lines, committed c1e6b03), but it is an ownership/provenance record with no third-party attribution section, so no shadcn/ui notice exists. Net: a real but low-severity housekeeping gap — add shadcn/ui's MIT line to the existing NOTICE (also covering card.tsx and dropdown-menu.tsx, which follow the same scaffold). Not a "substantial verbatim copy," and "UNLICENSED" in package.json:6 does not amount to asserting ownership over meaningful third-party expression here.

> **obligation review — upheld** (high confidence). Quoted evidence confirmed verbatim at components/ui/button.tsx:6-7. The shadcn skeleton is genuinely present: ButtonProps (29-33), `const Comp = asChild ? Slot : 'button'` (37), `export { Button, buttonVariants }` (48). Attribution is genuinely absent: `git grep -in shadcn` (excluding SITE-REVIEW) returns nothing; `git ls-files | grep -iE 'licen|notice|credit|attribut|third'` yields only NOTICE, whose 36 lines are an ownership/ATO/deploy-provenance record naming no third party; package.json:6 is `"license": "UNLICENSED"`. So the MIT notice obligation is real and unmet. But two specifics are wrong. (1) "only `ring-ring` swapped": line 7 also drops upstream's `ring-offset-background` and `focus-visible:ring-offset-2`. (2) "identical four size keys with shadcn's exact measurements": line 20 is `sm: 'h-8 rounded-md px-3 text-xs'` — upstream is `h-9 rounded-md px-3`; the finder quoted the size string with the height elided. (3) The cited package.json:27-31 does not span the set claimed — slot/cva/clsx are 29-31, tailwind-merge is 38. Severity "high" is unsupported for ~15 lines of conventional cva+Slot boilerplate from a copy-into-your-repo project, on a login-gated enclave site.
>
> *Correction:* components/ui/button.tsx is derived from shadcn/ui's forwardRef-era Button (MIT, Copyright (c) 2023 shadcn) and carries no attribution, while package.json:6 declares the project "UNLICENSED" — the MIT notice condition is unmet and the root NOTICE (36 lines, system ownership and deploy provenance only) does not cure it. "Verbatim with only the variant color strings changed" overstates it: the cva base at line 7 drops upstream's `ring-offset-background` and `focus-visible:ring-offset-2` in addition to swapping `ring-ring`, and the `sm` size at line 20 is `h-8 rounded-md px-3 text-xs` against upstream's `h-9 rounded-md px-3`; all six variant class strings are fully rethemed. What is actually identical is the six variant keys, three size strings (`h-10 px-4 py-2`, `h-11 rounded-md px-8`, `h-10 w-10`), and ~15 lines of conventional cva + forwardRef + Radix `Slot` boilerplate that cva's and Radix's own docs demonstrate — thin expression whose status as a "substantial portion" under MIT is arguable. Given shadcn/ui's explicit copy-into-your-repo distribution model (the CLI writes the file with no header) and a login-gated internal Army site, this is a low-severity housekeeping gap. Fix is one NOTICE entry naming shadcn/ui and its MIT terms, shared with card.tsx and dropdown-menu.tsx. Also note the finder's package.json:27-31 citation is off: react-slot/cva/clsx are lines 29-31 and tailwind-merge is line 38.

---

### 4. components/ui/dropdown-menu.tsx is a near-complete verbatim copy of shadcn/ui's dropdown-menu

**Copyright · high** · `components/ui/dropdown-menu.tsx:60`

```
'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
```

**What it is.** All 154 lines reproduce shadcn/ui's dropdown-menu.tsx (MIT, Copyright (c) 2023 shadcn): the same 14 exported names, the same primitive re-export block (lines 8-13), the `displayName = DropdownMenuPrimitive.X.displayName` idiom on every wrapper, the identical item class string 'relative flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors' (line 78), the identical indicator span 'absolute left-2 flex h-3.5 w-3.5 items-center justify-center' (lines 96, 115), and the exact animation class strings quoted above. The strongest copy fingerprint is those animation classes — see the separate quality finding: they are inert here because the plugin that defines them was never installed, proving they were carried over from upstream rather than written for this codebase.

**Impact.** The largest single verbatim third-party copy in components/ui/. MIT's notice condition is unmet, and the repo asserts UNLICENSED over it.

**Fix.** Cover it in the same THIRD-PARTY-NOTICES entry as button.tsx and card.tsx, with a header comment naming shadcn/ui and the upstream commit or version the file was taken from.

> **provenance review — upheld** (high confidence). Provenance confirmed. The upstream new-york registry (ui.shadcn.com/r/styles/new-york/dropdown-menu.json) matches components/ui/dropdown-menu.tsx on non-generic points: the indicator span "absolute left-2 flex h-3.5 w-3.5 items-center justify-center" is byte-identical (lines 96, 115); the line-60 animation string is byte-identical to upstream's SubContent string; the icon trio CheckIcon/ChevronRightIcon/DotFilledIcon from @radix-ui/react-icons (line 6) is the new-york variant's exact choice; the 14 exports (lines 149-154) appear in upstream's unusual order. License named correctly: MIT, Copyright (c) 2023 shadcn. No attribution exists (grep for "shadcn" across the repo: zero hits) and package.json:6 is "license": "UNLICENSED". The inertness sub-claim holds: no tailwindcss-animate/tw-animate-css in node_modules, no @plugin in app/globals.css.

But the finding overstates. "Near-complete verbatim copy"/"all 154 lines" is wrong: every color token is rethemed (white/5, slate-200, inline rgba+backdropFilter at lines 44/64 — not upstream), rounded-sm→rounded-md, min-w-[8rem]→min-w-40, shadow-md→shadow-card, Label/Separator restyled, DropdownMenuShortcut dropped (upstream exports 15). Line 78 is NOT "identical" (rounded-md vs upstream rounded-sm, and upstream continues with focus/svg classes). Line 61 keeps 2 of upstream's 4 side classes.
>
> *Correction:* components/ui/dropdown-menu.tsx is an unattributed derivative of shadcn/ui's new-york-style dropdown-menu (MIT, Copyright (c) 2023 shadcn), not a near-complete verbatim copy. The structure and several class strings are carried over verbatim — the ItemIndicator span "absolute left-2 flex h-3.5 w-3.5 items-center justify-center" (lines 96 and 115), the animation string at line 60, the @radix-ui/react-icons CheckIcon/ChevronRightIcon/DotFilledIcon trio (line 6) that is specific to the new-york variant, the inset-prop convention, and the 14 exports in upstream's order (lines 149-154). However the file was substantively rethemed: all color tokens replaced (white/5, slate-200/500), inline rgba background plus backdropFilter at lines 44 and 64 that has no upstream counterpart, rounded-sm→rounded-md, min-w-[8rem]→min-w-40, shadow-md→shadow-card, Label and Separator restyled, DropdownMenuShortcut removed (upstream exports 15, this file 14), and line 61 keeps only 2 of upstream's 4 side-slide classes. Line 78 is therefore near-identical, not identical. The compliance gap is real and verified — no THIRD-PARTY-NOTICES file, no mention of shadcn anywhere in the repo, and package.json line 6 declares "license": "UNLICENSED" — as is the supporting observation that the animate-in/fade-in-0/zoom-in-95 utilities are inert (no tailwindcss-animate or tw-animate-css in node_modules, no @plugin in app/globals.css). Severity lowered to medium: the source .tsx is not redistributed (nginx serves the static export of an internal site), and the fix is the same one-line notice already recommended for button.tsx and card.tsx.

> **obligation review — upheld** (high confidence). Evidence confirmed verbatim. components/ui/dropdown-menu.tsx:60-61 match the quoted animation strings character-for-character; :78 has the item class through `transition-colors`; :96 and :115 both have `absolute left-2 flex h-3.5 w-3.5 items-center justify-center`; :8-13 are the primitive re-export block; every wrapper carries `displayName = DropdownMenuPrimitive.X.displayName` (e.g. :31, :144). The shadcn/ui new-york origin is real. The obligation is also genuinely unmet: `git ls-files | grep -iE 'licen|notice|third.?party'` returns only NOTICE and an unrelated component; NOTICE (36 lines) is an ownership/deploy-provenance record with no third-party section; `grep -rin shadcn` over the repo returns zero hits; package.json:6 is `"license": "UNLICENSED"`; no file in components/ui/ has an origin header. So I cannot refute. But severity is wrong on two counts. (1) "All 154 lines" is false: :78 uses `rounded-md` where upstream uses `rounded-sm`, `min-w-40`/`border-white/10`/`shadow-card`/`text-slate-200` replace upstream tokens (:40, :59), inline glass styles at :44/:64 have no upstream counterpart, and upstream's `DropdownMenuShortcut` is absent from the export list (:149-153). (2) The MIT notice condition is a one-line fix on an ACL-gated internal Army site, over a project whose distribution model is copy-into-your-repo.
>
> *Correction:* components/ui/dropdown-menu.tsx is structurally derived from shadcn/ui's new-york dropdown-menu (MIT, Copyright (c) 2023 shadcn), and the repo ships it with no attribution of any kind: no origin header (the file opens at :1 with bare `'use client'`), zero `shadcn` hits repo-wide, no THIRD-PARTY-NOTICES in `git ls-files`, a root NOTICE that covers only system ownership and deploy provenance, and package.json:6 asserting `"license": "UNLICENSED"`. The strongest provenance markers are verbatim: the animation strings at :60-61, the indicator spans at :96 and :115, the item class through `transition-colors` at :78, the primitive re-export block at :8-13, and the Radix icon trio (CheckIcon/ChevronRightIcon/DotFilledIcon) at :6 that only the pre-lucide shadcn file used. The inert-animation corroboration also holds: no tailwindcss-animate or tw-animate-css in package.json or node_modules and no plugin line in tailwind.config.js, so `animate-in`/`zoom-in-95` resolve to nothing. However "near-complete verbatim copy" of all 154 lines overstates it — every design token was replaced (`rounded-md` for `rounded-sm` at :78, `min-w-40`/`border-white/10`/`shadow-card`/`text-slate-200` at :40 and :59, `bg-white/10` at :143, `text-xs font-medium text-slate-500` at :131), inline `rgba(7,12,28,0.95)` + backdropFilter glass was added at :44 and :64, slide-in is kept for only two of four sides, and `DropdownMenuShortcut` was dropped (:149-153); the remaining forwardRef/ElementRef/displayName scaffolding is conventional Radix-wrapper boilerplate. The obligation is real but minor: one NOTICE entry naming shadcn/ui and its MIT terms, shared with button.tsx, card.tsx and lib/data/utils.ts, plus an optional header comment. Not a high-severity copyright exposure on an internal, ACL-gated, non-public site.

---

### 5. exports/tenable-iris packages lottie-web and the Tenable mark for redistribution to third parties

**Copyright · high** · `exports/tenable-iris/README.md:21`

```
| `lottie_light.min.js`     | Self-hosted Lottie SVG player                                |
```

**What it is.** exports/tenable-iris/ is a handoff bundle containing a second copy of the unattributed lottie_light.min.js (byte-identical, 168236 bytes), tenable-iris.json, two AVIF renders of the Tenable mark, demo.html and LottieMark.tsx. README.md lines 47-73 instruct recipients to "Copy `tenable-iris.json` and `lottie_light.min.js` into the site" and to copy the player to /vendor/. There is no LICENSE file in the directory and no attribution section in the README.

**Impact.** The repository actively propagates both defects - MIT code with the notice stripped and vendor brand artwork with no permission record - to whatever downstream site receives the bundle, multiplying the exposure beyond this host.

**Fix.** Add LICENSE files for lottie-web (MIT) and a provenance/permission statement for the Tenable artwork to exports/tenable-iris/, or remove the directory from the repo if the handoff is complete.

> **provenance review — upheld** (high confidence). Evidence verified verbatim. exports/tenable-iris/README.md:21 is exactly "| `lottie_light.min.js`     | Self-hosted Lottie SVG player                                |"; :49 "Copy `tenable-iris.json` and `lottie_light.min.js` into the site"; :71-73 direct the player to public/vendor/. `ls` confirms 7 files, no LICENSE. Provenance checks out: the file contains the "bodymovin" string and version 5.12.2, and md5 9f45bc11… is byte-identical (168236 B) to public/vendor/lottie_light.min.js and out/vendor/lottie_light.min.js — genuine lottie-web, which is MIT. exports/tenable-iris/tenable-iris.json:1 carries "nm": "Tenanble_Iris_Lottie_White", i.e. real Tenable brand artwork, not a generic shape. Two corrections. (1) "notice stripped" is wrong: lottie-web's own published minified player carries no license banner, so nothing was removed here (I could not WebFetch upstream to confirm on this host). (2) Severity: this is a byte-duplicate of the live-served copy at public/vendor/lottie_light.min.js; the export adds no new artifact and the Tenable mark already ships from public/logos/products/. Root NOTICE (repo root) is an ownership record only and names no third-party licenses.
>
> *Correction:* exports/tenable-iris/ does bundle lottie-web 5.12.2 (README.md:21, byte-identical md5 9f45bc11… to public/vendor/lottie_light.min.js) plus Tenable brand artwork (tenable-iris.json "nm": "Tenanble_Iris_Lottie_White" and two AVIF renders) with no LICENSE file and no attribution section, and README.md:49 and :71-73 instruct recipients to copy those files into another site. However, the MIT notice was not "stripped" — lottie-web's published minified player ships with no license banner — the omission is simply that no MIT license text accompanies the redistribution, which is a routine, easily cured attribution gap. The export is also a byte-for-byte duplicate of the copy already served live from public/vendor/ and of the Tenable art already in public/logos/products/, so it is the same underlying defect counted twice rather than a distinct high-severity exposure; the repo-root NOTICE covers system ownership only and names no third-party licenses. Fix once by adding a third-party license/attribution record covering both the live copy and the export.

> **obligation review — upheld** (high confidence). Evidence confirmed exactly. `exports/tenable-iris/README.md:21` reads verbatim "| `lottie_light.min.js`     | Self-hosted Lottie SVG player                                |". `ls` of the directory shows no LICENSE/NOTICE and README has no attribution section. README:49 ("Copy `tenable-iris.json` and `lottie_light.min.js` into the site") and README:71-73 ("`lottie_light.min.js` (to `public/vendor/` ...)") confirm handoff intent. The bundle is byte-identical to the served copy: sha256 23cd2c01... for all of exports/tenable-iris/, public/vendor/ and out/vendor/lottie_light.min.js, and `grep -c 'Permission is hereby granted'` returns 0, so the MIT notice is genuinely absent. Root `NOTICE:1-36` is an ownership/ATO record ("Owning organization : Futures and Concepts Center") with zero third-party license content, and lottie-web is not an npm dep, so no node_modules LICENSE ships either. The obligation is real but minor: exports/ is absent from out/ and from make-airgap-bundle.sh, so it is not served or distributed today, and the identical Tenable artwork is already live at out/logos/products/tenable-iris.json — exports/ adds no new trademark exposure.
>
> *Correction:* The factual core is accurate: exports/tenable-iris/ contains a byte-identical copy of the notice-stripped lottie_light.min.js (sha256 23cd2c01…, 168236 bytes, no "Permission is hereby granted" string) plus Tenable iris renders, with no LICENSE file and no attribution in README.md, and README.md:49 and :71-73 instruct a recipient to copy the player and JSON into another site. The root NOTICE file covers system ownership only and does not discharge any third-party license obligation. However the severity is overstated. The exports/ directory is not in out/, is not referenced by siteupdate.sh or scripts/make-airgap-bundle.sh, and is therefore not served or shipped — "multiplying the exposure beyond this host" is speculative, with no evidence in the repo that the handoff bundle was transmitted. The Tenable half is weaker still: trademark law imposes no "permission record" requirement, nominative use to identify Tenable Security Center on a product support page is the normal posture, and the identical artwork is already live at out/logos/products/tenable-iris.json and out/logos/restricted/, so exports/ creates nothing new. The one real, actionable obligation is MIT notice preservation for lottie-web, and it bites hardest on the copy actually served to visitors (out/vendor/lottie_light.min.js), not on this staging directory — fix it once at public/vendor/ with a sibling LICENSE and mirror it into exports/, or delete exports/ if the handoff is done.

---

### 6. Proprietary FacilitatePro vendor FAQ content reproduced without attribution or permission

**Copyright · high** · `lib/data/docs.ts:269`

```
// ── Vendor product FAQs — compiled from facilitate.pro ──
```

**What it is.** Twelve FAQ entries (ids `vendor-*`, lib/data/docs.ts:270-365) are, by the code's own comment, "compiled from facilitate.pro" — the commercial vendor site for FacilitatePro (Facilitate.com Inc., proprietary/all rights reserved). The questions are near-verbatim restatements of the vendor's published FAQ headings ("How is FacilitatePro different from other web conferencing tools?", "Does the software require you to download plug-ins or run Flash?", "How can I calculate the return on investment of purchasing?", "I want to hold a large meeting for 200+ participants"), and the answers carry the vendor's own distinctive marketing analogies and claims — line 298: "Think of FacilitatePro as a virtual multi-story building where each User Group is a separate floor with its own conference rooms"; line 282: "supports unlimited concurrent participants and unlimited concurrent sessions for one price"; line 322: "It has succeeded with groups of 200 to 700 and more". No attribution, source link, licence notice or permission statement appears anywhere on /docs/facpro/faq (app/docs/facpro/faq/FAQCards.tsx renders only title + answer).

**Impact.** Proprietary vendor marketing/support copy is republished on an Army-owned public-facing site with no permission of record, which is exactly what the site's own Terms of Use forbids (components/legal/Terms.tsx:26 quotes AR 25-1: "prohibits the posting of documents or information protected by a copyright on Army websites without the permission of the copyright holder"). Exposure to a takedown/infringement claim from Facilitate.com and an internal AR 25-1 / AR 27-60 compliance finding.

**Fix.** Either (a) obtain and record written permission from Facilitate.com to reproduce their FAQ content and add a visible attribution line on /docs/facpro/faq, or (b) replace the `vendor-*` entries with locally-authored answers written from APEN's own deployment experience, or (c) delete them and link out to the vendor FAQ instead. The 10 locally-authored support FAQs (ids login, access, follow-me, aliases, shared-login, conference-permissions, topics-not-showing, etc.) are unaffected.

> **provenance review — upheld** (high confidence). Evidence confirmed verbatim at every cited line. lib/data/docs.ts:269 = "// ── Vendor product FAQs — compiled from facilitate.pro ──"; 12 `vendor-*` ids run 270-365 (271 vendor-vs-webconf … 359 vendor-participant-install, array closes 366); :282, :298, :322 match the quoted strings exactly. Provenance checked upstream (network worked, external host only): https://www.facilitate.pro/faq-facilitatepro-facilitate-effective-group-collaboration returns the same twelve headings in the same order, with "think of it as a virtual multi-story building", "supports unlimited concurrent participants and unlimited concurrent sessions", "200 to 700 and more", and footer "© 2026 Facilitate.com" — proprietary, no open licence. Origin named correctly; the selection/ordering of twelve headings plus the multi-story-building analogy is expression, not generic boilerplate or bare fact. Attribution genuinely absent: app/docs/facpro/faq/FAQCards.tsx renders only title+body (lines 31-37), and no facilitate.pro link exists outside the code comment. Terms.tsx:25 quote confirmed. One correction: nginx/server.conf:195 `auth_request /internal/authcheck;` applies to `location /` (744-757, no opt-out), so /docs is login-gated, not public.
>
> *Correction:* The finding is factually correct and the provenance is verified upstream — twelve FAQ entries at lib/data/docs.ts:270-365 reproduce Facilitate.com's proprietary FacilitatePro FAQ (same twelve headings, same order, same "virtual multi-story building" analogy, upstream footer "© 2026 Facilitate.com") with no attribution, source link or permission record anywhere in the repo or the rendered page. Two adjustments to the framing: the site is not "public-facing" — nginx/server.conf:195 applies auth_request site-wide and `location /` (744) does not opt out, so this is republication to authenticated enclave users; and the material describes a product APEN is licensed to run, so the practical exposure is an AR 25-1 attribution/permission-of-record gap rather than a likely takedown. Severity medium; remedy is a visible "Product FAQ adapted from facilitate.pro" credit on /docs/facpro/faq plus a recorded licence clause, not removal.

> **obligation review — upheld** (medium confidence). Every in-repo claim checks out. lib/data/docs.ts:269 is verbatim "// ── Vendor product FAQs — compiled from facilitate.pro ──"; 12 `vendor-*` entries follow (ids at :271 through :359, file ends :366). Quoted answers are exact at :282 ("supports unlimited concurrent participants and unlimited concurrent sessions for one price"), :298 ("virtual multi-story building where each User Group is a separate floor"), :322 ("succeeded with groups of 200 to 700 and more"), and they ship — out/docs/facpro/faq/index.html contains "multi-story building". No attribution exists anywhere: app/docs/facpro/faq/page.tsx and FAQCards.tsx render only title + answer under a plain "FacilitatePro Product FAQ" section label (FAQCards.tsx:23,36); NOTICE (36 lines, ends at deploy provenance) has no third-party-content section; the only repo-wide hit for "facilitate.com|used with permission|all rights reserved" is that one comment. Terms.tsx:26 quotes AR 25-1 as described. What I cannot verify under static-analysis-only rules is the external premise — that these strings are substantially similar to facilitate.pro's published text. The answers read as paraphrase of product facts about a licensed product, and two strings the finder quoted as vendor "headings" are `description` fields that never render (grep of out/ returns 0). That makes the exposure a documentation/attribution gap, not a likely takedown, so "high" overstates it.
>
> *Correction:* Confirmed as written at the code level, with a lower severity. lib/data/docs.ts:269 self-documents 12 `vendor-*` FAQ entries (lines 271-365) as "compiled from facilitate.pro", and they render publicly (out/docs/facpro/faq/index.html) with no attribution, source link, or permission notice anywhere — not in app/docs/facpro/faq/page.tsx, not in FAQCards.tsx (which renders title + answer only), not in NOTICE, not in the Footer or components/legal. The obligation is therefore unmet. However, the answers are paraphrased product-feature statements about a product the Army licenses, not verbatim vendor prose: copyright protects expression, and restated feature facts plus short question headings are thin. The strongest expressive borrowings are the vendor's own analogy at :298 and the ROI/scale claims at :282 and :322. Two of the "near-verbatim headings" cited (":description" fields "Does the software require you to download plug-ins or run Flash?" and "How can I calculate the return on investment of purchasing?") do not appear in the shipped HTML at all. Substantial similarity to facilitate.pro could not be checked (no network access permitted), so the practical risk is an AR 25-1 sourcing/documentation gap rather than a likely infringement claim. The cheap fix is one visible credit line plus a source note in NOTICE, not a rewrite.

---

### 7. 39 Microsoft Store app icons bulk-harvested from the Store catalog

**Copyright · high** · `lib/data/logos.ts:46`

```
const S = '/logos/store'          // Microsoft Store app icons (harvested from the Store catalog)
```

**What it is.** public/logos/store contains 39 PNG icons for Microsoft first-party and third-party Store apps (microsoft-365-copilot.png, microsoft-clipchamp.png, outlook-for-windows.png, windows-terminal.png, dropbox.png, intel-graphics-software.png, etc.), all shipped in out/. lib/data/store-app-meta.ts lines 1-12 documents the scrape pipeline: "Real Store icons (files under public/logos/store/...)" and "Regenerate: see the store-app-meta-harvest note (Store search -> PFN manifestSearch -> displaycatalog)." No permission, license or attribution is recorded for any of them.

**Impact.** These are copyrighted icon artworks owned by Microsoft and by third-party publishers (Dropbox, Intel, AMD), copied in bulk from a commercial catalog API and rehosted on an Army website. Volume and automation make this harder to defend as incidental nominative use than a single logo would be.

**Fix.** Either rely on the Store's own hosted icon URLs at render time, or fall back to the generic Store mark for all entries, and in either case add a Microsoft Store attribution line to the pages that render them.

> **provenance review — upheld** (high confidence). Evidence verified verbatim. lib/data/logos.ts:46 reads exactly `const S = '/logos/store'          // Microsoft Store app icons (harvested from the Store catalog)`. 39 LOGOS entries use `${S}/` (logos.ts:210-248); `ls public/logos/store | wc -l` = 39; all 39 also exist in out/ and out/downloads/microsoft-products/store/index.html references them. lib/data/store-app-meta.ts:3 and :10-11 confirm the pipeline: "Real Store icons (files under public/logos/store/..." and "Regenerate: see the store-app-meta-harvest note (Store search -> PFN manifestSearch -> displaycatalog)". Provenance lens: these are not generic patterns — they are publisher logo artworks at Store catalog dimensions (dropbox.png 300x300 RGBA, microsoft-powertoys.png 1080x1080, intel-graphics-software.png 300x300), with third-party publishers named in-code (store-app-meta.ts:29 "Intel® Corporation", :31 "Dropbox Inc."). No license, NOTICE or attribution file exists anywhere under public/logos. Only correction: AMD is named in the impact but store-app-meta.ts:28 assigns `icon: LOGOS.msStore` — no AMD artwork was harvested.
>
> *Correction:* Accurate except for one detail: the impact statement lists AMD among the third-party publishers whose icon was copied, but lib/data/store-app-meta.ts:28 maps "AdvancedMicroDevicesInc-2.AMDRadeonSoftware" to `icon: LOGOS.msStore` (the generic Store mark), so no AMD artwork is in public/logos/store. The third-party publisher artwork actually present is Dropbox (dropbox.png, 300x300, store-app-meta.ts:31) and Intel (intel-graphics-software.png, 300x300, store-app-meta.ts:29); the remaining 37 are Microsoft-owned marks. Everything else stands: 39 PNGs, harvested via the documented Store search -> PFN manifestSearch -> displaycatalog pipeline (store-app-meta.ts:10-11), no license or attribution recorded, all 39 present in out/ and rendered by out/downloads/microsoft-products/store/index.html.

> **obligation review — upheld** (medium confidence). Evidence confirmed verbatim. lib/data/logos.ts:46 is exactly `const S = '/logos/store'          // Microsoft Store app icons (harvested from the Store catalog)`. public/logos/store holds 39 PNGs and out/logos/store holds the same 39, so they ship. lib/data/store-app-meta.ts:1-12 documents the harvest pipeline and states "Icons must be local + LOGOS-registered or npm run validate:images fails". Grep for trademark/attribution/respective owners across app, components, lib returns nothing relevant; the only NOTICE (repo root, 36 lines) is a system-ownership/CM record with no third-party attribution; components/legal/Terms.tsx:13 and links-disclaimer.tsx:8 disclaim endorsement only for hyperlinks. So the attribution gap is real. But the claimed effect is not: there is no license-text obligation for PNG icons (no OFL/CC-BY analogue), and the icons identify the exact apps this site distributes via its own WinGet repo — textbook nominative identification, with publisher named on every entry. The finder's fix (hotlink Store URLs) is impossible here: store-app-meta.ts:11-12 shows local-only icons are enforced by design for the disconnected enclave. Impact detail is also wrong on AMD: line 28 uses the generic LOGOS.msStore, not an AMD artwork.
>
> *Correction:* The facts hold — 39 harvested Store icons in public/logos/store, all present in out/, documented as a scrape pipeline at lib/data/store-app-meta.ts:1-12, with no attribution or trademark notice anywhere in the repo (the root NOTICE is a system-ownership record; components/legal/Terms.tsx:13 disclaims endorsement only for hyperlinks). But the framing as a high-severity copyright problem is not supported. These icons identify the exact applications the site itself distributes through its internal WinGet repo, each card names the publisher, and the site is a non-commercial Army enclave service: that is nominative identification, the same practice every package manager and enterprise software portal follows. No license text needs to ship with a PNG, and nothing suggests a permission obligation. The recommended fix is also infeasible — store-app-meta.ts:11-12 records that icons must be local or `npm run validate:images` fails, a deliberate choice for a disconnected enclave with no internet egress. The actual, minor gap is the absence of any third-party trademark line; and it is not specific to /logos/store, since /logos/real, /logos/products and /logos/restricted carry vendor marks under the same silence. One sentence in components/legal/Terms.tsx ("Product names and logos are trademarks of their respective owners; their appearance does not imply endorsement") closes it for the whole site. Note also that the impact claim overstates third-party breadth: AMD (store-app-meta.ts:28) uses the generic LOGOS.msStore mark, not AMD artwork.

---

### 8. VMware/Broadcom proprietary release-notes PDFs mirrored and linked as site documentation

**Copyright · high** · `lib/data/vmware.ts:271`

```
{ label: 'VMware Tools 13.1.0', href: '/docs/vmware/vmware-tools-13-1-0.pdf', kind: 'release-notes' },
{ label: 'VMware Tools 13.0.10', href: `${BASE}/vmware-tools/VMware%20Tools%2013.0.10.0%20Release%20Notes.pdf`, kind: 'release-notes' },
```

**What it is.** vmwareDocCards (lib/data/vmware.ts:229-288) and every patch row in vmware8Products/vmware7Products (lines 113-116, 132-135, 155-156, 172-173) link VMware/Broadcom release-notes and upgrade-guide PDFs that are mirrored on this host, not linked to the vendor. I confirmed one is served from the local webroot: /var/www/html/docs/vmware/vmware-tools-13-1-0.pdf, matching the '/docs/vmware/vmware-tools-13-1-0.pdf' href at line 271. The rest (vsphere-esxi-80u3k-release-notes.pdf, vsphere-vcenter-server-70u3s-release-notes.pdf, updating_vcenter_server_using_appliance_management.pdf, VMware%20Workstation%20Pro%2025H2u1%20Release%20Notes.pdf at line 223) resolve under URLS.vmware on the same mirror. VMware/Broadcom documentation is proprietary and all-rights-reserved; it is not redistributable. No permission record, licence notice, or copyright statement accompanies any of these links.

**Impact.** Wholesale republication of a vendor's copyrighted documentation on an Army website, the specific act components/legal/Terms.tsx:26 says AR 25-1 prohibits without the copyright holder's permission. Broadcom has been notably aggressive about unauthorized distribution of VMware materials since the acquisition.

**Fix.** Confirm whether the site's VMware entitlement covers internal redistribution of vendor documentation. If not, replace the mirrored PDF hrefs with links to broadcom.com/support documentation (or with locally-authored summaries of the changes that matter to APEN), and remove the PDFs from the mirror. If it is covered, record the entitlement clause in NOTICE and add a copyright line to the /docs/vmware page.

> **provenance review — upheld** (high confidence). Evidence verified verbatim. lib/data/vmware.ts:271 is exactly `{ label: 'VMware Tools 13.1.0', href: '/docs/vmware/vmware-tools-13-1-0.pdf', kind: 'release-notes' }`, and line 272 the 13.0.10 `${BASE}/vmware-tools/...%20Release%20Notes.pdf`. vmwareDocCards spans 229-288 as claimed; line 223 is the Workstation Pro 25H2u1 release-notes PDF. Provenance is genuine third-party: the local PDF's own metadata reads `/Title (VMware Tools 13.1.0) /Creator (DITA Open Toolkit)` — VMware's doc toolchain — and its decompressed text contains VMware Tools driver descriptions ("Guest Introspection Dri...", "VMware drivers for Lin..."). Not a generic pattern or bare factual data: this is wholesale authored vendor prose, proprietary/all-rights-reserved, no open license. Origin naming (VMware, now Broadcom) is correct. Self-hosting confirmed: constants.ts:60 `vmware: ${APENSUPPORT_BASE}/vmware` with APENSUPPORT_BASE = '' (root-relative), nginx/server.conf:762-763 `location @legacy_files { root /var/www/html;`, and the files exist on disk (/var/www/html/docs/vmware/vmware-tools-13-1-0.pdf, /var/www/html/vmware/{7,8,vmrc,vmware-tools,vmware-workstation}/*.pdf). No permission record: NOTICE (36 lines, read fully) contains no VMware/Broadcom entry. Terms.tsx:26 carries the AR 25-1 quote exactly as cited. Note the same tree also mirrors VMware ISOs/depot binaries — a larger exposure the finding only touches in passing.

> **obligation review — upheld** (high confidence). Evidence confirmed verbatim. lib/data/vmware.ts:271-272 match the quote exactly. The hrefs are self-hosted, not vendor links: lib/data/constants.ts:60 `vmware: ${APENSUPPORT_BASE}/vmware` with APENSUPPORT_BASE = '' (constants.ts:22), so every BASE href is root-relative to this host; nginx/server.conf:762-766 `location @legacy_files { root /var/www/html; }` serves them. Files exist on disk: /var/www/html/docs/vmware/vmware-tools-13-1-0.pdf, /var/www/html/vmware/vmware-tools/"VMware Tools 13.0.10.0 Release Notes.pdf", /var/www/html/vmware/updating_vcenter_server_using_appliance_management.pdf. The obligation-is-already-met escape fails: the repo's only NOTICE (36 lines) covers ownership, provenance and ACLs, with zero third-party copyright, attribution or entitlement text; grep over components/legal/ finds copyright language only in Terms.tsx:21-26, which states the prohibition rather than claiming permission. Severity lowered to medium: the same pages mirror the ESXi/vCenter ISOs and patch bundles themselves (lines 104-135), so whatever entitlement permits that mirroring almost certainly reaches the release notes; the notes are the least exposed part, and the real gap is the missing recorded entitlement, not the PDFs specifically.
>
> *Correction:* The facts are accurate but the framing is too narrow, which inflates the severity. VMware/Broadcom release-notes and upgrade-guide PDFs are indeed mirrored on this host and linked as site documentation (lib/data/vmware.ts:271 and throughout vmwareDocCards/vmware8Products/vmware7Products), and no permission record, licence notice or copyright line accompanies them anywhere in the repo — NOTICE covers only ownership and deploy provenance, and components/legal/Terms.tsx:21-26 states the AR 25-1 prohibition without asserting any entitlement. However, the same data file mirrors the vCenter and ESXi ISOs, patch bundles, VMware Tools installers, VMRC and Workstation Pro executables from the same webroot (lines 104-135, 187-225). Those binaries are the far larger redistribution question, and any APEN entitlement that permits mirroring them would almost certainly cover their release notes. The actionable defect is therefore not "PDFs are republished" but "no recorded entitlement or copyright/attribution statement exists for any mirrored VMware material"; treating the PDFs as a distinct high-severity exposure misallocates the fix. Remediation is a NOTICE entry citing the entitlement clause plus a copyright line on the VMware pages, covering binaries and documentation together.

---

### 9. No third-party attribution notice is shipped or linked: every copyright/permission notice is stripped from the client bundle

**Copyright · high** · `package.json:26`

```
"dependencies": {
    "@radix-ui/react-dropdown-menu": "^2.1.24",
    "@radix-ui/react-icons": "^1.3.2",
```

**What it is.** The static export in out/ ships minified derivative works of React, react-dom, Radix UI, framer-motion, lucide-react, clsx, tailwind-merge (MIT/ISC), class-variance-authority and @swc/helpers (Apache-2.0) to every browser. I verified that the build strips all license text and that nothing replaces it: `grep -ro "Copyright" out/_next/static | wc -l` -> 0 and `grep -ro "@license" out/_next/static | wc -l` -> 0 across 86 chunk files; `find out -iname '*licen*' -o -iname '*notice*' -o -iname '*third*'` returns nothing; `git ls-files | grep -iE 'licen|notice|third|attrib'` returns only NOTICE (an ownership/CM record, not an attribution file) and an unrelated component. MIT and ISC both require the copyright notice and permission notice to accompany "all copies or substantial portions"; Apache-2.0 sec. 4(a)/(b) requires giving recipients a copy of the License and retaining attribution notices. Serving the code to browsers is distribution.

**Impact.** Every page load distributes MIT/ISC/Apache-2.0 code stripped of its mandatory notices, which is a literal license breach for roughly a dozen upstream copyright holders. For a government system this is also an ATO/supply-chain documentation gap: there is no artifact that answers "what open-source code does this site distribute and under what terms".

**Fix.** Generate a THIRD-PARTY-NOTICES.txt at build time (e.g. a small script walking node_modules for the production dependency closure, concatenating each LICENSE file), copy it into out/ from the build, and link it from the footer alongside the other legal links in lib/data/footer.ts. Add the copy line to the siteupdate.sh sync list so it actually reaches the live tree.

> **provenance review — upheld** (high confidence). Could not refute; every claim checks out. package.json:26 is exactly `"dependencies": {` followed by the two @radix-ui lines quoted — evidence matches verbatim. Provenance is genuine, not generic-pattern copying: node_modules/react-dom/cjs/react-dom.production.js:1-8 carries `/**\n * @license React\n * Copyright (c) Meta Platforms, Inc. and affiliates.` and the shipped chunks carry the matching "Minified React error" string, so real upstream code with a real stripped banner is being served. Licenses named are correct per each package.json `license` field: react/react-dom/@radix-ui(3)/framer-motion/tailwind-merge/clsx MIT, lucide-react ISC, class-variance-authority and @swc/helpers Apache-2.0; each has its own LICENSE file in node_modules. Bundling confirmed by grep -rl over out/_next/static (framer, radix, lucide each hit a chunk) and components/ui/button.tsx:3 `import { cva, ... } from 'class-variance-authority'`. Re-ran the counts: Copyright=0, @license=0 across out/_next/static; no licence/notice file in out/; git ls-files matches only NOTICE (an ownership/CM record, confirmed by reading it) and AlreadyConfiguredNotice.tsx. lib/data/footer.ts:14-18 lists FOIA/Accessibility/Privacy with no attribution link. One overreach: I found no @swc/helpers marker (_object_spread, _class_call_check, _ts_generator) in any chunk, so its inclusion in the shipped set is unverified.
>
> *Correction:* Accurate as written except for two details. (1) @swc/helpers should be dropped from the shipped list — it is a transitive Next dep with a real Apache-2.0 LICENSE, but no helper markers (_object_spread/_class_call_check/_ts_generator) appear in any chunk under out/_next/static, so I could not confirm it reaches the browser; class-variance-authority is confirmed (components/ui/button.tsx:3) and is the Apache-2.0 item that matters. (2) Severity is better read as medium than high: this is a real license-compliance and supply-chain-documentation gap (MIT/ISC notice retention, Apache-2.0 sec. 4(a)/(b)) on an internal, ATO-scoped site, with no exploitability, no data exposure and no functional impact, and the fix is one generated THIRD-PARTY-NOTICES.txt plus a footer link and a siteupdate.sh cp line. Everything else — zero "Copyright"/"@license" occurrences across the 92 files in out/_next/static, no licence/notice artifact anywhere in out/, NOTICE being an ownership/CM record rather than an attribution file, and the upstream banner existing in node_modules/react-dom/cjs/react-dom.production.js:1-8 so the build is genuinely what strips it — is confirmed.

> **obligation review — upheld** (high confidence). Could not refute. Evidence at package.json:26-28 matches verbatim (`"dependencies": {` / `"@radix-ui/react-dropdown-menu": "^2.1.24"` / `"@radix-ui/react-icons": "^1.3.2"`). Bundle checks reproduce: `grep -ro "Copyright" out/_next/static | wc -l` -> 0, `@license` -> 0, `find out -iname '*licen*' -o -iname '*notice*' -o -iname '*third*'` -> empty. Third-party code is genuinely there: `react.dev/errors` appears in out/_next/static/chunks/2p85v-9nc09pd.js, a framer chunk exists, and class-variance-authority (Apache-2.0, node_modules/class-variance-authority/LICENSE line 1 "Apache License") is imported at components/ui/button.tsx:3. I searched for the obligation being met: `git ls-files | grep -iE 'licen|notice|third|attrib|credit'` returns only NOTICE + AlreadyConfiguredNotice.tsx; NOTICE is an ownership/ATO/provenance record naming no dependency; lib/data/footer.ts quickLinks (11 legal links) has no attribution entry; components/legal/ has none. Corrections: 92 files, not 86; no @swc/helpers marker found; package-lock.json does not exist at all; scripts/make-airgap-bundle.sh:68 ships node_modules whole, so LICENSEs do travel on that path.
>
> *Correction:* The finding is factually accurate and the obligation is real, but "high" overstates it. Confirmed: out/_next/static (92 files) contains minified React, Radix, framer-motion and class-variance-authority code with zero "Copyright" or "@license" strings; no THIRD-PARTY/NOTICES artifact exists in out/ or in git (only a root NOTICE that is an ownership/CM record naming no dependency, and which is not copied into out/); lib/data/footer.ts carries eleven legal links, none of them attribution. MIT/ISC notice preservation and Apache-2.0 sec. 4(a) (class-variance-authority, imported at components/ui/button.tsx:3) are therefore unmet on the browser-served path. Two qualifiers: scripts/make-airgap-bundle.sh:68 ships node_modules intact, so every upstream LICENSE file does accompany the air-gap distribution path — only the nginx-served out/ tree lacks notices; and this is the near-universal state of every minified web bundle, with no realistic enforcement exposure and a trivial remedy. Conversely the ATO/SBOM half of the impact is stronger than written: package-lock.json does not merely go untracked, it does not exist on disk at all, so there is no pinned dependency inventory of any kind. Medium, not high.

---

### 10. Tenable-authored iris animation redistributed as site artwork with no permission record

**Copyright · high** · `public/logos/products/tenable-iris.json:1`

```
{"v": "5.7.0", "ip": 0, "op": 45, "fr": 30, "w": 456, "h": 470, "nm": "Tenanble_Iris_Lottie_White", "assets": [], "layers": [...
```

**What it is.** The Lottie composition name embedded in the file is "Tenanble_Iris_Lottie_White" - a Tenable-side After Effects project name (including Tenable's own typo), which is what an export lifted from Tenable's web assets carries. The iris is Tenable's registered brand mark. It is shipped at out/logos/products/tenable-iris.json and out/logos/products/tenable-iris.avif, registered in lib/data/logos.ts line 113 (tenableIris), duplicated at public/logos/restricted/tenable-iris.avif, and re-encoded into two further derivative AVIFs under exports/tenable-iris/. Nothing in the repo records permission from Tenable; exports/tenable-iris/README.md states only "The animated Tenable iris from the APEN support site" with no provenance or license line.

**Impact.** Animated brand artwork authored by the vendor is being hosted, re-encoded into new derivative files, and packaged for handoff to other sites, on an Army website whose own Terms page quotes the AR 25-1 prohibition on posting copyrighted material without the holder's permission.

**Fix.** Obtain and file written permission from Tenable, or replace the iris with the plain Tenable.sc product icon used under nominative fair use and delete the derivative AVIF renders.

> **provenance review — upheld** (high confidence). Evidence confirmed byte-for-byte. public/logos/products/tenable-iris.json:1 begins exactly as quoted, with "nm": "Tenanble_Iris_Lottie_White". Parsing it shows a genuine Bodymovin/After Effects export shape (layer keys ind/ty/nm/sr/ks/shapes/hasMask/ln/ip/op/st, group "Polystar 1", "Path 1", "Stroke 1" white [1,1,1]) — an AE comp name carrying the vendor's own misspelling is distinctive authorship evidence, not a generic pattern, so the provenance lens does not excuse it. Corroborating cites all hold: lib/data/logos.ts:113 `tenableIris: ${P}/tenable-iris.avif` and :182 `tenableRes: ${RES}/tenable-iris.avif`; public/logos/restricted/tenable-iris.avif exists; exports/tenable-iris/ holds tenable-iris.avif + tenable-iris-small.avif (README "How the AVIF was made" documents the re-encode); exports/tenable-iris/README.md:3 says only "The animated Tenable iris from the APEN support site" with no license line. grep for tenable across *.md/LICENSE* finds no permission record. components/legal/Terms.tsx:21,26 does quote AR 25-1's prohibition. No network available to fetch Tenable's upstream asset for byte comparison.
>
> *Correction:* Accurate as written, with two scope corrections. (1) "packaged for handoff to other sites" is true of the git-tracked repo only — exports/ is not published; `ls out/exports` does not exist, so only public/logos/products/tenable-iris.{json,avif} and public/logos/restricted/tenable-iris.avif reach the web root via out/. (2) "registered brand mark" cannot be verified from the repo (no trademark record here); what is verifiable is that the Lottie carries a Tenable-side After Effects composition name including Tenable's own typo. Also worth noting for triage: the repo hosts un-permissioned vendor artwork broadly (trellix-logo.png, vmware-long.png, microsoft-brand-logo.jpg, tenable.png, gitlab.png, etc. under public/logos/), so the iris is one instance of a repo-wide gap; what makes it the sharpest instance is the two locally re-encoded derivative AVIFs plus exports/tenable-iris/README.md, which is written as a redistribution/integration kit for a different site.

> **obligation review — upheld** (high confidence). Every cited fact checks out verbatim. public/logos/products/tenable-iris.json:1 begins `{"v": "5.7.0", ... "nm": "Tenanble_Iris_Lottie_White"` — the Tenable-side AE project name and typo, exactly as quoted. lib/data/logos.ts:113 registers `tenableIris: ${P}/tenable-iris.avif`. Shipped: out/logos/products/tenable-iris.{json,avif} and out/logos/restricted/tenable-iris.avif. Duplicate at public/logos/restricted/tenable-iris.avif. exports/tenable-iris/ holds two derivative AVIFs plus exports/tenable-iris/README.md:3 "The animated Tenable iris from the APEN support site" — no provenance or license line, confirmed. components/legal/Terms.tsx:26 does quote the AR 25-1 prohibition. Obligation lens: unmet. The repo's only NOTICE file (root) covers ownership/CM/ACLs and never mentions Tenable, trademarks, or third-party assets; no LICENSE/attribution/credits file exists anywhere under public/logos or components/legal. Two corrections: (1) `ls out/exports` does not exist — exports/ is git-tracked but never published, so this is internal handoff material, not public redistribution; (2) all ~38 vendor logos in public/logos/products and /restricted carry the same zero-attribution gap, so this is one instance of a repo-wide omission, not a Tenable-specific act.
>
> *Correction:* The factual core is accurate: an animated Lottie whose embedded composition name "Tenanble_Iris_Lottie_White" (public/logos/products/tenable-iris.json:1) identifies it as a third-party/Tenable-authored export is displayed on the site (lib/data/logos.ts:113), shipped in out/, duplicated to public/logos/restricted/, and re-encoded into two derivative AVIFs under exports/tenable-iris/, with no permission, license, or attribution record anywhere in the repo — the root NOTICE covers only ownership and access control, and exports/tenable-iris/README.md:3 gives no provenance. The site's own Terms page quotes the AR 25-1 prohibition (components/legal/Terms.tsx:26), so the obligation is real and self-declared. Severity is medium rather than high: exports/ is git-tracked but absent from out/, so nothing is redistributed outside the Army today; the on-site use is a vendor mark labeling that vendor's own product, which nominative fair use plausibly covers; and the same attribution gap applies to all ~38 vendor logos under public/logos/products and public/logos/restricted. The proportionate fix is a third-party asset section in NOTICE recording source and permission basis for each vendor mark (the animated iris and its derivative AVIFs first, since a whole copied animated work is the weakest fair-use case), not deletion of the iris alone.

---

### 11. lottie-web 5.12.2 (MIT, Airbnb) vendored and served with no MIT notice

**Copyright · high** · `public/vendor/lottie_light.min.js:1`

```
"undefined"!=typeof navigator&&function(t,e){...(t="undefined"!=typeof globalThis?globalThis:t||self).lottie=e()}
```

**What it is.** This is the lottie-web "light" player (internal version string "5.12.2"; bodymovin identifiers present), MIT-licensed by Bodymovin/Airbnb. The minified file has no leading license banner - it starts directly with the UMD wrapper. grep -oiE '(copyright|MIT|licen[cs]e|airbnb)' over the whole file returns only incidental hits (miterLimit, bodymovin). Repo-wide, grep -rl 'Permission is hereby granted' outside node_modules/out returns nothing, and git ls-files finds no LICENSE/NOTICE-style file other than NOTICE (an ownership/CM record). The stripped file is deployed as out/vendor/lottie_light.min.js and loaded by components/common/LottieMark.tsx line 22 (LIB_SRC = '/vendor/lottie_light.min.js').

**Impact.** MIT's one mandatory condition is that the copyright and permission notice be included in all copies. Serving the player from the live site without it is an outright license breach, and it is the clearest one in the repo.

**Fix.** Add the lottie-web MIT copyright + permission paragraph as a preserved banner at the top of the vendored file, or ship public/vendor/lottie_light.LICENSE.txt next to it and reference it from NOTICE; record the pinned version 5.12.2.

> **provenance review — upheld** (high confidence). Provenance confirmed, not generic expression. public/vendor/lottie_light.min.js:1 opens exactly as the finding quotes and as upstream lottie-web@5.12.2 build/player/lottie_light.min.js does (WebFetch of jsdelivr returned a byte-identical opening through `...).lottie=e()}(this,(function(){`). Distinctive markers present: the only semver literal in the file is `"5.12.2"`; `getElementsByClassName("bodymovin")` and `window.bodymovin=It` appear at line 1; `Nt.registerModifier("tm",qt)` etc. at EOF. License named is correct: WebFetch of airbnb/lottie-web LICENSE.md returns MIT, "Copyright (c) 2015 Bodymovin" — so "MIT, Bodymovin/Airbnb" is accurate. Notice absence confirmed: `grep -oiE '(copyright|licen[cs]e|airbnb|permission is hereby)'` over the file returns zero hits; `git ls-files` shows no LICENSE file (only NOTICE, which greps clean for licen/third-party/lottie); no "Permission is hereby granted" anywhere outside node_modules/out. Deployment confirmed: out/vendor/lottie_light.min.js (168236 bytes, same size) and components/common/LottieMark.tsx:22 `const LIB_SRC = '/vendor/lottie_light.min.js'`. Two corrections: the file is not "stripped" — upstream ships no banner either (obligation is on the redistributor to include LICENSE.md); and a second identical copy exists at exports/tenable-iris/lottie_light.min.js (md5 9f45bc11… matches).
>
> *Correction:* Accurate as written except for two details. (1) "Stripped" is wrong: upstream lottie-web 5.12.2's own build/player/lottie_light.min.js carries no license banner either — the vendored file is a verbatim, unmodified copy, and the breach is that the project failed to carry over the LICENSE.md that ships with the npm package/repo, not that anyone removed a banner. (2) The finding undercounts copies: an identical second copy (md5 9f45bc11e487793a62f28ec514a84bb1) lives at exports/tenable-iris/lottie_light.min.js and is referenced by exports/tenable-iris/README.md, which also carries no license mention; any remediation must cover both. Everything else verifies: genuine lottie-web 5.12.2 (internal "5.12.2", bodymovin identifiers), genuinely MIT ("Copyright (c) 2015 Bodymovin", repo airbnb/lottie-web), no MIT notice anywhere in the repo, served live from out/vendor/ and loaded by components/common/LottieMark.tsx:22.

> **obligation review — upheld** (high confidence). Every factual claim checks out. public/vendor/lottie_light.min.js is a one-line file (wc -l = 1) whose line 1 begins exactly `"undefined"!=typeof navigator&&function(t,e){...(t="undefined"!=typeof globalThis?globalThis:t||self).lottie=e()}` — no banner. It is lottie-web: `grep -oE '"5\.[0-9]+\.[0-9]+"'` yields "5.12.2", and two bodymovin identifiers appear (`window.bodymovin=It`, `getElementsByClassName("bodymovin")`). `grep -oiE '(copyright|permission is hereby|airbnb|MIT|licen[cs]e)'` over the whole file returns only the 2 bodymovin hits — zero notice text. Repo-wide `grep -rIl 'Permission is hereby granted'` (excluding node_modules/out/.next/.git) returns nothing; `git ls-files | grep -iE 'licen|notice|credit|attribut|third'` returns only NOTICE, which I read in full — an ownership/CM/ATO record with no third-party section. components/legal/Terms.tsx:16-18 mentions only YouTube ToS. The file is deployed: out/vendor/lottie_light.min.js (168236 bytes, identical size, built 2026-09-15) and loaded by components/common/LottieMark.tsx:22 `const LIB_SRC = '/vendor/lottie_light.min.js'`. The MIT notice obligation is real and unmet. Only the severity is wrong.
>
> *Correction:* The finding is accurate as written on every verifiable point — the vendored lottie-web 5.12.2 "light" player at public/vendor/lottie_light.min.js:1 carries no MIT copyright/permission notice, nothing elsewhere in the repo supplies one (NOTICE is an ownership/CM record only), and it is served live from out/vendor/lottie_light.min.js via components/common/LottieMark.tsx:22 — so MIT's single mandatory condition is unmet. Severity "high" overstates it. The obligation is administrative, not operational: MIT is permissive and grants use regardless, there is no security, availability, or data-exposure consequence, the site is an internal DoD support portal rather than a redistributed product, upstream's own minified dist ships without an inline banner (the LICENSE lives at the npm package root, so this is an omission of a companion file rather than deliberate notice stripping), and the fix is a single added file. The one aggravating factor that keeps it above "low" is CM/SBOM hygiene: an unattributed, unpinned third-party component in an ATO-tracked baseline is a supply-chain-record gap as much as a license one. Medium. Recommendation stands: add public/vendor/lottie_light.LICENSE.txt with the lottie-web MIT text, reference it from NOTICE, record the pinned 5.12.2, and confirm the deploy copies it into out/.

---

### 12. Vendored lottie_light.min.js is redistributed with its MIT header stripped and no recorded provenance

**Copyright · high** · `public/vendor/lottie_light.min.js:1`

```
"undefined"!=typeof navigator&&function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define(e):(t="undefined"!=typeof globalThis?globalThis:t||self).lottie=e()}(this,(function(){"use strict";
```

**What it is.** This is a 168 KB verbatim copy of lottie-web's light player (MIT, Airbnb/Hernan Torrisi) checked into the repo and served to browsers from /vendor/lottie_light.min.js (components/common/LottieMark.tsx:22 `const LIB_SRC = '/vendor/lottie_light.min.js'`). The file begins directly with code: `grep -oiE 'licen[sc]e|copyright|MIT' public/vendor/lottie_light.min.js` yields only 13 substring hits on lowercase "mit" (from words such as "limit"), and zero "license" or "copyright" matches. The LottieMark.tsx header comment (lines 5-13) documents why it is vendored but records neither the upstream project name, the version, the source URL, nor the license.

**Impact.** A whole third-party library is redistributed by the site with the MIT notice removed - the clearest single instance of the missing-notice problem, and the one an auditor is most likely to find because the file is served at a stable, guessable URL. The missing version/provenance also means nobody can tell whether this copy carries known CVEs.

**Fix.** Restore the upstream banner comment at the top of the vendored file (or ship public/vendor/lottie_light.LICENSE.txt next to it), and add the upstream URL, version and license to the LottieMark.tsx header comment so the provenance survives in git.

> **provenance review — upheld** (high confidence). Provenance confirmed, mechanism refuted. public/vendor/lottie_light.min.js:1 opens exactly as quoted (1-line file, 168236 B). It is genuinely lottie-web: only semver literal in the file is "5.12.2", and `getElementsByClassName("bodymovin")` / `window.bodymovin=It` appear at line 1 — distinctive, not generic. License named is correct: WebFetch of airbnb/lottie-web LICENSE.md returns MIT, "Copyright (c) 2015 Bodymovin". Notice absence confirmed: `grep -oiE 'licen[sc]e|copyright'` returns zero; only 13 incidental "mit" substrings. Served live (out/vendor/lottie_light.min.js, same md5 9f45bc11…) via components/common/LottieMark.tsx:22 `const LIB_SRC = '/vendor/lottie_light.min.js'`; header comment at :5-13 records no version/URL/license. REFUTED: "header stripped"/"MIT notice removed". WebFetch of cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie_light.min.js returned a byte-identical opening with no banner — upstream ships none, so nothing was removed. Also refuted: "nobody can tell... CVEs" — "5.12.2" is greppable in the file. Undercounted: identical third copy at exports/tenable-iris/lottie_light.min.js.
>
> *Correction:* public/vendor/lottie_light.min.js:1 is a verbatim, unmodified copy of upstream lottie-web 5.12.2's build/player/lottie_light.min.js (MIT, "Copyright (c) 2015 Bodymovin", airbnb/lottie-web), served live from out/vendor/ and loaded by components/common/LottieMark.tsx:22. No MIT copyright or permission text accompanies it anywhere in the repo (root NOTICE is an ownership/CM record), so MIT's one mandatory condition is unmet. However, the header was not stripped: upstream's own published minified player carries no license banner either (verified byte-identical opening via jsdelivr), so this is a failure to carry over the companion LICENSE.md, not notice removal — and the version is in fact recoverable from the file ("5.12.2" is the only semver literal), so CVE traceability is not lost, only undocumented. An identical third copy (md5 9f45bc11e487793a62f28ec514a84bb1) sits at exports/tenable-iris/lottie_light.min.js and any fix must cover it. Medium, not high: MIT is permissive, there is no security or availability impact, and the fix is one added file (public/vendor/lottie_light.LICENSE.txt plus a NOTICE reference, pinning 5.12.2, and a matching copy line in siteupdate.sh).

> **obligation review — upheld** (high confidence). Core fact confirmed: public/vendor/lottie_light.min.js:1 is a 168,236-byte single-line minified lottie-web player, byte-identical (md5 9f45bc11…) to out/vendor/lottie_light.min.js and exports/tenable-iris/lottie_light.min.js, loaded via components/common/LottieMark.tsx:22 `const LIB_SRC = '/vendor/lottie_light.min.js'`. No MIT text ships: no *LICENSE*/*NOTICE* under public/ or out/; the repo-root NOTICE (lines 1-36) is an ownership/provenance record ("Owning organization : Futures and Concepts Center…") with zero third-party license content; components/legal/Terms.tsx:16-18 covers only YouTube ToS; Footer.tsx has no credits. So the MIT notice-preservation obligation is real and unmet.

Two sub-claims are wrong. (1) "MIT header stripped": upstream lottie-web's build/player/lottie_light.min.js ships with no banner — the file starts at the stock UMD wrapper, so nothing was removed here; the omission is a failure to ship LICENSE.md alongside, not tampering. (2) "nobody can tell… CVEs": the file self-identifies — `It.version="5.12.2"` on line 1. Real but minor: drop a LICENSE.txt beside it. Severity high is overstated.
>
> *Correction:* The site redistributes lottie-web 5.12.2's light player (public/vendor/lottie_light.min.js, served at /vendor/lottie_light.min.js, out/vendor/lottie_light.min.js) without shipping the MIT license text anywhere — no LICENSE/NOTICE file in public/ or out/, and the repo-root NOTICE is an ownership record that lists no third-party licenses. MIT's notice-preservation clause is therefore unmet and the fix is one file (public/vendor/lottie_light.LICENSE.txt with the upstream MIT text plus project/version/URL). However, the header was not "stripped": upstream's own minified build carries no banner, so nothing was removed by this repo, and the version is not missing — `It.version="5.12.2"` is embedded on line 1, so CVE triage against lottie-web 5.12.2 is possible today. This is minor license hygiene (low), not a high-severity copyright exposure.

---

### 13. Assistant panels hand-roll admin auth headers and omit the CSRF token, so Save/Reset 401s for cookie-session admins

**Code quality · high** · `app/admin/AdminAssistantChipsPanel.tsx:67`

```
method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminContentClient.getToken() },
        body: JSON.stringify({ prompts: cleaned }),
```

**What it is.** AdminAssistantChipsPanel (lines 33, 67, 86) and AdminAssistantPromptPanel (lines 39, 66, 84) build their own header objects instead of calling the shared `adminAuthHeaders()` helper that AnnouncementPathsPanel (line 64) and InfrastructureNodesPanel (line 381) use. The helper is the only place that attaches `x-csrf-token` (lib/data/admin-content.ts:386-394). proxy/site-stats.mjs `authorizeAdmin` rejects any POST/DELETE from an admin-kind session cookie whose `x-csrf-token` does not match (proxy/site-stats.mjs:2050-2054), and both endpoints call it (site-stats.mjs:3374, 3435). A same-origin `fetch` sends the session cookie by default, so the cookie branch is taken and the CSRF check fails. `getToken()` also returns '' for a cookie-session admin, so an empty header is sent that adminAuthHeaders deliberately omits.

**Impact.** For the normal LDAP-cookie admin, saving assistant chips and saving/resetting the assistant system prompt fail with 'HTTP 401'. The panel is documented as the admin-editable half of the Voltron prompt, so an admin cannot change it from the console at all.

**Fix.** Replace the three hand-built header literals in each panel with `adminAuthHeaders()` / `adminAuthHeaders({ write: true })`, and then extract the whole load/save/reset trio (it is byte-for-byte the same in these two panels and AnnouncementPathsPanel) into one `lib/hooks/useAdminJsonResource.ts` hook that owns the endpoint, the headers, `busy`, and the message state — so a header rule can never again be right in two panels and wrong in two others.

> **worth-it review — upheld** (high confidence). Every citation checks out. app/admin/AdminAssistantChipsPanel.tsx:33,67,86 and app/admin/AdminAssistantPromptPanel.tsx:39,66,84 each hand-build `headers: { ... 'x-admin-token': adminContentClient.getToken() }` and never send x-csrf-token; grep shows these are the only hand-rolled admin write headers outside admin-content.ts (useNginxStatus.ts:81, InfrastructureNodesPanel.tsx:748 are GET-only). lib/data/admin-content.ts:386-394 is the sole place attaching x-csrf-token, and its doc comment at 377-385 describes exactly this failure mode. proxy/site-stats.mjs:2048-2054 takes the cookie branch first: `if (!constantTimeEqualHex(supplied, session.csrfToken)) return false` for POST/DELETE/PUT/PATCH; the write handlers at 3373/3397/3434/3462 all gate on authorizeAdmin and emit 401. lib/data/runtime.ts:55,58 are relative paths, so fetch's default same-origin credentials sends the session cookie, and site-stats.mjs:2970-2979 shows an admin-kind session always carries a csrfToken. getToken() (admin-content.ts:343-356) returns '' for a cookie-only admin. So Save/Reset on both assistant panels 401 for the normal LDAP admin.
>
> *Correction:* The defect and impact are accurate as reported (it is really a correctness bug, not just "quality"): both assistant panels omit x-csrf-token, so authorizeAdmin's cookie branch 401s every Save/Reset for a cookie-session admin. Only the first half of the recommendation is warranted — replace the six header literals with adminAuthHeaders() / adminAuthHeaders({ write: true }) plus the missing import, an ~8-line diff. The proposed lib/hooks/useAdminJsonResource.ts extraction is churn: the three panels' load/save/reset bodies differ in payload shape, state and messages, the shared rule already lives in one exported helper, and a new abstraction for three call sites in a single-maintainer, air-gapped repo prevents recurrence no better than using that helper does.

---

### 14. SessionGate 'Retry' button is dead — it sets state the probe effect does not depend on

**Code quality · high** · `app/admin/AdminContentEditor.tsx:946`

```
<button
          onClick={() => setProbeState('probing')}
```

**What it is.** The probe effect's dependency array is `[onAuthorized]` (line 923); `probeState` is not in it. The Retry button sets `probeState` back to 'probing', which renders the 'Checking admin session…' card forever because nothing re-runs the probe. The only thing that could re-trigger it is a new `onAuthorized` identity, and the parent passes an inline arrow (line 2208) that only changes when AdminContentEditor itself re-renders — which it does not while unauthorized and idle. That same inline arrow is the other half of the bug: it makes the auth probe re-fire on unrelated parent re-renders while giving no control over the retry the user actually asked for.

**Impact.** When the site-stats proxy is briefly down, the admin console's offline card offers a Retry that silently hangs on a spinner. The only recovery is a full page reload.

**Fix.** Add an explicit `attempt` counter: `const [attempt, setAttempt] = useState(0)`, make Retry `setAttempt(n => n + 1)`, and use `[attempt]` as the effect's dep. Wrap the parent's callback in `useCallback` (or drop it from the deps entirely, since the effect only needs it at call time via a ref).

> **worth-it review — upheld** (high confidence). Core mechanism confirmed at the cited lines. AdminContentEditor.tsx:946 is exactly `onClick={() => setProbeState('probing')}`; the probe effect closes at :923 with `}, [onAuthorized])`; the parent passes an inline arrow at :2208 (`<SessionGate onAuthorized={() => { setAuthorized(true); void refresh() }} />`). setProbeState does not change the dep, so the effect never re-runs and the gate renders "Checking admin session…" (:925) permanently. Two parts of the write-up are off. (1) The "re-fires on unrelated parent re-renders" half is theoretical: while `!authorized` the parent has no re-render source — its only timer, :2009-2022, returns early unless `buildStatus?.state === 'running'`. (2) Impact is narrower than stated: nginx/server.conf:195 applies `auth_request /internal/authcheck` site-wide and :209 proxies it to `stats_backend` (127.0.0.1:8788), so if site-stats is down the /admin page itself fails — the offline card only appears when the proxy dies after the SPA loaded, or in dev (`npm run dev:all`). Also, the recommended attempt counter + useCallback is more than needed; `onClick={() => window.location.reload()}` is a one-line fix.
>
> *Correction:* The dead-Retry bug is real and correctly located: app/admin/AdminContentEditor.tsx:946 sets `probeState` back to 'probing' while the probe effect's deps are `[onAuthorized]` (line 923), so nothing re-runs the probe and the gate shows the "Checking admin session…" card (line 925) until a page reload. Two claims should be dropped or softened: the inline callback at line 2208 does not in practice re-fire the probe on unrelated parent re-renders, because while `!authorized` the parent has no re-render source (its only timer, lines 2009-2022, bails unless a build is running); and the offline card is hard to reach in production at all, since nginx/server.conf:195/209 routes every request's auth_request to the same 127.0.0.1:8788 backend, so with site-stats down /admin does not load — the card appears mainly when the proxy dies after the SPA has loaded or in dev. Fix is one line rather than new state: make Retry `window.location.reload()`.

---

### 15. Download rows use array-index keys plus mount-only derived state, so deleting a row rewrites the surviving row's URL

**Code quality · high** · `app/admin/AdminPageWizard.tsx:1141`

```
{(card.downloads || []).map((dl, dlIdx) => (
            <DownloadRowEditor
              key={dlIdx}
```

**What it is.** DownloadRowEditor seeds three pieces of local state from the `dl.href` prop at mount only (lines 1218-1220: `base`, `filename`, `externalMode`) and then pushes the recombination back into the parent from an effect whose deps deliberately exclude the prop (lines 1222-1231, with `// eslint-disable-next-line react-hooks/exhaustive-deps`). Because the list is keyed by index and `removeDownload` (line 943) splices by index, deleting row 0 of two makes React reuse the row-0 instance for what was row 1. The instance keeps row 0's `base`/`filename`, the effect fires, and `updateDownload(cardIdx, 0, 'href', base+filename)` overwrites the surviving row's real href with the deleted row's URL.

**Impact.** An admin who removes a download link from a card in the New Page Wizard silently corrupts the URL of the link below it. The page publishes with a wrong download target and nothing in the UI flags it.

**Fix.** Give each download a stable `_localKey` the way cards already have one (used at line 978: `key={card._localKey}`) and key the map by it; add the key in `addDownload` (line 927). Then delete the local base/filename state and the write-back effect — derive the split from `dl.href` during render (the `matchedPreset` useMemo at line 1207 already does the parsing) and call `updateDownload` straight from the input's onChange.

> **worth-it review — upheld** (high confidence). Locations check out exactly: `key={dlIdx}` at AdminPageWizard.tsx:1141, `removeDownload` splicing by index at :943-945, mount-only derived state at :1218-1220, write-back effect with `// eslint-disable-next-line react-hooks/exhaustive-deps` at :1222-1231, `key={card._localKey}` at :978 and the `_localKey` convention at :260/:306. The inputs render from local state only (`value={externalMode ? '__external__' : base}` :1270, `value={filename}` :1298) with no prop→state sync, so index keys do preserve the deleted row's base/filename on the survivor. But the claimed trigger is wrong: the effect's deps are `[base, filename, externalMode]` (:1231), none of which change when a sibling is removed, so nothing is written back at delete time — wizard state keeps the survivor's correct href. The bad write happens only if the admin then edits that row's dropdown/filename. Also the mismatch is visible: the "Final URL:" preview (:1303-1305) renders the stale `${base}${filename}`, so "nothing in the UI flags it" is inaccurate. Recommendation is sound and matches existing convention (small diff, deletes state).
>
> *Correction:* The structural defect is real but the described failure mechanism is wrong. `DownloadRowEditor` rows are keyed by array index (app/admin/AdminPageWizard.tsx:1141) while `removeDownload` splices by index (:943-945), so deleting a non-last row makes React reuse the surviving row's component instance, which keeps the deleted row's mount-seeded `base`/`filename`/`externalMode` (:1218-1220). However, the write-back effect's deps are `[base, filename, externalMode]` (:1222-1231) — none change when a sibling is removed — so no `updateDownload` fires at delete time and the survivor's href in wizard state stays correct. What actually breaks: the URL dropdown and filename box (:1270, :1298) and the "Final URL" preview (:1303-1305) now display the deleted row's URL, contradicting the real value; and the moment the admin touches that row's base or filename, the effect writes `base+filename` built from the stale base, clobbering the survivor's real href. So it is a display desync that becomes corruption on the next edit, not silent corruption at delete, and the wrong URL is visible in the preview line rather than unflagged. The recommended fix is still the right one and is a net deletion: give each download a `_localKey` in `addDownload` (:927-934) the way cards already do (:260, :306, :978), key the map by it, drop the three `useState`s and the effect, and derive base/filename from `dl.href` during render calling `updateDownload` from onChange.

---

### 16. curl/wget guide commands are built from APENSUPPORT_BASE (empty string), producing root-relative paths no shell tool can fetch

**Code quality · high** · `app/docs/evaluate-stig/linux/ubuntu/STIGUbuntuCards.tsx:64`

```
<CodeBlock code={`sudo curl ${BASE}/Evaluate-STIG.tar.gz -o /var/evaluate-stig/Evaluate-STIG.tar.gz`} />
```

**What it is.** BASE here is URLS.evaluateStig (line 14 / lib/data/constants.ts:72), which is built from APENSUPPORT_BASE. constants.ts:22 sets `export const APENSUPPORT_BASE = ''` — deliberately, and its own doc comment at lines 24-30 says the ABSOLUTE constant is for "URLs consumed OUTSIDE the browser, where a root-relative path is meaningless". These CodeBlocks are exactly that case: the rendered command is `sudo curl /evaluate-stig/Evaluate-STIG.tar.gz -o ...`, which curl rejects for having no host. The same pattern appears in app/docs/evaluate-stig/linux/enterprise/STIGEnterpriseLinuxCard.tsx:69 and in the Trellix guides, e.g. app/trellix/ubuntu/TrellixUbuntuCards.tsx:41-42 (`sudo wget ${BASE}/install.sh`, `sudo wget ${BASE}/installdeb.sh`). I confirmed the built bundle still emits these as runtime template interpolations (`sudo curl ${h}/Evaluate-STIG.tar.gz`, `sudo wget ${u}/install.sh` in out/_next/static/chunks/), so the empty base reaches the page.

**Impact.** Every copy-paste download command in the Evaluate-STIG and Trellix install guides fails immediately with a URL error. These are the first step of each guide, so the whole procedure is blocked for anyone who follows it literally.

**Fix.** Use APENSUPPORT_ABSOLUTE for any URL that appears inside a CodeBlock. Either add absolute siblings to URLS (as reposDeb/reposRpm/reposPip/pdq/wingetSource already do for exactly this reason) or have CodeBlock-bound helpers prefix APENSUPPORT_ABSOLUTE. Grep for `CodeBlock` lines containing `${BASE}` to find the full set.

> **worth-it review — upheld** (high confidence). Every claim checks out. app/docs/evaluate-stig/linux/ubuntu/STIGUbuntuCards.tsx:14 `const BASE = URLS.evaluateStig`; :64 is the quoted CodeBlock verbatim. lib/data/constants.ts:22 `export const APENSUPPORT_BASE = ''`, :72 `evaluateStig: ${APENSUPPORT_BASE}/evaluate-stig`, so the rendered command is `sudo curl /evaluate-stig/Evaluate-STIG.tar.gz -o ...` — curl/wget reject a scheme-less, host-less path. Siblings confirmed: STIGEnterpriseLinuxCard.tsx:69, TrellixUbuntuCards.tsx:41-42, TrellixELCards.tsx:46-47, DRENTrellixELCards.tsx:53-54. components/common/CodeBlock.tsx does no rewriting — it copies `code` verbatim to the clipboard. Built output confirms it reaches users: out/_next/static/chunks contains `evaluateStig:"/evaluate-stig"` next to `reposDeb:\`${t}/repos/deb\``, plus `sudo curl ${u}/Evaluate-STIG.tar.gz`. The fix is not churn: it is the codebase's own established convention — constants.ts:69-71,75,82 already carry APENSUPPORT_ABSOLUTE siblings with comments giving exactly this rationale, and app/docs/ub/certificates/CryptoCards.tsx:24 already uses an absolute base inside a CodeBlock. One or two added URLS entries.

---

### 17. Click-to-copy code blocks are mouse-only: no role, no tabindex, no key handler

**Code quality · high** · `components/common/CodeBlock.tsx:32`

```
onClick={handleCopy}
      title="Click to copy"
    >
```

**What it is.** `CodeBlock` puts its copy action on a bare `<div>` (line 25) with an `onClick` and no `role`, no `tabIndex`, and no `onKeyDown`. `InlineCode` does the same on a bare `<code>` element (line 63: `onClick={handleCopy}`). Neither element is in the tab order and neither responds to Enter or Space, so the copy function is unreachable by keyboard and invisible to assistive technology — a screen reader announces only the code text, with no indication an action exists. `title="Click to copy"` is the only affordance and it is mouse-hover-only. These two components are imported by 17 files across the docs/downloads routes, so this repeats on most technical pages of the site.

**Impact.** WCAG 2.1.1 Keyboard (Level A) and 4.1.2 Name, Role, Value (Level A) failure on the primary interaction of the documentation pages. Keyboard-only and screen-reader users can still select the text manually, but the advertised control is inoperable for them — a Level A failure is the most severe class under the 508 Refresh.

**Fix.** Use a native `<button>` for the copy affordance instead of a click handler on a div/code element — one element change gets focusability, Enter/Space activation, and the button role for free. Give it a real accessible name (`aria-label={`Copy ${code}`}`) and announce the copied state with an `aria-live` region or `aria-label` swap rather than only a color/icon change.

> **worth-it review — upheld** (high confidence). Evidence verified verbatim. components/common/CodeBlock.tsx:25-34 is a bare `<div ... onClick={handleCopy} title="Click to copy">` with no role, tabIndex or onKeyDown; InlineCode at :62-65 is a bare `<code onClick={handleCopy} title="Click to copy" className={`code-inline ...`}>`. No global handler compensates: app/globals.css:224 `.code-inline` only adds `cursor-pointer select-all` styling. Keyboard-inoperable copy = WCAG 2.1.1/4.1.2 Level A, real on a .mil 508 site. Two inaccuracies, neither fatal: (1) 16 files import CodeBlock (grep of `import { CodeBlock }`), not 17 — and InlineCode has zero importers; every `code-inline` hit in app/ is the CSS class on a static `<code>`, so only CodeBlock ships the defect (hundreds of instances: 35 in app/dren/trellix/DRENTrellixUbuntuCards.tsx alone). (2) The recommendation to switch to `<button>` is not this codebase's convention — app/docs/ub/storage/StorageCards.tsx:105-106 already uses `role="button" aria-expanded={isOpen} tabIndex={0}` + `onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && ...}` in 8+ files. Copying that three-attribute pattern is the smaller, consistent diff.
>
> *Correction:* Accurate in substance, two details wrong. CodeBlock (components/common/CodeBlock.tsx:25-34) attaches copy to a bare div with only `onClick` and `title="Click to copy"` — no role, tabIndex or keydown — so the control is keyboard-inoperable and invisible to AT across 16 importing doc/download pages. InlineCode (:62-65) has the same defect but is dead code: nothing imports it; the widespread `code-inline` class usage is plain styling on static `<code>` elements. The fix should follow the existing in-repo pattern (`role="button" tabIndex={0} onKeyDown` for Enter/Space, as at app/docs/ub/storage/StorageCards.tsx:105-106) plus an aria-label, rather than restructuring to a native `<button>`; deleting InlineCode is the cheaper half of the fix.

---

### 18. Accessibility Statement names a remediation link that does not exist, and states no conformance basis

**Code quality · high** · `components/legal/accessibility.tsx:16`

```
If you use assistive technology and the format of any material on this site interferes with your ability to access information, please contact the APEN Support Team via the <strong>Report Accessibility Issue</strong> link in the footer.
```

**What it is.** The statement's only remediation path is a "Report Accessibility Issue" link "in the footer". No such link exists. components/layout/Footer.tsx renders exactly three groups: the eleven entries of `quickLinks` in lib/data/footer.ts (lines 7-22: Home, Mission, Terms, FOIA, No Fear, Links Disclaimer, Accessibility, Privacy & Security, Open Gov, Information Quality, Veteran's Crisis Line), the `contactInfo` mailto/DSN pair, and `<FeedbackLink />`, whose accessible name is "Open site feedback form" (components/ui/FeedbackLink.tsx:71). Grepping the whole app/ and components/ tree for "Report Accessibility" returns only this sentence. The page also asserts Section 508 commitment (line 8) without naming the technical standard applied (WCAG 2.0/2.1 Level AA per the 508 Refresh), the conformance level claimed, any known non-conformances, or a date/method of evaluation — the elements an agency 508 statement is expected to carry.

**Impact.** A disabled visitor who cannot use the site is told to click a link that is not on the page, so the mandated remediation channel is unreachable. On a public .mil site this is the single most legally exposed defect in the lens: the page that promises 508 compliance is itself the broken path, and it is the artifact a 508 complaint or an OCR/DoD CIO review would open first.

**Fix.** Either add a real footer control for accessibility reports (the simplest version: a second entry in `quickLinks` pointing at `mailto:cesc@army.mil?subject=Accessibility%20Issue`, which reuses the address already in contactInfo), or change line 16 to name the Feedback button and the cesc@army.mil address that actually exist. Separately, add the conformance basis: which standard (WCAG 2.1 AA), what level is claimed, when it was last evaluated, and any known exceptions.

> **worth-it review — upheld** (high confidence). Primary evidence verified verbatim at components/legal/accessibility.tsx:16 ("...via the <strong>Report Accessibility Issue</strong> link in the footer."). grep over app/ + components/ returns that sentence as the only "Report Accessibility" hit; lib/data/footer.ts:7-22 has no such entry. No WCAG/AA/evaluation-date text exists in the file (lines 4-21). So the core claim holds.

Two supporting details are wrong. (1) components/layout/Footer.tsx is imported only at app/home/page.tsx:6 and rendered at :78 — it is NOT on /accessibility. That page renders LegalWrapper's own footer (components/legal/LegalWrapper.tsx:38-42), which contains only "Official U.S. Army Information System" and an authority line: zero links, no mailto, no Feedback button. (2) The aria-label is components/ui/FeedbackLink.tsx:10, not :71 — the file is 16 lines.

Impact is overstated: FloatingAiAssistant (AppShell.tsx:77) still mounts on that page, so a feedback panel is reachable. And the recommended quickLinks entry would not appear on the accessibility page at all.
>
> *Correction:* components/legal/accessibility.tsx:16 directs users to a "Report Accessibility Issue" link in the footer that exists nowhere in the repo (grep over app/ and components/ returns only this sentence; lib/data/footer.ts:7-22 has no such entry). The misdirection is worse than reported in one way and milder in another: the site footer (components/layout/Footer.tsx, with its cesc@army.mil mailto and Feedback button) is only rendered on /home (app/home/page.tsx:6,78) — the /accessibility page renders LegalWrapper's own footer (components/legal/LegalWrapper.tsx:38-42), which has no links at all. But the floating assistant/feedback panel does mount on that page (components/layout/AppShell.tsx:77), so a contact channel is still on screen. The finder's line cite for FeedbackLink's aria-label is wrong (it is :10; the file is 16 lines). The recommended fix of adding a quickLinks entry would not show on the accessibility page; the correct one-line fix is to change line 16 to name the cesc@army.mil address (already in lib/data/footer.ts:27) and the Feedback button. The separate observation that the page claims Section 508 commitment (line 8) without naming WCAG 2.x Level AA, evaluation date/method, or known exceptions is accurate and unaddressed.

---

### 19. An update install overwrites lib/data/published-content.json and deletes generated custom-page routes — the two admin-authored artifacts that live outside proxy/

**Code quality · high** · `deploy/INSTALL.sh:126`

```
RSYNC_PROTECT=(
  --exclude '.env.local'
  --exclude 'proxy/*.json'
```

**What it is.** RSYNC_PROTECT (124-129) protects only .env.local, proxy/*.json and speedtest/logs/, and line 133 runs `rsync -a --delete`. Two admin-authored paths are outside that set. (1) lib/data/published-content.json — written by startPublishBuild at site-stats.mjs:603 and described in proxy/ADMIN_CONTENT.md:82 as "published ... permanent, survives updates" — is a normal source-tree file, so the bundle's copy from the build enclave replaces the target enclave's published baseline. (2) app/<category>/<slug>/page.tsx, generated per custom page by writeCustomPageSource (site-stats.mjs:845-858), is deleted by --delete for any page that exists only on the target enclave. deploy/README.md:98 promises the update "keeps this enclave's .env.local, node list, content overrides and custom pages" — the draft overrides and custom-pages.json are kept, the published baseline and the generated routes are not.

**Impact.** After a routine update the site renders another enclave's published card content as its defaults, and static routes for locally created custom pages 404 until someone re-publishes each one. Neither is flagged: VERIFY.sh checks node health, not content provenance.

**Fix.** Add `--exclude 'lib/data/published-content.json'` to RSYNC_PROTECT (gated off by --reset-content, like the proxy JSON), and either ship/regenerate the custom-page routes from custom-pages.json after install or exclude app/ subtrees named by that file. Fix the ADMIN_CONTENT.md:82 and README.md:98 claims to match whatever is implemented.

> **worth-it review — upheld** (high confidence). Mechanism confirmed: deploy/INSTALL.sh:124-129 protects only .env.local*, proxy/*.json, speedtest/logs/; line 133 is `rsync -a --delete`. lib/data/published-content.json is git-tracked and not excluded by scripts/make-airgap-bundle.sh:70-87, so it is replaced. app/<cat>/<slug>/page.tsx (site-stats.mjs:845-858, called only at 4542) is git-tracked and deleted by --delete. Impact is overstated, though. (1) No 404: nginx/server.conf:661-668 `try_files $uri $uri.html $uri/index.html /custom-pages/index.html;` renders any two-segment path from custom-pages.json, which IS preserved; site-stats.mjs:4541-4548 calls the generated route an optimization over that fallback. out/ is replaced wholesale anyway, so protecting app/ changes nothing until a rebuild. (2) lib/data/admin-content.ts:334 `return live !== null ? applyScopeOverride(defaults, live[scope], lockedFields) : baseline` — the preserved content-overrides.json (never cleared at publish, site-stats.mjs:600-608) wins outright, so only the prerender/no-JS/pre-hydration view shows the build enclave's values, and one Publish restores it. deploy/README.md:98 promises "content overrides and custom pages" — both are the proxy JSON files, both kept, so that promise is not broken.
>
> *Correction:* deploy/INSTALL.sh:133 (`rsync -a --delete`, RSYNC_PROTECT at 124-129) does overwrite the git-tracked lib/data/published-content.json and delete target-only generated routes app/<category>/<slug>/page.tsx — but neither causes the claimed loss. Custom pages do not 404: nginx/server.conf:668 falls back to /custom-pages/index.html for any two-segment path and renders from proxy/custom-pages.json, which is preserved; the generated route is explicitly documented (proxy/site-stats.mjs:4541-4548) as an optimization over that fallback, and out/ is replaced wholesale by the update anyway, so excluding app/ would change nothing until a rebuild. Card content is not lost either: lib/data/admin-content.ts:334 makes the live overlay (proxy/content-overrides.json, preserved by `--exclude 'proxy/*.json'` and never cleared by publish, site-stats.mjs:600-608) override the baked baseline entirely, so only the no-JS/pre-hydration paint briefly shows the build enclave's defaults, and a single Publish rewrites the snapshot. deploy/README.md:98's promise ("content overrides and custom pages") names exactly the two proxy JSON files that are kept, so it is not false. Residual defect: one line, `--exclude 'lib/data/published-content.json'` in RSYNC_PROTECT, worth taking for the prerendered baseline; the rest of the recommendation (regenerating or excluding app/ subtrees) is churn.

---

### 20. Air-gap installer starts both pm2 apps without ecosystem.config.js, so NODE_EXTRA_CA_CERTS is never set

**Code quality · high** · `deploy/INSTALL.sh:364`

```
pm2_as start npm --name apen-stats-api -- run stats
  pm2_as restart voltron-proxy --update-env 2>/dev/null \
    || pm2_as start proxy/voltron-proxy.mjs --name voltron-proxy
```

**What it is.** ecosystem.config.js:30 and :43 declare `NODE_EXTRA_CA_CERTS: '/etc/ssl/certs/ca-certificates.crt'` on both apps and its comment states it is "REQUIRED, not optional" because "Node ships its own Mozilla CA bundle and ignores the OS trust store", citing an actual 2026-08-04 outage caused by losing it. DEPLOY.md:135 correctly says `pm2 start ecosystem.config.js`. But deploy/INSTALL.sh:364-366 and MIGRATION.md:44-45 (`pm2 start proxy/site-stats.mjs --name apen-stats-api`) both start the apps by script/npm name and never reference ecosystem.config.js and never export NODE_EXTRA_CA_CERTS — I grepped deploy/, scripts/, DEPLOY.md and MIGRATION.md and the variable appears nowhere in them. Three divergent start procedures exist for the same two services. A secondary symptom of the same split: proxy/site-stats.mjs:622 hard-codes the assumption "PM2 launches this proxy via npm, so npm is on PATH for its daemon", which is true for INSTALL.sh:364 but not for the ecosystem.config.js form DEPLOY.md prescribes.

**Impact.** An enclave installed with the supported offline installer runs both backends without the internal CA bundle. Every outbound TLS call from the proxies — LDAPS login binds, infrastructure-node health probes, nginx VTS stats, the Voltron model endpoint — fails with UNABLE_TO_VERIFY_LEAF_SIGNATURE. Because auth_request in nginx/server.conf calls the stats API on every request, a login outage is site-wide, and it is the exact failure mode ecosystem.config.js was written to prevent.

**Fix.** Make ecosystem.config.js the single start path: replace deploy/INSTALL.sh:362-367 and MIGRATION.md:44-45 with `pm2 start ecosystem.config.js` (parameterising the CA path from enclave.env if it differs per enclave), and delete the npm-wrapper form so proxy/site-stats.mjs:622's PATH assumption no longer depends on which document the operator followed.

> **worth-it review — upheld** (high confidence). Verified every citation. deploy/INSTALL.sh:362-366 does `pm2_as delete apen-stats-api` then `pm2_as start npm --name apen-stats-api -- run stats` and `pm2_as start proxy/voltron-proxy.mjs --name voltron-proxy` — no reference to ecosystem.config.js. ecosystem.config.js:23-30 and :40-43 declare NODE_EXTRA_CA_CERTS, and the comment names the 2026-08-04 outage caused by exactly a delete+start. DEPLOY.md:135 uses the safe `pm2 start ecosystem.config.js`; MIGRATION.md:44-45 repeats the unsafe form. Repo-wide grep finds NODE_EXTRA_CA_CERTS only in ecosystem.config.js and .env.example:11 — nowhere in deploy/ or scripts/. package.json:13 `"stats": "node proxy/site-stats.mjs"` sets no env either. proxy/site-stats.mjs:622 does carry the "PM2 launches this proxy via npm, so npm is on PATH for its daemon" comment. Fix is one line and ecosystem.config.js already ships (scripts/make-airgap-bundle.sh rsyncs the repo, excluding only .next/.git/.env.local/state) — real value, not churn.
>
> *Correction:* The defect is real and the fix is a one-line swap, but the blast radius is overstated. proxy/site-stats.mjs:1281 sets `options.rejectUnauthorized = false` for proxied node probes and :1317 does the same for the nginx VTS fetch, so those two are unaffected by a missing CA bundle. The genuine exposure is LDAPS binds (proxy/ldap-domain.mjs passes no tlsOptions, so ldapts verifies by default), direct non-proxied infrastructure probes, and an HTTPS Voltron endpoint behind an internal CA — and it is conditional on the enclave using an internal CA (.env.example:11 notes a public CA needs nothing). Where it does bite, nginx/server.conf:195 gates the whole vhost on auth_request, so a broken LDAPS bind is a site-wide lockout. Worth adding: this INSTALL.sh block runs in update mode too, so it reproduces the 2026-08-04 wipe on an already-working host, not only on a fresh enclave.

---

### 21. All four Trellix download bases in constants.ts point at directories that do not exist on the file host

**Code quality · high** · `lib/data/constants.ts:62`

```
trellixAgent: `${APENSUPPORT_BASE}/trellix/agent`,
  drenTrellixAgent: `${APENSUPPORT_BASE}/dren/trellix/agent`,
  drenTrellixEns: `${APENSUPPORT_BASE}/dren/trellix/ens_tp`,
```

**What it is.** trellixAgent (line 62) and drenTrellixAgent / drenTrellixEns / drenTrellixPolicyAuditor (lines 87-89) are the BASE constants for every Trellix install guide (app/trellix/ubuntu/TrellixUbuntuCards.tsx:14, app/trellix/enterprise-linux/TrellixELCards.tsx:14, app/dren/trellix/DRENTrellixELCards.tsx:14-15, app/dren/trellix/DRENTrellixUbuntuCards.tsx:14-16). I ran `ls -d /var/www/html/trellix/agent /var/www/html/dren/trellix/{agent,ens_tp,policy_auditor}` — all four return "No such file or directory". out/trellix/ contains only the Next pages (enterprise-linux, reference, ubuntu). nginx/server.conf has no trellix location block, so these URLs fall through try_files to @legacy_files (server.conf:762, root /var/www/html) and 404. The real scripts are one level deeper: /var/www/html/trellix/installer/ub-trellix-install/agent/installdeb.sh, /var/www/html/trellix/installer/el-trellix-install/agent/installrpm.sh, and the DREN equivalents under /var/www/html/dren/trellix/installer/.

**Impact.** Every Trellix Agent, ENS, and Policy Auditor download link and wget/curl command on /trellix/ubuntu, /trellix/enterprise-linux, /dren/trellix/enterprise-linux and /dren/trellix/ubuntu returns 404. Users following the CUI endpoint-security install guides cannot obtain any installer, and because wget writes the 404 body to disk under the requested filename, they end up with an HTML file named install.sh that they then chmod +x and run.

**Fix.** Repoint the four constants at the paths that exist (e.g. `/trellix/installer/ub-trellix-install/agent`, `/trellix/installer/el-trellix-install/agent`, and the DREN mirrors), or add an nginx alias mapping /trellix/agent/ to the installer tree. Add a build- or deploy-time check that HEADs each URLS.* download base so a moved file tree fails loudly.

> **worth-it review — upheld** (high confidence). Confirmed at the exact lines. lib/data/constants.ts:62 `trellixAgent: ${APENSUPPORT_BASE}/trellix/agent`, :87-89 dren agent/ens_tp/policy_auditor; APENSUPPORT_BASE='' (constants.ts:22) so all are root-relative. Consumers match: TrellixUbuntuCards.tsx:14/41-42, TrellixELCards.tsx:14/46-47, DRENTrellixELCards.tsx:14-15/53-54/89, DRENTrellixUbuntuCards.tsx:14-16/49-50/76/107-108. ls confirms /var/www/html/trellix/agent and /var/www/html/dren/trellix/{agent,ens_tp,policy_auditor} do not exist; real scripts live under .../installer/{ub,el}-trellix-install/agent/. No trellix location in nginx/server.conf or the live /etc/nginx/conf.d/apen_support/, so requests fall to @legacy_files (server.conf:762-766, `try_files $uri $uri/ =404`). The strings are present in the deployed bundle (out/_next/static/chunks/*.js). Two details overstated: plain `wget` writes no file on 404 without --content-on-error, and ens_tp.tar.gz / paa-install.tar exist nowhere under /var/www/html.
>
> *Correction:* Accurate on the core defect: all four Trellix base constants (lib/data/constants.ts:62, 87-89) resolve to /trellix/agent and /dren/trellix/{agent,ens_tp,policy_auditor}, none of which exist under /var/www/html, and nginx has no trellix rule so they hit @legacy_files (nginx/server.conf:762-766) and 404. Two corrections. (1) The impact overstates the wget case: `wget` without --content-on-error prints the error and writes no file, so users get a failed download rather than an HTML file named install.sh; the chmod-and-run hazard is real only for the `curl -o` commands at app/dren/trellix/DRENTrellixUbuntuCards.tsx:76 and :107-108. (2) The recommendation is only half a fix: the two agent bases can be repointed at /trellix/installer/{ub,el}-trellix-install/agent and the DREN mirrors, but ens_tp.tar.gz and paa-install.tar exist nowhere on the file host (find over /var/www/html returns nothing), so those two constants need artifacts staged before any repoint is meaningful.

---

### 22. Every pip/uv guide command points at /repos/pip/simple/, which 404s — the real index is /repos/piprepo/

**Code quality · high** · `lib/data/repo-guides.ts:153`

```
{ type: 'code', code: `pip install <package-name> --index-url ${PIP_BASE}/simple/ --trusted-host apensupport.blcse.mil` },
```

**What it is.** PIP_BASE (line 138) is URLS.reposPip = `${APENSUPPORT_ABSOLUTE}/repos/pip`, so all eight pip/uv code blocks on /docs/repos/pip (lines 153, 160, 166, 180, 187, 213, 220, 226) resolve to https://apensupport.blcse.mil/repos/pip/simple/. I verified on this host that /var/www/html/repos/pip/ contains exactly one entry, index.html — there is no simple/ subtree. The actual PyPI simple index is the symlink /var/www/html/repos/piprepo -> /mnt/storage/repos/pip/wheels/simple, which nginx/server.conf serves under its own `location ^~ /repos/piprepo/` block (line 883, whose comment states the symlink target explicitly). nginx's `location ^~ /repos/` (line 862) roots at /var/www/html, so /repos/pip/simple/ falls through to the plain-text @repo_404 handler.

**Impact.** Every copy-paste command on the Python repository page fails. `pip install --index-url .../repos/pip/simple/` gets a 404 for every package lookup; `pip config set global.index-url` and the uv UV_DEFAULT_INDEX export persist the broken index into the user's machine config, so all subsequent pip/uv installs break until the setting is manually undone. The page is the only documentation of the mirror, so users have no way to discover the correct /repos/piprepo/ path.

**Fix.** Point PIP_BASE (or a new URLS.reposPipSimple) at the path nginx actually serves — `${APENSUPPORT_ABSOLUTE}/repos/piprepo` — and drop the `/simple/` suffix the guides append, since the symlink target IS the simple index. Then re-check each of the eight code blocks.

> **worth-it review — upheld** (high confidence). Verified verbatim. lib/data/repo-guides.ts:138 `const PIP_BASE = URLS.reposPip`; constants.ts:71 `reposPip: ${APENSUPPORT_ABSOLUTE}/repos/pip`. Line 153 matches the quoted evidence character for character, and grep confirms PIP_BASE + `/simple/` at 153,160,166,180,187,213,220,226 (226 is `--default-index`, still /simple/). nginx/server.conf:862 `location ^~ /repos/ { root /var/www/html; ... error_page 404 = @repo_404; }` — /var/www/html/repos/pip/ holds only index.html (no simple/), so every one of those URLs hits the plain-text 404 at server.conf:868. The real index is the symlink /var/www/html/repos/piprepo -> /mnt/storage/repos/pip/wheels/simple (1104 package dirs), served by server.conf:883. /etc/nginx/conf.d/apen_support/server.conf is byte-identical at those lines, so this is live. The rest of the codebase already uses the right path: proxy/repo-freshness.mjs:29 and proxy/infrastructure-nodes.json:75 both use `/repos/piprepo/`. URLS.reposPip has only two consumers, so the fix is a one-line constant change plus dropping the `/simple/` suffix — minimal, not churn.
>
> *Correction:* Accurate, but understates scope by one: app/docs/repos/pip/page.tsx:48 renders `{BASE}/simple/` as the advertised "APEN pip Mirror" URL in the info card (BASE = URLS.reposPip, page.tsx:12), so nine places on the page show the dead path, not eight. Also worth noting URLS.reposPip (constants.ts:71) has exactly two consumers — repo-guides.ts:138 and page.tsx:12 — so retargeting the constant to `${APENSUPPORT_ABSOLUTE}/repos/piprepo` and deleting the nine `/simple/` suffixes is the whole fix; no other caller breaks.

---

### 23. Announcement dedup key omits `text`, so 7 of 18 curated announcements never reach /home

**Code quality · high** · `lib/data/site-updates.ts:237`

```
const key = `${item.date}|${item.category ?? ''}|${item.href ?? ''}`
    if (seen.has(key)) return false
```

**What it is.** getAnnouncements() (site-updates.ts:250) pipes MANUAL_ANNOUNCEMENTS through mergeAnnouncements, whose identity key is date + category + href and ignores the announcement text. In lib/data/announcements.ts every entry from line 40 onward carries `date: ''` (violating the file's own header rule at line 9, "date format: 'YYYY-MM-DD'"), and eight of them share category 'VMware' with href '/downloads/vmware' (lines 42, 54, 58, 66, 70, 83, 87, 91). All eight collapse to the single key `|VMware|/downloads/vmware`. I reproduced the filter over the parsed file: 17 parsed entries in, 10 out, 7 dropped — every dropped one is a distinct VMware patch announcement (vCenter 8.0 U3g/U3e/U3d/U3c/U3b, vCenter 7.0 U3s/U3r).

**Impact.** The home-page Announcements feed silently hides seven curated VMware patch notices. Admins looking for whether a given vCenter/ESXi update has been staged see only one of the eight entries, and the loss is invisible — nothing logs or warns. Any future announcement that reuses an existing category+href pair with a blank date will vanish the same way.

**Fix.** Include `item.text` in the merge key (AnnouncementList.tsx:13 already builds its React key that way), and backfill real YYYY-MM-DD dates for the entries currently carrying `date: ''` — the sort at site-updates.ts:230 is also a no-op for them.

> **worth-it review — upheld** (high confidence). Mechanism confirmed verbatim. site-updates.ts:237 is exactly `const key = \`${item.date}|${item.category ?? ''}|${item.href ?? ''}\`` and announcements.ts lines 42,54,58,66,70,83,87,91 are all `category: 'VMware'` + `href: '/downloads/vmware'` + `date: ''` — 8 entries, one key, 7 dropped at site-updates.ts:250. announcements.ts:9 does say "date format: 'YYYY-MM-DD'". So the defect is real, not refuted.

Three corrections. (1) Count: MANUAL_ANNOUNCEMENTS has 17 entries (hrefs at lines 25–91), not 18. (2) Impact is overstated: getVmwarePatchAnnouncements (site-updates.ts:195-213) emits dated VMware entries for 2026-07-29/05-27/02-23 and 2025-12-15/06-10/02-20 (vmware.ts:112-115,131-134,157-158,173-174), so /home shows several VMware notices, and the dropped 7.0 U3s/U3r are already covered — only the five 8.0 U3g/U3e/U3d/U3c/U3b notices are truly lost, and all sit past DEFAULT_VISIBLE=5 (announcements.ts:107) at the tail. (3) The primary fix is wrong: auto text never matches curated text, so adding `item.text` to the key disables the dedup entirely and resurfaces duplicate pairs. Backfilling the dates is the fix.
>
> *Correction:* The dedup collision is real and verified: lib/data/site-updates.ts:237 keys announcements on date|category|href, and the eight MANUAL_ANNOUNCEMENTS entries at lib/data/announcements.ts:42,54,58,66,70,83,87,91 all carry date:'' + category:'VMware' + href:'/downloads/vmware', so seven collapse away at site-updates.ts:250. But the blast radius is smaller than reported: MANUAL_ANNOUNCEMENTS holds 17 entries (not 18), getVmwarePatchAnnouncements (site-updates.ts:195) independently emits dated VMware notices for U3k/U3j/U3i/U3h and 7.0 U3s/U3r from lib/data/vmware.ts:112-115,131-134,157-158,173-174 — so the home feed does show multiple VMware releases, and two of the seven dropped entries (7.0 U3s line 58, 7.0 U3r line 70) are already covered by those auto entries. Only the five historical vCenter 8.0 U3g/U3e/U3d/U3c/U3b notices are genuinely lost, and because '' sorts last at site-updates.ts:230 they would only ever render at the bottom of the list behind "Show all" (DEFAULT_VISIBLE = 5, announcements.ts:107). The recommended fix is also backwards: the auto-generated text ("VMware patch updates added: …") never equals the curated text, so adding item.text to the key would make the server-side dedup a no-op and start showing curated/auto duplicate pairs for the same release date — that dedup exists precisely to suppress a curated entry that restates an auto one. The correct one-line fix is to backfill real YYYY-MM-DD dates on the twelve entries currently carrying date:'' (lines 42-91), which resolves the collision, restores the sort, and leaves the intended dedup intact. Severity medium, not high: content loss is confined to five stale historical items below the fold.

---

### 24. Every state loader silently resets to defaults, and the first later save then persists the empty default over the last good data

**Code quality · high** · `proxy/site-stats.mjs:423`

```
const parsed = JSON.parse(readFileSync(CUSTOM_PAGES_FILE, 'utf8'))
  if (Array.isArray(parsed)) customPages = parsed
} catch {
```

**What it is.** Answering the startup question directly: nothing throws. Truncated, empty, or wrong-shape input is indistinguishable from "never existed" for contentOverrides (415-419), customPages (421-426), contentAuditLog (429-434), feedbackStorage (323-328), notificationOutbox (389-393), announcementPaths (2281-2287), assistantKnowledge (2332-2338), assistantPrompts (2360-2366), readRegistry (proxy/nginx-managed.mjs:127-135) and readCustomLibraryDirs (proxy/file-library.mjs:253-259). No process exits, so pm2's max_restarts:10 never trips — the proxy comes up healthy and empty. The loss becomes permanent on the next admin action, because commitCustomPagesToDisk/commitContentOverridesToDisk write the whole in-memory value: saving one card after a reset writes a file containing only that card.

**Impact.** Corruption presents as "the admin console lost my pages", not as an outage, so nobody restores from backup in the window before the next save makes it irreversible. custom-pages.json, content-audit.json (the admin audit trail), content-overrides.json and file-library-dirs.json are all gitignored with no other copy.

**Fix.** Split the catch: if the file exists but does not parse or does not match the expected shape, log at error level, record a system event through the existing /api/system-event path so it surfaces in /admin, and refuse to commit over that file until an operator clears it (keep serving defaults read-only in the meantime).

> **worth-it review — upheld** (high confidence). Every cited line checks out verbatim. proxy/site-stats.mjs:421-427 is exactly the quoted customPages loader; 413-419, 429-435, 323-328, 389-394, 2280-2286, 2331-2337, 2359-2365 all swallow every error identically, as do proxy/nginx-managed.mjs:127-134 and proxy/file-library.mjs:252-259. ENOENT and a truncated/garbage file are indeed indistinguishable, nothing exits, and ecosystem.config.js:22 max_restarts:10 is never reached. The overwrite claim holds: commitCustomPagesToDisk (791-795) and commitContentOverridesToDisk (437-441) `writeFileSync(...JSON.stringify(customPages...))` the whole in-memory value. Notably these use plain writeFileSync while the file's own session store uses temp+rename (writeSessionsFileAtomic, 738-754, comment at 728: "a process kill mid-write can't corrupt either file") — so the corruption window the finding assumes is real and already solved elsewhere in the same file. Two corrections: custom pages are NOT single-copy — writeCustomPageSource (845-857, called at 4542) emits app/<category>/<slug>/page.tsx, which is git-tracked, so content is recoverable; content-audit.json and file-library-dirs.json genuinely are not. And the recommended read-only-mode + system-event plumbing is more machinery than this warrants.
>
> *Correction:* The mechanism is real and correctly located: ten loaders (site-stats.mjs:323, 389, 413, 421, 429, 2280, 2331, 2359; nginx-managed.mjs:127; file-library.mjs:252) treat "file corrupt" the same as "file absent", and the next admin action overwrites the last good data because commitCustomPagesToDisk (791) and commitContentOverridesToDisk (437) serialize the whole in-memory value. The finding overstates impact on custom pages: writeCustomPageSource (845, called at 4542) also emits a git-tracked app/<category>/<slug>/page.tsx per page, so that content is recoverable; the genuinely single-copy losses are content-audit.json (the admin audit trail), content-overrides.json and file-library-dirs.json. The recommended fix is also heavier than needed — a read-only mode plus /api/system-event plumbing plus operator-clear workflow is a new subsystem for a single-maintainer box. The proportionate fix is already patterned in this file: switch these commits to the existing temp-file+rename approach of writeSessionsFileAtomic (738-754), which closes the mid-write truncation window, and in the loaders catch `err.code !== 'ENOENT'` to console.error and skip the subsequent write rather than silently defaulting. Severity medium, not high.

---

### 25. An atomic temp+rename writer exists but only two of eighteen state files use it

**Code quality · high** · `proxy/site-stats.mjs:439`

```
writeFileSync(CONTENT_OVERRIDES_FILE, JSON.stringify(contentOverrides, null, 2), 'utf8')
```

**What it is.** writeSessionsFileAtomic at 738-752 does the right thing (write tmp, chmod, renameSync) and is used only for admin-sessions.json and general-sessions.json; commitAuthEventsToDisk (1841-1847) repeats the same pattern inline for auth-events.json. Every other commit*ToDisk truncates the live file in place: commitContentOverridesToDisk (437), commitCustomPagesToDisk (791), commitContentAuditLogToDisk (882), commitNodesToDisk (1058), commitFeedbackToDisk (2246), commitNotificationSettingsToDisk (2252), commitNotificationOutboxToDisk (2258), commitAcknowledgedAlertIdsToDisk (2264), commitDismissalsToDisk (2270), commitAnnouncementPathsToDisk (2311), commitAssistantKnowledgeToDisk (2341), commitAssistantPromptsToDisk (2377), plus writeRegistry (proxy/nginx-managed.mjs:135) and writeCustomLibraryDirs (proxy/file-library.mjs:261). The header comment at 728-730 claims "Writes are atomic (temp file + rename) so a process kill mid-write can't corrupt either file" — true only of the two it describes.

**Impact.** pm2 (ecosystem.config.js:19 autorestart, max_restarts 10), a $SITEUPDATE-triggered restart, an OOM kill or a full disk during any of those fourteen writes leaves a half-written JSON file. Because every loader catches and resets to a default rather than refusing to start, the truncation is not visible as an error — it is visible as missing admin content.

**Fix.** Promote writeSessionsFileAtomic to a general writeJsonAtomic(path, value, mode) and route every commit*ToDisk, writeRegistry and writeCustomLibraryDirs through it. It is a mechanical change with no behavioral risk and removes the whole partial-write class.

> **worth-it review — upheld** (high confidence). Code facts check out. proxy/site-stats.mjs:439 matches the quoted line verbatim; writeSessionsFileAtomic (737-755, tmp + chmodSync + renameSync) is used only by commitAdminSessionsToDisk (762) and commitGeneralSessionsToDisk (767); commitAuthEventsToDisk (1840-1847) repeats the pattern inline. Every listed commit*ToDisk (437, 791, 882, 1058, 2246, 2252, 2258, 2264, 2270, 2311, 2341, 2377) plus nginx-managed.mjs:138 (writeRegistry, decl 136 not 135) and file-library.mjs:261 truncate the live file. Loaders do reset to defaults (site-stats.mjs:326 `feedbackStorage = []`; nginx-managed.mjs:132 `return { entries: [] }`; file-library.mjs:257 `return []`), so corruption is silent. Two corrections: the header at 728-732 says "either file" and is scoped to the session store, so it does not overclaim; and pm2's graceful restart cannot interrupt a synchronous writeFileSync (signals are delivered between ticks), so the real vectors are SIGKILL/OOM and ENOSPC, not `$SITEUPDATE` restarts. That narrows the window enough that high overstates it. The fix is still a mechanical one-helper change worth taking.
>
> *Correction:* Accurate as to code: an atomic writer exists at proxy/site-stats.mjs:737-755 but covers only admin-sessions.json and general-sessions.json, auth-events.json duplicates it inline at 1840-1847, and ~14 other state writers (site-stats.mjs:353, 439, 793, 884, 1060, 2248, 2254, 2260, 2266, 2272, 2313, 2343, 2379; nginx-managed.mjs:138; file-library.mjs:261) truncate the live file in place, with every loader silently falling back to an empty default. Two corrections to the report: the 728-732 comment says "either file" and is explicitly scoped to the two session stores, so it is not an overclaim; and a pm2/$SITEUPDATE graceful restart cannot interrupt a synchronous writeFileSync (Node delivers signals between ticks), so the exposure is limited to SIGKILL/OOM and ENOSPC — real but narrow, hence medium rather than high. The recommended writeJsonAtomic(path, value, mode) consolidation is still the right, lazy fix: one helper, ~14 one-line call-site changes, and it deletes the duplicated auth-events block.

---

### 26. A corrupt infrastructure-nodes.json is silently overwritten with defaults at startup, destroying the admin's node list

**Code quality · high** · `proxy/site-stats.mjs:1030`

```
if (infrastructureNodes.length === 0) {
  infrastructureNodes = DEFAULT_NODES
  try { writeFileSync(NODES_FILE, JSON.stringify(infrastructureNodes, null, 2), 'utf8') }
```

**What it is.** Load at 1021-1027 swallows every parse error and falls back to []. The very next statement (1028-1031) treats "empty" as "first run", assigns the hardcoded DEFAULT_NODES and immediately writes them back over NODES_FILE. A truncated file (the non-atomic commitNodesToDisk at 1058-1064 can leave one on a kill mid-write), a hand-edit with a stray comma, or a wrong-shape file all land in the same branch. The only signal is the absence of a log line — the seed write logs nothing on success.

**Impact.** The one on-disk copy of the admin-curated node list is destroyed at the moment the proxy restarts, before any human can look at it. infrastructure-nodes.json is gitignored (.gitignore:47) so there is no other copy except a deploy-time backup that the documented rollback never restores. The /admin#monitor tab silently reverts to stock tiles and every enclave-specific healthCheckUrl set per deploy/README.md is gone.

**Fix.** Distinguish "file absent" from "file unreadable": only seed DEFAULT_NODES when existsSync(NODES_FILE) is false. On a parse failure, rename the bad file aside (NODES_FILE + '.corrupt-<ts>'), log loudly, and start from DEFAULT_NODES in memory without writing.

> **worth-it review — upheld** (high confidence). Evidence confirmed verbatim. proxy/site-stats.mjs:1021-1032: the try/catch at 1022-1027 swallows every error and resets `infrastructureNodes = []`; 1028-1031 then treats empty as first-run, assigns DEFAULT_NODES and `writeFileSync(NODES_FILE, ...)` with no log on success. Nothing distinguishes absent from unparseable. commitNodesToDisk (1058-1064) is a plain non-atomic writeFileSync, and admin CRUD at 3702-3760 routes through it. Contrast reloadNodesIfChanged (1039-1054), which deliberately keeps current nodes on a parse error — the safer convention already exists in this file, so the fix is consistent, not new machinery; existsSync/renameSync are already imported at line 9 (~3 lines). Two inaccuracies: (1) .gitignore line is 48, not 47; (2) deploy/INSTALL.sh:109-113 copies all of proxy/ to the backup dir on an update install and line 113 prints "restore $BACKUP_DIR over $SITE_ROOT" — only deploy/README.md:138-144 omits proxy/. Also, the likeliest trigger is not corruption but DELETE of the last node (3745-3748 writes a valid `[]`), which the same branch reseeds. Loss is a re-enterable config list, so high overstates it.
>
> *Correction:* The mechanism is real and the quoted lines are exact: proxy/site-stats.mjs:1022-1031 cannot distinguish a missing infrastructure-nodes.json from an unparseable one — both fall into the `length === 0` branch, which assigns DEFAULT_NODES and silently writes them over the file, so a truncated write (commitNodesToDisk at 1058-1064 is non-atomic), a bad hand-edit, or an admin deleting the last node (DELETE at 3745-3748 writes a valid `[]`) loses the admin-curated node list on the next pm2 restart with no log line. Two impact corrections: .gitignore lists the file at line 48 (not 47), and deploy/INSTALL.sh:109-113 does copy all of proxy/ to /var/backups on an update install and prints "restore $BACKUP_DIR over $SITE_ROOT" as the rollback — it is only deploy/README.md:138-144 that restores out/ and the nginx conf alone. A stale copy therefore usually exists, and the lost data is a re-enterable list whose targets INSTALL.sh rewrites from SITE_FQDN anyway, making this a medium durability gap rather than high. The fix is worth the diff and matches an existing convention: reloadNodesIfChanged (1039-1054) already keeps current nodes on a parse error, and existsSync/renameSync are imported at line 9, so seeding only when `!existsSync(NODES_FILE)` and logging loudly otherwise is about three lines in one place.

---

### 27. /api/site-feedback reads an unbounded request body and appends to feedbackStorage with no cap

**Code quality · high** · `proxy/site-stats.mjs:3228`

```
req.on('data', c => { body += c.toString() })
        feedbackStorage.unshift(alert)
        queueNotification(alert)
```

**What it is.** Two defects in one handler. (1) The body is accumulated with no size limit, while readJsonBody() at line 2083 exists specifically to cap it at MAX_CONTENT_BODY_BYTES and is used by every /api/admin/* route. (2) The alert is unshifted with no trim, unlike the sibling /api/system-event handler which does `feedbackStorage = feedbackStorage.slice(0, 500)` at line 3197. Fields are unvalidated too: `message: data.message` and `data.category` are copied straight into the record with no type check or length bound. The same unbounded-body pattern repeats at lines 3271 (/api/acknowledged-alerts) and 3600 (/api/notification-settings).

**Impact.** An authenticated site visitor can grow the in-memory feedbackStorage array and feedback-history.json without limit — every entry is also re-serialized to disk on each POST (commitFeedbackToDisk), so the cost is quadratic. A single large POST body is buffered entirely in memory before parsing.

**Fix.** Replace the three hand-rolled `body += c.toString()` readers with the existing readJsonBody(req) helper, and add the same `feedbackStorage = feedbackStorage.slice(0, 500)` trim the system-event path already uses — the cap belongs next to the unshift so both writers share it.

> **worth-it review — upheld** (high confidence). Evidence confirmed. proxy/site-stats.mjs:3228 `req.on('data', c => { body += c.toString() })`, :3244 `feedbackStorage.unshift(alert)` with no trim, versus the sibling at :3196-3197 `feedbackStorage.unshift(alert)` / `feedbackStorage = feedbackStorage.slice(0, 500)`. readJsonBody exists at :2083 with MAX_CONTENT_BODY_BYTES = 512_000 (:141). grep shows slice(0,500) at :3197 is the only trim; the disk load at :325 is uncapped too. So the missing-cap half is real and the one-line fix is correct.

The body half is materially overstated. site-stats binds 127.0.0.1 (:58, :4746), so nginx is the only path, and nginx/server.conf:286-289 gives `/api/site-feedback` `client_max_body_size 64k;` plus `limit_req zone=feedback_limit` = `rate=2r/m` (:36). That is 8x tighter than readJsonBody's 512KB. The other two readers (:3271, :3600) sit behind admin-acl.inc (server.conf:339, :346) and nginx's 1m default. All three are also behind the site-wide `auth_request` gate (:195). Swapping them to readJsonBody adds a looser second cap — churn. "Quadratic"/"without limit" ignores 2 posts/min/IP at 64k each.
>
> *Correction:* What is actually true: feedbackStorage has no size cap on the /api/site-feedback write path. proxy/site-stats.mjs:3244 unshifts and calls commitFeedbackToDisk() without the `feedbackStorage = feedbackStorage.slice(0, 500)` that the sibling /api/system-event writer applies one screen up at :3197, and nothing else in the file trims the array (the disk reload at :325 is uncapped as well). The array and feedback-history.json therefore grow monotonically, and each POST re-serializes the whole array. Fix is one line: move/copy the existing slice(0, 500) to sit next to the unshift at :3244 so both writers share the cap. The body-reading half of the finding does not hold up: the hand-rolled reader at :3228 is fronted by nginx/server.conf:287 `client_max_body_size 64k;` and :288 `limit_req zone=feedback_limit` at rate=2r/m (server.conf:36), on a service that binds 127.0.0.1 only (site-stats.mjs:58, :4746), so the effective cap is already 8x tighter than readJsonBody's 512KB MAX_CONTENT_BODY_BYTES; the two sibling readers at :3271 and :3600 are additionally IP-allowlisted via admin-acl.inc (server.conf:339, :346). Rewriting those three readers is defense-in-depth churn, not a fix, and the "unbounded"/"quadratic" impact framing should be dropped — the writer is gated by the site-wide auth_request (server.conf:195) and limited to 2 posts per minute per IP.

---

### 28. voltron-proxy issues upstream LLM fetches with no timeout or AbortSignal

**Code quality · high** · `proxy/voltron-proxy.mjs:568`

```
const upstreamResponse = await fetch(upstream.url, {
        method: 'POST',
        headers,
```

**What it is.** Both upstream calls — the main chat call here and callUpstreamsForText() at line 380 — use bare fetch() with no `signal`. There is no AbortController anywhere in the file (grep for signal/timeout finds only the SIGINT/SIGTERM loop at line 685). site-stats.mjs does this correctly for its probes (AbortController + setTimeout at line 1485) and for nginx status (NGINX_STATUS_TIMEOUT_MS).

**Impact.** An upstream that accepts the TCP connection and then never answers hangs the request forever. Failover to the next configured upstream never triggers, because failover is driven by a returned status code or a thrown error. Worse, resolveAttachmentContext fans out up to 10 parallel summarization calls (line 429) that can all hang together on one attachment upload, pinning sockets and memory until the client gives up.

**Fix.** Add `signal: AbortSignal.timeout(ms)` to both fetch calls, with the timeout read from an env var alongside VOLTRON_MAX_TOKENS in getConfig(). A timeout is what makes the existing failover loop actually work.

> **worth-it review — upheld** (high confidence). Code claim confirmed. proxy/voltron-proxy.mjs:568 matches the quoted evidence verbatim; the second bare fetch is at :380 in callUpstreamsForText; `grep -n "AbortController|AbortSignal|signal|timeout"` over the file returns only line 685 (`for (const signal of ['SIGINT','SIGTERM'])`). The contrast with proxy/site-stats.mjs:1485-1488 (`const ctrl = new AbortController()` / `setTimeout(() => ctrl.abort(), node.timeoutMs ?? 5000)`) is real, and the 10-chunk fan-out is right (400_000/40_000, lines 28/33). But the stated impact is wrong on two points. (1) "hangs the request forever": this runs on Node v24, whose global fetch uses undici's default headersTimeout/bodyTimeout of 300s, and nginx/server.conf:283 sets `proxy_read_timeout 300s` on /api/voltron-chat, so the client is cut loose at 5 min either way. (2) "failover never triggers, because failover is driven by a returned status code or a thrown error": a stalled upstream *does* throw (UND_ERR_HEADERS_TIMEOUT), and both loops catch it — voltron-proxy.mjs:600-602 and :394-396 — and continue to the next upstream. So this is a tuning gap (300s per hop is uselessly long when nginx has already given up), not a hang.
>
> *Correction:* Both upstream LLM fetches (proxy/voltron-proxy.mjs:380 and :568) omit `signal`, and there is no AbortController in the file, unlike the probe path in proxy/site-stats.mjs:1485. The consequence is not an unbounded hang: on Node v24 undici's default 300s headers/body timeout throws, and both loops' catch blocks (:394, :600) fail over on a thrown error, while nginx/server.conf:283 caps the client at `proxy_read_timeout 300s`. The actual defect is that the implicit ceiling equals nginx's, so the first stalled upstream burns the entire client budget and the failover attempt lands after the browser has already taken a 504 — and a slow-trickling upstream can keep resetting bodyTimeout past even that. A one-line `signal: AbortSignal.timeout(ms)` on both fetches, with ms from an env var next to VOLTRON_MAX_TOKENS in getConfig(), is a cheap fix worth taking, but it should be set well under 300s to leave room for the retry, and not so low that legitimate long generations are killed.

---

### 29. `npm run typecheck` covers zero backend code — all 7,462 lines of proxy/*.mjs are outside tsconfig include

**Code quality · high** · `tsconfig.json:33`

```
"**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
```

**What it is.** tsconfig.json:31-36 includes only .ts/.tsx roots. allowJs is true (line 9) but checkJs is absent and no .mjs/.js glob is included, so `tsc --noEmit` never loads proxy/site-stats.mjs (4,746 lines), proxy/voltron-proxy.mjs (691), proxy/ldap-domain.mjs (297), proxy/file-library.mjs (535) or any of the other 13 proxy modules, nor scripts/*.mjs. I ran `npx tsc --noEmit`: it exits 0 with no output, which is accurate only for the 335 tracked .ts/.tsx files. The entire HTTP/API surface, the LDAP bind path and the nginx-config writer get no static checking of any kind.

**Impact.** `npm run validate` reports a green typecheck while the highest-risk code in the repo — every /api/* handler, session handling, the LDAP authenticator — is unchecked. A typo'd property or undefined-return in proxy code reaches production and is only discovered as a 500 at runtime, on a server where the memory notes say pm2 does not hot-reload and a bad deploy 502s the whole site through auth_request.

**Fix.** Either add `"allowJs": true` + `"checkJs": true` with `proxy/**/*.mjs` and `scripts/**/*.mjs` in tsconfig include (accepting an initial error backlog fixed with `// @ts-nocheck` headers retired file by file), or add a second `tsconfig.proxy.json` wired into the `typecheck` script so the gate at least covers proxy/ at `checkJs` level.

> **worth-it review — upheld** (high confidence). Mechanical claim confirmed. tsconfig.json:31-37 includes only `next-env.d.ts`, `**/*.ts`, `**/*.tsx`, `.next/types/**/*.ts`, `.next/dev/types/**/*.ts`; `"allowJs": true` at line 9, no `checkJs`. package.json:22 `"typecheck": "tsc --noEmit"`, wired into `validate` at line 24. `wc -l proxy/*.mjs` = 7462 (site-stats 4746, voltron-proxy 691, file-library 535, ldap-domain 297) — exact; there are 13 proxy modules total, not "13 others".

Two impact claims do not survive. (1) "no static checking of any kind" is false: eslint.config.mjs:8-19 ignores only `proxy/*.json`, and eslint-config-next's flat config sets `files: ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}']` (node_modules/eslint-config-next/dist/index.js:112), so `eslint .` parses every proxy module. (2) The LDAP path is not unchecked: tests/ldap-domain.test.ts:32 imports `../proxy/ldap-domain.mjs`, as do tests for blocked-hosts, file-library, selfheal-log, site-stats-probe and assistant-knowledge — under `allowJs` those load into the tsc program with call sites checked, plus runtime tests.

Value is poor: backend is deliberately plain node ESM with no build step (package.json:12-13), and `checkJs` over 7.4k untyped lines yields a backlog the finder proposes to bury under `@ts-nocheck` — a green gate over suppressed files, for one maintainer.
>
> *Correction:* tsconfig.json:31-37 includes only .ts/.tsx roots and `checkJs` is absent (line 9 has `allowJs: true`), so `tsc --noEmit` never reports errors in the bodies of proxy/*.mjs or scripts/*.mjs — most materially the two large un-imported servers, proxy/site-stats.mjs (4,746 lines) and proxy/voltron-proxy.mjs (691). The finding overstates this on two counts: proxy modules are still linted, since eslint.config.mjs:8-19 ignores only `proxy/*.json` and eslint-config-next applies to `**/*.mjs` (node_modules/eslint-config-next/dist/index.js:112); and six proxy modules including proxy/ldap-domain.mjs (tests/ldap-domain.test.ts:32) and proxy/file-library.mjs (tests/file-library.test.ts:22) are imported by tests, so they enter the tsc program under `allowJs` with their call sites checked and carry runtime tests via `npm test`. The proposed fix is not worth the diff here: the backend is deliberately plain node ESM with no build step (package.json:12-13) shipped as-is in the air-gap bundle, and enabling `checkJs` produces a backlog the finder would suppress with per-file `@ts-nocheck` — a gate reporting green over the same unchecked code, for a single maintainer. Low: a real, by-design coverage gap, not a defect to act on.

---

### 30. Post-login open redirect: sanitizeNext() misses backslash-prefixed paths

**Security · high** · `app/login/page.tsx:28`

```
if (trimmed.startsWith('//')) return '/home'
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return '/home'
  if (!trimmed.startsWith('/')) return '/home'
```

**What it is.** sanitizeNext() only rejects values starting with `//` or a scheme. A value such as `/\evil.com` (sent as `?next=/%5Cevil.com`, or double-encoded `%252F%255C...` since the function decodeURIComponent()s again) passes every check and is handed to window.location.assign() at line 81. Per the WHATWG URL parser, for special schemes a backslash after the leading slash enters the special-authority-ignore-slashes state, so `/\evil.com` resolves to `https://evil.com/`. StaticLink's normalizeStaticHref() happens to neutralise this for backHref (it re-parses with new URL and keeps only pathname), but the login page navigates with the raw string. proxy/site-stats.mjs sanitizeInternalPath() (line 1691-1696) has the same gap.

**Impact.** A crafted link `https://apensupport.blcse.mil/login/?next=/%5Cattacker.host` shows the genuine login form; after the user authenticates with real AD credentials the browser is sent off-site. Classic phishing chain: attacker page mimics a second login prompt or a 'session expired' screen. Confidence is high because the code path is a direct read-then-assign with no other filter.

**Fix.** Replace the hand-rolled checks with a same-origin parse: `const u = new URL(trimmed, window.location.origin); if (u.origin !== window.location.origin) return '/home'; return u.pathname + u.search + u.hash`. Apply the same fix in proxy/site-stats.mjs sanitizeInternalPath() (reject any `\\` or re-parse with URL). Add a unit case for `/\\evil.com`, `/\/evil.com`, and `/%5Cevil.com`.

> **exploitability review — upheld** (high confidence). Evidence verified verbatim. app/login/page.tsx:28-30 are exactly the three quoted lines inside sanitizeNext(); line 78 `const next = sanitizeNext(params?.get('next') ?? null)` reads window.location.search and line 81 `window.location.assign(next)` navigates with the raw string — no other filter. proxy/site-stats.mjs:1691-1695 has the identical gap. Reachability confirmed: nginx/server.conf:737-742 `location /login/ { auth_request off; ... }` serves the static export with no ACL and the query string untouched (blocked-hosts/admin-acl do not apply), so any crafted link `/login/?next=/%5Cevil.com` renders the genuine form. nginx/login-redirect.inc:20 only limits nginx-generated links, not attacker-supplied ones — the file's own comment even names client-side re-validation as the guard. nginx/security-headers.inc CSP has `form-action 'self'` and `base-uri 'self'` but nothing constrains window.location.assign. WHATWG relative-slash → special-authority-ignore-slashes makes `/\evil.com` resolve to https://evil.com/. Only correction: severity. Exploitation needs the victim to complete a real AD login, and on this enclave an off-net redirect target is often unreachable (internal hosts still work), so medium fits better than high.
>
> *Correction:* Confirmed as written, with severity adjusted to medium. sanitizeNext() (app/login/page.tsx:22-31) rejects `//`, schemes and non-rooted values but not a backslash after the leading slash, so `?next=/%5Cevil.com` survives and is passed raw to window.location.assign() (app/login/page.tsx:81), which the WHATWG URL parser resolves to https://evil.com/. The path is reachable: nginx/server.conf:737 serves /login/ with `auth_request off` and no ACL, and the CSP in nginx/security-headers.inc constrains form-action/base-uri but not script-driven navigation. proxy/site-stats.mjs:1686-1697 sanitizeInternalPath() has the same gap (admin-authenticated backHref input, so lower reach). Severity is medium rather than high because the redirect fires only after the victim completes a genuine login, and the destination must be reachable from the enclave — an internal host works, an internet host generally does not. Fix is the same: re-parse with `new URL(trimmed, origin)` and keep pathname+search+hash only when the origin matches.

> **mitigation review — upheld** (high confidence). Evidence confirmed verbatim. app/login/page.tsx:28-30 are exactly the three quoted lines; line 78 `const next = sanitizeNext(params?.get('next') ?? null)` and line 81 `window.location.assign(next)` complete the read-then-assign path with no other filter. `/\evil.com` passes all three guards (not `//`, no scheme, starts with `/`), and the WHATWG relative-slash -> special-authority-ignore-slashes transition makes location.assign resolve it to https://evil.com/. I looked for the mitigations my lens asks about and found none: nginx/security-headers.inc CSP has `form-action 'self'` and `base-uri 'self'` but nothing constraining script-initiated navigation; nginx/login-redirect.inc:20 (`error_page 401 = /login/?next=$uri;`) only covers the server-generated case, not a hand-crafted link; /login/ is unauthenticated by design, so admin-acl.inc/blocked-hosts.inc do not apply; out/login/index.html confirms the page is live. The finder's own caveats check out: lib/utils/static-link.ts:25 re-parses with `new URL` and keeps pathname only, so StaticLink is safe; proxy/site-stats.mjs:1686-1697 does share the gap. Severity is the only overstatement.
>
> *Correction:* The defect is real and correctly located: sanitizeNext() at app/login/page.tsx:22-31 accepts `/\host`, and app/login/page.tsx:81 hands it straight to window.location.assign(), producing a post-authentication open redirect; no nginx ACL, CSP directive, or downstream normalizer intercepts this path. Severity should be medium rather than high. The redirect fires only after the user has already submitted credentials to the genuine origin, so nothing is exfiltrated by the redirect itself — exploitation requires a second, convincing fake login prompt on an attacker-controlled host that is reachable from a restricted-enclave workstation, and Referrer-Policy "no-referrer" (nginx/security-headers.inc:4) means the destination learns nothing from the referer. `next` is never reflected into the DOM, so there is no XSS component. The sibling gap in proxy/site-stats.mjs:1686-1697 is lower impact still: it validates admin-authored backHref values (already a trusted LDAP-group input) and lib/utils/static-link.ts:25 re-parses the result with `new URL`, keeping only pathname/search/hash, which collapses `/\evil.com` to `/`. The recommended same-origin `new URL(...)` parse remains the right one-line fix in both places.

---

### 31. Published Privacy Act Statement is false: site stores usernames, IPs, user-agents, free-text feedback and full chat transcripts

**Security · high** · `components/legal/privacy-security.tsx:9`

```
This system is governed by the <strong>Privacy Act of 1974</strong>. Information collected (such as CAC credentials or session logs) is used solely for authentication and security auditing within the APEN infrastructure.
```

**What it is.** The site's only privacy notice claims collection is limited to "CAC credentials or session logs" used "solely for authentication and security auditing", and at line 25 that cookies "do not collect PII". The code collects far more: proxy/site-stats.mjs:1859-1871 (recordAuthEvent) stores the typed username, source IP and User-Agent; :3227-3244 (/api/site-feedback) stores a submitter-supplied name plus unbounded free text; :3060-3079 stores full chat transcripts keyed to (realm, username); :2620-2622 (parseLogs/aggregatePeriod) builds a per-IP browsing profile (every IP mapped to every site path it visited, with counts) served by /api/site-stats at :3618. None of that is "solely for authentication and security auditing", and none of it is disclosed. There is no system-of-records notice, no categories-of-records list, no routine-uses statement, and no retention schedule anywhere in the repository.

**Impact.** A .mil site publishes a Privacy Act Statement that materially understates what personal data it collects and why — a compliance defect in its own right (5 U.S.C. 552a(e)(3)/(e)(4)) and a basis for users to consent to monitoring they were never told the scope of. It also leaves the program with no documented authority or retention schedule for records it is in fact keeping.

**Fix.** Rewrite privacy-security.tsx to enumerate each actual store (auth events, feedback, chat transcripts, access-log-derived visitor analytics, admin content-audit workstation/IP attribution), state the authority, purpose, routine uses, whether disclosure is voluntary, and a retention period for each, and remove the "These do not collect PII" claim or scope it strictly to the session cookie.

> **exploitability review — upheld** (high confidence). Every cited location checks out. components/legal/privacy-security.tsx:9 contains the quoted Privacy Act sentence verbatim, and :25 has "These do not collect PII". It is rendered by app/privacy-security/page.tsx and is present in the static export (out/privacy-security/index.html), so it is live. A repo-wide grep for "privacy act|system of records|routine use|retention" returns only those two lines — no SORN, categories, routine uses, or retention schedule exists anywhere. The stores are real: proxy/site-stats.mjs:1859-1871 recordAuthEvent persists typed username, x-real-ip and user-agent; :3238-3239 stores submitter-supplied `data.name` and `data.message`; :3075-3081 pushes a transcript keyed to realm+username; :2613-2619 builds per-IP→per-path visit counts, surfaced via buildConnectionList (:2570) → topIPs (:2634) → /api/site-stats (:3618). The notice also says "CAC credentials" while auth is an LDAP password bind — a further misstatement. Under my exploitability lens there is no attacker-triggerable path; this is a disclosure/compliance defect, so high overstates it relative to auth-bypass-class findings.
>
> *Correction:* Confirmed as written, with one severity adjustment. The live Privacy Act Statement (components/legal/privacy-security.tsx:9, shipped at out/privacy-security/index.html) does materially understate collection: the site persists typed usernames + source IP + User-Agent (proxy/site-stats.mjs:1859-1871), submitter-named free-text feedback (:3238-3239), full chat transcripts keyed to realm+username (:3075-3081), and per-IP browsing profiles mapping each IP to every path it visited (:2613-2619, exposed via :2570/:2634/:3618) — none of which is "solely for authentication and security auditing", and none disclosed. No SORN, routine-uses or retention text exists in the repo. It also claims "CAC credentials" when authentication is an LDAP simple/GSSAPI bind. However, nothing here is attacker-reachable or triggerable: it is a compliance and disclosure defect, not a vulnerability, so medium is the honest severity on a scale shared with exploitable auth findings.

> **mitigation review — upheld** (high confidence). Quoted text verified verbatim at components/legal/privacy-security.tsx:9 and :25, and the stores exist: proxy/site-stats.mjs:1859-1871 (typed username, ip, userAgent), :3238-3243 (data.name + data.message), :3076-3081 (realm/username transcripts), :2614-2620 (per-IP path counts). So the "notice is incomplete" core stands. But the finder missed three mitigations. (1) components/legal/LegalWrapper.tsx:19-20 wraps this very page: "you consent to monitoring and have NO EXPECTATION OF PRIVACY" — the consent claim in "Impact" is wrong. (2) LegalWrapper.tsx:41 publishes authority: "Auth: 10 U.S.C. 3013; AR 25-1; AR 25-2; AR 27-60", contradicting "no documented authority". (3) components/ui/APEN-chat-assistant.tsx:1610-1614 puts the same USG monitoring banner directly above the chat transcript, at the point of collection. Also, the per-IP profile is not public: nginx/server.conf:374-375 gates /api/site-stats behind admin-acl.inc, and the cookie itself holds only an opaque id (site-stats.mjs:2969), making "do not collect PII" defensible. Residual defect is documentation-only, no exposure or attacker capability.
>
> *Correction:* The Privacy Act Statement at components/legal/privacy-security.tsx:9 is genuinely narrower than what the site stores — it names only "CAC credentials or session logs" for "authentication and security auditing", while proxy/site-stats.mjs also retains submitter-supplied feedback names and free text (:3238-3243) and full chat transcripts keyed to realm/username (:3076-3081), neither of which is an auth or audit record. That is a documentation gap worth fixing (add categories of records, routine uses, voluntariness and a retention period, and scope the cookie sentence to the opaque session id). It is not a high-severity security defect: the standard DoD consent-to-monitoring notice appears on every legal page (components/legal/LegalWrapper.tsx:19-20) and directly above the chat transcript at the point of collection (components/ui/APEN-chat-assistant.tsx:1610-1614); the authority the finder says is absent is published at LegalWrapper.tsx:41 ("Auth: 10 U.S.C. 3013; AR 25-1; AR 25-2; AR 27-60"); the per-IP browsing profile is served only behind the admin IP allowlist (nginx/server.conf:374-375, admin-acl.inc); and the session cookie carries only an opaque id (proxy/site-stats.mjs:2969), so the "do not collect PII" sentence is defensible as written. No data exposure and no attacker capability follow from this finding.

---

### 32. Sign-out leaves prior user's chat in sessionStorage; next user's login auto-uploads it to their server transcript

**Security · high** · `components/ui/APEN-chat-assistant.tsx:612`

```
useEffect(() => {
    if (!isVisible || !messages.length) return
    fetch(API_ENDPOINTS.chatHistory, {
```

**What it is.** The widget seeds state from sessionStorage (line 397: `useState<Message[]>(readStoredMessages)`) and an effect at lines 612-620 PUTs the whole message list to /api/chat-history with `credentials: 'include'` whenever messages is non-empty and the widget is visible. Sign-out (components/layout/Navbar.tsx:278-281) only calls /api/auth/logout, clears the CSRF token, and does `window.location.replace('/login/')`; it never calls clearAssistantSession(), and sessionStorage survives same-tab navigation. On a shared workstation, user A's transcript stays in the tab; when user B signs in, the GET hydrate (line 631-636) returns [] for a new user so A's local copy is kept, and the PUT effect immediately writes A's transcript under B's (realm, username) record in proxy/chat-history.json. It is also sent as context on B's first question and shown to B on screen and on B's other devices.

**Impact.** Cross-user disclosure of chat content (which may include pasted logs, hostnames, credentials in error output) on shared DoD workstations, plus mis-attribution of A's conversation to B in the admin 'audit' transcript view and its CSV/PDF exports.

**Fix.** Call clearAssistantSession() (and clear ratings/theme keys) in the sign-out handler before navigating, and clear it again on successful login. Additionally, have the widget drop local messages when the server GET returns a 401/empty result for a freshly authenticated session, or key the sessionStorage entry by the signed-in username so a different user never inherits it.

> **exploitability review — upheld** (high confidence). Evidence verified verbatim. components/ui/APEN-chat-assistant.tsx:612-620 is exactly the quoted PUT effect (`credentials: 'include'`, deps `[isVisible, messages]`, no `open` gate, so it fires on mount). Line 397 `useState<Message[]>(readStoredMessages)` seeds from sessionStorage (lib/assistant/storage.ts:8-10). Sign-out is components/layout/Navbar.tsx:279-282: `await adminContentClient.logout(); adminContentClient.clearToken(); window.location.replace('/login/')` — clearAssistantSession is called only from clearChat (line 1018), nowhere in sign-out or login. Login does `window.location.assign(next)` (app/login/page.tsx:81), same tab, so sessionStorage survives; AppShell.tsx:27-34,77 unmounts the widget on /login but remounts it on the next page. Server side proxy/site-stats.mjs:3042-3082 authenticates by cookie and upserts under `chatHistoryKey(session.realm, session.username)` — so B's cookie writes A's text under B. GET hydrate (626-640) only overrides when the server copy is non-empty, so A's copy survives for a new user. Prior messages are also resent as context (line 868, 881). Exploitability is local only: no remote attacker path, same-origin and session checks work; it needs the same browser tab on a shared workstation.
>
> *Correction:* The technical chain is accurate as written and every cited line checks out, but the severity should be medium rather than high because there is no remote attacker path. Sign-out (Navbar.tsx:279-282) never calls clearAssistantSession(), so user A's transcript stays in the tab's sessionStorage; when user B signs in on the same tab (login does window.location.assign, app/login/page.tsx:81) the widget remounts, seeds messages from storage (line 397) and the effect at 612-620 PUTs them with B's session cookie, which site-stats.mjs:3060-3082 stores under B's realm+username — real cross-user disclosure, mis-attribution in the admin transcript/audit view, and A's text resent as chat context (line 868/881). However the nginx routing, same-origin check (site-stats.mjs:3043) and session authentication all behave correctly; triggering it requires physical reuse of the same browser tab on a shared workstation, not anything an external attacker can reach or induce, so it is a client-side data-retention defect of medium severity.

> **mitigation review — upheld** (high confidence). Evidence confirmed verbatim. components/ui/APEN-chat-assistant.tsx:612-614 is exactly the quoted PUT effect (`if (!isVisible || !messages.length) return` then `fetch(API_ENDPOINTS.chatHistory,` with `credentials:'include'`); state is seeded from sessionStorage at line 397 via readStoredMessages (lib/assistant/storage.ts:8-10). Navbar.tsx:278-282 handleSignOut only calls logout/clearToken/`window.location.replace('/login/')`. I looked for the mitigations: grep shows clearAssistantSession is called only from clearChat (line 1018); no login page, SessionIdleRedirect, or admin-content client clears the assistant keys. Server side confirms the leak lands under the new user: proxy/site-stats.mjs:3052 keys by `session.realm, session.username` and 3070-3074 replaces `existing.messages` wholesale, so B's own transcript is also destroyed. Prior messages are also resent as context (line 881 buildAssistantRequestMessages). One correction: AppShell.tsx:33 makes /login chromeless, so the widget never mounts while logged out; the write happens on B's first non-login page. Preconditions (same tab reused, sessionStorage dies with the tab, all users authenticated LDAP staff) make high inflated.
>
> *Correction:* The mechanism is real and unmitigated: nothing outside clearChat calls clearAssistantSession, so user A's transcript survives sign-out in the tab's sessionStorage, and once user B logs in and loads any non-/admin page the effect at components/ui/APEN-chat-assistant.tsx:612 PUTs A's messages with B's cookie, where proxy/site-stats.mjs:3070-3074 stores them under B's realm+username (also overwriting B's own stored transcript) and the widget resends them as context at line 881. Two corrections to the report: the widget is not mounted on /login at all (components/layout/AppShell.tsx:33 CHROMELESS_PATHS), so the write occurs on B's first ordinary page rather than at the login screen; and severity is medium, not high — exploitation requires the same browser tab to be handed from one authenticated LDAP user to another without closing it (sessionStorage is per-tab and dies with the tab), the audience is trusted internal staff, and the practical impact is mis-attribution/loss of chat transcripts rather than exposure of credentials or admin capability.

---

### 33. INSTALL.sh hands root-cron-executed maintenance scripts to the web service account

**Security · high** · `deploy/INSTALL.sh:164`

```
else rsync -a --exclude '*.log' "$HERE/customsh/" /var/www/customsh/; fi
  run "chown -R '$RUN_USER':'$RUN_USER' /var/www/customsh"
```

**What it is.** After copying the maintenance scripts, INSTALL.sh chowns the whole /var/www/customsh tree to RUN_USER (dod_admin, the account the pm2 Node backends run as). On this host /var/www/customsh/1-crontab_jobs shows root cron running those very files (`0 0 * * * root /var/www/customsh/backup.sh`, `10 0 * * * root /var/www/customsh/daily_updates.sh`) and ls confirms they are already dod_admin-owned here; INSTALL.sh reproduces that layout on every enclave. Line 167 does the same `chown -R` over $SITE_ROOT, so node_modules and every script the admin Publish flow spawns (`npm run build` with shell:true in proxy/site-stats.mjs:625) also become writable by the service account.

**Impact.** Any code execution as dod_admin (a bug in site-stats.mjs / voltron-proxy.mjs, or an admin abusing content publish which already runs `npm run build` as that user) can edit backup.sh or daily_updates.sh and obtain root at the next cron tick. This turns the LDAP-admin/nginx-ACL gate into a root boundary.

**Fix.** Install /var/www/customsh as root:root 0750 (only the few files the site itself must write, e.g. nothing, should be dod_admin-owned). Drop the `chown -R` at line 164; at line 167 chown only the paths the proxy must write (proxy/, out/, app/ if page-source generation is kept) and leave node_modules, scripts/, customsh root-owned, matching the hardening already applied on this box.

> **exploitability review — upheld** (high confidence). Evidence confirmed verbatim: deploy/INSTALL.sh:163-164 `else rsync -a --exclude '*.log' "$HERE/customsh/" /var/www/customsh/; fi` / `run "chown -R '$RUN_USER':'$RUN_USER' /var/www/customsh"`, and :167 `run "chown -R '$RUN_USER':'$RUN_USER' '$SITE_ROOT'"`; RUN_USER is derived from SITE_ROOT owner (:77) = dod_admin. Root cron over that tree is real on this host: /etc/crontab:26 `0 0 * * * root /var/www/customsh/backup.sh` (backup.sh is dod_admin:dod_admin 0700), /etc/cron.d/apt-mirror:3 and /etc/cron.d/el-reposync:1 also run root scripts from /var/www/customsh, whose directory is dod_admin-owned. Corrections: (a) /etc/crontab:27 daily_updates.sh is COMMENTED OUT, contra the description; (b) INSTALL.sh installs no cron at all (no `cron` match in the file) — it ships 1-crontab_jobs as documentation, so the root-cron half of the chain is host config, not installer-created; (c) dod_admin is already in the `sudo` group, so it is an admin account by design — cron only removes the password step. Exploitability is second-stage: it needs prior code exec as dod_admin (admin-gated publish spawns `npm run build`, site-stats.mjs:625), not a directly reachable remote path. Real privesc hardening gap, not high.
>
> *Correction:* deploy/INSTALL.sh:164 does chown -R the entire /var/www/customsh maintenance-script tree to RUN_USER (the pm2/service account, dod_admin per the :77 derivation), and :167 does the same over all of SITE_ROOT including node_modules, and on this host root cron really does execute files in that tree (/etc/crontab:26 backup.sh, /etc/cron.d/apt-mirror:3, /etc/cron.d/el-reposync:1) — so anyone who gets code execution as dod_admin can edit those scripts and be run as root at the next tick. Three corrections to the original report: /etc/crontab:27 daily_updates.sh is commented out on this box; INSTALL.sh contains no cron installation at all (it only copies the scripts and the 1-crontab_jobs reference file, so the root-cron side of the chain depends on the enclave admin installing it); and dod_admin is already a member of the `sudo` group, so this is a password-free shortcut to root for an already-privileged service account rather than a crossing of an otherwise intact boundary. There is no directly reachable remote trigger — the chain requires first obtaining execution as dod_admin (e.g. via the LDAP-admin- and nginx-ACL-gated publish flow that spawns `npm run build` at proxy/site-stats.mjs:625), which makes this a defense-in-depth/hardening defect rather than a high-severity remote issue.

> **mitigation review — upheld** (high confidence). Evidence verbatim-confirmed: deploy/INSTALL.sh:163-164 `else rsync -a --exclude '*.log' "$HERE/customsh/" /var/www/customsh/; fi` / `run "chown -R '$RUN_USER':'$RUN_USER' /var/www/customsh"`, and :167 the same over $SITE_ROOT. RUN_USER defaults to the SITE_ROOT owner (INSTALL.sh:77-78) = dod_admin. The root-cron path is live, not hypothetical: /etc/crontab:26 `0 0 * * * root /var/www/customsh/backup.sh` (uncommented), plus /etc/cron.d/apt-mirror:3 and /etc/cron.d/el-reposync:1 both run root scripts out of that tree. ls shows /var/www/customsh drwx------ dod_admin and backup.sh dod_admin:dod_admin, so dod_admin can rewrite them. proxy/site-stats.mjs:625 `spawn('npm run build', … shell: true)` confirmed. No mitigation found: nothing in customsh/lockdown/apply-lockdown.sh re-chowns the tree.\n\nI did not find a refutation, but severity is inflated. `id dod_admin` → groups include 27(sudo): it is an administrator account, not a least-privileged service identity, so this converts password-gated root into passwordless root rather than breaching a designed boundary. The condition also pre-exists on this host independent of INSTALL.sh, and node_modules being root-owned is cosmetic since its parent is dod_admin-owned.
>
> *Correction:* The mechanism is real and verified, but the impact framing overstates it. INSTALL.sh:164/167 do chown the customsh tree and the whole site root (node_modules included, undoing this box's root-owned node_modules) to RUN_USER, and root cron really does execute those files (/etc/crontab:26 backup.sh, /etc/cron.d/apt-mirror:3, /etc/cron.d/el-reposync:1), so anything running as dod_admin gets root at the next tick. However dod_admin is in the sudo group, i.e. already an administrator account: the gap is that RCE-as-dod_admin gets root without needing the account password, not that a service-only identity crosses into root. The state also pre-dates the bundle on this host (files date to 2025), so INSTALL.sh propagates rather than introduces it, and root-owning node_modules buys nothing while its parent directory stays dod_admin-owned. Treat as a defense-in-depth hardening item (install /var/www/customsh root:root 0750 and narrow line 167 to proxy/ and out/), medium severity, not a high-severity boundary break.

---

### 34. Restricted-enclave portal hostnames reach the unauthenticated /search-index.json

**Security · high** · `nginx/server.conf:622`

```
location = /search-index.json {
        auth_request off;
        expires -1;
```

**What it is.** /search-index.json is the one content endpoint that opts out of the site-wide auth_request login gate and is not covered by admin-acl.inc. Its /home/ entry carries a `links` array with every restricted-enclave service portal harvested from lib/data/restricted-apps.ts: osTicket, Tenable/ACAS, Voltron, SharePoint, OWA, QSpace, JupyterHub and GitLab. Verified in the deployed artifact: `node -e` over out/search-index.json prints 8 link objects for route /home/, e.g. {"href":"https://qspace.blcs█████/","label":"APEN QSpace Quantum modeling & simulation workspace. Open site"} and {"href":"https://acas.blcs█████/","label":"Tenable Security Center Vulnerability scan dashboards and reporting (ACAS). Open"}. The index text field for /home/ additionally contains the prose descriptions of each portal.

**Impact.** Anyone who can reach the vhost TCP/443 without any session, without an allowlisted IP, and without an LDAP login retrieves a machine-readable inventory of nine on-network enclave services with their exact hostnames, their purpose, and (for QSpace) the classification-relevant hint that it is a quantum modeling and simulation workspace. This is a complete target list for an attacker who has reached the network but has no credentials.

**Fix.** Either move /search-index.json behind the site-wide auth_request gate (delete the `auth_request off;` line — the /search page is itself gated, so it will carry the session cookie), or strip off-site absolute URLs from the `links` array in scripts/build-search-index.mjs before writing the file.

> **exploitability review — upheld** (high confidence). Evidence confirmed verbatim at nginx/server.conf:622-625 ("location = /search-index.json {" / "auth_request off;" / "expires -1;"). Request path traced: the site-wide gate is server-level at server.conf:195 ("auth_request /internal/authcheck;"), inherited by every location; this exact-match location opts out, includes neither admin-acl.inc nor blocked-hosts.inc (the latter is included only at server.conf:772, 810, 899 for the mirror control panels), and inherits root .../out, so an anonymous client on 443 gets the file directly with no session and no IP allowlist. Content confirmed from the deployed artifact out/search-index.json (105 KB, 109 pages): route /home/ carries 8 absolute https links — apenosticket, acas, voltron.apen.mil, blcseportal, mail/owa, qspace, jupyterhub, gitlab — with labels such as "Tenable Security Center Vulnerability scan dashboards and reporting (ACAS)". scripts/build-search-index.mjs:126-128 keeps off-site URLs by design. The hostnames also sit in /_next/static/chunks (also auth_request off), but those names are not referenced by the unauthenticated /login bundle (checked all 14 chunks: no hit), so /search-index.json is the practically reachable unauth source.
>
> *Correction:* Accurate and exploitable; two refinements. (1) The exposure is larger than described: the unauthenticated file is the whole search corpus — 109 routes, ~71 KB of body text plus titles, headings and descriptions from every gated page, including /test/ (which nginx otherwise gates behind both the login and the admin IP ACL) — not only the 8 /home/ portal links. (2) "the one content endpoint that opts out" is imprecise: many locations carry auth_request off (/_next/static/, /logos/, /fonts/, /speedtest/, /netdiag/, /network-analysis/, /repos/), and the same hostnames exist inside /_next/static/chunks/*.js, which is also ungated — but chunk filenames are content-hashed, autoindex is off, and none of the 14 chunks referenced by the unauthenticated /login page contain them, so /search-index.json remains the only enumerable unauthenticated path to this data. The recommended fix (drop the auth_request off line at server.conf:623) still holds.

> **mitigation review — upheld** (high confidence). Evidence confirmed verbatim: nginx/server.conf:622-624 is `location = /search-index.json { auth_request off; expires -1;`. The site-wide gate is server-level (server.conf:195 `auth_request /internal/authcheck;`) and this location opts out with no admin-acl.inc, no blocked-hosts.inc, and no limit_req. Content confirmed: parsing out/search-index.json, route /home/ carries 8 link objects (apenosticket, acas, voltron.apen.mil, blcseportal, mail/owa, qspace, jupyterhub, gitlab), each with its prose description. I hunted for mitigations and found none: the unauthenticated /_next/static/ exemption (server.conf:611) does not help an attacker — none of the 14 chunks referenced by out/login/index.html, out/404/index.html or out/403/index.html contain the hostnames, and autoindex is off; @legacy_files (server.conf:762) is gated; /api/voltron-chat (server.conf:269), which serves the same facts from proxy/assistant-knowledge.mjs:67,88, is gated. Severity is inflated: this discloses internal hostnames and one-line purposes, no credentials or data, to someone already inside the enclave, and any holder of any AD account sees the same page. Minor error: the finding says "nine" services; the index holds 8 (Speed Test is an internal route, dropped by the post-pass at scripts/build-search-index.mjs:130-141).
>
> *Correction:* The mechanism is real and I could not refute it: nginx/server.conf:622-624 exempts /search-index.json from the server-level auth_request gate (server.conf:195) with no IP ACL and no rate limit, and the deployed out/search-index.json carries 8 (not 9) absolute external portal URLs plus their descriptions under route /home/. No other unauthenticated surface leaks the same data — the /_next/static/, /logos/, /403/, /404/ and /api/auth/* exemptions do not, and the chat API that holds the same knowledge is gated. However "high" overstates it: the disclosure is internal blcse.mil hostnames and one-sentence purposes, no credentials, no data, to an attacker who must already have network reach into the enclave and could resolve/scan those names anyway, and every holder of any AD account already gets this content by logging in. Medium (information disclosure / recon aid) is the right level; the recommended fix (drop the `auth_request off;` line, since /search/ itself is gated and its fetch carries the session cookie) is sound.

---

### 35. @legacy_files fallback serves private keys and a PFX from the legacy webroot to any logged-in user

**Security · high** · `nginx/server.conf:756`

```
try_files $uri $uri.html $uri/index.html @legacy_files;
location @legacy_files {
    root /var/www/html;
```

**What it is.** `location /` falls back to `@legacy_files`, which serves the ENTIRE /var/www/html tree (server.conf:762-766) with no allowlist of what is meant to be public. On disk, /var/www/html/certs/ contains `ai-tools.key`, `aitools.key` and `aitools.pfx` (mode 0755, readable by the nginx worker) alongside the intended public CA .crt/.cer files. A request for /certs/ai-tools.key is not matched by any `^~` location, does not contain a `/.` sequence (so `location ~ /\.` does not apply), and does not match the two-segment regex (it contains a dot), so it lands in `location /`, misses `out/certs` (absent from the export), and is served from the legacy root. Only the site-wide session gate (any LDAP realm) stands in the way. I did not read the key files; the finding is based on filenames, modes and the routing logic.

**Impact.** Any authenticated user (every LDAP account, including barred workstations, which can still log in) can download TLS private key material and a PFX bundle for the ai-tools service, enabling impersonation/decryption of that service.

**Fix.** Move private key/PFX files out of any web-served directory (they do not belong under /var/www/html at all). Then constrain `@legacy_files` to an explicit list of legacy subtrees (e.g. `location ^~ /certs/ { root /var/www/html; location ~ \.(key|pem|pfx|p12)$ { deny all; } }`) or add a regex deny for `\.(key|pfx|p12)$` inside the fallback. Rotate the exposed ai-tools key.

> **exploitability review — upheld** (high confidence). Tried to refute; could not. Evidence is verbatim: nginx/server.conf:756 `try_files $uri $uri.html $uri/index.html @legacy_files;`, :762-765 `location @legacy_files { root /var/www/html; autoindex off; try_files $uri $uri/ =404; }`. Repo file is byte-identical to the deployed /etc/nginx/conf.d/apen_support/server.conf (diff -q clean), so this is live. Routing holds: only two regex locations exist (grep "location ~" -> :662 two-segment `[a-z0-9_-]` regex, which /certs/ai-tools.key fails on the dot, and :923 `~ /\.`, which needs a "/." sequence); no `^~ /certs/`, no key/pfx deny anywhere; server root is :226 /var/www/apen_support_nextjs/out and out/certs does not exist, so the request falls through to the legacy root. Auth: the site-wide gate is only `auth_request /internal/authcheck` (:195) = any LDAP realm session; blocked-hosts.inc is included only at :772/:810/:899 (control panels), not in `location /`. Files are real: `-----BEGIN PRIVATE KEY-----` (unencrypted PKCS#8), mode 0755 under a 0755 dir, so the worker can read them.
>
> *Correction:* Confirmed as written; scope is larger than reported. /var/www/html/certs also holds cesc960ai.key (also an unencrypted `-----BEGIN PRIVATE KEY-----` PKCS#8 file) and three further PKCS#12 bundles — apenregistry.pfx, gitlab.pfx, minicran.pfx — all mode 0755 and reachable by the same @legacy_files path, so remediation must cover the whole directory (and rotate all of those credentials), not just ai-tools.

> **mitigation review — upheld** (high confidence). Confirmed at every step. nginx/server.conf:756 is verbatim `try_files $uri $uri.html $uri/index.html @legacy_files;` and 762-766 is `location @legacy_files { root /var/www/html; autoindex off; try_files $uri $uri/ =404; }`. I looked for the mitigations the finder might have missed and found none: `grep -n "certs|\.key|pfx|p12|deny"` over server.conf returns only the ssl_certificate_key at 171, a comment at 753, and `location ~ /\. { deny all; }` at 923-924 — no `^~ /certs/`, no extension deny, no allowlist; managed-loc.conf is empty (`# (no managed locations)`). The regex at 662 `^/[a-z0-9][a-z0-9_-]*/[a-z0-9][a-z0-9_-]*/?$` cannot match a dotted filename. Server root is out/ (line 226) and out/certs does not exist, so the request falls through. The only gate is the server-level `auth_request /internal/authcheck;` (line 195), any realm. /etc/nginx/conf.d/apen_support/server.conf is byte-identical to the repo copy, so this is live. /var/www/html/certs holds ai-tools.key, aitools.key, cesc960ai.key — each `-----BEGIN PRIVATE KEY-----`, i.e. unencrypted — plus aitools.pfx, apenregistry.pfx, gitlab.pfx, minicran.pfx, all mode 0755 under a 0755 dir.
>
> *Correction:* Accurate as written, but understated in scope: the exposed set is larger than the three files named. /var/www/html/certs also contains cesc960ai.key (also an unencrypted `-----BEGIN PRIVATE KEY-----` PEM) and three further PKCS#12 bundles — apenregistry.pfx, gitlab.pfx, minicran.pfx — all world-readable (0755) and reachable by the same @legacy_files path, so remediation and rotation must cover ai-tools/aitools, cesc960ai, apenregistry, gitlab and minicran, not just ai-tools.

---

### 36. nginx legacy fallback serves private keys and .pfx bundles from /var/www/html/certs

**Security · high** · `nginx/server.conf:762`

```
location @legacy_files {
        root /var/www/html;
        try_files $uri $uri/ =404;
```

**What it is.** `location /` (line 756) falls through to `@legacy_files`, which serves the whole legacy webroot with no path restrictions. That tree contains /var/www/html/certs/ai-tools.key, aitools.key and cesc960ai.key (each contains PRIVATE KEY blocks; mode 755, owner dod_admin:root) plus aitools.pfx, apenregistry.pfx, gitlab.pfx and minicran.pfx (mode 755). The old vhost (nginx/apensupport.legacy.conf:41-66) exposed only four named public CA files under /certs/; the new config exposes the directory wholesale. /var/www/html/conf.d/apensupport.conf (old nginx config) is served the same way. The bundler comment at scripts/make-airgap-bundle.sh:92 shows the team already knows key material lives there. The site-wide auth_request gate (server.conf:195) means the caller needs any successful LDAP bind, not admin rights. Reachability was confirmed by config reading only; no request was sent.

**Impact.** Any domain user with a site session can download TLS private keys and PKCS#12 bundles for the voltron/ai-tools, gitlab, registry and minicran services and impersonate or decrypt traffic to those hosts.

**Fix.** Move private keys and .pfx files out of the served tree (e.g. /etc/apen/certs, mode 600) and re-issue the exposed certificates. Add an explicit `location ~* \.(key|pfx|p12|pem)$ { return 404; }` (or a `location ^~ /certs/` allowlist of the public CA files) ahead of `@legacy_files`, and make scripts/verify-deploy.sh or deploy/VERIFY.sh assert no PRIVATE KEY content exists under /var/www/html.

> **exploitability review — upheld** (high confidence). Evidence confirmed verbatim at nginx/server.conf:762-765 ("location @legacy_files { root /var/www/html; autoindex off; try_files $uri $uri/ =404; }") reached from line 756 ("try_files $uri $uri.html $uri/index.html @legacy_files"). No /certs/, .key or .pfx location exists anywhere in server.conf or nginx/*.inc (grep for certs/key/pfx returns only server.conf:171 ssl_certificate_key and a comment at 753). out/certs and public/certs do not exist, so try_files always misses and falls through. The two-segment regex at server.conf:663 cannot shadow it ([a-z0-9_-] excludes the dot in "ai-tools.key"). On disk /var/www/html/certs holds ai-tools.key, aitools.key, cesc960ai.key (grep -c "PRIVATE KEY" = 2 each) plus aitools.pfx, apenregistry.pfx, gitlab.pfx, minicran.pfx, all 0755. The deployed /etc/nginx/conf.d/apen_support/server.conf is the same 44022 bytes with identical lines 756/762. @legacy_files has no auth_request off, so the server-wide gate at :195 applies: any valid LDAP session, not admin, not IP-restricted. One description error: the legacy vhost was not narrower — apensupport.legacy.conf:138,159 sets root /var/www/html with an empty location / and no auth.
>
> *Correction:* The exposure is real and reachable: nginx/server.conf:756 falls through to @legacy_files (server.conf:762-765, root /var/www/html, no extension or path filtering), no /certs/ or *.key/*.pfx location exists in server.conf or nginx/*.inc, and nothing in the static export shadows /certs/, so GET /certs/ai-tools.key, /certs/aitools.key, /certs/cesc960ai.key (each 2 PRIVATE KEY blocks) and /certs/{aitools,apenregistry,gitlab,minicran}.pfx are served to any caller holding any valid general-or-admin LDAP session (the server-wide auth_request at server.conf:195; @legacy_files does not set auth_request off, and admin-acl.inc is not included there). The deployed config at /etc/nginx/conf.d/apen_support/server.conf is byte-identical in size with the same lines. Correction to the finding's description: this is not a regression introduced by the new config. The old vhost was broader, not narrower — nginx/apensupport.legacy.conf:138 sets `root /var/www/html;` at server level with an empty `location / {}` at :159 and no authentication at all; the four `location = /certs/...` blocks at :41-66 are in the port-80 HTTP server only, for plaintext CA-cert fetches, not an allowlist. The new config actually tightens access by adding the site-wide login gate. The defect is the unfiltered legacy fallback plus key material living in a served tree, and the remediation stands unchanged.

> **mitigation review — upheld** (high confidence). Core claim confirmed. nginx/server.conf:744-756 `location / { ... try_files $uri $uri.html $uri/index.html @legacy_files; }` and :762-765 `location @legacy_files { root /var/www/html; autoindex off; try_files $uri $uri/ =404; }`. The only path-based deny in the server is :923 `location ~ /\. { deny all; }` — no .key/.pfx/.p12 filter, no /certs/ allowlist, and the regex at :662 (`^/[a-z0-9][a-z0-9_-]*/[a-z0-9][a-z0-9_-]*/?$`) cannot match `certs/aitools.key` (dot not in class), so `location /` wins. /var/www/apen_support_nextjs/out/certs does not exist, so nothing shadows the fallback. On disk: ai-tools.key, aitools.key, cesc960ai.key each `grep -c 'PRIVATE KEY'` = 2, mode 755, plus aitools/apenregistry/gitlab/minicran .pfx. Gate is the site-wide `auth_request /internal/authcheck;` (:195) = any valid session, not admin. No mitigation found. One material error: the old vhost was NOT narrower — apensupport.legacy.conf:138 `root /var/www/html;`, :148 `try_files $uri $uri/ index =404;`, :159 `location / { }`, with no auth_request at all.
>
> *Correction:* The exposure is real and the cited evidence is accurate, but the regression framing is wrong. `location /` (nginx/server.conf:744) falls through to `@legacy_files` (nginx/server.conf:762-765, `root /var/www/html; try_files $uri $uri/ =404;`) with no extension filter or /certs/ allowlist — the only path deny is `location ~ /\.` at server.conf:923. /var/www/html/certs holds ai-tools.key, aitools.key and cesc960ai.key (each contains two PRIVATE KEY blocks, mode 755) plus aitools.pfx, apenregistry.pfx, gitlab.pfx and minicran.pfx, all reachable to anyone holding any valid LDAP session (the site-wide gate at server.conf:195 is session-any, not admin). Nothing in out/ shadows /certs/. However, this is not new: the old vhost served the same tree just as wholesale — apensupport.legacy.conf:138 `root /var/www/html;`, :148 `try_files $uri $uri/ index =404;`, :159 empty `location / { }` — and had no auth_request at all, so the new config is strictly a tightening (anonymous -> authenticated), not a widening. The four named `location = /certs/*.crt|.pem` blocks at apensupport.legacy.conf:41-66 are in the port-80 HTTP redirect server, added to keep CA certs fetchable without TLS, not a restriction on the HTTPS tree. The only existing control is scripts/make-airgap-bundle.sh:95-105 `purge_private_keys`, which content-greps for PRIVATE KEY and strips *.key/*.pfx/*.p12 from the air-gap bundle — it protects the bundle, not the served webroot. Severity stays high (server TLS private keys downloadable by any domain user), but the correct framing is a long-standing file-placement problem, not a defect introduced by the current nginx config, and the fix is still to move key material out of the served tree and re-issue.

---

### 37. No lockfile anywhere in the repo: every dependency is a floating caret range

**Security · high** · `package.json:26`

```
"dependencies": {
    "@radix-ui/react-dropdown-menu": "^2.1.24",
```

**What it is.** All 13 runtime dependencies and all 15 devDependencies use caret ranges, and there is no package-lock.json, npm-shrinkwrap.json, yarn.lock or pnpm-lock.yaml on disk or in git history (`ls` returns "No such file or directory" for all four; `git ls-files | grep -i lock` returns no lockfile, and `git log -- package-lock.json` is empty). Nothing pins the resolved version or the integrity hash of any of the 323 packages currently in node_modules. Drift is already observable: lucide-react resolves to 1.34.0 against a `^1.33.0` request and @types/react-dom to 19.2.5 against `^19.2.4` — both legal under the caret, and both installs nobody chose or reviewed.

**Impact.** Any `npm install` on this production host — including the `reinstall` script at package.json:21 — silently pulls whatever each registry currently serves for the caret range, with no integrity verification. A compromised minor/patch release of any of ~323 direct or transitive packages (next, react, ldapts, framer-motion, or any of their trees) lands in the build that the admin Publish button ships to out/. There is also no record of what is installed, so a compromise cannot be detected or attributed after the fact, and the CM baseline claimed in NOTICE covers source only, not the dependency tree.

**Fix.** Generate and commit a package-lock.json (`npm install --package-lock-only` then commit), switch all install instructions to `npm ci`, and remove `package-lock.json` from the `clean` script at package.json:20 so it is never deleted. Treat the lockfile as part of the CM baseline named in NOTICE.

> **exploitability review — upheld** (high confidence). Could not refute; every claim verified. package.json:26-27 matches the quoted evidence verbatim. All 28 ranges (13 deps lines 27-39, 15 devDeps lines 42-56) are carets. No lockfile on disk, none in `git ls-files`, and `git log --all` for all four lockfile names is empty; .gitignore never mentions one. node_modules holds exactly 323 packages; drift is real: lucide-react 1.34.0 vs `^1.33.0` (line 34), @types/react-dom 19.2.5 vs `^19.2.4` (line 50). clean (line 20) does delete package-lock.json; reinstall (line 21) is real. NOTICE:24 scopes the CM baseline to `git tag`, i.e. source only. Exploitability: no remote trigger — the admin Publish handler spawns only `npm run build` (proxy/site-stats.mjs:625), never an install, so the finder's "Publish button" chain is wrong. The real trigger is operator-run deploy: /var/www/customsh/siteupdate.sh:146 `npm run reinstall`, with live registry reachability proven at siteupdate.sh:118 `npm view npm version` and root-level `sudo npm install -g npm@latest` at line 129. Requires an upstream package compromise plus an operator deploy, not an attacker request.
>
> *Correction:* The finding is factually correct in every detail but misstates the trigger path and overstates severity for an exploitability lens. Accurate: there is no package-lock.json, npm-shrinkwrap.json, yarn.lock or pnpm-lock.yaml anywhere on disk or in git history, all 28 dependency ranges in package.json:27-56 are carets, node_modules holds 323 unpinned packages with observable drift (lucide-react 1.34.0 against ^1.33.0 at line 34; @types/react-dom 19.2.5 against ^19.2.4 at line 50), package.json:20 `clean` actively deletes any lockfile, and NOTICE:24 scopes the CM baseline to git tags, so the dependency tree is outside the declared baseline. Correction to the impact chain: the admin Publish button does NOT pull dependencies — proxy/site-stats.mjs:625 spawns a static `npm run build` string only, so no HTTP-reachable endpoint installs packages. The actual install trigger is the operator-run deploy script /var/www/customsh/siteupdate.sh:146 (`npm run reinstall`), whose own comment documents the floating resolution as deliberate; that script confirms live registry reachability from this production host (siteupdate.sh:118 `npm view npm version`) and additionally runs `sudo npm install -g npm@latest` as root at line 129, which is an unpinned root-level install the finder missed. Severity lowered to medium because exploitation requires an external precondition (a compromised upstream release) plus an operator-initiated deploy, with no attacker-reachable trigger — but it is a genuine, routinely-exercised supply-chain and CM gap, not a theoretical one.

> **mitigation review — upheld** (high confidence). Every factual claim reproduces. package.json:26-40 and :41-56 are all caret ranges; `ls` finds no package-lock.json / npm-shrinkwrap.json / yarn.lock / pnpm-lock.yaml; `git ls-files | grep -i lock` returns only unrelated paths (nginx/blocked-hosts.inc, etc.) and `git log --all --diff-filter=A` shows no lockfile ever added. package.json:20 `"clean": "rm -rf .next node_modules package-lock.json"` and :21 `"reinstall": "npm run clean && npm install"` are verbatim. Drift confirmed: node_modules/lucide-react is 1.34.0 vs `^1.33.0`, @types/react-dom 19.2.5 vs `^19.2.4`; 323 node_modules entries; no .npmrc pinning a registry. NOTICE:24 baselines on git tags only, so the tree is outside CM. Mitigations found but partial: the admin Publish button spawns `npm run build`, not an install (proxy/site-stats.mjs:625), deploy/INSTALL.sh:16 "Never runs npm install: node_modules ships inside the bundle", and node_modules is root-owned (drwxr-xr-x root root), so `reinstall` as dod_admin EACCESes. Exploitation needs root to re-install plus a malicious in-range release — latent CM/provenance gap, not a reachable vulnerability.
>
> *Correction:* The finding is factually accurate — no lockfile exists on disk or anywhere in git history, all 28 dependencies float on caret ranges, drift is already observable (lucide-react 1.34.0 against ^1.33.0), and package.json:20 actively deletes any lockfile that gets generated — but the impact paragraph overstates the live path. The admin Publish button runs only `npm run build` (proxy/site-stats.mjs:625); it never installs, so no registry fetch happens on publish. Downstream enclaves are unaffected because deploy/INSTALL.sh:16 ships node_modules and never installs. On this host node_modules is root-owned, so the `reinstall` script at package.json:21 fails for dod_admin. What remains is real but latent: a root-run `npm install` (or the documented MIGRATION.md:39 rebuild path) would pull unreviewed in-range versions with no integrity record, and there is no manifest of what the 323 installed packages actually are, so a compromise could not be detected or attributed — a configuration-management and provenance gap against the CM baseline claimed in NOTICE:24, not an attacker-reachable vulnerability. Medium, and the recommended fix (`npm install --package-lock-only`, commit, switch to `npm ci`, drop package-lock.json from the clean script) is correct as written.

---

### 38. Broken escaping in generated page.tsx allows code injection into version-controlled source executed at build

**Security · high** · `proxy/site-stats.mjs:820`

```
const dataJson = JSON.stringify(page, null, 2).replace(/[`$\\]/g, (c) => `\\${c}`)
```

**What it is.** renderCustomPageSource() serializes admin-supplied page data with JSON.stringify then blindly doubles every backslash. JSON.stringify already emits `\"` for a double-quote inside a string; doubling the backslash turns `\"` into `\\"`, which in the generated JS/TSX source is an escaped backslash followed by an UNescaped `"` that terminates the string literal early. Everything after it becomes raw source. Fields like title, subtitle, badge, card.title, card.description, card.body and logo are length-bounded but never character-validated (only slug/category go through isSafeSegment), so a title such as `Demo" ,evil:process.mainModule.require('child_process')...` breaks out of the object literal. writeCustomPageSource() (line 845) writes this to app/<category>/<slug>/page.tsx, and startPublishBuild() (line 625) runs `npm run build`, which imports the module for static generation — executing the injected top-level code as the deploy user. At minimum it corrupts the build (DoS); at worst it is RCE and a code-injection into git-tracked source.

**Impact.** An admin-session caller (the wizard's trust boundary) can inject arbitrary TypeScript/JS into a committed page.tsx that runs during `npm run build` as the site/deploy account — escalating from 'edit page content' to code execution and poisoning version control; a malformed value also silently breaks every future publish build.

**Fix.** Do not hand-roll escaping. Embed the data as a real string parsed at runtime, e.g. `const PAGE_DATA = JSON.parse(<properly-JS-string-escaped JSON>)`, or serialize with a vetted serialize-to-JS routine; additionally character-validate all free-text page/card fields before writing source.

> **exploitability review — upheld** (high confidence). Evidence confirmed verbatim at proxy/site-stats.mjs:820: `const dataJson = JSON.stringify(page, null, 2).replace(/[`$\\]/g, (c) => `\\${c}`)`. Doubling backslashes after JSON.stringify turns `\"` into `\\"`, which in the emitted TSX is an escaped backslash plus a live quote — the literal ends early. Write path is real: writeCustomPageSource (845-855) checks isSafeSegment only on category/slug (847), and the POST handler at 4421-4542 sets `title: page.title.trim()` and slices subtitle/badge/logo/card.title/description/body with no character validation, then calls writeCustomPageSource(sanitized) (4542). GENERATE_PAGE_SOURCES defaults on (85; .env.example:142), APP_DIR is dod_admin-owned, and startPublishBuild (620) spawns `npm run build` with PUBLISH_BUILD default on (93). Reachability is the correction: /api/admin/ (nginx/server.conf:448-449) includes admin-acl.inc, which allows only 4 workstation IPs plus 127.0.0.1 and ends `deny all;`, and authorizeAdmin (2046-2053) requires an admin-kind LDAP session plus a matching x-csrf-token. So this is post-auth, admin-only. next.config.js sets no ignoreBuildErrors, so a sloppy payload fails typecheck (build DoS); a type-valid concat payload still evaluates at module scope during static generation.
>
> *Correction:* The escaping defect is real and confirmed at proxy/site-stats.mjs:820 — JSON.stringify output is post-processed by blindly doubling every backslash, so any `"` inside an unvalidated free-text field (title, subtitle, badge, logo, card.title/description/body) emits `\\"` and terminates the generated string literal early, letting the remainder of that field become raw TSX in app/<category>/<slug>/page.tsx. writeCustomPageSource (line 845) validates only category/slug via isSafeSegment, and startPublishBuild (line 620) later runs `npm run build`, which evaluates the module's top level, so a crafted value yields build-time code execution as the proxy/deploy user (dod_admin) and poisons git-tracked source; a malformed value breaks every future build. The severity should be medium rather than high because the path is not remotely reachable: /api/admin/ is gated by nginx/admin-acl.inc (four allowlisted workstation IPs plus 127.0.0.1, ending `deny all;`) and by authorizeAdmin (proxy/site-stats.mjs:2046), which requires an admin-kind LDAP session and a matching x-csrf-token — an actor who already can trigger builds and write nginx config. It is an admin-to-code-execution integrity/escalation bug, not an unauthenticated RCE. Recommended fix (embed as JSON.parse of a properly escaped JS string, or use a vetted serializer, plus character-validate free-text fields) is correct.

> **mitigation review — upheld** (high confidence). Evidence confirmed verbatim at proxy/site-stats.mjs:820: `const dataJson = JSON.stringify(page, null, 2).replace(/[`$\\]/g, (c) => `\\${c}`)`, embedded as a bare object literal at line 828 (`const PAGE_DATA: CustomPage = ${dataJson}`), not a template literal — so doubling backslashes turns JSON's `\"` into `\\"`, ending the JS string early. Inputs are only length-bounded: title is validated 2-120 chars with no character check (4435), subtitle/badge/logo/card.title/description/body only `.slice()` (4485-4520); `isSafeSegment` (811) guards only category/slug. Write at 854, `spawn('npm run build', …)` at 623, both flags default ON (85, 93). No test, no client-side or CSP mitigation; grep found no other caller and no sanitizer stripping quotes. Mitigation the finder omitted: reachable only via an LDAP admin session behind nginx/admin-acl.inc (server.conf:430,449), and such admins already invoke `npm run build` and the sudo nginx-reload editor — so RCE-as-deploy-user is a modest escalation. The near-certain real impact is corruption/DoS: any admin typing a quote breaks all future publishes.
>
> *Correction:* The escaping defect is real and correctly located: renderCustomPageSource (proxy/site-stats.mjs:820) JSON.stringifies admin page data and then doubles every backslash before splicing it into a bare TSX object literal (line 828), so JSON's `\"` becomes `\\"` and terminates the string literal early; free-text fields (title, subtitle, badge, logo, card.title/description/body) are length-bounded only (4435, 4485-4520), and the file is written to app/<category>/<slug>/page.tsx (854) and compiled by `npm run build` (623) with both feature flags defaulting on (85, 93). Severity is overstated as "high" for this deployment, however: the endpoint requires an authenticated admin LDAP session and an allowlisted workstation IP (nginx/admin-acl.inc, server.conf:430/449), and that same trusted admin can already spawn `npm run build` and write nginx config that is reloaded via sudo, so build-time code execution is only a marginal escalation rather than a new trust-boundary break. The dominant, near-certain impact is integrity/availability: an admin typing a double quote, backslash or newline in a page title silently writes corrupt git-tracked source and breaks every subsequent publish build. Fix as recommended (embed via JSON.parse of a properly escaped JS string literal), but rate it medium.

---

### 39. content-audit.json is rewritten whole, non-atomically, and is silently reset to empty on any parse error

**Security · high** · `proxy/site-stats.mjs:882`

```
function commitContentAuditLogToDisk() {
  try {
    writeFileSync(CONTENT_AUDIT_FILE, JSON.stringify(contentAuditLog, null, 2), 'utf8')
```

**What it is.** The audit log is not append-only. Every appendAuditEntry (921-938) unshifts into an in-memory array, truncates it to 500 entries at line 936, then rewrites the entire file. The write at 884 is a plain writeFileSync with no temp-file-plus-rename and no explicit mode — unlike commitAuthEventsToDisk (1841-1846), which writes to a tmp path with mode 0o600 and renameSync. A crash or full disk mid-write leaves a truncated JSON file; the loader at 429-434 then catches the parse error and silently sets contentAuditLog = [], and the very next admin action rewrites the file as a one-element array, permanently destroying the entire history with no error surfaced to any operator. There is also no rotation or archive: once 500 entries accumulate, older records are discarded with no retention copy, and proxy/ADMIN_CONTENT.md:110 documents this as the intended design ('content-audit.json — last 500 admin actions').

**Impact.** The primary admin accountability record can be erased by a process crash, by a disk-full condition, or by any write that corrupts the file — and the erasure is indistinguishable from 'no admin activity yet'. Retention is a hard 500 entries with no offload, so a burst of activity (a bulk content publish, a file-library cleanup) can age out the evidence of an earlier action within hours. AU-9 (protection of audit information) and AU-4/AU-11 (capacity and retention) are both unmet.

**Fix.** Switch to append-only line-delimited JSON (open with flag 'a', mode 0o600) so a record, once written, is never rewritten; roll to a dated file rather than truncating at 500; and on a load failure, rename the unparseable file aside and log loudly instead of starting from an empty array. Forward the same records to syslog/journald so a second copy exists outside this process's control.

> **exploitability review — upheld** (high confidence). Every quoted line is verbatim at the cited location. proxy/site-stats.mjs:882-884 is `function commitContentAuditLogToDisk()` with a plain `writeFileSync(CONTENT_AUDIT_FILE, JSON.stringify(contentAuditLog, null, 2), 'utf8')` — no tmp file, no rename, no mode. The contrast is real: commitAuthEventsToDisk at 1839-1846 writes to `${AUTH_EVENTS_FILE}.tmp-...` with `{ encoding: 'utf8', mode: 0o600 }`, chmodSync, then renameSync. The loader at 429-435 does `catch { contentAuditLog = [] }` with no log line. appendAuditEntry at 921-937 unshifts, then `contentAuditLog = contentAuditLog.slice(0, 500)` (936) and rewrites the whole file. proxy/ADMIN_CONTENT.md:110 reads `content-audit.json — last 500 admin actions`. On exploitability: all ~24 appendAuditEntry call sites sit behind `authorizeAdmin(req)` (2046-2071, session+CSRF or token) and nginx admin-acl.inc IP allowlist (nginx/server.conf:429-430, 448-449). The only non-HTTP caller, rewriteOverrideUrls (460), is reached solely from the admin file-rename handler at 4101. So no unauthenticated party can append or corrupt; realistic actors are a crash/disk-full or an already-privileged admin flushing history with ~500 cheap POSTs.
>
> *Correction:* The code facts are accurate as written — proxy/site-stats.mjs:884 rewrites content-audit.json whole with a plain writeFileSync (no tmp+rename, no 0o600, unlike commitAuthEventsToDisk at 1841-1846), the loader at 429-435 silently resets to [] on any parse error, and line 936 hard-truncates to 500 entries with no rotation. Severity should be medium rather than high: this is a durability and AU-9/AU-11 retention defect, not a remotely exploitable one. Every writer is gated by authorizeAdmin (site-stats.mjs:2046) plus the nginx IP allowlist (nginx/server.conf:448-449), so the log can only be flushed or corrupted by a process crash, a full disk, or an already-authenticated admin deliberately aging out their own history with ~500 trivial POSTs. The recommendation (append-only JSONL, dated rollover, rename-aside on load failure, syslog mirror) still stands.

> **mitigation review — upheld** (high confidence). Mechanism confirmed verbatim. proxy/site-stats.mjs:882-885 is exactly `writeFileSync(CONTENT_AUDIT_FILE, JSON.stringify(contentAuditLog, null, 2), 'utf8')` — no tmp+rename; 921-937 unshift + `contentAuditLog = contentAuditLog.slice(0, 500)` + commit; 429-434 `catch { contentAuditLog = [] }` silently. Contrast at 1839-1846 (tmp path, mode 0o600, chmodSync, renameSync) is real. So not refuted on facts. But impact is inflated: (1) `ls -la proxy/` shows content-audit.json already `-rw------- dod_admin`, and writeFileSync preserves an existing file's mode, so the "no explicit mode" half is moot; (2) this file logs content/console edits, not authentication — auth-events.json is the auth record and IS atomic; (3) retention claim is wrong by orders of magnitude: the live file holds 106 entries spanning 2026-05-09 → 2026-08-28 against the 500 cap, not "aged out within hours"; (4) every appendAuditEntry caller sits behind authorizeAdmin plus nginx admin-acl.inc, so there is no attacker-reachable trigger — loss needs a crash/disk-full inside a ~21 KB write; (5) customsh/replicate-to-backup.sh:61-75 rsyncs proxy/ (only `.next/` excluded, no --delete) off-box, and DEPLOY.md:67 / scripts/make-airgap-bundle.sh:83 exclude it from deploys so pushes never clobber it.
>
> *Correction:* The defect is real but low severity. proxy/site-stats.mjs:884 rewrites content-audit.json whole with a non-atomic writeFileSync, and the loader at 429-434 silently resets to [] on a parse error, so a crash or full disk during that write can erase the content-change history with no operator-visible error; the cheap fix (tmp + renameSync as commitAuthEventsToDisk already does at 1839-1846, or append-only NDJSON) is worth doing. The rest of the finding overstates it: the file already exists 0600 and writeFileSync preserves that mode, so the missing mode argument has no effect; this log records admin-console content edits, not authentication (auth-events.json, the actual accountability record, is already written atomically); retention is not a practical problem — the live file holds 106 entries spanning 2026-05-09 to 2026-08-28 against a 500-entry cap, roughly four years of headroom rather than "hours"; every writer is gated by authorizeAdmin plus the nginx admin ACL so no untrusted party can induce the corruption; and customsh/replicate-to-backup.sh rsyncs proxy/ to the backup host as an off-box copy while deploy/bundle scripts explicitly exclude the file so deploys cannot clobber it. Treat as durability/AU-9 hygiene, not a high-severity audit-integrity failure.

---

### 40. Malformed cookie crashes the proxy via unhandled URIError in parseCookies (site-wide auth gate)

**Security · high** · `proxy/site-stats.mjs:1737`

```
const v = piece.slice(idx + 1).trim()
    if (k) out[k] = decodeURIComponent(v)
```

**What it is.** parseCookies() calls decodeURIComponent on EVERY cookie value without a try/catch. A cookie such as `x=%E0` or `apen_session=%` throws URIError. parseCookies is reached from findSessionByCookie(), which runs inside the `createServer(async (req, res) => ...)` handler (line 2786) for /internal/authcheck (line 2832) — the nginx auth_request target hit on nearly every page load — plus /api/auth/whoami, /api/chat-history and authorizeAdmin. The handler has no top-level try/catch and no process.on('unhandledRejection') exists anywhere in proxy/*.mjs, so on Node v24.21.0 (default --unhandled-rejections=throw) the rejection becomes a fatal uncaughtException. ecosystem.config.js sets max_restarts: 10, so a client that repeats the request stops pm2 from restarting the app.

**Impact.** Any unauthenticated network client that can reach the site can kill the stats backend with a single request carrying a malformed cookie; while it is down every auth_request returns 502 and the whole site (not just /admin) is unreachable. Repeating it ~10 times exhausts pm2's restart budget and turns it into a persistent outage until an operator intervenes. Not tested at runtime (static analysis only) but the code path is unconditional.

**Fix.** Wrap the decode: `try { out[k] = decodeURIComponent(v) } catch { out[k] = v }`. Additionally wrap the request handler body in try/catch that answers 500, and register process.on('unhandledRejection') logging so one bad request can never take the process down.

> **exploitability review — upheld** (high confidence). Evidence confirmed verbatim at proxy/site-stats.mjs:1736-1737 ("const v = piece.slice(idx + 1).trim()" / "if (k) out[k] = decodeURIComponent(v)"), inside parseCookies (line 1728) with no try/catch. findSessionByCookie (1778-1780) calls it unguarded; callers at 2048, 2832, 3013, 3047 all sit inside "const server = createServer(async (req, res) => {" (line 2786), whose body has no try/catch (grep for try blocks between 2786-2840 returns nothing). No process.on('unhandledRejection'|'uncaughtException') exists in any proxy/*.mjs (only a signal handler at voltron-proxy.mjs:686). Node is v24.21.0, so an async-handler rejection is fatal. Reachability holds: nginx/server.conf:195 sets "auth_request /internal/authcheck;" server-wide, and the target block (198-210) proxies to stats_backend including nginx/proxy-headers.inc, which sets only Host/X-Real-IP/XFF/X-Forwarded-Proto and never clears Cookie — so a client's raw Cookie header reaches parseCookies on nearly every page load, pre-authentication. ecosystem.config.js sets max_restarts: 10 as claimed.
>
> *Correction:* Confirmed as written; one nuance on outage permanence: pm2's max_restarts:10 counts unstable restarts (crashes inside min_uptime, default 1s) and the counter resets once the process stays up, so ~10 spaced-out requests do not permanently stop it — an attacker must flood requests so each restart dies within a second to exhaust the budget. Either way, a single unauthenticated request carrying a malformed cookie (e.g. "Cookie: x=%E0") kills apen-stats-api, and while it is down the site-wide auth_request gate fails and the entire site, not just /admin, is unavailable.

> **mitigation review — upheld** (high confidence). Evidence confirmed verbatim. proxy/site-stats.mjs:1736-1737 is exactly `const v = piece.slice(idx + 1).trim()` / `if (k) out[k] = decodeURIComponent(v)` — no try/catch, and it is the only decodeURIComponent in proxy/*.mjs. Reachability confirmed: findSessionByCookie (1778-1782) calls it; the async handler at 2786 hits it at 2831-2832 for /internal/authcheck. I looked for the mitigations the finder might have missed and found none: `grep -rn "process\.on" proxy/` returns only voltron-proxy.mjs:686 (a signal handler), so no unhandledRejection/uncaughtException guard exists. nginx/server.conf:195 applies `auth_request /internal/authcheck` server-wide; nginx/proxy-headers.inc (lines 10-15) sets only Host/X-Real-IP/X-Forwarded-*, so the raw Cookie header is forwarded unmodified. No limit_req on plain page GETs (only the zones at 273-747), and one request suffices anyway. No test in tests/ pins parseCookies behaviour. Severity stands: any host that can reach the vhost kills the site-wide auth gate unauthenticated.
>
> *Correction:* Accurate except for one overstated detail: pm2's max_restarts:10 (ecosystem.config.js:22) is counted against *unstable* restarts — pm2 resets that counter once a process stays up past min_uptime (default 1s), so a slow trickle of malformed-cookie requests causes restart flapping rather than a permanent errored state; a persistent outage requires the attacker to re-crash within ~1s of each restart, which is trivially achievable in a loop. Everything else holds: proxy/site-stats.mjs:1737 decodes every cookie value unguarded, the rejection is unhandled anywhere in proxy/*.mjs, and nginx forwards the Cookie header untouched to the server-wide auth_request target.

---

### 41. Malformed cookie triggers unhandled URIError crashing the API (unauthenticated site-wide DoS)

**Security · high** · `proxy/site-stats.mjs:1737`

```
if (k) out[k] = decodeURIComponent(v)
```

**What it is.** parseCookies() calls decodeURIComponent on the raw cookie value with no try/catch. decodeURIComponent throws URIError on any malformed percent-escape (e.g. Cookie: apen_session=%). parseCookies is called from findSessionByCookie(), which runs inside the async createServer handler on nearly every request, including GET /internal/authcheck (the nginx auth_request subrequest fired on almost every page). The handler is `createServer(async (req,res)=>{...})` with no await on its returned promise, and there is no process.on('uncaughtException'|'unhandledRejection') handler anywhere in the file. On Node v24 (this deployment) an unhandledRejection terminates the process by default. A single request bearing a malformed cookie therefore rejects the handler promise and crashes the process; pm2 restarts it (max_restarts:10) but a trivial request loop exhausts the restart budget and takes the entire stats/auth/announcements/login API down.

**Impact.** Any unauthenticated remote client can crash the proxy at will with one request (a malformed cookie), and a short loop drives pm2 past max_restarts:10, leaving login (/api/auth/*), site-wide auth_request (breaking every page load), announcements, and the admin API down until manual restart.

**Fix.** Wrap decodeURIComponent in try/catch (fall back to the raw value) inside parseCookies, and add process-level 'uncaughtException'/'unhandledRejection' handlers plus a top-level try/catch in the request handler so no single request can crash the process.

> **exploitability review — upheld** (high confidence). Every element verified. proxy/site-stats.mjs:1737 is verbatim `if (k) out[k] = decodeURIComponent(v)`, inside parseCookies (1728-1740) with no try/catch. findSessionByCookie:1780 calls it; the async handler is `createServer(async (req, res) => {` at 2786 and I scanned 2786-4744 for any 2-space-indent `try {`/`} catch` — none exists, so no top-level catch. `grep "process.on(" proxy/*.mjs` hits only voltron-proxy.mjs:686 (signals); site-stats.mjs and all 8 local imports have no unhandledRejection/uncaughtException handler, and ecosystem.config.js sets no node_args. `node -v` = v24.21.0, where unhandled rejection is fatal by default. ecosystem.config.js:22 `max_restarts: 10`.

Reachability confirmed: server.conf:195 `auth_request /internal/authcheck;` is server-level, and proxy-headers.inc never unsets Cookie, so the subrequest carries it to handler line 2831 on nearly every page. Exploitability is actually worse than reported: server.conf:409-412 `location = /api/auth/whoami` has `auth_request off;` and no `limit_req` (unlike /api/auth/login:394-396), giving an unauthenticated, unrate-limited crash endpoint that reaches findSessionByCookie at 3013.

> **mitigation review — upheld** (high confidence). Confirmed at proxy/site-stats.mjs:1737 verbatim: `if (k) out[k] = decodeURIComponent(v)` inside parseCookies (1728-1740), no try/catch. Handler is `const server = createServer(async (req, res) => {` at 2786, body starts directly with the OPTIONS branch — no top-level try/catch; it ends at 4744 with `res.writeHead(404, CORS).end()`. findSessionByCookie (1778) → parseCookies is hit at 2832 for GET /internal/authcheck, and at 2993/3013/3047 on auth routes. `grep -rn "process.on|unhandledRejection|uncaughtException" proxy/*.mjs` yields only voltron-proxy.mjs:686 (signal handler) — nothing in site-stats.mjs or its imports. `node -v` = v24.21.0 (unhandled rejection = fatal by default); ecosystem.config.js sets max_restarts: 10 with no node args. nginx/server.conf:195 `auth_request /internal/authcheck;` is site-wide; proxy-headers.inc sets only Host/X-Real-IP/XFF/proto and does not strip Cookie, so the client's raw cookie reaches the backend. No test covers parseCookies. No mitigation found in nginx, CSP, ACLs, or config.
>
> *Correction:* Accurate as written, with two refinements: (1) parseCookies decodes EVERY cookie value, not just apen_session, so any cookie on the domain containing a bare `%` crashes the process — this is reachable accidentally, not only by attack; (2) pm2 only counts a restart as "unstable" against max_restarts:10 when the process dies within min_uptime (1s default), so budget exhaustion requires a sustained request loop; a slow trickle instead causes repeated short site-wide 500s (auth_request failure) rather than a permanent stop. Severity high stands: one unauthenticated request from any host that can reach the site takes down login, the site-wide auth gate, announcements and the admin API.

---

### 42. Denied and failed privileged requests are never recorded anywhere

**Security · high** · `proxy/site-stats.mjs:2046`

```
function authorizeAdmin(req) {
  // 1) Session cookie path — admin-kind only
  const session = findSessionByCookie(req)
```

**What it is.** authorizeAdmin (2046-2081) returns false on every failure path — non-admin session (2062), CSRF mismatch (2055), missing/short/wrong admin token (2068-2078) — without logging anything, and every one of the 21 call sites simply writes a 401 JSON body and returns. recordAuthEvent is invoked from exactly one place in the file (line 2944), inside the login handler, and only when the username parser rejected the name before any DC was contacted; the comment at 2939-2941 states a wrong password is deliberately not recorded. The result is that failed authorization against the admin control plane — CSRF-token brute force, replay of an expired cookie, x-admin-token guessing, a general-kind session probing admin routes — produces no entry in auth-events.json, none in content-audit.json, and not even a console line.

**Impact.** There is no detection surface for credential stuffing or privilege-escalation probing against /api/admin/*. AU-2 requires unsuccessful access attempts to be auditable events; an attacker can iterate against the admin API indefinitely and the only residue is an nginx 401 line with an IP and no identity (see the separate $auth_user finding).

**Fix.** Record a structured event on every authorizeAdmin denial — reason ('no-session','not-admin','csrf-mismatch','bad-token'), route, method, IP and workstation — into authEvents (it already has severity/reason/detail fields and an admin panel that renders it), and rate-limit or alert on repeats from one source.

> **exploitability review — upheld** (high confidence). Evidence confirmed verbatim at proxy/site-stats.mjs:2046-2048 ("function authorizeAdmin(req)" / comment / findSessionByCookie). All failure returns (2055, 2062, 2068-2078) are bare `return false`; sampled call sites (3297-3301, 4075-4079) only write 401 JSON. recordAuthEvent is defined at 1859 and called once, at 2944, only when result.severity is set (parser rejection); comment 2940-2942 confirms wrong passwords are deliberately unrecorded. So the audit gap is real.

But exploitability is narrower than stated. Every authorizeAdmin route sits behind the site-wide gate (nginx/server.conf:195 `auth_request /internal/authcheck;`) AND admin-acl.inc, which includes blocked-hosts.inc then allows only 4 workstation IPs + 127.0.0.1 with `deny all;` and 404 masking (server.conf:251,430,449). An unauthenticated or off-allowlist attacker never reaches the function. x-admin-token guessing is not a path: nginx injects the real token (server.conf:445,458) and a session-bearing general user is denied at 2062 first.

Also inaccurate: 38 call sites, not 21; and barred-host admin hits DO log (2813 console.warn).
>
> *Correction:* authorizeAdmin (proxy/site-stats.mjs:2046) does return false on every denial path without recording anything, and all 38 call sites (not 21) emit only a 401 JSON body, so no-session, not-admin, CSRF-mismatch and bad-token denials leave no entry in auth-events.json or content-audit.json. The gap is genuine but the reachability and impact are overstated: every authorizeAdmin-gated route is behind both the site-wide auth_request session gate (nginx/server.conf:195) and admin-acl.inc, which includes blocked-hosts.inc and then allows only four workstation IPs plus 127.0.0.1 before `deny all`, with 403 rewritten to 404. An unauthenticated or non-allowlisted attacker is stopped at nginx and never reaches the function, so there is no remote brute-force surface; x-admin-token guessing in particular is not a path because nginx injects the real token into every /api/admin/* request (server.conf:445,458) and a general-kind session is rejected at 2062 before the token branch ever runs. The realistic uncovered case is an authenticated general-kind user probing admin routes from an allowlisted workstation, or direct loopback access. The claim of "not even a console line" is also wrong for one class: a barred workstation hitting an admin path is logged at 2813 (console.warn) before authorizeAdmin runs. Recommendation stands, at medium severity.

> **mitigation review — upheld** (high confidence). Mechanism confirmed: proxy/site-stats.mjs:2046-2081 has no logging on any denial path, and all 38 (not 21) call sites, e.g. 3297-3300, just emit `res.writeHead(401 ...)` / `'Unauthorized'`. recordAuthEvent is called only at 2944.

But the stated impact is wrong on every specific threat:
- Credential stuffing IS logged. Every failed bind, wrong password included, hits `console.warn(`[site-stats] LDAP auth against ${dc.url} failed for "${normalized}" ...` at 2007; admin grants at 2982.
- x-admin-token guessing is impossible through nginx: server.conf:458 `proxy_set_header x-admin-token $admin_api_token;` ("overrides any client-supplied value"), same at 445.
- "Iterate indefinitely" is false: nginx/admin-acl.inc:22-27 allows 4 workstation IPs + 127.0.0.1 then `deny all;`, included on `^~ /api/admin/` (server.conf:448-450) with `error_page 403 =404`, logged to cui_nginx_access.log (server.conf:154).
- Barred-host admin probes log workstation+user at site-stats.mjs:2813.

Residual gap: a general-kind session, expired cookie or CSRF mismatch from an already-allowlisted trusted workstation leaves no app-level record. Real AU-2 nit, not high.
>
> *Correction:* authorizeAdmin (proxy/site-stats.mjs:2046-2081) does return false without recording anything, and every call site writes a bare 401, so there is no app-level audit record of an authorization denial on /api/admin/*. However the claimed impact is largely already mitigated: failed logins, including every wrong password, are logged to the pm2 process log at site-stats.mjs:2007; parser-rejected/spoof names go to auth-events.json at 2944; barred-workstation admin probes are logged with workstation and user at 2813; nginx overwrites any client-supplied x-admin-token with the real one (server.conf:445, 458), so token guessing cannot happen over HTTP at all; and /api/admin/* is IP-allowlisted to four named workstations plus loopback with a trailing `deny all` (nginx/admin-acl.inc:22-27, included at server.conf:448-450), with the rejections landing in cui_nginx_access.log (server.conf:154). What actually goes unrecorded is a CSRF mismatch, an expired cookie, or a general-kind session probing an admin route from one of the already-trusted allowlisted workstations — a real AU-2 completeness gap worth a few lines in recordAuthEvent, but low severity, not a missing detection surface for credential stuffing or privilege escalation.

---

### 43. Login route: JSON body `null` throws in async handler and crashes the proxy

**Security · high** · `proxy/site-stats.mjs:2918`

```
try { parsed = JSON.parse(body || '{}') } catch { /* parsed stays {} */ }
...
const requestedRealm = typeof parsed.realm === 'string' ? parsed.realm.trim() : ''
```

**What it is.** `JSON.parse('null')` succeeds and leaves `parsed === null`; the very next line reads `parsed.realm`, which throws a TypeError. The throw happens inside the `async (req, res) =>` callback passed to `createServer` (line 2786), which has no enclosing try/catch (the handler ends at line 4744 with a bare 404), and the process installs no `process.on('unhandledRejection')` handler and runs with no `--unhandled-rejections` flag (ecosystem.config.js has no node_args; Node is v24). An unhandled rejection therefore terminates the process. `/api/auth/login` is pre-auth (`auth_request off`, nginx/server.conf:395) and rate-limited to 2/min burst 3 per IP.

**Impact.** Any unauthenticated client can POST `null` to /api/auth/login and kill site-stats. pm2 restarts it, but `max_restarts: 10` (ecosystem.config.js:21) means about ten requests over a few minutes (or a few IPs at once) leave the app in 'errored' state. Because nginx's site-wide `auth_request /internal/authcheck` also targets this process, the outage is not limited to /api/*: every gated page on the site fails with a 500 until an operator intervenes. The same shape exists in proxy/cert-request.mjs:216 (`body.csr` on a null body) once CES/CEP is configured.

**Fix.** Guard the parse result: `if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) parsed = {}`. Independently, wrap the createServer callback body in a try/catch that logs and returns 500, and add a `process.on('unhandledRejection')` logger so one bad request can never take the whole API down. Apply the same object check in cert-request.mjs readJsonBody.

> **exploitability review — upheld** (high confidence). Evidence confirmed verbatim. proxy/site-stats.mjs:2913 `try { parsed = JSON.parse(body || '{}') } catch { /* parsed stays {} */ }` and :2918 `const requestedRealm = typeof parsed.realm === 'string' ? ...`. `JSON.parse("null")` -> null, so :2918 throws TypeError.

Reachability traced: nginx/server.conf:394-398 `location = /api/auth/login { auth_request off; limit_req zone=feedback_limit burst=3; proxy_pass http://stats_backend/...}` — no admin-acl.inc include, explicitly pre-auth, so any unauthenticated client reaches it. Only gate before the parse is `LDAP_CONFIGURED` (site-stats.mjs:289, `LDAP_REALMS.length > 0`), true in production.

Crash confirmed: the `createServer(async (req,res)=>` callback has no enclosing try/catch (handler runs to the bare `res.writeHead(404, CORS).end()` at :4744); `grep -rn "unhandledRejection|uncaughtException" proxy/*.mjs` returns nothing; ecosystem.config.js has no `node_args`, so Node 24's default `--unhandled-rejections=throw` exits the process. nginx routes the site-wide `auth_request /internal/authcheck` to the same backend (server.conf:195, 209), so the blast radius claim holds.

Only the "permanent errored state" detail is off (see corrected_summary).
>
> *Correction:* Accurate except for one impact detail: the claim that ~10 requests leave the app permanently 'errored' is unsupported. ecosystem.config.js sets no `min_uptime`, so pm2's default 1000ms applies, and `max_restarts: 10` counts only *unstable* restarts (death within min_uptime); the nginx rate limit (feedback_limit 2r/m burst 3, server.conf:396) spaces a single attacker's requests ~30s apart, so the process lives far longer than 1s each cycle and pm2 resets the unstable counter — it restarts indefinitely. The real impact is a repeatable few-second outage per malicious request (unauthenticated remote DoS of /api/* and, via the shared `auth_request /internal/authcheck` upstream at server.conf:195/209, every gated page), which still justifies high. Permanent errored state would require many source IPs timing hits inside the first second of each boot. Scope is also slightly wider than stated: the same unguarded `parsed.*` shape recurs at proxy/site-stats.mjs:3067 (chat-history PUT, post-auth) and proxy/cert-request.mjs:216.

> **mitigation review — upheld** (high confidence). Core defect confirmed. proxy/site-stats.mjs:2913 `try { parsed = JSON.parse(body || '{}') } catch { /* parsed stays {} */ }` then :2918 `const requestedRealm = typeof parsed.realm === 'string' ...` — `JSON.parse('null')` yields null, so `.realm` throws. No mitigation exists upstream: nginx/server.conf:395-397 sets `auth_request off` with only `limit_req zone=feedback_limit burst=3` (2r/m per IP, server.conf:36), no Content-Type check; readJsonBody (:2083-2101) resolves any string; `awk` over the whole handler body (site-stats.mjs:2786-4744) found no 2-space-indent `try`/`catch`, and `grep -n "process.on"` returns nothing. Node v24 (verified) defaults to --unhandled-rejections=throw; ecosystem.config.js sets no node_args. Site-wide `auth_request /internal/authcheck` (server.conf:195) proxies to the same upstream `stats_backend { server 127.0.0.1:8788; }` (server.conf:65), so a crash does 500 every gated page. Only the impact claim is wrong: pm2 God.js:455 increments unstable_restarts only when `Date.now() - created_at < min_uptime*max_restarts` (10s), and created_at is set once (God.js:189) and not reset on autorestart — so a long-running app never reaches ERRORED.
>
> *Correction:* The crash is real and unauthenticated: POST body `null` to /api/auth/login makes `parsed` null at proxy/site-stats.mjs:2913, the read of `parsed.realm` at :2918 throws inside the un-try/caught async createServer callback, and with no process.on('unhandledRejection') and Node 24's throw default the process exits. Because nginx's site-wide auth_request (nginx/server.conf:195) also targets 127.0.0.1:8788, every gated page 500s during the restart. The "app ends up errored after ~10 requests" part is wrong: pm2 only counts unstable restarts within min_uptime*max_restarts (10s) of created_at (pm2 God.js:455), and created_at is not reset by autorestart (God.js:189), so a process that has been up more than 10 seconds is restarted indefinitely and self-heals in about a second. Real impact is therefore a repeatable few-second outage of the whole gated site rather than a latching outage, throttled to ~2/min per source IP by the feedback_limit zone (server.conf:36, 396) and reachable only from the internal enclave — medium, not high. The one-line fix (`if (!parsed || typeof parsed !== 'object') parsed = {}`) plus a handler-level try/catch and an unhandledRejection logger still stands, and the same null-body shape exists at proxy/site-stats.mjs:3067 and proxy/cert-request.mjs:216.

---

### 44. Successful admin sign-ins exist only as pm2 stdout; logouts are not recorded at all

**Security · high** · `proxy/site-stats.mjs:2983`

```
commitAdminSessionsToDisk()
        console.warn(`[site-stats] Admin session granted: user="${result.username}" domain="${result.domain || ''}" realm="${realmId}" ip="${remoteIp}"`)
```

**What it is.** When an LDAP bind succeeds and the account is in the admin group, the only record written is this console.warn at 2983 — unstructured text on pm2 stdout. No appendAuditEntry, no recordAuthEvent, so /admin#security (app/admin/AuthEventsPanel.tsx, which renders only refused sign-ins) and content-audit.json both show nothing. A non-admin ('general') session records nothing at all. The logout handler at 2992-3007 removes the session from adminSessions/generalSessions and commits to disk with no log line of any kind. ecosystem.config.js (lines 14-30) declares no out_file, error_file or log rotation, and no pm2-logrotate is installed by deploy/INSTALL.sh, so that stdout stream is an unbounded, unrotated, unsigned file outside the application's own retention.

**Impact.** The session lifecycle of the privileged control plane — who obtained admin, from where, and when they gave it up — is not in any durable audit store. Correlating an unlogged mutation (see the chat-history finding) to a person requires a pm2 log that no policy retains, and session termination cannot be established at all, defeating AU-2/AU-12 and any 'who was logged in at time T' question during an incident.

**Fix.** Write a structured audit record on session grant (kind 'auth.login', with username, domain, realm, kind, workstation, IP) and on logout/expiry ('auth.logout', 'auth.expired'), into the same append path the content audit uses; keep the console line as a convenience only. Separately, configure pm2-logrotate or explicit out_file/error_file paths under a rotated directory in ecosystem.config.js.

> **exploitability review — upheld** (high confidence). Evidence verified, with one off-by-one: the quoted pair is proxy/site-stats.mjs:2981-2982 (`commitAdminSessionsToDisk()` / `console.warn(\`[site-stats] Admin session granted: ...\`)`), not 2983 (2983 is `} else {`). The grant path writes no durable audit record — recordAuthEvent is called only under `if (result.severity)` (2943-2950), i.e. pre-DC refusals, and appendAuditEntry (921) is never called for auth. The non-admin branch (2984-2985) logs nothing. Logout at 2992-3007 filters both session arrays and returns 204 with no log line. ecosystem.config.js:13-45 declares no out_file/error_file; grep for "logrotate|out_file|error_file" across the repo returns nothing; deploy/INSTALL.sh:347-369 installs pm2 without logrotate. app/admin/AuthEventsPanel.tsx:4-9,65 renders only refusals. Exploitability lens: nothing here is attacker-triggerable — /api/auth/login (nginx/server.conf:394-400) and /api/auth/logout (402-406) are `auth_request off` but the gap is purely forensic, no privilege or data gain. Mitigations the finding omits: admin-sessions.json persists live sessions (username/domain/realm/ip/createdAt, 2978-2981), and appendAuditEntry (921-936) already stamps every content mutation with actor, workstation and IP, so mutations are not un-attributable.
>
> *Correction:* Accurate in substance, over-stated in severity and slightly off in citation. The console.warn is at proxy/site-stats.mjs:2982 (cited 2983). Confirmed: admin session grants produce only pm2 stdout, general-session grants produce nothing, logout (2992-3007) writes no record at all, and no pm2 log rotation or out_file/error_file is configured anywhere (ecosystem.config.js:13-45, deploy/INSTALL.sh:347-369). However the impact is narrower than claimed: appendAuditEntry (proxy/site-stats.mjs:921-936) already stamps every admin content mutation with the LDAP session user, ACL-derived workstation and IP into content-audit.json, so mutations are attributable without the pm2 log; and admin-sessions.json holds the live session record (username, domain, realm, remoteIp, createdAt) so "who holds admin right now" is answerable — what is missing is the historical record of grant and termination. Nothing here is attacker-reachable or exploitable for gain: it is an AU-2/AU-12 audit-completeness gap affecting post-incident reconstruction only, which fits medium rather than high.

> **mitigation review — upheld** (high confidence). Facts confirmed, impact inflated. site-stats.mjs:2979-2982 does push+commit+`console.warn` with no recordAuthEvent/appendAuditEntry; the logout block (2992-3007) writes no log line; ecosystem.config.js:12-42 has no out_file/error_file. Line cite is off by one (console.warn is 2982, not 2983).

But mitigations the finder missed: (1) appendAuditEntry (site-stats.mjs:921-940) stamps every mutating admin action with `by` = the LDAP session username (`req.adminUser`, set at 2055) plus `workstation` and `ip`, so attributing a mutation to a person does NOT require the pm2 log; (2) nginx/server.conf:154 `access_log /var/log/nginx/cui_nginx_access.log main;` durably records every POST /api/auth/login and /api/admin/ call with source IP under OS logrotate; (3) nginx/admin-acl.inc:22-25 limits the admin surface to four IPs each annotated with its AD user (`allow 140.32.70.41; # CESCDREN14 (JWebber.ou)`); (4) a successful login is a real DC bind, so the authoritative success event is in the Windows security log — the comment at 1820 relies on exactly that distinction; (5) admin-sessions.json persists username/createdAt/remoteIp/expiresAt at 0600.
>
> *Correction:* Accurate as a gap, overstated as a risk. It is true that a successful admin session grant produces only an unstructured console.warn (proxy/site-stats.mjs:2982) and that logout (2992-3007) writes no record at all, so /admin#security shows only refused sign-ins and pm2's stdout is unrotated (ecosystem.config.js declares no out_file/error_file). However the stated impact — that attributing an action to a person depends on that pm2 log — is wrong: appendAuditEntry (site-stats.mjs:921-940) records the authenticated LDAP username, workstation and IP on every mutating admin call; nginx logs every login POST and admin request to a rotated per-site access log (nginx/server.conf:154); the admin surface is limited to four IP-allowlisted workstations each mapped to a named AD account (nginx/admin-acl.inc:22-25); and the successful bind itself is an event on the domain controller's security log, which is the authoritative AU-2 store for authentication here. What actually remains is a convenience/completeness gap — no in-app "session started/ended" timeline — plus an unbounded pm2 log. Worth a small fix (emit auth.login/auth.logout through recordAuthEvent, add pm2-logrotate), not a high-severity audit failure.

---

### 45. Admin routes that destroy or alter state write no audit entry (chat-history delete, alert dismissals)

**Security · high** · `proxy/site-stats.mjs:3576`

```
if (req.method === 'DELETE' && url === '/api/admin/chat-history') {
    if (!authorizeAdmin(req)) {
      chatHistoryStorage = chatHistoryStorage.filter((r) => r.id !== id)
```

**What it is.** Three state-changing admin routes pass through authorizeAdmin and mutate a persisted store without ever calling appendAuditEntry: DELETE /api/admin/chat-history (authorizeAdmin at line 3577, deletes a record from proxy/chat-history.json via commitChatHistoryToDisk at 3587); POST /api/admin/dismissed-alerts (authorizeAdmin at 3513, writes proxy/dismissed-alerts.json at 3530-3531); DELETE /api/admin/dismissed-alerts (authorizeAdmin at 3543, removes the dismissal record at 3551-3552). The chat-history route is the worst case: the block comment at line 3564 calls this store the "Admin-wide chat transcript audit", so an admin can delete the only copy of a user's AI-assistant transcript and the deletion itself leaves no trace in content-audit.json, auth-events.json, or anywhere else. The dismissal POST even computes an actor name (`by` at 3528) and writes it into the dismissal record, showing the attribution data was on hand and simply not sent to the audit log. Measured: 42 authorizeAdmin calls vs 25 appendAuditEntry calls in this file.

**Impact.** A privileged deletion of user chat transcripts and privileged suppression of security/system alerts are both invisible to after-the-fact review. An admin (or anyone who replays a stolen admin cookie plus CSRF token) can silence alerting and destroy transcript evidence with zero accountability record — a direct NIST 800-53 AU-2/AU-3 gap on exactly the actions an investigator would look for first.

**Fix.** Add appendAuditEntry({ kind: 'chat-history.delete', slug: id }, req) before the 200 response at 3588, and equivalent 'alert.dismiss' / 'alert.restore' entries in the two dismissed-alerts handlers. Better: make the audit call a wrapper around authorizeAdmin (e.g. requireAdmin(req, res, {kind}) that logs on both allow and deny) so a new mutating route cannot be added unlogged.

> **exploitability review — upheld** (high confidence). Evidence confirmed verbatim. proxy/site-stats.mjs:3576 `if (req.method === 'DELETE' && url === '/api/admin/chat-history') {`, :3577 authorizeAdmin, :3586-3587 filter + commitChatHistoryToDisk — no appendAuditEntry in the block (grep of all 25 appendAuditEntry call sites: none between 3470 and 3715). Same for POST dismissed-alerts (:3512-3531, actor computed at :3528) and DELETE (:3542-3553). So the audit gap is real.

Exploitability, though, is insider-only: nginx/server.conf:448 `location ^~ /api/admin/` includes admin-acl.inc (IP allowlist) and server.conf:195 `auth_request /internal/authcheck` rejects session-less callers (site-stats.mjs:2833), while authorizeAdmin:2065 denies any non-admin session and :2051-2053 requires the CSRF header. No unauthenticated path. server.conf:154 `access_log /var/log/nginx/cui_nginx_access.log main;` plus auth_request_set $auth_user (:196) still records method/URI/IP per call, so the action is not wholly traceless — the record id and app-level actor are what's missing. "Only copy" is overstated: the transcript is the user's own synced store, re-PUT by their browser (site-stats.mjs:3060-3090).
>
> *Correction:* Accurate as a missing-audit-log finding, overstated as a security exposure. Three state-changing admin handlers in proxy/site-stats.mjs — DELETE /api/admin/chat-history (3576-3588), POST /api/admin/dismissed-alerts (3512-3532), DELETE /api/admin/dismissed-alerts (3542-3554) — mutate persisted JSON without calling appendAuditEntry, so content-audit.json records no actor or target id for them. Reaching them requires an allowlisted source IP (nginx/server.conf:449 admin-acl.inc), a valid session passing auth_request (server.conf:195), an admin-kind session (authorizeAdmin, site-stats.mjs:2065) and a matching CSRF header (2051-2053); there is no unauthenticated or non-admin path, so this is an accountability gap for a privileged insider or a stolen admin session, not an attacker-reachable vulnerability. Partial mitigation: the vhost access log (server.conf:154) plus $auth_user records the method, path, IP and user for each call, so only the affected record id and the app-level attribution are lost. The "only copy of the transcript" framing is wrong — chat-history is the user's own synced store, rewritten by their browser via PUT /api/chat-history (3060-3090). Fix as recommended (audit entries in all three handlers, ideally folded into authorizeAdmin).

> **mitigation review — upheld** (high confidence). Evidence verified: proxy/site-stats.mjs:3576-3588 (DELETE chat-history: authorizeAdmin 3577, filter 3586, commitChatHistoryToDisk 3587), :3512-3531 and :3542-3552 (dismissed-alerts POST/DELETE). No appendAuditEntry in any of the three (25 call sites listed, none between 3470 and 3715). So the literal gap is real. But the impact is overstated. (1) Dismissal is not destruction and not unattributed: :3529-3530 persists `{id, by, at}` and app/admin/AdminDashboard.tsx:258,268-277 renders a "dismissed" filter tab with "Dismissed by {dismissal.by} · {at}" to every admin — the alert stays in the feed. DELETE (:3551) un-hides an alert, which reduces suppression. (2) The chat store is not evidentiary: proxy/site-stats.mjs:3069-3071 lets any signed-in user overwrite their own transcript with an empty array, and :3085-3087 auto-evicts at 5000 records. (3) nginx/server.conf:154 logs every /api/admin/ request (no access_log off in the :448 block) and admin-acl.inc maps source IP to workstation/AD user (site-stats.mjs:~880 loadWorkstationMap), so the DELETE is traceable to a named admin.
>
> *Correction:* Accurate as a gap, inflated as a risk. Three admin routes in proxy/site-stats.mjs mutate persisted state without appendAuditEntry: DELETE /api/admin/chat-history (3576-3588), POST /api/admin/dismissed-alerts (3512-3531), DELETE /api/admin/dismissed-alerts (3542-3552). The "silence alerting and destroy evidence with zero accountability" framing does not hold. Dismissals already write their own attributed record ({id, by, at}, 3530) that the console surfaces to every admin as a "Dismissed by X" line under a dismissed filter (AdminDashboard.tsx:258, 268-277); the underlying alert is only hidden, and the DELETE handler restores it. chat-history.json is a convenience sync any user can wipe themselves via PUT /api/chat-history (3069-3071) and that self-evicts at 5000 records (3085-3087), so it was never a transcript of record despite the section comment at 3564. Every one of these calls is also recorded in cui_nginx_access.log (nginx/server.conf:154, with no access_log off on the ^~ /api/admin/ block at :448) from an IP the admin ACL maps to a named workstation and AD user. Real residual gap: the content audit log has no entry for a transcript deletion or a dismissal-record removal, so reconstructing either requires correlating nginx logs. Worth a two-line fix (an appendAuditEntry in each handler), not a high-severity AU-2/AU-3 finding on an ACL-gated console whose admins are trusted LDAP group members.

---

### 46. POST /api/notification-settings and POST /api/acknowledged-alerts mutate persisted state with no authorizeAdmin() check

**Security · high** · `proxy/site-stats.mjs:3598`

```
if (req.method === 'POST' && url === '/api/notification-settings') {
    let body = ''
    req.on('data', c => { body += c.toString() })
```

**What it is.** Every other state-changing endpoint in this file opens with `if (!authorizeAdmin(req)) { ...401... }` — 37 occurrences. These two POST handlers (line 3598 and line 3269) do not, and neither do their GET counterparts (lines 3252, 3261). They are listed in ADMIN_ONLY_ROUTES (line 2426) so nginx's admin-acl.inc IP allowlist is the only gate; there is no session check, no CSRF check, and no same-origin check. acknowledgedAlertIds also grows without bound since the handler only de-dupes, never trims.

**Impact.** Anything running on an allowlisted admin workstation — a browser tab on any site, a script, a compromised process — can silently rewrite the notification recipient address or flood the acknowledged-alert list, with no LDAP session and no audit entry. The proxy's fail-closed admin design is bypassed for these routes because the check is simply absent.

**Fix.** Add the same `if (!authorizeAdmin(req))` prologue these routes' siblings use (it enforces the CSRF token on POST), and record an appendAuditEntry like the other admin writes do. Bound acknowledgedAlertIds the way feedbackStorage is bounded.

> **exploitability review — upheld** (high confidence). Evidence confirmed verbatim. proxy/site-stats.mjs:3598 `if (req.method === 'POST' && url === '/api/notification-settings') {` and :3269 for acknowledged-alerts both parse the body and commit to disk with no authorizeAdmin() call; GETs at :3253/:3263 likewise. 37 siblings use `if (!authorizeAdmin(req))` (grep -c). authorizeAdmin (:2046-2058) is what enforces admin-kind sessions and the x-csrf-token on POST, so both are absent here. Both handlers return wildcard `CORS` (:2408) rather than `adminCors`, and JSON.parse ignores Content-Type, so a cross-origin simple POST is a working CSRF write. normalizeAcknowledgedAlertIds (:2215-2222) only de-dupes — no cap — confirming unbounded growth. ONE correction: the description says admin-acl.inc is "the only gate." nginx/server.conf:338-350 includes admin-acl.inc but omits `auth_request off;`, so the site-wide `auth_request /internal/authcheck;` (server.conf:195) is inherited; a session-less script from an allowlisted IP is 401'd at nginx. Exploit needs allowlisted IP AND any valid (possibly non-admin) session — narrower than stated, hence medium.
>
> *Correction:* The missing-authorization core of the finding is correct and verified: proxy/site-stats.mjs:3598 (POST /api/notification-settings), :3269 (POST /api/acknowledged-alerts) and their GETs at :3253/:3263 have no authorizeAdmin() prologue, unlike 37 sibling handlers, so there is no admin-kind session check, no CSRF-token check, no audit entry, and acknowledgedAlertIds grows without bound (normalizeAcknowledgedAlertIds at :2215 de-dupes only). They also emit wildcard CORS (:2408) instead of adminCors, and JSON.parse ignores Content-Type, so a cross-origin "simple" POST is a live CSRF write. The reported reachability is overstated on one point: nginx/server.conf:338 and :345 include admin-acl.inc but do NOT set `auth_request off;`, so these locations inherit the site-wide `auth_request /internal/authcheck;` at server.conf:195. The IP allowlist is therefore not the only gate — a caller must also present a valid general-or-admin session cookie. Realistic exploitation is a CSRF or an ordinary non-admin LDAP user operating from one of the five allowlisted admin workstations, who can silently rewrite the alert recipient address or flood the acknowledged-alert file. Real privilege-boundary gap, but with two preconditions rather than one, so medium rather than high.

> **mitigation review — upheld** (high confidence). Code defect confirmed: proxy/site-stats.mjs:3253, 3263, 3269, 3598 handle these routes with no authorizeAdmin() call. But the claimed effect is largely mitigated upstream. nginx/server.conf:195 sets `auth_request /internal/authcheck;` at server scope (inherited by every location; the comment at :182-194 says so explicitly), and neither location = /api/notification-settings (nginx/server.conf:338) nor = /api/acknowledged-alerts (:345) sets `auth_request off;` — unlike /api/content-overrides (:330). site-stats.mjs:2831-2836 returns 401 when no session cookie exists, so nginx rejects session-less callers, including from 127.0.0.1. So "no LDAP session" is false. CSRF is also blocked: the session cookie is `HttpOnly; Secure; SameSite=Strict` (site-stats.mjs:1750-1755), so a tab on any other site sends no cookie and gets 401 at auth_request. admin-acl.inc additionally limits these paths to 5 allowlisted IPs plus loopback, with blocked-hosts.inc first and `error_page 403 =404`. Residual real gap: a general-kind (non-admin) LDAP user at an allowlisted workstation can rewrite the notification email or grow acknowledgedAlertIds unbounded (normalizeAcknowledgedAlertIds, :2215-2223, de-dupes but never trims), with no audit entry. Worth fixing; not high.
>
> *Correction:* The missing authorizeAdmin() check is real — proxy/site-stats.mjs:3253/3263/3269/3598 are the only /api state handlers in the file without it — but the stated impact is wrong. These are not reachable without a session: nginx/server.conf:195 applies `auth_request /internal/authcheck;` server-wide and neither location (server.conf:338, :345) opts out with `auth_request off;`, so site-stats.mjs:2831 rejects any caller lacking a valid LDAP session cookie, loopback included. Cross-site CSRF is also blocked independently: the session cookie is HttpOnly; Secure; SameSite=Strict (site-stats.mjs:1750-1755), so no third-party tab can carry it. Combined with admin-acl.inc (5 workstation IPs + 127.0.0.1, blocked-hosts.inc first, 403 masked as 404), the actual residual exposure is: an authenticated general-kind (non-admin) LDAP user sitting at an already-allowlisted admin workstation can change the notification recipient address or append unbounded strings to acknowledgedAlertIds (normalizeAcknowledgedAlertIds at :2215 de-dupes but never trims), and neither write produces an audit entry. That is a defense-in-depth / audit-completeness gap among already-trusted users, not a bypass of the admin gate — low severity. The recommended fix (add the authorizeAdmin prologue, appendAuditEntry, and cap acknowledgedAlertIds) is still correct.

---

### 47. POST /api/notification-settings mutates state with no authorizeAdmin call and no audit entry

**Security · high** · `proxy/site-stats.mjs:3598`

```
if (req.method === 'POST' && url === '/api/notification-settings') {
    let body = ''
    req.on('data', c => { body += c.toString() })
```

**What it is.** This handler (3598-3616) parses a JSON body, replaces the global notificationSettings object and calls commitNotificationSettingsToDisk() at 3608. It never calls authorizeAdmin and never calls appendAuditEntry. Its only protection is the nginx IP allowlist (nginx/server.conf:338-341, `location = /api/notification-settings` including admin-acl.inc), which means no session, no CSRF token and no user identity is involved at all — and since the proxy binds loopback, any local process or any other vhost path that can reach 127.0.0.1:8788 bypasses that ACL entirely. Contrast the sibling admin routes, which all begin with `if (!authorizeAdmin(req))`.

**Impact.** Alert-notification configuration (recipients, thresholds, enable flags) can be rewritten — including disabled outright so that system events stop notifying anyone — by a caller who was never authenticated, and no record of the change, its author, or its previous value exists. This is simultaneously an authorization gap and a total accountability gap on a control that governs whether other security signals are delivered.

**Fix.** Gate the handler with authorizeAdmin (same 401 pattern as the /api/admin/* routes) and append an audit entry recording the actor and the changed keys. Consider moving the route under the /api/admin/ prefix so it inherits the proxy-side token injection and prefix ACL rather than relying on a one-off nginx location block.

> **exploitability review — upheld** (high confidence). Evidence confirmed verbatim at proxy/site-stats.mjs:3598-3600, and commitNotificationSettingsToDisk() at :3608. No authorizeAdmin in the 3598-3616 block (all 40 other admin routes use it, e.g. :3577, :3644); no appendAuditEntry (grep shows none in that range). nginx/server.conf:338-341 matches as cited.

But the exploitability claim is overstated. server.conf:195 `auth_request /internal/authcheck;` is server-level and inherited; the notification-settings location (338-343) has NO `auth_request off;` (contrast :330 for content-overrides). So a valid session IS required. Reaching the handler needs (a) a valid LDAP session cookie and (b) an IP in admin-acl.inc (4 workstations + 127.0.0.1, blocked-hosts.inc first). CSRF is also mitigated: cookies are `SameSite=Strict` (:1754).

Residual real gap: general-kind (non-admin) sessions pass, defeating exactly the escalation authorizeAdmin's comment at :2059-2065 describes; plus unbounded body read (no MAX_CONTENT_BODY_BYTES, unlike readJsonBody at :2083) and no audit trail. GET at :3253 is ungated too.
>
> *Correction:* The code defect is real and confirmed: POST /api/notification-settings (proxy/site-stats.mjs:3598-3616) replaces the global notificationSettings and persists it at :3608 without calling authorizeAdmin and without appendAuditEntry, unlike every sibling admin route. However the finding's stated attack path is wrong in two material ways. First, "no session ... is involved at all" is false: nginx/server.conf:195 declares `auth_request /internal/authcheck;` at server scope, it is inherited by every location, and the notification-settings location (server.conf:338-343) does not opt out with `auth_request off;` (compare server.conf:330, which does). A caller must therefore already hold a valid LDAP session cookie. Second, the CSRF concern is mitigated independently: session cookies are issued `SameSite=Strict` (site-stats.mjs:1754), so a cross-site POST carries no cookie. The actual exploit requires an authenticated but non-admin ("general"-kind) session originating from one of the five entries in nginx/admin-acl.inc (four workstation IPs plus 127.0.0.1) and not listed in blocked-hosts.inc. That is a genuine privilege-separation gap — authorizeAdmin exists specifically to stop general-kind sessions from gaining admin rights, per its comment at site-stats.mjs:2059-2065 — combined with a real accountability gap, and the handler also reads the body with an uncapped `body +=` loop rather than readJsonBody's MAX_CONTENT_BODY_BYTES limit (:2083). The sibling GET at :3253 is ungated as well and discloses the configured recipient address. Medium, not high: it is post-authentication privilege escalation confined to the admin IP allowlist, not an unauthenticated rewrite.

> **mitigation review — upheld** (high confidence). Code claims confirmed: proxy/site-stats.mjs:3598-3616 has no authorizeAdmin and no appendAuditEntry, and commits to disk at 3608. But the finder's protection analysis is wrong. nginx/server.conf:195 sets `auth_request /internal/authcheck;` at server level ("inherited into every location"), and the /api/notification-settings block (server.conf:338-343) does NOT set `auth_request off` (contrast /api/content-overrides at 330). So a valid LDAP session cookie is required; "no session, no user identity is involved at all" is false. The session cookie is `SameSite=Strict` (site-stats.mjs:1754), which kills the cross-site CSRF path the finder implies. admin-acl.inc restricts to four workstation IPs plus 127.0.0.1, with blocked-hosts.inc first, and site-stats.mjs:2809 re-checks barred hosts for this exact route via ADMIN_ONLY_ROUTES (2429). Body is whitelisted to 5 scalar fields by normalizeNotificationSettings (2203-2213) — no injection surface. Sibling /api/acknowledged-alerts (3268) has the identical shape, so this is a route-class pattern, not a one-off.
>
> *Correction:* POST /api/notification-settings (proxy/site-stats.mjs:3598) does mutate persisted state without calling authorizeAdmin and without an audit entry — that part is accurate. However it is not reachable unauthenticated: nginx/server.conf:195 applies `auth_request /internal/authcheck` to every location that does not opt out, and this block (server.conf:338-343) does not opt out, so a valid LDAP session cookie is required; on top of that admin-acl.inc limits the route to four allowlisted admin workstations plus loopback, blocked-hosts.inc is consulted first, and site-stats.mjs:2809 re-checks barred IPs for this route server-side. The session cookie is SameSite=Strict (site-stats.mjs:1754), so the implied CSRF vector does not work, and normalizeNotificationSettings (2203-2213) whitelists five scalar fields, so no arbitrary object is written. The real residual gap is narrow: a logged-in but non-admin-kind user sitting at an already-allowlisted admin workstation (or any process on the box) can toggle the enable flag, the two notify flags and the alert email address, and no audit record names who did it or what it was before. On an internal site where those IPs are the admin workstations, the practical exposure is accountability, not authorization. The identical pattern exists at POST /api/acknowledged-alerts (3268), so the fix should cover both routes, not just this one.

---

### 48. IP-ACL-gated /test/ page is fully indexed into the unauthenticated search index

**Security · high** · `scripts/build-search-index.mjs:22`

```
const EXCLUDE = [
  /^\/admin(\/|$)/,
  /^\/403(\/|$)/,
```

**What it is.** nginx/server.conf:260 gates `location /test` with admin-acl.inc — a four-workstation IP allowlist plus 403→404 masking — explicitly so the mock previews "stay off the public surface". The EXCLUDE list in scripts/build-search-index.mjs (lines 22-33) omits /test entirely while covering /admin, /dren, /403 and /404. Verified in the artifact: out/search-index.json contains route "/test/" with title "NGINX Live Activity — UI Mock (simulated)", 10 headings, and 1600 characters of body text including the production hostname string "apensupport.blcs█████ nginx 1.30.3 + vts (mock)" and the full dashboard taxonomy (HTTP server zones, upstreams, stream zones, caches, shared memory zones, resolvers, workers).

**Impact.** The ACL on /test is defeated by the index. A client that is denied /test/ with a 404 can read the page's entire rendered text — including the running nginx version and VTS module in use — from /search-index.json with no session and no allowlisted IP. Any route the operators gate by IP but forget to add to EXCLUDE leaks the same way.

**Fix.** Add /^\/test(\/|$)/ to EXCLUDE, and derive EXCLUDE from the same list that drives the nginx admin-acl locations (or assert in tests/search-index.test.ts that every admin-acl-gated prefix is excluded) so the two cannot drift again.

> **exploitability review — upheld** (high confidence). Could not refute; every claim verified. scripts/build-search-index.mjs:22-33 is the EXCLUDE array and lists /admin, /403, /404, /dren, /repos, /network-analysis, /tools, /color-picker, /speedtest, /_next — no /test. nginx/server.conf:260-265 `location /test { include ...admin-acl.inc; error_page 403 =404 /404.html; ... }`; admin-acl.inc is four allow lines plus `deny all;`, and /test carries no `auth_request off`, so reaching it needs a session AND an allowlisted IP. The index is served by nginx/server.conf:622-626 `location = /search-index.json { auth_request off; ... }` — no ACL, and it opts out of the site-wide `auth_request /internal/authcheck;` (server.conf:195). The live artifact out/search-index.json (mtime Sep 15) contains route "/test/", title "NGINX Live Activity — UI Mock (simulated)", 10 headings and the body text including "apensupport.blcse.mil nginx 1.30.3 + vts (mock)". So an unauthenticated, non-allowlisted client does read the gated page's text. Impact is narrower than stated: the page self-labels as a mock with fabricated numbers, and the hostname is the site's own FQDN; the only real leak is the nginx version/module hint plus dashboard taxonomy.
>
> *Correction:* Accurate as to mechanism and reachability: /test is gated by admin-acl.inc plus the site-wide auth_request (server.conf:260-265), while /search-index.json is served with `auth_request off` and no ACL (server.conf:622-626), and out/search-index.json really does carry the full /test/ text because scripts/build-search-index.mjs:22-33 omits /test. The impact statement overstates it: the indexed page is a self-declared UI mock with fabricated metrics, and the "production hostname" is the site's own FQDN that every visitor already resolves. The genuine disclosure is the nginx version/module string and dashboard taxonomy, plus the structural drift risk that any future IP-gated route is leaked the same way — information disclosure, not an admin-data breach.

> **mitigation review — upheld** (high confidence). Facts check out. nginx/server.conf:260-262 gates `location /test` with admin-acl.inc + `error_page 403 =404`; admin-acl.inc ends `deny all;` after 4 workstation IPs. scripts/build-search-index.mjs:22-33 lists /admin, /403, /404, /dren, /repos, /_next etc. but not /test. out/search-index.json does carry `"route":"/test/"`, title "NGINX Live Activity — UI Mock (simulated)", 1600 chars. server.conf:622-623 `location = /search-index.json { auth_request off; }` with no ACL, so it is reachable without a session or allowlisted IP. No test pins this: tests/search-index.test.ts only asserts content floors and `pages.length >= 108`.

But impact is much smaller than "high". I dumped the indexed text: it contains zero IPs/ports (`p.text.match(/\d+\.\d+\.\d+\.\d+/) === null`) — the real loopback backends in public/test/index.html (127.0.0.1:8787/8788/8085) fall past the 1600-char cap. What leaks is UI labels, the site's own FQDN, and "nginx 1.30.3 + vts (mock)" on a page that self-labels as fabricated. That does nick `server_tokens off;` (server.conf:2), which is why it is not zero.
>
> *Correction:* The mechanism is confirmed: /test is IP-gated (nginx/server.conf:260) but omitted from EXCLUDE (scripts/build-search-index.mjs:22-33), and /search-index.json is served with `auth_request off` and no ACL (nginx/server.conf:622), so its rendered text is readable by any client that can reach the site. The disclosure itself is minor, not high: the indexed body is capped at MAX_BODY_CHARS=1600 and contains only dashboard UI labels, the site's own FQDN, and the banner "nginx 1.30.3 + vts (mock)" on a page that announces itself as simulated; the real loopback backend addresses present in public/test/index.html (127.0.0.1:8787/8788/8085, plus fabricated 10.0.2.x entries) are truncated out and no IP appears in the indexed text. The only genuine loss is the nginx version, which `server_tokens off;` (nginx/server.conf:2) otherwise hides. The drift risk the finder names is real and the one-line EXCLUDE fix is worth taking, but this is a low-severity information-disclosure/hardening gap on an internal site, not a high-severity ACL bypass.

---

### 49. IP allow-gate trusts client-controlled X-Forwarded-For; nginx appends rather than overwrites, and the download/upload locations forward it untouched

**Security · high** · `speedtest/backend/server.py:48`

```
def _client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
```

**What it is.** _authorized() decides access from the FIRST address in X-Forwarded-For (server.py:48-62). nginx/server.conf:512 sets `X-Forwarded-For $proxy_add_x_forwarded_for` for /speedtest/, which APPENDS the real address after whatever the client sent, and the two exact-match locations /speedtest/api/download (491-496) and /speedtest/api/upload (498-503) set no proxy_set_header at all, so the client's own header reaches the backend verbatim and, when absent, request.client.host is 127.0.0.1 (always trusted via _LOOPBACK in config.py:444). The config's own comment (server.conf:467-469, 478-480) says XFF must be overwritten 'NOT append' precisely because of this, but the directive does the opposite. The tests themselves rely on the spoof (tests/test_auth.py:12 sends X-Forwarded-For to pick the outcome).

**Impact.** Whenever SPEEDTEST_ALLOW_ALL=0 is set (the only supported way to enforce the allowlist), any client can bypass the gate by sending `X-Forwarded-For: 127.0.0.1`, and download/upload are ungated for everyone regardless because the backend sees loopback. The allowlist advertised in the README and on the page is unenforceable through nginx.

**Fix.** In nginx set `proxy_set_header X-Forwarded-For $remote_addr;` (overwrite) in every /speedtest location including the two exact-match ones, and in the backend prefer X-Real-IP or the LAST XFF entry, or simply use request.client.host with uvicorn `--proxy-headers --forwarded-allow-ips 127.0.0.1` so only nginx-set headers are honoured.

> **exploitability review — upheld** (high confidence). Evidence confirmed verbatim. speedtest/backend/server.py:48-52 is exactly as quoted; _authorized (56-62) and _require_auth (65-69) gate ping/download/upload/results (server.py:110,119,143,152). nginx/server.conf:512 is `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` (append), and locations 491-496 / 498-503 contain only auth_request/proxy_pass/limit_req — no proxy_set_header, and no server- or http-level proxy_set_header exists (grep: all are inside locations), so nginx forwards the client's own XFF verbatim there. With no XFF, request.client.host is 127.0.0.1 (nginx proxies loopback→127.0.0.1:8085, server.conf:67), trusted via config.py:32-35 + :50. Contradicting comment confirmed at server.conf:466-468 and 477-480. test_auth.py:12 does spoof XFF.

Two corrections. (1) The cite "config.py:444" is wrong — that file is 81 lines; _LOOPBACK is at 32-35. (2) Exploitability today is nil: config.py:61 defaults SPEEDTEST_ALLOW_ALL to "1" and nothing in the repo sets 0; even when enabled, _PRIVATE (config.py:41-49) trusts all RFC1918, so any LAN client passes unspoofed. Asset is bandwidth measurement, no data.
>
> *Correction:* The mechanism is real and correctly described: the speedtest IP allow-gate reads the FIRST X-Forwarded-For entry (speedtest/backend/server.py:48-52), nginx/server.conf:512 appends rather than overwrites ($proxy_add_x_forwarded_for), and the exact-match /speedtest/api/download and /speedtest/api/upload locations (server.conf:491-503) set no proxy headers at all, so a client-sent XFF reaches the backend untouched and an absent one leaves the backend seeing 127.0.0.1 (trusted per config.py:32-35, :50). The nginx comments at server.conf:466-468 and 477-480 assert the opposite of what the config does. However the severity is medium, not high, and the issue is latent rather than presently exploitable: config.py:61 defaults SPEEDTEST_ALLOW_ALL to "1" and no file in the repo sets it to 0, so the gate is open to everyone by design today and the spoof grants no access that is not already granted; and even with the gate enabled, config.py:41-49 trusts all RFC1918/CGNAT/link-local ranges by default, so any on-LAN client is authorized without spoofing — the bypass would only matter for an off-allowlist client, against an endpoint that exposes bandwidth measurement, not data. The finding's citation of "config.py:444" is wrong (that file is 81 lines; _LOOPBACK is at 32-35) and the comment lines are 466-468/477-480, not 467-469/478-480.

> **mitigation review — upheld** (high confidence). Mechanics confirmed. speedtest/backend/server.py:48-51 takes `xff.split(",")[0]`; _require_auth guards ping/download/upload/results (112,121,145,154). nginx/server.conf:512 is `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` (append), the comments at 466 and 478 claim the opposite, and the exact-match blocks at 491-503 set no proxy_set_header; I confirmed there is no server- or http-level proxy_set_header (only inside locations; proxy-headers.inc is not included there), so a client XFF passes verbatim. Severity is inflated. speedtest/backend/config.py:61 `ALLOW_ALL = _truthy(os.getenv("SPEEDTEST_ALLOW_ALL", "1"))` — open by default, and grep finds no env/compose/pm2 file in scope setting it to 0, so nothing is bypassed today. If enabled, config.py:25-27 and 40-48 already trust all DREN/CUI org ranges plus every RFC1918 range by default, so the spoof only buys access to a client outside those ranges that can already reach an internal-only vhost. Payoff is running a bandwidth test — no data or auth-boundary crossing — and it is capped by limit_req at 493/501 and _MAX_DOWNLOAD at server.py:42. Finder's "_LOOPBACK in config.py:444" is wrong (file is 81 lines; _LOOPBACK is 32-35).
>
> *Correction:* Accurate as a latent defect, overstated as a live vulnerability. The code facts hold: nginx appends rather than overwrites X-Forwarded-For for /speedtest/ (server.conf:512), the exact-match /speedtest/api/download and /speedtest/api/upload blocks (491-503) inherit no proxy_set_header at all so the client's header reaches the backend untouched, and speedtest/backend/server.py:48-51 authorizes on the first XFF entry — directly contradicting the config's own comments at 466 and 478. But the gate is not enforcing anything today: config.py:61 defaults SPEEDTEST_ALLOW_ALL to "1" and nothing in the repo sets it to 0, so every client is authorized regardless of headers. Even with the gate switched on, config.py:25-27 and 40-48 allowlist the org DREN/CUI ranges plus all RFC1918 by default, so spoofing only helps a client outside those ranges that can already reach an internal-only vhost, and the prize is a bandwidth measurement — no data exposure, no admin/session boundary crossed — with limit_req at 493/501 and the 64 MiB _MAX_DOWNLOAD cap (server.py:42) limiting abuse. This is a defense-in-depth/correctness bug that would silently defeat the control the moment someone turns it on, plus a comment that lies about what the config does. Fix it (proxy_set_header X-Forwarded-For $remote_addr in all three speedtest locations, or read X-Real-IP in the backend), but as low, not high.

---

### 50. npm audit cannot run at all, contradicting the "0 vulnerabilities" assurance in TOOLCHAIN-PINS.md

**Security · high** · `TOOLCHAIN-PINS.md:57`

```
or `/root`. This project was never exposed. `npm audit` reports **0 vulnerabilities**.
```

**What it is.** I ran `npm audit --omit=dev --json` read-only in the repo root. It fails outright: `npm error code ENOLOCK` / `audit This command requires an existing lockfile` / `Original error: loadVirtual requires existing shrinkwrap file`. Because no lockfile exists (see the related finding), npm audit has never been able to produce a result on this tree. `npm ls --depth=0` does work and lists all 28 direct packages cleanly, so the tree is installed and coherent — but coherence is not a vulnerability scan. The quoted sentence appears in a document written as ACAS remediation evidence for CVE-2026-71871.

**Impact.** A compliance/remediation document on the production host records a clean vulnerability scan that could not have been run. Anyone relying on TOOLCHAIN-PINS.md (an auditor, the ISSO named in NOTICE, or the next engineer doing a security-driven update) will believe the dependency tree has been scanned when no SCA has ever covered it. The rest of that document's reasoning about safe pins is sound; only this assurance is unsupported.

**Fix.** Create the lockfile, re-run `npm audit --omit=dev`, and replace line 57 with the dated, actual output. Until then, correct the line to state that npm audit is unavailable because there is no lockfile.

> **exploitability review — upheld** (high confidence). Evidence confirmed verbatim. `sed -n '57p' TOOLCHAIN-PINS.md` returns exactly: "or `/root`. This project was never exposed. `npm audit` reports **0 vulnerabilities**." No lockfile exists: `ls package-lock.json npm-shrinkwrap.json yarn.lock pnpm-lock.yaml` all ENOENT; `git ls-files | grep -i lock` returns no lockfile; `git log --all -- package-lock.json` is empty; `.gitignore` has no "lock" entry, so it was never committed, not merely ignored. Only `node_modules/.package-lock.json` exists, which Arborist's loadVirtual does not accept. So the assurance is unreproducible at HEAD.

Exploitability: none. TOOLCHAIN-PINS.md is not in `out/` (`find out -iname '*TOOLCHAIN*'` empty), not under `public/`, and nginx serves only `out/` — no location in nginx/server.conf exposes repo-root markdown. No attacker input, no handler in proxy/site-stats.mjs, no auth path involved. This is a documentation/compliance-accuracy defect, not a reachable vulnerability, so "high" is unsupported.

One overreach: package.json:22 `"clean": "rm -rf .next node_modules package-lock.json"` means a lockfile plausibly existed when node_modules was installed (2026-08-24) and was later deleted; "never been able to produce a result" is unverifiable.
>
> *Correction:* The factual core holds: TOOLCHAIN-PINS.md:57 states "`npm audit` reports **0 vulnerabilities**" and no lockfile exists in the working tree or anywhere in git history (no package-lock.json/npm-shrinkwrap.json/yarn.lock/pnpm-lock.yaml; `git ls-files` and `git log --all -- package-lock.json` both empty; .gitignore does not ignore it), so that assurance cannot be reproduced at HEAD — `npm audit` requires a root shrinkwrap and node_modules/.package-lock.json does not satisfy it. Two corrections. (1) Severity high is wrong under an exploitability lens: TOOLCHAIN-PINS.md is a repo-root markdown file, absent from out/ and public/, and nginx serves only out/, so no HTTP request reaches it; there is no tainted input, no handler, and no auth surface. The impact is compliance-evidence accuracy, not an attack path — low. (2) "npm audit has never been able to produce a result on this tree" is an overreach: package.json line 22 defines `"clean": "rm -rf .next node_modules package-lock.json"`, so a lockfile plausibly existed when node_modules was installed (2026-08-24) and was deleted by a later clean/reinstall. The defensible statement is that the claim is unverifiable and no lockfile is preserved as evidence, not that the scan was impossible.

> **mitigation review — upheld** (high confidence). Evidence confirmed verbatim at TOOLCHAIN-PINS.md:57: "or `/root`. This project was never exposed. `npm audit` reports **0 vulnerabilities**." The file is git-tracked.

No lockfile exists: `ls package-lock.json npm-shrinkwrap.json yarn.lock pnpm-lock.yaml` → all absent; `git log --all -- package-lock.json` → empty (never committed); .gitignore:2 only ignores node_modules/. package.json `clean` script even deletes package-lock.json. I confirmed the failure mode without running audit: ENOLOCK is thrown only by /usr/lib/node_modules/npm/node_modules/@npmcli/arborist/lib/arborist/load-virtual.js, and error-message.js:28-30 renders exactly the text the finder saw. So npm audit does fail on this tree.

No mitigation exists: grepping the whole repo for "npm audit" returns only line 57 — no CI/SCA step, no recorded scan output anywhere.

But severity is inflated. This is one inaccurate sentence in a Markdown file; no code path, no attack surface, no runtime effect. And the data is recoverable: node_modules/.package-lock.json (root:root, mode 644, lockfileVersion 3, with resolved+integrity for the full tree) exists, so a lockfile and a real audit are one copy away. TOOLCHAIN-PINS.md:24 carries the same unsupported "audits clean" claim.
>
> *Correction:* The factual claim is accurate and confirmed, but "high" is inflated. TOOLCHAIN-PINS.md:57 does assert `npm audit` reports 0 vulnerabilities, and npm audit cannot run here: no package-lock.json/npm-shrinkwrap.json exists in the tree or anywhere in git history, and arborist's load-virtual.js throws ENOLOCK before any scan. Repo-wide grep shows line 57 is the only mention of npm audit — there is no CI or SCA step that ever produced a result, so nothing mitigates it. TOOLCHAIN-PINS.md:24 repeats the same unsupported claim for TypeScript 6.0.3 ("audits clean"). However, the real impact is documentation accuracy in one tracked Markdown file, not an exploitable weakness: there is no code path, no attack surface, and no runtime effect on the production site. The remediation is also trivial and the dependency data is not lost — node_modules/.package-lock.json exists (root:root 644, lockfileVersion 3, full resolved+integrity map), so copying it to package-lock.json regenerates a valid lockfile and lets a real `npm audit --omit=dev` run. Correct line 57 (and line 24) to the dated actual output, or state that audit is unavailable pending the lockfile. Severity low; the substantive issue is the missing lockfile itself, which belongs in the separate finding.

---

## Confirmed — medium severity

### 51. components/ui/card.tsx reproduces shadcn/ui's Card primitive set verbatim

**Copyright · medium** · `components/ui/card.tsx:18`

```
<div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
```

**What it is.** The six exports (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter), their order, the forwardRef generic signatures, and shadcn's exact spacing class strings are reproduced: 'flex flex-col space-y-1.5 p-6' (line 18), 'text-2xl font-semibold leading-none tracking-tight' retained as 'text-xl font-semibold leading-none tracking-tight text-white' (line 25), 'p-6 pt-0' (line 39), 'flex items-center p-6 pt-0' (line 46), and the same export tail ordering at line 51. Only the color tokens and an inline glass background (line 9) were added. Same MIT origin and same missing notice as button.tsx and dropdown-menu.tsx.

**Impact.** Adapted-but-recognisable copy of MIT source with no preserved copyright notice.

**Fix.** Include in the shadcn/ui entry of THIRD-PARTY-NOTICES; add the origin header comment.

> **provenance review — upheld** (high confidence). Evidence confirmed verbatim. components/ui/card.tsx:18 is exactly `<div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />`; line 25 `text-xl font-semibold leading-none tracking-tight text-white`; line 39 `'p-6 pt-0'`; line 46 `'flex items-center p-6 pt-0'`; line 51 `export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }` — the out-of-order CardFooter is shadcn's distinctive tail. lib/data/utils.ts:4 is shadcn's twMerge(clsx()) cn(). Provenance is correct: I fetched shadcn-ui/ui LICENSE.md — MIT, "Copyright (c) 2023 shadcn". Current upstream main is the v4 rewrite (CardAction, data-slot, no forwardRef), so this tracks the legacy forwardRef registry, which I could not fetch (tag paths 404); that is my only unverified point.

Two corrections. (1) There is no THIRD-PARTY-NOTICES file to add an entry to — NOTICE is 36 lines of ownership/ATO/provenance text with no license content (NOTICE:19-36). (2) Severity is overstated: the file is 51 lines of forwardRef div wrappers whose only content is Tailwind spacing utilities — functional, thin expression, unlike dropdown-menu.tsx. It is one line-item of a single attribution gap, not a standalone medium.
>
> *Correction:* components/ui/card.tsx is genuinely derived from shadcn/ui (MIT, Copyright (c) 2023 shadcn) — the class strings at lines 18/25/39/46, the forwardRef+displayName shape, and the distinctive export tail at line 51 (CardFooter third) match, with only color tokens and an inline glass background at line 9 changed — and it carries no copyright notice. But the finding overstates it on two counts. There is no THIRD-PARTY-NOTICES file to amend: the repo's only NOTICE (36 lines) is an ownership/ATO/deploy-provenance document with no third-party license section, so the fix is to create such a file, not extend an entry. And card.tsx is the thinnest of the three shadcn-derived files — 51 lines of forwardRef div wrappers whose expressive content is limited to functional Tailwind spacing utilities, with no cva config or Radix wrapping. It should be folded into one shadcn/ui attribution item alongside button.tsx and dropdown-menu.tsx (the latter carrying the real substance) rather than tracked as a separate medium-severity copyright finding.

---

### 52. GlowCard spotlight uses the distinctive jhey/ReactBits glow-border technique with no attribution

**Copyright · medium** · `components/ui/spotlight-card.tsx:30`

```
mask: linear-gradient(transparent, transparent), linear-gradient(white, white);
  mask-clip: padding-box, border-box;
  mask-composite: intersect;
```

**What it is.** The injected SPOTLIGHT_STYLES block (lines 20-49) is the signature 'glowing cards' implementation popularised by Jhey Tompkins' CodePen and packaged as ReactBits' GlowCard (MIT): the double-gradient mask + `mask-clip: padding-box, border-box` + `mask-composite: intersect` trick to paint a mouse-tracked border glow, driven by the same custom-property names `--border-size`, `--spotlight-size`, `--glow-hue`, `--mouse-x`, `--mouse-y` (lines 26, 36, 38), the `inset: calc(var(--border-size, 1px) * -1)` inset (line 25), the ::before/::after pair where ::before carries the hue glow under `filter: brightness(3.5)` (line 40) and ::after a white hotspot, and the -9999px off-screen parking value for the mouse vars (lines 38, 101-102). The upstream attribute `data-glow` has been renamed `data-glow-card` (line 21). The surrounding React (GPU-tier gating, hydration-safe hue randomisation) is this project's own work.

**Impact.** Recognisable adaptation of MIT-licensed third-party CSS with no attribution. Lower exposure than the shadcn files because the React wrapper is substantially original and the CSS was renamed, but the notice condition still attaches to the copied block.

**Fix.** Add a header comment on spotlight-card.tsx naming the upstream (ReactBits GlowCard / jhey's glow-card pen) and list it in THIRD-PARTY-NOTICES. If the exact upstream cannot be pinned down, the technique block should at least be marked as externally derived so a future reviewer can resolve it.

> **provenance review — upheld** (high confidence). Evidence verified verbatim at components/ui/spotlight-card.tsx:30-32 (and :21, :26, :34-46, :101-102). I retrieved the claimed upstream (jhey's "React Glow Cards – Minimal", codepen.io/jh3y/pen/WNmQXyE, via cdpn.io fullpage) and the match is near-verbatim, not a generic pattern: `[data-glow]::before,::after { pointer-events:none; content:""; position:absolute; inset:calc(var(--border-size) * -1); border:var(--border-size) solid transparent; border-radius:inherit; background-repeat:no-repeat; mask:linear-gradient(transparent,transparent),linear-gradient(white,white); mask-clip:padding-box,border-box; mask-composite:intersect; }`, then `::before` at `calc(var(--spotlight-size)*0.75)` with `filter:brightness(2)` and `::after` at `*0.5` with `hsl(0 100% 100% / ...)`. Same declaration order, same custom-property names; only renames (`data-glow`→`data-glow-card`, `--x/--y`→`--mouse-x/--mouse-y`, `--hue`→`--glow-hue`, brightness 2→3.5). The same block is duplicated at app/globals.css:192-221. No attribution anywhere (NOTICE, no THIRD-PARTY-NOTICES file). Where the finder is wrong: ReactBits has no GlowCard (only SpotlightCard/BorderGlow, both different implementations), and ReactBits is MIT + Commons Clause, not MIT. CodePen public pens are MIT, so the real notice obligation traces to jhey only.
>
> *Correction:* The copying claim holds, but the named origin is half wrong. The SPOTLIGHT_STYLES block in components/ui/spotlight-card.tsx:20-49 (duplicated in app/globals.css:192-221) is a near-verbatim adaptation of Jhey Tompkins' CodePen "React Glow Cards – Minimal" (codepen.io/jh3y/pen/WNmQXyE): identical declaration sequence and ordering in the ::before/::after rule, the same `--border-size`/`--spotlight-size` property names and the same 0.75/0.5 spotlight multipliers, with only cosmetic renames (`data-glow`→`data-glow-card`, `--x`/`--y`→`--mouse-x`/`--mouse-y`, `--hue`→`--glow-hue`, `brightness(2)`→`brightness(3.5)`). That is protectable expression, not a generic gradient-border idiom. However, ReactBits does not ship a "GlowCard" — it ships SpotlightCard (`.card-spotlight`, `--spotlight-color`, no mask trick) and BorderGlow (`.border-glow-card`, conic/edge-proximity), neither of which resembles this code — and ReactBits is licensed MIT + Commons Clause (GitHub reports NOASSERTION), not MIT. The applicable license is CodePen's default MIT for public pens, whose only condition is the notice. Fix: credit jhey's pen in a header comment and a third-party notices entry; drop the ReactBits reference.

---

### 53. Evaluate-STIG republished for download although its EULA withholds permission to publish

**Copyright · medium** · `lib/data/evaluate-stig.ts:57`

```
download: { label: 'Evaluate-STIG (TAR.GZ)', href: `${STIG_BASE}/Evaluate-STIG.tar.gz` },
```

**What it is.** The site offers Evaluate-STIG 1.2604.2 for download (evalStigToolDownload at lib/data/evaluate-stig.ts:50-58, rendered as a hero card by app/security/evaluate-stig/page.tsx:59) plus its User Guide, CHANGELOG and STIG-Manager guide PDFs (lines 60-91). The shipped EULA on this host — /var/www/html/evaluate-stig/Evaluate-STIG/LICENSE — grants use "free of charge ... for general use and distribution" but then states: "Users may not (permission is not granted to) copy, modify, merge, publish, sublicense, and/or sell copies of the Tool, nor permit persons to whom the Tool is furnished to do so." The grant and the restriction contradict each other on whether re-publishing the archive is permitted. Neither the EULA text, the NSWC Crane attribution, nor any distribution statement is reproduced anywhere on the site or alongside the download, and NOTICE:31 leaves "Distribution statement : ______" blank. Evaluate-STIG is a US Government work from NSWC Crane, so the underlying text is not copyrightable, but distribution statements and the EULA still govern how it may be handed on.

**Impact.** The site redistributes a controlled Government tool to whoever can reach it, with no licence text, no distribution statement, and an unresolved contradiction in the vendor's own EULA about whether that is permitted. If the tool's distribution statement turns out to be narrower than Statement A, this is an uncontrolled release rather than a copyright issue.

**Fix.** Get the System Owner to determine Evaluate-STIG's distribution statement and record it in NOTICE (the blank at line 31). Surface the EULA next to the download — either link /evaluate-stig/Evaluate-STIG/LICENSE from the card or reproduce it on the page — and ask NSWC Crane to clarify the publish restriction if the site is to keep hosting the archive rather than pointing at the official source.

> **provenance review — upheld** (high confidence). Provenance holds. lib/data/evaluate-stig.ts:57 matches the quoted evidence verbatim, and app/security/evaluate-stig/page.tsx:6,60 renders it as a download anchor. Origin is correct: Evaluate-STIG.ps1:178 points at https://spork.navsea.navy.mil/nswc-crane-division/evaluate-stig and module manifests carry Author/CompanyName = 'Naval Sea Systems Command (NAVSEA)'. The EULA text quoted ("Users may not ... publish ...") is verbatim from /var/www/html/evaluate-stig/Evaluate-STIG/LICENSE:8-11. So this is genuine third-party material, not a generic pattern.

Two supporting claims fail. (1) "Neither the EULA text ... is reproduced anywhere on the site or alongside the download" is wrong: `tar -tzf Evaluate-STIG.tar.gz` lists `./Evaluate-STIG/LICENSE`, so the EULA ships inside the very archive offered, and is served at /evaluate-stig/Evaluate-STIG/LICENSE. (2) The blank is NOTICE:25 ("Distribution statement : ______"), not NOTICE:31, which reads "(enforced in nginx, proxy/site-stats.mjs, sshd,".

Residual issue is real but small: the page does not link the EULA and NOTICE:25 is unfilled.
>
> *Correction:* The site does host Evaluate-STIG 1.2604.2 for download (lib/data/evaluate-stig.ts:57, rendered at app/security/evaluate-stig/page.tsx:60) and the shipped EULA does contain the contradictory clause quoted. However, the archive redistributes its own licence: the tarball contains ./Evaluate-STIG/LICENSE, and the same EULA is served at /evaluate-stig/Evaluate-STIG/LICENSE, so the tool is not handed on stripped of its terms. Origin is correctly identified (NAVSEA / NSWC Crane per Evaluate-STIG.ps1:178 and the module .psd1 manifests), and as a US Government work there is no copyright interest to infringe. The blank is at NOTICE:25, not NOTICE:31. What remains is housekeeping, not a copyright violation: the download card does not link the EULA, and the System Owner has not recorded a distribution statement at NOTICE:25. Fix by filling NOTICE:25 and adding a licence link beside the download card.

---

### 54. No attribution or trademark notice anywhere in the footer or site chrome

**Copyright · medium** · `lib/data/footer.ts:11`

```
{ label: 'Home',                                      href: '/home' },
  { label: 'Authority, Mission & Org',                  href: '/mission' },
  { label: 'Terms of Use',                              href: '/terms' },
```

**What it is.** footer.ts lines 11-21 enumerate eleven mandatory legal links (Terms, FOIA, No Fear Act, Links Disclaimer, Accessibility, Privacy & Security, Open Gov, Information Quality, Veteran's Crisis Line) - none is an attribution, notices, or trademark page. components/layout/Footer.tsx has no copyright line, no trademark sentence and no credits block at all (grep for 'copyright|trademark|attribut|credit' returns no match in that file). Every page on the site therefore renders vendor logos with no ownership statement.

**Impact.** Nominative use of another party's mark normally relies on a visible statement that the marks belong to their owners and that no endorsement is implied. Without one, roughly 150 vendor marks appear on a .mil site with nothing to rebut an inference of affiliation or endorsement.

**Fix.** Add one footer line - "All product names, logos and brands are property of their respective owners; use does not imply endorsement" - plus a link to a full attribution page.

> **provenance review — upheld** (high confidence). Evidence verified verbatim. lib/data/footer.ts:11-21 is exactly the quoted `quickLinks` array ("{ label: 'Home', href: '/home' }," at line 11, 'Authority, Mission & Org' at 12, 'Terms of Use' at 13), eleven entries ending at "Veteran's Crisis Line" (line 21); none is an attribution/notices page. components/layout/Footer.tsx (36 lines read in full) renders only footerLogos.fcc and footerLogos.apen (lines 17-18) and contains no copyright, trademark or credits text. Repo-wide grep for "respective owner|property of their" over app/, components/, lib/ returns zero hits, and app/ has no attribution route. Provenance premise holds: lib/data/logos.ts:41-46 and public/logos/{real,products,no_backgrounds,restricted,store} (163 files) are genuinely third-party marks (VMware, Trellix, Ubuntu, Windows 11, Microsoft Store icons), so ~150 is fair. Two overstatements: the footer/navbar render only APEN/FCC own marks, so vendor marks appear on product routes (/vmware, /trellix), not "every page"; and endorsement disclaimers do exist, at components/legal/Terms.tsx:13 and components/legal/links-disclaimer.tsx:8 — scoped to hyperlinks, not to marks. Missing-disclaimer hygiene, not a rights defect: low.
>
> *Correction:* Confirmed at the cited location with two corrections. lib/data/footer.ts:11-21 lists eleven footer links (two of which, Home and Authority/Mission, are not legal pages), none an attribution or trademark notice, and components/layout/Footer.tsx has no copyright, trademark or credits text anywhere; no route or string offering an ownership statement exists in the repo. The marks are genuinely third-party (lib/data/logos.ts:41-46; ~163 files under public/logos/real, products, no_backgrounds, restricted, store). However, the footer and navbar render only the site's own FCC and APEN marks (Footer.tsx:17-18, Navbar.tsx:483) — vendor marks appear on product routes such as /vmware, /trellix and /microsoft-products, not on every page. And the site is not silent on endorsement: components/legal/Terms.tsx:13 and components/legal/links-disclaimer.tsx:8 both state that hyperlinks do not constitute Department of the Army endorsement, and Terms.tsx:21-27 carries an AR 25-1/27-60 copyright policy. What is genuinely absent is a marks-scoped statement ("product names and logos are property of their respective owners"); this is disclaimer hygiene on a government site displaying supported-product logos, not an unattributed-copying defect, so low rather than medium.

---

### 55. PDQ product marketing copy reproduced verbatim as card descriptions

**Copyright · medium** · `lib/data/pdq.ts:51`

```
description: 'Deploy third-party software updates, custom scripts, and configuration changes to your on-premises Windows devices in minutes.',
```

**What it is.** Both PDQ product cards carry what reads as PDQ Inc.'s own product-page marketing sentences rather than locally written descriptions. Line 51 (above) matches PDQ's Deploy product blurb including the "in minutes" close; line 61 "Scan, collect, and organize information from your on-premises Windows machines. Automate reporting and monitor software status and disk space." matches PDQ's Inventory blurb. The "on-premises Windows devices/machines" construction is PDQ's own positioning language, not phrasing an internal admin would reach for. The pdqDeployFeatures/pdqInventoryFeatures lists (lines 28-44) likewise restate PDQ's free-vs-paid feature matrix, though those are short factual capability labels. PDQ documentation and marketing copy are proprietary; no attribution appears on the page.

**Impact.** Short passages of proprietary vendor marketing copy republished on an Army site. Individually de minimis, but it is the same AR 25-1 exposure as the other vendor-text findings and is the cheapest of them to eliminate.

**Fix.** Rewrite both descriptions in APEN's own words focused on what the CESC deployment actually does — e.g. "Push software packages and scripts to managed Windows workstations from the CESC repository." No permission needed and the cards read better for the actual audience.

> **provenance review — upheld** (high confidence). Quoted lines verified exactly: lib/data/pdq.ts:51 and :61 read as cited. Network worked, so I compared against the real source. pdq.com/pdq-deploy: "Update third-party software, deploy custom scripts, and make impactful configuration changes to your on-prem Windows devices in minutes with PDQ Deploy." pdq.com/pdq-inventory: "Scan, collect, and organize your on-prem Windows machines so deployments go exactly where you need them to." So the origin is correctly named (PDQ Inc. product pages) and the derivation is real — same element order, same "on-prem(ises) Windows devices/machines", same "in minutes" close. But the title's core claim, "reproduced verbatim", is false: both are reworded ("Update third-party software, deploy custom scripts" → "Deploy third-party software updates, custom scripts"; "on-prem" → "on-premises"; Inventory's second sentence is locally assembled from separate feature blurbs). The features-list claim (lines 28-44) is refuted outright: labels like "Core scheduled deployments", note "Restricted in evaluation mode" are locally written factual capability labels, not PDQ's matrix wording. Two short, already-paraphrased marketing sentences are thin expression; severity is a low-grade nit, not medium.
>
> *Correction:* The provenance is right but the strength is overstated. lib/data/pdq.ts:51 and :61 are close paraphrases — not verbatim copies — of PDQ's own product-page sentences (upstream Deploy: "Update third-party software, deploy custom scripts, and make impactful configuration changes to your on-prem Windows devices in minutes with PDQ Deploy."; upstream Inventory: "Scan, collect, and organize your on-prem Windows machines so deployments go exactly where you need them to."). The repo versions reorder the Deploy clause, change "on-prem" to "on-premises", and assemble Inventory's second sentence from separate upstream feature blurbs. Structure and the distinctive "in minutes" close still show PDQ as the origin, so a rewrite in APEN's own words is a reasonable cheap cleanup, but two short already-reworded marketing sentences are thin expression and this is a low-grade nit, not a medium AR 25-1 exposure. The claim about pdqDeployFeatures/pdqInventoryFeatures (lines 28-44) restating PDQ's free-vs-paid matrix is refuted: those labels and the "Restricted in evaluation mode" notes are locally authored factual capability labels with no counterpart wording upstream.

---

### 56. AlmaLinux ELevate documentation copied into repo-guides.json without attribution

**Copyright · medium** · `lib/data/repo-guides.json:4973`

```
"text": "2. Review the Leapp utility created /var/log/leapp/leapp-report.txt file containing possible problems and recommended solutions. This summary report will help you get a picture of whether it is possible to continue the upgrade."
```

**What it is.** The two ELevate guides in the RPM set reproduce distinctive sentences from the AlmaLinux ELevate documentation (wiki.almalinux.org / almalinux.org ELevate quickstart and frequent-issues pages), including the awkward source phrasing that makes the copy obvious: line 4973 above; line 4989 "4. After reboot, a new entry in GRUB called ELevate-Upgrade-Initramfs will appear. The system will be automatically booted into it. You can see how the update process goes in the console."; line 4920 "- For now, the ELevate project supports only CentOS repositories. It doesn't support other third-party (external) repositories."; line 4857 the "Detected loaded kernel drivers, which have been removed" issue attributed to "mptbase mptscsih mptspi". These entries reach the site through lib/data/repo-guides.ts:122 (rpmGuideGroups -> 'Additional Guides') and render on /docs/repos/rpm with no source or licence note. AlmaLinux project documentation is published under a Creative Commons ShareAlike-family licence, which requires attribution and same-licence redistribution. Note that scripts/extract-repo-guides.mjs regenerates this file from /var/www/html/repos, so a fix applied only to the JSON will be erased by the next extraction (the file's own header at repo-guides.ts:56 makes that point).

**Impact.** CC-licensed third-party documentation republished without the required attribution or licence notice. Low legal risk relative to the proprietary findings, but it is a licence-condition failure and the ShareAlike term arguably reaches the derived page.

**Fix.** Add an attribution line to the two ELevate guides — "Adapted from the AlmaLinux ELevate documentation (wiki.almalinux.org/elevate), © AlmaLinux OS Foundation, CC BY-SA" — rendered by app/docs/repos/RepoGuideViewer.tsx from a new optional `source` field on RepoGuide, so it survives regeneration. Confirm the exact AlmaLinux licence before wording it. The source HTML under /var/www/html/repos also needs the same note or the extractor will keep producing unattributed output.

> **provenance review — upheld** (high confidence). All four cited lines exist verbatim: lib/data/repo-guides.json:4973 (leapp-report sentence), :4989 (ELevate-Upgrade-Initramfs), :4920 ("only CentOS repositories"), :4857 ("mptbase mptscsih mptspi"). Provenance confirmed against upstream by WebFetch: wiki.almalinux.org/elevate/ELevate-quickstart-guide.html contains "This summary report will help you get a picture of whether it is possible to continue the upgrade." word-for-word and "A new entry in GRUB called ELevate-Upgrade-Initramfs will appear. The system will be automatically booted into it."; ELevate-frequent-issues.html carries the same "Detected loaded kernel drivers, which have been removed" error with the identical mptbase/mptscsih/mptspi trio. This is expressive prose, not a generic pattern or bare factual data. Licence confirmed: github.com/AlmaLinux/wiki LICENSE is CC BY-SA 4.0. Render path confirmed: lib/data/repo-guides.ts:93-94 place both ids in 'Additional Guides', :122 exports rpmGuideGroups, app/docs/repos/rpm/page.tsx:79 renders them; app/docs/repos/RepoGuideViewer.tsx (154 lines) has no attribution/licence text, and neither do the legacy sources under /var/www/html/repos/rpm/guides/. Regeneration risk confirmed at scripts/extract-repo-guides.mjs:15.
>
> *Correction:* Finding stands. Two refinements: the licence is specifically CC BY-SA 4.0 (AlmaLinux/wiki repo LICENSE), so the recommended attribution wording can be stated definitively rather than "confirm the exact licence". And the line 4920 "- For now, the ELevate project supports only CentOS repositories..." sentence does not appear on the current wiki.almalinux.org ELevate-frequent-issues page — it likely came from an older revision or the older almalinux.org ELevate page, so it is the weakest of the four quoted matches; the other three (4857, 4973, 4989) match current upstream text closely enough to establish copying on their own.

---

### 57. Microsoft Store catalog metadata and 39 Store app icons harvested and redistributed

**Copyright · medium** · `lib/data/store-app-meta.ts:10`

```
* Regenerate: see the store-app-meta-harvest note (Store search -> PFN
 * manifestSearch -> displaycatalog). Icons must be local + LOGOS-registered or
 * npm run validate:images fails.
```

**What it is.** The file's own header documents the acquisition path: Microsoft Store search -> PFN manifestSearch -> displaycatalog, i.e. programmatic scraping of the Microsoft Store catalog API. The harvested product is 46 records of app name, publisher and category (lines 28-73), plus 39 PNG app icons copied into public/logos/store/ (paint.png, windows-terminal.png, dropbox.png, microsoft-clipchamp.png, intel-graphics-software.png, etc.) and registered in lib/data/logos.ts (e.g. line 227 `storePaint: ${S}/paint.png`). The names, publishers and category buckets are short factual metadata and not meaningfully protectable, and the category taxonomy openly "mirrors apps.microsoft.com/apppack" (lib/data/winget-catalog.ts:37). The icons are the real issue: they are the publishers' own logo artwork (Microsoft, Intel, AMD, Dropbox), copied and re-served from this host. Microsoft Store Terms of Sale prohibit automated scraping of the catalog, and the icons are separately the trademark/copyright of each publisher.

**Impact.** Two distinct issues: a terms-of-service breach in how the catalog was collected, and redistribution of third-party logo artwork (including non-Microsoft marks such as Dropbox and Intel) without licence. Icon reuse for accurate identification of the software being offered is a defensible nominative use, but it is undocumented here and the scraping route is not.

**Fix.** Record the provenance and the reuse rationale in NOTICE ("Store icons reproduced to identify the corresponding packages; no affiliation or endorsement implied"), and prefer icons shipped inside the packages themselves over catalog-scraped artwork where the package supplies one. Replace the ad-hoc scrape path with the published WinGet manifest data the site already consumes at /winget/api/catalog, which is the sanctioned source for this metadata.

> **provenance review — upheld** (high confidence). Every cited fact checks out. lib/data/store-app-meta.ts:10-12 contains the quoted header verbatim ("Regenerate: see the store-app-meta-harvest note (Store search -> PFN manifestSearch -> displaycatalog)"), and lines 1-8 add "Real Store icons (files under public/logos/store/ ...)". The map at lines 28-73 holds exactly 46 records (grep -c '^  "' = 46). public/logos/store/ holds exactly 39 PNGs. lib/data/logos.ts:227 is `storePaint: ${S}/paint.png` as quoted. lib/data/winget-catalog.ts:37 reads "App-pack category bucket, mirroring apps.microsoft.com/apppack". Non-Microsoft marks are present: dropbox.png (300x300, 10979 B), intel-graphics-software.png (78073 B), and AMD/Intel publisher strings at lines 29-30. NOTICE exists but is entirely ownership/ATO/access-control; grep for trademark|nominative|endorsement across all .md and NOTICE returns nothing outside the review doc, so the "undocumented" claim holds. Two overstatements: the 39 files are only 32 distinct images (8 media-extension icons share md5 714100166a...), and no harvest script exists in-repo, so "scraping" is inferred from the comment alone. I did not fetch Microsoft's ToS, so the terms-breach leg is unverified.
>
> *Correction:* Substantially accurate, with two corrections. (1) public/logos/store/ has 39 PNG files but only 32 distinct images — av1-video-extension, avc-encoder-video-extension, heif-image-extension, hevc-video-extensions-from-device-manufacturer, mpeg-2-video-extension, vp9-video-extensions, web-media-extensions and webp-image-extension.png are one identical 422-byte placeholder (md5 714100166a...), so the count of genuinely distinct third-party artworks is 32, of which a handful (dropbox.png, intel-graphics-software.png) are non-Microsoft marks. (2) The "scraping" characterization is inferred from the file header alone: no harvest script exists anywhere in the repo (grep for store-app-meta-harvest hits only lib/data/store-app-meta.ts:11), and one of the two endpoints named — manifestSearch — is the WinGet REST source protocol endpoint the client itself uses, not an unofficial surface, which weakens both the ToS-breach framing and the recommendation to "replace the ad-hoc scrape path with the published WinGet manifest data" (that is partly the same path). The Microsoft Store Terms text was not verified; no network fetch was performed. What is fully confirmed and remains the real issue: 32 publisher logo artworks (Microsoft, Intel, Dropbox) are copied into the repo, registered in lib/data/logos.ts (line 227 `storePaint: ${S}/paint.png`), and re-served from this host with no attribution, licence or nominative-use rationale recorded anywhere — NOTICE covers only system ownership and access control, and no file in the repo mentions trademark, affiliation or endorsement. Medium severity is right; the fix is a third-party-marks section in NOTICE, not removal of the icons.

---

### 58. Repository ships MIT/ISC/OFL third-party code with no third-party notice file of any kind

**Copyright · medium** · `NOTICE:1`

```
APEN Service & Support  (apensupport.blcse.mil)
================================================
```

**What it is.** The NOTICE file (36 lines) covers organizational ownership, deploy provenance and access control — it contains no third-party attribution. `git ls-files | grep -iE 'licen|notice|copying|third.?party|attribut'` returns only this NOTICE and an unrelated React component. Meanwhile package.json:6 declares "license": "UNLICENSED" while the static export bundles and serves: shadcn/ui-derived components (MIT), Radix UI primitives (MIT), lucide-react (ISC), framer-motion (MIT), clsx/tailwind-merge/class-variance-authority (MIT), Tailwind CSS (MIT), a vendored lottie-web build (MIT, banner stripped), and two OFL 1.1 font families. Because output is `output:'export'`, all of this is compiled into out/ and served directly to users by nginx.

**Impact.** Umbrella condition breach across every bundled dependency, not just the hand-copied files. MIT and ISC both require the notice to travel with 'copies or substantial portions'; OFL 1.1 requires it with the font binaries. Declaring UNLICENSED over the whole tree while redistributing them compounds it. This is the single fix that resolves most of the other copyright findings at once.

**Fix.** Generate a THIRD-PARTY-NOTICES.txt from the dependency tree (license-checker or equivalent, run offline against the existing node_modules), commit it, hand-add the entries npm cannot see — the vendored lottie build and the two OFL fonts — and have siteupdate.sh copy it into out/ so it ships with the site. Then narrow package.json's license field or add a distribution statement consistent with it.

> **provenance review — upheld** (high confidence). Evidence confirmed verbatim at NOTICE:1-2; the file is 36 lines and covers only ownership/provenance/ACL (NOTICE:19-36), zero third-party attribution. package.json:6 is `"license": "UNLICENSED"`. `find . -path ./node_modules -prune -o -iname '*licen*' -o -iname '*OFL*' -o -iname '*notice*'` returns only NOTICE and an unrelated .tsx — no notice file exists anywhere outside node_modules. Third-party material is real, not generic: public/vendor/lottie_light.min.js (168236 bytes) is lottie-web's light UMD build (global `.lottie`, two `bodymovin` strings), MIT; public/fonts/{inter,jetbrains-mono}-latin{,-ext}.woff2 are declared as 'Inter' and 'JetBrains Mono' at app/globals.css:17,25,33,41 — both OFL 1.1. node_modules license fields confirm lucide-react ISC; radix-slot/framer-motion/clsx/tailwind-merge/tailwindcss/next/react MIT. next.config line 29 `...(isDev ? {} : { output: 'export' })` and nginx/server.conf:226 `root /var/www/apen_support_nextjs/out;` confirm redistribution: out/fonts/ and out/vendor/lottie_light.min.js both exist and are served. Two errors: class-variance-authority is Apache-2.0 (not MIT), and "banner stripped" is unsupported — upstream lottie-web minified builds carry no banner.
>
> *Correction:* Accurate in substance with two provenance corrections. The repo genuinely ships and serves third-party code with no attribution file of any kind: NOTICE:1-36 is purely organizational, package.json:6 declares "UNLICENSED", and no license/notice/OFL file exists anywhere outside node_modules. The redistributed material is verified third-party, not generic patterns: a vendored lottie-web light player (public/vendor/lottie_light.min.js, MIT, confirmed by its `bodymovin` internals and UMD `lottie` global) and Inter + JetBrains Mono woff2 files (OFL 1.1, family names declared at app/globals.css:17,25,33,41), all copied into out/ and served by nginx (nginx/server.conf:226) because next.config sets `output: 'export'`. Corrections: (1) class-variance-authority is Apache-2.0, not MIT — it ships node_modules/class-variance-authority/LICENSE, and Apache-2.0 §4(c)/(d) imposes stricter attribution duties than MIT, so the finding understates this one; (2) the claim that lottie's banner was "stripped" is unsupported — upstream lottie-web minified builds ship without a license comment, so absence here is not evidence of removal by this repo. Neither correction weakens the remediation: a generated THIRD-PARTY-NOTICES file plus hand-added entries for the vendored lottie build and the two OFL families, copied into out/ by siteupdate.sh.

---

### 59. NOTICE file covers ownership and CM but has no third-party attribution section

**Copyright · medium** · `NOTICE:19`

```
Ownership record (fill in; this is what settles "who owns the system")
----------------------------------------------------------------------
System Owner           : ______________________________
```

**What it is.** NOTICE (36 lines) is the only notice-shaped file in the repo. It records the owning organization, source of record, backup replica, ownership/ATO blanks and access-control pointers. Nothing in it mentions a third-party component, font, library or logo, and the Distribution statement at line 25 is still an unfilled blank. It is also not deployed - no NOTICE, LICENSE or OFL file exists anywhere under out/.

**Impact.** The one place a reviewer would look for third-party obligations is silent, so the missing lottie-web MIT notice and missing OFL text have no fallback location, and nothing tells a future maintainer these obligations exist.

**Fix.** Append a "Third-party components" section to NOTICE listing lottie-web 5.12.2 (MIT), Inter and JetBrains Mono (OFL 1.1), and the vendor-mark classes with their basis of use, and copy NOTICE into the deployed out/ tree.

> **provenance review — upheld** (high confidence). Could not refute; every claim verified locally (no network used, so no upstream fetch). NOTICE is exactly 36 lines and the quoted evidence is verbatim at NOTICE:19-21 ("Ownership record (fill in; this is what settles \"who owns the system\")" / rule / "System Owner           : ______________________________"). NOTICE:25 "Distribution statement : ______________________________ (set by System Owner)" is indeed blank. grep -niE "third|licen|MIT|OFL|font|copyright|attribut|lottie" over NOTICE returns only line 16 ("BUNDLE-INFO.txt"), i.e. zero third-party content. A repo-wide find (excluding node_modules/.next) returns ./NOTICE as the only notice/license file, and nothing notice-shaped exists under out/. The dependent obligations are real and correctly attributed: public/vendor/lottie_light.min.js (and out/vendor/ copy) is genuinely airbnb/lottie-web — UMD wrapper exporting `lottie`, version string 5.12.2, 168KB light build — and grep for Copyright/MIT/license in it returns 0, so the MIT banner was stripped. public/fonts/{inter,jetbrains-mono}-latin*.woff2 are self-hosted per app/globals.css:16-46 ("SELF-HOSTED FONTS — Inter (UI) + JetBrains Mono (code)"); both are SIL OFL 1.1, as named. Only nit: I found no "vendor-mark classes" to match that phrase in the recommendation; it does not affect the finding's claims.

---

### 60. Tux / Ubuntu mascot artwork served with no acknowledgement

**Copyright · medium** · `public/logos/linux_penguin.jpg:1`

```
public/logos/linux_penguin.jpg
public/logos/ubuntu-24.04-mascot.png
public/logos/restricted/WSL_tux.png
```

**What it is.** Five mascot images sit at the root of public/logos and in restricted/: linux_penguin.jpg, linux_penguin2.jpg, ubuntu-22.04-mascot.jpg, ubuntu-24.04-mascot.png, ubuntu-26.04-mascot.png, plus WSL_tux.png and WSL_tux1.png. None is referenced from lib/data/logos.ts (grep for 'penguin|mascot' in the source tree returns no match), yet all are deployed - out/logos/linux_penguin.jpg and out/logos/ubuntu-26.04-mascot.png both exist. Larry Ewing's Tux is licensed on the explicit condition that the author and The GIMP be acknowledged; Ubuntu release mascot artwork is Canonical copyright governed by its trademark policy.

**Impact.** Tux carries one of the few image licences with a hard acknowledgement requirement, and no acknowledgement appears anywhere on the site. The Ubuntu mascots are Canonical artwork used without permission. All are served without even a page that would justify them.

**Fix.** Delete the unreferenced mascot files from public/logos; if Tux is wanted later, restore it with the required "lewing@isc.tamu.edu and The GIMP" acknowledgement on the page that shows it.

> **provenance review — upheld** (high confidence). Facts check out. Files exist (public/logos/linux_penguin.jpg, linux_penguin2.jpg, ubuntu-22.04-mascot.jpg, ubuntu-24.04-mascot.png, ubuntu-26.04-mascot.png, restricted/WSL_tux.png, WSL_tux1.png) and all are in out/logos/. grep for penguin|mascot|tux in lib/ and app/ returns only LOGOS.linuxTux, which lib/data/logos.ts:82 defines as `linuxTux: ${NB}/linux-bg-removed.png` — a different file. So the seven are unreferenced but deployed: confirmed.

Provenance is misattributed. I viewed the images (no EXIF/strings evidence; no WebFetch attempted). linux_penguin*.jpg and WSL_tux*.png are one third-party 3D render of a Tux-like penguin at a laptop beside a dissolving Windows logo — not Larry Ewing's GIMP bitmap, so the "lewing@isc.tamu.edu and The GIMP" acknowledgement condition does not attach to them; they are unknown-origin stock art that also embeds a Microsoft logo. The Ubuntu files ARE Canonical release artwork (low-poly Jammy Jellyfish, Noble Numbat crown, Resolute Raccoon) — that half holds.

The recommendation also misses the mark: the image actually displayed sitewide, public/logos/no_backgrounds/linux-bg-removed.png (lib/data/logos.ts:82, used in app/certsrv/ca/CaWizard.tsx:228), is itself a Tux derivative and would survive the proposed deletion.
>
> *Correction:* Seven unreferenced third-party mascot images are deployed but never rendered. Verified: they exist under public/logos/ and in out/logos/, and grep over lib/ and app/ finds no reference — lib/data/logos.ts:82 (`linuxTux: ${NB}/linux-bg-removed.png`) points at a different file. Two provenance corrections. (1) linux_penguin.jpg, linux_penguin2.jpg, restricted/WSL_tux.png and WSL_tux1.png are not Larry Ewing's Tux image; they are a single unknown-origin 3D illustration of a Tux-like penguin with a laptop and a dissolving Microsoft Windows logo, so the "lewing@isc.tamu.edu and The GIMP" acknowledgement condition does not apply to them — the risk is unlicensed stock art plus an embedded Microsoft mark, not a breached attribution clause. (2) The three Ubuntu files are correctly identified as Canonical release artwork (low-poly Jammy Jellyfish, the Noble Numbat crown, the Resolute Raccoon disc). Severity drops to low because nothing on the site renders any of them; they are only fetchable URLs. Conversely, the fix as written is incomplete: public/logos/no_backgrounds/linux-bg-removed.png, the Tux-derivative that IS shown (lib/data/logos.ts:82, used in app/certsrv/ca/CaWizard.tsx:228, app/certsrv/request/CertRequestWizard.tsx:773, app/downloads/iso/linux/enterprise/LINUXOSCards.tsx:20 and the admin logo picker at lib/data/admin-content.ts:1388), is the asset whose licence actually needs establishing.

---

### 61. Air-gap bundle redistributes LGPL-3.0 native binaries (libvips + glib/librsvg/libheif) with no source offer

**Copyright · medium** · `scripts/make-airgap-bundle.sh:68`

```
# node_modules IS carried: the far side has no registry, LDAP login needs
# ldapts at runtime, and the admin Publish button shells out to `npm run build`.
rsync -a \
```

**What it is.** The bundle copies node_modules wholesale (only .next/, .git/, tsbuildinfo and .env.local are excluded, lines 70-75). node_modules/@img/sharp-libvips-linux-x64/package.json:12 declares `"license": "LGPL-3.0-or-later"`, and that package ships a prebuilt lib/libvips-cpp.so.8.18.3 whose own README lists fribidi, glib, libexif, libheif and librsvg as LGPLv3. The package contains no LICENSE file (`find node_modules/@img/sharp-libvips-linux-x64 -iname '*licen*'` returns nothing) - only the README table. LGPL-3.0 section 4 requires that a distributed combined work carry the LGPL notice and either accompanying source or a written offer, plus a means to relink against a modified library.

**Impact.** Each air-gap bundle handed to another enclave is a distribution of LGPLv3 binaries with no license text, no source, and no written offer. This is the only actual copyleft exposure in the project, and unlike the client-bundle issue it crosses an organizational boundary where a recipient could assert LGPL rights.

**Fix.** Either exclude @img/ and sharp from the bundle rsync (sharp is only needed for `npm run favicons` and Next image optimization, neither of which a static export serves at runtime) - the cheapest fix - or add deploy/THIRD-PARTY-LICENSES/ carrying the LGPL-3.0 text, the libvips README license table, and a written offer for source, and reference it from deploy/INSTALL.sh.

> **provenance review — upheld** (high confidence). Every cited fact reproduces. scripts/make-airgap-bundle.sh:68-70 has the quoted comment and `rsync -a \`, and none of the 17 --exclude lines (71-87) excludes node_modules; deploy/README.md:13 confirms "`node_modules/` — so nothing needs a registry" and deploy/INSTALL.sh:16 "Never runs npm install: node_modules ships inside the bundle." node_modules/@img/sharp-libvips-linux-x64/package.json:12 is exactly `"license": "LGPL-3.0-or-later",`, the package ships lib/libvips-cpp.so.8.18.3 (18 MB) and lib/glib-2.0, and contains no LICENSE/COPYING (find over node_modules/@img returns only sharp-linux-x64/LICENSE and colour/LICENSE.md). Its README.md license table does list fribidi, glib, libexif, libheif, librsvg, pango, libvips as LGPLv3. Provenance is genuine and correctly named: this is lovell/sharp-libvips (repository field, author Lovell Fuller), and LGPL-3.0-or-later is its real upstream license — not a generic pattern. No third-party license text exists anywhere: repo NOTICE is an ownership/provenance record only. Overstated: "crosses an organizational boundary" is unsupported — NOTICE:4-6 names one owning org (FCC/AFC, APEN), and intra-organization transfer is not conveying.
>
> *Correction:* Accurate on the facts, overstated on impact. The bundle rsync (scripts/make-airgap-bundle.sh:70-87) carries node_modules whole, including node_modules/@img/sharp-libvips-linux-x64 whose package.json:12 declares "LGPL-3.0-or-later" and which ships an 18 MB prebuilt lib/libvips-cpp.so.8.18.3 plus lib/glib-2.0 with no LICENSE file — only a README table naming glib, librsvg, libheif, fribidi, libexif and libvips as LGPLv3. No LGPL text, source, or written offer travels with it (repo NOTICE is an ownership record, deploy/ has no license file). However, the claimed organizational-boundary exposure is not evidenced: NOTICE:4-6 names a single owning organization (FCC/Army Futures Command, APEN), deploy/README.md describes the bundle as moving the same site to another air-gapped enclave, and transfer within one organization is not "conveying" under GPL/LGPL, so no third party is placed to assert LGPL rights on this evidence. The library is also unmodified and dynamically loaded, so compliance for an actual conveyance is cheap (ship the LGPL-3.0 text plus the README table and a source pointer). Treat as a low-severity licensing-hygiene gap to close before any bundle leaves the organization, not an active copyleft violation. Note also that sharp is undeclared in package.json dependencies (present only transitively/optionally) and is used solely by scripts/build-favicon.mjs:24, so excluding it would cost only `npm run favicons` on the far side.

---

### 62. speedtest/README.md ownership claim is paired with a false "standard library only" dependency statement

**Copyright · medium** · `speedtest/README.md:46`

```
- **Dependencies** — see `requirements.txt`. The backend and WebUI depend only
  on the Python standard library; the listed packages (`requests`, `pytest`)
  are used solely by the test harness.
```

**What it is.** The README's headline claim at lines 3-6 ("using only code this project owns — no delegation to `speedtest-cli`, `iperf`, or similar external tools") is accurate for the measurement logic, but the dependency disclosure two sections later is stale and wrong. The backend was re-platformed onto FastAPI/uvicorn: speedtest/backend/server.py:23 `from fastapi import FastAPI, HTTPException, Request`, server.py:209 `import uvicorn`, and requirements.txt:5-6 pin `fastapi>=0.110` and `uvicorn[standard]>=0.27`. Lines 8-10 of the same README still describe "a single Python process built on the standard-library `http.server`", which server.py's own docstring (lines 2-4) says was replaced. uvicorn[standard] additionally pulls httptools, uvloop, websockets, watchfiles and python-dotenv transitively. All of these are permissive (MIT/BSD/Apache-2.0) so there is no copyleft exposure, but the document that makes the ownership claim materially under-reports the third-party code actually shipped.

**Impact.** An IA or legal reviewer relying on this README would conclude the speed test carries only two test-only third-party packages, when the runtime itself depends on at least six third-party distributions. That makes the "code this project owns" claim unverifiable as written and would defeat a software bill-of-materials review.

**Fix.** Update README.md lines 8-10 and 44-48 to state the actual runtime stack (FastAPI + uvicorn[standard]) and list each dependency with its license; keep the (accurate) narrower claim that the measurement algorithm and WebUI are original.

> **provenance review — upheld** (high confidence). Every cited line checks out verbatim. speedtest/README.md:46-48 quotes exactly as reported ("The backend and WebUI depend only / on the Python standard library; the listed packages (`requests`, `pytest`) / are used solely by the test harness."). README:8-9 still says "a single Python process built on the standard-library / `http.server`", which speedtest/backend/server.py:1-4 explicitly contradicts: "APEN Speed Test — async server (FastAPI + uvicorn). / Re-platformed from the stdlib http.server". server.py:23 `from fastapi import FastAPI, HTTPException, Request`, :25 `from starlette.background import BackgroundTask`, :209 `import uvicorn`. requirements.txt:5-6 pin `fastapi>=0.110` / `uvicorn[standard]>=0.27`, and pyproject.toml:23-26 lists both as runtime `dependencies` under `license = { text = "Proprietary" }` (:11). grep for fastapi/uvicorn/asgi/starlette across README.md returns zero hits. Provenance lens: FastAPI (MIT), uvicorn/starlette (BSD-3), uvloop/httptools/watchfiles (MIT), websockets/python-dotenv (BSD-3) — the finder's "permissive, no copyleft" characterization is correct. No network fetch was attempted (prohibited); license attribution is from knowledge.
>
> *Correction:* The factual core is correct and verified: README.md:8-9 and :46-48 describe a stdlib-only `http.server` backend with only test-harness third-party packages, while the shipped backend is FastAPI + uvicorn[standard] (server.py:1-4, :23, :25, :209; requirements.txt:5-6). The README never mentions FastAPI or uvicorn anywhere. However the stated impact is overstated: pyproject.toml:23-26 correctly declares `fastapi>=0.110` and `uvicorn[standard]>=0.27` as runtime `dependencies`, and requirements.txt:5-6 does the same with an explanatory comment, so a real SBOM/dependency scan reads accurate metadata — it is the human-facing prose that is stale, not the machine-readable manifest. There is no license exposure (all involved distributions are MIT/BSD-3/Apache-2.0 permissive, compatible with the `license = { text = "Proprietary" }` declaration at pyproject.toml:11), and the narrower ownership claim at README.md:3-6 (no delegation to speedtest-cli/iperf) remains true — the measurement logic is in backend/speedtest.py and frontend/speedtest.js. This is a documentation-freshness defect, appropriately low severity: fix README.md:8-9 and :44-48 to name the FastAPI/uvicorn runtime stack.

---

### 63. Assistant prompt and chips panels hand-roll auth headers and omit the CSRF token, so their writes 401 for LDAP admin sessions

**Code quality · medium** · `app/admin/AdminAssistantPromptPanel.tsx:64`

```
const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': adminContentClient.getToken() },
```

**What it is.** Both AdminAssistantPromptPanel.tsx (POST line 64-66, DELETE line 82-84) and AdminAssistantChipsPanel.tsx (POST line 65-67, DELETE line 84-86) bypass the shared adminAuthHeaders({ write: true }) helper and send only x-admin-token. proxy/site-stats.mjs authorizeAdmin (line 2046-2054) finds the admin session cookie first and, on POST/DELETE, requires a matching x-csrf-token, returning false without ever consulting x-admin-token; a non-admin session is denied outright. The helper's own doc comment at lib/data/admin-content.ts:377-385 warns about exactly this. These two panels are the only admin writes in scope that skip the helper (every other write uses adminAuthHeaders({ write: true })).

**Impact.** Every LDAP-authenticated admin gets 'HTTP 401' on Save/Reset for the assistant knowledge block and prompt chips; the feature only works for a session-less caller supplying the legacy token. Because it fails, admins are steered toward pasting the shared ADMIN_API_TOKEN into the browser, which is the credential path the project is trying to retire.

**Fix.** Replace the inline header objects with `headers: { 'Content-Type': 'application/json', ...adminAuthHeaders({ write: true }) }` and add credentials:'include' in both panels; consider deleting adminContentClient.getToken from the public surface so new panels cannot repeat this.

> **worth-it review — upheld** (high confidence). Every cited location checks out. AdminAssistantPromptPanel.tsx:66 and :84, AdminAssistantChipsPanel.tsx:67 and :86 send only `'x-admin-token': adminContentClient.getToken()` on POST/DELETE. proxy/site-stats.mjs authorizeAdmin (2047-2056) takes the cookie path first: `if (session && session.kind === 'admin')` → on POST/DELETE `if (!constantTimeEqualHex(supplied, session.csrfToken)) return false`, and `if (session) return false` blocks any fallthrough, so an LDAP admin session with no x-csrf-token gets 401 at the four `if (!authorizeAdmin(req))` guards (3373, 3397, 3434, 3462). The helper's warning is real at lib/data/admin-content.ts:377-385. Grep confirms every other admin write routes through `adminAuthHeaders({ write: true })` (admin-content.ts:641, 665, 692, 736…, AnnouncementPathsPanel.tsx:64/84, InfrastructureNodesPanel.tsx:297/381/407); InfrastructureNodesPanel.tsx:748's inline token is a GET login probe, not a write. The fix is a two-token-per-call edit in two files — smallest possible diff, not churn.
>
> *Correction:* Core finding confirmed; two nits in the write-up. (1) `credentials: 'include'` is unnecessary churn — these are same-origin fetches, where cookies are sent by default, and the sibling helper calls that work today (e.g. admin-content.ts:641) mostly omit it too. The minimal fix is swapping the inline header object for `{ 'Content-Type': 'application/json', ...adminAuthHeaders({ write: true }) }` at AdminAssistantPromptPanel.tsx:66/84 and AdminAssistantChipsPanel.tsx:67/86. (2) The impact framing about admins pasting ADMIN_API_TOKEN overstates it: nginx/server.conf:445 and :458 do `proxy_set_header x-admin-token $admin_api_token`, which replaces whatever the browser sent, so the panels' hand-rolled header is inert either way — a token-only (session-less) browser still works via that injection, and pasting the token into the panel changes nothing. The failure is purely that an LDAP admin session short-circuits into the CSRF branch and 401s.

---

### 64. AdminContentEditor is a 2,524-line module that mixes auth, fetching, publish orchestration, four sub-editors and rendering

**Code quality · medium** · `app/admin/AdminContentEditor.tsx:1960`

```
export function AdminContentEditor({ onCustomPagesChanged }: { onCustomPagesChanged?: () => void }) {
  const [authorized, setAuthorized] = useState(false)
```

**What it is.** One file holds SessionGate (874), RegisteredRouteImageEditor (1119), ListRowsEditor (1506), CardRowEditor (1616) and the 560-line main surface, plus ~15 module-level helpers. The main component carries 11 useState, an un-memoized `refresh()` re-created every render (line 1979) that is nonetheless called from a `useEffect` whose deps are `[buildStatus?.state]` (line 2022), five useMemo derivations over the same `overrides`/`published` pair, and the whole publish/attach/create-card workflow.

**Impact.** Any change to one concern (build polling, route images, card rows) forces the whole file into the diff, and reviewers cannot tell which state a helper touches. The un-memoized `refresh` in a dep-less effect is exactly how a stale-closure bug lands here unnoticed.

**Fix.** Split by seam, no new abstractions: move SessionGate to app/admin/SessionGate.tsx, RegisteredRouteImageEditor to app/admin/RouteImageEditor.tsx, and CardRowEditor+ListRowsEditor+their ListRow helpers to app/admin/CardRowEditor.tsx. Extract the overrides/published/buildStatus/publish cycle into `lib/hooks/useContentOverrides.ts` returning `{ overrides, published, buildStatus, unpublishedScopes, refresh, publish }`, with `refresh` wrapped in useCallback.

> **worth-it review — upheld** (high confidence). Structural facts all check out at the exact cited lines: `wc -l` = 2524; `AdminContentEditor` at app/admin/AdminContentEditor.tsx:1960; `SessionGate` :874; `RegisteredRouteImageEditor` :1119; `ListRowsEditor` :1506; `CardRowEditor` :1616; `async function refresh()` :1979; effect deps `}, [buildStatus?.state])` :2022; 11 useState at :1961-1977 (a 12th at :2098). Siblings run 80-1450 lines, so it is a real outlier. What I refute is the mechanism and half the fix. `refresh` (:1979-1990) closes over nothing but module-level `adminContentClient` (imported :14) and stable setState functions, and it is not in the effect's dep array, so its per-render identity is inert — there is no latent stale closure, and `useCallback` would be pure ceremony. Extracting `lib/hooks/useContentOverrides.ts` returning six fields for exactly one consumer is a one-implementation abstraction (lib/hooks holds only useRouteImage.ts). Also note tests/card-overrides.test.ts:22-23 `fs.readFileSync(app/admin/AdminContentEditor.tsx)` parses this file by path, so any split must leave the scope/field literals behind. Worth: the mechanical component moves only; downgrade to low.
>
> *Correction:* app/admin/AdminContentEditor.tsx really is 2,524 lines holding SessionGate (:874), RegisteredRouteImageEditor (:1119), ListRowsEditor (:1506), CardRowEditor (:1616) and a ~560-line main surface with 12 useState (:1961-2098) — an outlier against the 80-1,450-line panels beside it. But the claimed bug risk is not real: `refresh` (:1979) closes only over the module-level `adminContentClient` and stable setState functions and is absent from the effect's dep array (:2022), so its per-render identity cannot go stale and `useCallback` would add nothing. The value here is reviewer ergonomics only, so this is low, not medium. The worthwhile part is the mechanical move of the four already-prop-driven sub-components into their own files (consistent with the 17 files already in app/admin/); skip `lib/hooks/useContentOverrides.ts`, which invents a six-field hook for its single caller. Any split must keep the scope/field literals in this file: tests/card-overrides.test.ts:22-23 reads app/admin/AdminContentEditor.tsx by path and parses its `key:` entries.

---

### 65. File-library folder switch has no request cancellation, so a slow response can repaint the wrong folder's contents

**Code quality · medium** · `app/admin/AdminFileLibraryPanel.tsx:174`

```
useEffect(() => { void refresh(dirKey) }, [dirKey, refresh])
```

**What it is.** `refresh` (lines 161-173) awaits `adminContentClient.listFileLibrary(key)` and then unconditionally calls `setDirs`/`setFiles` with no `cancelled` flag and no AbortSignal, while the effect re-runs on every `dirKey` change. Switching folder A -> B while A is still in flight lets A's late response land last. The same file's own upload path already threads an AbortSignal (lib/data/admin-content.ts:886, 900, 918), and app/admin/useNginxStatus.ts:73/146 shows the correct `let cancelled` pattern, so the codebase has both tools already.

**Impact.** The panel can show folder A's file list under folder B's header and free-space figures; a subsequent rename or delete then targets the file the admin sees, in the folder they did not choose.

**Fix.** Copy the useNginxStatus.ts pattern: make `refresh` take the effect's cancellation token (`useEffect(() => { let cancelled = false; void refresh(dirKey, () => cancelled); return () => { cancelled = true } }, [dirKey])`) and guard the three setState calls. Same guard is missing in AdminChatTranscriptsPanel:47-55 and AdminCustomPagesPanel:58-66.

> **worth-it review — upheld** (high confidence). Evidence verified verbatim. AdminFileLibraryPanel.tsx:174 is exactly `useEffect(() => { void refresh(dirKey) }, [dirKey, refresh])`; refresh at 161-173 awaits listFileLibrary then calls setLoading/setDirs/setFiles with no guard, and listFileLibrary (lib/data/admin-content.ts:712-728) passes no signal. useNginxStatus.ts:73 does have `let cancelled = false`. So the stale-response race on folder switch is real.

But the impact is overstated. submitRename (line 373) and submitDelete (line 418) both send `dirKey` — the folder the admin currently has selected — with a name taken from the stale list, so a mismatch normally 404s rather than hitting the wrong folder's file; delete also requires typing the exact name (line 416). The visible header/free-space come from activeDir (line 155), derived from dirs+dirKey, so they stay correct; only the file rows go stale. The two sibling panels named in the recommendation (AdminChatTranscriptsPanel.tsx:57, AdminCustomPagesPanel.tsx:67) mount-fetch once with a stable `useCallback([])` refresh — no ordering race there, so guarding them is churn.

Worth the ~3-line cancelled flag in this one file; not worth the wider sweep.
>
> *Correction:* The race is real and correctly located: app/admin/AdminFileLibraryPanel.tsx:174 re-runs `refresh(dirKey)` on every folder change, and refresh (161-173) writes setLoading/setDirs/setFiles unconditionally after an un-cancellable fetch, so a slow folder-A response can land after folder B's and leave B's file rows showing A's files. Severity is low, not medium: the panel header and free-space figures come from `activeDir` (line 155, derived from dirs + the current dirKey) so they stay correct, and both mutating paths — submitRename (373) and submitDelete (418) — send the current `dirKey`, so acting on a stale row normally produces a not-found error rather than touching the wrong folder's file; delete additionally requires the admin to type the exact filename (416). The recommendation's extension to AdminChatTranscriptsPanel.tsx:57 and AdminCustomPagesPanel.tsx:67 does not apply: their `refresh` is a stable useCallback with an empty dep list and their effects fire once on mount, so there is no out-of-order case to guard. Fix is the 3-line `let cancelled` flag in AdminFileLibraryPanel only.

---

### 66. Form labels in the page wizard and node editor are unassociated siblings, leaving every input unlabelled to assistive tech

**Code quality · medium** · `app/admin/AdminPageWizard.tsx:713`

```
<label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Page title *</label>
          <input
            data-field-path="title"
```

**What it is.** AdminPageWizard has 19 `<input>`/`<select>`/`<textarea>` elements and zero `htmlFor` attributes; the labels are preceding siblings with no `id` on the control and no wrapping (verified at lines 713, 731, 742, 770, 842, 1044, 1054, 1166, 1257, 1268, 1293). InfrastructureNodesPanel is the same at lines 885, 895, 907, 918, 930, 947, 966, 981, 1011 (11 inputs, zero `htmlFor`). AdminDashboard's NotificationSettingsPanel shows the correct pattern at line 137 (`htmlFor="admin-notification-email"`) and wraps its checkboxes in `<label>`, so the convention already exists in the codebase.

**Impact.** Screen-reader users hear 'edit text, blank' for every field in the two most complex admin forms, and clicking a label does not focus its control. No dialog in app/admin uses role="dialog", aria-modal or Escape handling either (zero matches across app/admin/*.tsx), so the delete-confirm and attach overlays are not keyboard-dismissable.

**Fix.** Cheapest fix that holds: wrap each control in its existing `<label>` element (implicit association, no ids to invent) — the tag change is mechanical. For the overlays, add `role="dialog" aria-modal="true"`, an `aria-label`, and a shared `useEscapeToClose(onClose)` hook in lib/hooks, used by AdminFileLibraryPanel's delete/attach panels.

> **worth-it review — upheld** (high confidence). Primary claim verified at every cited line. AdminPageWizard.tsx:713 is verbatim `<label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Page title *</label>` immediately followed by `<input data-field-path="title"` — a closed sibling, no wrapping, no id. Counts confirmed: AdminPageWizard.tsx has 19 input/select/textarea and 0 `htmlFor`; the only aria-label is at :1250 ("Remove download", an icon button). InfrastructureNodesPanel.tsx: 11 controls, 0 `htmlFor`; lines 885/895/907/918/930/947/966/981/1011 all match. The in-repo precedent is real: AdminDashboard.tsx:137 `<label ... htmlFor="admin-notification-email">` paired with `id="admin-notification-email"` at :141. The fix is cheaper than described — three shared field helpers at AdminPageWizard.tsx:111, :180, :236 render most of the selects. Where the finding is wrong: `grep -rn 'fixed inset-0|createPortal|z-\[9'` over app/admin/*.tsx returns zero hits, so the AdminFileLibraryPanel delete-confirm and attach surfaces are inline in-flow panels, not modal overlays. role="dialog" aria-modal on a non-modal panel is incorrect ARIA, and a shared useEscapeToClose hook in lib/hooks is churn for a single maintainer.
>
> *Correction:* Accurate on the label-association defect, inaccurate on the dialog half. Verified: app/admin/AdminPageWizard.tsx (19 controls, 0 htmlFor; labels are closed preceding siblings at 713, 731, 742, 770, 842, 1044, 1054, 1166, 1257, 1268, 1293) and app/admin/InfrastructureNodesPanel.tsx (11 controls, 0 htmlFor at 885-1011) leave every field programmatically unlabelled, while app/admin/AdminDashboard.tsx:137/:141 already demonstrates the htmlFor+id convention. The fix is smaller than the finder estimated because three shared field helpers (AdminPageWizard.tsx:111, :180, :236) render most of the labelled selects — fixing those plus the handful of inline fields covers the file. Drop the ARIA-dialog recommendation: there is no modal anywhere in app/admin (zero `fixed inset-0` or createPortal matches), the AdminFileLibraryPanel delete-confirm and attach surfaces are inline panels, and role="dialog"/aria-modal on a non-modal region would be wrong ARIA; a useEscapeToClose hook in lib/hooks is unnecessary abstraction here.

---

### 67. CentOS 7 STIG card renders a dangling "--ForceSTIG" with no value, contradicting its own guide body

**Code quality · medium** · `app/docs/evaluate-stig/linux/enterprise/STIGEnterpriseLinuxCard.tsx:118`

```
Run Evaluate-STIG with <code className="code-inline">--ForceSTIG {d.forceFlag}</code> on {d.distro} {d.version}.
```

**What it is.** The card description interpolates d.forceFlag unconditionally. The centos7 entry (line 33) is defined with `forceFlag: ''` on purpose — the comment at lines 28-29 says "CentOS 7 runs with NO --ForceSTIG (empty forceFlag)" — so the CentOS 7 card's visible description reads "Run Evaluate-STIG with --ForceSTIG on CentOS 7." The command builder two functions up (line 48) gets this right: `${d.forceFlag ? ` --ForceSTIG ${d.forceFlag}` : ''}`. Only the description is unguarded.

**Impact.** A user reading the CentOS 7 card is told to pass --ForceSTIG, sees no value for it, and either guesses one or passes a bare flag — which Evaluate-STIG rejects. The card contradicts the copy-paste command inside the same card, and the wrong text is the part that reaches site search and the AI assistant, since it renders in the collapsed (statically exported) state.

**Fix.** Guard the description the same way line 48 guards the command: render "Run Evaluate-STIG on CentOS 7." when forceFlag is empty.

> **worth-it review — upheld** (high confidence). Could not refute; every claim checks out. STIGEnterpriseLinuxCard.tsx:118 matches the quoted evidence verbatim: `Run Evaluate-STIG with <code className="code-inline">--ForceSTIG {d.forceFlag}</code> on {d.distro} {d.version}.` — unguarded. Line 33 defines centos7 with `forceFlag: ''`, and the comment at lines 28-29 states "CentOS 7 runs with NO --ForceSTIG (empty forceFlag)". Line 48 does guard: `${d.forceFlag ? ` --ForceSTIG ${d.forceFlag}` : ''}`. So the same file both asserts the flag and omits it. The description renders outside the `isOpen` conditional (line 117), i.e. in the statically exported collapsed state. Confirmed downstream in the built artifact: scripts/build-search-index.mjs:6-8 walks out/**/index.html for visible text, and out/search-index.json contains `ForceSTIG on CentOS 7 .` — the dangling flag is live in production search today. The recommended fix is a one-line ternary copying the existing line-48 pattern: no new helper or abstraction, consistent with the file's own convention, so not churn. Only nit: "two functions up" is loose phrasing (line 48 lives in GuideContent). Immaterial.

---

### 68. 31 redirect-stub pages ship 3.3 MB of prerendered app shell to do a JS-only redirect

**Code quality · medium** · `app/isos/page.tsx:3`

```
import { RedirectStub } from '@/components/common/RedirectStub'
export const metadata = { title: 'Moved' }
export default function Moved() { return <RedirectStub to="/downloads/iso" /> }
```

**What it is.** 31 page.tsx files import RedirectStub (app/isos, app/VisualStudio/*, app/vmware/*, app/repos/*, app/microsoft-products/*, app/evaluate-stig/*, app/sqltools, app/mssoftware, app/tools/*, app/color-picker, app/speedtest). Each one prerenders the full site shell: out/isos/index.html is 39,215 bytes and out/repos/deb/index.html is 39,722 bytes; the ten stub trees measured total 3.3 MB in out/. RedirectStub then redirects client-side via `window.location.replace` (components/common/RedirectStub.tsx:15), so there is no HTTP 301 at all. nginx already does the alternative for other paths — nginx/server.conf:855-860 and :489 use `return 301` directly.

**Impact.** Every legacy URL costs ~39 KB plus JS chunks and a visible flash, returns HTTP 200 instead of 301 (bookmarks and crawlers never learn the new address), and 31 directories of build output must be rebuilt and rsynced on every deploy. The mechanism for doing this correctly is already in the same repo's nginx config.

**Fix.** Move the whole map into one nginx block (a `map $uri $moved` + `return 301 $moved` costs ~35 lines and zero build output) and delete the 31 stub page.tsx files and components/common/RedirectStub.tsx. If a no-JS fallback is wanted, keep RedirectStub for the handful of paths nginx cannot own.

> **worth-it review — upheld** (high confidence). Every mechanical claim checks out. `grep -rl RedirectStub app/` returns exactly 31 files. app/isos/page.tsx lines 1-3 match the quoted evidence verbatim. components/common/RedirectStub.tsx:15 is `window.location.replace(to)`. out/isos/index.html is 39,215 bytes and out/repos/deb/index.html is 39,722 bytes exactly; the 11 stub trees sum to 3,269,055 bytes (3.27 MB). nginx/server.conf:489 and :855-860 do use `return 301`. So the description is accurate and the finding is not refutable on facts. Two corrections lower its value: (1) the crawler/SEO half of the impact is void — out/robots.txt is `Disallow: /` and server.conf:195 puts every location behind `auth_request /internal/authcheck`, so no crawler ever sees these; (2) five of the 31 stubs are already unreachable — server.conf:855-860 exact-match 301s /repos/{rpm,deb,pip}{,/} and :489 301s bare /speedtest — so app/speedtest/page.tsx's comment ("this stub only catches the bare /speedtest route") is already false. The recommendation also understates care needed: the existing repos redirects are deliberately `=` exact matches (comment at :849-854) precisely so download subpaths like /isos/x.iso aren't caught; a blanket `map $uri` would need the same discipline.
>
> *Correction:* The facts are correct: 31 page.tsx files render RedirectStub, which redirects only client-side (components/common/RedirectStub.tsx:15), and the prerendered output for those trees is 3,269,055 bytes with out/isos/index.html at 39,215 bytes. But the impact is smaller than stated and the fix is fiddlier. The site is fully login-gated (nginx/server.conf:195 `auth_request /internal/authcheck`) and out/robots.txt is `Disallow: /`, so "crawlers never learn the new address" does not apply — the only real cost is a redirect flash for a logged-in user on a stale bookmark, plus 3.3 MB of build output. Separately, five of the 31 stubs are already dead: nginx/server.conf:855-860 exact-301s /repos/{rpm,deb,pip} and :489 301s bare /speedtest, so those stub pages never execute (and the comment in app/speedtest/page.tsx claiming it "catches the bare /speedtest route" is wrong). Moving the rest into nginx is a legitimate net deletion, but it must copy the existing exact-match (`location = /path`) discipline documented at nginx/server.conf:849-854 — a blanket `map $uri` would also swallow real download subpaths under /isos/ and /vmware/ (see the prefixes in app/admin/AdminPageWizard.tsx:891-895) — and it trades a redirect that ships atomically with the static build for one that only takes effect after an nginx reload. Worth doing opportunistically, not a medium-severity defect.

---

### 69. text-slate-500 on the dark page background is 4.16:1 — below the 4.5:1 AA floor for body text

**Code quality · medium** · `app/login/page.tsx:140`

```
<label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500" htmlFor="login-username">
```

**What it is.** Computed from the actual token values, not estimated: Tailwind `slate-500` is #64748b; the body background set in app/layout.tsx:233 is `bg-[#040a16]` and `--bg-primary` in app/globals.css:56 is #060b18. Relative-luminance contrast is 4.16:1 against #040a16 and 4.13:1 against #060b18 — under the 4.5:1 required for text below 18pt/14pt-bold. The text here is 10px, so the large-text exemption (3:1) does not apply. This is the color of every visible form label on the login page (lines 123, 140, 178), the keyboard-shortcut hint and results count on app/search/SearchClient.tsx (lines 189 uses slate-600, 199 and 221 use slate-500), the release dates in components/cards/ReleaseNotes.tsx:183, and the sidebar section title in components/layout/SidebarBrand.tsx:59. It is distinct from the slate-600/700 usage a prior reviewer flagged (those measure 2.61:1 and 1.91:1 against #040a16 respectively — e.g. components/common/CustomPageView.tsx:39 uses text-slate-700, components/landing/LegacyIntro.tsx:207 and components/home/AnnouncementList.tsx:73 use text-slate-600); slate-500 is the larger, near-miss population that a spot check will pass by eye but a contrast analyzer will fail.

**Impact.** WCAG 1.4.3 Contrast (Minimum) AA failure across the login form's field labels, search UI and card metadata. Low-vision users on typical .mil workstation displays cannot reliably read which field is which on the site's authentication page.

**Fix.** Promote slate-500 body/label text to slate-400 (#94a3b8, measured 7.73:1 on #040a16) wherever it carries meaning, and keep slate-500 and darker only for genuinely decorative glyphs. Add a token-level rule (or a grep-based test alongside tests/tile-a11y.test.ts) so text-slate-500/600/700 cannot be reintroduced as text color on the dark background.

> **worth-it review — upheld** (high confidence). Primary anchor confirmed verbatim: app/login/page.tsx:140 is exactly the quoted 10px `text-slate-500` label; siblings at 123, 158, 178 match. Background confirmed: app/layout.tsx:233 `bg-[#040a16]`. The card is transparent at rest (components/ui/spotlight-card.tsx:105-118 comment + inline `background: radial-gradient(...)` only), so the page bg really is the backdrop. I recomputed WCAG luminance independently: #64748b L=0.1706, #040a16 L=0.00301, ratio 4.16:1 — under 4.5:1, and 10px bold does not qualify for the 3:1 large-text exemption. Corroborating cites check out: SearchClient.tsx:189 slate-600, :199 and :221 slate-500, SidebarBrand.tsx:59 slate-500. Two minor citation slips: ReleaseNotes.tsx has 40 lines, so "183" is wrong (the slate-500 date is line 23), and globals.css:56 is `--bg-secondary`; `--bg-primary: #060b18` is line 55. Neither changes the conclusion. Scope caveat: `text-slate-500` appears 287 times in app/ + components/, so the blanket promotion plus a new grep test is a large diff for a one-maintainer repo.
>
> *Correction:* Finding stands. `text-slate-500` (#64748b) on the #040a16 body background measures 4.16:1 — a real WCAG 1.4.3 AA failure for the 10px form labels at app/login/page.tsx:123/140/178 and the hint at :158, and the card is transparent at rest so the page background is genuinely what the text sits on. Two citations in the description are off: components/cards/ReleaseNotes.tsx is only 40 lines (the slate-500 release date is line 23, not 183), and app/globals.css:56 is `--bg-secondary`; `--bg-primary: #060b18` is line 55. Scope the fix rather than taking the recommendation whole: `text-slate-500` occurs 287 times across app/ and components/, so promoting all of it plus adding a grep-based lint is a large diff for this repo. Fix the login form labels and hint (5 class edits in one file) and the meaningful metadata (SidebarBrand.tsx:59, SearchClient.tsx:199/221, ReleaseNotes.tsx:23); leave decorative glyphs such as the SearchX icon at SearchClient.tsx:208 alone, and skip the new test unless reintroduction actually happens.

---

### 70. Login failure message is not announced and is not associated with the credential fields

**Code quality · medium** · `app/login/page.tsx:199`

```
{error && (
                <p className="flex items-center gap-2 text-xs text-red-300">
                  <AlertTriangle size={12} aria-hidden="true" /> {error}
```

**What it is.** The error set by `setError(result.error || 'Sign in failed.')` (line 74) is injected into a plain `<p>` with no `role="alert"`, no `aria-live`, and no id referenced from the inputs. The username and password inputs (lines 143-153, 181-189) carry neither `aria-invalid` nor an `aria-describedby` pointing at the error, and focus stays on the submit button, which merely flips its label back from "Signing in…". Note the sibling file app/search/SearchClient.tsx:194 does use `role="alert"` for its load-failure message, so the pattern exists in the codebase and was simply not applied here.

**Impact.** WCAG 4.1.3 Status Messages (AA) and 3.3.1 Error Identification (A). A screen-reader user submitting bad credentials gets silence — no indication the attempt failed or why. This is the authentication gate nginx redirects every unauthenticated visitor to, so it is the first interactive page on the site.

**Fix.** Add `role="alert"` to the error `<p>` and give it an id (e.g. `login-error`); add `aria-invalid={Boolean(error)}` to both inputs and include that id in their `aria-describedby`. One attribute each, matching what SearchClient already does.

> **worth-it review — upheld** (high confidence). Every cited location verified. app/login/page.tsx:199-202 is exactly the quoted block: `{error && (` then `<p className="flex items-center gap-2 text-xs text-red-300">` — no role, no aria-live, no id. Line 74 is `setError(result.error || 'Sign in failed.')`. The username input (143-153) carries only `aria-describedby="login-username-hint"` (line 150), pointing at the domain-format hint, not an error; the password input (181-189) has no aria-describedby at all. grep for aria-invalid in the file returns nothing, so neither input is marked invalid. The submit button (191-198) is re-enabled by setSubmitting(false) (line 70) and only flips its label, so nothing moves focus or announces. The sibling-pattern claim also holds: app/search/SearchClient.tsx:194 `<p role="alert" ...>` and :204 `<div aria-live="polite" aria-atomic="true">`. Fix is an id plus role on the <p> and two attributes on the inputs — trivial diff, no dependency, no build/air-gap impact, and it reuses a convention already in the repo. Accurate and worth the diff; medium is fair for the site's auth gate under Section 508.

---

### 71. Download links are named only by file extension, so their accessible name is ".exe"

**Code quality · medium** · `components/cards/DownloadRow.tsx:153`

```
className="btn-download flex-shrink-0 ml-2 text-xs px-2 py-1 flex items-center gap-1"
      >
        <Icon size={11} aria-hidden="true" />
```

**What it is.** In `DownloadRow` the file name sits in a sibling `<p>` (line 146) and the anchor's only text content is the extension rendered at line 156 (`{extension ? `.${extension}` : 'Download'}`); the icon is `aria-hidden`, and there is no `aria-label`, `title`, or `sr-only` text (grep for `sr-only` in this file returns 0). The link's accessible name is therefore ".exe", ".msi" or "Download". The same pattern is repeated in components/common/CustomPageView.tsx:180-188, where the anchor's text is `'PDF'` or `fileTypeFromHref(...)`. The file's sibling `DownloadButton` (lines 116-119) already solves this — `const name = `${label}${extension ? ` (.${extension})` : ''}`` fed to `aria-label` — with a comment saying a screen-reader user must not be "left with a bare download", but the full row never got the same treatment. DownloadRow is imported by 8 files, and its own docblock (line 76) claims every file on the site goes through it.

**Impact.** WCAG 2.4.4 Link Purpose (In Context) / 2.4.9 failure. A screen-reader user pulling up the links list on a downloads page gets a column of identical ".exe" and ".msi" entries with no way to tell which installer is which; the visible label is not programmatically associated with the link.

**Fix.** Apply the fix that already exists three functions up: pass the same computed `name` to `aria-label` on the DownloadRow anchor (and the CustomPageView one), or wrap the label `<p>` and the anchor so the label text is inside the link.

> **worth-it review — upheld** (high confidence). Substance confirmed, line numbers wrong. components/cards/DownloadRow.tsx is only 90 lines (`wc -l` = 90; `git show HEAD:` = 90), so the cited lines 153/146/156/116-119/76 do not exist. The quoted evidence is verbatim but at lines 83-85: `className="btn-download flex-shrink-0 ml-2 text-xs px-2 py-1 flex items-center gap-1"` / `<Icon size={11} aria-hidden="true" />` / `{extension ? `.${extension}` : 'Download'}` (line 86). The label sits in a sibling `<p>` at 76-78, and the anchor (79-87) carries no aria-label/title/sr-only (grep: the file's only aria-label is line 52, inside DownloadButton). The claimed precedent is real: line 46 `const name = `${label}${extension ? ` (.${extension})` : ''}`` fed to aria-label at 52, with the comment at 44-45 about not leaving "a bare 'download'". components/common/CustomPageView.tsx:169-188 repeats the pattern (186-187 confirmed). So the accessible name really is ".exe"/".msi"/"PDF". The recommendation is one line per site reusing an existing in-file pattern — not churn — and a11y is not a corner to cut on a .mil site. Refuting only the line numbers, not the defect.
>
> *Correction:* The defect is real but every line number for DownloadRow.tsx is wrong (the file is 90 lines total, not 150+). Corrected: in components/cards/DownloadRow.tsx the anchor is at lines 79-87, its only text content is `{extension ? `.${extension}` : 'Download'}` at line 86, the icon is aria-hidden at line 85, and the file name is in a sibling `<p>` at lines 76-78 with no aria-label, title or sr-only on the link — so the accessible name is ".exe"/".msi"/"Download". The existing fix to copy is at lines 44-52 in the same file (DownloadButton builds `const name = label + " (.ext)"` and passes it to aria-label/title). components/common/CustomPageView.tsx:169-188 repeats the same bare-extension anchor (text `'PDF'` or `fileTypeFromHref(...)` at line 187). Fix is one added aria-label line in each of the two components.

---

### 72. framer-motion entrance animations ignore prefers-reduced-motion, and the render-budget signal that would fix it is computed then discarded

**Code quality · medium** · `components/home/LinksGrid.tsx:99`

```
<motion.section
      className="apen-section"
      variants={sectionVariants}
```

**What it is.** LinksGrid animates opacity+y via framer-motion whileInView (lines 99-140), and activity-chart-card.tsx:4 uses motion/AnimatePresence. framer-motion v13 does not honour prefers-reduced-motion unless you use useReducedMotion() or <MotionConfig reducedMotion="user">; grep across the repo finds neither. The CSS @media (prefers-reduced-motion: reduce) blocks at app/globals.css:1073, 1387, 1505 and 1547 cannot help — framer-motion writes inline transform/opacity per frame in JS, not CSS transitions. Meanwhile app/layout.tsx:113 computes `var budget = prefersReduced ? 'reduced' : 'full'` and writes data-render-budget onto <html> and <body> in three places (layout.tsx:124,138 and GpuTierDetector.tsx:37,40) — `grep -c data-render-budget app/globals.css` returns 0 and no component reads it. The signal exists; nothing consumes it.

**Impact.** A user with OS-level reduce-motion still gets the full staggered slide-up of every card on /home, which is the site's main hub page. ~60 lines of attribute plumbing are maintained for an attribute nobody reads.

**Fix.** Two lines: wrap the app in <MotionConfig reducedMotion="user"> (or gate LinksGrid's variants on useReducedMotion()). Better yet, drop framer-motion from LinksGrid entirely — tailwind.config.js:64,69 already ships a `fade-in` animation and `fadeIn` keyframes that do the identical opacity+translateY, and staggerChildren is one animation-delay calc(); that removes a 5.9 MB dependency from the /home bundle and makes the existing CSS reduce-motion blocks authoritative. Then either delete data-render-budget everywhere or make StarfallBackground read it so it renders TIER_CONFIG.none under reduced motion instead of emitting 35 particles and 16 nodes it then hides with CSS.

> **worth-it review — upheld** (high confidence). Every cited fact checks out. components/home/LinksGrid.tsx:99-105 is verbatim `<motion.section` / `className="apen-section"` / `variants={sectionVariants}` with `whileInView="show"`; variants at :55-77 animate opacity+y with staggerChildren 0.08. `grep -rn "useReducedMotion|MotionConfig|reducedMotion" app components lib` returns only lib/data/gpuTier.ts:70,81 — no framer API use anywhere; package.json:32 is framer-motion ^13.1.1, which never honors prefers-reduced-motion by default. framer writes inline styles, so the CSS blocks at app/globals.css:1073, 1505, 1547 (and 1387) cannot reach it — those target .cyber-*, .apen-bg-*, .assistant-launcher-pill. `grep -c render-budget app/globals.css` = 0; the attribute is written at app/layout.tsx:124,138,233 and GpuTierDetector.tsx:37,40, and getRenderBudget (gpuTier.ts:55) has exactly one caller (GpuTierDetector.tsx:31) that only re-stamps the attribute. tailwind.config.js:64,69 has fade-in/fadeIn; StarfallBackground.tsx:109 is `high: { particles: 35, nodes: 16 ...}`; node_modules/framer-motion is 5.9M. Accessibility gap, two-line fix — worth the diff.
>
> *Correction:* Accurate as reported; only the recommendation's scope needs trimming. The fix worth taking is the two-liner: `<MotionConfig reducedMotion="user">` in app/layout.tsx (framer-motion is only imported in two files — components/home/LinksGrid.tsx:4 and components/ui/activity-chart-card.tsx:4 — so one wrap covers both). Ripping framer-motion out of LinksGrid in favor of tailwind.config.js:64 `fade-in` would not remove the 5.9 MB dependency from the repo or the air-gap bundle, since ActivityChartCard still needs it (app/admin/AdminDashboard.tsx:763) — it only drops it from the /home route chunk. Likewise the data-render-budget cleanup (app/layout.tsx:124,138,233, GpuTierDetector.tsx:37,40, zero consumers) is a real dead-plumbing observation but a separate, optional deletion, not part of the a11y fix.

---

### 73. Navbar.tsx is 759 lines with the icon+badge block copy-pasted four times and the desktop/mobile trees fully duplicated

**Code quality · medium** · `components/layout/Navbar.tsx:533`

```
<span className="relative flex h-6 w-6 flex-shrink-0 items-center justify-center">
                      <Icon size={22} aria-hidden="true" />
                      {isAdminItem && <AdminNotificationCountBadge total={notificationTotal} />}
```

**What it is.** The identical icon-wrapper + admin-badge span appears at lines 533-536, 550-553, 682-685 and 704-707 (only the Icon size and opacity differ). The child-link row appears twice (615-634 desktop flyout, 718-728 mobile), each independently re-deriving `resolvedPageImages[child.href] ?? navItemLogos[child.href]` and the /^https?:\/\// external test. Non-render logic occupies the first 217 lines. Separately, openSection is one state serving two unrelated meanings — desktop hover-flyout target and mobile accordion expansion. buildNavItemsWithCustomPages (line 57) runs two O(n) findIndex passes on every render with no memo, and isActive at line 311 dereferences pathname unguarded while line 238 guards the very same value with `pathname?.startsWith`.

**Impact.** Any change to nav item chrome must be made in four places; the two openSection meanings make the mobile accordion state leak into desktop flyout state across a resize. High edit-risk on the single component every page renders.

**Fix.** Four concrete moves, all mechanical: (1) lift useAdminNotificationCounts + readAcknowledgedAlertIdsFromStorage + sameIds (lines 97-186) into lib/hooks/useAdminNotificationCounts.ts; (2) extract <NavIcon item={item} size={22} total={notificationTotal} /> to collapse the four copies into one; (3) extract <NavChildLink child={child} images={resolvedPageImages} onNavigate={...} /> for the two child rows; (4) give the mobile drawer its own useState (mobileSection) instead of sharing openSection. That is roughly 759 → ~380 lines with no behaviour change. Also wrap navItems in useMemo([isAdmin, customPages]) and make line 311 `pathname?.startsWith(href) ?? false` to match line 238.

> **worth-it review — upheld** (high confidence). Core evidence verifies verbatim. Navbar.tsx is 759 lines; the icon span sits at 533, 550, 682, 704 with badges at 535/552/684/706, exactly as cited. openSection (223) is genuinely shared by the desktop flyout (456-457, 527) and the mobile accordion (665, 689), with no resize reset — real, if cosmetic (flyout is `hidden lg:block`, line 604, and Escape/outside-click at 351-371 dismiss it). buildNavItemsWithCustomPages (57) does run two findIndex passes unmemoized.

But three parts are wrong or churn. (1) The title's "desktop/mobile trees fully duplicated" is false: desktop is a hover flyout with role=menu/tabIndex/childActive (615-634), mobile a split-row accordion with its own chevron button and setMobileOpen(false) (697-731); the spans are two pairs (h-6/size22 vs h-5/size16/opacity-80), not four identical copies. (2) `usePathname(): string` — node_modules/next/dist/client/components/navigation.d.ts:42 — so line 311 is safe; the `?.` at 238 is the redundancy, not 311 the bug. (3) useMemo over ~8 nav items feeding no memoized child, and a 6-prop NavChildLink to save ~10 lines, are churn.
>
> *Correction:* Navbar.tsx (759 lines) does carry real, verified duplication: the icon-wrapper + AdminNotificationCountBadge span appears four times (components/layout/Navbar.tsx:533, 550, 682, 704) as two near-identical pairs — desktop h-6 w-6 / Icon size 22, mobile h-5 w-5 opacity-80 / Icon size 16 — and the `resolvedPageImages[child.href] ?? navItemLogos[child.href]` + `/^https?:\/\//` external test is re-derived in both child-link loops (611-613 and 714-716). One genuine defect: `openSection` (line 223) serves both the desktop hover flyout (456-457, 527) and the mobile accordion (665, 689) with no reset on breakpoint change, so an open mobile accordion re-renders as a desktop flyout after a resize past lg — cosmetic, self-healing via Escape/outside-click (351-371). The rest of the finding does not hold. The desktop and mobile trees are NOT "fully duplicated": they differ in role=menu/tabIndex/childActive/icon-fallback (615-634) versus a split row with its own chevron button and setMobileOpen(false) (697-731), so the proposed shared NavChildLink would need six props to save ~10 lines. The isActive recommendation is backwards: `usePathname()` is typed `string` (node_modules/next/dist/client/components/navigation.d.ts:42), so line 311 is safe and the `?.` at line 238 is the redundant one — adding optional chaining at 311 is cargo-cult. Memoizing navItems (~8 entries, two findIndex passes, result passed to no memoized child) and relocating a single-consumer hook to lib/hooks/ are churn on a single-maintainer codebase. Worth doing: give the mobile drawer its own state, and optionally collapse the four spans into one two-prop NavIcon. Skip the rest.

---

### 74. Muted body text uses text-slate-600/700 on the #060b18 background — ~1.9:1 to 2.6:1 contrast, failing WCAG AA

**Code quality · medium** · `components/layout/PageHeader.tsx:156`

```
{meta && <p className="text-xs text-slate-600 mt-0.5">{meta}</p>}
```

**What it is.** slate-600 (#475569) on the site background (#060b18, set at app/layout.tsx:233) computes to ~2.6:1; slate-700 (#334155), used for the "Last updated" line in CustomPageView.tsx:39, computes to ~1.9:1. AA requires 4.5:1 for body text and 3:1 even for large text. `grep -o 'text-slate-\(600\|700\)' components/ app/ --include=*.tsx | wc -l` returns 147 occurrences — Footer.tsx:55, Navbar.tsx:577, AnnouncementList.tsx:73 (the announcement date), PageHeader.tsx:156 (download row metadata), activity-chart-card.tsx:428/472/495/502/508/513, and more. Several of these carry real information (dates, file metadata, connection counts), not decoration.

**Impact.** Announcement dates, download file metadata and admin chart labels are effectively unreadable for low-vision users and in bright rooms on the DoD-standard dark theme. This is the site's most widespread accessibility defect by count.

**Fix.** Add one semantic token beside --accent-cyan in app/globals.css:58 — e.g. --text-muted: #94a3b8 (slate-400, ~7:1 here) — expose it as a Tailwind color in tailwind.config.js, then `sed` text-slate-700 and text-slate-600 to text-muted across components/ and app/. Reserve slate-600 for genuinely decorative rules and separators only.

> **worth-it review — upheld** (high confidence). Every cited location verifies verbatim. components/layout/PageHeader.tsx:156 is exactly `{meta && <p className="text-xs text-slate-600 mt-0.5">{meta}</p>}`; components/common/CustomPageView.tsx:39 is `text-[10px] font-mono text-slate-700` on the "Last updated" line; components/home/AnnouncementList.tsx:73 is the announcement date; Footer.tsx:55, Navbar.tsx:577 and components/ui/activity-chart-card.tsx:428/472/495/502/508/513 all match. The grep count is exactly 147 (132 slate-600 + 15 slate-700). tailwind.config.js has no slate override and app/globals.css has no .text-slate-600 override or prefers-contrast block, so Tailwind defaults #475569/#334155 apply. Two details are wrong but do not change the conclusion: body is bg-[#040a16] at app/layout.tsx:233 (not #060b18, which is --bg-primary at app/globals.css:56) — recomputed the ratios are still ~2.6:1 and ~1.9:1, and ~2.4:1 over --bg-card #0d1428. And --text-muted already exists at app/globals.css:61 (#64748b, unused), so the fix re-values an existing token rather than adding one. A blind sed is risky: ~46 hits are admin/certsrv wizard step indicators.
>
> *Correction:* Accurate in substance, with two corrections. The background is #040a16 (app/layout.tsx:233), not #060b18 — recomputed ratios are still ~2.6:1 for slate-600 and ~1.9:1 for slate-700 (and ~2.4:1 over --bg-card #0d1428), so the AA failure stands across all 147 occurrences, with no Tailwind slate override and no prefers-contrast fallback anywhere. Second, a `--text-muted` token already exists at app/globals.css:61 with value #64748b and is referenced nowhere; at ~4.2:1 it would also fail AA, so the work is to re-value that existing token (e.g. #94a3b8) and expose it in tailwind.config.js, not to add a new one. The recommended blanket sed should be scoped rather than global: roughly 46 of the hits are inactive wizard-step numerals in app/certsrv/* and app/admin/* where the dimming is intentional; the high-value targets are the informational ones (announcement dates, download metadata, chart labels).

---

### 75. Every legal page renders a second <main> nested inside the layout's main landmark

**Code quality · medium** · `components/legal/LegalWrapper.tsx:23`

```
<main className="p-8 md:p-12">
```

**What it is.** `AppShell` already wraps all route children in `<main id="main-content" className="flex-1 pt-14 lg:pt-0">` (components/layout/AppShell.tsx:73; the chromeless branch does the same at line 61), and that id is the target of the skip link in app/layout.tsx:234. `LegalWrapper` then opens its own `<main>` around the page body, so every page it wraps — accessibility, mission, nofear, open-gov, links-disclaimer, terms, foia, privacy-security, information-quality, veterans-crisis-line — ships two nested `main` elements. Nested `<main>` is invalid HTML and produces two `main` landmarks, only one of which the skip link reaches. app/docs/repos/RepoGuideViewer.tsx:106 has the same second-main problem.

**Impact.** WCAG 1.3.1 Info and Relationships / ARIA landmark convention failure on the entire statutory-footer set — the exact pages (Accessibility, No FEAR, Section 508 links, Veteran's Crisis Line) an assistive-technology user or a 508 reviewer is most likely to navigate by landmark. Landmark navigation lands in the wrong region and screen readers announce "main" twice.

**Fix.** Change LegalWrapper's `<main>` to a `<div>` (or `<section>`); the root `<main id="main-content">` from AppShell is already the page's single main landmark. Do the same at RepoGuideViewer.tsx:106.

> **worth-it review — upheld** (high confidence). Every cited location and effect verified. components/legal/LegalWrapper.tsx:23 is exactly `        <main className="p-8 md:p-12">` (closes at :37). components/layout/AppShell.tsx:73 is `<main id="main-content" className="flex-1 pt-14 lg:pt-0">` and the chromeless branch at :61 is `<main id="main-content" className="flex-1">`. app/layout.tsx:248 renders `<AppShell>{children}</AppShell>` for every route and :234 is the skip link `<a href="#main-content" ...>`. CHROMELESS_PATHS (AppShell.tsx:27-34) holds only `/` and `/login`, so every legal route gets the outer main. All ten LegalWrapper consumers are live routes (app/accessibility/page.tsx etc. each render the component). app/docs/repos/RepoGuideViewer.tsx:106 is `      <main className="min-w-0">`, rendered inside app/docs/repos/{deb,rpm,pip}/page.tsx — same nesting. Nested main is not "hierarchically correct" per HTML, producing two main landmarks. The recommendation is a two-token change in two files, no abstraction, and accessibility is not a corner to cut. Accurate and worth the diff.

---

### 76. APEN-chat-assistant.tsx is 1894 lines in one function component with ~30 useState hooks and four unrelated features

**Code quality · medium** · `components/ui/APEN-chat-assistant.tsx:383`

```
export function FloatingAiAssistant() {
  const [open, setOpen] = useState(false)
```

**What it is.** FloatingAiAssistant spans lines 383-1894: launcher pill + greeting card, panel drag, panel resize (eight handles), chat transcript with per-message export/rate/retry, a feedback form, a theme toggle, an HTML preview modal and a fullscreen mode — all in one closure. State declarations alone run from line 386 to 463. Panel drag (643-699) and panel resize (700-786) are two self-contained pointer-event state machines that touch only panelPos/panelSize. Feedback state is five isolated useStates (415-419). The file already demonstrates the right instinct by exporting pure helpers for tests (clampAssistantPosition:229, getAssistantPanelPosition:336, shouldAutoOpenAssistant:220) — the stateful half just never got the same treatment.

**Impact.** Every edit to the feedback form re-renders and risks the chat transcript; a single state change anywhere re-renders 1300 lines of JSX. React DevTools cannot isolate a cause, and the file is effectively unreviewable in one sitting.

**Fix.** Four extractions along existing seams, none requiring new abstractions: (1) lib/hooks/usePanelGeometry.ts owning panelPos/panelSize and both pointer handlers (lines 643-790 move verbatim, returning {panelPos, panelSize, onHeaderPointerDown, onResizePointerDown}); (2) components/assistant/AssistantLauncher.tsx for the pill + greeting (state at 447-463, effects at 486-528, JSX at ~1360-1560); (3) components/assistant/FeedbackForm.tsx taking the five fb* states with it; (4) lib/hooks/useTranscript.ts for messages/ratings/localStorage/server hydration (597-642) plus handleSend/retryFrom. The remaining shell lands near 400 lines.

> **worth-it review — upheld** (high confidence). Facts confirm. `wc -l` = 1894; `export function FloatingAiAssistant()` is at APEN-chat-assistant.tsx:383 and runs to the `createPortal` return at :1893. I counted 32 `useState` calls inside it (:386-:463), 48 hook calls total. Feedback state is exactly :415-419. Drag handler `handlePanelHeaderPointerDown` :646-698 (`}, [panelSize])`), resize :706-777 — close enough to the cited 643-699/700-786. Exported pure helpers exist at :216, :220, :229, :336 as claimed, and `lib/assistant/{policy,storage,types}.ts` + `components/assistant/FormattedMessage.tsx` + `lib/hooks/useRouteImage.ts` show the extraction convention already exists.

One material inaccuracy: "move verbatim, none requiring new abstractions" understates cost. tests/ui-behavior.test.ts pins this file's *source text*, e.g. :270-272 `assert.match(assistantSource, /window\.addEventListener\('pointermove'/)` and `/setPointerCapture/`, plus a dozen similar reads at :169, :262, :278, :290, :302, :320, :332, :349, :613. Moving the pointer handlers out breaks those greps; the refactor drags the test file with it.

Given no bug, no user impact, live prod, single maintainer, and regex-only coverage as the safety net, this is low-severity debt, not medium.
>
> *Correction:* The size claims are accurate and verified: components/ui/APEN-chat-assistant.tsx is 1894 lines, FloatingAiAssistant spans 383-1893 with 32 useState hooks (386-463) and 48 hooks total, covering launcher/greeting, drag (646-698), resize (706-777), transcript, feedback (415-419), theme, preview and fullscreen in one closure. What the finding gets wrong is the cost of its fix. It calls the four extractions "verbatim moves, no new abstractions," but tests/ui-behavior.test.ts asserts on this file's *source text* in ten places (e.g. line 270: `assert.match(assistantSource, /window\.addEventListener\('pointermove'/)`, line 272 `/setPointerCapture/`), so pulling the pointer handlers into lib/hooks/usePanelGeometry.ts fails the suite until those assertions are repointed at the new files. The impact framing is also overstated: the 1300-line panel JSX is gated behind `{open && (` at line 1563, so a feedback keystroke does not re-render a closed panel. This is real but inert debt on a working component with no reported bug; treat it as low, and if anything is done, do only extraction (1) — the two pointer state machines are the cleanest seam — and update the matching assertions in the same commit.

---

### 77. The chat transcript is not an ARIA live region, so assistant replies are never announced

**Code quality · medium** · `components/ui/APEN-chat-assistant.tsx:1622`

```
<div ref={scrollRef} onScroll={handleMessagesScroll} className="flex-1 space-y-4 overflow-y-auto p-4">
```

**What it is.** The message list container carries no role="log"/aria-live, no aria-label and no tabIndex. The surrounding panel is correctly marked role="dialog" aria-label at line 1567, and individual controls are well labelled (aria-pressed on the thumbs at 1664-1665, aria-live on the feedback character count at 1792), which makes this gap stand out: a screen-reader user sends a message, hears nothing while `thinking` is true, and gets no announcement when the reply is appended at line 906. Without tabIndex the scroll container is also not reachable for keyboard scrolling.

**Impact.** Blind users of the assistant have no way to know a reply arrived short of manually re-navigating the panel. This is the site's primary self-service support channel.

**Fix.** Three attributes on that div: role="log" aria-live="polite" aria-label="Conversation" plus tabIndex={0} so it can be scrolled from the keyboard. Add aria-busy={thinking} on the same element so the pending state is exposed too.

> **worth-it review — upheld** (high confidence). Every cited location checks out verbatim. components/ui/APEN-chat-assistant.tsx:1622 is exactly `<div ref={scrollRef} onScroll={handleMessagesScroll} className="flex-1 space-y-4 overflow-y-auto p-4">` — no role, no aria-live, no aria-label, no tabIndex. A grep for aria-live/role="log"/role="status"/aria-busy across the whole 1894-line file returns only lines 1792 and 1811, both inside the Feedback form, so nothing else announces replies. role="dialog" aria-label sits at 1567 and the aria-pressed thumbs at 1664-1665, exactly as described. The assistant reply is appended at 906 (`setMessages((p) => [...p, { role: 'assistant', text: reply, ts: Date.now() }])`) and again on the retry path at 1060 — both land in that silent container. The `thinking` indicator at 1684 is plain text in the same container, so the pending state is silent too. On value: this is four attributes on one existing line — no new component, no dependency, no impact on the static export or air-gap bundle — and accessibility basics are not churn. Finding stands as written.

---

### 78. Dropdown animation classes are inert — tailwindcss-animate was never installed

**Code quality · medium** · `components/ui/dropdown-menu.tsx:41`

```
'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
```

**What it is.** `animate-in`, `animate-out`, `fade-in-0`, `fade-out-0`, `zoom-in-95`, `zoom-out-95`, `slide-in-from-top-2` and `slide-in-from-bottom-2` (lines 41, 60, 61) are all supplied by the `tailwindcss-animate` / `tw-animate-css` plugin. That plugin is not in package.json, not in node_modules (`ls node_modules | grep -i animate` returns nothing), tailwind.config.js:88 declares `plugins: []`, and grepping app/globals.css for `animate-in`/`fade-in-0`/`--tw-enter` returns no matches. None of these utilities exist in the build.

**Impact.** Every dropdown in the admin console and activity chart opens and closes with no transition at all. The classes are silently dropped by Tailwind's JIT — no build error, no console warning — so the defect is invisible until someone compares against the shadcn demo. This also confirms the file was pasted from upstream rather than written against this project's Tailwind setup.

**Fix.** Pick one: add the plugin (blocked here — node_modules is root-owned, see project memory), define the eight keyframe utilities directly in app/globals.css alongside the existing bespoke @keyframes, or delete the dead class strings so the file honestly reflects what renders. The third option is the smallest diff if the animation is not wanted.

> **worth-it review — upheld** (high confidence). Could not refute; every factual claim checks out, plus I confirmed it in the shipped CSS. components/ui/dropdown-menu.tsx:41 and :60-61 contain the quoted strings verbatim. No animate plugin: `ls node_modules | grep -i animate` empty, package.json has no tailwindcss-animate/tw-animate-css, tailwind.config.js:129 `plugins: []`, and app/globals.css:1-2 is only `@import "tailwindcss";` / `@config "../tailwind.config.js";` with no `@plugin`. Decisive check the finder did not do: the built stylesheet out/_next/static/chunks/242a2holevi1b.css contains zero occurrences of `animate-in`, `--tw-enter-opacity`, or any `data-state=open]:` selector; the only emitted animate-* utilities are ambient-drift/bounce/fade-in/ping/pulse/spin. Two corrections: impact is narrower than stated (dropdown-menu has exactly one consumer, components/ui/activity-chart-card.tsx, used by app/admin/AdminDashboard.tsx), and broader than stated elsewhere (`animate-in fade-in duration-500` is also inert on 7 support pages, e.g. app/support/page.tsx:7). Effect is cosmetic only, so medium overstates it.
>
> *Correction:* Accurate on the facts, but scope and severity need adjusting. The eight utilities at components/ui/dropdown-menu.tsx:41,60,61 genuinely do not exist in this build — verified by grepping the shipped stylesheet out/_next/static/chunks/242a2holevi1b.css, which has zero matches for `animate-in`, `--tw-enter-opacity`, or any `data-state=open]:` selector. However the blast radius is one component, not "every dropdown in the admin console": components/ui/dropdown-menu.tsx is imported only by components/ui/activity-chart-card.tsx, which app/admin/AdminDashboard.tsx renders. Conversely the finder missed that the same dead plugin utilities are used outside this file — `animate-in fade-in duration-500` appears on seven page wrappers (app/support/page.tsx:7, app/support/ticket/page.tsx:10,63, app/support/status/page.tsx:12,141, app/support/knowledge-base/page.tsx:6, app/support/password-reset/page.tsx:9, components/common/SupportKnowledgeCategoryPage.tsx:14), so any fix should cover those too or it is half a fix. The effect is purely cosmetic (no missing transition anyone has complained about, no build or runtime error), so low, not medium. The recommendation is sound and the deletion option is the right one here: adding the plugin is blocked by root-owned node_modules, and hand-rolling eight keyframe utilities in a 1796-line globals.css that already carries 25 bespoke @keyframes is more code than the animation is worth.

---

### 79. INSTALL.sh starts pm2 apps without ecosystem.config.js, dropping the NODE_EXTRA_CA_CERTS the config file exists to preserve

**Code quality · medium** · `deploy/INSTALL.sh:364`

```
pm2_as start npm --name apen-stats-api -- run stats
  pm2_as restart voltron-proxy --update-env 2>/dev/null \
    || pm2_as start proxy/voltron-proxy.mjs --name voltron-proxy
```

**What it is.** ecosystem.config.js lines 23-30 explain that NODE_EXTRA_CA_CERTS is "REQUIRED, not optional" and that losing it on a `pm2 delete` + `pm2 start` caused the 2026-08-04 outage. INSTALL.sh does exactly that: `pm2 delete apen-stats-api` then `pm2 start npm -- run stats` and `pm2 start proxy/voltron-proxy.mjs`, never `pm2 start ecosystem.config.js`, so neither app gets the env block on a fresh enclave.

**Impact.** On the target enclave every outbound TLS call to an internally-signed host (the Voltron upstream, any https infrastructure node without the rejectUnauthorized bypass) fails with UNABLE_TO_VERIFY_LEAF_SIGNATURE; the usual field fix is NODE_TLS_REJECT_UNAUTHORIZED=0, which silently disables verification everywhere.

**Fix.** Replace lines 362-366 with `pm2_as delete apen-stats-api voltron-proxy || true; pm2_as start ecosystem.config.js` (cwd is already $SITE_ROOT), and have VERIFY.sh assert `pm2 jlist` shows NODE_EXTRA_CA_CERTS in each app's env.

> **worth-it review — upheld** (high confidence). Evidence confirmed verbatim. deploy/INSTALL.sh:362-366 reads `pm2_as delete apen-stats-api`, `fuser -k -TERM 8788/tcp`, `pm2_as start npm --name apen-stats-api -- run stats`, `pm2_as restart voltron-proxy --update-env ... || pm2_as start proxy/voltron-proxy.mjs --name voltron-proxy`. `grep -n ecosystem deploy/INSTALL.sh` returns nothing, and nothing in deploy/ mentions NODE_EXTRA_CA_CERTS, so the env block at ecosystem.config.js:30 and :43 (with the 2026-08-04 rationale at lines 23-29) is never applied. The file IS shipped (scripts/make-airgap-bundle.sh:70 rsyncs the whole repo), so it's present and simply unused. Impact is real where TLS is verified: voltron-proxy.mjs:380 and :568 use bare `fetch(upstream.url,...)`, and site-stats.mjs:1281 only sets `rejectUnauthorized = false` when `viaProxy`, so direct https node probes verify. Worse, `restart --update-env` (line 365) pushes the install shell's env onto an already-running voltron-proxy, stripping a variable an older manual start had — the exact case ecosystem.config.js:41-42 describes. The recommended diff is 2 lines and matches DEPLOY.md:135.
>
> *Correction:* Accurate, with two refinements. (1) LDAPS is not affected: site-stats.mjs:1906-1909 loads the realm's own `caCertPath` into ldapts `tlsOptions`, so AD binds do not depend on NODE_EXTRA_CA_CERTS despite what ecosystem.config.js:26 claims; and the nginx-stats loopback fetch (site-stats.mjs:1317) already sets `rejectUnauthorized = false`. The genuinely exposed surfaces are the Voltron upstream (`fetch` at proxy/voltron-proxy.mjs:380 and :568, no agent/TLS override) and direct non-proxy https infrastructure-node probes (site-stats.mjs:1281 bypasses verification only when `viaProxy`). (2) The problem is not limited to fresh enclaves: on an update run, deploy/INSTALL.sh:365 `pm2_as restart voltron-proxy --update-env` replaces the running process env with the install shell's, which actively strips a NODE_EXTRA_CA_CERTS that an earlier manual start had — precisely the failure mode ecosystem.config.js:40-43 was written to prevent. Fix as recommended (`pm2_as delete apen-stats-api voltron-proxy || true; pm2_as start ecosystem.config.js`), keeping the existing `fuser -k -TERM 8788/tcp` line at INSTALL.sh:363.

---

### 80. Vendored minified third-party file produces 593 of 682 lint warnings because exports/ is missing from globalIgnores

**Code quality · medium** · `eslint.config.mjs:14`

```
'public/vendor/**',
    'speedtest/frontend/**',
    'proxy/*.json',
```

**What it is.** The globalIgnores comment at eslint.config.mjs:12-13 says "Checked-in third-party runtimes are deployed as-is and are not authored by this project. Linting their minified sources hides actionable output." It lists public/vendor/** and speedtest/frontend/** but not exports/. `npx eslint . -f json` shows exports/tenable-iris/lottie_light.min.js contributing 593 warnings — 87% of the repo total — all `@typescript-eslint/no-unused-expressions` at column offsets on its single minified line. The file is git-tracked (one of 7 files under exports/).

**Impact.** Every `npm run lint` run buries the ~89 genuine warnings under 593 from one third-party bundle, so the lint output is unreadable and, in practice, unread. It also makes a `--max-warnings` ratchet impossible to set meaningfully.

**Fix.** Add `'exports/**'` (or at least `'**/*.min.js'`) to the globalIgnores array at eslint.config.mjs:8-19, matching the stated policy the list already implements for public/vendor and speedtest/frontend.

> **worth-it review — upheld** (high confidence). Evidence verbatim at eslint.config.mjs:14-16 ("'public/vendor/**',\n'speedtest/frontend/**',\n'proxy/*.json',") with the policy comment at :12-13; `exports/**` is absent. Mechanism confirmed statically: package.json:16 is `"lint": "eslint ."`; eslint-config-next/dist/index.js:112 scopes the next config to `**/*.{js,jsx,mjs,ts,tsx,mts,cts}`; eslint-config-next/dist/typescript.js:33-38 spreads tseslint recommended and sets `'@typescript-eslint/no-unused-expressions': 'warn'` with NO `files` key, and @typescript-eslint/eslint-plugin/dist/configs/flat/base.js + recommended.js likewise carry no `files` scoping — so that rule really does fire on plain .js. `git ls-files exports/` shows 7 files incl. exports/tenable-iris/lottie_light.min.js (1 line, 168 KB), and `cmp` proves it is byte-identical to public/vendor/lottie_light.min.js, which IS ignored — so this is plainly an oversight, not policy. The one-line fix matches existing convention. Caveats: I could not re-run eslint (static-analysis-only rule), so 593/682 is unverified though plausible; and `exports/**` would also silence project-authored exports/tenable-iris/LottieMark.tsx, so the finder's `**/*.min.js` alternative is the better pick.

---

### 81. Dead ternary in getGpuTier discards the entire isExplicitHigh classification

**Code quality · medium** · `lib/data/gpuTier.ts:285`

```
_cached = isExplicitHigh ? 'high' : 'high' // unrecognized but real hardware → 'high'
```

**What it is.** Both branches return 'high', so the 14-clause `isExplicitHigh` regex chain built at lines 271-283 (geforce, quadro, rtx, gtx, titan, tesla, rx, radeon pro, apple m-series, adreno 6xx-8xx, mali-g7x) is computed and then thrown away. Every renderer string reaching this point is classified 'high' regardless of what it says. The trailing comment acknowledges the fallthrough intent but the positive-marker list it was meant to complement has no effect.

**Impact.** Any GPU that is neither matched by isSoftwareRenderer (line 115) nor isIntegratedRenderer (line 139) gets the full effects path. An unrecognised weak or future integrated chip — exactly the case the comment at lines 267-270 says the explicit list exists to catch — is silently promoted to 'high', driving StarfallBackground to 35 particles + 16 nodes + scanline (StarfallBackground.tsx:109) and AsideFrost to an 18px backdrop blur (AsideFrost.tsx:33) on hardware that cannot composite it. On the locked-down enterprise workstations this site serves, that is the visible-jank path.

**Fix.** Decide the intent and make the code say it: either `_cached = isExplicitHigh ? 'high' : 'mid'` (conservative — unrecognised hardware gets the lighter path), or delete the isExplicitHigh block entirely and assign 'high' directly if the fallthrough really is intended. Leaving both branches identical guarantees the next reader re-derives this.

> **worth-it review — upheld** (high confidence). Evidence confirmed verbatim: lib/data/gpuTier.ts:285 is `_cached = isExplicitHigh ? 'high' : 'high'`, and the 14-clause chain at :271-283 is computed then discarded. Real dead code.

But the impact story is wrong on two counts. (1) app/layout.tsx:55-108 is the authoritative detector — getGpuTier() returns `window.__APEN_GPU_TIER__` early (gpuTier.ts:~228-233) before ever reaching 285. That inline script has no explicit-high list at all; it ends `return 'high'` (layout.tsx:107) for any unrecognised renderer. So fallthrough-to-high is the deliberate, mirrored design, not an accident line 285 causes; the StarfallBackground.tsx:109 / AsideFrost.tsx:33 jank path is reached via layout.tsx regardless. (2) The recommended `? 'high' : 'mid'` would silently diverge gpuTier.ts from the inline script (other software/integrated branches are explicitly commented as mirrors), i.e. a behavior change dressed as a cleanup, with no tests covering it.

Worth fixing only as the finder's second option: delete lines 271-285's dead chain, assign 'high'. ~15 lines gone, zero behavior change.
>
> *Correction:* lib/data/gpuTier.ts:285 really does contain a dead ternary (`isExplicitHigh ? 'high' : 'high'`) that discards the 14-clause regex chain built at :271-283 — confirmed verbatim. However this is dead code, not a misclassification bug: the inline pre-hydration detector in app/layout.tsx is what actually sets the tier (getGpuTier returns `window.__APEN_GPU_TIER__` before reaching line 285), and that script has no explicit-high list either — it ends `return 'high'` at layout.tsx:107 for unrecognised renderers. Fallthrough-to-high is therefore the intended, deliberately mirrored behavior on both paths, so the claimed impact (line 285 promoting weak hardware to the 35-particle/18px-blur path) misattributes behavior that layout.tsx drives independently. The finder's first recommendation (`: 'mid'`) is not a cleanup but a behavior change that would desync gpuTier.ts from the inline mirror with no test coverage. Only the second option is worth the diff: delete lines 271-285's unused chain and assign 'high' directly — about 15 lines removed, no behavior change.

---

### 82. repo-guides.ts hardcodes apensupport.blcse.mil as trusted-host, bypassing the single rename constant it derives its URLs from

**Code quality · medium** · `lib/data/repo-guides.ts:180`

```
{ type: 'code', code: `pip config set global.index-url ${PIP_BASE}/simple/\npip config set global.trusted-host apensupport.blcse.mil` },
```

**What it is.** PIP_BASE (line 138) correctly derives its host from APENSUPPORT_ABSOLUTE, but the paired --trusted-host / trusted-host / UV_INSECURE_HOST values are literal strings at lines 153, 160, 180, 187 and 213. lib/data/constants.ts:31 documents APENSUPPORT_ABSOLUTE as "the one constant to update if the site is ever renamed again", and line 20 of the same file says "Never put a hostname back here". The site has already been renamed once (constants.ts:19-20 references the apensupport2 → apensupport move), so this is a demonstrated failure mode, not a hypothetical.

**Impact.** On the next rename, PIP_BASE follows the constant and the trusted-host literals do not. pip/uv then hit the new host with the old host on their trust list, so TLS verification fails on every install and the failure mode (certificate error, not 404) is far harder to diagnose than a dead link.

**Fix.** Derive the bare hostname once — e.g. `const APEN_HOST = new URL(APENSUPPORT_ABSOLUTE).host` in constants.ts — and interpolate it at all five sites. lib/data/admin-content.ts:1469-1478 has the same class of hardcoded literal and is worth the same sweep.

> **worth-it review — upheld** (high confidence). Tried to refute; the code matches. lib/data/repo-guides.ts:180 is verbatim as quoted; the sibling literals are at 153, 160, 187, 213 exactly as claimed, and PIP_BASE at :138 is `const PIP_BASE = URLS.reposPip`, which constants.ts:71 defines as `${APENSUPPORT_ABSOLUTE}/repos/pip` (:31). constants.ts:19-20 and :28-31 do say what the finder quotes. A bare-host grep of lib/data/repo-guides.json returns 0 hits, so these five really are the only unbound host literals in the guide data — and repo-guides.ts:127-131 documents that this file is hand-authored precisely because the extractor overwrites the JSON, so the extractor's repointHost (scripts/extract-repo-guides.mjs:20-21, scheme-anchored, REPO_HOST-driven) will never reach them. What I do not accept is the weight. `trusted-host`/`UV_INSECURE_HOST` only waive verification for the named host; if the renamed host's cert chains to the already-trusted APEN CA, pip and uv work unchanged, so the failure needs an untrusted-CA machine as well as a rename. It is copy-paste doc text with a visibly mismatched hostname next to the correct index-url, not a runtime path. Fix is ~6 lines and worth doing, but low, not medium.
>
> *Correction:* The factual claims hold at every cited line: lib/data/repo-guides.ts:153, 160, 180, 187 and 213 embed the bare literal `apensupport.blcse.mil` beside a `${PIP_BASE}` that does follow APENSUPPORT_ABSOLUTE (constants.ts:31, :71), and these are the only bare-hostname occurrences in the guide data (repo-guides.json has none — its 291 hits all carry a scheme and are rewritten by scripts/extract-repo-guides.mjs:20-21 via REPO_HOST, which repo-guides.ts is deliberately excluded from per its :127-131 header). So a rename genuinely would leave these five stale. The impact is narrower than stated: `--trusted-host` / `trusted-host` / `UV_INSECURE_HOST` only waive TLS verification for the named host, so a stale value breaks nothing on a machine that trusts the APEN CA — it fails only on machines still bootstrapping trust, and the visible symptom is a hostname in the snippet that no longer matches the index-url on the line above. This is doc copy, not a runtime path. Severity low. The recommendation is still worth the diff because it is tiny and mechanical (a bare-host const in constants.ts, five interpolations; admin-content.ts:1469-1478's ten scheme'd literals can take APENSUPPORT_ABSOLUTE in the same pass) — no `new URL()` parsing needed.

---

### 83. hrefLabel is a required, admin-editable card field that no renderer ever displays

**Code quality · medium** · `lib/types/cards.ts:27`

```
hrefLabel: string
```

**What it is.** `hrefLabel` is required on every NavCard (lib/types/cards.ts:27), populated ~46 times across 11 files in lib/data (docs.ts alone has 15), and exposed to sysadmins as an editable "Link label" text field in the admin content editor (app/admin/AdminContentEditor.tsx:467: `{ key: 'hrefLabel', label: 'Link label', type: 'text', full: true }`). But all 18 HoverRevealCard grids destructure it away before spreading, e.g. app/downloads/DownloadsProductCards.tsx:14 `{cards.map(({ itemCount, hrefLabel, ...card }, index) => (`, and HoverRevealCardProps (components/cards/HoverRevealCard.tsx:14-33) has no matching prop — only `subtitle`, which receives `itemCount`. The field is write-only dead weight.

**Impact.** An admin edits "Browse ISOs →", publishes, and nothing on the live site changes — with no error. The same file's own comment at AdminContentEditor.tsx:469-472 removed a different scope for exactly this reason ("A control that silently does nothing is worse than no control"), so the standard is already established and violated here.

**Fix.** Either render it (pass `hrefLabel` through to HoverRevealCard as the CTA text) or delete the field from lib/types/cards.ts, the 11 data files, and the editor field list. Do not leave a third state.

> **worth-it review — upheld** (high confidence). Core claim confirmed. lib/types/cards.ts:27 `hrefLabel: string` is required on NavCard; 46 values across 11 lib/data files; no renderer reads it. HoverRevealCard.tsx:31/73/248 has `ctaLabel` (`{ctaLabel ?? (external ? 'Open site' : 'Open')}`) but no `hrefLabel`, and all 16 grids strip it, e.g. app/docs/repos/ReposCategoryCards.tsx:14 `{cards.map(({ itemCount, hrefLabel, ...cat }, index) => (`. Three inaccuracies: (1) 16 grids, not 18; (2) the "silently does nothing" comment is at AdminContentEditor.tsx:470-475, not 469-472; (3) most important — hrefLabel is exposed in exactly ONE editor scope, `repos/landing/cards` (AdminContentEditor.tsx:467), so the stated impact example ("An admin edits 'Browse ISOs →'") is impossible: no ISO/downloads scope offers the field. The real admin-facing defect is one dead text input on /repos. Everywhere else it is inert source data. The 1-line lazy fix (delete AdminContentEditor.tsx:467) removes the silent control and matches the file's own precedent; ripping the field out of 11 data files and the type is churn with no user-visible payoff. Severity medium overstates one dead field.
>
> *Correction:* `hrefLabel` is required on NavCard (lib/types/cards.ts:27) and set 46 times across 11 lib/data files, but no component renders it: HoverRevealCard exposes `ctaLabel` (components/cards/HoverRevealCard.tsx:31, rendered at :248) and never `hrefLabel`, and all 16 card grids destructure it away before spreading (e.g. app/docs/repos/ReposCategoryCards.tsx:14). The admin-facing part is narrower than reported: only one scope, `repos/landing/cards`, exposes it as an editable field (app/admin/AdminContentEditor.tsx:467) — the ISO/downloads example in the original impact cannot happen because those scopes never list the field. So exactly one sysadmin control on /repos silently does nothing, contradicting the precedent set in the comment at AdminContentEditor.tsx:470-475 ("A control that silently does nothing is worse than no control"). The proportionate fix is deleting that single editor field line; wiring hrefLabel through as `ctaLabel` is an optional improvement, and stripping the field from the type and all 11 data files is churn.

---

### 84. `eslint .` is a no-op gate: 682 warnings, 0 errors, and no --max-warnings threshold

**Code quality · medium** · `package.json:16`

```
"lint": "eslint .",
```

**What it is.** I ran `npx eslint .`: it exits 0 with "✖ 682 problems (0 errors, 682 warnings)". eslint.config.mjs:24-44 downgrades five rules (`react-hooks/set-state-in-effect`, `preserve-manual-memoization`, `refs`, `static-components`, `react/no-unescaped-entities`) to 'warn' and its own comment calls this "a migration gate" that keeps "legacy findings visible" until owners refactor. Nothing enforces that: with no `--max-warnings 0` (or any lower cap), the warning count can grow without bound and `npm run validate` still passes.

**Impact.** The declared migration gate does not gate anything. New code can add React-compiler violations and unused-variable warnings indefinitely, and the real warnings (e.g. proxy/site-stats.mjs:4216 unused destructured `updatedBy`/`updatedAt`/`published`, lib/data/site-updates.ts:92 unused `getRouteActivity`) are invisible in the noise.

**Fix.** Pin the current real count as a ratchet: `eslint . --max-warnings <N>` where N is the count after the vendored-file fix below, and lower N as findings are cleared. That turns the comment's stated intent into an enforced ceiling with no code changes required.

> **worth-it review — upheld** (high confidence). Core mechanism confirmed. package.json:16 is exactly `    "lint": "eslint .",` — no `--max-warnings`, so warnings can never fail; package.json:24 `"validate": "npm run lint && npm run typecheck && npm test && npm run build"`. eslint.config.mjs downgrades the five named rules and its comment does say "act as a migration gate" / "Keep legacy findings visible". The unused-var examples check out: proxy/site-stats.mjs:4216 `.map(({ updatedBy, updatedAt, createdAt, published, ...rest }) => rest)` (typescript-eslint no-unused-vars defaults `ignoreRestSiblings: false`, node_modules/@typescript-eslint/eslint-plugin/dist/rules/no-unused-vars.js:269) and lib/data/site-updates.ts:92 `function getRouteActivity(): Announcement[] {` has no other reference repo-wide.

Two corrections. (1) The cited range "eslint.config.mjs:24-44" does not exist — the file is 37 lines; comment 21-28, rules 29-35. (2) Severity is overstated: there is no .github, no active .git/hooks, and the admin Publish path runs only `npm run build` (proxy/site-stats.mjs:625), so `npm run validate` is a manual single-maintainer command. The ratchet is a one-flag change but gates nothing automated, and is meaningless until exports/ is ignored.
>
> *Correction:* Accurate in substance: package.json:16 runs `eslint .` with no `--max-warnings`, so the "migration gate" described in eslint.config.mjs:21-28 (rules downgraded to 'warn' at lines 29-35) enforces no ceiling and `npm run validate` (package.json:24) passes regardless of warning count. Two corrections: the description cites "eslint.config.mjs:24-44", a range that does not exist (the file is 37 lines); and the impact is smaller than medium — there is no CI (.github absent), no active git hooks, and the only automated build path, the admin Publish button, spawns `npm run build`, not `npm run validate` (proxy/site-stats.mjs:625). So lint is a manual single-maintainer command, not a gate anything passes through. The `--max-warnings N` ratchet is a cheap one-flag change but is worthless until `exports/**` is added to globalIgnores (87% of the count is one minified vendored file), and once that is done the remaining ~89 warnings are few enough that fixing them and pinning `--max-warnings 0` is the better end state than a drifting N.

---

### 85. No CI and no pre-commit hook: `npm run validate` runs only inside a staged-package installer

**Code quality · medium** · `package.json:24`

```
"validate": "npm run lint && npm run typecheck && npm test && npm run build"
```

**What it is.** There is no .github/, .gitlab-ci.yml, or any other CI descriptor in the repo (`ls -a` and a maxdepth-2 yml/yaml find return only speedtest/docker-compose.yaml), `.git/hooks` contains no non-sample hook, and package.json has no husky/lint-staged entry. The only invocation of `npm run validate` anywhere in the tree is scripts/install-hardening-upgrade.sh:143, which runs from a staged package outside the live root and is not part of the normal deploy. customsh/siteupdate.sh — the actual deploy path — runs `npm run build` only (line 171 references its rc).

**Impact.** On the live production host, nothing forces lint, typecheck or the 133-test suite to run before code ships. Regressions are caught only if a developer remembers to type `npm run validate`, and the deploy script's build step will happily publish code whose tests fail.

**Fix.** At minimum add a `.git/hooks/pre-push` (or a `prepush` npm script documented in README) that runs `npm run lint && npm run typecheck && npm test`, and change customsh/siteupdate.sh's build step to `npm run validate` so the one automated path that reaches production exercises the gate that already exists.

> **worth-it review — upheld** (high confidence). Core facts confirmed. package.json:24 is verbatim `"validate": "npm run lint && npm run typecheck && npm test && npm run build"`. No .github/, no CI yml outside speedtest/docker-compose.yaml, .git/hooks holds only .sample files, package.json has no husky/lint-staged/prepare. The sole `npm run validate` call in executable code is scripts/install-hardening-upgrade.sh line 144 (not 143). customsh/siteupdate.sh:165,168 runs `npm run build`; line 171 prints its rc. The observation stands. Two corrections. (1) Impact overstates: next.config.js (65 lines) sets no `typescript.ignoreBuildErrors`, so the deploy's `next build` already typechecks the .ts/.tsx surface; only lint and tests are ungated, and eslint currently yields 0 errors/682 warnings, making the lint limb near-vacuous. (2) The primary fix is churn: a `.git/hooks/pre-push` is not version-controlled, ships in no air-gap bundle, and does not survive a reclone. Worse, siteupdate.sh:146 runs `npm run reinstall` before building, and TOOLCHAIN-PINS.md:18 documents that dependency drift already broke `npm run lint` outright — gating production deploy on lint turns upstream plugin churn into a deploy outage.
>
> *Correction:* Accurate as an observation, overstated as a risk. `npm run validate` (package.json:24) genuinely has no automated caller on the deploy path: no CI descriptor exists, .git/hooks contains only samples, there is no husky/lint-staged entry, and the only invocation is scripts/install-hardening-upgrade.sh:144 (the finding cites 143). But the impact claim that "nothing forces lint, typecheck" is wrong on typecheck: next.config.js sets no ignoreBuildErrors, so the deploy's `npm run build` (customsh/siteupdate.sh:165,168) already type-checks the .ts/.tsx surface. Only ESLint and the ~139-case test suite are ungated, and eslint currently reports 0 errors, so the lint limb would catch almost nothing. The recommended `.git/hooks/pre-push` is not worth the diff here: hooks are not version-controlled, do not travel in the air-gap bundle, and vanish on reclone — for a single maintainer that is documentation wearing a shell script. The only limb with real value is switching siteupdate.sh's build step to `npm run validate` (identical artifact, since validate ends in build), and even that carries a live trade-off, because siteupdate.sh:146 runs `npm run reinstall` beforehand and TOOLCHAIN-PINS.md:18 records that exact dependency drift breaking `npm run lint`, which would convert cosmetic upstream churn into a blocked production deploy on the live host. Treat as low: document `npm run validate` as the pre-deploy gate in README, and consider adding tests only (`npm test`) to siteupdate.sh rather than the full lint gate.

---

### 86. engines and packageManager demand npm >=12, the host runs npm 11.19.0

**Code quality · medium** · `package.json:60`

```
"engines": {
    "node": ">=24.18.0",
    "npm": ">=12.0.0"
```

**What it is.** package.json:7 pins `"packageManager": "npm@12.0.2"` and lines 58-61 require `npm >=12.0.0`. The installed toolchain on this production host is npm 11.19.0 (node v24.21.0, which does satisfy the node range). There is no .npmrc in the repo, so engine-strict is off and npm only emits EBADENGINE warnings today — but nothing in TOOLCHAIN-PINS.md, DEPLOY.md or deploy/enclave.env.example explains or acknowledges the gap, and DEPLOY.md:105 only checks `node -v # expect v24+`.

**Impact.** Any enclave that sets engine-strict, or any `npm ci` run under a corepack-managed shell that honours `packageManager`, fails to install against the very npm version the production box uses. The declared toolchain and the shipped toolchain disagree, which is precisely the drift TOOLCHAIN-PINS.md exists to prevent.

**Fix.** Decide which is authoritative and make the other match: either relax `engines.npm` to `>=11.19.0` and set `packageManager` to the installed version, or upgrade npm on the host and record the requirement in DEPLOY.md's prerequisite check alongside the `node -v` line.

> **worth-it review — upheld** (high confidence). Evidence confirmed verbatim. package.json:58-60 reads `"engines": {` / `"node": ">=24.18.0",` / `"npm": ">=12.0.0"`; package.json:7 is `"packageManager": "npm@12.0.2",`. Host: `npm -v` = 11.19.0, `node -v` = v24.21.0 (node range satisfied, npm range not). No .npmrc in repo, ~/.npmrc, /etc/npmrc or /usr/etc/npmrc; `npm config get engine-strict` = false. DEPLOY.md:105 is indeed only `node -v # expect v24+`. So the factual core stands and the one-line fix is cheap and worth it. But every claimed consequence is inert here: there is no package-lock.json at all (`git ls-files | grep lock` finds none; `npm run clean` deletes it), so `npm ci` cannot run; deploy/INSTALL.sh:16 says "Never runs npm install: node_modules ships inside the bundle" and INSTALL.sh:93 only gates on node major; corepack is installed (/usr/bin/corepack) but not enabled — /usr/bin/npm symlinks straight to ../lib/node_modules/npm/bin/npm-cli.js, not a shim, and nothing in the repo mentions corepack. TOOLCHAIN-PINS.md is about typescript/eslint majors breaking the build, not npm. Documentation/reproducibility hygiene, not medium-severity drift.
>
> *Correction:* package.json:7 pins `"packageManager": "npm@12.0.2"` and package.json:58-60 requires `"npm": ">=12.0.0"` while the only host that builds this site runs npm 11.19.0 (node v24.21.0 satisfies the node range). That is a real declared-vs-installed mismatch worth a one-line correction, but the reported impact does not apply: there is no package-lock.json in the repo at all, so `npm ci` is impossible; deploy/INSTALL.sh:16 states it never runs `npm install` because node_modules ships in the bundle, and INSTALL.sh:93 gates only on node major; corepack exists at /usr/bin/corepack but is not enabled (/usr/bin/npm is a direct symlink to ../lib/node_modules/npm/bin/npm-cli.js, and no repo file mentions corepack), so `packageManager` is never consulted; engine-strict is false with no .npmrc anywhere. It is also not the drift TOOLCHAIN-PINS.md addresses — that file is about typescript/eslint majors breaking `npm run build`. Severity low: fix the two fields (or the host) for accuracy, no operational risk today.

---

### 87. feedbackStorage and notificationOutbox skip the Array.isArray guard their sibling loaders have

**Code quality · medium** · `proxy/site-stats.mjs:325`

```
feedbackStorage = JSON.parse(readFileSync(FEEDBACK_FILE, 'utf8'))
```

**What it is.** chatHistoryStorage (345-346), customPages (423-424), contentAuditLog (431-432) and loadAuthEvents (1833) all check the parsed shape; feedbackStorage (325) and notificationOutbox (391) do not. Valid JSON of the wrong shape — e.g. `{}` or an older `{"alerts":[...]}` wrapper — therefore installs a non-array. feedbackStorage.find/.unshift/.slice at 3166/3196/3197 then throw inside the handler's try and return HTTP 400 for every event; queueNotification's notificationOutbox.unshift at 2401 throws into the same catch; and GET /api/site-stats returns the raw object as `alerts` (2777).

**Impact.** Feedback submission and system-event recording fail for every user with a generic 400 and only a console line, indefinitely, while the admin alert list renders empty — a silent full loss of the feedback channel that survives restarts because the bad file is never repaired.

**Fix.** Mirror the sibling loaders: `feedbackStorage = Array.isArray(parsed) ? parsed : []` and the same for notificationOutbox, plus the loud-on-wrong-shape handling from the finding above.

> **worth-it review — upheld** (high confidence). Every cited fact checks out. proxy/site-stats.mjs:325 is verbatim `feedbackStorage = JSON.parse(readFileSync(FEEDBACK_FILE, 'utf8'))` with a bare `catch`, and :391 is the same for notificationOutbox. The siblings do guard: :345-346 `if (Array.isArray(parsed)) chatHistoryStorage = parsed`, :423-424 customPages, :431-432 contentAuditLog, :1833 `return Array.isArray(parsed) ? parsed.slice(-AUTH_EVENTS_MAX) : []`. Downstream call sites are where claimed: `.find` at :3166, `.unshift`/`.slice` at :3196-3197 inside the try whose catch at :3202-3204 returns 400; `notificationOutbox.unshift` at :2401; `alerts: feedbackStorage` at :2777; a second `feedbackStorage.unshift` at :3244. So the inconsistency and the failure mechanism are real, and the fix is a two-line reuse of a pattern already in the same file — not churn.

What I could not confirm is the impact framing. Nothing in the repo writes a non-array: commitFeedbackToDisk (:2248) and commitNotificationOutboxToDisk (:2260) stringify arrays, and manage-feedback.sh only cp's the file. Corruption that truncates a write yields invalid JSON, which the existing catch already handles. Trigger is hand-editing only, so medium overstates it.
>
> *Correction:* The defect is real and the evidence is accurate: proxy/site-stats.mjs:325 and :391 parse feedback-history.json and notification-outbox.json without the `Array.isArray(parsed)` guard their four siblings use (:345, :423, :431, :1833), so valid non-array JSON installs a non-array and the later `.find`/`.unshift`/`.slice` at :3166, :3196-3197, :3244 and :2401 throw — the system-event handler's catch (:3202) then returns HTTP 400 for every event, and GET /api/site-stats hands the raw object back as `alerts` (:2777). The severity should be low, not medium. No code path can produce the bad shape: both files are only ever written by JSON.stringify of an array (:2248, :2260), manage-feedback.sh copies the file byte-for-byte, and a truncated write produces invalid JSON that the existing bare catch already absorbs. The trigger is an operator hand-editing a gitignored runtime file, and the finder's "older {alerts:[...]} wrapper" format has no basis in the repo. Worth fixing anyway because it is two lines mirroring an in-file convention, but it is a consistency cleanup rather than a live channel outage.

---

### 88. Durable admin state is written with plain writeFileSync while an atomic temp+rename helper already exists in the same file

**Code quality · medium** · `proxy/site-stats.mjs:437`

```
function commitContentOverridesToDisk() {
    writeFileSync(CONTENT_OVERRIDES_FILE, JSON.stringify(contentOverrides, null, 2), 'utf8')
  } catch (err) { console.error('[site-stats] Content overrides save failed:', err) }
```

**What it is.** writeSessionsFileAtomic() at line 738 does the correct thing — write to `${path}.tmp-${pid}-${Date.now()}`, chmod, renameSync — and its comment explains exactly why ("a process kill mid-write can't corrupt either file"). commitAuthEventsToDisk (line 1840) copies that pattern. The other fourteen commit functions do not: content overrides (437), chat history (351), custom pages (791), content audit log (882), infrastructure nodes (1058), feedback (2246), notification settings (2252), outbox (2258), acknowledged alerts (2264), dismissals (2270), announcement paths (2311), assistant knowledge (2341), assistant prompts (2377).

**Impact.** A pm2 restart, OOM kill, or power loss during any of those writes leaves a truncated JSON file. Every one of these loaders swallows the parse error and falls back to an empty default (e.g. line 415: `catch { contentOverrides = {} }`), so a truncated file silently discards every admin content edit rather than failing loudly.

**Fix.** Rename writeSessionsFileAtomic to a generic writeJsonFileAtomic(path, value, mode) and route all sixteen commit functions through it — one helper, fourteen call-site changes, and the corruption class disappears.

> **worth-it review — upheld** (high confidence). Could not refute. Anchor confirmed verbatim: proxy/site-stats.mjs:437-440 is `function commitContentOverridesToDisk()` with a bare `writeFileSync(CONTENT_OVERRIDES_FILE, ...)`. The atomic helper is real and at the claimed line: :738 `function writeSessionsFileAtomic(path, sessions)` with tmp path, `chmodSync`, `renameSync`, and the ":729 ...temp file + rename) so a process kill mid-write can't corrupt either file" comment. :1840 commitAuthEventsToDisk duplicates that pattern inline. grep confirms every other cited commit function uses plain writeFileSync at exactly the lines given (351, 791, 882, 1058, 2246, 2252, 2258, 2264, 2270, 2311, 2341, 2377), plus an unlisted plain write at :1030 (nodes seed) and :603 (published snapshot). Loaders do swallow parse errors and fall back to empty (e.g. :417-418 `} catch { contentOverrides = {} }`). The fix is reuse of an existing helper, not new abstraction — small mechanical diff, appropriate here. Nits only: the catch is at 417-418 not 415; the list enumerates 13 functions, called "fourteen"/"sixteen"; content overrides alone have a second copy via PUBLISHED_CONTENT_FILE (:602), so published content survives while drafts and the other stores do not.
>
> *Correction:* Accurate at every anchor; only counting/secondary details need correction. writeSessionsFileAtomic (proxy/site-stats.mjs:738) and the inline copy in commitAuthEventsToDisk (:1840) are the only atomic writers; thirteen enumerated commit functions plus the nodes seed write (:1030) and the published snapshot write (:602) use plain writeFileSync, so "fourteen"/"sixteen" should read "thirteen commit functions plus two other plain writes". The swallowing catch for content overrides is at :417-418, not :415. Impact is slightly narrower for content overrides specifically, since published content is also snapshotted to PUBLISHED_CONTENT_FILE at :602 (itself non-atomic) — a truncated content-overrides.json loses unpublished drafts rather than all edits; custom pages, assistant prompts/knowledge, feedback and the notification outbox have no second copy and would be lost outright. The recommendation stands: generalize the existing helper to writeJsonFileAtomic(path, value, mode) and route the plain writers through it.

---

### 89. Admin Publish button shells out to `npm run build`, which runs no tests and no lint

**Code quality · medium** · `proxy/site-stats.mjs:625`

```
const child = spawn('npm run build', { cwd: PROJECT_ROOT, env: process.env, shell: true })
```

**What it is.** The admin console's publish flow (site-stats.mjs:552 comment: "runs `npm run build` so the change becomes a permanent default") spawns `npm run build`, which package.json:10 defines as `validate:images && next build && build-search-index`. It does not run `npm run lint`, `npm run typecheck` or `npm test`. Next 16 no longer runs ESLint as part of `next build`, so the only checks a sysadmin-triggered production publish gets are the image-registry validator and the Next compile.

**Impact.** A sysadmin clicking Publish regenerates and replaces the live out/ tree with zero test coverage executed. Any regression the 133-test suite would catch (the a11y, admin-ACL, session-timeout and assistant-policy assertions in tests/ui-behavior.test.ts among them) ships straight to users.

**Fix.** Change the spawn to `npm run validate` (it ends in `npm run build`, so the artifact is identical) and surface the failing stage in the build status tail that is already collected at line 620, so a failed gate is visible in the admin UI instead of silently skipped.

> **worth-it review — upheld** (high confidence). Every cited fact checks out. proxy/site-stats.mjs:625 is verbatim `const child = spawn('npm run build', { cwd: PROJECT_ROOT, env: process.env, shell: true })`. package.json:10 defines build as `validate:images && next build && build-search-index`; package.json:24 defines `validate` as `lint && typecheck && test && build`, so swapping the spawned command yields an identical artifact. The test count is exactly 133 (grep of test( across tests/*.ts sums to 133). The impact is stronger than stated, not weaker: tests/card-overrides.test.ts:20 imports the very file Publish rewrites (lib/data/published-content.json at site-stats.mjs:603) and asserts at :100 "no orphans, no phantoms" and at :131 "every published override actually changes what renders" — failures a content publish can introduce and that `next build` cannot catch. My only correction is to the recommendation's second half: the tail is already surfaced (site-stats.mjs:620-639 collects it, AdminContentEditor.tsx:2304 renders `Build failed: ${buildStatus.message}`), so the lazy fix is the one-word spawn change — or `npm test && npm run build`, since lint/typecheck cannot be affected by a data-only publish.
>
> *Correction:* Finding confirmed as written, with one adjustment to the fix: the failing-stage output is already surfaced (tail collected at proxy/site-stats.mjs:620-639, shown by app/admin/AdminContentEditor.tsx:2304), so only the spawned command needs changing. The minimal change is `npm test && npm run build` (or `npm run validate`), since the publish flow rewrites lib/data/published-content.json, which tests/card-overrides.test.ts:100 and :131 assert against, while lint/typecheck cover code the publish never touches.

---

### 90. pruneExpiredSessions() runs a full two-array filter, and can trigger a synchronous file write, on the site-wide auth_request hot path

**Code quality · medium** · `proxy/site-stats.mjs:1779`

```
function findSessionByCookie(req) {
  pruneExpiredSessions()
  const cookies = parseCookies(req)
```

**What it is.** findSessionByCookie is what GET /internal/authcheck calls (line 2833), and that endpoint's own comment says it "must stay as cheap as possible" because nginx auth_request hits it on almost every request site-wide. Yet its first statement rebuilds both session arrays with .filter(), and pruneExpiredSessions (line 780) calls commitAdminSessionsToDisk / commitGeneralSessionsToDisk — a blocking JSON.stringify + writeFileSync + chmodSync + renameSync — whenever any session has expired. The file already has the right mechanism: sessionFlushTimer at line 773 runs every LAST_SEEN_FLUSH_INTERVAL_MS for exactly this kind of deferred work.

**Impact.** With the ~3,000 users the session-store comment anticipates, every page load does two array rebuilds, and the unlucky request that happens to cross an expiry boundary blocks the event loop for two synchronous session-file writes. The cost is paid on the one path where the code explicitly promised it would not be.

**Fix.** Move the pruneExpiredSessions() call into the existing sessionFlushTimer interval and out of findSessionByCookie; the per-request lookup already re-checks `expiresAt > Date.now()` on the matched session (lines 1789, 1796), so correctness does not depend on pruning first.

> **worth-it review — upheld** (high confidence). Every cited fact checks out. proxy/site-stats.mjs:1778-1779 is exactly `function findSessionByCookie(req) {` / `  pruneExpiredSessions()`. Line 2832 `const session = findSessionByCookie(req)` sits inside the `/internal/authcheck` handler whose comment (2821-2823) says it "must stay as cheap as possible" because nginx auth_request hits it site-wide — confirmed by nginx/server.conf:195 `auth_request /internal/authcheck;` at server level with only explicit `auth_request off;` opt-outs. pruneExpiredSessions (780-789) does two unconditional `.filter()` rebuilds and calls commitAdminSessionsToDisk/commitGeneralSessionsToDisk, which route to writeSessionsFileAtomic (738-754): writeFileSync + chmodSync + renameSync, all synchronous. sessionFlushTimer (774-778) already exists for deferred work at 60s. The recommendation is correct: the per-request path re-checks `expiresAt > Date.now()` at 1789 and 1796, and an expired-but-unpruned admin hit falls through to the general lookup and returns null, so removing the prune cannot admit an expired session. It's a two-line diff reusing an existing mechanism — not churn. Two small overstatements in the impact, corrected below.
>
> *Correction:* Accurate as to location, mechanism and fix; the impact is overstated on two points. (1) The synchronous write is not "two writes on the unlucky request" — each store commits independently (lines 784, 788), so a crossing request normally triggers one write, and only once per expiry event, not per request, since the expired records are gone afterward. (2) The steady-state per-request cost is just two `.filter()` allocations over arrays bounded by live sessions (~3,000 worst case per the comment at line 724) — tens of microseconds, not a measurable page-load cost. The real defect is narrower: a documented "cheapest possible" endpoint performs unbounded synchronous disk I/O it doesn't need, when sessionFlushTimer (line 774) already exists for exactly that. Worth the two-line fix; severity is low rather than medium.

---

### 91. Three independent readJsonBody implementations across proxy/, plus five inline body readers

**Code quality · medium** · `proxy/site-stats.mjs:2083`

```
function readJsonBody(req, max = MAX_CONTENT_BODY_BYTES) {
  return new Promise((resolveBody, rejectBody) => {
    let body = ''
```

**What it is.** site-stats.mjs defines readJsonBody at line 2083 (string accumulation, resolves raw text, caller parses). cert-request.mjs defines its own readJsonBody at line 87 (Buffer chunks, parses internally, rejects with a .status property). voltron-proxy.mjs defines readRequestBody at line 302 (Buffer chunks, raw text, throws HttpError). On top of those, five handlers in site-stats.mjs skip all three and inline `body += c.toString()` at lines 3142, 3228, 3271, 3600 and 4618 — three of them with no size cap at all. Limits differ per copy: 512,000 / 64,000 / 16 MiB / 8,000 / unbounded.

**Impact.** The body-size limit, the error shape, and the malformed-JSON behavior are all different depending on which endpoint you hit, and a fix to one (say, adding a read timeout for slowloris) reaches only a third of the surface.

**Fix.** Promote one implementation into a shared proxy/http-body.mjs — the cert-request version is the most complete, since it already carries a status code on its rejections — and have all three files import it with a per-call max. Then delete the five inline readers.

> **worth-it review — upheld** (high confidence). Verified each citation. site-stats.mjs:2083 evidence quoted verbatim, correct. cert-request.mjs:87 and voltron-proxy.mjs:303 (finder said 302, off by one) confirmed, as are limits 512_000 (site-stats.mjs:141), 64_000, 16 MiB (voltron-proxy.mjs:13), 8000 (site-stats.mjs:3143). Inline readers confirmed at 3142, 3228, 3271, 3600. The fifth, site-stats.mjs:4618, is not a body reader: it is the speedtest upload drain (`let bytes = 0; req.on('data', (chunk) => { bytes += chunk.length })`) that must accept unbounded uploads to measure throughput — including it is wrong. Core claim stands, so not refuted, but two things reduce it: the recommendation is churn (cert-request's variant parses internally, so adopting it means touching ~25 `JSON.parse(await readJsonBody(req))` call sites in site-stats.mjs for zero behavior change; the air-gap bundle excludes by name at scripts/make-airgap-bundle.sh:78-86 so a new file ships fine, but buys nothing), and the actionable part is the three uncapped readers, a three-line in-file fix.
>
> *Correction:* The three-implementations core is verified: proxy/site-stats.mjs:2083 `function readJsonBody(req, max = MAX_CONTENT_BODY_BYTES)` (512_000 at :141, resolves raw text), proxy/cert-request.mjs:87 `async function readJsonBody(req, maxBytes = 64_000)` (parses, rejects with .status), proxy/voltron-proxy.mjs:303 (not 302) `function readRequestBody(req)` with MAX_BODY_BYTES = 16 MiB at :13. But it is four inline readers, not five: site-stats.mjs:4618 is the /api/speedtest/empty upload drain (`req.on('data', (chunk) => { bytes += chunk.length })`) which discards bytes by design and must stay uncapped for upload measurement — routing it through a shared reader would break the speedtest. The real defect hiding inside this dedup framing is narrower and worth fixing on its own: site-stats.mjs:3228, :3271 and :3600 accumulate request bodies into a string with no cap at all on POST /api/feedback, /api/acknowledged-alerts and /api/notification-settings. The lazy fix is three one-line swaps to the readJsonBody already in that same file, not a new proxy/http-body.mjs. Adopting cert-request's parsing variant would force edits at ~25 `JSON.parse(await readJsonBody(req))` call sites (3323–4564) for no behavior change — churn.

---

### 92. Sixteen byte-identical commit*ToDisk() functions differing only in path and variable

**Code quality · medium** · `proxy/site-stats.mjs:2246`

```
function commitFeedbackToDisk() {
  try {
    writeFileSync(FEEDBACK_FILE, JSON.stringify(feedbackStorage, null, 2), 'utf8')
```

**What it is.** The same five-line try/writeFileSync/catch-console.error body is repeated at lines 351, 437, 762, 767, 791, 882, 1058, 1840, 2246, 2252, 2258, 2264, 2270, 2311, 2341 and 2377. The only variation is the file constant, the variable serialized, and the wording of the error string. The matching load side repeats an equally identical try/JSON.parse(readFileSync)/catch-default block at lines 324, 335, 371, 388, 396, 404, 414, 421, 428, 731, 1831, 2281, 2332 and 2360.

**Impact.** Roughly 160 lines of pure boilerplate in an already 4,746-line file, and it is the reason the atomic-write fix above was applied to two of sixteen writers instead of all of them: a behavior change has to be made in sixteen places, so in practice it is made in one or two.

**Fix.** One pair of helpers — `loadJson(path, fallback)` and `saveJson(path, value, mode)` — replaces all thirty-odd blocks. Every commit function then becomes a one-line call, and durability, file mode, and error logging are fixed once for everything.

> **worth-it review — upheld** (high confidence). Evidence at proxy/site-stats.mjs:2246-2250 matches verbatim, and the pattern is real. But the specifics are wrong. Of the 16 cited writers, only 13 are the boilerplate: 762 and 767 are already one-liners routing through the shared helper `writeSessionsFileAtomic` (738), and 1840 is the atomic auth-events writer, not boilerplate. On the load side, 335 and 371 point at a const block and `defaultNotificationSettings`, not loads (the real loads are 339 and 381); 731 is the shared `loadSessionsFile` helper and 1831 is a distinct slicing loader — so 11, not 14. "Byte-identical" is contradicted by the finding's own text. The causal impact claim is refuted by the comment at 740-746: 0600+atomic is scoped to "live session ids and CSRF tokens... the session id IS the cookie", a deliberate security decision, not a copy-paste oversight. The loaders also differ (normalizeDismissals at 407, Array.isArray guards at 415/422) so one `loadJson(path, fallback)` would not cover them. Net saving is ~60-80 lines of 4,746, across 24 call sites, in a live pm2 backend with no test suite.
>
> *Correction:* Thirteen (not sixteen) near-identical `commit*ToDisk()` functions repeat a five-line try/writeFileSync/catch-console.error body at proxy/site-stats.mjs lines 351, 437, 791, 882, 1058, 2246, 2252, 2258, 2264, 2270, 2311, 2341 and 2377; they are not byte-identical (file constant, serialized value and error wording all differ). Eleven load-side blocks (339, 381, 388, 396, 404, 414, 421, 428, 2281, 2332, 2360) repeat a try/JSON.parse(readFileSync)/catch-default shape, but with varying validation — some bare, some Array.isArray-guarded, some passing through normalizeDismissals/normalizeNotificationSettings — so a single `loadJson(path, fallback)` would not subsume them without a validator parameter. Three of the originally cited sites are already handled: commitAdminSessionsToDisk (762) and commitGeneralSessionsToDisk (767) are one-line calls to the existing shared `writeSessionsFileAtomic` (738), and loadSessionsFile (731) is the matching shared loader. The claimed causal link — that the duplication is why atomic 0600 writes reached only two writers — is contradicted by the comment at 740-746, which scopes 0600 to files holding live session ids and CSRF tokens; the remaining files are non-secret admin content JSON, so the mode difference is deliberate, not an oversight. Net saving from a helper pair is roughly 60-80 lines out of 4,746, against touching 24 call sites in a production pm2 backend with no test suite: worth folding into the next edit that touches these functions, not worth a standalone refactor.

---

### 93. The notification outbox is queued and persisted but nothing ever sends or drains it

**Code quality · medium** · `proxy/site-stats.mjs:2401`

```
notificationOutbox.unshift({
    id: `notice-${Date.now()}`,
    status: 'queued',
```

**What it is.** queueNotification() builds a message record, caps the array at 100, and writes notification-outbox.json. A repo-wide grep for smtp/sendmail/nodemailer/notificationOutbox finds no consumer anywhere — the only other references are the loader (line 389), the writer (line 2258) and a count exposed to the admin UI. Meanwhile GET /api/notification-settings reports `deliveryConfigured: Boolean(notificationSettings.enabled && notificationSettings.emailAddress)` at line 3257, which is true whenever an address is merely configured.

**Impact.** Admins who set a notification address are told delivery is configured and see a queued count that never decreases, while no alert email is ever sent. This is a silent monitoring gap dressed up as a working feature, plus ~40 lines of dead machinery and a state file that must be excluded from the air-gap bundle (scripts/make-airgap-bundle.sh:86).

**Fix.** Pick one: delete queueNotification, the outbox variable, its file, its commit function and the queuedNotifications field; or wire an actual sender. Until a sender exists, `deliveryConfigured` must report false so the UI stops claiming delivery works.

> **worth-it review — upheld** (high confidence). Every cited fact checks out verbatim. proxy/site-stats.mjs:2398-2411 is queueNotification (unshift at 2401, `slice(0, 100)` at 2410, commit at 2411); loader at 389-394; commitNotificationOutboxToDisk at 2258-2262; `deliveryConfigured: Boolean(...)` and `queuedNotifications: notificationOutbox.length` at 3257-3258. A repo-wide grep (excluding node_modules) for notificationOutbox returns only those five sites plus the two callers (3198, 3245); no smtp/nodemailer/sendmail anywhere, and .env.example defines no mail keys, so nothing drains the outbox — dead machinery confirmed, and scripts/make-airgap-bundle.sh:86 does exclude the file. One inaccuracy: "a count exposed to the admin UI" / "admins ... see a queued count" is wrong — grep over app/, components/, lib/ finds no reference to deliveryConfigured or queuedNotifications; AdminDashboard.tsx:557 only merges settings. The misleading signal reaching admins is instead AdminDashboard.tsx:769 (`'Email Enabled'`) and :142 ("Send alerts and feedback notices to"). So the recommendation's last clause (make deliveryConfigured false) fixes a field no client reads.
>
> *Correction:* The core claim holds: queueNotification (proxy/site-stats.mjs:2398-2411) records messages into notificationOutbox and persists them via commitNotificationOutboxToDisk (2258-2262), the array is loaded at 389-394, and no sender exists anywhere in the repo — the only consumers are the two callers (3198, 3245) and the response fields at 3257-3258. Correction to the impact: the admin UI does not read deliveryConfigured or queuedNotifications (no occurrence in app/, components/ or lib/), so admins never see a stuck queue count; what misleads them is app/admin/AdminDashboard.tsx:769 ("Email Enabled" hint) and :142 ("Send alerts and feedback notices to"), which present a working email route. The fix therefore belongs in the panel's copy — label it "queued locally, no mailer configured" — plus deleting the unread deliveryConfigured/queuedNotifications fields; changing deliveryConfigured to false alone changes nothing a user sees. Whether to also delete the outbox is a judgment call: it is ~40 lines and one gitignored state file, and it is the only durable record that an alert would have been mailed, so a one-line honest label is the smaller and better diff than either deletion or wiring SMTP into an air-gapped enclave.

---

### 94. Four separate same-origin implementations, two of which disagree about the no-header case

**Code quality · medium** · `proxy/site-stats.mjs:3126`

```
function originMatchesHost(value) {
      if (!value || !host) return false
    const sameOrigin = (origin ? originMatchesHost(origin) : false) || originMatchesHost(referer)
```

**What it is.** isSameOriginRequest() at line 2431 is the intended shared helper and is used by /api/auth/* and /api/chat-history. But a nested `function originMatchesHost` is re-declared inside the /api/system-event handler (line 3126) and again inside the /api/site-feedback handler (line 3217) — and voltron-proxy.mjs declares a third copy inside its request callback at line 646. The semantics differ: isSameOriginRequest returns TRUE when neither Origin nor Referer is present (line 2439: "Non-browser callers ... Allow those"), whereas the three inline copies return FALSE for that case.

**Impact.** Two different answers to the same security question in one process. curl and internal scripts pass /api/auth/* but are rejected by /api/system-event and /api/site-feedback, and nobody reading one handler can tell which rule applies without finding all four. The nested function declarations are also re-created on every single request.

**Fix.** Delete the three inline copies and call isSameOriginRequest(req) everywhere; if the strict no-header-means-cross-origin behavior is wanted for public POST routes, express it as a parameter on that one function (`isSameOriginRequest(req, { requireHeader: true })`) so the difference is visible and deliberate.

> **worth-it review — upheld** (high confidence). Every cited location verifies. proxy/site-stats.mjs:2431 defines isSameOriginRequest with "if (!origin && !referer) return true" at :2439; callers at :2453 (adminCors), :2883 (/api/auth/*), :3043 (/api/chat-history). Inline "function originMatchesHost(value)" with "if (!value || !host) return false" really is re-declared at :3126 (/api/system-event), :3217 (/api/site-feedback) and proxy/voltron-proxy.mjs:647. Duplication and the semantic split are real. The framing is wrong, though: the split is deliberate and commented at all four sites. :2436-2438 allows header-less callers because a credential check still applies (admin token / session cookie); :3117-3121, :3212-3213 and voltron-proxy.mjs:640-642 each state these are unauthenticated public POSTs where the Origin/Referer header IS the only guard. So it is not two answers to one question, and a reader gets the rule from the comment beside the code. Nothing is insecure and no behavior is wrong; the per-request function-declaration remark is noise. Folding :3126 and :3217 into one flagged helper is a fine ~10-line deletion; pulling voltron-proxy.mjs (separate pm2 process, currently only node: imports) into a shared module is churn.
>
> *Correction:* The duplication is real but benign and deliberate. site-stats.mjs re-declares a 5-line originMatchesHost inside two handlers (:3126, :3217) that the shared isSameOriginRequest (:2431) could cover, and voltron-proxy.mjs:647 has a third copy in a separate process. The two rules differ only on the no-header case, and that difference is intentional and documented at each site: :2436-2438 allows header-less callers for routes that still require an admin token or session cookie, while :3117-3121, :3212-3213 and voltron-proxy.mjs:640-642 reject them because those POST routes are unauthenticated and the Origin/Referer header is the only guard. There is no security defect and no wrong behavior. Worthwhile cleanup is limited to site-stats.mjs: give isSameOriginRequest a requireHeader option and delete the two inline copies (~10 lines). Leave voltron-proxy.mjs alone — it is a separate pm2 process with no local imports today, and a shared module just to remove five lines is not worth it in an air-gapped, single-maintainer bundle. Low severity, quality only.

---

### 95. The admin-authorization 401 prologue is copy-pasted 37 times inside the request handler

**Code quality · medium** · `proxy/site-stats.mjs:3703`

```
if (!authorizeAdmin(req)) {
      res.writeHead(401, { ...adminCors(req), 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Unauthorized' }))
```

**What it is.** This exact four-line block appears 37 times (grep -c on `if (!authorizeAdmin(req))` and on the Unauthorized string both return 37). `adminCors(req)` is spread into headers 134 times. The single 4,746-line createServer callback is one long if-chain of URL string comparisons with no routing table, so adding an endpoint means remembering to paste the prologue — which is precisely how the two unauthenticated POST routes noted separately came to exist.

**Impact.** Authorization is enforced by convention rather than structure. A missed paste is an open endpoint, and nothing in the code or tests catches it. The if-chain also means later routes are evaluated only after dozens of failed string comparisons per request.

**Fix.** Introduce `function requireAdmin(req, res)` that performs the check and writes the 401, returning a boolean — each site becomes `if (!requireAdmin(req, res)) return`. Better still, move to a `routes` map keyed by `${method} ${path}` with an `admin: true` flag, so the gate is declared per route instead of pasted.

> **worth-it review — upheld** (high confidence). The duplication is real and correctly located. proxy/site-stats.mjs:3703 matches the quoted evidence verbatim; `grep -c` confirms 37 `if (!authorizeAdmin(req))`, 37 `error: 'Unauthorized'`, 134 `adminCors(req)`.

But three supporting claims fail:

1. "single 4,746-line createServer callback" — `createServer` opens at line 2786 and the file ends at 4746, so the callback is ~1,960 lines. 4,746 is the file length.

2. "precisely how the two unauthenticated POST routes came to exist" — unsupported. Grep of `url === '/api/admin` returns exactly 37 hits, each immediately followed by the gate: 37/37, zero misses. The ungated POSTs are /api/acknowledged-alerts (3269) and /api/notification-settings (3598), which use the plain `CORS` object, not `adminCors`, and sit outside nginx's `location ^~ /api/admin/` block (nginx/server.conf:448). Never a missed paste.

3. "nothing in the code or tests catches it" — three tests assert the gate textually per route: tests/file-library.test.ts:38, tests/route-images.test.ts:162, tests/ldap-domain.test.ts:250. A rename to `requireAdmin` breaks all three.

The `routes` map half is a rewrite of a ~1,960-line live handler for one maintainer: churn.
>
> *Correction:* The literal duplication is confirmed: the four-line 401 prologue appears 37 times in proxy/site-stats.mjs (first verified instance at 3703), and adminCors(req) is spread 134 times. However, this is cosmetic, not a security gap. Every one of the 37 `/api/admin/*` route comparisons is immediately followed by the gate — 37 matches, 37 checks, no misses — so the "a missed paste is an open endpoint" risk has zero instances in the actual admin surface. The two unauthenticated POST routes reported elsewhere (/api/acknowledged-alerts:3269, /api/notification-settings:3598) are not missed pastes: they belong to the public /api/ family, use the plain CORS object rather than adminCors, and are not behind nginx's `location ^~ /api/admin/` block (nginx/server.conf:448). The handler is also ~1,960 lines (2786–4746), not 4,746. Three tests already assert the gate textually per route (tests/file-library.test.ts:38, tests/route-images.test.ts:162, tests/ldap-domain.test.ts:250), and a `requireAdmin` helper would break all three unless the substring `authorizeAdmin(req)` is preserved. A mechanical helper collapsing 37 blocks to one-liners saves ~110 lines and is defensible if the tests are updated together; the proposed `routes` map is a rewrite of a live production handler for a single maintainer and is not worth the diff.

---

### 96. site-stats.mjs binds a port at import, so 4,746 lines have no behavioral tests — the suite asserts on the file's source text instead

**Code quality · medium** · `proxy/site-stats.mjs:4746`

```
server.listen(PORT, HOST, () => console.log(`[site-stats] API Online at http://${HOST}:${PORT}`))
```

**What it is.** Because the module listens as a side effect of import, nothing can import it. tests/ui-behavior.test.ts, tests/file-library.test.ts, tests/ldap-domain.test.ts and tests/route-images.test.ts therefore do `fs.readFileSync(path.join('proxy','site-stats.mjs'),'utf8')` and assert regexes against the source — e.g. tests/ui-behavior.test.ts:939-941 checks `assert.match(proxy, /url === '\/api\/admin\/file-rename'/)`. `export function isSitePagePath` at line 2507 is exported for testability but no test can reach it. The project already knows the fix: proxy/selfheal-log.mjs's header says it was "Split out of site-stats.mjs (which binds a port on import) so the parser can be unit-tested without side effects", and site-stats-probe.mjs exists for the same reason.

**Impact.** The security-critical pure functions — sanitizeNode/validateNodeTarget (SSRF guard), sanitizeDownloadHref and sanitizeInternalPath (javascript:/protocol-relative rejection), sanitizeRouteImageRegistry, escapeLdapFilter, authorizeAdmin's CSRF logic — have zero executable coverage. A source-text regex passes just as happily against a function that has been broken as one that works.

**Fix.** Follow the precedent the codebase set twice: move the pure validators into proxy/site-stats-validate.mjs, import them back into site-stats.mjs, and test them for real. Guard the listen with `if (import.meta.url === pathToFileURL(process.argv[1]).href)` so the rest becomes importable too.

> **worth-it review — upheld** (high confidence). Every cited fact verified. proxy/site-stats.mjs is exactly 4746 lines and line 4746 is verbatim `server.listen(PORT, HOST, () => console.log(...))`. `export function isSitePagePath` is at line 2507 and its only caller is line 2531 in the same file — no test imports it. `grep -rn "site-stats.mjs" tests/` returns only readFileSync/regex assertions (ui-behavior.test.ts:350,496,939,1203; file-library.test.ts:33; ldap-domain.test.ts:220,237; route-images.test.ts:144). ui-behavior.test.ts:939-940 matches the quoted evidence. The named validators are real and in-file: validateNodeTarget:1091, sanitizeNode:1124, sanitizeRouteImageRegistry:1621, sanitizeInternalPath:1686, sanitizeDownloadHref:1707, escapeLdapFilter:2024, authorizeAdmin:2046 — none imported by any test. Precedent confirmed: selfheal-log.mjs:14 "Split out of site-stats.mjs (which binds a port on import)…" and site-stats-probe.mjs:4 says the same. Recommendation is proportionate (extract ~6 pure functions, ~150 lines, no new deps) and matches an established repo convention rather than inventing one.
>
> *Correction:* The finding is accurate; only the second half of its recommendation is wrong. A `import.meta.url === pathToFileURL(process.argv[1]).href` guard around `server.listen` would NOT make the module importable: proxy/site-stats.mjs:1602 has a top-level `setInterval(() => { probeAllNodes()... }, NODE_POLL_INTERVAL_MS)` with no `.unref()` (the file has exactly one unref, at line 778 for sessionFlushTimer). Importing the module would start a live node-probe sweep that sends network requests and keeps the test process alive. So the extraction to proxy/site-stats-validate.mjs is the only part worth doing — and it is the right fix, since it is what selfheal-log.mjs:14 and site-stats-probe.mjs:4 already did for the same reason. Drop the listen-guard suggestion.

---

### 97. install-hardening-upgrade.sh syncs 4 of the 6 nginx includes, then runs nginx -t

**Code quality · medium** · `scripts/install-hardening-upgrade.sh:160`

```
for relative in server.conf security-headers.inc admin-acl.inc blocked-hosts.inc; do
    cp -a -- "$PROJECT_ROOT/nginx/$relative" "$LIVE_NGINX_DIR/$relative"
  done
```

**What it is.** Four places carry a hardcoded copy list for the nginx includes. customsh/siteupdate.sh:368-373, deploy/INSTALL.sh:326 and the DEPLOY.md:116 / MIGRATION.md:51-52 snippets all name the same six files (server.conf, security-headers.inc, admin-acl.inc, blocked-hosts.inc, proxy-headers.inc, login-redirect.inc). scripts/install-hardening-upgrade.sh names only four, at lines 130 (rollback restore), 150 (backup) and 160 (install), and then runs `nginx -t` at line 163. server.conf includes proxy-headers.inc at 20 separate locations (lines 210, 282, 291, …) and login-redirect.inc at four (253, 263, 666, 748). deploy/INSTALL.sh:327-328 guards this with an explicit `die "bundle is missing nginx/$inc — server.conf includes it and nginx -t would fail."`; the hardening script has no such guard and its own comment at line 158 justifies the short list as covering only the blocked-hosts include chain.

**Impact.** Run against a conf dir that does not already hold proxy-headers.inc/login-redirect.inc (a fresh target, or one where server.conf gains a new include), the script installs a server.conf referencing files it never copied and `nginx -t` fails after the live server.conf has been overwritten. Its rollback loop at line 130 also restores only four files, so any include added later is outside both the install and the undo path — the same class of failure the memory note records for siteupdate.sh's allowlist.

**Fix.** Replace the three hardcoded arrays with one shared list — ideally derived from `ls nginx/*.inc nginx/server.conf` or sourced from a single `nginx/DEPLOY-FILES` manifest that siteupdate.sh, deploy/INSTALL.sh and the two markdown snippets all read, so adding an include cannot be forgotten in three of five places.

> **worth-it review — upheld** (high confidence). Evidence verified verbatim. scripts/install-hardening-upgrade.sh:130, :150, :160 each hold `for relative in server.conf security-headers.inc admin-acl.inc blocked-hosts.inc; do`, the comment at :159 justifies the list via blocked-hosts only, and `nginx -t` runs at :163. nginx/server.conf includes proxy-headers.inc 21 times (210, 282, 291, …) and login-redirect.inc at 253, 263, 666, 748; neither is in the copy list. The six-file lists exist at customsh/siteupdate.sh:368-373, deploy/INSTALL.sh:326, DEPLOY.md:116, MIGRATION.md:51-52. INSTALL.sh's die guard is at :329, not :327-328 (immaterial). scripts/rollback-hardening-upgrade.sh:39 is worse still — two files, then `nginx -t`. So the defect is real. Two things temper it: the script is a one-shot staged-package installer (INTEGRATION-MANIFEST.md:17-22, refuses to run from the live root, rewrites ~25 app source files from a stale package), not on the deploy path, and the live dir already holds all six. And the recommended shared DEPLOY-FILES manifest is churn — markdown can't read it, siteupdate.sh lives in another repo, INSTALL.sh already dies loudly.
>
> *Correction:* Facts are accurate: install-hardening-upgrade.sh copies only 4 of the 6 nginx files at lines 130/150/160 and then runs nginx -t at 163, while server.conf includes the two omitted files 25 times; rollback-hardening-upgrade.sh:39 copies just 2. But this is a one-shot staged-package upgrade installer (INTEGRATION-MANIFEST.md:17-22), not the deploy path — re-running it today would clobber ~25 app source files from a stale package, which dwarfs the include gap — so low, not medium. The fix is adding `proxy-headers.inc login-redirect.inc` to those three arrays (and the rollback array), not a shared nginx/DEPLOY-FILES manifest: two of the five consumers are markdown snippets that cannot read a file, siteupdate.sh lives in a separate directory outside this repo, and INSTALL.sh already has an explicit die guard at line 329. Deleting the two spent hardening scripts is an equally valid resolution.

---

### 98. tests/ui-behavior.test.ts asserts on component source text, not behaviour — 363 regex assertions over 94 file reads

**Code quality · medium** · `tests/ui-behavior.test.ts:295`

```
assert.match(assistantSource, /const handleResize = \(\) => syncPosition\(true\)/)
  assert.match(assistantSource, /window\.addEventListener\('resize', handleResize\)/)
  assert.doesNotMatch(assistantSource, /window\.addEventListener\('resize', syncPosition\)/)
```

**What it is.** The file makes 94 `readFileSync` calls and 363 `assert.match`/`assert.doesNotMatch` assertions against raw .tsx source. It pins exact identifier names, exact Tailwind class strings (line 218: `/-mr-14|-ml-14|right-full|left-full/`) and exact JSX attribute spellings (line 234). lib/data/admin-health.ts:29-32 documents that these negative assertions are deliberately used to forbid an implementation from appearing in a given file. By contrast tests/admin-health.test.ts (zero readFileSync) and tests/card-overrides.test.ts import the real functions and assert on results — that is the pattern that works.

**Impact.** Renaming a local variable or reformatting a className fails the suite while the UI is fine; conversely a component can be runtime-broken with every regex still matching. The suite therefore blocks the refactors recommended elsewhere in this review rather than protecting them.

**Fix.** Keep the source-text checks only where the claim genuinely is 'this token must not appear' and move them into a small, separately-named `tests/source-guards.test.ts` so they are recognisable as lint rules, not tests. Convert the rest to the admin-health.test.ts style: export the pure helpers (resolveActivityChartData already is) and assert on their return values.

> **worth-it review — upheld** (high confidence). Evidence verifies exactly. `wc -l` = 1434, `grep -c readFileSync` = 94, `grep -cE "assert\.(match|doesNotMatch)"` = 363. tests/ui-behavior.test.ts:295 is verbatim the quoted `const handleResize = \(\) => syncPosition\(true\)` regex; :218 is the `-mr-14|-ml-14|right-full|left-full` doesNotMatch; :239 pins `className="block min-w-0 overflow-hidden leading-none"`. lib/data/admin-health.ts:29-32 confirms the real cost verbatim: "tests/ui-behavior.test.ts has negative assertions forbidding `filterAcknowledgedAlerts` from appearing in that file, so the obvious implementation fails the suite". The brittleness is real and has already displaced production code.

But the title ("not behaviour") and the "admin-health.test.ts is the pattern that works" contrast are wrong. tests/ui-behavior.test.ts:9 defines `importComponentModule`, used at 19 sites (18, 50, 79, 345, 712, 979, 1037, 1238...) plus `renderToStaticMarkup` at :1321. The maintainer already converts to real-module assertions wherever possible. Line 234 is an inline style, not a JSX attribute.

package.json devDeps show no jsdom/RTL/vitest, and none can be added (root-owned node_modules), so "convert the rest" is infeasible; renaming the file to source-guards.test.ts moves 363 regexes without changing one.
>
> *Correction:* tests/ui-behavior.test.ts really does carry 94 readFileSync calls and 363 source-text regex assertions that pin local identifier names (:295), Tailwind class strings (:218) and exact className spellings (:239), and that brittleness has a documented production cost — lib/data/admin-health.ts:29-32 says the helper was placed outside AdminDashboard.tsx specifically because a doesNotMatch forbids it there. That much is accurate. The finding's framing and fix are not. The file is a hybrid, not a source-text suite: tests/ui-behavior.test.ts:9 defines an `importComponentModule` transpiling helper used at 19 sites, and :1321 renders a component with react-dom/server, so the "assert on real return values" pattern the finding recommends is already applied wherever a helper is extractable. Converting the remainder would need a DOM test runner; package.json devDependencies contain no jsdom, RTL, vitest or jest, and node_modules is root-owned so none can be installed. The other half of the recommendation — moving the negative assertions into a file named source-guards.test.ts — is a rename that leaves all 363 regexes and their coupling intact. Worth knowing as a constraint on future refactors of components/ui/APEN-chat-assistant.tsx and app/admin/*, not worth a diff; treat as info/low.

---

### 99. Admin console exports full chat transcripts (username + verbatim message text) to CSV/Markdown/PDF on the operator's workstation

**Security · medium** · `app/admin/AdminChatTranscriptsPanel.tsx:30`

```
const EXPORT_COLUMNS: ExportColumn<ChatTranscript>[] = [
  { label: 'Username', value: (t) => t.username },
...
  { label: 'Transcript', value: (t) => transcriptText(t) },
```

**What it is.** transcriptText (line 26-28) flattens every message of a transcript into one string, and the column set pairs it with the AD username and realm. lib/admin/export.ts then writes it to disk: exportToCsv (:26-30) and exportToMarkdown (:32-38) call downloadFile, exportToPdf (:40-53) opens a printable HTML report. The output carries no classification/CUI marking, no handling caveat, and no header identifying it as Privacy Act material; nothing in site-stats.mjs records that an export happened (appendAuditEntry, proxy/site-stats.mjs:921, is not invoked on the /api/admin/chat-history read at :3565).

**Impact.** Personal data that the server keeps at mode 0600 in a gitignored, bundle-stripped file leaves that protection as an unmarked CSV/PDF on an admin workstation, where it can be mailed, copied to removable media, or left in a Downloads folder. No record exists of who exported what or when.

**Fix.** Stamp every export with a CUI/Privacy-Act handling banner and the exporter's identity, record an audit entry server-side when /api/admin/chat-history is read, and consider omitting the verbatim Transcript column from bulk exports (export metadata by default, full text only per-record on explicit confirmation).

> **exploitability review — upheld** (high confidence). Evidence confirmed verbatim: app/admin/AdminChatTranscriptsPanel.tsx:26-36 defines transcriptText and EXPORT_COLUMNS including `{ label: 'Username', value: (t) => t.username }` and `{ label: 'Transcript', value: (t) => transcriptText(t) }`; it is wired at :86 via ExportBar, whose buttons call exportToMarkdown/exportToCsv/exportToPdf (components/admin/ExportBar.tsx:29-38), implemented at lib/admin/export.ts:26, :32, :40 with downloadFile/openPrintableReport. No banner or exporter identity in the PDF shell (export.ts:44-52). The audit claim also holds: proxy/site-stats.mjs:3565-3574 returns chatHistoryStorage with no appendAuditEntry call. Exploitability lens refutes the severity, not the facts: reaching it requires an allowlisted workstation IP (nginx/server.conf:250-251, :448-449 -> admin-acl.inc, which includes blocked-hosts.inc at :20) plus an admin-kind session (site-stats.mjs:2049, 2065). No attacker path exists; the actor is an authorized insider. One premise is wrong: chat-history.json is NOT 0600 (site-stats.mjs:353 has no mode, contrast :747-748, :1843-1844). Downgrade to low, compliance category.
>
> *Correction:* The code facts are accurate but this is a data-handling/compliance gap, not an exploitable vulnerability, and one premise of the impact statement is wrong. The export UI is reachable only by an already-authorized admin: nginx/server.conf:250-251 and :448-449 include admin-acl.inc on both /admin and ^~ /api/admin/ (IP allowlist that first includes blocked-hosts.inc, admin-acl.inc:20), the vhost auth_request requires a session (server.conf:183-194), and proxy/site-stats.mjs:3566 gates /api/admin/chat-history with authorizeAdmin, which at :2049 and :2065 accepts only an admin-kind session and denies general-kind fall-through. There is no unauthenticated or lower-privilege path to the data; the "export" is a client-side button acting on data the operator is already authorized to read on screen. Additionally, the impact claim that the server "keeps [this data] at mode 0600" is false: commitChatHistoryToDisk (proxy/site-stats.mjs:353) writes chat-history.json with plain `writeFileSync(..., 'utf8')` and no mode, unlike the session and auth-event writers at :747-748 and :1843-1844 which pass `mode: 0o600` plus chmodSync. The genuine residual issues are the two governance points: exports carry no CUI/Privacy-Act handling banner or exporter identity, and no appendAuditEntry (proxy/site-stats.mjs:921) fires on the chat-history read at :3565-3574 (nor on the DELETE at :3577). Those are worth fixing as policy hygiene, alongside the missing 0600 on chat-history.json, but rate as low, not medium.

---

### 100. Notification settings are written with no admin/CSRF credentials and the endpoint is not admin-gated server-side

**Security · medium** · `app/admin/AdminDashboard.tsx:121`

```
const response = await fetch(API_ENDPOINTS.notificationSettings, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
```

**What it is.** NotificationSettingsPanel POSTs to /api/notification-settings without adminAuthHeaders({ write: true }) and without credentials:'include'. Tracing the server: proxy/site-stats.mjs:3598 handles that POST with no authorizeAdmin() call and no x-csrf-token check; nginx/server.conf:338-343 only applies admin-acl.inc (IP allowlist) plus the site-wide auth_request (any session kind). So the only protection is being on an allowlisted workstation with a general (non-admin) login. The GET of /api/site-stats at AdminDashboard.tsx:527 has the same shape: IP allowlist plus any login, and its payload includes every feedback message and alert.

**Impact.** A signed-in non-admin user on an admin-allowlisted workstation can silently change the admin notification e-mail address and toggles (redirecting feedback/system-event notices) and can read the full alerts/feedback feed. The session cookie is SameSite=Strict, so cross-site CSRF from a third-party page is mitigated, but same-origin non-admin users are not.

**Fix.** Send adminAuthHeaders({ write: true }) with credentials:'include' from the panel, and on the proxy wrap both /api/notification-settings POST and /api/site-stats GET in authorizeAdmin() (CSRF included) rather than relying on nginx's IP allowlist alone.

> **exploitability review — upheld** (high confidence). Evidence confirmed verbatim. app/admin/AdminDashboard.tsx:121-124 posts to API_ENDPOINTS.notificationSettings ('/api/notification-settings', lib/data/runtime.ts:10) with only Content-Type — no adminAuthHeaders, unlike every write in lib/data/admin-content.ts (e.g. :641). Server: proxy/site-stats.mjs:3598-3615 parses the body, assigns notificationSettings and commitNotificationSettingsToDisk() with no authorizeAdmin() and no x-csrf-token check; authorizeAdmin exists at :2046 and is used at 40+ other handlers. The only mention of this route in a gate is ADMIN_ONLY_ROUTES (:2429), used at :2809 solely for the blocked-hosts 403 — not for auth. nginx/server.conf:338-343 has admin-acl.inc + error_page, inheriting the site-wide auth_request /internal/authcheck (:195), which accepts any session kind (:2856-2864 returns 200 for any session). Same for /api/site-stats (server.conf:374-379 / site-stats.mjs:3618), whose payload includes `alerts: feedbackStorage` plus topIPs/bucketIPs (:2760-2778). Cookie is SameSite=Strict (:1754) and admin-acl.inc allows 4 IPs + 127.0.0.1, so exploitation requires a general (non-admin) LDAP session from an allowlisted workstation — real but narrow.
>
> *Correction:* Accurate, with one correction to the client-side framing: `credentials: 'include'` is not actually needed — API_ENDPOINTS.notificationSettings is the same-origin relative path '/api/notification-settings' (lib/data/runtime.ts:10), so the session cookie is already sent on that fetch. The real defect is entirely server-side: proxy/site-stats.mjs:3598 accepts and persists the POST with no authorizeAdmin() and no x-csrf-token validation, and GET /api/site-stats (:3618) likewise returns the full feedback feed plus per-bucket client-IP lists with no admin check. The missing client header that matters is x-csrf-token (adminAuthHeaders({write:true})), not credentials. Exploitation path: any user who can obtain a general-kind LDAP session and reach one of the five allowlisted addresses in nginx/admin-acl.inc:22-26 can rewrite the notification e-mail/toggles and read the alerts feed; cross-site CSRF is blocked because the session cookie is SameSite=Strict (site-stats.mjs:1754) and a cross-origin JSON preflight carries no cookie, so nginx's inherited auth_request (server.conf:195) rejects it.

---

### 101. Generated Linux CSR script writes the private key world-readable (no umask)

**Security · medium** · `app/certsrv/request/CertRequestWizard.tsx:162`

```
: `openssl req -new -newkey rsa:2048 -nodes \\
  -keyout "$KEY" \\
  -out    "$CSR" \\
```

**What it is.** buildShellScript (lines 143-192) emits `set -e` but never sets `umask 077` before `openssl req -newkey ... -nodes -keyout "$KEY"`. OpenSSL opens the key file with fopen semantics (0666 & ~umask), so under the default 022 umask the unencrypted (-nodes) RSA private key lands on disk as 0644. The same one-liner is shown for copy/paste at line 1086, again with no umask or chmod. The wizard's own text says to "keep this file secure", but the artefact it hands out defeats that on every Enterprise Linux / Ubuntu enrollment.

**Impact.** Any local unprivileged user or service account on the server can read the freshly generated server/client-auth private key before the operator remembers to chmod it; keys minted through the wizard start life exposed.

**Fix.** Add `umask 077` right after `set -e` in the script template, and prefix the displayed one-liner with `umask 077 &&` (or append `chmod 600 "${name}.key"`). Consider dropping the hint "keep this file secure" in favour of stating the mode the script enforces.

> **exploitability review — upheld** (high confidence). Evidence confirmed. app/certsrv/request/CertRequestWizard.tsx:161-163 is verbatim `: \`openssl req -new -newkey rsa:2048 -nodes \\` / `  -keyout "$KEY" \\` / `  -out    "$CSR" \\`; the duplicate one-liner is at line 1086. `grep -n "umask\|chmod"` over the whole file returns zero hits, so buildShellScript (line 150) emits `set -e` (line 167 region) with no umask, and OpenSSL's `req -keyout` uses fopen semantics, so the -nodes key lands 0644/0664. Mechanism is real.

Exploitability is far weaker than "medium". No attacker-reachable path exists: the page is a static-export client component, buildShellScript runs in the browser, and the result is only handed to the operator via downloadFile at line 1232. Nothing server-side executes it — grep over proxy/*.mjs and nginx/* finds no openssl; proxy/cert-request.mjs only links the ADCS portal. So no nginx location, no site-stats.mjs handler, no tainted input is involved. Exploitation needs an operator to run the script and an attacker to already hold local unprivileged access on the enrolling host during the window before chmod. The renew branch (line 157) is unaffected. Real hygiene defect in generated guidance, worth the one-line fix, not a site vulnerability.
>
> *Correction:* The code defect is real and correctly located: app/certsrv/request/CertRequestWizard.tsx:161-163 (and the copy/paste one-liner at :1086) emit `openssl req -new -newkey rsa:2048 -nodes -keyout "$KEY"` with no `umask 077` or `chmod 600` anywhere in the file, so the unencrypted key is created world-readable. But the impact statement is wrong about where: this is a client-side generated artefact in a static export, downloaded by the operator at line 1232 and run on whatever host is being enrolled — no code on the APEN production server ever executes it, and no attacker-controlled request reaches this path. Severity is low: it requires an operator to run the script and an attacker to already have local unprivileged access on that enrolling host during the window before permissions are tightened. The renewal branch (line 157) reuses an existing key and is unaffected. The recommended one-line fix (`umask 077` after `set -e`, and `umask 077 &&` on the displayed one-liner) is still worth making.

---

### 102. Idle-session timeout is cosmetic: client navigates away but never ends the session

**Security · medium** · `components/layout/SessionIdleRedirect.tsx:51`

```
redirectedRef.current = true
      // replace(), not assign(): Back must not restore the dead page.
      window.location.replace(SESSION_IDLE.redirectUrl)
```

**What it is.** After 30 minutes without input the component only does window.location.replace('/') — it does not call adminContentClient.logout() and the HttpOnly session cookie stays valid. Server-side, proxy/site-stats.mjs findSessionByCookie() (lines 1788 and 1795) accepts any session whose absolute `expiresAt` (ADMIN_SESSION_TTL_HOURS, default 8h) has not passed; `lastSeenAt` is bumped but never compared, and the file header at proxy/site-stats.mjs:725 calls it 'advisory/informational'. The component's own doc comment (lines 9-13) acknowledges the timeout is not an access control. Net effect: '/' is itself gated (nginx/server.conf:744-748), so an idle user is bounced to the intro page and can click straight back in with the same session for up to 8 hours.

**Impact.** On shared or unattended workstations the advertised 30-minute idle lock does nothing; anyone at the keyboard resumes the previous user's general or admin session by navigating to any URL. Admin sessions expose /admin write endpoints for the remaining TTL.

**Fix.** In expireIfStale(), await adminContentClient.logout() (POST /api/auth/logout) before window.location.replace(). Server-side, enforce idle in findSessionByCookie(): reject when `Date.now() - session.lastSeenAt > IDLE_MS` (30 min, configurable via .env.example) before bumping lastSeenAt. Keep the absolute TTL as the outer bound.

> **exploitability review — upheld** (high confidence). Every claim checks out. components/layout/SessionIdleRedirect.tsx:47-51 is verbatim as quoted — expireIfStale() only sets redirectedRef and calls window.location.replace(SESSION_IDLE.redirectUrl); no logout call anywhere in the file (grep for "logout" in components/ hits only Navbar.tsx:279). Server side, proxy/site-stats.mjs:1788-1798 compares only `expiresAt > Date.now()` and then bumps `lastSeenAt`; the header comment at :725 does say lastSeenAt is "advisory/informational", and pruneExpiredSessions (:783, :787) also filters on expiresAt alone. TTL is 8h default (:283, :2972). grep for SESSION_IDLE/hasSessionGoneIdle across the repo finds them only in lib/data/session-idle.ts, the component, and tests/ui-behavior.test.ts — zero server-side idle enforcement. Reachability: the component is mounted sitewide (AppShell.tsx:60,71); redirectUrl is '/' (session-idle.ts:24); nginx/server.conf:744 `location / {` sits under the site-wide auth_request gate (:195, no `auth_request off`), so a still-valid cookie renders the intro page, not /login. Threat model is local (unattended/shared workstation) — cookie is HttpOnly, so no remote trigger — which matches the finder's stated impact.

---

### 103. Feedback form collects a name and free text with no Privacy Act (e)(3) notice at the point of collection

**Security · medium** · `components/ui/APEN-chat-assistant.tsx:1765`

```
<p className="mb-4 text-center text-gray-400">Report bugs or request features for the CESC team.</p>
...
                        <label htmlFor="feedback-name" className="text-[10px] font-bold uppercase text-gray-500">Name (Optional)</label>
```

**What it is.** The feedback pane (lines 1762-1800) collects a name (`autoComplete="name"`, maxLength 80) and up to ASSISTANT_CONFIG.maxFeedbackChars of free text, posted to /api/site-feedback (handleFeedbackSubmit, :930-938) and stored server-side in feedback-history.json. A Privacy Act (e)(3) statement — authority, principal purpose, routine uses, and whether providing the information is voluntary and the effect of not doing so — must appear at the point of collection whenever an individual is asked for information that will be retrieved by their name. The only text shown is "Report bugs or request features for the CESC team." Labelling the field "(Optional)" is not the required voluntariness disclosure, and the site-wide monitoring banner at :1613 does not satisfy (e)(3).

**Impact.** Users supply their name and free-text narrative — which frequently contains other people's names, ticket numbers and system details — into a record that is retained indefinitely (see the unbounded store finding) and read by admins, without being told the authority, purpose, uses or consequences. This is the classic (e)(3) failure and applies equally to the chat widget, which stores transcripts keyed to the signed-in username.

**Fix.** Add a short Privacy Act Statement block directly above the feedback fields (and a link to it from the chat composer), naming the authority (e.g. 10 U.S.C. 3013 / AR 25-1, already cited in LegalWrapper.tsx:41), the purpose, routine uses, that disclosure is voluntary, and the retention period.

> **exploitability review — upheld** (high confidence). Evidence confirmed verbatim. components/ui/APEN-chat-assistant.tsx:1762 is `<p ...>Report bugs or request features for the CESC team.</p>` and :1765 is the `feedback-name` label reading "Name (Optional)"; the input at :1767-1772 has `maxLength={80}` and `autoComplete="name"`. handleFeedbackSubmit (:926-940) POSTs `name`/`message` to API_ENDPOINTS.siteFeedback. Server handler proxy/site-stats.mjs:3211-3248 stores it into feedbackStorage (FEEDBACK_FILE, :62) and — unlike the /api/system-event path at :3197 which slices to 500 — the site-feedback path at :3244 applies no cap. Only notice shown is the monitoring banner at :1613. Reachability: nginx/server.conf:286-292 proxies /api/site-feedback to stats_backend with no `auth_request off`, so it inherits the site-wide login gate (:195), and the handler's only extra check is a same-origin guard (:3214-3225). So the form is live to every logged-in user. Two corrections: a footer-linked Privacy Act Statement does exist (lib/data/footer.ts:18 → components/legal/privacy-security.tsx:7-9), and the feedback store is keyed `fb-${Date.now()}`, not retrieved by name; the chat store at :357 `chatHistoryKey(realm, username)` is the stronger (e)(3) case. No attacker path — this is a compliance gap, not a vuln.
>
> *Correction:* The core observation holds: the feedback pane (components/ui/APEN-chat-assistant.tsx:1762-1775) asks for a name and free text with no Privacy Act (e)(3) statement at the point of collection, and the data is persisted server-side (proxy/site-stats.mjs:3244, uncapped on this path). Two claims need correcting. First, the finding says the banner at :1613 is the only relevant text; in fact a Privacy Act Statement page exists and is linked site-wide from the footer (lib/data/footer.ts:18 -> components/legal/privacy-security.tsx:7-9). It still does not cure the gap — it covers only "CAC credentials or session logs," never mentions feedback, and omits routine uses and voluntariness — but the finding overstates the absence. Second, the Privacy Act (e)(3) trigger is retrieval by name or personal identifier; the feedback record is keyed `fb-${Date.now()}` with the name interpolated into a display title (proxy/site-stats.mjs:3236-3238), so that store is not clearly a system of records. The chat transcript store, keyed `${realm}::${username}` at proxy/site-stats.mjs:357-359, is the stronger (e)(3) case and the finding only mentions it in passing. Severity drops to low: there is no attacker path — nginx/server.conf:286-292 inherits the site-wide auth_request gate (:195), so the audience is authenticated Army users on an internal system, and the defect is missing disclosure text, not an exposure.

---

### 104. Model output auto-rendered as scripted HTML in an iframe; no user opt-in

**Security · medium** · `components/ui/APEN-chat-assistant.tsx:1859`

```
<iframe title="Live preview" sandbox="allow-scripts" srcDoc={previewHtml} className="flex-1 bg-white" />
```

**What it is.** Every assistant reply is scanned by extractHtmlBlock (line 105) and, if a ```html fence is present, the block is immediately rendered (lines 908 and 1062) in an iframe with `sandbox="allow-scripts"`. The srcdoc document inherits the page CSP, which permits 'unsafe-inline' scripts (nginx/security-headers.inc line 9). The opaque origin stops direct access to the parent DOM, cookies and storage, but a prompt-injected reply (via an attached file, retrieved page text, or admin-edited persona) can display arbitrary scripted UI — e.g. a fake 'Session expired, re-enter your CAC PIN / password' panel branded as the APEN site — inside the trusted chat panel without the user asking for it. The behavior rules never instruct the model to emit HTML, so this is a latent feature with no legitimate trigger.

**Impact.** In-product phishing/UI-spoofing surface inside a DoD support site; also lets a model bug or injection pop a 44%-width pane of arbitrary content on every reply.

**Fix.** Remove the automatic Live Preview, or gate it behind an explicit user click and drop `allow-scripts` (render as inert HTML or plain text). If kept, add `csp` attribute on the iframe forbidding scripts and forms.

> **exploitability review — upheld** (high confidence). Evidence verified verbatim. components/ui/APEN-chat-assistant.tsx:1859 is exactly `<iframe title="Live preview" sandbox="allow-scripts" srcDoc={previewHtml} .../>`; extractHtmlBlock at :105; auto-set with no opt-in at :908 and :1062 (`const html = extractHtmlBlock(reply); if (html) setPreviewHtml(html)`). nginx/security-headers.inc:9 is `script-src 'self' 'unsafe-inline'`, and a srcdoc frame inherits it, so inline scripts do run. /api/voltron-chat (nginx/server.conf:269-281) is unauthenticated, rate-limited only, so the widget is public. But the exploit path is weaker than claimed: proxy/voltron-proxy.mjs only fetches the configured LLM upstreams (:380, :568) — there is no web/page retrieval, so the "retrieved page text" vector does not exist. Remaining sources of a ```html fence are the victim's own typed text/attachment (handleFileChange :1073, local file picker) or the admin-editable knowledge half (already privileged). Exfiltration is also constrained: opaque sandbox origin means inherited `connect-src 'self'`, `img-src 'self'` and `form-action 'self'` match nothing, leaving only frame self-navigation.
>
> *Correction:* The code claim is accurate: every assistant reply is scanned (APEN-chat-assistant.tsx:105) and any ```html block is auto-rendered with no user action in a script-enabled iframe (:908, :1062, :1859), and the inherited CSP (nginx/security-headers.inc:9) permits 'unsafe-inline', so that markup is live. The exploitability is narrower than described. There is no retrieval path: proxy/voltron-proxy.mjs only posts to configured LLM upstreams, so a remote attacker cannot inject page text into another user's reply. The realistic triggers are (a) the victim pasting or attaching attacker-supplied content into their own chat (self-inflicted / social engineering), (b) a compromised admin editing the persona, which is already gated by the LDAP admin session plus the nginx admin ACL and already permits arbitrary assistant text, or (c) the model itself misbehaving. Credential exfiltration from the pane is largely blocked: the sandbox's opaque origin makes 'self' in connect-src, img-src and form-action match nothing, so a phishing pane can be displayed but has no easy channel to send what it captures (frame self-navigation being the residual hole). This is a latent UI-spoofing surface worth removing or gating behind a click, not a remotely triggerable vulnerability — low, not medium.

---

### 105. Root installer verifies bundle integrity but not authenticity; symlinks are outside the checksum set and get recreated verbatim

**Security · medium** · `deploy/INSTALL.sh:85`

```
(cd "$HERE" && sha256sum -c --quiet SHA256SUMS) || die "bundle integrity check FAILED: ..."
```

**What it is.** SHA256SUMS travels inside the same directory it protects and nothing is signed, so anyone who can alter the bundle in the transfer path (rsync/WinSCP through the cross-domain hop) can regenerate it. Root then executes bundle content unconditionally: vendored pm2 is rsync'd into /usr/lib/node_modules and symlinked to /usr/bin/pm2 (lines 353-354), customsh scripts are installed for root cron (163), node_modules is run by the admin build. Separately, make-airgap-bundle.sh:229-231 builds SHA256SUMS and MANIFEST.txt with `find . -type f`, so symlinks are never checksummed, and CHECK-TRANSFER.sh:51-52 does `rm -f "$link"; ln -s "$target" "$link"` for every SYMLINKS.txt entry with no path validation; INSTALL.sh:330 then `cp`s nginx/*.inc into /etc/nginx following whatever the link points at.

**Impact.** A tampered bundle passes every check and yields root on the target enclave; an injected symlink (e.g. site/nginx/proxy-headers.inc -> /etc/shadow) passes SHA256SUMS and lands its target's contents in /etc/nginx/conf.d.

**Fix.** Sign SHA256SUMS (gpg --detach-sign, or minisign) at bundle time and have INSTALL.sh refuse without a valid signature against a key pre-placed on the target. In CHECK-TRANSFER.sh reject any SYMLINKS.txt target that is absolute or resolves outside $HERE, and have make-airgap-bundle.sh include `find . -type l` targets in SHA256SUMS (hash of `readlink`).

> **exploitability review — upheld** (high confidence). Every cited location verified verbatim. deploy/INSTALL.sh:85 is exactly the quoted `(cd "$HERE" && sha256sum -c --quiet SHA256SUMS) || die ...`; `grep -rn "gpg|minisign|signature|--detach" deploy/ scripts/make-airgap-bundle.sh` returns nothing, so SHA256SUMS is unsigned and ships inside the directory it protects. Root then executes bundle content: INSTALL.sh:353-354 `run "rsync -a '$HERE/vendor/pm2/' /usr/lib/node_modules/pm2/"` + `ln -sf ... /usr/bin/pm2`; :163 rsync customsh; :133 rsync site/ (rsync -a preserves symlinks). make-airgap-bundle.sh:229-231 checksums `find . -type f` and explicitly excludes SHA256SUMS/MANIFEST.txt/SYMLINKS.txt/EXECBITS.txt, and :222 records symlinks separately — so those four control files are themselves unchecksummed. CHECK-TRANSFER.sh:51-52 is exactly `rm -f "$link"` / `ln -s "$target" "$link"` with no target validation; INSTALL.sh:330 `run "cp '$SITE_ROOT/nginx/$inc' ..."` uses plain cp, which dereferences. Exploitability lens: not web-reachable (no nginx location, no site-stats.mjs handler) — it is an offline root-run installer, so the attacker needs write access in the cross-domain transfer path. Sole nuance: the /etc/shadow example writes the content into /etc/nginx/conf.d but then `nginx -t` fails at INSTALL.sh:336-338, so it is a local disclosure/DoS, not a served file. Medium is right.

---

### 106. rsync --delete over $SITE_ROOT with no sanity guard on the enclave-supplied path, driven through eval

**Security · medium** · `deploy/INSTALL.sh:133`

```
rsync -a --delete "${RSYNC_PROTECT[@]}" "$HERE/site/" "$SITE_ROOT/"
```

**What it is.** SITE_ROOT comes straight from enclave.env (line 66 only defaults it). Nothing checks that it is absolute, not `/`, not /var/www/html, not the bundle dir itself, or that it looks like a site tree before `rsync -a --delete` mirrors the bundle onto it. The same value is also interpolated into `run()` which is `eval "$@"` (line 46): `run "mkdir -p '$SITE_ROOT'"`, `run "chown -R '$RUN_USER':'$RUN_USER' '$SITE_ROOT'"`, `run "cp -a '$SITE_ROOT/$keep' '$BACKUP_DIR/'"`, so a single quote in SITE_ROOT, LEGACY_WEBROOT, RUN_USER (derived from `stat -c %U`) or BACKUP_DIR breaks out of the quoting.

**Impact.** A typo like `SITE_ROOT=/var/www` or a trailing-space value deletes everything under that path as root; the eval path makes quoting errors into command execution rather than a failed copy. --dry-run does not exercise the exact rsync command (line 131 prints an approximation).

**Fix.** Validate SITE_ROOT (`[[ $SITE_ROOT == /*/* ]]`, refuse `/`, `/var/www`, `/var/www/html`, `$HERE`), and in update mode require `$SITE_ROOT/package.json` to exist before --delete. Replace `run(){ eval "$@"; }` with an array-based runner (`run(){ ...; "$@"; }`) so arguments are never re-parsed.

> **exploitability review — upheld** (high confidence). Evidence verified verbatim. deploy/INSTALL.sh:133 is exactly `rsync -a --delete "${RSYNC_PROTECT[@]}" "$HERE/site/" "$SITE_ROOT/"`; :46 is `run()  { ... else eval "$@"; fi; }`; :66 only defaults SITE_ROOT; :54 only rejects empty/CHANGE_ME; no absolute/deny-list/site-tree check exists anywhere between :54 and :133. The eval interpolations at :108, :110, :121, :146, :156, :167 are real. So the mechanism is real.

But the exploitability lens refutes the security framing. INSTALL.sh is never served: it is not in out/ (nginx root), not referenced by nginx/server.conf or any .inc, and `grep -rn "INSTALL.sh" proxy/ app/` returns nothing — no handler in site-stats.mjs or voltron-proxy.mjs can reach it. scripts/make-airgap-bundle.sh:157 ships only enclave.env.example; the real enclave.env is authored on the target host by the same operator who then runs `sudo ./INSTALL.sh` (:83 requires EUID 0). That operator already has root and write access to INSTALL.sh itself, so the eval quote-break crosses no privilege boundary. RUN_USER (:77) comes from `stat -c %U` on a local path, not attacker input.
>
> *Correction:* The code defect is real and the quoted lines are exact, but it is an operator-safety footgun, not a security vulnerability. deploy/INSTALL.sh:133 does run `rsync -a --delete` into `$SITE_ROOT` with no guard that the path is absolute, is not `/` or `/var/www`, or contains a site tree — only the empty/CHANGE_ME check at :54 and the default at :66 — so a typo or trailing-space value in enclave.env destroys whatever tree it names, and --dry-run (:131) prints an approximation rather than exercising the real command. The `run(){ eval "$@"; }` helper at :46 likewise re-parses `$SITE_ROOT`/`$LEGACY_WEBROOT`/`$RUN_USER`/`$BACKUP_DIR` at :108, :110, :121, :146, :156 and :167. However there is no attacker and no privilege boundary: INSTALL.sh is not in out/, is not routed by any nginx location or .inc, and is referenced by no code under proxy/ or app/; the bundle ships only enclave.env.example (scripts/make-airgap-bundle.sh:157), so enclave.env is written on the target host by the same operator who runs the script as root (:83) and who can edit INSTALL.sh directly. The eval therefore buys an attacker nothing. Worth fixing as deploy robustness — validate SITE_ROOT and require `$SITE_ROOT/package.json` in update mode before --delete — at low severity, not medium security.

---

### 107. CSV export does not neutralize spreadsheet formula prefixes in public-user feedback text

**Security · medium** · `lib/admin/export.ts:15`

```
function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
```

**What it is.** csvEscape only quotes commas/quotes/newlines. It never prefixes cells that begin with =, +, -, @, \t or \r. The System Events & Feedback panel exports alerts through this helper (app/admin/AdminDashboard.tsx:198-201 maps a.title and a.message), and those alerts are built server-side from the public /api/site-feedback POST body (proxy/site-stats.mjs ~3237: title = `${data.category}: ${data.name}`, message = data.message) with no sanitization. An anonymous visitor therefore controls the first characters of two exported cells.

**Impact.** An admin who opens system-events-feedback.csv in Excel/LibreOffice can trigger DDE/hyperlink/formula execution (e.g. =HYPERLINK or =cmd|' /C ...'!A1) on an admin workstation. Chat-transcript export is not affected because every cell there starts with a fixed [role] prefix.

**Fix.** In csvEscape, when value matches /^[=+\-@\t\r]/ prepend a single quote (or a space) before quoting, and always quote such cells. Apply the same guard to the Markdown export if those files are opened in spreadsheet tools.

> **exploitability review — upheld** (high confidence). Evidence confirmed verbatim. lib/admin/export.ts:15-17 is exactly as quoted: `if (/[",\n]/.test(value))` only — no `^[=+\-@\t\r]` guard, so a cell starting with `=` and containing no comma/quote/newline is emitted raw by exportToCsv (export.ts:27-28). app/admin/AdminDashboard.tsx:197-204 defines ALERT_EXPORT_COLUMNS with `{ label: 'Title', value: (a) => a.title }` (199) and `{ label: 'Message', value: (a) => a.message }` (201); line 246 wires `<ExportBar rows={filtered} columns={ALERT_EXPORT_COLUMNS} filenameBase="system-events-feedback"`. Taint source confirmed: proxy/site-stats.mjs:3238-3239 builds `title: ...${data.category}: ${data.name...}` and `message: data.message` straight from the POST body, unshifts into feedbackStorage (3244) which is served as `alerts` (2777). No sanitization anywhere on that path. Exploitability correction: the finder's "anonymous visitor" is wrong. nginx/server.conf:195 sets `auth_request /internal/authcheck;` server-wide, and `location = /api/site-feedback` (286-292) does NOT opt out with `auth_request off`, unlike /403/ and /404/ (235-247). A valid LDAP session is required, plus a same-origin Origin/Referer (site-stats.mjs:3213-3225) and a 2r/min limit (server.conf:36,288).
>
> *Correction:* The defect is real and correctly located, but the attacker model is overstated. csvEscape (lib/admin/export.ts:15-17) genuinely omits any formula-prefix neutralization, and public-controlled feedback text reaches two exported cells unsanitized (proxy/site-stats.mjs:3238-3239 -> 2777 -> app/admin/AdminDashboard.tsx:199,201,246). However the poster is not anonymous: /api/site-feedback inherits the site-wide `auth_request /internal/authcheck` gate (nginx/server.conf:195) and never opts out (server.conf:286-292), so an attacker needs a valid LDAP session, must pass the same-origin Origin/Referer check (site-stats.mjs:3213-3225), and is capped at 2 requests/minute (server.conf:36,288). Exploitation further requires an admin to open the CSV in Excel/LibreOffice and accept the external-data/DDE prompt. Authenticated-insider, multi-step, user-interaction-dependent -> low, not medium. The one-line fix in csvEscape is still worth taking since it also covers every other panel routed through exportToCsv.

---

### 108. nginx access log carries no user identity although $auth_user is captured and the code claims it is logged

**Security · medium** · `nginx/server.conf:196`

```
auth_request /internal/authcheck;
    auth_request_set $auth_user $upstream_http_x_user;
```

**What it is.** server.conf:196 captures the authenticated username from the /internal/authcheck upstream into $auth_user, but that variable is referenced nowhere else in nginx/server.conf or any nginx/*.inc. The per-site access log at server.conf:154 uses `access_log /var/log/nginx/cui_nginx_access.log main`, and `main` is nginx's stock format (defined at /etc/nginx/nginx.conf:19 as '$remote_addr - $remote_user [$time_local] "$request" $status ...'), which logs $remote_user — always empty here, since authentication is cookie-based, not HTTP Basic. Meanwhile the comment in proxy/site-stats.mjs:2825-2826 asserts 'the X-User header is forwarded into the access log via auth_request_set for a per-request "who did this" audit trail'. That trail does not exist.

**Impact.** The fallback identity trail everyone believes exists — the one that would let an investigator attribute the unlogged admin mutations above to a person — records only a source IP. On a network where a workstation is shared or an address is reassigned, the request-level log cannot answer who acted, and the documented control is false assurance rather than a gap someone knows about.

**Fix.** Define a site log_format that includes $auth_user (and optionally $http_x_csrf_token presence / $request_id) and point the cui_nginx_access.log directive at it. Remember the stats card parses this file (server.conf:150-154), so add fields at the end of the line and confirm the parser in site-stats.mjs still matches. Also correct or delete the claim in the site-stats.mjs comment.

> **exploitability review — upheld** (high confidence). Evidence verified verbatim. nginx/server.conf:195-196 is exactly `auth_request /internal/authcheck;` / `auth_request_set $auth_user $upstream_http_x_user;`. A repo-wide grep finds `$auth_user` on that one line only — no log_format anywhere under nginx/. server.conf:154 is `access_log /var/log/nginx/cui_nginx_access.log main;` and `main` is the stock format at /etc/nginx/nginx.conf:19-21 (`$remote_addr - $remote_user ...`), with no `auth_basic` anywhere, so `$remote_user` is always empty. proxy/site-stats.mjs:2825-2826 does claim "the X-User header is forwarded into the access log via auth_request_set for a per-request 'who did this' audit trail". That trail genuinely does not exist. Exploitability lens: nothing here is attacker-triggerable — it is an unused variable plus a false comment, no request path reaches a weakness. And the stated impact is overstated: proxy/site-stats.mjs:920-935 `appendAuditEntry` records actor, workstation and IP, and ~18 admin mutation handlers (3330, 3715, 4058, 4251, ...) call it, so admin writes are attributed in-app. Real but low.
>
> *Correction:* The technical claim is accurate: nginx/server.conf:196 defines $auth_user and nothing ever uses it, the site log at server.conf:154 uses the stock `main` format (/etc/nginx/nginx.conf:19-21) whose only identity field is $remote_user — always empty with cookie auth — and the comment at proxy/site-stats.mjs:2825-2826 asserting an access-log audit trail is false. However the severity and impact are overstated. This is dead config plus a stale comment, not an attacker-reachable weakness: no request path exercises it. More importantly, admin mutations are not unattributed — proxy/site-stats.mjs:920-935 `appendAuditEntry` stamps each entry with the LDAP session username (falling back to the ACL-derived workstation user), the workstation name and the IP, persists it to content-audit.json, and roughly eighteen admin write handlers call it (e.g. lines 3330, 3386, 3715, 3799, 4058, 4251). So the correct statement is: a documentation/defense-in-depth gap — remove or fix the misleading comment, and optionally add $auth_user to a site log_format — rather than a missing accountability control.

---

### 109. Speedtest X-Forwarded-For is appended/passed through, not overwritten as the config comments claim; backend IP gate is spoofable

**Security · medium** · `nginx/server.conf:491`

```
location = /speedtest/api/download {
    auth_request off;
    proxy_pass         http://speedtest_py/speedtest/api/download;
```

**What it is.** Comments at server.conf:466-468 and 478-480 state that X-Forwarded-For is 'set to $remote_addr (overwrite, NOT append) because the backend authorizes the FIRST address in that header'. The actual config does the opposite: `/speedtest/api/download` and `/speedtest/api/upload` (491-503) set no proxy_set_header at all, so the client's own X-Forwarded-For header is forwarded verbatim, and `/speedtest/` (line 512) uses `$proxy_add_x_forwarded_for`, which appends $remote_addr AFTER any client-supplied value. speedtest/backend/server.py:48-52 (`_client_ip`) takes `xff.split(',')[0]` and `_require_auth` (used at server.py:112,121,145,154) authorizes on it. Mitigating factor: speedtest/backend/config.py:61 defaults `SPEEDTEST_ALLOW_ALL` to '1', so the gate is currently open by design; the moment it is switched on it is trivially bypassed with `X-Forwarded-For: 10.0.0.1`.

**Impact.** The documented network gate on bandwidth-consuming measurement endpoints (up to 64 MiB per download request, unlimited parallel streams, no auth) cannot be enforced; any host can claim an authorized address. The comments give operators false confidence that the gate works.

**Fix.** In every /speedtest* and /netdiag* location use `proxy_set_header X-Forwarded-For $remote_addr;` (overwrite), add it to the two exact-match API locations that currently send nothing, and have server.py prefer X-Real-IP or the LAST XFF entry. Fix the comments to match.

> **exploitability review — upheld** (high confidence). Mechanism confirmed verbatim. nginx/server.conf:491-496 and 498-503 are exactly as quoted and contain no proxy_set_header; I grepped the whole file and the .inc files and found no server-/http-level proxy_set_header and no real_ip_header/set_real_ip_from, so a client X-Forwarded-For passes verbatim to 127.0.0.1:8085 (upstream, server.conf:67). server.conf:512 is `$proxy_add_x_forwarded_for` (append), contradicting the comments at 466-468 and 478-480. speedtest/backend/server.py:48-52 returns `xff.split(",")[0].strip()`; _require_auth (65-68) is called at 112/121/145/154. Reachable: `auth_request off` at 492/499/507, no admin-acl.inc or blocked-hosts.inc on these locations. But exploitability today is nil: config.py:61 `ALLOW_ALL = _truthy(os.getenv("SPEEDTEST_ALLOW_ALL", "1"))` and nothing in the repo sets 0; with the gate on, config.py:24-49 already trusts org DREN/CUI plus all RFC1918, so the spoof only helps an off-allowlist client. The impact text is also wrong on rate limits: limit_req zones exist at 494/501 keyed on $binary_remote_addr (34-35), unaffected by XFF, and server.py:42 caps a request at 64 MiB.
>
> *Correction:* Accurate as a latent correctness/defense-in-depth defect, overstated as a live vulnerability. The code facts hold exactly as cited: the exact-match /speedtest/api/download and /speedtest/api/upload blocks (nginx/server.conf:491-503) set no proxy_set_header and inherit none (no server- or http-level proxy_set_header exists; proxy-headers.inc is not included there), so a client-supplied X-Forwarded-For reaches the backend untouched; /speedtest/ (server.conf:512) uses $proxy_add_x_forwarded_for, which appends after the client value; and speedtest/backend/server.py:48-52 authorizes on the FIRST XFF entry via _require_auth (112, 121, 145, 154). The comments at server.conf:466-468 and 478-480 assert the opposite of what the config does, and there is no real_ip module configured to sanitize the header. However the gate enforces nothing today (speedtest/backend/config.py:61 defaults SPEEDTEST_ALLOW_ALL to "1" and no file in the repo sets it to 0), and even when enabled config.py:24-49 trusts the org DREN/CUI ranges plus all RFC1918/CGNAT/link-local by default, so spoofing only buys access to a client outside those ranges that can already reach an internal-only vhost. The finding's impact statement is inaccurate on two points: the endpoints are not "unlimited parallel streams" — limit_req zones at server.conf:494 and 501 (defined at 34-35, keyed on $binary_remote_addr, so unaffected by XFF spoofing) and the 64 MiB _MAX_DOWNLOAD cap at server.py:42 already bound abuse. Real severity is low: a control that would silently fail the moment an operator turns it on, plus a comment that lies about the config. Fix as recommended (proxy_set_header X-Forwarded-For $remote_addr in all speedtest/netdiag locations, or have the backend read X-Real-IP), but not as a medium-risk live exposure.

---

### 110. /search-index.json is served without login and contains body text of every page, including ACL-gated /test/

**Security · medium** · `nginx/server.conf:622`

```
location = /search-index.json {
        auth_request off;
        expires -1;
```

**What it is.** The site-wide auth_request gate (nginx/server.conf:195) is explicitly switched off for /search-index.json. scripts/build-search-index.mjs writes title, description, up to 12 headings, 1600 chars of visible text and up to 24 link hrefs for every out/**/index.html not in EXCLUDE (lines 22-33). The EXCLUDE list omits /test/, which nginx gates behind admin-acl.inc (server.conf:259-266); the built out/search-index.json confirms an entry for `/test/` with its headings ('NGINX Live Activity', 'HTTP upstreams', 'Shared memory zones', ...). app/search/SearchClient.tsx:100 is the only consumer and it runs on /search/, which is itself behind the login gate, so the exemption buys nothing for legitimate users.

**Impact.** An unauthenticated client on the enclave network can download a 100 KB text dump of the whole support site (page contents, external portal URLs, /api/external/* redirector paths) without a session, defeating the purpose of the site-wide LDAP gate. The /test/ entry additionally advertises the admin-only NGINX monitoring UI's structure.

**Fix.** Remove `auth_request off;` from the /search-index.json location (the /search page can only be reached with a session anyway). Add `/^\/test(\/|$)/` and `/^\/login(\/|$)/` to EXCLUDE in scripts/build-search-index.mjs so ACL-gated routes are never indexed. If the AI assistant needs the index without a cookie, have proxy/voltron-proxy.mjs read it from disk instead.

> **exploitability review — upheld** (high confidence). Evidence verified verbatim at nginx/server.conf:622-624 ("location = /search-index.json {" / "auth_request off;" / "expires -1;"), and the same block exists at line 622 of the DEPLOYED /etc/nginx/conf.d/apen_support/server.conf, so this is live. Request path: exact-match location wins over every prefix/regex location; there is no server-level allow/deny (only line 226 "root /var/www/apen_support_nextjs/out;"), blocked-hosts.inc is included only at lines 772/810/899 (/cran-control etc.), and admin-acl.inc never touches this path. The site-wide gate is server.conf:195 "auth_request /internal/authcheck;", explicitly disabled here — so an anonymous enclave client gets the file straight off disk. out/search-index.json is 106 KB, 109 routes, each with title/headings/1600 chars of text/links, and it does contain {"route": "/test/"} whose sibling page location (server.conf:259-266) is admin-ACL gated. Exploitable as described.
>
> *Correction:* Accurate in substance, with two corrections. (1) SearchClient.tsx:100 is not the only consumer — components/ui/APEN-chat-assistant.tsx:969 also fetches /search-index.json; however AppShell.tsx:27-34 makes '/' and '/login' chromeless and mounts FloatingAiAssistant only on the non-chromeless branch (line 77), so both consumers run only on pages that are already behind the login gate and would send the session cookie anyway — the exemption still buys nothing. (2) The /test/ impact is weaker than stated: its indexed text is self-labelled "UI MOCK — SIMULATED DATA ... All numbers are fabricated client-side; nothing reads the real nginx", so it leaks the mock's existence and section labels, not real monitoring data. The core issue stands and is live: 106 KB / 109 pages of site body text, including ACL-gated /test/, plus internal portal URLs (blcseportal.blcse.mil, acas.blcse.mil, apenosticket.blcse.mil) and 4 /api/external references, are downloadable without any session.

---

### 111. Restricted-enclave logo set is served with the login gate explicitly disabled

**Security · medium** · `nginx/server.conf:640`

```
location ^~ /logos/ {
        auth_request off;
        try_files $uri $uri/ @legacy_logos;
```

**What it is.** `git ls-files public/logos/restricted` lists 19 marks and all 19 are present in out/logos/restricted/. The filenames themselves name restricted-enclave and decommissioned systems: ONESAF.png, VASSAL.png, afsim.jpg, rstudio.png, ansible.png, atom.jpg, openfire-logo.png, epo.png, qpro_logo.png, wanshow.png. The /logos/ location turns off the site-wide auth_request gate (comment at lines 636-639 explains this is so the login page can render) and applies no IP ACL, so every file under /logos/restricted/ is fetchable with no session at all.

**Impact.** Directory-name plus filename enumeration of /logos/restricted/ discloses which simulation and collaboration systems exist (or existed) on the restricted enclave — ONESAF and AFSIM in particular are named military simulation programs — to a client that has never authenticated. The directory name 'restricted' itself signals the classification split.

**Fix.** Move the logos the login page actually needs into a small unauthenticated subdirectory and bring the rest of /logos/ back under the auth_request gate, or at minimum rename public/logos/restricted to a neutral folder and drop the marks for systems no longer on the site (rstudio, ONESAF, VASSAL, afsim, ansible, atom, openfire).

> **exploitability review — upheld** (high confidence). Evidence confirmed verbatim. nginx/server.conf:640-642 is exactly `location ^~ /logos/ { auth_request off; try_files $uri $uri/ @legacy_logos;`. The site-wide gate is real (server.conf:195 `auth_request /internal/authcheck;`, inherited by every location), root is `/var/www/apen_support_nextjs/out` (server.conf:226), and out/logos/restricted/ holds all 19 marks. No admin-acl or blocked-hosts include applies to /logos/, so any client that can reach apensupport.blcse.mil:443 fetches them with no session. Effect confirmed.

Two corrections. (1) The stated mechanism "directory-name plus filename enumeration" is wrong: autoindex is off for /logos/ (and explicit at server.conf:654 for @legacy_logos), so no listing is possible. Names actually leak from the LOGOS catalog compiled into out/_next/static/chunks/1hgnzundcipbr.js, which the ungated login page loads under the `/_next/static/` exemption (server.conf:610-614) — `logos/restricted",d="/logos/store"`. (2) The recommendation is therefore incomplete: re-gating /logos/ leaves the filenames in that anonymously-fetchable chunk.

Impact is vendor-logo filenames on an internal enclave host — real but minor, hence low, not medium.
>
> *Correction:* The core claim holds: nginx/server.conf:640-641 disables the site-wide auth_request gate for `^~ /logos/`, and no IP ACL applies, so every file under out/logos/restricted/ (19 marks, including ONESAF.png, VASSAL.png, afsim.jpg) is retrievable by an unauthenticated client that can reach the vhost. Two details are wrong. First, the disclosure is not "directory-name plus filename enumeration" via /logos/: autoindex is off (default for the /logos/ block, explicit at server.conf:654 for @legacy_logos), so a directory listing is not obtainable. The filenames leak instead from the LOGOS registry (lib/data/logos.ts:45) compiled into out/_next/static/chunks/1hgnzundcipbr.js, which the ungated login page loads under the separate `/_next/static/` exemption at server.conf:610-614. Second, and consequently, the recommended fix is incomplete: re-gating /logos/ would still leave the full restricted filename list in an anonymously fetchable JS chunk. Severity is low rather than medium — what is exposed is a set of COTS vendor/product logo filenames on an internal enclave host, not content.

---

### 112. Upstream TLS to apenwingetrepo is not verified (installer supply path)

**Security · medium** · `nginx/server.conf:680`

```
proxy_pass https://apenwingetrepo.blcse.mil/api/;
proxy_ssl_server_name on;
```

**What it is.** All three winget locations (680, 696, 713) proxy to https://apenwingetrepo.blcse.mil with no `proxy_ssl_verify on` / `proxy_ssl_trusted_certificate`; the comment at 676-677 acknowledges 'nginx does not verify proxied TLS by default'. The proxied content is MSIX/AppX installers and the catalog that tells winget where to fetch them, re-served same-origin to workstations that trust this host.

**Impact.** An on-path attacker or DNS poisoning inside the enclave could substitute installers/catalog entries and have them delivered under apensupport.blcse.mil's origin and trust.

**Fix.** Add `proxy_ssl_verify on; proxy_ssl_trusted_certificate /etc/nginx/ssl/<internal-ca-chain>.crt; proxy_ssl_verify_depth 2;` to the three winget locations (the internal CA chain is already on this host for the site cert).

> **exploitability review — upheld** (high confidence). Evidence verified verbatim. nginx/server.conf:680-681 is exactly `proxy_pass https://apenwingetrepo.blcse.mil/api/;` / `proxy_ssl_server_name on;`, with the same pair at 696-697 and 713-714. The comment at 676-677 does say "Upstream uses an internal CA; nginx does not verify proxied TLS by default". grep for proxy_ssl_verify / proxy_ssl_trusted across nginx/*.conf and nginx/*.inc returns nothing, including loader.conf, proxy-headers.inc and apensupport.legacy.conf, so nothing at http level supplies it either — proxy_ssl_verify stays at nginx's default off. Reachability: all three locations begin with `auth_request off;` (679, 695, 712), so they bypass login-redirect.inc and are public to any workstation; admin-acl.inc and blocked-hosts.inc do not cover /winget/. The proxied bytes are MSIX/AppX installers, and the sub_filter at 690-692 rewrites catalog InstallerUrls to /winget/packages/ so clients fetch them back through this host's origin. Confirmed as a real, unmitigated upstream-TLS gap.
>
> *Correction:* Accurate as written, with one mechanical nuance: no `resolver` directive appears in these blocks or elsewhere in nginx/, so nginx resolves apenwingetrepo.blcse.mil once at config load/reload rather than per request. DNS cache poisoning therefore has to land at an nginx start or reload; an on-path attacker between this host and 172.16.2.22 is the practical vector. The substituted-installer impact, the three cited locations, and the recommended proxy_ssl_verify/proxy_ssl_trusted_certificate fix are all correct.

---

### 113. Unbounded request bodies on unauthenticated /winget/packages/ and /winget/get/ are spooled to disk

**Security · medium** · `nginx/server.conf:704`

```
proxy_buffering off;          # stream large MSIX/AppX installers
client_max_body_size 0;
proxy_read_timeout 300s;
```

**What it is.** Both `^~ /winget/packages/` (line 694-706) and `^~ /winget/get/` (711-723) set `auth_request off` and `client_max_body_size 0`. `proxy_buffering off` only affects the RESPONSE; `proxy_request_buffering` is left at its default (on), so nginx spools any request body to client_body_temp before forwarding it upstream. The comment at lines 420-424 already documents that this exact combination fills the root filesystem. These are download paths; they never need a body at all.

**Impact.** An unauthenticated client on the network can POST multi-GB bodies to /winget/get/x and fill nginx's temp directory (on /), taking down the whole site and every repo it serves.

**Fix.** Remove `client_max_body_size 0` from both winget locations (the 1m default is already generous for GET/HEAD) or set `limit_except GET HEAD { deny all; }` in them.

> **exploitability review — upheld** (high confidence). Evidence confirmed verbatim. nginx/server.conf:703-705 (inside `location ^~ /winget/packages/`, 694-706) and 720-722 (inside `location ^~ /winget/get/`, 711-723) both read `proxy_buffering off;` / `client_max_body_size 0;` / `proxy_read_timeout 300s;`. Cited line 704 is the `client_max_body_size 0;` line.

Reachability traced: both blocks carry `auth_request off;` (server.conf:695, 712), overriding the site-wide gate at server.conf:195 (`auth_request /internal/authcheck;`). Neither includes admin-acl.inc or blocked-hosts.inc, and neither carries a `limit_req` — grep shows limit_req only in other locations, and lines 110-200 have no server-level limit_req/limit_conn. So any client that can reach :443 hits these unauthenticated and unrated.

The mechanism holds: `grep -rn proxy_request_buffering nginx/` returns only server.conf:434 (inside `/api/admin/file-upload`) plus the comment at 420, so the winget blocks keep the default `on` — nginx spools the full body to client_body_temp before contacting upstream. `proxy_buffering off` is response-side only. The comment at server.conf:418-424 documents exactly this filling the root filesystem; `/` holds 109G free. /winget/api/ (678-693) correctly lacks the override, as the finder implies.

---

### 114. Legacy webroot fallback also exposes an nginx config copy and the formerly subnet-restricted /dren/ tree

**Security · medium** · `nginx/server.conf:763`

```
location @legacy_files {
    root /var/www/html;
    autoindex off;
```

**What it is.** Beyond the key material above, /var/www/html contains `conf.d/apensupport.conf` (a 5.6 KB nginx config copy exposing internal subnets, backend ports and ACL structure) and `dren/` (DREN admin area with a 272 MB Trellix install bundle). The legacy config (nginx/apensupport.legacy.conf:261-268) restricted `/dren/` to specific subnets; the new server.conf has no /dren/ location, so `/dren/trellix/dren-trellix-install.tar.gz`, `/conf.d/apensupport.conf`, `/ansible/*.whl` etc. all fall through `location /` to `@legacy_files` with only the general login gate. Note the two-segment regex (line 662) captures paths like `/dren/trellix/` and renders the custom-pages shell instead, so exposure is path-shape dependent and confusing to reason about.

**Impact.** Internal configuration details and admin-only artifacts are available to every authenticated user; the previous network restriction on /dren/ was silently lost in the port.

**Fix.** Enumerate the legacy subtrees that must remain reachable (downloads, repos, certs .crt/.pem, videos, docs) and expose only those via explicit `^~` locations with `root /var/www/html`; delete or move `conf.d/`, `dren/` and other admin/config material out of the webroot; re-add a subnet or admin-acl gate for /dren/ if it must stay.

> **exploitability review — upheld** (high confidence). Every claim reproduces. nginx/server.conf:762-765 is verbatim `location @legacy_files {` / `root /var/www/html;` / `autoindex off;` (finder anchored 763; the block opens at 762 — trivial off-by-one). server.conf:756 `try_files $uri $uri.html $uri/index.html @legacy_files;` in `location /` (744). `grep -n dren nginx/server.conf` returns zero hits, while nginx/apensupport.legacy.conf:261-267 has `location /dren/ {` + four `allow` lines + `deny all;` — the subnet gate is genuinely gone. New server.conf has no server-level allow list either (only 237/242 `allow all;`, 924 `deny all;` for dotfiles), so the legacy 91-97 subnet ACL is gone too. Artifacts exist: /var/www/html/conf.d/apensupport.conf (5659 B, contains `allow 140.32.70.0/23;`, cert paths, backend ports) and /var/www/html/dren/trellix/dren-trellix-install.tar.gz (272416990 B). Reachability: neither the 662 two-segment regex (dots in `conf.d`/`.conf`) nor the 923 `~ /\.` deny matches `/conf.d/apensupport.conf`, so it lands in `location /` → @legacy_files. Gate is only server-level `auth_request /internal/authcheck;` (195), which @legacy_files inherits (comment at 633-635 confirms it is "gated"). `diff -q` of /etc/nginx/conf.d/apen_support/server.conf vs repo: identical — this is live.

---

### 115. Mirror control panels (write paths) are gated only by general login plus a 3-host denylist, not the admin allowlist

**Security · medium** · `nginx/server.conf:771`

```
location /cran-control/ {
    include /etc/nginx/conf.d/apen_support/blocked-hosts.inc;
    proxy_pass         http://127.0.0.1:8080/;
```

**What it is.** `/cran-control/` (771), `/pip-control/` (809) and `/iso-control/` (898) proxy to FastAPI panels that trigger repo syncs; blocked-hosts.inc describes them as 'change paths'. Each includes only blocked-hosts.inc (three deny lines) and inherits the site-wide auth_request, so every LDAP user from every non-barred IP reaches them, whereas /admin and /api/admin/* require admin-acl.inc (four workstations). The panel sources are not in this repo or customsh, so I could not confirm whether they carry their own authentication; X-Forwarded-For is appended (`$proxy_add_x_forwarded_for`, line 778), so any panel-side IP check would also be spoofable.

**Impact.** Any general (non-admin) user can open the mirror control panels and, if the panels have no auth of their own, start/stop long-running syncs of the CRAN/PIP/ISO mirrors that the whole enclave depends on.

**Fix.** Include admin-acl.inc (and `error_page 403 =404 /404.html`) in all three control locations, or at minimum require an admin-kind session; send X-Forwarded-For as $remote_addr.

> **exploitability review — upheld** (high confidence). Evidence verified verbatim at nginx/server.conf:771-773 (`location /cran-control/ {` / `include ...blocked-hosts.inc;` / `proxy_pass http://127.0.0.1:8080/;`), /pip-control/ at 809, /iso-control/ at 898, `$proxy_add_x_forwarded_for` at 778. Neither block includes admin-acl.inc; the site-wide `auth_request /internal/authcheck;` (server.conf:195) only requires a general-or-admin session, and admin-acl.inc's four-workstation allowlist appears only at /admin (251), /test (261) and /api/admin/* (339, 346, 375, 430, 449). The finder's one uncertainty resolves against the panels: grep for auth/session/cookie/token/password/login over /var/www/cran-control/app/*.py returns only `start_new_session=True` (server.py:131) — no auth at all — and /var/www/customsh/lockdown/apply-lockdown.sh:7-8 calls them "the unauthenticated Docker control panels (cran/pip/iso-control, netdiag) that bypass nginx". Worse, docker-compose.yml:13 publishes `"8080:8080"` on 0.0.0.0, and server.py:240 exposes `@app.get("/api/run/{job}")` — a GET that spawns the sync subprocess — plus /api/cancel and /api/logs/{job}/delete.
>
> *Correction:* Confirmed and understated. The three mirror control locations are gated only by blocked-hosts.inc plus the general login gate, so any LDAP user from any non-barred IP reaches them. The finder's open question — whether the panels carry their own auth — resolves in the worst direction: /var/www/cran-control/app/server.py has no authentication of any kind, exposes `@app.get("/api/run/{job}")` (server.py:240, a state-changing GET, hence also CSRF-triggerable from any page a logged-in target visits) along with /api/cancel, /api/logs/{job}/delete and /api/settings/timezone, and docker-compose.yml:13 binds port 8080 on 0.0.0.0 rather than loopback (confirmed by the host listener list), so the nginx gate can be skipped entirely by hitting the host port directly. apply-lockdown.sh:7-8 documents this and mitigates it only by nft-dropping the three barred IPs. The fix needs both halves: admin-acl.inc (+ `error_page 403 =404 /404.html`) on the three locations, and binding the containers to 127.0.0.1.

---

### 116. Transitive dependency runs a postinstall script that prepares native binaries, with nothing pinning it

**Security · medium** · `package.json:41`

```
"devDependencies": {
```

**What it is.** I scanned every installed package manifest for preinstall/install/postinstall hooks. Exactly one has any: node_modules/unrs-resolver/package.json declares `"postinstall": "node postinstall.js"`, and that script is `const { checkAndPreparePackage } = require("napi-postinstall"); checkAndPreparePackage(packageJson, true);` — napi-postinstall 0.3.4, which resolves and prepares platform-specific native binary packages at install time. unrs-resolver 1.12.2 arrives transitively through eslint-config-next 16.3.2 -> eslint-import-resolver-typescript (`^3.5.2`), i.e. via a caret on a caret with no lockfile anywhere in the chain.

**Impact.** `npm install` on this host executes install-time code from a package whose exact version is chosen fresh from the registry on every install, which in turn fetches and prepares native binaries. This is the standard npm supply-chain execution path, and it is the least-pinned part of the tree: nothing in the repo constrains which unrs-resolver, napi-postinstall, or native binary package gets executed.

**Fix.** Pin the tree with a lockfile so the postinstall chain is reproducible and auditable. If install-time execution is unacceptable on the production host at all, run installs with `--ignore-scripts` and verify the eslint import resolver still functions, or build dependencies off-host and ship the tree.

> **exploitability review — upheld** (high confidence). Every quoted fact checks out. package.json:41 is `  "devDependencies": {` (sed -n '41p'); no package-lock.json exists on disk or in `git ls-files`, and no .npmrc anywhere, so installs hit the public registry. node_modules/unrs-resolver/package.json:33 has `"postinstall": "node postinstall.js"`, and postinstall.js:1 is `const { checkAndPreparePackage } = require("napi-postinstall");`; napi-postinstall is 0.3.4. Chain confirmed: eslint-config-next 16.3.2 -> `"eslint-import-resolver-typescript": "^3.5.2"` -> installed 3.10.1 -> `"unrs-resolver": "^1.6.2"`. My own scan of all 323 installed manifests found unrs-resolver as the only pre/install/postinstall hook (others are `prepare`, which does not run for registry tarballs). Exploitability: not reachable via nginx or either loopback proxy — it fires only on install. But installs do happen here: /var/www/customsh/siteupdate.sh:146 runs `npm run reinstall`, i.e. package.json:22 `"clean": "rm -rf .next node_modules package-lock.json"` then `npm install`, on this production host. Operator-run, not cron.
>
> *Correction:* The finding is accurate but understates the mechanism and its recommendation is incomplete. It is not attacker-triggerable over HTTP — no nginx location, admin ACL path, or site-stats.mjs handler reaches it; it fires only during `npm install`. However installs are a live, routine operation on this production box: /var/www/customsh/siteupdate.sh:146 runs `npm run reinstall`, which is package.json:22 `"clean": "rm -rf .next node_modules package-lock.json"` followed by `npm install` against the default public registry (no .npmrc anywhere). So the exposure is not merely "nothing pins unrs-resolver" — the deploy script deliberately deletes any lockfile before every reinstall, meaning the finder's recommendation to "pin the tree with a lockfile" is inert unless siteupdate.sh and the `clean`/`reinstall` scripts change too. Also, unrs-resolver's postinstall is only today's single lifecycle hook (confirmed across all 323 installed manifests); the underlying issue is that the entire tree is refetched unpinned from the public registry on each deploy, so any future package that adds an install hook inherits the same code-execution path as the operator running siteupdate.sh. Medium is the right severity: it needs an upstream registry compromise plus an operator-initiated reinstall, not a request from a user.

---

### 117. Upload extension denylist misses XML-family types and .svgz that browsers execute on the site origin

**Security · medium** · `proxy/file-library.mjs:48`

```
'html', 'htm', 'xhtml', 'js', 'mjs', 'svg', 'htaccess', 'htpasswd',
  'conf', 'service', 'so',
```

**What it is.** The module's own rationale (lines 40-43) is that an .html/.svg in the webroot 'runs on the site origin and can read an admin's session', so those are banned. But the list omits several types nginx serves inline with an XML/HTML-capable MIME type (/etc/nginx/mime.types: `text/xml xml;`, `image/svg+xml svg svgz;`, plus atom, rss, xspf, mml, wml, htc). Uploaded files are served by nginx from /var/www/html via @legacy_files (server.conf:762-766) with no Content-Disposition: attachment, and the CSP (nginx/security-headers.inc:9) allows script-src 'unsafe-inline'. An .xml file whose root element is in the XHTML namespace (or that references an xml-stylesheet) executes script when opened; a plain-text SVG named .svgz is served as image/svg+xml with no Content-Encoding and renders as an SVG document. 'xml' is already allowed in three built-in targets (lines 74, 90, 152) and any custom location may allow svgz/rss/atom/xspf because validateLibraryDir only consults FORBIDDEN_EXTENSIONS (line 316). nosniff does not help because the declared type is already XML.

**Impact.** An admin (or anyone holding an admin session/token) can plant a same-origin script document that runs in the browser of any visitor or other admin who opens the link, defeating the module's stated boundary; .svgz is a direct bypass of the .svg ban.

**Fix.** Add xml, svgz, rss, atom, xspf, mml, wml, htc (and xsl/xslt) to FORBIDDEN_EXTENSIONS, or better, have nginx add `Content-Disposition: attachment` plus `Content-Type: application/octet-stream` for the download tree so served files can never render inline. Extend tests/file-library.test.ts:146-152 to cover these.

> **exploitability review — upheld** (high confidence). Evidence is verbatim at proxy/file-library.mjs:48-49 ("'html','htm','xhtml','js','mjs','svg','htaccess','htpasswd',"), under the stated rationale at :41-43. Chain confirmed: 'xml' is allowed by built-in targets at :74, :90, :152; safeLibraryName (:438-461) gates only on entry.extensions and never re-checks FORBIDDEN_EXTENSIONS, which is consulted solely at :316 for custom dirs — so svgz/rss/atom/xspf/htc are acceptable custom extensions. /etc/nginx/mime.types:5 "text/xml xml;" and :20 "image/svg+xml svg svgz;"; no gzip_static, default_type or Content-Disposition covers the download tree (grep over nginx/*.conf,*.inc). Files land in LIBRARY_ROOT=/var/www/html (:25) and are served by location @legacy_files (nginx/server.conf:762-766). CSP (nginx/security-headers.inc:9) permits script-src 'self' 'unsafe-inline'. What I do downgrade: writing requires an admin-kind session plus CSRF (site-stats.mjs:2046-2060) behind admin-acl.inc:19-27 at server.conf:429-430. An actor with that already controls the .exe/.iso files users download and execute, so same-origin script is a smaller incremental capability — real, cheap to fix, but low.
>
> *Correction:* The technical claim is accurate as written and confirmed at every cited location: FORBIDDEN_EXTENSIONS (proxy/file-library.mjs:45-51) omits xml, svgz, rss, atom, xspf, mml, wml, htc and xsl/xslt, 'xml' is already allowed by three built-in targets (:74, :90, :152), upload-time validation only consults the per-target allowlist (safeLibraryName, :438-461) while FORBIDDEN_EXTENSIONS is checked solely for custom locations (:316), and nginx serves the result inline from /var/www/html via @legacy_files (nginx/server.conf:762-766) with text/xml or image/svg+xml and no Content-Disposition, under a CSP that allows 'unsafe-inline' (nginx/security-headers.inc:9). The correction is to severity, not substance: reaching the write requires an admin-kind session with a matching CSRF token (proxy/site-stats.mjs:2046-2060) arriving from an IP in nginx/admin-acl.inc:22-26 (enforced on location = /api/admin/file-upload, server.conf:429-430). Anyone who clears that bar can already replace the .exe/.msi/.iso installers the site tells users to download and run, so planting a same-origin script document is a marginal escalation rather than a new attacker capability — it is a defense-in-depth inconsistency with the module's own stated boundary (and .svgz is a literal bypass of the .svg ban), worth the one-line list fix, but low rather than medium.

---

### 118. Username-box contents (which the code admits may be a fat-fingered password) are written to pm2 stdout on every rejected sign-in

**Security · medium** · `proxy/site-stats.mjs:1876`

```
const line = `[site-stats] ${severity === 'spoof' ? 'SPOOF ATTEMPT' : 'Rejected sign-in'}: reason="${reason}" typed="${event.typed}" ip="${event.ip}"`
  if (severity === 'spoof') console.error(line)
  else console.warn(line)
```

**What it is.** recordAuthEvent deliberately keeps auth-events.json at 0600 because, per its own comment (lines 1820-1824), the `typed` field 'is whatever was in the USERNAME box, and a user who fat-fingers their password into that box would otherwise leave it world-readable'. The same value is then printed to the console, which pm2 captures into ~/.pm2/logs/*.log (not 0600, and routinely shipped/tailed). ldapAuthenticate does the same for every failed bind at line 2007 (`failed for "${normalized}"`). The password field itself is never logged, so this is a secondary leak, not a direct one.

**Impact.** Passwords accidentally entered in the username field end up in world-readable pm2 log files and in any log aggregation, defeating the 0600 protection the file store was given.

**Fix.** Log only the reason, realm and IP to the console (or a truncated/hashed form of `typed`), leaving the full typed value in the 0600 auth-events.json; apply the same to the line-2007 warn.

> **exploitability review — upheld** (high confidence). Evidence verbatim at proxy/site-stats.mjs:1876-1878 (`const line = ... typed="${event.typed}" ...`; console.error/warn). The 0600 rationale is real at 1821-1824. Reachability confirmed end to end: nginx/server.conf:394-399 serves `/api/auth/login` with `auth_request off` (no admin ACL, only feedback_limit 2r/m), site-stats.mjs:2943-2950 calls recordAuthEvent with `typed: username` whenever the parser set a severity, and proxy/ldap-domain.mjs:203 classifies a name with no domain separator as severity 'format' — which is exactly the shape of a password typed into the username box. So the fat-finger case does reach the console.warn. Two corrections: (a) pm2 logs are not world-readable here — `/home/dod_admin` is drwxr-x--- and the logs are 0644/0664, so exposure is root + group dod_admin + any log shipping, not "world"; (b) the line-2007 warn cannot carry a password: `normalized` only reaches the bind after ldap-domain.mjs accepts a DOMAIN\user form, so unqualified input returns at site-stats.mjs:1925 first. No remote attacker can read the logs; this is local/aggregation hygiene, not an exploitable path.
>
> *Correction:* The core claim holds: proxy/site-stats.mjs:1876 prints the raw username-box contents to the process log on every parser-rejected sign-in, and because proxy/ldap-domain.mjs:203 classifies a domainless name as severity 'format', a password fat-fingered into the username box does hit that path via the unauthenticated /api/auth/login location (nginx/server.conf:394). But the stated impact is overstated in two ways: the pm2 logs are 0644/0664 inside a drwxr-x--- /home/dod_admin, so they are readable by root and group dod_admin (and anything tailing/shipping them), not world-readable; and the second cited site, site-stats.mjs:2007, can never contain a password, since parse failures return at site-stats.mjs:1925 before any bind and only well-formed DOMAIN\user names reach that warn. Net: a real but low-severity log-hygiene leak reachable only by someone who already has local or aggregated log access, not by a remote attacker.

---

### 119. OR-filter on sAMAccountName|userPrincipalName can select an account other than the one that bound

**Security · medium** · `proxy/site-stats.mjs:1970`

```
const clauses = [`(sAMAccountName=${escapeLdapFilter(identity.sam)})`]
if (identity.upn) clauses.push(`(userPrincipalName=${escapeLdapFilter(identity.upn)})`)
const entry = searchEntries[0]
```

**What it is.** For the realm's default domain the bind name is `sam@blcse.mil` (a UPN). AD resolves a UPN bind by explicit userPrincipalName first and only falls back to the implicit `sAMAccountName@dnsdomain`. The membership search, however, matches EITHER attribute and takes `searchEntries[0]` (sizeLimit 5). If account A has sAMAccountName `testuser` and account B has an explicit UPN `testuser@blcse.mil`, the bind authenticates B while the search may return A first, so A's `memberOf` (and A's DN in the `(member=...)` fallback at line 1989) decides whether B's session is admin. The session is also recorded as `username: identity.sam`, not the account that actually authenticated.

**Impact.** Privilege decision and audit identity can be taken from an account that did not present the password. Requires an explicit UPN colliding with another account's sAMAccountName, which is unusual but entirely within a normal admin's power to create (UPNs are free-form in ADUC).

**Fix.** Match on exactly one key that mirrors how the bind was resolved: for a UPN bind filter on userPrincipalName only and fall back to sAMAccountName only when that returns nothing; or use the Who-Am-I extended op to learn the bound DN and search by DN. Reject the login (or downgrade to 'general') when more than one entry comes back.

> **exploitability review — upheld** (medium confidence). Evidence is verbatim at proxy/site-stats.mjs:1970-1974: `const clauses = [(sAMAccountName=...)]`, `if (identity.upn) clauses.push((userPrincipalName=...))`, `filter = (|...)`, `search(searchBase, {... sizeLimit: 5})`, `const entry = searchEntries[0]`. No length>1 guard; the `(member=${entry.dn})` fallback at :1989 reuses that same entry, and :2002 returns `username: identity.sam`, stored as the session identity at :2977. ldap-domain.mjs:229 and :243 confirm the default-domain bind is `{username}@blcse.mil` and that `identity.upn` equals that bind name, so filter and bind genuinely use different resolution rules. Reachability: nginx/server.conf:393-399 `location = /api/auth/login` has `auth_request off` and no admin-acl, so any visitor hits it. But exploitation is not attacker-initiated: it needs an AD account whose explicit userPrincipalName equals another account's sAMAccountName@blcse.mil — created only by a domain admin in ADUC, not by the attacker. And an escalated admin session still cannot use admin capability: server.conf:250 (/admin) and the `^~ /api/admin/` block include admin-acl.inc (IP allowlist). Real defect, much narrower than "medium".
>
> *Correction:* The code defect is confirmed: proxy/site-stats.mjs:1972-1974 builds an OR filter over sAMAccountName and userPrincipalName and blindly takes searchEntries[0] (sizeLimit 5, no ambiguity check), while the bind at :1952 used only identity.bindName (`{sam}@blcse.mil` per ldap-domain.mjs:229). If AD holds two accounts where one's explicit UPN equals the other's implicit UPN, the account that authenticated and the account whose memberOf decides `inAdminGroup` (:1976) and whose DN feeds the `(member=...)` fallback (:1989) can differ, and the session is recorded under the typed sAMAccountName (:2002, :2977) rather than the bound account. However this is not attacker-reachable on its own: the collision must be created by an AD administrator, no attacker input can produce it (ldap-domain.mjs rejects UPN-form input, mixed forms, and LDAP metacharacters before any bind), and even a wrongly-granted admin session is still fenced from every admin surface by the nginx IP allowlist on /admin (nginx/server.conf:250-251) and on /api/admin/*. Treat it as a correctness/audit-integrity hardening item (low), not a medium-severity privilege-escalation path.

---

### 120. Chat transcripts are retained indefinitely, keyed to the AD username, and every user's transcript is readable in full by any admin

**Security · medium** · `proxy/site-stats.mjs:3085`

```
if (chatHistoryStorage.length > CHAT_HISTORY_MAX_RECORDS) {
          chatHistoryStorage.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
          chatHistoryStorage.length = CHAT_HISTORY_MAX_RECORDS
```

**What it is.** Each transcript record (proxy/site-stats.mjs:3073-3079) stores realm, username, startedAt, updatedAt and up to 40 messages of 20,000 chars each (CHAT_HISTORY_MAX_MESSAGES/CHAT_HISTORY_MAX_MESSAGE_CHARS, :339-340). The only bound is CHAT_HISTORY_MAX_RECORDS = 5000 (:341), and this eviction runs *only* inside the else-branch that creates a new record — a returning user's transcript is updated in place (:3070-3072) and can therefore sit in the file forever, never aged out. There is no time-based purge and no user-facing delete; the only deletion is the admin DELETE at :3576-3589. Meanwhile /api/admin/chat-history returns the entire store to any admin session: line 3572 `res.end(JSON.stringify({ transcripts: chatHistoryStorage }))` — every user's full conversation text, unredacted, with no per-record justification, no purpose limitation and no audit entry recording that an admin read it (appendAuditEntry at :921 is not called on this route).

**Impact.** A user's whole assistant conversation history — questions, pasted config, attachment names — is retained indefinitely under their AD username and is bulk-readable by any admin. Nothing tells the user this at the point of collection, and privacy-security.tsx claims collection is "solely for authentication and security auditing".

**Fix.** Add an age-based purge (e.g. drop records whose updatedAt is older than a documented retention period) that runs on every write, not just on insert; log admin reads of /api/admin/chat-history via appendAuditEntry; and disclose the retention period and admin visibility in the privacy notice and in the chat widget.

> **exploitability review — upheld** (high confidence). Evidence confirmed verbatim. proxy/site-stats.mjs:3083-3086 is the quoted eviction, and it sits only in the `else` (new-record) branch — the update path is :3070-3073 (`existing.messages = messages`), so records under the 5000 cap (:341) are never aged out. :3572 `res.end(JSON.stringify({ transcripts: chatHistoryStorage }))` returns every transcript; no appendAuditEntry (:921) on that GET. Key is realm::username (:357-359). Stronger than reported: clearChat (components/ui/APEN-chat-assistant.tsx:1014-1020) only resets local state, and the write-through effect skips empty arrays (:613 `if (!isVisible || !messages.length) return`), so "Clear chat" never erases the server copy and it rehydrates on next open (:631). Two corrections. (1) No attacker path: nginx/server.conf:448-450 puts /api/admin/* behind admin-acl.inc plus error_page 403=404, and authorizeAdmin (:2046-2065) needs an admin-kind session (CSRF on DELETE) or the nginx-injected token; the per-user route (:3043-3051) is same-origin + session-scoped. (2) "Nothing tells the user" overstates: the panel shows "USG Information System: No Expectation of Privacy. Consent to Monitoring." (APEN-chat-assistant.tsx:1613). privacy-security.tsx:9 quote is accurate.
>
> *Correction:* Accurate as a privacy/retention governance gap, not a reachable vulnerability. Confirmed: transcripts are keyed to realm::username (proxy/site-stats.mjs:357-359), the 5000-record eviction runs only when a new record is inserted (:3083-3086), so an active user's transcript never ages out; /api/admin/chat-history dumps every transcript (:3572) with no appendAuditEntry; the only deletion is the admin DELETE (:3576-3589), and client "Clear chat" (components/ui/APEN-chat-assistant.tsx:1014-1020) clears only local state because the write-through skips empty message arrays (:613), so the server copy survives and rehydrates (:631). But exploitability is nil: the bulk read is behind nginx admin-acl.inc with error_page 403=404 (nginx/server.conf:448-450) plus authorizeAdmin's admin-kind session or injected token (:2046-2065), and the per-user route is same-origin and session-scoped (:3043-3052), so no cross-user or unauthenticated read exists. The claim that users are told nothing at collection is wrong — the panel carries "USG Information System: No Expectation of Privacy. Consent to Monitoring." (APEN-chat-assistant.tsx:1613); what is missing is a stated retention period, a working user-side delete, and reconciliation with privacy-security.tsx:9 ("solely for authentication and security auditing").

---

### 121. Feedback store grows without bound on the public submission path — the 500-record cap exists only on the sibling system-event path

**Security · medium** · `proxy/site-stats.mjs:3244`

```
feedbackStorage.unshift(alert)
        queueNotification(alert)
        commitFeedbackToDisk()
```

**What it is.** The /api/system-event handler trims the shared array immediately after inserting: `feedbackStorage.unshift(alert)` then `feedbackStorage = feedbackStorage.slice(0, 500)` (lines 3196-3197). The /api/site-feedback handler at 3211-3246 — the one fed by the public feedback form — omits the slice entirely. Every submission (submitter name at :3237 via `data.name`, and `message: data.message` at :3238, which is not even length-capped server-side) is retained forever in proxy/feedback-history.json. There is no purge, no age-based expiry and no admin delete endpoint for feedback; a repo-wide grep for retention/purge/expire logic finds only ADMIN_SESSION_TTL_HOURS (.env.example:125). The same unbounded array is also returned wholesale as `alerts: feedbackStorage` from getUnifiedData (:2777) to /api/site-stats.

**Impact.** Named, free-text personal submissions accumulate indefinitely with no documented or enforced retention schedule — the opposite of the Privacy Act's "maintain only such records as are relevant and necessary" and a growing disclosure surface every time the file is backed up, bundled, or served through /api/site-stats. It is also a slow unbounded-growth defect: the whole array is re-serialized to disk on every POST.

**Fix.** Apply the same `feedbackStorage = feedbackStorage.slice(0, 500)` (or an age-based purge matching a documented retention period) on the /api/site-feedback path, cap `data.message` server-side, and publish the retention period in privacy-security.tsx.

> **exploitability review — upheld** (high confidence). Evidence verified verbatim. proxy/site-stats.mjs:3244-3246 is exactly `feedbackStorage.unshift(alert)` / `queueNotification(alert)` / `commitFeedbackToDisk()` with no slice; the sibling /api/system-event path does trim at :3196-3197 (`feedbackStorage = feedbackStorage.slice(0, 500)`). `message: data.message` at :3239 is stored uncapped (name is at :3238, not :3237 as cited). Load at :323-327 does not trim; commitFeedbackToDisk (:2246-2249) re-serializes the whole array per POST. The only admin removal path is /api/admin/dismissed-alerts (:3501-3562), which only appends to a `dismissals` list — records are never deleted. Exploitability holds but is narrower than stated: nginx/server.conf:286-292 gives the route `client_max_body_size 64k` and `limit_req zone=feedback_limit burst=3` (2r/m per IP, server.conf:36), and it has no `auth_request off`, so it inherits the site-wide gate at server.conf:195 — any logged-in site user, not an anonymous attacker. The read-back channel /api/site-stats is admin-ACL gated (server.conf:374-375).
>
> *Correction:* Accurate in substance, with two scope corrections. (1) The submission path is not anonymous-public: nginx/server.conf:286 has no `auth_request off`, so it inherits the site-wide `auth_request /internal/authcheck` (server.conf:195) — any authenticated site user can post, and nginx bounds each post to 64k with a 2/minute per-IP limit, so growth is slow rather than instantly floodable. (2) The retained data is not exposed publicly: /api/site-stats is gated by admin-acl.inc (server.conf:374-375), so `alerts: feedbackStorage` (:2777) reaches only allowlisted admin workstations. What stands: /api/site-feedback (:3244-3246) omits the `slice(0, 500)` its sibling /api/system-event applies (:3196-3197), `message: data.message` (:3239) and the submitter name (:3238) are stored uncapped server-side, nothing prunes on load (:323-327), and the only admin control is /api/admin/dismissed-alerts (:3501-3562) which merely hides entries from the view — so named free-text submissions persist in proxy/feedback-history.json indefinitely, and commitFeedbackToDisk (:2246-2249) synchronously re-serializes the entire growing array on every submission.

---

### 122. /api/notification-settings POST, /api/acknowledged-alerts POST and /api/site-stats GET skip authorizeAdmin (any general session on an allowlisted IP)

**Security · medium** · `proxy/site-stats.mjs:3598`

```
if (req.method === 'POST' && url === '/api/notification-settings') {
    let body = ''
    req.on('data', c => { body += c.toString() })
```

**What it is.** These routes are listed in ADMIN_ONLY_ROUTES (line 2429) and described as admin-only, but unlike every /api/admin/* handler they never call authorizeAdmin(). Their only protection is nginx's admin-acl.inc IP allowlist (server.conf 338-350, 374-378) plus the site-wide auth_request, which any 'general' LDAP session satisfies. So a non-admin user signed in from an allowlisted admin workstation (or any local process talking to 127.0.0.1:8788 directly, where nginx is not in the path) can change the alert delivery email (normalizeNotificationSettings at 2203 accepts any string), acknowledge/clear alerts, and read the full admin stats payload. No CSRF token is checked on these writes and the body is accumulated without a size cap in the proxy (nginx's 1 MiB default is the only limit).

**Impact.** Privilege boundary between 'general' and 'admin' sessions is bypassable for these three endpoints; an attacker could redirect admin alert e-mail to a mailbox they control or blind the alert queue. Requires an allowlisted source IP or local access, which bounds the blast radius.

**Fix.** Add `if (!authorizeAdmin(req)) { 401 }` at the top of all three handlers (same pattern as line 3297), read bodies via readJsonBody(req), and consider moving them under /api/admin/ so the nginx token/ACL block covers them uniformly.

> **exploitability review — upheld** (high confidence). Evidence confirmed verbatim at proxy/site-stats.mjs:3598-3600 (`if (req.method === 'POST' && url === '/api/notification-settings') {` + raw `req.on('data', ...)`), :3269 (same pattern for acknowledged-alerts POST) and :3618 (`/api/site-stats` GET). None of the three calls authorizeAdmin; grep shows the nearest authorizeAdmin gates are at :3644 and :3297, both on /api/admin/* routes. ADMIN_ONLY_ROUTES at :2429 lists all three. Request path traced: nginx/server.conf:338-350 and 374-378 include admin-acl.inc and error_page 403=404 but, unlike the ^~ /api/admin/ block (448-455), do NOT inject x-admin-token. Site-wide auth_request (server.conf:195) hits /internal/authcheck, which at site-stats.mjs:2832-2839 accepts any session from findSessionByCookie (:1779) — general or admin kind. So a general-kind session from one of the 4 allowlisted IPs (or 127.0.0.1) reaches the handlers with no admin check. normalizeNotificationSettings (:2203) accepts any string emailAddress. Reachable, real.
>
> *Correction:* Accurate except for one nuance: the session cookie is set with SameSite=Strict (proxy/site-stats.mjs:1754), so the missing CSRF check on these two writes is not remotely exploitable from an attacker-controlled page — the practical exposure is an authenticated non-admin ('general' kind) user sitting at one of the four allowlisted admin workstations in nginx/admin-acl.inc, or any local process on the box reaching 127.0.0.1:8788 directly. The core defect stands: all three handlers skip authorizeAdmin despite being declared admin-only at line 2429, and their bodies are accumulated unbounded rather than via readJsonBody (nginx's implicit 1m default is the only cap, since server.conf sets no client_max_body_size on those three locations).

---

### 123. POST /api/notification-settings has no authorizeAdmin check (missing authorization + no CSRF)

**Security · medium** · `proxy/site-stats.mjs:3598`

```
if (req.method === 'POST' && url === '/api/notification-settings') {
    let body = ''
```

**What it is.** The handler writes notificationSettings (including the admin alert email address and whether alerts are delivered) directly, calling neither authorizeAdmin() nor any session-kind/CSRF check — unlike every /api/admin/* route. Access is gated only by nginx admin-acl.inc (an IP allowlist) plus the site-wide auth_request (which accepts ANY valid session, including a non-admin 'general' one). Admin workstations are shared, so a user who authenticates from an allowlisted IP with only a general session — explicitly NOT admin per the authorizeAdmin contract — can change where admin alert emails are sent or disable notifications entirely. The GET at line 3253 and /api/acknowledged-alerts POST at 3269 share the same gap.

**Impact.** A non-admin authenticated user on an allowlisted admin workstation can redirect or silence the admin notification pipeline (e.g. point alert email at an attacker address, or disable feedback/system-event alerts), with no admin-kind or CSRF enforcement.

**Fix.** Call authorizeAdmin(req) at the top of the notification-settings POST/GET and acknowledged-alerts POST handlers, exactly as the /api/admin/* routes do, so writes require an admin-kind session and CSRF token.

> **exploitability review — upheld** (high confidence). Evidence confirmed verbatim: proxy/site-stats.mjs:3598 `if (req.method === 'POST' && url === '/api/notification-settings') {` / `let body = ''`, with no authorizeAdmin (nearest call is :3297); same for GET :3253 and POST /api/acknowledged-alerts :3269. Path is reachable: nginx/server.conf:338-343 `location = /api/notification-settings` includes only admin-acl.inc (IP allowlist of 4 workstations + 127.0.0.1, nginx/admin-acl.inc:22-27) and inherits the site-wide `auth_request /internal/authcheck` (server.conf:195), whose handler (site-stats.mjs:2831-2839) returns 200 for ANY session, not just kind==='admin'. So the authorization gap is real. Two sub-claims fail: (1) CSRF is not exploitable — the session cookie is `SameSite=Strict` (site-stats.mjs:1754), so a cross-site POST carries no cookie and auth_request 401s; (2) impact is overstated — queueNotification only unshifts into an in-process `notificationOutbox` JSON file (2401-2410); nothing in the repo ever sends mail (no nodemailer/smtp/sendmail reference), so no alert email can be redirected. Residual impact: a non-admin session on an admin workstation (or any local process hitting 127.0.0.1:8788 directly) can rewrite the stored recipient/flags and silently acknowledge alerts.
>
> *Correction:* POST/GET /api/notification-settings and POST /api/acknowledged-alerts (proxy/site-stats.mjs:3253, 3269, 3598) genuinely skip authorizeAdmin, and nginx only gives them an IP allowlist (nginx/server.conf:338-350 -> admin-acl.inc) plus the site-wide auth_request, which accepts any session kind (site-stats.mjs:2831-2839). A general-kind (non-admin) session on one of the four allowlisted workstations, or any local process reaching the loopback backend directly, can therefore overwrite notificationSettings and acknowledge alerts. However the "no CSRF" element is refuted: the session cookie is HttpOnly/Secure/SameSite=Strict (site-stats.mjs:1742-1758), so a cross-site forged POST never carries the cookie and is rejected by auth_request. The impact claim is also refuted: notifications are only queued into proxy/notification-outbox.json (site-stats.mjs:2401-2410) and no code path ever sends email, so the alert email address cannot be "redirected" to an attacker; the real effect is limited to tampering with stored alert settings and hiding alerts in the admin console. Severity low; the fix (add authorizeAdmin to these three handlers) is still correct.

---

### 124. Visitor analytics/PII readable without an admin-kind session

**Security · medium** · `proxy/site-stats.mjs:3618`

```
if (req.method === 'GET' && url === '/api/site-stats') {
    try {
      const data = await getUnifiedData()
```

**What it is.** GET /api/site-stats returns getUnifiedData(), which includes per-connection client IP lists, per-location drill-downs, top IPs and feedback alerts, but performs no authorizeAdmin() check. It is protected only by nginx admin-acl.inc (IP allowlist) and the site-wide session gate that accepts any 'general' session. Same pattern for GET /api/acknowledged-alerts (line 3263) and GET /api/notification-settings (line 3253). The codebase's own authorizeAdmin comment states a general session 'must NOT pass here', yet these read routes never invoke it.

**Impact.** Any non-admin authenticated user on an allowlisted admin workstation can read the site's visitor analytics including individual client IP addresses and browsing paths, plus the admin notification configuration.

**Fix.** Add authorizeAdmin(req) to these admin-only GET handlers so a general (non-admin) session cannot read admin analytics/config.

> **exploitability review — upheld** (high confidence). Evidence confirmed verbatim. proxy/site-stats.mjs:3618 `if (req.method === 'GET' && url === '/api/site-stats') {` / 3619-3620 `try { const data = await getUnifiedData()` — no authorizeAdmin in the block (3618-3625). Same for GET /api/notification-settings (3253-3261) and GET /api/acknowledged-alerts (3263-3266). getUnifiedData (2724-2783) returns `topIPs`, `bucketIPs` ("One connection list per chart bucket", 2766-2772) and `alerts: feedbackStorage` — real PII. Request path: nginx/server.conf:374-379 `location = /api/site-stats { include .../admin-acl.inc; ... proxy_pass http://stats_backend/api/site-stats;` and server.conf:338-350 for the other two; the only other control is the server-wide `auth_request /internal/authcheck;` (server.conf:195), whose handler (site-stats.mjs:2831-2837) 200s on ANY session regardless of kind. So reachable with a general-kind LDAP session from an allowlisted IP (nginx/admin-acl.inc: 4 workstations + 127.0.0.1). ACL uses $remote_addr — no real_ip_header anywhere in nginx/, so not header-spoofable. Violates the stated invariant at 2039-2041 ("must NOT pass here"). Insider-scoped, so medium is right.

---

### 125. Content-override values stored and served publicly with no sanitization

**Security · medium** · `proxy/site-stats.mjs:4244`

```
const value = scope === ROUTE_IMAGE_OVERRIDE_SCOPE
        ? sanitizeRouteImageRegistry(data.value)
        : data.value
```

**What it is.** For every scope except the route-image registry, the admin-supplied override value is stored verbatim (data.value) with no validation, then exposed unauthenticated at GET /api/content-overrides (line 4207-4218) where the static site consumes it to override page content. Unlike custom-page cards (whose href/backHref go through sanitizeDownloadHref/sanitizeInternalPath), override values receive no href/scheme scrubbing. If any consuming component renders an override-provided URL into an href/src or HTML, a `javascript:`/`data:` URL or markup becomes a stored XSS or open-redirect served to every visitor. No dangerouslySetInnerHTML sink consuming overrides was found (CustomPageView renders text via React escaping), so exploitation depends on a client sink, but the trust boundary stores fully attacker-shaped data with no scheme validation.

**Impact.** An admin (or anything with an admin session) can persist arbitrary unsanitized values that are served to all visitors; combined with any URL/HTML sink on the site this is stored XSS or an open redirect affecting every user.

**Fix.** Validate/normalize override values per known scope (at minimum run any URL-bearing fields through sanitizeDownloadHref and strip/escape HTML), rather than storing data.value raw.

> **exploitability review — upheld** (high confidence). Evidence verified verbatim at proxy/site-stats.mjs:4242-4244 ("const value = scope === ROUTE_IMAGE_OVERRIDE_SCOPE ? sanitizeRouteImageRegistry(data.value) : data.value"), stored at 4245 and re-served unauthenticated at 4207-4218 (nginx/server.conf:329-331 gives that location `auth_request off;`). The finder understated the sink: override values deep-merge into card objects (lib/data/admin-content.ts:199 applyScopeOverride) whose href renders at components/cards/DocumentationCards.tsx:45 `<a href={link.href} ...>`, so a scheme sink does exist. But the write path is triple-gated: nginx/server.conf:448-449 `location ^~ /api/admin/` includes admin-acl.inc (4 workstation IPs + 127.0.0.1, then `deny all;`), the site-wide auth_request at server.conf:195 is not disabled there, and authorizeAdmin (site-stats.mjs:2046-2065) requires an admin-kind session plus a matching x-csrf-token on POST, explicitly rejecting general-kind sessions. Only a logged-in admin on an allowlisted host can write, and editing page content/links is exactly that role's function. No unprivileged or cross-privilege path exists, so this is defense-in-depth hardening, not medium-severity exploitable stored XSS.
>
> *Correction:* The code claim is accurate: for every scope but site/route-images, proxy/site-stats.mjs:4242-4244 stores the admin-supplied value verbatim and it is re-served unauthenticated from GET /api/content-overrides (server.conf:329, auth_request off). The finder's sink analysis is actually too conservative — an href sink does exist: applyScopeOverride (lib/data/admin-content.ts:199) merges override values into card objects that render at components/cards/DocumentationCards.tsx:45 as `<a href={link.href}>`, and React escaping does not scrub URL schemes, so a javascript: href would persist to every visitor. What is wrong is the severity/exploitability: the only write path is POST /api/admin/content-overrides, which sits behind the nginx workstation IP allowlist (admin-acl.inc, `deny all;` terminated), the site-wide auth_request gate, an admin-kind LDAP session, and a CSRF token (site-stats.mjs:2046-2065, which explicitly refuses general-kind sessions). No unprivileged actor can reach it, and the capability granted — changing site content and links — is the feature's purpose. Treat as low-severity input hardening at an admin trust boundary (run URL-bearing override fields through sanitizeDownloadHref), not an exploitable stored-XSS vulnerability.

---

### 126. Audit records capture no before/after values, no request id, and no completion outcome

**Security · medium** · `proxy/site-stats.mjs:4251`

```
appendAuditEntry({ kind: 'override.set', scope, by: contentOverrides[scope].updatedBy }, req)
```

**What it is.** An audit entry (built at 928-935) holds id, timestamp, kind, an optional short slug, actor, workstation and IP — and nothing about what changed. The route that rewrites arbitrary site content records only the scope key (4251); the assistant system-prompt route records a character count, not the prompt (3451: slug: `${knowledge.length} chars`); announcement roots record only a count (3330). Nothing carries a request id to correlate with the nginx line. Outcome is not captured either: nginx-managed.publish is audited at 4409 immediately after startNginxManagedPublish kicks off the async config write and sudo reload, so a publish whose nginx reload fails is recorded identically to one that succeeded, and failures on other routes (the catch blocks returning 400/500) are recorded nowhere. One call site, rewriteOverrideUrls at line 479, omits the `req` argument entirely, so that entry has no workstation and no IP and falls back to a caller-supplied `by` string.

**Impact.** The log answers 'someone named X touched scope Y' but never 'what did the site say before and after', so an unauthorized content change — including a change to the AI assistant's system prompt, which shapes what the assistant tells every user — cannot be reconstructed or reverted from the audit trail, and a failed privileged operation is indistinguishable from a successful one. This is the AU-3 content-of-records requirement.

**Fix.** Record a hash (or a bounded diff) of the previous and new value on override.set, assistant-prompt.update and announcement-paths.update; add a request id generated per request and echo it in both the audit entry and the nginx log; and log the terminal outcome of async operations (nginx reload result, build result) as a second entry keyed to the first. Pass `req` at line 479.

> **exploitability review — upheld** (high confidence). Every cited line verified verbatim. site-stats.mjs:928-935 builds the entry with only id/at/kind/slug/by/workstation/ip — no before/after, no request id. :4251 is exactly `appendAuditEntry({ kind: 'override.set', scope, by: contentOverrides[scope].updatedBy }, req)`; :3451 `slug: ${knowledge.length} chars`; :3330 `slug: ${announcementPaths.length} roots`; :479 omits the `req` argument. :4409 audits immediately after startNginxManagedPublish, whose reload outcome is set asynchronously in execFile callbacks (:701, :710, :713) into in-memory `nginxReloadStatus` only, never back into the audit log. Facts hold. The exploitability lens lowers severity: every audited route sits behind nginx `^~ /api/admin/` + admin-acl.inc IP allowlist (server.conf:251,261) AND authorizeAdmin (:2046-2056, admin-kind session + CSRF on mutating methods), so no unauthenticated attacker reaches them; this is an insider/compromised-admin forensics gap. Partial compensations: actor comes from the real session (:926), not client input; reload outcome is readable at :4354; override.revert (:4278) restores the code default.
>
> *Correction:* Accurate as to facts, overstated as to severity. Confirmed: audit entries (proxy/site-stats.mjs:928-935) carry no prior/new value, no request correlation id, and no completion outcome; override.set logs only the scope key (4251), assistant-prompt.update only a character count (3451), announcement-paths.update only a root count (3330); nginx-managed.publish is written at 4409 before the async sudo reload resolves, and that outcome only ever lands in the in-memory `nginxReloadStatus` (701/710/713), not the log; and rewriteOverrideUrls (479) calls appendAuditEntry without `req`, so that one entry has no workstation/IP. But this is not attacker-reachable: all of these handlers require authorizeAdmin (2046-2056 — admin-kind session plus an x-csrf-token match on POST/PUT/PATCH/DELETE, or the nginx-injected admin token) and sit behind nginx locations that include admin-acl.inc (nginx/server.conf:251, 261), so only an already-authorized admin workstation can generate any of these records. The real exposure is post-incident reconstruction after insider or credential misuse, mitigated in part because the actor is taken from the LDAP session rather than the client-supplied `updatedBy` (926), the publish outcome is separately readable at 4354, and override.revert (4278) restores the in-code default. Treat as a low-severity AU-3 content-of-records gap, not a medium-severity vulnerability.

---

### 127. One chat request can fan out into 11 upstream LLM completions; only nginx per-IP rate limit protects the model

**Security · medium** · `proxy/voltron-proxy.mjs:424`

```
const chunkSummaries = await Promise.all(chunks.map((chunk, i) =>
    callUpstreamsForText(config, [
```

**What it is.** An attachment up to 400,000 chars is split into 10 × 40k-char chunks summarized in parallel plus a reduce pass (bounded by ATTACHMENT_MAX_CHARS_TO_SUMMARIZE at line 33). The endpoint is gated by the site-wide auth_request and `limit_req zone=voltron_limit ... rate=5r/s burst=10` per source IP (nginx/server.conf:37, 273), so a single signed-in user can drive ~55 concurrent 40k-char completions per second against the shared Voltron backend. There is no per-user quota, no concurrency cap in the proxy, and users behind a shared NAT/VDI egress share one bucket.

**Impact.** Trivial resource exhaustion of the shared Voltron model (and of this proxy's memory: 16 MB bodies are buffered whole) by one authenticated user, degrading the assistant for everyone.

**Fix.** Add a per-session/per-username concurrency and daily-token budget in the proxy (it can read the session cookie like site-stats does), lower the parallelism of chunk summarization (sequential or p-limit 2), and consider a much smaller summarization ceiling.

> **exploitability review — upheld** (high confidence). Every cited location verified verbatim. proxy/voltron-proxy.mjs:424-425 is exactly `const chunkSummaries = await Promise.all(chunks.map((chunk, i) =>` / `callUpstreamsForText(config, [` — unbounded-width Promise.all over chunks of ATTACHMENT_SUMMARY_CHUNK_CHARS=40_000 (line 28) up to ATTACHMENT_MAX_CHARS_TO_SUMMARIZE=400_000 (line 33), i.e. 10 map calls, plus the conditional reduce at line 458. Reachability traced: nginx/server.conf:269-284 `location = /api/voltron-chat` sets `client_max_body_size 16m` and `limit_req zone=voltron_limit burst=10 nodelay` (line 273) against `rate=5r/s` (line 37), and carries no `auth_request off`, so it inherits the server-wide gate at line 195 — any logged-in site user (not admin, no admin-acl.inc, no blocked-hosts exemption) can reach it. sanitizeAttachment (lines 344-357) accepts arbitrary client-supplied `content` up to 10 MB with no type check, and readRequestBody (303-318) buffers the whole 16 MB body in memory. grep for inflight/concurrency/quota/throttle in the proxy returns nothing but a comment at line 371 — no per-user cap exists. Minor nuance only: the reduce pass is conditional (line 451), and callUpstreamsForText fails over across all upstreams (line 375), which can raise the count further.

---

### 128. Upstream LLM error strings are forwarded verbatim to browser clients

**Security · medium** · `proxy/voltron-proxy.mjs:590`

```
...(parsed.error ? { error: typeof parsed.error === 'string' ? parsed.error : 'Upstream error.' } : {}),
          }
          json(res, upstreamResponse.status, safe)
```

**What it is.** For any non-failover status (every 4xx, or the last upstream on 429/5xx) the proxy allowlists response fields but passes `parsed.error` straight through when it is a string. OpenAI-compatible gateways (vLLM, Open WebUI) return errors like 'model X does not exist', 'Invalid API key', or messages embedding the upstream hostname or model id. The file's own comment at line 251 says 'Don't expose raw URL in error response', but this path undoes that.

**Impact.** Leaks internal model names, gateway software identity, auth-state details and potentially internal hostnames to any signed-in visitor, aiding reconnaissance of the Voltron backend.

**Fix.** Replace the passthrough with a fixed generic string ('The AI assistant returned an error.') and log the upstream error text server-side only.

> **exploitability review — upheld** (medium confidence). Evidence is verbatim at proxy/voltron-proxy.mjs:590, inside the `!shouldFailOver || !canFailOver` branch (lines 576-596). Reachability confirmed: nginx/server.conf:269-285 proxies POST /api/voltron-chat to 127.0.0.1:8787 with only limit_req; the site-wide `auth_request /internal/authcheck` (server.conf:195) applies, so any holder of a general LDAP session — not just admins, no admin-acl.inc — reaches it. So the path is real and the forwarded body does contain `error` verbatim.

But the claimed impact is largely wrong. The finder's own examples ("model X does not exist", "Invalid API key") arrive from the gateways the code names at lines 241-243 (Open WebUI, vLLM) as `{"error":{"message":...}}` or a top-level `message` — object-shaped, so line 590's `typeof === 'string'` test replaces them with the fixed "Upstream error." or drops them. Only gateways returning a bare string `error` leak anything. Additionally components/ui/APEN-chat-assistant.tsx:891-902 never reads `data.error`; on `!response.ok` it throws fixed strings, so nothing renders — a raw-response read is required.

Line 255's comment concerns an invalid-config path, not this one.
>
> *Correction:* The code at proxy/voltron-proxy.mjs:590 does forward a string `parsed.error` verbatim to any session-authenticated caller of /api/voltron-chat, so the hardening gap is real — but it is defense-in-depth, not a working leak as described. The allowlist already neutralizes exactly the errors the finding cites: OpenAI-compatible gateways (including the vLLM and Open WebUI upstreams this file names at lines 241-243) return "model does not exist" / "Invalid API key" inside an `error` OBJECT or as a top-level `message`, both of which the ternary replaces with the fixed "Upstream error." Only a gateway that returns `{"error": "<text>"}` as a bare string reaches the passthrough, and which gateway is deployed is .env.local-dependent and unverified. The shipped client (components/ui/APEN-chat-assistant.tsx:891-902) discards the field entirely on non-2xx, substituting fixed messages, so exploitation requires reading the raw HTTP response with a valid session. The referenced comment at line 255 is about an invalid-URL config path and is not undone here. Fix is still cheap and worth taking (drop the passthrough, log server-side), but severity is low.

---

### 129. Vendored lottie_light 5.12.2 has no recorded provenance and sits outside every dependency scanner

**Security · medium** · `public/vendor/lottie_light.min.js:1`

```
return Tt;case"matrix":return Ft;default:return null}},It.version="5.12.2";var Vt=""
```

**What it is.** The 168 KB minified player self-identifies as lottie-web 5.12.2 (extracted from the embedded `.version` assignment). Nothing in the repo records where it came from, which upstream release it corresponds to, or its checksum: NOTICE has no third-party section, and grepping all Markdown for "lottie" yields only exports/tenable-iris/README.md, which describes how to copy the file but never names a version or source URL. It is not an npm dependency, so npm ls, npm audit and any SBOM built from package.json will never see it. components/common/LottieMark.tsx:36-42 injects it as a <script> tag at runtime on every card whose logo is a .json animation.

**Impact.** A third-party JavaScript library executing on every visitor's page is invisible to dependency scanning and has no update or verification path — no one can determine whether this build matches an authentic upstream release or check it against future advisories. Mitigating factors: it is served same-origin from out/ (no third-party runtime fetch), and the `light` build excludes the expression evaluator that is lottie-web's main historical risk surface. The exposure is stale-and-untracked rather than a specific known exploit; I could not consult an advisory database offline.

**Fix.** Add a third-party section to NOTICE recording the package, version 5.12.2, the upstream release URL and the SHA-256 of the file, and check that hash in CI. Evaluate moving to a current lottie-web release, and include vendored assets in whatever SCA covers the npm tree.

> **exploitability review — upheld** (high confidence). Evidence confirmed verbatim: public/vendor/lottie_light.min.js is a single line and grep -c of the exact quoted string returns 1. NOTICE has no lottie/third-party entry; grep -ci lottie package.json = 0 and there is no package-lock.json, so it genuinely sits outside npm audit/SBOM. exports/tenable-iris/README.md:8,20-21,49 describes copying the file but names no version or upstream URL. What I could NOT confirm is the claimed runtime reach: components/cards/HoverRevealCard.tsx:175 gates LottieMark on logo.toLowerCase().endsWith('.json'), and no card supplies a .json logo — lib/data/logos.ts:113 is tenableIris: `${P}/tenable-iris.avif`, and no other logo value in lib/data, app/, components/ or proxy/content-overrides.json ends in .json. So the player is never injected on any current page; it ships only as a directly-fetchable static asset at out/vendor/lottie_light.min.js. Exploitability: no attacker-controlled input, no cited advisory, no live execution path. The provenance gap is real but hygiene-only.
>
> *Correction:* The provenance gap is real and verified: public/vendor/lottie_light.min.js:1 self-identifies as lottie-web 5.12.2, NOTICE records no third-party attribution, and the file is not in package.json (no lockfile exists), so no npm-based SCA will ever see it. However the stated impact is overstated: the player does not execute on visitor pages. components/cards/HoverRevealCard.tsx:175 only mounts LottieMark when a card's logo ends in `.json`, and no logo in the repo does — lib/data/logos.ts:113 points tenableIris at `.avif`, and no runtime override in proxy/content-overrides.json supplies one either. The file ships in out/vendor/ as a directly-fetchable but currently unreferenced asset. With no attacker-controlled input, no cited advisory, and no live execution path, this is a licensing/supply-chain-hygiene gap (compounded by the stripped MIT banner noted separately), not an exploitable vulnerability — low, not medium.

---

### 130. Voltron bearer key is sent over plaintext HTTP to LLM backends

**Security · medium** · `README.md:171`

```
VOLTRON_API_URLS=http://140.32.71.122:8000/v1,http://140.32.71.122:8001/v1,http://140.32.71.106:8001/v1,http://140.32.71.106:8002/v1,http://140.32.71.120:8642/v1
VOLTRON_API_KEY=<your-rotated-voltron-key>   # real value lives only in .env.local — never commit it
```

**What it is.** proxy/voltron-proxy.mjs:378 attaches `Authorization: Bearer <VOLTRON_API_KEY>` to every upstream call. The live .env.local VOLTRON_API_URLS (redacted) uses an http:// URL to a 140.32.x.x host, matching the README. The 35-char `sk-4...` key therefore crosses the network unencrypted on every chat request, along with user prompts.

**Impact.** Anyone able to observe traffic between this host and the LLM backends captures a reusable API key and user chat content.

**Fix.** Front the LLM backends with TLS (the .env.example already documents NODE_EXTRA_CA_CERTS handling for internal CAs) and switch VOLTRON_API_URLS to https://. Rotate VOLTRON_API_KEY afterwards; the current value is identical to the 2026-08-04 backup, so it has not been rotated in at least six weeks.

> **exploitability review — upheld** (medium confidence). Evidence confirmed verbatim: README.md:171 lists five `http://140.32.71.x` upstreams and :172 the `VOLTRON_API_KEY=` line. proxy/voltron-proxy.mjs:378 (`if (config.apiKey) headers.Authorization = ` + Bearer) and the client-facing path at :557-558 both attach the bearer to `fetch(upstream.url, ...)`, with no scheme check anywhere in getConfig()/parseUpstreamEntry (proxy/voltron-proxy.mjs:265-300). nginx/server.conf:269-284 routes /api/voltron-chat to 127.0.0.1:8787 with no auth_request, so any site visitor's prompt does traverse the upstream link. So the mechanism is real. What I could NOT confirm: the repo contains no live upstream config — the http:// URLs appear only in README.md and the untracked SITE-REVIEW markdown; .env.example:14 already documents `https://llm.yourdomain.com/v1`, and .env.local is out of scope for me, as is the "identical to the 2026-08-04 backup" rotation claim. Exploitation needs a passive/on-path position inside the enclave, not a request an attacker can send; plaintext intra-enclave proxying is already the norm here (nginx/server.conf:550 → http://140.32.71.81:8085).
>
> *Correction:* The code fact holds: proxy/voltron-proxy.mjs attaches `Authorization: Bearer <VOLTRON_API_KEY>` to every upstream call (lines 378 and 557-558) and never requires TLS, and README.md:171 documents five plaintext `http://140.32.71.x` upstreams, so with that configuration the key and user prompts cross the enclave LAN unencrypted on every /api/voltron-chat request (unauthenticated, nginx/server.conf:269-284). But this is not remotely triggerable: there is no request path an attacker can send to extract the key; it requires a passive/on-path position on the internal network, which is the same exposure the site already accepts elsewhere (nginx/server.conf:550 proxies plaintext to http://140.32.71.81:8085). The repo itself ships no plaintext upstream config — .env.example:14 recommends https and the http:// list exists only in documentation — and the live .env.local value plus the "not rotated since 2026-08-04" claim are outside what static repo analysis can confirm. Hardening advice (TLS-front the LLM backends, or reject non-https upstreams when an apiKey is set) is sound; severity is low/informational rather than medium.

---

### 131. Tracked docs publish the internal service map: LLM/Ollama endpoints, DC names, backup IP, maintainer workstation

**Security · medium** · `README.md:307`

```
http://140.32.71.122:8000/v1
http://140.32.71.122:8001/v1
http://140.32.71.121:11434
```

**What it is.** README.md:307-316 lists five OpenAI-compatible endpoints and two Ollama endpoints (ports 8000/8001/8002/8642/11434) by IP; NOTICE:7 names the maintainer and workstation ('dod_admin (J. Webber, CESCDREN14)') and NOTICE:10 the backup replica IP 172.16.2.18; auth_requirement.md:124 names the domain controllers CESCCUIDC1/CESCCUIDC2 and lines 117-118 the child/parent domain DN layout; nginx/server.conf:163-167 enumerates every address the site answers on. README.md and NOTICE are copied verbatim into every air-gap bundle (scripts/make-airgap-bundle.sh copies the repo tree), so this map leaves the enclave.

**Impact.** Gives anyone with repo or bundle access a ready reconnaissance list of internal LLM hosts (Ollama on :11434 is normally unauthenticated), the DCs, and the admin's workstation.

**Fix.** Replace concrete IPs/ports in README.md with placeholders (the .env.example already does this), drop the superseded auth_requirement.md, and keep operational addresses only in .env.local or an ops-only runbook outside the repo.

> **exploitability review — upheld** (high confidence). Every cited artifact verifies verbatim. README.md:307 "http://140.32.71.122:8000/v1", 308-311 the other OpenAI endpoints, 315-316 "http://140.32.71.121:11434" / "http://140.32.70.103:11434"; README.md:171 repeats the same list as a VOLTRON_API_URLS example while .env.example:14 leaves it blank, so the placeholder contrast holds. NOTICE:7 "Maintainer : dod_admin (J. Webber, CESCDREN14)", NOTICE:10 "Backup replica : apensupport2.blcse.mil (172.16.2.18)". auth_requirement.md:124 "ldaps://CESCCUIDC1.blcse.mil:636'; url: 'ldaps://CESCCUIDC2.blcse.mil:636", 117-118 the mbl/blcse DN pair. nginx/server.conf:163-167 lists the cert SANs/IPs. scripts/make-airgap-bundle.sh:70-84 rsyncs "$REPO/" into the bundle excluding only .next/, .git/, .env.local and proxy JSON state, so the docs do travel. Exploitability over the network is nil: nginx/server.conf:226 roots the site at out/ (no README/NOTICE/auth_requirement.md there), the other roots/aliases point at /var/www/html, /var/www/pki, /mnt/storage, and `git remote -v` is empty. Reading it needs host or bundle access, which already exposes nginx/*.conf and proxy/*.mjs.
>
> *Correction:* Accurate as written, but severity drops to low on exploitability: no remote request path reaches these files (nginx serves only out/, which contains none of them, and the repo has no git remote), so the audience is limited to people who already hold host or air-gap-bundle access — and that same access already yields nginx/server.conf, proxy/*.mjs and customsh. The genuine incremental leak is the concrete LLM host list at README.md:171 and 307-316, which is the only plaintext copy inside a bundle (the bundle excludes .env.local), plus the maintainer/workstation line at NOTICE:7.

---

### 132. Air-gap bundle ships gitignored files that carry internal IPs, usernames and operator logs (.claude/, sudo, Old HTML/, exports/)

**Security · medium** · `scripts/make-airgap-bundle.sh:70`

```
rsync -a \
  --exclude '.next/' \
  --exclude '.git/' \
```

**What it is.** The bundle rsync (lines 70-87) excludes only a fixed list of proxy/*.json files, .env.local*, .next, .git and speedtest logs. It does not exclude `.claude/` (.gitignore line 76 documents it as "editor permission logs with internal IPs/usernames"; .claude/settings.local.json currently holds 79 dotted-quad tokens and full shell command lines touching /etc/nginx), the stray `sudo` apt-mirror nohup log at the repo root (.gitignore line 80), `.vscode/`, `Old HTML/`, `exports/`, or `.apen-backups/` (.gitignore line 78; install-hardening-upgrade.sh writes live-nginx/admin-acl.inc and blocked-hosts.inc snapshots there, which would silently undo the 3b scrub at lines 127-148). The secret scan at lines 176-179 only matches API-key/token/private-key shapes, so none of this is caught.

**Impact.** The header promises "secrets never cross" and "carrying it would leak this enclave's users into the other one", but the source enclave's workstation IPs, admin usernames, operator command history and nginx snapshots ride across the air gap into the other network's /var/www/apen_support_nextjs.

**Fix.** Add `--exclude '.claude/' --exclude '.vscode/' --exclude '.apen-backups/' --exclude '/sudo' --exclude 'Old HTML/' --exclude 'exports/' --exclude 'tsconfig.tsbuildinfo'` to the rsync, or better, build the stage from `git ls-files` plus an explicit allowlist (out/, node_modules/, proxy/infrastructure-nodes.json ...) so untracked files can never ride along. Extend the scan with the same source-enclave IP patterns VERIFY.sh uses (140\.32\.7[01]\., 172\.16\.2\.19).

> **exploitability review — upheld** (high confidence). Evidence confirmed verbatim: scripts/make-airgap-bundle.sh:70-72 is `rsync -a \` / `--exclude '.next/' \` / `--exclude '.git/' \`, and the full exclude list (lines 71-86) covers only .next, .git, tsconfig.tsbuildinfo, .env.local*, speedtest/logs, __pycache__ and nine proxy/*.json. Nothing excludes untracked-but-present repo-root items, and `ls -la` confirms .claude/ (settings.local.json), .vscode/, exports/tenable-iris, "Old HTML/" and the 4651-byte `sudo` log all exist and would be copied by `rsync -a "$REPO/" "$STAGE/site/"`. .gitignore:74-80 documents each as never-commit. .claude/settings.local.json holds 26 lines matching 140.32.7[01]./172.16.2. — exactly the STALE_PATTERNS VERIFY.sh:42 defines. The .apen-backups undo path is real: install-hardening-upgrade.sh:146-153 copies live admin-acl.inc and blocked-hosts.inc into $PROJECT_ROOT/.apen-backups/.../live-nginx/, inside the rsync source and after the placeholder scrub at lines 127-148. The scan (162-179) matches only key/token/private-key shapes, so none is caught. Not remotely exploitable (no nginx route, no handler); the trigger is an operator running the bundler, which is the script's sole purpose.
>
> *Correction:* Accurate as written. Two nits: the recommendation redundantly lists tsconfig.tsbuildinfo, which line 73 already excludes; and the count is 82 dotted-quad tokens (6 unique, 26 source-enclave-prefix lines), not 79, while .apen-backups/ does not exist right now — that particular leak arms itself only once install-hardening-upgrade.sh has run.

---

### 133. IP allow-gate is OFF by default (SPEEDTEST_ALLOW_ALL=1) while nginx exempts /speedtest/ from the site login gate; UI and comments claim otherwise

**Security · medium** · `speedtest/backend/config.py:473`

```
ALLOW_ALL = _truthy(os.getenv("SPEEDTEST_ALLOW_ALL", "1"))
```

**What it is.** _authorized() short-circuits to True when ALLOW_ALL is set (server.py:56-57), and the default is "1". nginx/server.conf:483-489 exempts every /speedtest path from `auth_request` with the justification that 'the backend already self-gates measurement endpoints to authorized networks by IP', and app/applications/speedtest/page.tsx:163-165 and :190 tell users 'Measurements only run from authorized APEN networks'. No env file in scope sets SPEEDTEST_ALLOW_ALL=0 (docker-compose.yaml:110-124 does not pass it). The result is a fully anonymous, unlimited-bandwidth endpoint on a production host that nginx otherwise gates behind LDAP login.

**Impact.** Any client that can reach the vhost (or :8085 directly) can run unlimited tests: 64 MiB per download request at 30 r/s + burst 20 per IP (~1.9 GB/s theoretical per source), unlimited ping/results calls, all without a session. The stated security posture in the nginx comments and the user-facing page is inaccurate.

**Fix.** Either flip the default to closed (SPEEDTEST_ALLOW_ALL defaults to 0) and fix the XFF handling so the allowlist is enforceable, or drop the `auth_request off` on /speedtest/ so the site session gate applies (the iframe on /applications/speedtest is same-origin and already behind login). Update the page copy and nginx comments to match whichever is chosen.

> **exploitability review — upheld** (high confidence). Core claim holds; citations don't. config.py is 81 lines: the quoted `ALLOW_ALL = _truthy(os.getenv("SPEEDTEST_ALLOW_ALL", "1"))` is at speedtest/backend/config.py:61, not :473. app/applications/speedtest/page.tsx is 49 lines ("Measurements only run from authorized APEN networks." at :44, not 163-190); speedtest/docker-compose.yaml is 61 lines (no :110-124), though it indeed never sets SPEEDTEST_ALLOW_ALL. Path traced: nginx/server.conf:195 `auth_request /internal/authcheck;` gates the site; :489, :492, :499, :507 all carry `auth_request off;` for /speedtest*, proxying to speedtest_py = 127.0.0.1:8085 (:67). server.py:56-57 short-circuits _authorized; :119-125 st_download clamps to _MAX_DOWNLOAD 64 MiB (:43). Unauthenticated reachability is real. But the flag isn't load-bearing: with ALLOW_ALL=0 the allowlist still covers 140.32.70.0/23, 172.16/16 and all RFC1918 (config.py:24-54) — everyone who can route to this internal host — and _client_ip trusts client XFF (server.py:50-53) while server.conf:512 uses $proxy_add_x_forwarded_for and :490-503 set no XFF at all, so `X-Forwarded-For: 127.0.0.1` bypasses it anyway.
>
> *Correction:* Substantively accurate but mis-cited and mis-rooted. Correct citations: speedtest/backend/config.py:61 (ALLOW_ALL default "1"), app/applications/speedtest/page.tsx:44 (user-facing "authorized APEN networks" claim), nginx/server.conf:485-508 (the justification comment plus `auth_request off` on /speedtest, /speedtest/api/download, /speedtest/api/upload and /speedtest/); speedtest/docker-compose.yaml has only 61 lines and sets no SPEEDTEST_ALLOW_ALL. The real exposure is that nginx exempts every /speedtest path from the site-wide auth_request (server.conf:195) while the backend's only gate is IP-based. The default-open flag is secondary: the allowlist (config.py:24-54) already trusts 140.32.70.0/23, 172.16.0.0/16 and all RFC1918 — i.e. every client that can route to this internal-only vhost — and _client_ip() (server.py:50-53) reads client-supplied X-Forwarded-For, which the /speedtest/ location merely appends to via $proxy_add_x_forwarded_for (server.conf:512) and the download/upload locations (server.conf:490-503) do not set at all, so a spoofed `X-Forwarded-For: 127.0.0.1` defeats the allowlist even with SPEEDTEST_ALLOW_ALL=0. Unauthenticated 64 MiB-per-request download streams (server.py:43, 119-125) are therefore reachable by anyone on the enclave, including the barred workstations in nginx/blocked-hosts.inc (not included by these locations). Caveat: ecosystem.config.js defines no speedtest app, so the live process env cannot be confirmed by static analysis. The durable fix is nginx-side (drop `auth_request off`) plus trusting $remote_addr instead of XFF, not just flipping the default.

---

### 134. Download endpoint serves up to 64 MiB per request with server-side cap 16x larger than the client ever asks for

**Security · medium** · `speedtest/backend/server.py:43`

```
_MAX_DOWNLOAD = 64 * 1024 * 1024              # hard cap per request
...
        total = min(size * chunks, _MAX_DOWNLOAD)
```

**What it is.** st_download (server.py:119-140) accepts `size` up to 64 MiB and `chunks` up to 4096 and streams min(size*chunks, 64 MiB). The frontend only ever requests DOWNLOAD_SIZE (config.py:485, 4 MiB by default). With nginx's speedtest_download_limit at 30r/s burst 20 (server.conf:35, 494) and no `limit_conn`, one unauthenticated source can pull ~1.9 GB/s worth of requests; `proxy_buffering off` (server.conf:516) is not applied to the exact-match download location, so nginx will also buffer these responses to temp files (proxy_temp) under default settings.

**Impact.** Bandwidth and disk-I/O amplification from any client (no auth, see other findings). On a DREN link this is an easy way to saturate the site's uplink or fill nginx proxy_temp.

**Fix.** Lower _MAX_DOWNLOAD to a small multiple of DOWNLOAD_SIZE (e.g. 8 MiB), ignore `chunks` (unused by the client), add `proxy_buffering off` and a `limit_conn` per address to the download location, and require a session or the IP gate.

> **exploitability review — upheld** (medium confidence). Evidence confirmed verbatim: speedtest/backend/server.py:43 `_MAX_DOWNLOAD = 64 * 1024 * 1024              # hard cap per request`; :125 `total = min(size * chunks, _MAX_DOWNLOAD)`; handler at :119-125 with `_require_auth` at :121. Reachable unauthenticated: nginx/server.conf:491-495 `location = /speedtest/api/download` has `auth_request off` (492), and config.py:61 defaults `ALLOW_ALL` to "1", so `_authorized` (server.py:56-57) short-circuits True. `?size=67108864` alone yields 64 MiB. limit_req 30r/s burst 20 confirmed (server.conf:35, 494); grep finds no `limit_conn` anywhere in nginx/. `proxy_buffering off` is at 517 (not 516) inside `location /speedtest/` and is absent from the exact-match block, with no server/http-level directive — buffering-to-temp claim holds. Two cite errors: DOWNLOAD_SIZE is config.py:73, not :485 (file is 81 lines); frontend sends only `?size=${DOWNLOAD_SIZE}`, no `chunks` (speedtest/frontend/speedtest.js:209). Provenance caveat: nginx upstream is 127.0.0.1:8085 (server.conf:67) while this tree's compose publishes 8090 (docker-compose.yaml:25) and ecosystem.config.js lists only apen-stats-api/voltron-proxy — the audited code may not be the live :8085 service.
>
> *Correction:* The mechanism and location are accurate: speedtest/backend/server.py:43 sets `_MAX_DOWNLOAD = 64 * 1024 * 1024` and :125 streams `min(size * chunks, _MAX_DOWNLOAD)`, the client only ever asks for 4 MiB (config.py:73, speedtest/frontend/speedtest.js:209 `fetch(\`${endpoint}?size=${DOWNLOAD_SIZE}\`)` — `chunks` is never sent), and the endpoint is anonymous because nginx/server.conf:492 sets `auth_request off` while config.py:61 leaves `ALLOW_ALL` at "1". `proxy_buffering off` really is confined to `location /speedtest/` (server.conf:517, not 516) and absent from the exact-match download block, so slow-reading clients can force nginx to spool up to 64 MiB per request to proxy_temp, and there is no `limit_conn` anywhere in nginx/. But the severity is low, not medium, because `_MAX_DOWNLOAD` is not what makes this abusable: the governor is `limit_req zone=speedtest_download_limit` at 30r/s burst 20 (server.conf:35, 494), and 30 r/s of the *legitimate* 4 MiB size is already ~120 MiB/s per source — the recommended 8 MiB cap would still permit ~240 MiB/s, so shrinking the cap does not change the DoS math. This is also not reflection/amplification in the network sense: the traffic is TCP to the attacker's own address, so saturating the uplink costs the attacker comparable downlink or a slow-read/many-source setup. The genuinely exploitable parts (an unauthenticated bulk-transfer endpoint, missing `limit_conn`) are separate, already-reported issues; the oversized cap is a hardening nit. Two citations are wrong: DOWNLOAD_SIZE is config.py:73 (the file is 81 lines, there is no :485) and proxy_buffering is server.conf:517. Reachability is also unconfirmed: nginx proxies to 127.0.0.1:8085 (server.conf:67) while this tree's compose publishes 8090 (speedtest/docker-compose.yaml:25) and ecosystem.config.js defines no speedtest app, so the audited code may not be the service actually answering.

---

### 135. /speedtest/api/results writes arbitrary attacker JSON to access.log with no auth, no size cap and no rate limit

**Security · medium** · `speedtest/backend/server.py:156`

```
data = await request.json()
        log_access(f"{ip} - - TEST RESULTS {data}")
```

**What it is.** The handler parses any JSON body and logs its Python repr verbatim. The endpoint is reached through the `location /speedtest/` block (nginx/server.conf:506-522) which has `auth_request off`, no `limit_req`, and no `client_max_body_size` (nginx default 1m applies; direct :8085 access has no cap at all since request.json() buffers the whole body). No schema validation is done on latency/download/upload/ts. Because repr() escapes newlines, CRLF log-line injection is not possible, but each POST can append ~1 MiB of arbitrary content (including fake 'ip - - TEST RESULTS' lines inside string values) to speedtest/logs/access.log.

**Impact.** Unauthenticated disk-fill of the log volume (bind-mounted ./logs, no logrotate referenced in scope) and pollution of the operational record that the README describes as the results audit trail; fabricated test results are indistinguishable from real ones.

**Fix.** Validate the body with a Pydantic model (four floats + int ts, bounded ranges), reject anything else with 400, cap `client_max_body_size 4k` on a dedicated `location = /speedtest/api/results` with `limit_req zone=apensupport_limit`, and log only the validated fields.

> **exploitability review — upheld** (high confidence). Evidence verified verbatim at speedtest/backend/server.py:156-157 ("data = await request.json()" / "log_access(f\"{ip} - - TEST RESULTS {data}\")"). Request path confirmed: nginx/server.conf:506-507 "location /speedtest/ { auth_request off;" proxying to speedtest_py (127.0.0.1:8085, line 67), with no limit_req and no client_max_body_size in that block and none at server level (grep found zero server-scope caps), so nginx's 1m default applies. The finder's "no auth" is imprecise but correct in effect: server.py:154 calls _require_auth, however config.py:61 "ALLOW_ALL = _truthy(os.getenv(\"SPEEDTEST_ALLOW_ALL\", \"1\"))" defaults open and nothing in the repo (docker-compose.yaml, .env.example) sets it to 0; the gate is also spoofable because server.py:49 takes the FIRST X-Forwarded-For element while server.conf:512 appends via $proxy_add_x_forwarded_for (contradicting the comment at 466/478 claiming overwrite). Unbounded growth confirmed: backend/utils.py:74 uses logging.FileHandler with no rotation, and README.md:204 calls access.log an IA audit source.
>
> *Correction:* Accurate in substance, with one correction: the handler is not literally auth-free — server.py:154 calls _require_auth — but that gate is a no-op as shipped because config.py:61 defaults SPEEDTEST_ALLOW_ALL to "1" and nothing in the repo disables it; even with it set to 0, nginx/server.conf:512 appends X-Forwarded-For ($proxy_add_x_forwarded_for) while server.py:49 trusts the first element, so any client can supply an authorized IP. Everything else holds: location /speedtest/ (server.conf:506) has auth_request off, no limit_req and no client_max_body_size (no server-level cap either, so nginx's 1m default is the only bound), the body is logged as an unvalidated Python repr, and backend/utils.py:74 uses a plain FileHandler with no rotation — unauthenticated ~1 MiB-per-POST growth and fabricated entries in a log README.md:204 designates for IA audits. The "direct :8085 has no cap" aside is weaker than stated: that upstream is loopback-only.

---

### 136. Python dependencies use unbounded lower-bound ranges with no lockfile and no hash verification

**Security · medium** · `speedtest/requirements.txt:5`

```
fastapi>=0.110
uvicorn[standard]>=0.27
```

**What it is.** Both runtime dependencies are open-ended `>=` ranges. speedtest/pyproject.toml:24-25 repeats them identically. There is no lock file of any kind under speedtest/ (no poetry.lock, uv.lock, or pinned requirements-lock.txt), and speedtest/Dockerfile:30 installs with `pip install --prefix=/install -r requirements.txt` — no `--require-hashes`, so no artifact integrity is checked. uvicorn[standard] additionally pulls an extras tree (httptools, uvloop, watchfiles, websockets) that is entirely unconstrained. The Dockerfile comment at lines 6-7 states "Only the pinned requirements.txt entries (requests, pytest) get installed", which is inaccurate: the two unpinned runtime deps are installed by the same command.

**Impact.** Every image build resolves fastapi, uvicorn and their extras to whatever PyPI currently serves, unverified, for the ASGI server that terminates the speedtest traffic. Two builds from the same source produce different running code, and a malicious or broken release is pulled in automatically with nothing to detect it. The misleading comment means a reviewer reading the Dockerfile concludes the opposite.

**Fix.** Pin exact versions (or add a hash-pinned lock file) for fastapi and uvicorn, install with `pip install --require-hashes`, and correct the Dockerfile comment at lines 6-7 to match what the RUN at line 30 actually installs.

> **exploitability review — upheld** (high confidence). Every quoted artifact verified verbatim. speedtest/requirements.txt:5-6 = "fastapi>=0.110" / "uvicorn[standard]>=0.27"; pyproject.toml:24-25 repeats both identically. `find speedtest -iname "*lock*"` returned nothing — no lockfile. Dockerfile:30 is `RUN pip install --prefix=/install -r requirements.txt && \` with no --require-hashes. Dockerfile:6-7 reads "Only the pinned requirements.txt entries / (requests, pytest) get installed" — inaccurate, since line 30 installs all four. The deps are genuinely load-bearing: backend/server.py:23-24 imports FastAPI and server.py:209-212 calls uvicorn.run(app...).

Exploitability lens weakens the impact, not the facts. There is no request path: no nginx location, no site-stats.mjs handler, no tainted input. The attacker must own a PyPI release AND a build must occur. deploy/INSTALL.sh installs no Python deps at all (only rsync, line 128), and nginx/server.conf:461 routes /speedtest/ to a PM2 app, not a container — so "every image build" describes a path that may never run in this enclave. The Dockerfile comment is also staler than reported: line 5 claims "built on the Python standard library", contradicted by server.py:3 ("Re-platformed from the stdlib http.server").
>
> *Correction:* The finding's evidence is accurate as written; only its severity and impact framing need correction. Confirmed: speedtest/requirements.txt:5-6 and pyproject.toml:24-25 both carry unbounded `fastapi>=0.110` / `uvicorn[standard]>=0.27`, no lockfile exists under speedtest/, and Dockerfile:30 installs them without `--require-hashes`. The deps are real runtime deps (backend/server.py:23-24, :209-212). However, this is build-time supply-chain hygiene with no attacker-reachable trigger: nothing in nginx/server.conf or proxy/site-stats.mjs exposes it, no user input reaches it, and exploitation requires compromising an upstream PyPI release plus a rebuild. The production path likely does not even run the Dockerfile — deploy/INSTALL.sh:128 only rsyncs the tree and installs no Python packages, and nginx/server.conf:461 describes the live service as PM2 app "apen-speedtest", so the "every image build" impact applies to a documented-but-possibly-unused path (README.md:106-116). On an air-gapped enclave resolving from an internal pip mirror, exposure narrows further. Severity low. The most concrete defect is the stale Dockerfile comment: lines 5-7 claim the backend is stdlib-only and that only requests/pytest install, both contradicted by server.py:3 and Dockerfile:30.

---

### 137. Barred users' AD names, workstations and MACs hard-coded in a test that ships to other enclaves

**Security · medium** · `tests/blocked-hosts.test.ts:24`

```
assert.equal(m.get('140.32.70.46')?.user, 'SAnderson.ou')
  assert.equal(m.get('140.32.70.38')?.user, 'jbridges.ou')
  assert.equal(m.get('140.32.70.43')?.user, 'rshoop.ou')
```

**What it is.** nginx/blocked-hosts.inc:18-20 (deny lines with hostname, AD username and MAC) and nginx/admin-acl.inc:23-26 (admin IP -> hostname -> AD user) are tracked by design and the bundler replaces them with placeholders (scripts/make-airgap-bundle.sh:127-150). But tests/blocked-hosts.test.ts:11 and 22-27 duplicate the same real IPs, usernames and one MAC, and tests/ is not excluded from the bundle, so the barred-personnel list and admin-workstation map still travel to every enclave. The test also asserts the shipped .inc contains exactly these users, so it fails on any enclave running the placeholder file.

**Impact.** Personnel-action information (who was barred, from which desk, with which MAC) and the admin workstation roster leak outside this host; the test is also non-portable.

**Fix.** Use fictitious names/IPs in the unit test, and make the 'shipped file parses' test assert shape (non-empty, every deny line has attribution) rather than the concrete roster. Consider keeping the real ACL/blocked lists only in /etc/nginx and out of git.

> **exploitability review — upheld** (high confidence). Evidence is verbatim at tests/blocked-hosts.test.ts:24-26 ("assert.equal(m.get('140.32.70.46')?.user, 'SAnderson.ou')" etc.), plus line 11 carrying a MAC. Mechanism confirmed: scripts/make-airgap-bundle.sh:70-87 rsyncs "$REPO/" into "$STAGE/site/" with excludes only for .next/, .git/, tsconfig.tsbuildinfo, .env.local*, speedtest/logs/, __pycache__ and proxy/*.json — grep for "tests" in that script returns nothing. Lines 127-148 overwrite only nginx/admin-acl.inc and nginx/blocked-hosts.inc with placeholders; the secret scan at 176-179 matches only sk-*, ADMIN_API_TOKEN, csrfToken and PRIVATE KEY — no IP/username/MAC pattern. So the roster ships. Non-portability confirmed: line 22 reads nginx/blocked-hosts.inc from cwd, line 23 asserts exactly those three IPs, which the shipped empty placeholder (make-airgap-bundle.sh:143-148) cannot satisfy. Exploitability lens: no HTTP reach — nginx root is out/ (nginx/server.conf:226) and out/tests does not exist; exposure is the trusted bundle-transfer path only, consistent with medium. Two corrections: the test holds no admin-allow entries, and /var/www/customsh/lockdown/apply-lockdown.sh:118 leaks the same host/IP and is rsynced unscrubbed at make-airgap-bundle.sh:90.
>
> *Correction:* Accurate in substance, with two corrections. (1) The test leaks only the barred-personnel roster, not the admin-workstation roster: tests/blocked-hosts.test.ts:11,16,23-26 contains the three barred IPs, hostnames CESCDREN15/CESCDREN04(implied)/CESCDREN02B, the three .ou usernames and one MAC, but no admin `allow` entries from nginx/admin-acl.inc:22-25. (2) The bundler's scrubbing gap is broader than tests/: scripts/make-airgap-bundle.sh:90 rsyncs all of /var/www/customsh unscrubbed, and /var/www/customsh/lockdown/apply-lockdown.sh:118 prints "CESCDREN15 (140.32.70.46) logged in by password on 2026-07-21", so fixing only the test would not stop the roster from travelling. There is no web reachability: nginx serves out/ (nginx/server.conf:226) and tests/ is outside it; this is an information-at-rest/transfer exposure over the trusted air-gap bundle plus a test that fails on any enclave running the placeholder blocked-hosts.inc.

---

## Contested

Reviewers split on these. Each shows both sides.

### 138. Inter and JetBrains Mono webfonts redistributed with no SIL OFL license file

**Copyright · high** · `app/globals.css:16`

```
@font-face {
  font-family: 'Inter';
  src: url(/fonts/inter-latin-ext.woff2) format('woff2');
```

**What it is.** globals.css:16-47 self-hosts four woff2 files, confirmed present at public/fonts/{inter-latin,inter-latin-ext,jetbrains-mono-latin,jetbrains-mono-latin-ext}.woff2. Inter (Copyright (c) 2016 The Inter Project Authors) and JetBrains Mono (Copyright (c) 2020 The JetBrains Mono Project Authors) are both SIL Open Font License 1.1. `find public -iname '*licen*' -o -iname '*OFL*' -o -iname '*copying*'` returns nothing, and `git ls-files | grep -i licen` returns nothing. The comment at globals.css:4-15 documents that these were deliberately moved from fonts.googleapis.com to same-origin hosting — i.e. the project chose to redistribute the binaries itself.

**Impact.** OFL 1.1 clause 2 is explicit: 'Copies of one or more of the Font Software typefaces may be redistributed... provided that... each copy contains the above copyright notice and this license.' Shipping the woff2 files with no OFL.txt is a plain condition breach, and unlike MIT it applies to the binary artifacts in out/ that nginx serves to every visitor.

**Fix.** Drop the upstream OFL.txt for each family into public/fonts/ (e.g. public/fonts/Inter-OFL.txt, public/fonts/JetBrainsMono-OFL.txt) so it ships with the export, and reference both from the THIRD-PARTY-NOTICES file. Verify siteupdate.sh copies public/fonts/*.txt into out/.

> **provenance review — refuted** (high confidence). Provenance checks out: app/globals.css:16-21 and :32-37 do self-host four woff2 files, and I brotli-decompressed each (node zlib, streams at offsets 121/121/104/108) and read their name tables. They are genuinely Inter ("Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter)", "Inter-RegularVersion 4.001;git-66647c0bb") and JetBrains Mono ("Copyright 2020 The JetBrains Mono Project Authors (...)", "JetBrainsMono-RegularVersion 2.211"), both OFL 1.1. The named origin and license are correct.

The claimed effect is not. Each binary carries name ID 0 (copyright) AND name ID 14 (license URL): "openfontlicense.org" in both Inter files, "scripts.sil.org/OFL" in both JetBrains files. OFL-FAQ 1.10 (fetched from openfontlicense.org/ofl-faq/): "in the case of metadata included within a font, it is legally sufficient to include only a link to the text of the OFL on https://openfontlicense.org, but we strongly recommend against this." So clause 2 is satisfied via machine-readable metadata; there is no condition breach. The finder never opened the binaries.

NOTICE:1-36 confirms no font attribution exists there.
>
> *Correction:* The files are real Inter and JetBrains Mono, both SIL OFL 1.1, self-hosted from public/fonts and declared at app/globals.css:16-45 — that much is right, and no OFL.txt ships anywhere in the repo or in out/. But this is not a license breach. Every one of the four woff2 files retains its OFL copyright notice and a license URL in the sfnt name table (Inter: "Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter)" + "openfontlicense.org"; JetBrains Mono: "Copyright 2020 The JetBrains Mono Project Authors" + "scripts.sil.org/OFL"), verified by decompressing each file. OFL-FAQ 1.10 states that a link to the OFL text in font metadata is legally sufficient, so OFL 1.1 clause 2 is met by the artifacts nginx serves. What remains is a best-practice gap only: SIL "strongly recommend[s] against" link-only notice, and the repo's NOTICE file (36 lines, no third-party section) credits neither family. Dropping the two OFL.txt files into public/fonts/ and naming both typefaces in NOTICE is cheap and worth doing, but nothing is currently out of compliance — severity low, not high.

> **obligation review — upheld** (high confidence). Could not refute the core claim, but the severity is wrong. Confirmed: app/globals.css:16 `@font-face {`, :17 `font-family: 'Inter';`, :21 `src: url(/fonts/inter-latin-ext.woff2) format('woff2');`, block ends :47. All four woff2 exist in public/fonts/ and are already staged in out/fonts/, so nginx redistributes them. No OFL text anywhere: `git ls-files | grep -i licen|ofl|notice` returns only a 36-line root NOTICE, which I read in full — it is an ownership/ATO/deploy-provenance record naming no font or license, and `grep -rn NOTICE customsh/*.sh scripts/*.sh` returns nothing, so it is not even deployed. Where the finder is wrong: I brotli-decompressed each file (stream at offset 121/108 per the WOFF2 totalCompressedSize at byte 20) and decoded the UTF-16BE name table — Inter carries "Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter)" + openfontlicense.org; JetBrains Mono carries "Copyright 2020 The JetBrains Mono Project Authors (...)" + scripts.sil.org/OFL. OFL 1.1 §2 expressly permits the notice in "machine-readable metadata fields within ... binary files," so the notice half is satisfied; only the verbatim license text is missing.
>
> *Correction:* The repository self-hosts and redistributes four genuine upstream OFL 1.1 webfont binaries — Inter 4.001 and JetBrains Mono 2.211 — declared at app/globals.css:16-47 and present in both public/fonts/ and the served out/fonts/, and it ships no copy of the SIL Open Font License text anywhere; the only license-adjacent tracked file is a 36-line root NOTICE that mentions no font and is never copied into out/. That much is accurate. However, the finding overstates the gap by treating it as a bare unattributed redistribution. Decompressing each woff2 shows an intact OpenType name table carrying name ID 0 ("Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter)" and "Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono)") plus name ID 14 license URLs (openfontlicense.org, scripts.sil.org/OFL). OFL 1.1 clause 2 explicitly accepts the copyright notice "in the appropriate machine-readable metadata fields within text or binary files," so the notice obligation is already met; what is genuinely absent is only the verbatim license text (name ID 13, stripped from every Google Fonts subset — this is exactly how Google Fonts itself serves these files). No Reserved Font Name is implicated. This is a low-severity packaging/documentation gap with no realistic enforcement exposure, remedied by dropping public/fonts/OFL-Inter.txt and OFL-JetBrainsMono.txt into the export and adding a font line to NOTICE. It is still worth closing because components/legal/Terms.tsx:21-23 publishes an AR 25-1 & 27-60 Copyright Policy pledging that it "is Army policy to recognize and respect the rights of copyright owners." Evidence nit: the finder's three quoted lines are not contiguous — `src:` is line 21, not line 18.

---

### 139. Inter and JetBrains Mono woff2 self-hosted with no SIL OFL 1.1 license text anywhere

**Copyright · high** · `app/globals.css:21`

```
src: url(/fonts/inter-latin.woff2) format('woff2');
```

**What it is.** Four font binaries are redistributed from the site's own origin: public/fonts/inter-latin.woff2, inter-latin-ext.woff2, jetbrains-mono-latin.woff2, jetbrains-mono-latin-ext.woff2 (all present in out/fonts/). app/globals.css lines 16-46 declare @font-face for 'Inter' and 'JetBrains Mono' pointing at them, and app/layout.tsx line 200 preloads inter-latin.woff2. Both families are SIL OFL 1.1. No OFL.txt, LICENSE, or copyright string exists: git ls-files | grep -iE 'ofl|licen|notice' returns only NOTICE, and grep -rl 'SIL Open Font License' across the repo (excluding node_modules/out) returns nothing. The subsetted woff2 files also have no readable name-table strings, so the copyright metadata that normally travels inside the font is gone too.

**Impact.** OFL 1.1 requires that the license text and copyright notice accompany every copy of the Font Software, whether redistributed standalone or bundled. Self-hosting the woff2 files is redistribution; with the name table stripped and no OFL.txt, the mandatory notice is missing in both places it could live.

**Fix.** Drop public/fonts/OFL-Inter.txt and public/fonts/OFL-JetBrainsMono.txt (verbatim OFL 1.1 plus each foundry's copyright line) into the deployed tree and link them from NOTICE and a site attribution page.

> **provenance review — upheld** (high confidence). Provenance confirmed, impact overstated. app/globals.css:16-46 declares four @font-face rules; line 21 is `src: url(/fonts/inter-latin-ext.woff2)` (the quoted `inter-latin.woff2` is line 29 — same block, minor mis-cite). public/fonts/ and out/fonts/ hold four real wOF2 binaries; app/layout.tsx:200 preloads one. `git ls-files | grep -iE 'ofl|licen|notice'` returns only NOTICE, which does not mention fonts — no OFL text anywhere.

But the finder's key sub-claim is FALSE. I brotli-decompressed each woff2 (node zlib, offsets 104-121) and the name tables are intact: inter-latin.woff2 carries "Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter)" + "https://openfontlicense.org"; both jetbrains files carry "Copyright 2020 The JetBrains Mono Project Authors" + "https://scripts.sil.org/OFL". The finder ran `strings` on brotli-compressed data, which can never show the name table. Those URLs also independently confirm both families are OFL 1.1.

So the copyright notice does accompany each copy in machine-readable metadata (explicitly permitted by OFL 1.1 §2); only the full license text is absent. Real but narrow, and identical to Google Fonts' own delivery.
>
> *Correction:* Four third-party OFL 1.1 font binaries (Inter 4.001, JetBrains Mono 2.211) are self-hosted from public/fonts/ and declared in app/globals.css:16-46, and the repository ships no copy of the SIL OFL 1.1 text — NOTICE is the only license-ish tracked file and it never mentions fonts. However, contrary to the finding, the copyright metadata is NOT stripped: decompressing each woff2 shows an intact name table with name ID 0 ("Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter)"; "Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono)") and name ID 14 license URLs (openfontlicense.org, scripts.sil.org/OFL). The finder's `strings` check could not see this because woff2 bodies are brotli-compressed. OFL 1.1 §2 expressly allows the copyright notice to travel "in the appropriate machine-readable metadata fields within ... binary files", so the notice requirement is met; what is genuinely missing is the verbatim license text (name ID 13 is absent from the subsets too). That is a low-severity documentation gap, not the dual-location failure described — and it matches how Google Fonts itself serves these exact subsets. Fix remains cheap: add public/fonts/OFL.txt and a line in NOTICE.

> **obligation review — refuted** (high confidence). The self-hosting is real (app/globals.css:16-46; line 21 is actually `src: url(/fonts/inter-latin-ext.woff2)`, not the quoted line — that text is line 28), and no OFL.txt exists (`git ls-files | grep -iE 'ofl|licen|notice'` returns only NOTICE; grep for "SIL Open Font License" outside node_modules returns nothing). But the load-bearing claim is false. The finder ran `strings` on Brotli-compressed woff2 bodies, which cannot show the name table. Decompressing the four files (header offset 121, all 21 tables) and decoding UTF-16BE yields intact name records: public/fonts/inter-latin.woff2 and inter-latin-ext.woff2 both carry "Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter)" plus license URL "https://openfontlicense.org"; jetbrains-mono-latin.woff2 and -latin-ext.woff2 carry "Copyright 2020 The JetBrains Mono Project Authors (...)" plus "scripts.sil.org/OFL". OFL 1.1 clause 2 expressly allows the notice to travel "in the appropriate machine-readable metadata fields within text or binary files" — the OpenType name table is that field, and the SIL FAQ endorses it for webfonts. So the notice is not "missing in both places it could live."
>
> *Correction:* The four self-hosted woff2 files (public/fonts/, mirrored to out/fonts/) do retain their OFL copyright notices and license URLs in the OpenType name table — Inter carries "Copyright 2016 The Inter Project Authors" + https://openfontlicense.org, JetBrains Mono carries "Copyright 2020 The JetBrains Mono Project Authors" + scripts.sil.org/OFL — which is exactly the machine-readable-metadata form OFL 1.1 clause 2 permits. The only residual gap is that the verbatim license text is not shipped alongside, only referenced by URL, and neither NOTICE nor any site page credits the two families. That is a best-practice/documentation nit worth a one-line fix (drop OFL-Inter.txt and OFL-JetBrainsMono.txt into public/fonts/ and name both families in NOTICE), not a high-severity redistribution violation.

---

### 140. lottie-web (MIT) vendored into public/vendor with its copyright banner stripped

**Copyright · high** · `components/common/LottieMark.tsx:22`

```
const LIB_SRC = '/vendor/lottie_light.min.js'
```

**What it is.** LottieMark loads a 168 KB minified third-party player checked into the repo at public/vendor/lottie_light.min.js. `grep -c 'Copyright' public/vendor/lottie_light.min.js` returns 0 and no 'license' string exists anywhere in the file, yet `grep -o bodymovin` matches — identifying it unambiguously as lottie-web / bodymovin (MIT, Copyright (c) 2015 Bodymovin / Hernan Torrisi). The build's license banner has been removed. The file comment at LottieMark.tsx:9-12 states the vendoring is deliberate ('BOTH the player script and the animation JSON are served from our own origin'), so this is redistribution, not incidental use. The repo's only NOTICE file (NOTICE:1-36) contains organizational ownership data and zero third-party attribution.

**Impact.** MIT requires 'The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.' Stripping the banner and shipping the file to every site visitor with no notice anywhere is a direct license-condition breach. For a .mil site this is also an AR 25-1 / AR 27-60 issue — components/legal/Terms.tsx:21-26 publicly commits the site to respecting copyright holders' rights, so the violation contradicts the site's own published policy.

**Fix.** Re-add the upstream MIT banner to the top of public/vendor/lottie_light.min.js (the unminified upstream header), and add a THIRD-PARTY-NOTICES file listing lottie-web with its full MIT text. Record the exact upstream version so the vendored blob is traceable.

> **provenance review — refuted** (high confidence). The load-bearing claim — "copyright banner stripped", "the build's license banner has been removed" — is false. I fetched upstream https://unpkg.com/lottie-web@5.12.2/build/player/lottie_light.min.js: it begins `"undefined"!=typeof navigator&&function(t,e){"object"==typeof exports...`, byte-for-byte identical to the first 300 chars of public/vendor/lottie_light.min.js, and upstream itself contains no "Copyright", no "license", no "MIT" and no top-of-file comment banner. Upstream's minified player ships bannerless; nobody removed anything. The finder's zero-count greps prove only that, not tampering. The recommendation "record the exact upstream version" is also refuted: `grep -o '"[0-9]+\.[0-9]+\.[0-9]+"'` on the vendored file returns `"5.12.2"` — the blob is already traceable. Verified true: LottieMark.tsx:22 `const LIB_SRC = '/vendor/lottie_light.min.js'`; lottie-web is MIT, "Copyright (c) 2015 Bodymovin"; NOTICE:1-36 carries no third-party attribution; the same blob is redistributed at exports/tenable-iris/lottie_light.min.js (identical md5 9f45bc11…) whose README:21 credits no author. So a modest attribution gap exists — but it is inherited from upstream's own distribution, not a deliberate breach, and Terms.tsx:21-26 is not contradicted by shipping an unmodified MIT file.
>
> *Correction:* public/vendor/lottie_light.min.js is an unmodified copy of lottie-web (bodymovin) 5.12.2's published `build/player/lottie_light.min.js` — the version string "5.12.2" is embedded in the blob and its opening bytes match upstream exactly. Upstream's own minified player carries no copyright or license banner, so nothing was stripped and there is no tampering or deliberate notice removal. The only real (and minor) issue is housekeeping: the repo carries no THIRD-PARTY-NOTICES file and NOTICE:1-36 lists no third-party attribution, while the MIT text is reproduced nowhere — and the same blob is re-handed to outside parties via exports/tenable-iris/lottie_light.min.js (identical md5) with a README that credits no author. Adding a one-line THIRD-PARTY-NOTICES entry ("lottie-web 5.12.2, MIT, Copyright (c) 2015 Bodymovin" plus the license text), and the same note in the export README, closes it. This is routine attribution hygiene, not a high-severity license breach, and does not contradict components/legal/Terms.tsx:21-26.

> **obligation review — upheld** (high confidence). Evidence confirmed verbatim: components/common/LottieMark.tsx:22 `const LIB_SRC = '/vendor/lottie_light.min.js'`. public/vendor/lottie_light.min.js exists (168236 B); `grep -c Copyright` = 0, `grep -ci license` = 0, `grep -o bodymovin | wc -l` = 2, and the head shows `.lottie=e()` — it is lottie-web (MIT). It is shipped: out/vendor/lottie_light.min.js, same size/bytes, plus a third copy in exports/tenable-iris/. No LICENSE or THIRD-PARTY file exists (`ls LICENSE* THIRD*` → no such file); NOTICE:1-36 is purely organizational and names no third-party code. So the MIT attribution obligation is real and unmet.

Two claims in the finding I could not confirm and believe are wrong. (1) "The build's license banner has been removed" — upstream lottie-web's minified player dists carry no header; LICENSE.md lives at the npm package root, so nothing was stripped. Static-only analysis, no network, so I cannot diff upstream. (2) The AR 25-1 framing is wrong: Terms.tsx:20-23 concerns posting material "without the permission of the copyright holder"; MIT grants that permission. This is an unmet attribution condition, not unauthorized posting.
>
> *Correction:* The underlying fact holds: public/vendor/lottie_light.min.js is lottie-web/bodymovin (MIT), contains zero "Copyright"/"license" strings, is loaded by components/common/LottieMark.tsx:22 and shipped to visitors from out/vendor/ (a third copy sits in exports/tenable-iris/), and the repo carries no LICENSE or THIRD-PARTY-NOTICES — NOTICE is organizational only. MIT's notice condition is therefore unmet, and the fix (add a THIRD-PARTY-NOTICES file with lottie-web's MIT text and the pinned upstream version) is correct and cheap. But the finding overstates it. There is no evidence a banner was "stripped": upstream lottie-web's minified player builds ship without a header, the LICENSE lives at the npm package root, so the absence is the normal state of that dist file, not tampering. And the AR 25-1 / AR 27-60 angle does not apply — Terms.tsx:22 addresses posting copyrighted material "without the permission of the copyright holder", and MIT is exactly that permission. This is routine open-source attribution housekeeping affecting one vendored file, not a high-severity policy contradiction: low.

---

### 141. 38 modified vendor trademarks shipped in public/logos/no_backgrounds

**Copyright · high** · `lib/data/logos.ts:44`

```
const NB = '/logos/no_backgrounds' // transparent-background product/service logos
```

**What it is.** public/logos/no_backgrounds holds 38 files that are altered versions of third-party marks, named for the alteration: microsoft-nb.png, vmware-nb.png, vmware-bg-removed.webp, pdq-nb.png, pdq-bg-removed.webp, trellix-linux-support-nb.png, vs-logo-nb.webp, vs_logo-bg-removed.webp, gitlab-nb.png, ubuntu-linux-nb.png/.webp, epel-nb.png, linux-bg-removed.png, evaluate-stig-nb.png and others. The file header at lib/data/logos.ts line 10 describes the folder as "Transparent converted artwork". These are wired into live cards (line 85 vmware, line 104 trellix, line 126 microsoft, line 120 visualStudio).

**Impact.** Microsoft, Broadcom/VMware, Canonical and GitLab trademark guidelines all forbid altering, recoloring or reconstructing their marks. Background removal and re-rasterisation produce modified marks, which falls outside nominative fair use and is exactly the case the site's own Copyright Policy page says requires the holder's permission.

**Fix.** Replace each -nb / -bg-removed file with the vendor's own official transparent PNG/SVG from its brand-assets page, and record the download source per file in lib/data/logos.ts.

> **provenance review — upheld** (high confidence). Location and quote confirmed verbatim: lib/data/logos.ts:44 `const NB = '/logos/no_backgrounds' // transparent-background product/service logos`, header line 11 "Transparent converted artwork", and the wirings at 85 vmware-nb.png, 104 trellix-linux-support-nb.png, 120 vs-logo-nb.webp, 126 microsoft-nb.png. Third-party marks are genuinely present (verified by opening the files). But two specifics are wrong. (1) Count: 38 is the whole directory; I opened support-ticket-nb.webp — a plain wrench/screwdriver tile with no vendor mark — and roughly half the folder is like it (documents, videos, isos, color-picker, help-desk-service, knowledge-base-org, speedtest, webmail, pip-package). (2) Mechanism/provenance: the largest files are not vendor artwork with the background removed. vmware-nb.png (3478x1216) is a chrome/jewel 3D render of the wordmark; microsoft-nb.png (2286x1856) is a glossy 3D cube render; gitlab-nb.png (2760x1504) is a dark 3D pipeline scene with the tanuki and an "APEN" plinth — opaque, not transparent. Only vs-logo-nb.webp matches the "official mark, background removed" description. Site policy text is real: components/legal/Terms.tsx:23.
>
> *Correction:* public/logos/no_backgrounds does hold third-party marks wired into live cards via lib/data/logos.ts (line 85 vmware, 104 trellix, 120 visualStudio, 126 microsoft, 177 gitlab, 77 ubuntu), but the finding's framing is inaccurate. It is not 38 vendor trademarks — 38 is the directory's total file count, and roughly half are generic in-house icons with no vendor mark at all (verified: support-ticket-nb.webp is a plain wrench/screwdriver tile; same for documents, videos, isos, color-picker, help-desk-service, knowledge-base-org, speedtest, webmail, pip-package). About 15-16 files carry a vendor mark. The named provenance is also wrong for the most prominent ones: they are not the vendor's own artwork with the background stripped. vmware-nb.png (3478x1216, 4 MB) is a chrome-and-jewel 3D reinterpretation of the cloud and wordmark, microsoft-nb.png (2286x1856) is a glossy 3D four-cube render rather than the flat four-square mark, and gitlab-nb.png (2760x1504) is a dark 3D pipeline scene containing the tanuki next to a plinth reading "APEN" — opaque, despite the folder name. These read as generated/derived artwork incorporating the marks, which is a stronger brand-guideline and implied-endorsement problem (particularly the GitLab+APEN composition) than background removal, and it is not fixed by the stated recommendation of swapping in official transparent PNGs, since for most of these files there is no official original being mishandled. Only vs-logo-nb.webp matches the finder's description of an unaltered official mark on transparency. The site's own policy text quoted as the standard is real (components/legal/Terms.tsx:21-26, AR 25-1/27-60).

> **obligation review — refuted** (high confidence). Locations verify: lib/data/logos.ts:44 quotes verbatim ("const NB = '/logos/no_backgrounds' // transparent-background product/service logos"), line 10 says "Transparent converted artwork", and the wiring is real (l.85 vmware, l.104 trellix, l.120 visualStudio, l.126 microsoft). But the headline claim fails. The folder holds 38 files, of which roughly half are generic UI icons, not vendor marks: documents-nb, videos-nb, isos-nb, color-picker-nb, support-ticket-nb, help-desk-service-nb, knowledge-base-org-nb, webmail-nb, speedtest-nb, pip-package-nb. "38 modified vendor trademarks" is about double the true count. The scoping is also wrong: unmodified vendor marks ship site-wide anyway — out/logos/real/microsoft.svg, vmware-esxi.svg, cisco.svg; out/logos/products/trellix-logo.png, vmware-long.png — so the -nb folder is not a distinct exposure, and lib/data/logos.ts:127 even keeps `microsoftOfficial` alongside. Terms.tsx:23-26 (Copyright Policy, AR 25-1) speaks to copyrighted works, not trademark alteration, and applies equally to every logo on the site. Background removal for identifying a supported product is nominative use with no confusion risk; no repo-wide attribution/NOTICE for third-party art exists (NOTICE is an ownership record, not shipped to out/), which is the real, minor gap.
>
> *Correction:* public/logos/no_backgrounds does contain 38 files whose names advertise alteration (-nb / -bg-removed), and lib/data/logos.ts:44 and :10 describe them as "transparent-background" / "Transparent converted artwork", with vendor entries wired into live cards at lines 85 (vmware), 104 (trellix), 120 (visualStudio) and 126 (microsoft). But only about 14-18 of those 38 files relate to a third-party mark at all; the rest (documents, videos, isos, color-picker, support-ticket, help-desk-service, knowledge-base-org, webmail, speedtest, pip-package) are generic UI icons with no trademark owner. The folder is also not a distinct exposure: unaltered vendor artwork already ships beside it at out/logos/real/microsoft.svg, vmware-esxi.svg, cisco.svg and out/logos/products/trellix-logo.png, vmware-long.png, so any AR 25-1 / brand-guideline question covers the whole logo catalog, not the no_backgrounds subset. Using a vendor mark to identify that vendor's product on a support portal is nominative use, and re-rasterising to a transparent background is a format conversion, not a redesign, so the "falls outside nominative fair use" claim is not supportable at high severity. The genuine, minor gap is that neither the repo nor out/ carries any third-party trademark/attribution notice (grep for "trademark" across app, components and lib returns nothing; the root NOTICE file is a system-ownership record and is not published to out/). Correct remedy is a single "all product names and logos are trademarks of their respective owners" line in components/legal/Terms.tsx or the footer, plus per-file source provenance in lib/data/logos.ts if desired — not re-sourcing 38 files.

---

### 142. Verbatim VMware product documentation reproduced in legacy Old HTML pages

**Copyright · high** · `Old HTML/tools_vmrc.html:25`

```
<h5><p>VMware Tools is a set of services and modules that enable several features in VMware products for better management of guests operating systems and seamless user interactions with them.</p></h5>
```

**What it is.** Old HTML/tools_vmrc.html reproduces VMware's own documentation sentences word-for-word with no quotation, attribution, or source link: line 25 (the VMware Tools definition above), line 46 "VMware Remote Console (VMRC) is a personal computer application that connects over a network to virtual machines running on vSphere.", and lines 60 and 69 "Note: VMRC and VMware Workstation cannot be installed on the same computer, because they share common components." The same pattern repeats across the sibling legacy pages: Old HTML/esxi8.html:23 "This ISO contains the boot image for installing or upgrading to ESXi 8.0U3j (ESXi requires 64-bit capable servers). The ESXi image includes VMware Tools." (also esxi7.html:23, esxi9.html:23) and Old HTML/esxi8.html:28 / vcenter7.html:32 / vcenter8.html:32 / vcenter9.html:32 "...patches are cumulative in nature and support using the most recent desired version patch to perform all updated changes for the product being patched up to that point." I confirmed this text has NOT carried over into the live Next.js pages (grep for these phrases across app/, lib/, components/ returns nothing), so the exposure is repository-only.

**Impact.** Proprietary vendor prose is retained verbatim in the git history and working tree. Lower live exposure than the mirrored PDFs since these files are not built or served (no copy exists under public/ or out/), but they are a ready source for re-copying into new pages and a finding if the repo is reviewed or shared as the source of record (NOTICE calls this repo authoritative).

**Fix.** Delete the Old HTML/ directory now that every page it holds has been ported — the live vmware.ts data already covers the same products, and git history preserves it if anyone needs the old layout. If it must be kept for reference, add a README in that directory marking it as archived vendor-derived material that must not be copied into new pages.

> **provenance review — upheld** (high confidence). Every cited location verified verbatim: Old HTML/tools_vmrc.html:25 (VMware Tools definition), :46 (VMRC definition), :60 and :69 (VMRC/Workstation shared-components note); esxi7/8/9.html:23 ("This ISO contains the boot image for installing or upgrading to ESXi ... includes VMware Tools."); esxi8.html:28, vcenter7/8/9.html:32 ("patches are cumulative in nature..."). Provenance checks out as named: web search traces the Tools sentence verbatim — including VMware's own grammatical slip "guests operating systems" — to Broadcom/VMware TechDocs "Introduction to VMware Tools", the VMRC sentence to TechDocs "VMware Remote Console for vSphere", and the shared-components note to the VMRC 13.0.2 release notes. So the origin ("VMware product documentation") is correct, not a generic pattern. Scope claims also verified: `git ls-files "Old HTML"` shows all 8 files tracked; grep for these phrases across app/, lib/, components/, public/, out/ returns nothing, and lib/data/vmware.ts:183,201 uses original paraphrase. Only the severity is wrong.
>
> *Correction:* Accurate as to facts and provenance, overstated as to severity. Four short VMware-authored sentences are reproduced verbatim without attribution in the tracked-but-unbuilt legacy directory: Old HTML/tools_vmrc.html:25, :46, :60, :69, Old HTML/esxi{7,8,9}.html:23, Old HTML/esxi8.html:28 and Old HTML/vcenter{7,8,9}.html:32. I confirmed the wording against Broadcom/VMware TechDocs (Introduction to VMware Tools; VMware Remote Console for vSphere; VMRC 13.0.2 release notes), and VMware's own typo "guests operating systems" carried over, so this is copying, not convergence. But the exposure is minimal: the files are not part of the Next.js static export (nothing under out/ or public/ matches, and the live lib/data/vmware.ts:183,201 uses original paraphrase), and the copied material is four sentences of factual product description on an internal portal that already redistributes the vendor's own ISOs and release-note PDFs with permission — the licensing question that matters lives with those artifacts, not with these sentences. Treat as low-severity housekeeping: delete Old HTML/ now that every page is ported (git history keeps it).

> **obligation review — refuted** (high confidence). Quotes verified exactly: "Old HTML/tools_vmrc.html":25, :46, :60, :69; esxi7/8/9.html:23; esxi8.html:28; vcenter7/8/9.html:32 all match verbatim. So the facts hold — but the obligation framing does not. (1) No license obligation exists to satisfy: this is proprietary vendor prose, not CC-BY/OFL/MIT material, so there is no notice, license-text or attribution duty; attribution does not license proprietary copying, and the recommended "README marking it archived" discharges nothing legally. (2) Zero distribution. A repo-wide grep for all five phrases (excluding .git/node_modules) returns only the 8 Old HTML files plus the prior reviewer's own SITE-REVIEW-2026-09-17.md — nothing in out/. nginx serves only out/ (nginx/server.conf:226) and the legacy webroot /var/www/html (:653, :763); grep of /var/www/html for those phrases returns nothing. No script or config references "Old HTML". (3) The material is four short factual product-description sentences with thin protection, about products this site is entitled to mirror. Unserved dead files, no copies, de minimis factual text: housekeeping, not a high-severity copyright exposure.
>
> *Correction:* The quoted text is genuinely present at every cited line (Old HTML/tools_vmrc.html:25,46,60,69; esxi7/8/9.html:23; esxi8.html:28; vcenter7/8/9.html:32), but "high severity copyright exposure" overstates it. There is no license obligation to satisfy here — the material is proprietary vendor prose, not CC-BY/OFL-licensed content, so no NOTICE, license text or attribution requirement is being violated, and the proposed fix (a README labeling the directory archived) would not discharge any duty. The content is also entirely undistributed: a repo-wide grep for all five phrases finds them only in the 8 Old HTML/ files and in the prior reviewer's own SITE-REVIEW-2026-09-17.md, never in out/; nginx serves only out/ (nginx/server.conf:226) and the legacy webroot /var/www/html (nginx/server.conf:653,763), and grepping /var/www/html for the same phrases returns nothing; no build script, config, or data file references "Old HTML". What remains is four short, factual, functional product-description sentences about products this site is entitled to mirror, sitting in dead files that are tracked in git but never built or served. That is thin-copyright, de minimis, non-distributed material: informational housekeeping (delete the directory at convenience), not a high-severity legal finding.

---

### 143. `npm run upgrade` fetches and executes the @canary tag of @next/codemod on the production host

**Security · high** · `package.json:19`

```
"upgrade": "npx @next/codemod@canary upgrade latest",
```

**What it is.** The `upgrade` script uses npx to download and immediately execute whatever the registry currently publishes under the `canary` dist-tag of @next/codemod, then asks it to upgrade every dependency to `latest`. `canary` is a moving pre-release tag: the code that runs is unreviewed, unpinned, has no integrity hash, and changes between invocations. npx executes it without any confirmation of what was fetched. This is a repo where node_modules is root-owned and the admin Publish button shells out to `npm run build`, so the toolchain runs with real privilege on the live server.

**Impact.** Running this one script on the production web server executes arbitrary third-party pre-release code with the invoking user's privileges, then rewrites package.json to `latest` for every dependency — replacing the deliberate, documented pins in TOOLCHAIN-PINS.md (typescript held at ^6.0.3, eslint at ^9.39.5) and breaking the build the admin console depends on, exactly the failure that document was written to prevent.

**Fix.** Remove the script, or pin it to a reviewed exact version (`npx @next/codemod@16.3.2 upgrade`) and drop the `latest` argument so the pinned majors survive. Dependency upgrades on a production host should be a reviewed, deliberate change, not a one-word script.

> **exploitability review — refuted** (high confidence). Evidence is verbatim correct: package.json:19 is `"upgrade": "npx @next/codemod@canary upgrade latest",`. The claimed effect is not. No attacker-reachable path invokes it: `grep -rn "run upgrade\|@next/codemod"` over the tree (excluding node_modules and the prior review doc) returns only package.json:19 — no handler, no shell script, no deploy script, no cron. The only server-side spawns in proxy/site-stats.mjs are line 525 (`node ... audit-download-links.mjs`), line 625 (`spawn('npm run build', ...)`, a static string per the comment at 622-624) and execFile at 695/708 (`sudo -n nginx -t` / `systemctl reload nginx`). There is no endpoint that runs an arbitrary npm script, so nothing behind the nginx admin ACL or the LDAP admin session can trigger it; it requires an operator to type it at a shell on a host that also has npm-registry reachability, which the air-gap bundle workflow (scripts/make-airgap-bundle.sh:69) exists precisely because it cannot be assumed. The pin-clobbering impact is also overstated: `@next/codemod upgrade` bumps next/react/eslint-config-next, not the typescript ^6.0.3 / eslint ^9.39.5 pins in TOOLCHAIN-PINS.md, and `npm run clean` (line 20) deleting package-lock.json is the larger real hygiene risk here.
>
> *Correction:* package.json:19 does define `"upgrade": "npx @next/codemod@canary upgrade latest"`, and running it would fetch and execute an unpinned, moving pre-release dist-tag with no integrity hash — genuine supply-chain hygiene debt on a production host, alongside `"clean"` (line 20) deleting package-lock.json. But it is not an attacker-triggerable issue and not high severity: nothing in the repo ever invokes `npm run upgrade` (no proxy handler, deploy script or cron; the only server-side spawns are the static `npm run build` at proxy/site-stats.mjs:625, the audit script at 525, and sudo nginx test/reload at 695/708), so it requires a human operator to deliberately run it at a shell with npm-registry reachability. The stated impact is also inflated: `@next/codemod upgrade` bumps Next and its peers, not "every dependency to latest", and does not itself rewrite the typescript ^6.0.3 / eslint ^9.39.5 pins TOOLCHAIN-PINS.md protects. Correct framing: low-severity dependency hygiene — delete the script (and the lockfile-deleting `clean`), not a high-severity RCE.

> **mitigation review — upheld** (high confidence). Evidence confirmed verbatim at package.json:19 — `"upgrade": "npx @next/codemod@canary upgrade latest",`. The mechanism is real: npx fetches an unpinned moving dist-tag and executes it, and `latest` would overwrite the pins TOOLCHAIN-PINS.md documents (typescript ^6.0.3 at package.json:56, eslint ^9.39.5 at :52).

But severity is inflated. (1) Nothing invokes it: the only repo hits for "codemod" are package.json:19 and the prior review doc; the admin Publish path spawns only `npm run build` (proxy/site-stats.mjs:625 `const child = spawn('npm run build', ...)`). It runs solely when a human with an existing shell on the box types it — someone already able to run anything. (2) It is not the marginal risk claimed: there is no package-lock.json in the repo at all (ls confirms absent) while every dependency uses caret ranges, and package.json:20-21 (`clean` deletes package-lock.json, `reinstall` = clean + npm install) already means any reinstall resolves unreviewed code from the registry. (3) node_modules is root-owned (drwxr-xr-x root root), so the codemod's install step fails as dod_admin anyway; DEPLOY.md:183 notes registry access may not exist in the enclave.

Hygiene/availability issue, not a high-severity exposure.
>
> *Correction:* package.json:19 does contain `"upgrade": "npx @next/codemod@canary upgrade latest",`, and running it would execute an unpinned moving-tag package and rewrite the deliberate pins in TOOLCHAIN-PINS.md. However the "high / arbitrary code execution on the production host" framing overstates it: no code path invokes the script (the admin Publish button spawns only `npm run build`, proxy/site-stats.mjs:625), so it fires only when an operator who already holds a shell on the box types it by hand — no privilege boundary is crossed and no remote actor can trigger it. It is also not the dominant supply-chain exposure here: the repo ships no package-lock.json and pins nothing but caret ranges, and `clean`/`reinstall` (package.json:20-21) explicitly delete the lockfile before reinstalling, so unreviewed registry code already enters the tree on any reinstall. node_modules is root-owned, so the codemod's own install step fails as dod_admin regardless. Treat as low-severity repo hygiene: delete the script (or pin it and drop `latest`), and fix the missing-lockfile/`clean` problem, which is the larger of the two.

---

### 144. Rejected-sign-in usernames (possibly mistyped passwords) and source IPs are written to pm2 stdout, defeating the 0600 protection the code documents

**Security · high** · `proxy/site-stats.mjs:1876`

```
const line = `[site-stats] ${severity === 'spoof' ? 'SPOOF ATTEMPT' : 'Rejected sign-in'}: reason="${reason}" typed="${event.typed}" ip="${event.ip}"`
  if (severity === 'spoof') console.error(line)
  else console.warn(line)
```

**What it is.** The file comment at proxy/site-stats.mjs:1820-1824 explains that auth-events.json is kept at mode 0600 precisely because "the `typed` field is whatever was in the USERNAME box, and a user who fat-fingers their password into that box would otherwise leave it world-readable on this host". commitAuthEventsToDisk (:1841-1845) honours that with mode 0o600. Line 1876 then writes the exact same `typed` value, plus the source IP, to process stdout/stderr, which pm2 captures into ~/.pm2/logs/*.log — files created with pm2's own default mode, outside the 0600 store, outside .gitignore's proxy/*.json list, and outside scripts/make-airgap-bundle.sh's strip list (lines 78-86, which exclude auth-events.json but nothing under pm2 logs). Unlike auth-events.json, the pm2 log is also unbounded by AUTH_EVENTS_MAX (:1829) and is rotated/retained by pm2, not by this code.

**Impact.** The one value the code identifies as potentially a plaintext password, together with the user's IP, is duplicated into a log file with weaker permissions, no ring-buffer cap, and no retention limit — and it is not stripped from air-gap bundles. This directly negates the stated mitigation.

**Fix.** Drop `typed` (and ideally the raw IP) from the console line — log the event id and reason only, and let an operator open the admin panel or the 0600 file for the sensitive fields. If a console breadcrumb is required, redact to a length/shape hint.

> **exploitability review — upheld** (high confidence). Evidence confirmed verbatim: proxy/site-stats.mjs:1876-1878 logs `typed="${event.typed}" ip="${event.ip}"` via console.warn/error; the 0600 rationale is at :1820-1825 and mode 0o600 at :1843. Path is reachable: nginx/server.conf:394-399 serves /api/auth/login with `auth_request off;` and no admin-acl include (only limit_req burst=3), and site-stats.mjs:2943-2950 passes the raw `username`. A password typed into the username box hits ldap-domain.mjs:203 `reject('missing-domain','format',...)`, so it is recorded and logged. Two sub-claims fail. (1) Air-gap: scripts/make-airgap-bundle.sh:71-90 stages only $REPO and $CUSTOMSH (pm2 is vendored from /usr/lib at :151-152); ~/.pm2/logs is never in the bundle, so "not stripped" is vacuous. (2) "Weaker permissions": logs are 0664 but inside /home/dod_admin (drwxr-x---, group dod_admin has no other members; only other user is netctrl), whereas auth-events.json sits in world-traversable proxy/ (0755). Reading the log therefore requires dod_admin or root — the same identity that can read the 0600 file. Real hygiene/retention issue (no pm2-logrotate: module_conf.json is {}), not high.
>
> *Correction:* The code fact is real: proxy/site-stats.mjs:1876 duplicates the `typed` username (which for a fat-fingered login can be a plaintext password) plus the source IP into pm2's stdout/stderr, unbounded by AUTH_EVENTS_MAX and with no rotation configured (~/.pm2/module_conf.json is empty, so pm2-logrotate is not installed), and any unauthenticated visitor can trigger it because /api/auth/login is deliberately outside admin-acl.inc (nginx/server.conf:394-399). But the impact is overstated. The pm2 log lives under /home/dod_admin (mode 0750, group dod_admin has no other members; the only other local user, netctrl, cannot traverse it), while the "protected" auth-events.json sits in world-traversable /var/www/apen_support_nextjs/proxy — so the console copy is not more exposed to other local users, and reading it still requires dod_admin or root. The air-gap claim is wrong: scripts/make-airgap-bundle.sh:71-90 stages only the repo and customsh, never ~/.pm2/logs, so the pm2 log cannot leak through a bundle. Net: an indefinite-retention PII/credential-residue hygiene defect worth dropping `typed` from the console line, not a high-severity exposure.

> **mitigation review — refuted** (high confidence). Code quote is accurate (proxy/site-stats.mjs:1876 `typed="${event.typed}" ip="${event.ip}"`, warn/error at :1877-1878; 0600 rationale at :1820-1824; mode 0o600 at :1843). The claimed EFFECT fails on both legs. (1) Air-gap leak: scripts/make-airgap-bundle.sh rsyncs only "$REPO/" (lines 70-88) and "$CUSTOMSH/" (line 90), plus /usr/lib/node_modules/pm2 (151-152, the program, not logs). pm2 logs live in /home/dod_admin/.pm2/logs, outside every bundle root, so the strip list and .gitignore are irrelevant. (2) "Weaker permissions": those logs are 0664/0644 dod_admin:dod_admin inside a 0750 home (`drwxr-x--- dod_admin dod_admin /home/dod_admin`) and `getent group dod_admin` shows no supplementary members — readable only by dod_admin and root, the same principals who can read 0600 auth-events.json (which itself sits in a 0755 dir). No endpoint serves pm2 logs, and site-stats.mjs:3484-3493 already hands the full `typed` value to any admin session, so no new audience gains it. Residual: no ring cap and no rotation (ecosystem.config.js has no out_file/error_file/logrotate).
>
> *Correction:* proxy/site-stats.mjs:1876 does deliberately (see the comment at :1874-1875) echo the `typed` username-box value — which can be a mistyped password — and the source IP to pm2 stdout/stderr, a mild weakening of the 0600 rationale the same file states at :1820-1824. The reported impact is wrong on both counts: pm2 logs sit in /home/dod_admin/.pm2/logs under a 0750 home whose group has no other members, so only dod_admin and root can read them (the same principals who can read the 0600 store, and the same trusted admins the API at :3484-3493 already serves the full `typed` field to), and make-airgap-bundle.sh never copies ~/.pm2/logs (it rsyncs only the repo, customsh and the pm2 program dir), so nothing leaves the host in bundles. What survives is a hygiene/retention gap, not an access-control one: the pm2 copy is not bounded by AUTH_EVENTS_MAX and ecosystem.config.js configures no rotation, so a potential plaintext password persists indefinitely in a file the 0600 ring buffer would have aged out, and an attacker can pad it via the public login endpoint. Low severity; the one-line fix is to log the event id and reason instead of `typed`.

---

## Refuted

Recorded so the same ground is not re-covered. Each line gives the claim and why it failed.

**ExpandableCardGrid wraps real links and buttons inside a div with role="button" — the exact shape the repo's own a11y sweep bans** — `components/cards/ExpandableCardGrid.tsx:153` (Code quality, claimed high)

> Line-level quotes check out: components/cards/ExpandableCardGrid.tsx:153-157 is the div with role="button"/aria-expanded/tabIndex={0} and a keydown that toggles on ' ' with no preventDefault; the close <button> is at :192, StaticLink at :69; no Escape handler anywhere in the 230-line file; tests/tile-a11y.test.ts:41-55 lists the file plus 13 pages.

But the impact and recommendation are wrong. `grep -rn ExpandableCardGrid` over app/ and components/ returns only its own definition, the barrel re-export (components/cards/index.ts:1) and tests — no page imports it; NavExpandedContent has zero callers. The 13 legacy pages hand-roll their own copies (app/docs/ub/storage/StorageCards.tsx:105, app/dren/trellix/DRENTrellixELCards.tsx:147, app/trellix/ubuntu/TrellixUbuntuCards.tsx:101 each carry their own `role="button" aria-expanded={isOpen} tabIndex={0}`), and tile-a11y.test.ts scans each file's own source, so converting this component strikes exactly one list entry and changes nothing users see. Also "dismissed only with a mouse" is false: the shell keeps focus, so Enter/Space re-toggles it closed.

Rebuilding a dead component around the TileGrid pattern is churn; deleting it is the shorter diff.

**No restore procedure covers the admin state: the documented rollback restores only out/ and nginx config** — `deploy/README.md:141` (Code quality, claimed high)

> Line citations check out (deploy/README.md:139-145 restores only out/ and nginx-conf.d; deploy/INSTALL.sh:107-112 backs up out/.env.local/proxy/nginx), but the title and impact are wrong. (1) A restore procedure covering admin state does exist and is written down twice: INSTALL.sh:113 "rollback: stop pm2, restore $BACKUP_DIR over $SITE_ROOT, reload nginx" plus :381 printing the path, and MIGRATION.md:9-11 which names "`proxy/*.json` — live runtime state ... only exist in this backup" with whole-tree extract steps at :27-33. (2) "an operator ... silently leaves the damaged admin state in place" inverts the design: INSTALL.sh:127 `--exclude 'proxy/*.json'` and :141-143 "keeping this enclave's $base (use --reset-content to overwrite)" mean a deploy never touches admin JSON, so skipping proxy/ on rollback is correct in every run except an explicit --reset-content. (3) The timer-driven copy is churn: /var/www/customsh/replicate-to-backup.sh:26,62-74 already pushes the whole tree (including proxy/*.json) to the peer, and a recurring dated copy multiplies the unpruned session-token/PII backup problem. Residue: one README line. Severity high is unjustified.

**countBuiltReferences() synchronously reads the entire 851-file out/ tree on the request path, blocking the whole proxy** — `proxy/site-stats.mjs:501` (Code quality, claimed high)

> Mechanism real, facts and magnitude wrong. proxy/site-stats.mjs:501 is indeed `function countBuiltReferences(url)`, with the sync walk at 505-516 and `walk(join(PROJECT_ROOT, 'out'))` at 517; nginx/server.conf:195 `auth_request /internal/authcheck;` is site-wide as claimed. But (1) delete does NOT call it "twice-over": proxy/site-stats.mjs:4148 calls countOverrideReferences (defined 487), which walks the in-memory contentOverrides object, not out/. grep shows exactly two call sites, 4104 and 4149. (2) "multi-hundred-millisecond" is unmeasured and too high: I ran the identical walk over the live out/ (851 files, 18.1 MB) — 127 ms total wall including ~40 ms node startup, so ~70-90 ms of actual event-loop block, warm cache, on a rare human-triggered admin click. (3) The recommendation is churn for this codebase: an mtime-keyed cache needs its own readdir sweep plus invalidation, and spawning scripts/audit-download-links.mjs (as runLinkAuditIntoBuildStatus does at 521-527) costs ~40 ms process startup plus async plumbing — more code than the 16-line sync helper it would replace.

**parseLogs() re-parses the whole nginx access log on every GET /api/site-stats — no cache** — `proxy/site-stats.mjs:2524` (Code quality, claimed high)

> Code claims check out: proxy/site-stats.mjs:2524 parseLogs() streams all of LOG_PATH; 2724-2725 getUnifiedData() calls it unconditionally; 3620 is its only caller; no memo, vs _nginxStatusCache at 1423. Line cites are off by one (1423 not 1424) but fine.

The *effect* is what fails. LOG_PATH (line 61) is /var/log/nginx/cui_nginx_access.log, which /etc/logrotate.d/nginx rotates daily (rotate 52); on this production host it is 1.4 MB, not "hundreds of MB" — one day of traffic, parsed in tens of ms. nginx/server.conf:374-376 gates /api/site-stats behind admin-acl.inc with 403=404, so only allowlisted admin workstations reach it, at 15s/30s intervals (lib/data/runtime.ts:75,77). That is a few MB/min of regex on an otherwise idle Node process — not a high-severity load on the auth_request thread.

The recommended byte-offset incremental reader is churn: daily rotation invalidates offsets, so it buys nothing over the 1-line mtime/TTL memo, which itself is optional here.

**Public build unconditionally imports the restricted-deployment data file; no deployment flag exists** — `lib/data/homepage.ts:29` (Security, claimed high)

> Quoted lines exist (lib/data/homepage.ts:29, :92, :107; out/home/index.html:130). The claimed effect does not. The premise "public build" is wrong: RESTRICTED-MIGRATION.md:3 says "This project (`restricted-nextjs/`) is the **restricted-enclave port**" — this repo IS the restricted deployment; `live/` is a separate codebase, so there is nothing to gate and no flag is needed. Worse, the doc specifies exactly what the code does: RESTRICTED-MIGRATION.md:55-57 "Operational Services = local Service Catalog + the four restricted operational tiles" / "Service Portals = the nine enclave-only on-network portals". homepage.ts:92/:107 implements that spec verbatim. Exploitability: /home is behind the site-wide gate (nginx/server.conf:195 `auth_request /internal/authcheck;`, no `auth_request off` in any location serving out/home). Linking these FQDNs is a documented decision — lib/data/constants.ts:37-43: "already-published internal hostnames, so they are linked directly ... Destinations that resolve to raw RFC-1918 IPs ... stay behind the redirector so the IP never lands in the static bundle." The one real unauthenticated surface (nginx/server.conf:623 `location = /search-index.json { auth_request off;`) is the finder's own separate finding, not this one.

**User chat text and uploaded file contents are POSTed to an external LLM endpoint with no notice that data leaves the enclave** — `proxy/voltron-proxy.mjs:568` (Security, claimed high)

> Quoted code is real: proxy/voltron-proxy.mjs:568 is exactly `const upstreamResponse = await fetch(upstream.url, {` with `messages: chatMessages` at :565, and the extraction prompt ("error messages, version numbers, hostnames, config keys/values") is at :428. The *claim* fails on two counts. (1) "External / third-party / leaves the enclave" rests only on the generic placeholder in .env.example:14 ("e.g. https://llm.yourdomain.com/v1"), and is contradicted by this repo's own deployment docs: nginx/server.conf:276 names the upstream "voltron.apen.mil", and README.md:305-316 lists the actual Voltron endpoints as plain-HTTP in-enclave addresses on the same subnets as this host (http://140.32.71.122:8000/v1 … http://140.32.70.103:11434). No third party, no egress. (2) Exploitability: there is no adversary. nginx routes /api/voltron-chat to loopback :8787 (server.conf:269-281) with only a rate limit; voltron-proxy.mjs has no session gate, so any visitor may chat — but the only data transmitted is what that same visitor typed or attached. Nothing an attacker reaches or triggers. Residual truth: no in-product line states input is processed by an AI service (privacy-security.tsx, 30 lines, never mentions the assistant). That is a copy/policy gap, not a high security defect.

**Speedtest backend listens on 0.0.0.0 and is published on all host interfaces, bypassing every nginx control** — `speedtest/docker-compose.yaml:107` (Security, claimed high)

> Every cited line is wrong and the causal chain is disproven. `speedtest/docker-compose.yaml` is 61 lines (`wc -l`), so line 107 does not exist; the quoted `ports:` / `- "${SPEEDTEST_PORT:-8090}:8090"` is at lines 24-25, and `SPEEDTEST_HOST: "0.0.0.0"` (cited :111) is at line 29. `speedtest/backend/config.py` is 81 lines: `HOST = os.getenv("SPEEDTEST_HOST", "0.0.0.0")` is line 67 (not 479) and `ALLOW_ALL = _truthy(os.getenv("SPEEDTEST_ALLOW_ALL", "1"))` line 61 (not 473). Only `speedtest/Dockerfile:40` is accurate. The cited numbers are offsets into the finder's own SECURITY-REVIEW-2026-09-16-INTERIM.md (its copy sits at line 274), not the repo. Decisively, the compose file publishes 8090, and /proc/net/tcp shows nothing listening on 8090; 8085 is listening on 0.0.0.0/:: but is a different service — `proxy/site-stats.mjs:1015` calls it a "Shared FastAPI speedtest container" that also serves `/netdiag/ws/` (nginx/server.conf:532), and `deploy/INSTALL.sh` never brings this compose stack up. Editing the cited file would not change the 8085 exposure.

**rgbToHsl is the canonical StackOverflow implementation (CC BY-SA, attribution + share-alike required)** — `app/applications/color-picker/page.tsx:22` (Copyright, claimed medium)

> Code confirmed: app/applications/color-picker/page.tsx:16-31 (the quoted evidence is actually at lines 23-25, not line 22; line 22 is `const d = max - min`). Only one copy exists (grep found rgbToHsl at :16 and its call at :98), no attribution comment anywhere.

But the provenance claim fails on three counts. (1) Origin is misnamed: the canonical JS rgbToHsl the finder describes is a port of Michael Jackson's 2008 mjijackson.com blog code, which the StackOverflow answer republished and credits; StackOverflow is not the source, and a 2012 answer would be CC BY-SA 3.0, not the "4.0" asserted. I did not WebFetch to confirm (audit is static-analysis-only), so this rests on recall. (2) Not verbatim: the repo version is TypeScript-typed, drops the achromatic branch for `let h = 0, s = 0` (line 19), folds `/6` into each case, and returns a rounded `{h,s,l}` object in degrees/percent instead of `[h,s,l]` in 0..1 (line 30). (3) ~12 lines wholly dictated by the standard HSL formula — the `switch (max)` and `(g < b ? 6 : 0)` wrap term are the only sane JS spelling and appear in d3-color, chroma.js and dozens of libs. The finder itself concedes the formula is unprotectable math; what remains is below the originality threshold (merger/scenes a faire), so there is no license conflict with package.json:6 `"license": "UNLICENSED"`.

**Self-hosted Inter and JetBrains Mono woff2 files ship with no SIL OFL 1.1 copyright notice or license** — `app/layout.tsx:200` (Copyright, claimed medium)

> Provenance checks out: app/layout.tsx:200 quotes verbatim, app/globals.css:16-46 @font-faces the four files, and both public/fonts and out/fonts hold them (byte-identical, sha256 matched). Inter and JetBrains Mono are genuine third-party OFL 1.1 fonts, correctly attributed. But the claimed defect is false. I decoded each WOFF2 name table (brotli-decompressed via node zlib) and every file carries its notice: inter-latin.woff2 nameID 0 "Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter)", nameID 14 "https://openfontlicense.org"; jetbrains-mono-latin.woff2 nameID 0 "Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono)", nameID 14 "https://scripts.sil.org/OFL". OFL 1.1 condition 2 expressly allows the notice and license to travel "in the appropriate machine-readable metadata fields within text or binary files" rather than as stand-alone text — the exact form Google Fonts serves and these files use. So "ship with no SIL OFL 1.1 copyright notice" is factually wrong, and no breach follows. The finder's `iname '*OFL*'` grep only proved no stand-alone file; it never inspected the binaries. (./NOTICE exists but is an ownership doc, unrelated.)

**Microsoft Learn release notes compiled without the CC BY 4.0 licence attribution the licence requires** — `lib/data/docs-content.ts:1` (Copyright, claimed medium)

> Quotes check out: lib/data/docs-content.ts:1-5 header, :23 and :97 source comments, app/docs/microsoft-products/ssms/page.tsx:24 and visualstudio/page.tsx:24 "Source: Microsoft Learn — ... Compiled for offline reference.", and components/cards/ReleaseNotes.tsx emits no attribution. The legal claim fails on two points. (1) Provenance/protectability: docs-content.ts:31-38, 55-62, 92-95 are condensed factual statements — feature names, build numbers ("Visual Studio 18.6.0, MSODBCSQL 18.6.2.1, ... DacFx 170.0.97"), CVE ids, ship dates — written in the repo's own compressed em-dash voice, not verbatim Microsoft prose. Facts and version numbers are not protectable expression, so no licence grant is being relied on and CC BY's attribution condition never attaches. (2) Licence identity: learn.microsoft.com content is served under the Microsoft Terms of Use; only certain MicrosoftDocs GitHub markdown repos carry CC BY 4.0, and the VS 2022 release notes are not among them. The recommended notice would assert a licence that likely does not govern the source. No network available to fetch upstream pages for verbatim comparison, so I could not rule out incidental phrase overlap.

**"Purpose-built" / "crafted" icons imitating vendor product marks** — `lib/data/logos.ts:5` (Copyright, claimed medium)

> Quoted text is verbatim (lib/data/logos.ts:5, :38, :127), but the claimed effect is not. I opened every file the finding names. None imitates a vendor mark: paint.svg is a purple paintbrush on cream ("<!-- Paintbrush body (diagonal) -->"), snipping-tool.svg a dashed selection rect, windows-notepad.svg a spiral-bound pad, windows-terminal.svg a generic terminal frame, hevc.svg a film reel, mpeg2.svg a film strip, vmware-tools.svg a gear, vmware-vcenter.svg stacked bars. These are generic functional metaphors, not protectable vendor expression; HEVC/MPEG-2 have no such mark to copy. The finder plainly did not open two of its exhibits: public/logos/real/vsphere.svg (14 b) is the text "404: Not Found" and vmware-vsphere.svg (147 b) is "Package size exceeded the configured limit of 50 MB. Try https://github.com/homarr-labs/dashboard-icons/... instead." — saved HTTP error bodies served as images. Per hard rules I made no network request to verify upstream. The real provenance gap is the inverse: genuine vendor artwork (microsoft.svg exact #F25022/#7FBA00/#00A4EF/#FFB900, ms-office.svg, cisco.svg #049fd9, vmware-esxi.svg) sits unattributed, with only one "official" comment in 534 lines.

**19 background and hero images with no provenance statement of any kind** — `lib/data/logos.ts:41` (Copyright, claimed medium)

> Cited location verifies: lib/data/logos.ts:41 is exactly `const BG = '/logos/backgrounds'  // page background images`, line 8 says "Full-bleed page background images", README.md:109-111 says assets were "migrated from the legacy site (`/var/www/html`)", and 19 files sit in public/logos/backgrounds. But the provenance claim fails. Six of the seven JPEGs carry signed C2PA/JUMBF manifests naming their origin: vmware_bg.jpg, pdq_bg.jpg, video_guides_bg.jpg, facpro_videos_bg.jpg, mssoftware_bg.jpg, software_isos_bg.jpg all contain `c2pa.created msoftwareAgent u Azure OpenAI ImageGen ... digitalSourceType .../trainedAlgorithmicMedia`, dated 2025-07-08, claim_generator "Microsoft Responsible AI Image Provenance", signed under Microsoft SCD Claimants RSA CA. So the images are machine-generated, not stock photography, and each file carries cryptographic provenance. public/logos/heroes holds three hand-authored gradient SVGs (vmware-esxi-hero.svg line 1: `<svg ... viewBox="0 0 900 280">` with only linearGradient/radialGradient defs), not "wide banner" photography. The 12 webp backgrounds are 1920x1080 at 8-15KB (~0.03 bpp) — flat abstract fills, not photographs. Only gray_bg.jpg has no embedded metadata.

**VMware product screenshots, one sourced from a vendor blog, shipped as card artwork** — `lib/data/logos.ts:94` (Copyright, claimed medium)

> The quoted line exists verbatim at lib/data/logos.ts:94, but the finder trusted the inline comments instead of opening the files. I rendered both.

public/logos/real/vmware-vcenter-screenshot.png (1254x1056) is not a vCenter screenshot: it is VMware brand art — the vSphere double-square mark plus the wordmark "VMware vSphere 8" centred on VMware's dark-blue datacenter-icon background. No UI, no console, no data.

public/logos/real/vmware-ui-preview.jpg is 512x512 (file(1)) and is the classic vSphere Client application icon, not "vSphere HTML5 client UI". It is also unused: grep over app/, components/, lib/ finds it only at logos.ts:93, so the claim that it appears on "the VMware landing" is false. Only vmwareScreenshot is consumed (lib/data/vmware.ts:67,81,98,122,145,162).

So both the named origin and the "screenshot of a published work, used decoratively" impact collapse; this is vendor logo/brand art identifying products the site mirrors, the same category as every other vendor mark here. NOTICE (36 lines) does have no third-party/trademark section, so "no permission recorded" stands, at low severity. I did not fetch upstream sources (no network).

**Vendor product logos and a vendor blog screenshot are redistributed while the site's own Terms page forbids exactly that** — `lib/data/logos.ts:94` (Copyright, claimed medium)

> Both quotes are verbatim (lib/data/logos.ts:93-94, :124; components/legal/Terms.tsx:26 — "Army Regulation 25-1 prohibits the posting of documents or information protected by a copyright..."), but the finder took the code comment as provenance without opening the file. I rendered public/logos/real/vmware-vcenter-screenshot.png (PNG 1254x1056, XMP exif:UserComment "Screenshot"): it is not a vCenter UI screenshot at all — it is a VMware vSphere 8 marketing lockup (VM logo glyph + "VMware vSphere 8" wordmark on a patterned dark background), i.e. a trademark/brand graphic, the same category as every other file in the registry. public/logos/real/vmware-ui-preview.jpg (512x512) is likewise not "vSphere HTML5 client UI" but the legacy vSphere Client app icon. So the finding's distinguishing claim — "a screenshot lifted from a vendor blog post is the vendor's copyrighted work, not merely a trademark" — fails, and its fix ("replace with a locally captured screenshot ... which the Government owns outright") is both inapplicable and wrong in principle (a capture of a vendor UI is still the vendor's artwork). What remains is the generic, already-known gap: 213 files under public/logos and no trademark/permission record (NOTICE:1-40 is an ownership/ATO record only).

**Decommissioned third-party marks still shipped in public/logos/restricted** — `lib/data/logos.ts:172` (Copyright, claimed medium)

> The quoted comment is real: lib/data/logos.ts:172-174 reads "// Ansible, AtomEngine, Openfire, VASSAL, AFSIM, and RStudio logo entries / // were dropped 2026-07 along with their pages (services decommissioned); / // the image files remain in public/logos for the legacy file tree." public/logos/restricted holds exactly 19 files and all 19 are present in out/, so they are fetchable. But the finding's substance fails. Nine of the 19 are live, in-context logo entries, not orphans: logos.ts:175-186 references ONESAF.png, jupyter-logo.png, sharepoint-logo.png, tenable-iris.avif, helpdesk.png, qpro_logo.png, epo.png, facpro.png, wanshow.png — three of which the finder lists as context-free vendor marks. Only ~10 are unreferenced (ansible, atom, openfire-logo, VASSAL, afsim, rstudio, tenable, gitlab, WSL_tux, WSL_tux1), and ONESAF/AFSIM are US Army/AFRL programs, not vendor marks. No license or upstream origin is named, so no provenance claim is verifiable. The remedy is also incomplete: nginx/server.conf:640-656 falls /logos/ back to @legacy_logos (root /var/www/html), so deleting the repo copies need not stop the URLs resolving.

**package.json asserts proprietary rights ("UNLICENSED") over what is a US Government work; NOTICE distribution statement is blank** — `package.json:6` (Copyright, claimed medium)

> Quoted text confirmed verbatim: package.json:5-6 (`"author": "FCC CESC (cesc@army.mil)",` / `"license": "UNLICENSED",`), NOTICE:21-25 blanks, no LICENSE/COPYING at root, grep over README.md (459 lines) + app/layout.tsx returns zero license matches. The facts hold; the claimed effect does not.

(1) package.json:4 is `"private": true`. `UNLICENSED` + `private: true` is npm's own documented pairing for a package that is not published and grants no rights — package metadata, not a legal assertion of copyright ownership. Calling it "asserts proprietary rights" overstates what the field does.

(2) The 17 U.S.C. 105 premise is unproven by the code. package.json:5 is an org mailbox; NOTICE:7 names maintainer "dod_admin (J. Webber, CESCDREN14)". Nothing establishes federal-employee authorship within official duties rather than contractor work (copyrightable, routinely licensed to the Government). §105 also bars only *domestic* copyright. So "legally incoherent" is unsupportable.

(3) NOTICE:25 is annotated "(set by System Owner)" — a deliberately delegated field, documented not hidden.

Lens note: this makes no third-party-origin claim, so there was no provenance/copying assertion to test.

**LibreSpeed garbage.php ported verbatim into proxy/site-stats.mjs (LGPL-3.0 derivative, no attribution)** — `proxy/site-stats.mjs:4651` (Copyright, claimed medium)

> I fetched upstream garbage.php (network works). The finder's upstream facts are right: the header set, `filename=random.dat`, `s-maxage=0`, the 1024 cap and the 1048576 buffer all match, and LICENSE is real LGPL-3.0. But "ported verbatim" is false. No PHP expression survives: site-stats.mjs:4644-4645 fills a buffer with `Math.random()` vs `openssl_random_pseudo_bytes`; 4656-4667 is a backpressure `res.write`/`drain` loop vs `echo/flush`; 4638 defaults ckSize to **100**, upstream `getChunkCount()` defaults to **4**. What actually coincides is the wire contract a LibreSpeed JS client must see — response headers, chunk size, cap, `{processedString, rawIspInfo}` (4683), `id <token>` (4711). Those are interface/method-of-operation facts, plus the canonical PHP force-download header boilerplate; not protectable expression. The claim "no attribution to ... librespeed anywhere" is also wrong: site-stats.mjs:4591-4594, 4641, 4683, nginx/server.conf:462 and app/applications/speedtest/page.tsx:11 all name LibreSpeed. Dead-code observation confirmed: no `/api/speedtest` location in nginx/server.conf, no caller outside the file.

**Dashboard re-probes the admin identity on every tab switch, contradicting its own comment** — `app/admin/AdminDashboard.tsx:496` (Code quality, claimed medium)

> The literal citation checks out: AdminDashboard.tsx:486-496 has the comment "Probe whoami once on mount and again whenever the content tab is opened" over an effect closing with `}, [tab])`, and admin-sections.ts lists 9 tabs. But the impact and the fix are both wrong. (1) No flicker: lines 489-496 only call `setWhoami(who)` after the await — state is never cleared first, so the header at line 659 keeps rendering the same username throughout. (2) The traffic is trivial and already the house pattern: `/api/auth/whoami` (runtime.ts:64) is an in-memory cookie lookup returning 200 always (site-stats.mjs:3009-3014), on a loopback backend, behind the nginx admin ACL; Navbar.tsx:259 probes it on every page mount by design. (3) The preferred recommendation is factually wrong — AdminDashboard.tsx:841 renders `<AdminContentEditor />` with no props; SessionGate's `onAuthorized` (AdminContentEditor.tsx:2208) is internal, so "the prop it already receives" does not exist and threading one up would be a larger diff than the effect it replaces. What remains is a comment-vs-dep wording nit, not a medium quality defect.

**AdminFileLibraryPanel holds 37 useState in one 1,131-line component covering five independent workflows** — `app/admin/AdminFileLibraryPanel.tsx:95` (Code quality, claimed medium)

> Size facts check out: file is 1131 lines, line 95 quote is verbatim, and the cited state blocks exist. But the count is 36 `= useState` calls (the 37th grep hit is the import, line 16), and the claimed mechanism fails. The "same two-variable idiom: a status enum plus a message string" is only true for three: `uploadState` (idle|busy|done|error, L135), `attachState` (idle|saving|done|error, L144), `newDirState` (idle|saving|error, L152). Rename and delete use booleans (`renameBusy` L118, `deleteBusy` L126) whose message fields are error-only. On success both deliberately write the shared banner instead: L385 `setUploadState(result.staleBuiltPages > 0 ? 'error' : 'done')` and L429 `setUploadState(result.references > 0 ? 'error' : 'done')`. That single shared banner is exactly what refutes "nothing prevents two flows leaving contradictory messages". A `{state, message, run}` hook also cannot carry upload's progress/rate/abortRef (L132-137), delete's 409 `blocked` second-press path (L128, L421), or attach's reset-on-change (L1063, L1081) — five different shapes, one call site each. Net: churn on a working panel, real regression risk, no measured re-render problem.

**Five admin panels duplicate the same load/save/reset + busy + message block instead of sharing one hook** — `app/admin/AnnouncementPathsPanel.tsx:34` (Code quality, claimed medium)

> Anchor is roughly right: AnnouncementPathsPanel.tsx:33-36 does hold `const load = useCallback(async () => {` / `const res = await fetch(ENDPOINT, { cache: 'no-store',` (cited line 34, off by one). AdminAssistantChipsPanel.tsx:30-92 and AdminAssistantPromptPanel.tsx:35-91 repeat the load/save/reset shape. But the rest of the claim fails. NginxManagedEditor.tsx:64-68 is `const r = await adminContentClient.fetchNginxManaged()` — no raw fetch, no DELETE/reset, no busy/message pair; it is the counter-example, not a fourth copy. AdminChatTranscriptsPanel.tsx:46 and AdminCustomPagesPanel.tsx:56 likewise go through adminContentClient. So "five panels"/"four copies" is really three, and one of the three (AnnouncementPaths) already uses `adminAuthHeaders({ write: true })` (lib/data/admin-content.ts:386-395). The recommended `lib/hooks/useAdminJsonResource.ts` re-invents a layer that exists: adminContentClient already centralises admin fetch policy in ~60 methods (admin-content.ts:463-1170). The cheap fix is two methods on that client for the chips and prompt endpoints, which also closes the CSRF gap; a generic hook plus AbortController on three mount-lifetime GETs is churn.

**InfrastructureNodesPanel copies a prop into state, and the dashboard's 15s poll clobbers the admin-only payload every cycle** — `app/admin/InfrastructureNodesPanel.tsx:257` (Code quality, claimed medium)

> The mechanism is real but the effect is not. Confirmed: InfrastructureNodesPanel.tsx:247 seeds from the prop, :257 `useEffect(() => { setLiveServices(services) }, [services])`, and AdminDashboard.tsx:531-532 builds a fresh array (`services: json.services || []`) on each sync, so the effect does fire every cycle. But the premise that the prop is a poorer "public" view is false: proxy/site-stats.mjs:2778 (`/api/site-stats`) and :3652 (`/api/admin/infrastructure-nodes`) both return `services: buildServicesPayload()` — the identical function (:1572-1596), which already emits healthCheckUrl, localAddress, probeViaProxy, timeoutMs and expectedStatus, exactly the fields beginEdit reads (:319-328). The admin-only extra is `nodes`, which refreshAdmin never stores (:269 sets liveServices from `data.services` only). Saves mutate the same in-memory `infrastructureNodes` (:3712-3717), so a new node appears in the public payload too, and the "All nodes re-probed" text lives in `feedback` (:253), untouched by the effect. Nothing is discarded. The proposed useAdminNodes hook + prop removal is churn for a single-maintainer static-export app.

**Three `openssl x509 -noenc` commands in the EL certificate guide are not valid openssl syntax** — `app/docs/el/certificates/CryptoCards.tsx:90` (Code quality, claimed medium)

> Text is quoted correctly: app/docs/el/certificates/CryptoCards.tsx:90-92 do carry `-noenc` on `openssl x509`, and `openssl x509 -help` (3.0.13, this host) does not list it. But the claimed impact is wrong. `openssl x509 -in <cert> -out <out> -noenc` on this host exits 0 and writes a byte-identical converted certificate (verified against /etc/ssl/certs/ACCVRAIZ1.pem). The x509 app has a catch-all digest-name option, so `-noenc` (like `-zzz`, also exit 0) is swallowed as an unused digest argument; only pkcs12 rejects unknown flags (`pkcs12 -zzz` -> "Unknown cipher", exit 1). So there is no unrecognized-flag error and no dead stop for users — the flag is inert noise. The recommendation's second half is also moot: app/docs/ub/certificates/CryptoCards.tsx:36-43 contains no `-noenc` at all, so there is no duplicated copy to fix. What remains is a cosmetic 3-token cleanup plus the slightly over-broad blurb at line 63 — real but low, not a medium user-blocking doc defect.

**Navbar's notification poller depends on state it sets, so acknowledging an alert tears down and restarts the interval with a fresh triple-fetch** — `components/layout/Navbar.tsx:183` (Code quality, claimed medium)

> Mechanism verified: Navbar.tsx:183 is `}, [active, acknowledgedAlertIds])`, setInterval at :177, sameIds guard at :152, listener at :124 calling normalizeAcknowledgedAlertIds, which is `Array.from(new Set(...))` at lib/data/admin.ts:154-168 — a new reference every time. AdminDashboard.tsx:614 and :618 each call persistAcknowledgedAlertIds → dispatch, so one ack fires the effect twice. So the restart is real.

What is wrong is the impact and the fix. `setCounts` only ever runs inside syncNotificationCounts in that effect (Navbar.tsx:160-175), so the dep re-run is the ONLY thing that refreshes the cog badge after an ack. It does not "buy nothing" — it is why the red "!" clears immediately. The recommended ref + `[active]` deps would leave a stale badge for up to RUNTIME_INTERVALS.adminStatsRefreshMs = 15_000 (lib/data/runtime.ts:77), trading a visible regression for a few loopback requests made by one admin's own browser on an intranet site. Not worth the diff; if anything the real nit is the double dispatch at AdminDashboard.tsx:614/618, which the finding does not mention.

**GlowCard keeps a blurPx state that nothing renders, and injects a static stylesheet at runtime instead of putting it in globals.css** — `components/ui/spotlight-card.tsx:77` (Code quality, claimed medium)

> Evidence at the cited line is verbatim correct (spotlight-card.tsx:77 `const [blurPx, setBlurPx] = useState(12)`; only other hit is the write at :86 — grep across the repo shows no read), but both claimed effects are wrong.

1) "forces a second render on every GlowCard mount" / "avoidable extra render": false. The same effect already calls `setGlowHue` (:83) and `setGpuTier` (:85), both of which ARE read (:115, :91). React 19 (package.json:36) batches all three into one re-render. Deleting `setBlurPx` removes zero renders.

2) "cannot be seen by anyone reading globals.css": backwards. app/globals.css:191-220 already contains a `[data-glow-card]::before/::after` block — a near-duplicate with different values (188px/125px fixed, `/ 0.8` and `/ 0.45`, `filter: brightness(2)`). It sits inside `@layer components` (opened at :166), so the unlayered injected `<style>` always wins. The real defect is duplicated, silently-shadowed CSS, not invisibility.

3) The recommendation ("move SPOTLIGHT_STYLES verbatim into globals.css, delete 19-58") would paste a second conflicting copy of selectors already present at :191-220 — it needs a reconciliation of the two value sets, not a paste, and the layered/unlayered cascade difference changes rendering.

**Update install deletes wizard-generated custom page sources despite the header promising to keep custom pages** — `deploy/INSTALL.sh:124` (Code quality, claimed medium)

> Mechanics check out: deploy/INSTALL.sh:124-133 runs `rsync -a --delete` protecting only .env.local, proxy/*.json and speedtest/logs, and scripts/make-airgap-bundle.sh:70-87 ships app/ and out/, so the source enclave's copies do replace the local ones. The claimed *effect* is wrong. nginx/server.conf:661-668 `location ~ ^/[a-z0-9][a-z0-9_-]*/[a-z0-9][a-z0-9_-]*/?$ { ... try_files $uri $uri.html $uri/index.html /custom-pages/index.html; }` sends any unmatched two-segment route to the prebuilt renderer, and app/custom-pages/CustomPageRenderer.tsx:21 `const path = window.location.pathname...` resolves the slug and fetches the page from the proxy, which still holds the preserved proxy/custom-pages.json. site-stats.mjs:4538-4541 documents exactly this ("Runtime fallback via /custom-pages/ still works"). isSafeSegment (site-stats.mjs:811) enforces the same charset the regex matches, so every wizard page qualifies. Result: no 404, nothing "vanishes" — the page merely degrades from prerendered HTML to client-rendered, including on PUBLISH_BUILD=0 mirrors, which is the intended mode there. The recommended fix (bash-parsing custom-pages.json to build rsync excludes) is churn for a cosmetic regression.

**Parallel ISO data has drifted: category card advertises Ubuntu 25, the ISO list ships 26.04** — `lib/data/isos.ts:29` (Code quality, claimed medium)

> Quoted strings exist (lib/data/isos.ts:29 description, :32 tags) and ubuntuISOCards does ship 26.04 (:147-148 `id: 'ubuntu25-desktop'` / `title: 'Ubuntu 26.04 Desktop'`). But three load-bearing claims are wrong. (1) `itemCount: '6 ISOs'` (:35) is NOT drifted — ubuntuISOCards holds exactly 6 entries (:106-165). (2) The stale ids are not unnoticed drift: app/downloads/iso/linux/ubuntu/UbuntuOSCards.tsx:11-14 documents them as "Cosmetic drift, deliberately NOT renamed — an id is the join key for published admin edits, so renaming it would silently drop any sysadmin override", matching admin-content.ts:186-188. The recommended rename is the exact change the repo already rejected, and overrides live in gitignored proxy/ JSON, so no code-side migration or test can cover them. (3) tests/card-overrides.test.ts never mentions ubuntu (only :170 ALWAYS_ADDITIVE), so it does not cover the rename. Deriving tags from ubuntuISOCards would also emit junk ('LTS','Desktop','amd64') and fights the admin-editable defaults model (AdminContentEditor.tsx:345). What remains is a two-string copy typo, not a structural defect.

**manage-feedback.sh restore is undone by the running proxy and keeps only one backup generation** — `manage-feedback.sh:22` (Code quality, claimed medium)

> The script text at manage-feedback.sh:20-24 matches the quote, but the two load-bearing claims are wrong.

(1) "no cron, systemd unit or deploy script in the repo invokes this script — grep finds no caller" is false. /var/www/customsh/siteupdate.sh — the deploy script named in project memory — calls it three times: line 81 `chmod +x ./manage-feedback.sh`, line 137 `./manage-feedback.sh backup`, line 195 `./manage-feedback.sh restore`.

(2) "It neither stops nor restarts apen-stats-api ... the next feedback POST overwrites the restored file" is false in the only call path. siteupdate.sh puts the restore immediately before the PM2 restart and documents exactly the hazard the finder raises: "# 5. Restore feedback history — BEFORE the PM2 restart below, so the freshly / started apen-stats-api process reads the restored file at its own startup / (it only loads feedback-history.json once, into memory, at boot)." Restart follows at step 6. So the in-memory array is rebuilt from the restored file, not flushed over it.

The remaining true detail — fixed BACKUP_FILE at line 6 — is a same-run scratch copy taken before `npm run reinstall` (package.json:21) and consumed minutes later in that run, not a retention-bearing backup. Timestamped generations plus a retention count would be churn here.

**Seven of thirteen proxy modules have zero tests, including both HTTP servers and the nginx config writer** — `package.json:23` (Code quality, claimed medium)

> The evidence line is correct (package.json:23), but the headline is wrong. site-stats.mjs — 4,746 of the 6,231 "untested" lines — has a deliberate regression net of source-assertion tests in four files: tests/file-library.test.ts:33-46 pins the /api/admin/file-delete handler including `assert.match(handler, /authorizeAdmin\(req\)/, 'delete must be admin-gated')`; tests/ldap-domain.test.ts:219-244 pins the ldapAuthenticate bind path ("Exactly one bind call", severity propagation, 0600 audit file); ui-behavior.test.ts:350/496/939/1203 and route-images.test.ts:144 pin further routes. tests/file-library.test.ts:28-32 states the technique and why: "Asserted against the proxy source the way ui-behavior.test.ts does, since the handler is not exported." So the recommendation to export authorizeAdmin() re-litigates a documented decision. voltron-proxy.mjs has zero `export` statements (grep on proxy/voltron-proxy.mjs), so testing its clamping logic means a refactor, not a test. The one real nub is proxy/nginx-managed.mjs:44-143 — eight exported pure functions (validateEntry, generateManaged, writeManagedFragments) that emit live nginx config, with no test anywhere and no export barrier. That is a cheap, genuine gap, and low severity.

**No schema version on any state file and no concurrency guard between the proxy and out-of-band writers** — `proxy/site-stats.mjs:1677` (Code quality, claimed medium)

> Two of the three legs fail on the code. (1) INSTALL.sh does NOT install bundle JSON over live state: `proxy/*.json` is rsync-excluded (deploy/INSTALL.sh:126 `--exclude 'proxy/*.json'`) and the loop at 143 does `if [[ -e "$SITE_ROOT/proxy/$base" && $RESET_CONTENT == 0 ]]; then info "keeping this enclave's $base"` — it writes only for files that don't exist, or with an explicit `--reset-content`. So "bundle-installed config can be lost" is wrong by default. (2) The nodes mtime claim mis-attributes cause. commitNodesToDisk (1058-1064) not refreshing nodesFileMtimeMs is harmless: the next sweep sees a changed mtime and re-reads the file it just wrote. The (narrow) real loss is that the CRUD handler mutates the in-memory array (3710 `const idx = infrastructureNodes.findIndex(...)`) without calling reloadNodesIfChanged first, so a hand edit newer than the last sweep (NODE_POLL_INTERVAL_MS default 30s, line 964-967) is overwritten. (3) schemaVersion: the 1677 envelope is the route-images override value, which IS persisted (inside content-overrides.json). Versioning ~20 state files and refusing to load unknown versions (blanking the dashboard) is speculative work for a single-maintainer air-gapped site.

**Speedtest Python backend has 11 pytest files that no gate ever runs** — `speedtest/pyproject.toml:48` (Code quality, claimed medium)

> Cited lines check out mechanically: speedtest/pyproject.toml:48 `testpaths = ["tests"]`, :30 `"pytest==8.3.3"`, package.json:23-24 glob only `tests/**/*.test.ts`, and there is no .github/ in the repo. But the description and both recommendations are wrong where it matters. (1) Count: speedtest/tests/ holds 12 test modules + conftest, not 10 — test_verify_download.py and test_verify_upload.py are omitted. (2) The suite is not orphaned; speedtest/README.md:164-188 documents it as a manual CLI suite, and README:166-173 plus :225 state that 9 of the 12 modules (test_api, test_auth, test_*_endpoint, test_verify_*) "require the server to be running on 127.0.0.1:$SPEEDTEST_PORT". Chaining those into `npm run validate` would either break the build or be swallowed by the proposed skip-guard — a gate that skips cleanly is not assurance, it is churn. (3) The installer half is simply wrong: DEPLOY.md:155-157 lists "/network-analysis service (Speed Test + NetDiag, port 8085) running" under §6 host prerequisites, and deploy/INSTALL.sh:68 `NETDIAG_UPSTREAM="${NETDIAG_UPSTREAM:-127.0.0.1:8085}"` makes the upstream operator-supplied by design. nginx/server.conf:67 points at :8085 while server.conf:461 names a separate pm2 app "apen-speedtest" on :8090 — the installer starting this repo's tree would be a new bug, not a fix.

**Admin transcript CSV export lacks spreadsheet formula-injection protection for user-authored chat text** — `app/admin/AdminChatTranscriptsPanel.tsx:36` (Security, claimed medium)

> Evidence line exists (app/admin/AdminChatTranscriptsPanel.tsx:36), and csvEscape is as quoted (lib/admin/export.ts:15-18 — only `/[",\n]/` triggers quoting). But the claimed effect fails at the cited column. transcriptText (same file, line 27) is `t.messages.map((m) => \`[${m.role}] ${m.text}\`).join('\n')`, so every Transcript cell begins with `[user] ` or `[assistant] ` — never `=`, `+`, `-`, `@`. With 2+ messages the cell contains `\n`, so csvEscape quotes it and the embedded lines stay inside one cell; no later line becomes a cell start. Injection there would need a single-message transcript whose text carries a lone `\r` (not matched by csvEscape) and relies on Excel treating bare CR as a record break — speculative, not the described path. The real reachable path is elsewhere: AdminDashboard.tsx:198 `{ label: 'Title', value: (a) => a.title }` and :201 `{ label: 'Message', value: (a) => a.message }`, fed by proxy/site-stats.mjs:3238-3239 (`title: \`...${data.category}: ...\``, `message: data.message`) from POST /api/site-feedback, which is only session+same-origin gated (nginx/server.conf:286). Those cells do start with raw attacker text.

**Card-override link fields accept any scheme; javascript:/data: hrefs reach public pages unsanitized** — `app/admin/AdminContentEditor.tsx:127` (Security, claimed medium)

> Quoted evidence is real: AdminContentEditor.tsx:127 is exactly `{ field: 'href', label: 'URL', type: 'url', full: true },`; parseFieldValue (line 833-838) returns `raw` for every non-tags type; site-stats.mjs:4243 stores `: data.value` verbatim; custom-pages does sanitize (4495 `sanitizeDownloadHref(d?.href)`, 4517 `sanitizeInternalPath`). So the inconsistency is genuine. The claimed impact is not. (1) The sink is React-rendered `href` only (DocumentationCards.tsx:44-45 `<a href={link.href}`; StaticLink.tsx:21). React 19.2.8 blocks it: node_modules/react-dom/cjs/react-dom-client.development.js:3166-3170 `sanitizeURL` rewrites any `javascript:` URL to `javascript:throw new Error('React has blocked a javascript: URL...')`, and the same string is in the production bundle. (2) No override value reaches innerHTML — the only dangerouslySetInnerHTML is app/layout.tsx:224, a static constant. (3) `data:` top-level navigation is browser-blocked. (4) Reach: nginx/server.conf:448-449 gates `^~ /api/admin/` with admin-acl.inc (4 workstation IPs + 127.0.0.1) — a stolen token alone is useless off-allowlist.

**"Add root" pre-fills the scan root as the filesystem root '/'** — `app/admin/AnnouncementPathsPanel.tsx:106` (Security, claimed medium)

> Evidence exists verbatim: app/admin/AnnouncementPathsPanel.tsx:106 seeds `{ label: '', category: 'Software', fsPath: '/', urlPrefix: '/' }`, and proxy/site-stats.mjs:2303 (`if (!fsPath.startsWith('/') || fsPath.includes('..'))`) does accept "/". But the exploitability chain fails. Writing the roots requires POST /api/admin/announcement-paths, which passes nginx/server.conf:440-442 (`location ^~ /api/admin/` + admin-acl.inc IP allowlist, 403→404) and then authorizeAdmin (site-stats.mjs:2046-2052: admin-kind session + constant-time CSRF header). No attacker-reachable path; it needs a logged-in admin on an allowlisted workstation to type a label and click Save. The claimed effects are also wrong: groupFiles/getPayload (live-announcements-core.mjs:147-153, 182-184) cap the public feed at maxItems=30 announcements showing maxLabels=3 filenames each (~90 names, plus "and N more" counts), not "up to 5000 filenames"; and getLiveAnnouncementPayload caches for cacheSeconds=10 (core.mjs:198-207), so the walk is not run "on every feed refresh". The walk is further bounded by maxDepth 8 / maxFilesScanned 5000 and skips dot-dirs and node_modules (core.mjs:86-93, config.mjs:18-21).

**enclave.env is sourced as root shell code with no ownership/permission check and stays world-readable with the Voltron API key** — `deploy/INSTALL.sh:52` (Security, claimed medium)

> Evidence is verbatim-correct: deploy/INSTALL.sh:50-52 is `[[ -r "$ENV_FILE" ]] || die ...` then `set -a; source "$ENV_FILE"; set +a`, with no ownership/mode check anywhere (grep for stat/chmod over the file shows only SITE_ROOT at :77 and .env.local at :228). README.md:87 does say `cp enclave.env.example enclave.env`.

But the claimed effect fails on both legs.

(1) No marginal privilege. A local user who can write enclave.env in the bundle dir can equally write INSTALL.sh itself — scripts/make-airgap-bundle.sh:157-159 stages both side by side and chmod +x's the script — plus VERIFY.sh (:376) and the vendored pm2 rsynced to /usr/lib/node_modules (:353-355). The whole bundle is root-executed trusted input; `source` is not the boundary, and hardening it removes nothing.

(2) "/proc/<pid>/environ of long-running children" is wrong. Every long-running child goes through `pm2_as() { sudo -H -u "$RUN_USER" pm2 "$@"; }` (:348, :363-367); sudo's default env_reset drops the exports. Only transient root children (rsync, nginx -t, node -e) inherit.

Not remotely reachable: no nginx location or site-stats.mjs handler touches this.

**Air-gap installer writes runtime PII stores world-readable (0644) and copies the whole proxy/ directory into /var/backups** — `deploy/INSTALL.sh:146` (Security, claimed medium)

> Evidence line is verbatim at deploy/INSTALL.sh:146 (`run "install -o '$RUN_USER' ... -m 0644 ..."`), but the claimed effect fails. The loop at :140 iterates `"$HERE"/site/proxy/*.json` — the bundle's copy. scripts/make-airgap-bundle.sh:78-86 excludes chat-history, admin-sessions, general-sessions, auth-events, feedback-history, content-audit, dismissed/acknowledged-alerts and notification-outbox from the staged site, so no PII store is ever in `$HERE/site/proxy/`. The loop can only install admin-authored config (assistant-prompts, content-overrides, custom-pages, file-library-dirs, infrastructure-nodes, nginx-managed). INSTALL.sh's own rsync also carries `--exclude 'proxy/*.json'`, so live stores are untouched; --reset-content only overwrites files present in the bundle, i.e. the same non-PII set. The /var/backups copy (INSTALL.sh:105-111, `cp -a '$SITE_ROOT/$keep' '$BACKUP_DIR/'`) preserves modes, so the 0600 stores stay 0600 in the backup. No network path: nginx/server.conf:226 roots at `out/`; proxy/ is never served, and INSTALL.sh runs only under sudo on a destination enclave.

**Portal hostnames for tiles that were removed from the site still ship in public JS chunks** — `lib/data/constants.ts:52` (Security, claimed medium)

> Code facts check out; the attacker path does not. Confirmed: lib/data/constants.ts:52 `certServices: 'https://cescca.blcse.mil/certsrv/'`, :54 `trellixEpo: 'https://security.blcse.mil:8007/...'`, :55 `facpro: 'http://facpro.blcse.mil/'` (finder quoted 52/54/55 as contiguous; line 53 is `gitlab`), unreferenced outside constants.ts, and nginx/server.conf:610-611 `location ^~ /_next/static/ {` / `auth_request off;` under the site-wide gate at :195. But two things break the finding. (1) No marginal disclosure: the same 34 chunks carry blcseportal/gitlab/acas/qspace identically (grep -rl each → 34 files), and constants.ts:38-43 says these are deliberately published hostnames. Deleting the 3 unused keys changes nothing. (2) Not unauthenticated-reachable: every anon-exempt surface — out/403, out/404 (server.conf:235,240), out/login/index.html's 14 chunks, /search-index.json (:622-623) — references only chunks with zero hits for cescca/security.blcse.mil:8007; turbopack-15bw95h73tp3x.js references 0 of the 34; no autoindex on /_next/static/. Chunk names are 13-char content hashes, so an anon client has no way to name one. Anyone who can enumerate them already holds a session and already sees 9 sibling hostnames rendered in HTML. Notably /search-index.json (anon) contains "blcseportal" but none of the three.

**Installed npm (11.19.0) does not satisfy the declared engines range or the packageManager pin** — `package.json:58` (Security, claimed medium)

> Literal facts check out: package.json:58-60 has "engines": {"node": ">=24.18.0", "npm": ">=12.0.0"}; package.json:7 has "packageManager": "npm@12.0.2"; /usr/lib/node_modules/npm/package.json reports "version": "11.19.0"; no .npmrc in repo, $HOME, /etc, or npm's builtin path. What is refuted is the security framing and medium severity. Nothing is attacker-reachable: no nginx location, no site-stats.mjs handler, and no request input touches package.json — it is build-host hygiene. Both impact mechanisms also fail here. Corepack exists (/usr/lib/node_modules/corepack) but is not enabled: /usr/local/bin is empty and /usr/bin/npm symlinks straight to npm-cli.js, so packageManager is inert and nothing fetches npm 12.0.2 (air-gapped enclave besides). engine-strict only gates install: the admin Publish button spawns 'npm run build' (proxy/site-stats.mjs:625), and deploy/INSTALL.sh:16 says "Never runs npm install: node_modules ships inside the bundle."

**Admin-group lookup on a Global Catalog is not scoped to the account's own domain** — `proxy/site-stats.mjs:1973` (Security, claimed medium)

> Evidence is real: site-stats.mjs:1969 `const searchBase = identity.searchBase || realm.baseDn || bindUser` and :1973 the `scope: 'sub'` search; ldap-domain.mjs:242 carries the "OWN domain" comment; bindEndpoints (ldap-domain.mjs, `identity?.isDefaultDomain ? [...dcs, ...gcs] : [...gcs, ...dcs]`) does add GCs. But no exploit path exists. (1) For a non-default domain the GC is tried first, yet searchBase is `dnFromDomain(domain)` — a child NC root, so `sub` cannot reach siblings/parent. The leak needs the DEFAULT domain, where GCs are last and are only reached on a connection-level failure of every DC — and `globalCatalogEndpoints` derives them by rewriting the SAME hosts' port to 3269, so a host down on 636 is down on 3269. (2) It needs a child NC under DC=blcse,DC=mil; allowedDomains defaults to the realm's own domain and the forest is flat. (3) It needs a namesake child-domain account directly in adminGroupDn, plus valid parent-domain credentials. (4) Even a wrongly-granted admin session buys nothing: /admin (server.conf:250-251) and /api/admin/ (:448-449) additionally require admin-acl.inc. Real but latent; a comment/hardening nit, not a medium security finding.

**Admin-editable announcement scan root accepts any absolute directory; public feed then lists its filenames** — `proxy/site-stats.mjs:2302` (Security, claimed medium)

> Evidence at proxy/site-stats.mjs:2302-2304 is verbatim correct, and there is no fsPath allowlist — confirmed. The mechanism (liveAnnouncementEnv → getLiveAnnouncementPayload → walkFiles emitting `label: basename(fullPath)`, live-announcements-core.mjs:118-125) is real. What fails is the claimed effect. nginx/server.conf:195 sets `auth_request /internal/authcheck;` at server scope, and the comment at 182-188 states every location inherits it unless it opts out with `auth_request off;`. The `location = /api/live-announcements` block (294-299) contains only limit_req/proxy_pass — no `auth_request off`, unlike the deliberately public `= /api/content-overrides` (329-331, "No IP gate, no login gate"). So the feed is not reachable by "every anonymous visitor"; it needs a valid general-or-admin session. Exposure is also bounded: groupFiles caps at maxLabels 3 per date/root group and maxItems 30 groups per response (live-announcements-config.mjs:1-7), dotfiles/.git/node_modules skipped. Writing the roots needs admin-kind session + CSRF (site-stats.mjs:3316-3327, 2046-2056) from an allowlisted IP (server.conf:449).

**Barred-workstation admin attempts are recorded only as unrotated pm2 stdout** — `proxy/site-stats.mjs:2813` (Security, claimed medium)

> Evidence text exists verbatim at proxy/site-stats.mjs:2813, and the guard at 2808-2817 is real (ADMIN_PATH_RE = /^\/api\/admin\//, site-stats.mjs:2427-2429). The claimed effect is wrong. Every admin location includes admin-acl.inc (server.conf:449 for `^~ /api/admin/`, also 339, 346, 375, 430), and admin-acl.inc:20 includes blocked-hosts.inc first, so a barred host is denied by nginx (403 masked to 404, server.conf:450) and never reaches :8788 — the proxy check is explicitly defense-in-depth ("whatever nginx's allowlist says today", 2806-2807). Each attempt IS durably recorded: `access_log /var/log/nginx/cui_nginx_access.log main;` (server.conf:154), rotated daily with `rotate 52` by /etc/logrotate.d/nginx:1-8; site-stats itself parses that file for Site Activity. So "the only record is this console.warn", "nothing rotates and nothing retains", and "can grow without bound until it fills the disk" are all false — the line normally never fires. Residual truth: ecosystem.config.js:14-30 sets no out_file/error_file and /home/dod_admin/.pm2/modules is empty (no pm2-logrotate), so pm2 stdout generally is unrotated.

**POST /api/notification-settings changes admin alert routing with no session or CSRF check** — `proxy/site-stats.mjs:3598` (Security, claimed medium)

> Quoted code is verbatim at proxy/site-stats.mjs:3598-3600, and the missing authorizeAdmin is real. But both stated impacts fail when the request path is traced.

(1) "no session" is wrong. nginx/server.conf:195 sets `auth_request /internal/authcheck;` at server level; the comment at :183-186 notes it is scalar and inherited by every location unless opted out. `location = /api/notification-settings` (server.conf:338-343) contains no `auth_request off;` (verified: 0 matches in 338-351), unlike `/api/content-overrides` at :330 which does opt out. authcheck (site-stats.mjs:2832-2839) requires a valid session cookie. So a session IS required — just any kind, not admin-kind.

(2) The browser-CSRF vector is dead. buildSessionCookie (site-stats.mjs:1752-1754) emits `'HttpOnly','Secure','SameSite=Strict'`. A cross-site simple POST carries no cookie, so authcheck 401s and nginx never proxies to line 3598.

Also site-stats.mjs:2809 blocks barred hosts on these exact routes.

Residual: a general-kind (non-admin) logged-in user on one of four allowlisted IPs can still write these settings.

**/dren is treated as internal by the index builder but has no nginx ACL** — `scripts/build-search-index.mjs:25` (Security, claimed medium)

> Facts check out, framing does not. The quote is at scripts/build-search-index.mjs:26 (not :25), and nginx/server.conf has no /dren location (only apensupport.legacy.conf:261 does, and the deploy copies only server.conf + the four .inc files — scripts/install-hardening-upgrade.sh:130; /etc/nginx/conf.d/apen_support/ holds no legacy conf). But the claimed effect fails: the EXCLUDE list is search-result curation, not an access control — build-search-index.mjs:20 says "Routes that should never appear in user-facing search results", and the same list holds /403, /404, /_next and redirect stubs. So there is one gate, not two disagreeing ones. /dren is not exposed: it falls to `location / {` (server.conf:744) under the site-wide `auth_request /internal/authcheck;` (server.conf:195), so it needs a valid session; it is absent from out/search-index.json (I parsed it). The content is user-facing documentation — app/dren/page.tsx:12 "Public resources and installation guides" — and proxy/assistant-knowledge.mjs:63 has the site's own chatbot advertise /dren and /dren/trellix to every logged-in user. blocked-hosts.inc is scoped to change paths, not reads, so the barred-workstation angle is noise.

**Air-gap bundle ships 323 unverifiable node_modules packages to every enclave** — `scripts/make-airgap-bundle.sh:68` (Security, claimed medium)

> Quoted text is verbatim correct (scripts/make-airgap-bundle.sh:68-69, :9, :231; deploy/INSTALL.sh:16 "Never runs npm install"; 323 top-level dirs in node_modules; no root package-lock.json). But the finding's load-bearing premise is false. `node_modules/.package-lock.json` exists (lockfileVersion 3, mtime 2026-08-24 15:53, same as node_modules) and carries 460 entries each with a `resolved` registry URL and a sha512 `integrity` hash. The rsync at scripts/make-airgap-bundle.sh:70-87 excludes only .next/, .git/, tsbuildinfo, .env.local*, speedtest/logs, __pycache__ and seven proxy/*.json files — nothing matching node_modules, and `rsync -a` copies dotfiles. So the enclave does receive an upstream integrity record and can verify the tree against npmjs.org hashes; the recommendation is substantially already met. Exploitability: nil. `grep -rn make-airgap-bundle` across proxy/, app/, scripts/, nginx/ returns nothing — no nginx location, no site-stats.mjs handler, no tainted input. It is an operator-run build script, not a request-reachable path.

**A unit test asserts the enclave portal URLs must stay in the public search index** — `tests/search-index.test.ts:107` (Security, claimed medium)

> Quoted text verified at tests/search-index.test.ts:107-109 (exact strings). But the claimed effect fails on four checks. (1) The test is not the cause: scripts/build-search-index.mjs:97-102 records every non-anchor href generically, and out/search-index.json's /home/ entry already carries 8 such hostnames while the test pins 3 — deleting the test removes nothing. (2) The real exposure is nginx/server.conf:622-623 `location = /search-index.json { auth_request off;` versus the site-wide `auth_request /internal/authcheck;` at server.conf:195 that gates /home/ itself. The minimal fix is deleting that one `auth_request off;` — the test reads the built file (tests/search-index.test.ts:25 `const INDEX = path.join('out','search-index.json')`), never HTTP, so it stays green. The premise that fixing the leak trips the test is false for the obvious remediation. (3) "Breaks CI": there is no CI config in the repo; tests run only via package.json:23-24 and self-skip when out/ is absent. (4) lib/data/constants.ts:37-41 documents these as "already-published internal hostnames," with raw-IP destinations deliberately kept behind /api/external. No attacker-reachable defect is introduced by this test.

## Reported only — low and informational

Not adversarially verified.

| Severity | Category | Location | Finding |
|---|---|---|---|
| low | Copyright | `app/trellix/reference/TrellixRefCards.tsx:26` | Trellix Agent cmdagent switch descriptions mirror the vendor product guide's reference table |
| low | Copyright | `lib/data/card-colors.ts:55` | Card glow palette derives its OKLCH values from Tailwind docs and carries a third-party product name |
| low | Copyright | `lib/data/docs-content.ts:23` | Microsoft Learn release-note content summarized into site data with source credited only in a source comment |
| low | Copyright | `lib/data/isos.ts:85` | Linux distribution taglines reproduced verbatim as ISO card descriptions |
| low | Copyright | `lib/data/utils.ts:4` | shadcn cn() helper copied verbatim with no attribution |
| low | Copyright | `node_modules/lightningcss/package.json:4` | MPL-2.0 build components redistributed in the air-gap bundle without the required source-availability notice |
| low | Copyright | `NOTICE:13` | NOTICE has no third-party attribution section despite bundled OSS runtime dependencies |
| low | Copyright | `public/logos/real/pngegg.webp:1` | Stock-site-derived image pngegg.webp deployed but unreferenced |
| low | Copyright | `speedtest/Dockerfile:5` | Dockerfile repeats the retired "standard library only / requests+pytest only" claim while installing FastAPI and uvicorn |
| low | Code quality | `app/admin/AdminCustomPagesPanel.tsx:27` | The feedback-banner type is redeclared in six places with two incompatible spellings of the error variant |
| low | Code quality | `app/admin/AdminDashboard.tsx:529` | Dashboard poll and notification loader write state with no unmount guard, unlike their sibling effects |
| low | Code quality | `app/admin/AdminPageWizard.tsx:1409` | Non-null assertion on an optional array in the wizard preview |
| low | Code quality | `app/docs/DocsCategoryCards.tsx:9` | The registry-managed 'logo' lock is applied to only 4 of 19 card grids |
| low | Code quality | `app/docs/el/certificates/CryptoCards.tsx:31` | EL and Ubuntu SSH guides prescribe different key algorithms, and the EL card title/tags contradict its own body |
| low | Code quality | `app/globals.css:454` | Dead CSS: .cyber-grid and .cyber-verticals plus their keyframes ship on every page for elements no component renders |
| low | Code quality | `app/repos/deb/page.tsx:3` | Four redirect stubs are unreachable dead code — nginx 301s the same paths first |
| low | Code quality | `app/speedtest/page.tsx:7` | app/speedtest/page.tsx is dead and its comment states the opposite |
| low | Code quality | `components/cards/HoverRevealCard.tsx:193` | Every card logo loads with loading="eager", defeating the deliberate lazy-loading used elsewhere |
| low | Code quality | `components/cards/HoverRevealGrid.tsx:39` | The atmospheric backdrop block is copy-pasted verbatim across three grid components |
| low | Code quality | `components/common/ThemedLogo.tsx:94` | ThemedLogo routes raster logos through next/image although images.unoptimized is set, paying the wrapper cost for no optimisation |
| low | Code quality | `components/layout/Navbar.tsx:650` | Navbar's mobile menu toggle has no aria-expanded or aria-controls |
| low | Code quality | `components/layout/PageHeader.tsx:142` | PageHeader.tsx exports a second, unused DownloadRow that collides by name with the canonical shared one |
| low | Code quality | `components/legal/veterans-crisis-line.tsx:42` | Crisis Line phone-number table has no caption and no scope on its header cells |
| low | Code quality | `components/ui/activity-chart-card.tsx:222` | ActivityChartCard reads the clock in a useState initializer, which runs at build time during static export |
| low | Code quality | `cuica.crt:1` | cuica.crt is not a certificate — it is a saved nginx 301 error page |
| low | Code quality | `deploy/INSTALL.sh:185` | umask 077 set mid-script persists into nginx and pm2 directory creation on fresh installs |
| low | Code quality | `exports/tenable-iris/LottieMark.tsx:46` | exports/tenable-iris is 400 KB of tracked duplicates that nothing imports |
| low | Code quality | `lib/data/admin-content.ts:1469` | Hostname hardcoded 13 times in admin code despite constants.ts declaring itself the single place to change it |
| low | Code quality | `lib/data/navigation.ts:40` | Route casing is inconsistent: /PDQ and /VisualStudio among otherwise all-lowercase routes |
| low | Code quality | `lib/data/site-updates.ts:19` | Redirect stubs are advertised as new pages in the public Site Updates feed |
| low | Code quality | `lib/data/visual-studio.ts:117` | Four visual-studio.ts exports are kept "so existing imports keep resolving" — there are no importers |
| low | Code quality | `nginx/login-redirect.inc:20` | nginx internal redirect means the login page never actually sees `?next=`; post-login always lands on /home |
| low | Code quality | `package.json:23` | Test discovery relies on an unquoted shell glob that matches nothing and falls through to Node's own globber |
| low | Code quality | `package.json:39` | zod is a production dependency but is never imported anywhere in the repository |
| low | Code quality | `proxy/site-stats.mjs:4641` | Speedtest garbage endpoint regenerates a 1 MiB random buffer per request while its comment claims the buffer is pre-generated and reused |
| low | Code quality | `README.md:238` | README documents dev/build/proxy commands but never mentions lint, typecheck, test or validate |
| low | Code quality | `scripts/audit-download-links.mjs:12` | No build-time check that internal card hrefs resolve to real routes or that card ids are unique |
| low | Code quality | `tsconfig.json:10` | tsconfig strict is on but the high-value incremental flags are absent and skipLibCheck hides type-package breakage |
| low | Security | `.gitignore:73` | .env.local.bak-20260826 duplicates live ADMIN_API_TOKEN and VOLTRON_API_KEY |
| low | Security | `app/admin/InfrastructureNodesPanel.tsx:972` | Internal IP addressing scheme is baked into the public static bundle via admin placeholders |
| low | Security | `app/admin/InfrastructureNodesPanel.tsx:972` | Admin infrastructure-node IPs compiled into a chunk served without any auth |
| low | Security | `app/certsrv/request/CertRequestWizard.tsx:154` | User-typed paths and cert-derived DN values are spliced unescaped into downloadable shell/INF/cnf files |
| low | Security | `app/certsrv/request/CertRequestWizard.tsx:218` | Windows INF marks new private keys Exportable=TRUE while UI says they are non-exportable |
| low | Security | `app/certsrv/request/CertRequestWizard.tsx:1734` | Portal iframe trains users to type AD domain credentials into an invisible-origin frame; fallback never fires |
| low | Security | `auth_requirement.md:108` | Superseded auth design doc with placeholder secret and DC hostnames still tracked |
| low | Security | `components/assistant/FormattedMessage.tsx:28` | Backslash-prefixed 'internal' link (/\host) becomes an off-site navigation when the route index is unavailable |
| low | Security | `components/common/SiteInspectionGuard.tsx:43` | SiteInspectionGuard is security theater and its gate is 'any session', not 'admin ACL' |
| low | Security | `DEPLOY.md:183` | Deploy documentation instructs `npm install` rather than `npm ci` for rebuilds on the restricted host |
| low | Security | `deploy/INSTALL.sh:109` | Update backups copy live session/PII state into /var/backups and are never pruned |
| low | Security | `deploy/INSTALL.sh:146` | Admin-authored runtime JSON installed 0644 on the target although the proxy keeps it 0600 |
| low | Security | `deploy/INSTALL.sh:252` | ADMIN_WORKSTATIONS lines are written into nginx allow directives without validating the IP field |
| low | Security | `lib/data/admin-content.ts:467` | Legacy shared admin token is stored in plaintext in sessionStorage, readable by any same-origin script |
| low | Security | `lib/utils/cert-parsing.ts:168` | DER length decoding overflows to negative and sends readChildren into an infinite loop |
| low | Security | `manage-feedback.sh:13` | Feedback backup copies PII file without preserving its 0600 mode |
| low | Security | `nginx/security-headers.inc:9` | CSP allows 'unsafe-inline' scripts and styles site-wide |
| low | Security | `nginx/security-headers.inc:9` | CSP allows 'unsafe-inline' scripts, so XSS mitigation is nominal; layout inline script could be hash-allowlisted |
| low | Security | `nginx/server.conf:250` | /admin and /test are plain prefix locations; the two-segment regex outranks them for /admin/<sub>/ paths (latent ACL bypass) |
| low | Security | `nginx/server.conf:329` | /api/content-overrides (all published custom pages, bodies and download hrefs) is served without a session |
| low | Security | `nginx/server.conf:408` | Several proxied API locations have no limit_req |
| low | Security | `nginx/server.conf:550` | /netdiag/ is proxied in cleartext to the peer host 140.32.71.81 while its WebSocket goes to loopback |
| low | Security | `package.json:20` | package.json clean/reinstall throw away the lockfile; upgrade runs unpinned remote code via npx |
| low | Security | `proxy/blocked-hosts.mjs:6` | blocked-hosts parser silently drops CIDR and non-canonical deny entries |
| low | Security | `proxy/blocked-hosts.mjs:34` | Client IP for block list and audit trail is taken from an unvalidated X-Real-IP header |
| low | Security | `proxy/cert-request.mjs:202` | cert-request returns raw upstream error messages to the browser |
| low | Security | `proxy/cert-request.mjs:202` | Raw CEP/CES error messages are echoed to the client, defeating the hostname-hiding intent |
| low | Security | `proxy/cert-request.mjs:209` | /api/cert-request/submit has no CSRF token check or per-user session binding |
| low | Security | `proxy/cert-request.mjs:216` | Non-object JSON body (`null`) throws inside the async request listener with no rejection handler |
| low | Security | `proxy/cert-request.mjs:222` | cert-request submit: template allow-list is optional, CSR is unvalidated, and no user identity is bound to the request |
| low | Security | `proxy/cert-request.mjs:222` | Template allow-list fails open and the UI offers free-text template names when it is empty |
| low | Security | `proxy/file-library.mjs:304` | Upload can target any subdirectory of the webroot, including rsync mirrors and /certs, with silent overwrite |
| low | Security | `proxy/live-announcements-core.mjs:178` | Announcement walk cap is per root and counts only files; 50 admin roots can trigger a large synchronous scan on a public endpoint |
| low | Security | `proxy/site-stats.mjs:231` | Plaintext ldap:// endpoints are accepted for password binds and propagated to derived GC URLs |
| low | Security | `proxy/site-stats.mjs:439` | Content and custom-page state files written non-atomically (corruption/total loss on crash) |
| low | Security | `proxy/site-stats.mjs:685` | Managed nginx fragments are written to /etc/nginx before validation and reverted only on a stderr regex match |
| low | Security | `proxy/site-stats.mjs:1100` | Infrastructure-node SSRF guard matches literal hostnames only (DNS alias / rebind bypass) |
| low | Security | `proxy/site-stats.mjs:1877` | Username-box contents are echoed to world-readable pm2 logs despite the 0600 rationale |
| low | Security | `proxy/site-stats.mjs:2006` | An operation timeout re-sends the same password to the next endpoint, breaking the one-bind invariant |
| low | Security | `proxy/site-stats.mjs:2064` | Admin-token fallback grants admin to any cookie-less request; safe only because nginx injects the token AND auth_request is on |
| low | Security | `proxy/site-stats.mjs:2302` | Admin announcement-path config accepts any absolute filesystem path |
| low | Security | `proxy/site-stats.mjs:2305` | Announcement urlPrefix allows protocol-relative '//host/' links in the public feed |
| low | Security | `proxy/site-stats.mjs:2405` | Notification outbox subject/body built from unsanitized feedback fields (latent email header injection) |
| low | Security | `proxy/site-stats.mjs:2902` | No in-proxy login throttling; brute-force protection relies solely on nginx per-IP limit and AD lockout |
| low | Security | `proxy/site-stats.mjs:2972` | Sessions have a fixed 8h absolute TTL with no idle timeout, no rotation and no IP binding |
| low | Security | `proxy/site-stats.mjs:3228` | Public POST routes read request bodies with no size cap in the proxy |
| low | Security | `proxy/site-stats.mjs:3232` | Feedback moderation is advisory only: server trusts the client-supplied `moderation` verdict and nothing blocks flagged text |
| low | Security | `proxy/site-stats.mjs:3244` | Public feedback endpoint stores unbounded, unsanitized records (array never trimmed, message length uncapped) |
| low | Security | `proxy/site-stats.mjs:3451` | Admin persona edits are not versioned; audit entry records only the byte count |
| low | Security | `proxy/site-stats.mjs:3572` | Server-side transcript store is client-authored, unbounded in time, and labelled an audit view |
| low | Security | `proxy/site-stats.mjs:3977` | Concurrent uploads to the same target name race past the offset check and corrupt the finished file |
| low | Security | `proxy/site-stats.mjs:4678` | /api/speedtest/getip trusts the first X-Forwarded-For hop, which the client controls |
| low | Security | `proxy/voltron-proxy.mjs:586` | Non-string upstream message content is passed through and crashes the widget render |
| low | Security | `public/test/index.html:398` | UI mock with fabricated internal topology deployed at /test/ on the production site |
| low | Security | `scripts/make-airgap-bundle.sh:64` | Bundle staged and packed under a predictable name in world-writable /tmp |
| low | Security | `scripts/make-airgap-bundle.sh:78` | Air-gap bundle exclude list does not match the .gitignore runtime-state list it claims to mirror |
| low | Security | `scripts/verify-nginx-headers.sh:4` | Header verification script skips every location that overrides add_header and is not run by the deploy |
| low | Security | `speedtest/backend/server.py:113` | seen_ping_ips set grows without bound, keyed by the spoofable X-Forwarded-For value |
| low | Security | `speedtest/backend/server.py:147` | Upload endpoint has no body-size or duration limit of its own; relies on nginx defaults that the direct :8085 path does not apply |
| low | Security | `speedtest/Dockerfile:11` | Container base image pinned to a floating tag, and requires-python contradicts it |
| low | Security | `speedtest/Dockerfile:59` | Runtime image ships the pytest harness and README into /app; deps are unpinned floors and the Dockerfile header is stale |
| low | Security | `speedtest/requirements.txt:9` | requests pinned to 2.32.3, which predates the .netrc credential-leak fix |
| info | Copyright | `app/applications/speedtest/page.tsx:10` | Removed LibreSpeed engine: frontend bundle is gone, but the Node-side replica was left behind |
| info | Copyright | `components/layout/StarfallBackground.tsx:9` | StarfallBackground 'Inspired by' comment refers to an aesthetic, not a code source |
| info | Copyright | `components/legal/veterans-crisis-line.tsx:6` | Legal pages are original paraphrase rather than copied text, but carry no source provenance |
| info | Copyright | `lib/data/visual-studio.ts:42` | Visual Studio edition descriptions paraphrase Microsoft's edition-comparison marketing copy |
| info | Copyright | `proxy/NGINX_VTS_RUNBOOK.md:118` | nginx-module-vts license is identified in the runbook but its BSD-2 text is not reproduced anywhere |
| info | Copyright | `speedtest/backend/config.py:71` | Speed-test tunables resemble LibreSpeed defaults, but are conventional values, not evidence of copying |
| info | Copyright | `speedtest/Dockerfile:11` | python:3.12-slim base image carries GPL/LGPL userland into redistributed air-gap bundles |
| info | Copyright | `speedtest/frontend/index.html:9` | favicon is APEN's own seal, not a third-party icon set — but the .ico is actually a PNG |
| info | Copyright | `speedtest/frontend/speedtest.js:9` | speedtest/frontend/speedtest.js is original — no LibreSpeed, OpenSpeedTest, Ookla or fast.com fingerprints |
| info | Copyright | `speedtest/pyproject.toml:11` | speedtest subproject declares a conflicting "Proprietary" license and a third author identity |
| info | Code quality | `app/downloads/vmware/v8/VMware8Cards.tsx:12` | 19 near-identical card-grid components and 30 identical page scaffolds differ only in a scope string and an import |
| info | Code quality | `Old HTML/index.html:1` | Old HTML/ and manage-feedback.sh are tracked legacy artifacts referenced by nothing |
| info | Code quality | `tests/tile-a11y.test.ts:61` | The repo's only a11y gate checks one ARIA anti-pattern and nothing else |
| info | Security | `app/support/status/page.tsx:111` | Dead code in ticket-status page carries a bearer-token fetch with unescaped email interpolation |
| info | Security | `cuica.crt:1` | cuica.crt at repo root is an nginx 301 page, not a certificate |
| info | Security | `nginx/server.conf:135` | gzip enabled for proxied JSON over TLS (BREACH surface) |
| info | Security | `nginx/server.conf:461` | Deploy provenance of the running speedtest backend does not match the repo: port and process claims disagree and no pm2 entry exists |
| info | Security | `proxy/cert-request.mjs:6` | Internal CA hostname and CA config string committed in source comments and .env.example |
| info | Security | `proxy/cert-request.mjs:185` | /status discloses enrollment backend configuration to any logged-in visitor |
| info | Security | `proxy/file-library.mjs:530` | Admin JSON responses expose absolute server paths |
| info | Security | `proxy/site-stats.mjs:4055` | Admin file-op error responses leak server filesystem paths and raw error messages |
| info | Security | `proxy/voltron-proxy.mjs:568` | API key handling is sound: bearer token stays server-side, upstream URLs are never echoed |
| info | Security | `public/robots.txt:7` | robots.txt enumerates legacy admin paths and is itself behind the login gate |
| info | Security | `speedtest/backend/config.py:25` | Speedtest allowlist documents org network ranges with site labels |

## Appendix — method and coverage

Twenty-four finding agents read the tree at commit `df7b285`, each with a distinct lens and an explicit file scope: fourteen on security, five on copyright and copied code, five on code quality. A completeness critic then reviewed every agent’s coverage notes and commissioned six further lenses covering privacy and retention, accessibility and Section 508, audit-logging completeness, restricted-content exposure, state durability and restore, and files no other agent had read. That produced 312 findings, of which 188 at high and medium severity went to 231 adversarial verifiers.

Every agent was instructed to cite an exact file and line, quote evidence verbatim, redact secret values, and never modify files, run builds, restart services, or make network requests. Duplicate reports of one issue from different lenses are kept separate so corroboration is visible.

One verifier’s output contained text shaped like configuration directives. The harness neutralised it automatically. The content was a legitimate finding about the air-gap bundle shipping editor settings that contain internal addresses, and it appears in this report as such.
