# Recently Fixed

## Study Session queue drift

- **Weakness:** `/app/study/page.tsx` reimplemented the session queue logic instead of using the tested scheduler in `lib/srs.ts`, so queue composition could drift from the SRS rules and the tests covering `buildSessionQueue` wouldn’t guard the UI.
- **Fix:** Reused `buildSessionQueue` for queue construction and corrected the review count bookkeeping so the last card is included in saved session stats.

## Word detail performance and examples

- **Weakness:** `/app/word/[id]/page.tsx` eagerly imported the ~1 MB `wbw-morphology.json`, inflating the bundle for every word page, and only fetched one example verse despite the UI promising three.
- **Fix:** Morphology now lazy-loads on demand and the root family panel shows a loading skeleton; example verses fetch the previous, current, and next ayah when available.

## Backup integrity

- **Weakness:** `importAllData` accepted any JSON without checking the schema version, risking silent corruption if an older/newer backup was loaded.
- **Fix:** Added schema version validation against the exported `SCHEMA_VERSION` constant and return a clear error when versions diverge.

## Coverage display accuracy

- **Weakness:** Word coverage percentage in `/app/word/[id]/page.tsx` double-normalized the value and mislabeled the source.
- **Fix:** Use the stored weight directly for the percentage and update the source label to reflect the CDN API used.

## Coverage ceiling clarity

- **Weakness:** Docs/UI implied ~90% coverage though the dataset caps at ~80%.
- **Fix:** README/CLAUDE now state the 80% ceiling and CoverageHero surfaces the cap note.

## Resilient widget fetches

- **Weakness:** Daily Ayah and Prayer Times silently failed on network errors.
- **Fix:** Added user-visible errors and retry actions to both widgets, keeping dashboards informative under flaky networks.

---

name: skill_queue_progress
description: Progress through the skill iteration queue for Harf codebase improvements
type: project
---

User asked to iterate through a skill queue and apply each to the Harf codebase. Status as of this memory write:

**Why:** User said "directly and situationally iterate through each skill, lets go bismillah" — autonomous improvement run through the listed skills.

**How to apply:** Continue from the next unfinished skill in the queue, invoking the Skill tool then making changes.

## Completed Skills

1. **fullstack-dev-skills:nextjs-developer** ✅
   - Split `app/word/[id]/page.tsx` into Server Component (with `generateMetadata`) + `WordDetailClient.tsx`
   - Split `app/verse/[surah]/[ayah]/page.tsx` into Server Component (with `generateMetadata`) + `VersePageClient.tsx`
   - Added `app/word/[id]/not-found.tsx` (styled not-found page with Arabic ?)
   - Added route-level `loading.tsx` for: `words/`, `word/[id]/`, `names/`, `coverage/`
   - All use `params: Promise<{...}>` (Next.js 16 async params pattern)

2. **fullstack-dev-skills:react-expert** ✅
   - Wrapped `stopAudio`, `playWord`, `handleVerseClick` in `useCallback` in `DailyAyah.tsx`
   - Improved `ErrorBoundary.tsx`: added `componentDidCatch` for dev logging + "Try again" reset button

3. **fullstack-dev-skills:typescript-pro** ✅
   - Exported `Mastery = 0 | 1 | 2 | 3 | 4 | 5` type from `lib/srs.ts`
   - Used `satisfies readonly StudyButton[]` on `STUDY_BUTTONS` (removed redundant `as ResponseKey` casts)
   - Tightened `deriveMastery` return type to `Mastery`

4. **tailwindcss-responsive-darkmode** ✅
   - Added `viewportFit: 'cover'` to viewport meta in `app/layout.tsx`
   - Added `@utility pt-safe/pb-safe/pl-safe/pr-safe` to `globals.css`
   - Applied `pb-safe` to main content wrapper in `LayoutShell.tsx`

5. **tailwindcss-animations** ✅
   - Replaced inline `animationDelay` styles with `[animation-delay:...]` Tailwind classes in `FlashCard.tsx` and `AudioButton.tsx`
   - Added `motion-reduce:animate-none` to `VersePlayButton` bounce bars
   - Added `animate-fade-in`, `animate-slide-up`, `animate-rise` entrance animations to `SessionComplete.tsx`
   - Added `active:scale-[0.97]` button press feedback to SessionComplete buttons
   - Added `duration-150` to StudyQueue forecast tooltip

6. **tailwindcss-advanced-design-systems** ✅
   - Added `@utility focus-ring` to `globals.css` (DRY focus pattern for non-standard interactive elements)
   - Applied `focus-ring` to `div[role="button"]` in `FlashCard.tsx`
   - Applied `focus-ring` to `AudioButton.tsx`
   - Used `z-dropdown` token in `ReciterSelect.tsx` (was `z-[60]`) and `LayoutShell.tsx` (was `z-[100]`)
   - Used `z-dropdown` in `AyahSearchInput.tsx`

7. **web-performance-optimization** ✅
   - Converted `MorphologyTable.tsx` from static import to dynamic `import()` in `useEffect` (removes 320KB `morphology.json` from initial client bundle)
   - Added loading skeleton to `MorphologyTable.tsx`
   - Added `Cache-Control: public, max-age=3600, stale-while-revalidate=86400` to tafsir API route
   - Added `poweredByHeader: false` to `next.config.ts`

8. **core-web-vitals-tuner** ✅
   - Fixed CLS: `CoverageHero` skeleton changed from `h-48` to `min-h-[260px]` (better matches actual content height)
   - Fixed `z-dropdown` token in `AyahSearchInput.tsx` dropdown

9. **accessibility-compliance** ✅
   - Added `aria-current="page"` to active `NavLink` in `Navbar.tsx`
   - Added `aria-hidden={!mobileOpen}` to mobile nav drawer (hides from AT when closed)
   - Added `role="alert"` to import status message in `settings/page.tsx`

10. **playwright-e2e-testing** ✅
    - Fixed empty-state seed in `e2e/study.spec.ts` to use real word IDs with FSRS format (was using fake `word-1..500` IDs that didn't match actual root-based IDs like `a-l-h`, causing all real words to still appear as "new")
    - Removed `waitForTimeout` anti-pattern in session-complete test; replaced with `waitForFunction` polling text content
    - Added `@smoke` tags to critical path tests (study fresh session, dashboard load, words show)
    - Added `aria-current="page"` accessibility test for nav (verifies skill #9 improvement)
    - Improved word detail test to assert Arabic text visible (not just `main`)

11. **fullstack-dev-skills:test-master** ✅
    - Added 25 new unit tests to `lib/__tests__/storage.test.ts` (total: 158 tests, was 133)
    - New coverage: `getAllNameProgress`, `getNameProgress`, `setNameProgress`
    - New coverage: `setLastVerse`, `getLastVerse`
    - New coverage: `getLocation`
    - New coverage: `importAllData` (12 tests covering all code paths: invalid JSON, null JSON, wrong version, full restore, partial restore, per-field import, success message format)

12. **pwa-development** ✅
    - `app/manifest.ts` already existed; added SVG icon entry (`/icons/icon.svg`, sizes: "any")
    - Created `public/sw.js` — network-first navigation SW; cache-first for audio; stale-while-revalidate for cdn.jsdelivr.net
    - Created `components/PWARegister.tsx` ('use client', registers SW on mount) — wired into `app/layout.tsx`
    - Created `public/offline.html` — styled offline fallback matching Harf dark/gold theme
    - Created `public/icons/icon.svg` — ح glyph, gold on dark, 512×512 with gold ring
    - Fixed CSP: `worker-src blob:` → `worker-src 'self' blob:`
    - Added `icons` to layout metadata (SVG favicon + apple-touch-icon ref)
    - **Note:** PNG icons still missing — needed for full Chrome installability; export from SVG source

13. **css-native** ✅
    - Improved `card-reveal` keyframe: added `translateY(8px)` to `from` state (Disney slow-out — content slides up into place, not just scales)
    - Staggered `MasteryButtons` entrance: each button gets `animate-rise` + `animationDelay: i * 60ms` (Overlapping Action / Follow Through principle)
    - Mastery bar segments: added `[transition-timing-function:var(--ease-out-expo)]` (smooth deceleration as bars fill)
222
14. **frontend-design-pro:review** ✅
    - Reviewed landing, dashboard, study pages + CoverageHero, LayoutShell
    - **Passes:** No hero badges, no generic fonts, no purple-blue gradients, skip link in LayoutShell, strong gold/dark contrast, motion properly gated
    - Fixed `app/page.tsx`: outer `<div>` → `<main>` (missing landmark, LayoutShell bypasses it on `/`); wordmark `<div>` → `<h1>` (no heading on landing page)
    - Fixed `CoverageHero.tsx`: removed redundant `style={{ fontFamily: 'Amiri, serif' }}` (already covered by `font-amiri` class)

15. **all-commands:write-tests** ✅
    - Added 7 tests for `getNewWords` (completely untested): returns all unreviewed, excludes reviewed, respects limit, empty input/limit/all-reviewed, preserves order
    - Added 3 tests for `buildSessionQueue`: exact 2:1 interleaving order, due-only, new-only scenarios
    - Added 6 tests for `RANKS` structure: 5 ranks, sequential levels 1–5, string fields, contiguous ranges (minPct[N]=maxPct[N-1]), starts at 0, ends at 100
    - Added 5 tests for `SURAHS` array: 114 surahs, sequential numbers, required fields, Al-Fatiha/Al-Baqarah/An-Nas spot checks
    - Added 2 tests for `calculateCoverage` precise weight math and key-format sensitivity
    - Total: 158 → **182 tests** (24 new, all passing)

16. **all-commands:performance-audit** ✅
    - `lib/quran-api.ts`: replaced `SURAHS.find()` (O(114)) with pre-built `SURAH_NAME_MAP` (O(1)) called on every `fetchAyah()`
    - `lib/storage.ts`: `getFutureReviews()` O(days×n) → O(n): now initializes day buckets in one pass then single-scans all progress (was 7 separate `.filter()` calls over all records)
    - `components/dashboard/StudyQueue.tsx`: hoisted `forecastMax` out of the `.map()` loop (was recomputed 7× per render)
    - `app/study/page.tsx`: removed redundant `style={{ fontFamily: 'Amiri, serif' }}` on empty-state div (already covered by `font-amiri` class)

17. **all-commands:refactor-code** ✅
    - `lib/storage.ts`: Extracted `migrateFromSM2()` helper + `SM2Record` interface — eliminated ~8 lines of duplicated SM-2→FSRS migration logic shared between `getAllWordProgress` and `getAllNameProgress`
    - `app/words/page.tsx`: Combined two-pass filter (`[...words]` spread + search filter + mastery filter) into single `.filter()` pass — removes intermediate array allocation
    - `app/study/page.tsx`: Added `useMemo` for `progress` (keyed on `currentWordId`) — `getAllWordProgress()` was re-parsing localStorage on every re-render (including verse-load renders), now only re-reads when current word changes

18. **all-commands:optimize-bundle-size** ✅
    - `StudyQueue.tsx`: Converted static `words.json` import to dynamic `import()` inside `useEffect` — removes 124KB from dashboard client bundle
    - `CoverageHero.tsx`: Same — dynamic import with `wordsForCoverage` computed inside the `.then()` callback
    - `ListeningDrill.tsx`: Converted static `surah-info.json` (340KB!) import to dynamic `import()` on mount via `surahInfoRef` — removes 340KB from drill page chunk; `HintPanel` receives `surahInfo` as a prop

19. **superpowers:systematic-debugging** ✅
    - Ran full test suite (182 → 184 tests, all pass) and `tsc --noEmit` — no baseline failures
    - **Bug found**: `getDailyAyahRef()` in `lib/quran-api.ts` had off-by-one: `new Date(now.getFullYear(), 0, 0)` creates Dec 31 of previous year, making `day=1` on Jan 1 → `idx=2` — ayah 1:1 was never served as daily ayah
    - **Fix**: Changed to `new Date(now.getFullYear(), 0, 1)` (Jan 1) so `day=0` on Jan 1 → `idx=1`
    - Added 2 pinning tests for Jan 1 → `1:1` and Jan 2 → `1:2` using `vi.setSystemTime`

## Remaining Queue

Queue complete. All 19 skills iterated.
