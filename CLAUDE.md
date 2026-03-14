# Harf — Codebase Guide for Claude

## What This Is

Harf (`حرف`) is a Quranic Arabic SRS (spaced-repetition) learning app. Users study root words, track comprehension percentage of the Quran, review the 99 Names of Allah, get daily ayah, and see prayer times.

**Stack**: Next.js 16+ App Router · React 19 · TypeScript strict · Tailwind v4 · Vitest (unit) · Playwright (e2e) · FSRS-6 (SRS algorithm via `ts-fsrs` npm package)

**No backend, no auth, no database** — all user data lives in `localStorage` via `lib/storage.ts`.

---

## Directory Map

```
app/                  — Next.js App Router pages (all Server Components unless 'use client')
  page.tsx            — Landing page (animated typewriter, brand introduction)
  app/page.tsx        — Dashboard (/app route): coverage hero, daily ayah, prayer times, study queue
  study/page.tsx      — Full study session: queue build → flashcard loop → SessionComplete
  words/page.tsx      — Word browser with mastery filters
  word/[id]/page.tsx  — Word detail: morphology, root family, interactive verse
  names/page.tsx      — 99 Names of Allah SRS
  coverage/page.tsx   — Quran comprehension breakdown by surah
  settings/page.tsx   — Location (prayer times) + reciter selection
  layout.tsx          — Root layout: fonts, metadata, CSP headers, LayoutShell
  globals.css         — Tailwind v4 @theme + CSS variable palette + custom animations

components/
  LayoutShell.tsx     — Client wrapper: sidebar nav, scroll restoration
  Navbar.tsx          — Navigation links
  ErrorBoundary.tsx   — React error boundary wrapper
  dashboard/          — Dashboard widgets (CoverageHero, DailyAyah, PrayerTimes, StudyQueue)
  study/              — FlashCard, MasteryButtons, SessionComplete, AudioButton
  word/               — InteractiveVerse, MorphologyTable, RootFamilyPanel
  words/              — WordCard

lib/
  storage.ts          — ALL localStorage I/O; defines WordProgress, NameProgress, StudySession
  srs.ts              — FSRS-6 scheduler wrapper: reviewWord(), reviewName(), buildSessionQueue()
  coverage.ts         — calculateCoverage() → percentage of Quran understood (capped at 80% dataset ceiling)
  quran-api.ts        — fetchAyah(): fetches from cdn.jsdelivr.net, caches in module Map
  aladhan-api.ts      — Prayer times from api.aladhan.com
  audio.ts            — verseAudioUrl() + RECITERS list + localStorage key
  arabic.ts           — tokenContainsRoot(): Arabic morphological root matching

data/
  words.json          — ~300 high-frequency root words with coverage_weight
  wbw-morphology.json — Word-by-word morphology: rootFamily, rootFamilyWords per word ID
  99names.json        — 99 Names of Allah
  english-wbw.json    — Flat word-by-word English glosses ("ch:vs:word" → gloss)
  morphology.json     — Raw morphology data
  root_index.json     — Root lookup index

types/
  wbw.ts              — WBWMorphologyData type

scripts/
  expand-words.ts     — Build script: enriches words.json with morphology
  fetch-morphology.ts — Fetches morphology data from external API

e2e/                  — Playwright tests (dashboard, study, words)
lib/__tests__/        — Vitest unit tests (coverage, srs, storage, quran-api)
```

---

## Key Architectural Decisions

### 1. localStorage-first, No Backend
All user progress is stored in `localStorage` under namespaced keys (`harf:v1:*`). `SCHEMA_VERSION = 'v1'` in `storage.ts` — bump this if the data shape changes to avoid stale data conflicts.

`storage.ts` is the **only** place that touches `localStorage`. All reads/writes go through it. The module guards every function with `typeof window === 'undefined'` for SSR safety.

### 2. Study Session Flow (`app/study/page.tsx`)
The study page is a self-contained state machine:
1. `useEffect([sessionId])` — builds queue (due reviews + new words interleaved 2:1), pre-computes verse keys via `pickWordKeysAndData()`, pre-fetches all verses in parallel (warms `quran-api.ts` module cache)
2. `useEffect([queue, sessionKeys, currentIndex])` — serves verse for current card from cache
3. `handleResponse()` — grades word via `reviewWord()`, advances index; on last card calls `addStudySession()` and sets `done=true`
4. `handleStudyMore()` — increments `sessionId` to re-trigger the queue-build effect without page navigation

**`loaded` state**: Starts `false`, set `true` after queue build. Shows skeleton while loading so "No words due" never flashes before data is ready.

**`sessionId` pattern**: Study More re-runs the session without route navigation (same-route `<Link>` doesn't remount in Next.js App Router).

### 3. Verse Data Flow
- `wbw-morphology.json` gives `rootFamily` (verse keys like `"2:255:3"`) and `rootFamilyWords` (with English gloss) per word ID
- `pickWordKeysAndData()` picks one random verse key per queue slot at session start — stable for the session lifetime
- `sessionMatchIndices` and `sessionMatchGlosses` are pre-computed root position arrays passed to `FlashCard` for Arabic highlighting + English highlighting
- `quran-api.ts` caches fetched ayahs in a module-level `Map` — survives React re-renders, shared across the whole app

### 4. Tailwind v4 Configuration
CSS variables defined in `:root {}` in `globals.css`, then bridged to Tailwind via `@theme inline {}`. Custom tokens: `bg`, `surface`, `surface-plus`, `gold`, `gold-muted`, `harf-text`, `muted`, `border`. Use `bg-gold`, `text-muted`, `border-border`, `bg-surface-plus` etc.

Custom animations registered in `@theme`: `animate-fade-in`, `animate-slide-up`, `animate-card-reveal`, `animate-breathe-bg`, etc.

### 5. Security Headers (next.config.ts)
All routes get: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `HSTS` (1yr + preload), `Referrer-Policy`, `Permissions-Policy` (geolocation only), `CSP`. CSP allows `cdn.jsdelivr.net` (Quran data), `api.aladhan.com` (prayer times), `everyayah.com` + `audios.quranwbw.com` (audio).

### 6. Fonts
Three Google fonts loaded via `next/font` in `layout.tsx`:
- `--font-amiri` — general Arabic text (Amiri)
- `--font-amiri-quran` — Quranic verse text (Amiri Quran, full Uthmanic Unicode)
- `--font-rubik` — Latin/UI text (Rubik)

### 7. SRS Algorithm
`lib/srs.ts` wraps the `ts-fsrs` package (FSRS-6 algorithm). `RESPONSE_TO_GRADE` maps 4 UI buttons (`blackout/hard/good/perfect`) to FSRS `Rating` values (Again=1, Hard=2, Good=3, Easy=4). Mastery (0–5) is derived from the resulting FSRS `State` + `stability`: Learning→1, Review<7d→2, <21d→3, <90d→4, ≥90d→5. On lapse (Review→Relearning), mastery drops by 1. `MASTERY_LABELS` and `MASTERY_COLORS` are display helpers. `reviewWord()` persists via `setWordProgress()`. Old SM-2 data (has `interval`/`efactor` fields) is automatically migrated to FSRS fields in `getAllWordProgress()`.

### 8. Coverage Ceiling
The current word dataset (~300 roots) accounts for ~80% of Quran word occurrences. `calculateCoverage()` caps reported comprehension at 80% to reflect that scope; UI surfaces this cap in CoverageHero.

---

## Common Patterns

### "use client" Boundary
Pages that need localStorage are `'use client'`. Server Components (default) never touch localStorage. Dashboard widgets are client components for real-time data.

### `useCallback` for `handleResponse`
Any handler passed into `useEffect` deps must be wrapped in `useCallback` to avoid infinite re-render loops.

### Verse Skeleton Instead of Null
`FlashCard.tsx`: when `verse` is null (loading), renders an `animate-pulse` skeleton box at the verse block's approximate height. Prevents layout shift when verse arrives.

### Keyboard Shortcuts
`FlashCard.tsx` registers a global `window.addEventListener('keydown', handler)`. Space/Enter = toggle flip. 1–4 = grade (only when flipped). Guards against `HTMLInputElement` / `HTMLTextAreaElement` targets.

---

## Gotchas

- **`app/app/page.tsx`** — yes, double `app/`. The route `/app` is inside `app/app/`. This is the dashboard, not the root.
- **`verseRef` format** — always `"surah:ayah"` (e.g., `"2:255"`). Word keys are `"surah:ayah:word"` (1-based). Numeric validation is in `quran-api.ts`.
- **`getDueWordIds()` in storage.ts** is exported and tested but NOT used by the study page — the page builds `dueIds` inline (slightly different logic with fallback). `buildSessionQueue()` and `getNewWords()` in `srs.ts` are similarly tested but not called by the page.
- **`wbw-morphology.json` keys** are word IDs from `words.json`. Keys not present in the morphology data are treated as having empty `rootFamily`/`rootFamilyWords` arrays.
- **Audio**: `verseAudioUrl()` returns a URL from everyayah.com or audios.quranwbw.com depending on selected reciter stored in `localStorage` under `harf:reciter`.
- **`StudySession` object shape**: `{ date: string, wordsReviewed: number, coverageBefore: number, coverageAfter: number }`. Sessions capped at 90 entries in storage.
- **`loadingVerse` was removed** — the verse skeleton in FlashCard handles the loading state visually. No flag needed.

---

## Testing

```bash
npm test            # Vitest unit tests (lib/)
npm run test:e2e    # Playwright (requires: npm run build first)
npx tsc --noEmit    # Type check (no emit)
npm run build       # Full production build
npm audit --audit-level=high  # Security audit (also runs in CI)
```

Unit tests live in `lib/__tests__/`. E2E tests in `e2e/`. CI (`github/workflows/ci.yml`) runs type-check → unit tests → build → E2E in sequence.

---

## Future Architecture (Planned)

1. **Export/Import JSON** in Settings — protect localStorage data without auth (Phase 1)
2. **Supabase hybrid sync** — localStorage-first, background sync to cloud, cross-device (Phase 2, requires auth)
3. **IndexedDB / OPFS** — if `words.json` grows beyond ~500 roots and storage limits bite
