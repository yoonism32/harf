# Lighthouse findings and follow-up

Status: active measured-performance follow-up. Based on the owner's four Chrome 156 / Lighthouse 13.5 reports
in `test-results/lighthouse-run_*.json` (29 October). Those local reports are ignored build artifacts, not committed evidence.

| Page / device | Performance | LCP | Blocking time | Accessibility | Best practices | SEO |
|---|---:|---:|---:|---:|---:|---:|
| Landing / desktop | 100 | 0.8s | 0ms | 100 | 96 | 100 |
| Today / desktop | 91 | 2.0s | 0ms | 100 | 96 | 63 |
| Today / mobile | 79 | 5.1s | 170ms | 100 | 96 | 63 |
| Reader 2:255 / mobile | 76 | 6.3s | 150ms | 100 | 96 | 100 |

Agentic browsing scored 100 throughout. Scores describe these runs, not permanent release guarantees.

## Every amber/red finding

| Finding | Evidence and response |
|---|---|
| Visible label/accessibility name mismatch | Real defects despite the unscored experimental check and 100 category score. Wordmark omits Arabic; translation preview omits visible “Verse”. Correct names and explicitly exercise this axe rule. |
| CSP issue | Reproduced independently through Chrome DevTools Protocol on live Today. `script-src` blocks `Function("")` in Zod's capability probe, caught by the library. Configure `jitless` before client startup; preserve nonce policy and test for actual policy violations. |
| LCP / interactive timing | Mobile LCP 5.1–6.3s is the main performance target. Compare repeated cold runs with the same device/state and simulated throttling. The report's observed LCP breakdown uses different timing from its simulated headline; do not subtract these as if equivalent. |
| Total blocking time / maximum potential input delay | Mobile blocking 150–170ms and maximum potential delay 120–210ms warrant profiling client initialization, parsing and shared bundles. They are not measured real-user INP. |
| Unused JavaScript | About 88–90KiB estimated savings; modelled LCP benefit 450ms mobile, 0–70ms desktop. Identify modules in production chunks and defer genuinely optional work; preserve validation and account isolation. Coverage during navigation does not prove code is dispensable. |
| Legacy JavaScript | About 12KiB; flagged methods match installed Next.js `dist/build/polyfills/polyfill-module.js`. This is compatibility scaffolding, not evidence that Harf's authored JavaScript is obsolete. Review supported-browser/build options before changing targets; do not strip dependencies or polyfills blindly. |
| Render-blocking CSS | Shared stylesheet transfers about 8.6KiB; estimated mobile savings 110–120ms. Keep critical styles available; investigate only with a measured win and no unstyled flash. |
| Network dependency tree | Reported critical chain is document → stylesheet, around 237–295ms. No recommended preconnect candidates. Do not add unused third-party preconnects. Inspect client content waterfalls separately. |
| Back/forward cache | Reports `no-store` on document and a fetched resource, marked not actionable by Lighthouse. Keep account freshness/security boundaries; only change caching after understanding Next.js nonce/dynamic rendering and real navigation behaviour. |
| Today blocked from indexing | Intentional robots and `X-Robots-Tag` policy for a personal dashboard. Landing/reader SEO 100 confirms this is route-specific. Preserve it. |
| IndexedDB warning | Harf creates a database even in incognito. Record guest/account state and cold/warm conditions; do not clear the owner's normal browser data. |

## Ordered performance investigation

Initial fixes verified locally: Wordmark and translation previews include their visible labels in accessible names;
client instrumentation selects Zod's interpreted validator before startup. The unchanged strict CSP now produces no
policy violations in the audited landing/Today/2:255 journey across Chromium, Mobile Chrome and WebKit. The experimental
label rule is explicitly enabled. TypeScript, production build, 151 unit tests, size budgets and 46 targeted browser
checks passed (two existing skips). This is regression evidence, not a fresh Lighthouse score or deployed verification.

1. Land and verify accessible-name and CSP-probe fixes. No post-change Lighthouse score is claimed until rerun.
2. Measure font priority: all five local font files are preloaded globally (about 473KiB transferred in the mobile reports).
   Determine which faces are needed on each route before changing preload; retain legible Arabic and stable layout.
3. Profile shared validation/account/learning bundles. Keep feature-specific loading lazy; compare bytes, blocking time and LCP.
4. Measure content delivery: reader 2:255 fetches the full surah (~253KiB transferred); Today fetches overlap (~169KiB).
   Consider smaller validated assets or avoiding unnecessary overlap work, with compiler/version/hash changes and cache/retry tests together.
5. Repeat at least three comparable mobile runs per affected route. Record median LCP, blocking time, request bytes and layout shift;
   verify reader, guest/account study, audio and cache bounds. Retain changes only when evidence supports the tradeoff.

This creates an actionable performance backlog; it does not reopen the completed personal learning plan.
