# حرف · Harf

*Quranic Arabic vocabulary mastery — track what percentage of the Quran you understand (up to 80% based on dataset scope)*

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![React](https://img.shields.io/badge/React-19-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6) ![Tailwind](https://img.shields.io/badge/Tailwind-v4-06b6d4) ![Vitest](https://img.shields.io/badge/Vitest-4-6e9f18) ![Playwright](https://img.shields.io/badge/Playwright-1.58-2ead33)

---

## What is Harf?

Harf is a client-side Progressive Web App for mastering Quranic Arabic vocabulary through spaced repetition. No account or backend required — all data lives in your browser.

- **~300 root words** covering ~80% of Quranic vocabulary (dataset ceiling)
- **FSRS-6 spaced-repetition flashcards** — modern forgetting-curve algorithm, 6 mastery levels (0→5)
- **Quran comprehension tracker** — coverage map across all 114 surahs
- **99 Names of Allah** (Asma Al-Husna) with their own SRS deck
- **Daily Ayah** — deterministic cycle through all 6,236 verses; tap Arabic words to hear audio, click English content words to reverse-search matching verses across all 83k WBW glosses
- **Prayer times widget** via Aladhan API
- All data stored client-side (localStorage, no backend, no login)

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for what's shipped vs. planned.

---

## Design Language

- **Dark-only**: pure black `#000000` landing page, `#0b0f1a` app background
- **Typography**: Amiri (classical Arabic Naskh calligraphy) + Rubik (modern sans), via `next/font`
- **Gold `#c9a84c`** accents, brand red `#C41E3A` for حرف wordmark
- **Landing**: cinematic typewriter reveal driven by a `SEGMENTS` state machine; Islamic geometric SVG background (8-pointed star tessellation)
- **Navbar**: omitted on landing via `LayoutShell` — checks `usePathname() === '/'`

---

## Project Structure

```
harf/
├── app/
│   ├── page.tsx              # Landing — typewriter reveal, no navbar
│   ├── app/page.tsx          # Dashboard — CoverageHero, StudyQueue, widgets
│   ├── study/page.tsx        # SRS flashcard session
│   ├── words/page.tsx        # Word library (300 roots)
│   ├── word/[id]/page.tsx    # Word detail + morphology table
│   ├── coverage/page.tsx     # Surah-by-surah coverage map
│   ├── names/page.tsx        # 99 Names of Allah
│   ├── layout.tsx            # Root layout — fonts, metadata, LayoutShell
│   ├── globals.css           # Tailwind v4 @theme tokens, keyframes, fluid typography
│   ├── error.tsx             # Route error boundary
│   ├── global-error.tsx      # Root error boundary (inline styles, owns html/body)
│   └── ...                   # manifest.ts, robots.ts, sitemap.ts, loading.tsx, not-found.tsx
├── components/
│   ├── LayoutShell.tsx       # Conditional navbar — bare children for '/', chrome for all else
│   ├── Navbar.tsx            # Top nav (hidden on landing)
│   ├── ErrorBoundary.tsx     # React class error boundary
│   ├── dashboard/            # CoverageHero, StudyQueue, PrayerTimes, DailyAyah
│   ├── study/                # FlashCard, MasteryButtons, AudioButton, SessionComplete
│   ├── word/                 # MorphologyTable
│   └── words/                # WordCard
├── lib/
│   ├── storage.ts            # localStorage API — branded WordId/NameId types, FSRS schema
│   ├── srs.ts                # FSRS-6 wrapper — reviewWord, reviewName, STUDY_BUTTONS
│   ├── quran-api.ts          # CDN Quran fetcher, deterministic daily ayah, parallel fetch
│   ├── aladhan-api.ts        # Prayer times API wrapper
│   ├── coverage.ts           # SURAHS static data + coverage calculation
│   ├── audio.ts              # verseAudioUrl, wordAudioUrl, RECITERS
│   ├── arabic.ts             # tokenContainsRoot — Arabic morphological root matching
│   ├── english-search.ts     # stemWord, isStopword, searchEnglish — WBW reverse lookup
│   └── __tests__/            # Vitest unit tests — 184 tests total
├── e2e/
│   ├── dashboard.spec.ts     # Landing page + /app dashboard
│   ├── study.spec.ts         # SRS session flow
│   └── words.spec.ts         # Word browser
├── next.config.ts            # Security headers (CSP, X-Frame, Permissions-Policy)
├── playwright.config.ts      # Chromium + Mobile Chrome (Pixel 5)
├── vitest.config.ts          # Node env, excludes e2e/**, v8 coverage on lib/
└── .github/workflows/ci.yml  # quality job (tsc + vitest + build) → e2e job
```

---

## Getting Started

Node.js ≥ 26 required.

```bash
npm install
npm run dev        # http://localhost:3000
```

---

## Routes

| URL | Page |
| ----- | ------ |
| `/` | Cinematic landing (typewriter) |
| `/app` | Dashboard |
| `/study` | SRS flashcard session |
| `/words` | Word library |
| `/word/[id]` | Word detail |
| `/coverage` | Surah coverage map |
| `/names` | 99 Names |
| `/quiz` | Morphology quiz (word → root/pattern/meaning MCQ) |
| `/drill` | Listening drill (recitation clip → guess surah:ayah) |
| `/search` | Transliteration search across 83k WBW glosses |
| `/settings` | Reciter, prayer-time location, export/import data |
| `/tadabbur`, `/tadabbur/[surah]`, `/tadabbur/[surah]/[ayah]` | Thematic verse reflection mode |
| `/mutashabihat` | Similar/confusable verse SRS deck |
| `/verse/[surah]/[ayah]` | Individual verse page |
| `/api/tafsir` | The one server route in an otherwise client-only app — serves Ibn Kathir tafsir text by verse ref, no external calls |

---

## Testing

```bash
npm test                  # Vitest unit tests (184 tests)
npm run test:coverage     # + v8 coverage report (lib/)
npm run test:e2e          # Playwright E2E (chromium + mobile)
npm run test:e2e:ui       # Playwright UI mode
npm run test:e2e:report   # Open last HTML report
```

---

## Architecture

```
User browser
    │
    ▼
Next.js App Router (SSG/SSR)
    │
    ├── Landing /             ← typewriter SEGMENTS state machine
    │
    ├── Dashboard /app        ← CoverageHero + StudyQueue + widgets
    │       │
    │       └── lib/storage.ts ──► localStorage (FSRS state)
    │
    ├── Study /study          ← FlashCard
    │       │
    │       └── lib/srs.ts ──► ts-fsrs (FSRS-6) ──► lib/storage.ts
    │
    └── Widgets
            ├── DailyAyah ──► lib/quran-api.ts ──► cdn.jsdelivr.net
            │       └── lib/english-search.ts ──► data/english-wbw.json (83k entries, in-memory)
            └── PrayerTimes ──► lib/aladhan-api.ts ──► api.aladhan.com
```

---

## Key Design Patterns

- **SRS**: FSRS-6 via `ts-fsrs` npm; 4-button UI (Don't Know / Hard / Good / Perfect) maps to FSRS ratings Again/Hard/Good/Easy; mastery 0–5 derived from FSRS state + stability
- **Branded types**: `WordId = Brand<string, 'WordId'>`, `NameId = Brand<number, 'NameId'>` — prevents ID confusion at compile time
- **LayoutShell**: client component using `usePathname()` — landing page gets full viewport, all other pages get navbar + `max-w-5xl` main
- **Daily Ayah**: day-of-year mod 6236 — deterministic, no randomness, same ayah for all users each day
- **Quran data**: two CDN editions fetched in parallel (Uthmani Arabic `ara-quranacademy` + Hilali English `eng-muhammadtaqiudd`)
- **Coverage metric**: dataset covers ~80% of Quran word occurrences; comprehension percentage is capped at 80% to reflect that ceiling

---

## Security

Configured in `next.config.ts` for all routes:

- `Content-Security-Policy` — self + cdn.jsdelivr.net + api.aladhan.com; fonts served locally by `next/font`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Permissions-Policy` — geolocation=(self) for prayer times; camera/mic/payment blocked

---

## CI/CD

GitHub Actions — two sequential jobs:

1. **quality**: type-check → unit tests → production build
2. **e2e** (requires quality): install chromium → production build → Playwright tests → upload report artifact (14 days)

---

## Tech Stack

| Layer | Technology |
| ------- | ----------- |
| Framework | Next.js 16 (App Router) |
| UI library | React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Fonts | Amiri + Rubik via next/font |
| SRS algorithm | FSRS-6 (`ts-fsrs` package) |
| Unit tests | Vitest 4 + v8 coverage |
| E2E tests | Playwright 1.58 |
| Quran data | fawazahmed0/quran-api (CDN) |
| Prayer times | api.aladhan.com |
| Persistence | localStorage (no backend) |
