# Harf — current project guide

Verified against the working tree on 1 October 2026. This guide replaces the old root-word/localStorage architecture description.

## Product and scope

Harf (حرف) helps an English-speaking learner who can read Arabic script recognise Quranic vocabulary through spaced recall and ayah context. Vocabulary familiarity is not Quran comprehension or a religious rank.

The owner chose optional email login, `/profile`, and Supabase account sync on 2 October 2026. Guest study and portable backups remain. First login starts fresh; never import guest data automatically. Payments remain out of scope. See README for account configuration and sync limitations.

The September redesign prompt called for deliberate product and architecture decisions rather than incremental decoration. Its plan was subsequently implemented and amended: Practice, Insights, Daily Ayah, prayer times, and local tafsir were restored. Do not remove these because the original plan said to retire them.

Documentation roles:

- `README.md`: running and using the current app.
- `docs/ROADMAP.md`: current status, remaining work, daily-study recommendation.
- `docs/CONTENT_SOURCES.md`: old/new provenance, Names spelling differences, editorial review.
- `docs/SOURCE_AUDIT_2026-10-02.md`: measured ranges, retained grammar data and alignment gaps.
- `todo.md`: concise remaining work.
- `HARF_REDESIGN_PLAN.md`: historical specification; useful rationale, not an accurate shipped-feature checklist.

## Stack and structure

Next.js App Router, React, strict TypeScript, Tailwind v4 plus custom CSS, `ts-fsrs`, `idb`, Zod, Vitest and Playwright. `package.json` requires Node >=26; the content compiler uses `node:sqlite`. Read installed Next.js documentation before changing framework code.

| Location | Responsibility |
|---|---|
| `app/page.tsx` | Public introduction and study demonstration |
| `app/(focus)/start/page.tsx`, `study/page.tsx` | Setup and saved study sessions |
| `app/(main)/today/page.tsx` | Next action, bounded queue/backlog, activity, reading, Daily Ayah/prayer widgets |
| `app/(main)/learn/` | Vocabulary browser and entry detail |
| `app/(main)/read/` | Reader, word inspection, bookmarks, unified search |
| `app/(main)/progress/` | Activity, familiarity, actual occurrence overlap |
| `app/(main)/collections/names/` | Optional 99 Names collection |
| `app/(main)/practice/`, `insights/` | Additional practice, themes, related wording and similar passages |
| `app/(main)/settings/`, `sources/` | Preferences, backup/recovery, sources and methodology |
| `app/api/tafsir/route.ts` | Validated access to local structured commentary |
| `components/learning/`, `reader/`, `today/`, `practice/`, `insights/` | Feature UI |
| `components/shell/`, `ui/` | Navigation and shared accessible primitives |
| `lib/data/` | Browser database, schemas, migration, backup, reactive store |
| `lib/learning/` | Scheduler, queue, review commands, calendar and metrics |
| `lib/content/` | Validated generated-content readers, types, version pointer |
| `lib/search/`, `lib/workers/` | Search matching and background worker |
| `lib/audio.ts`, `lib/prayer/` | Audio controller/providers and optional city-based prayer times |
| `data/sources.json`, `data/source/` | Pinned input datasets and source registry |
| `data/course-overrides.json` | Example overrides, vocabulary approvals, explicit legacy mappings |
| `scripts/build-content.ts` | Deterministic course/content compiler |
| `public/content/<version>/` | Generated catalog, surahs, entries, Names and search indexes |

Route groups do not appear in URLs. `/app`, `/words`, `/coverage`, and other old URLs are handled by redirects in `next.config.ts`; they are not the current page locations.

## Persistence and boundaries

`lib/data/db.ts` opens IndexedDB database `harf`, currently database version 2. Stores: `meta`, `cards`, `reviews`, `sessions`, `notes`, `bookmarks`, `legacy`, plus `recovery` and account `sync` metadata. Signed-in users open `harf-account-<user id>`; guests keep `harf`. The serialized data/backup schema uses version 2; do not confuse these version numbers.

UI reads through `useHarfStore()` in `lib/data/store.ts`; learning mutations go through `lib/learning/commands.ts`. Preserve transactional writes, unique review attempt IDs, revision checks, and one active session. A failed save must leave the learner able to retry the same answer. BroadcastChannel coordinates tabs on the same origin. `lib/account/sync.ts` synchronizes accounts across devices through version-checked RPCs, with explicit conflict resolution and no polling. Do not bypass `databaseIdentity()` or use guest legacy migration for account caches.

Legacy migration reads old `harf:v1:*` data conservatively and retains raw archives. It does not delete the old keys. Ambiguous root-to-lemma mappings must not be guessed. Theme still uses localStorage (`lib/theme.ts`, `public/theme.js`); unsaved mnemonic drafts use sessionStorage (`lib/data/note-draft.ts`). Therefore “all storage goes through storage.ts” is obsolete.

Settings exports portable JSON, supports staged replacement imports and multipart backups, and offers one previous snapshot for import/reset recovery. Recovery in the same browser is not an external backup. Imports replace data rather than merge it. Keep every multipart file and manifest together. Today prompts for backup after seven distinct practice days since the last recorded export. Browser download completion is not proof of an independently verified backup.

Use one stable browser profile and origin. `localhost`, a LAN IP, another port, and a deployed domain have separate storage. Clearing site data can remove both progress and local recovery.

## Learning flow and metrics

The session flow is introduction (new entries) → question → reveal → Again/Hard/Good/Easy → transactional save → next attempt/result. Session identity is persisted and exposed as `/study?session=...`; pause, resume and Undo are supported. Saved payloads allow already-loaded text practice to survive a connection loss.

`buildQueue()` selects due cards first, up to 20 distinct entries total, then new entries within the selected collection's daily allowance. Vocabulary choices: 0/3/5/10, default 5; Names: 0/3, default 3. A collection with no prior reviews initially allows at most three new entries, subject to its allowance. A full due queue admits no new entries; a partially full queue may include new entries. Repeated sessions do not reset the daily introduction allowance.

FSRS settings: target retention 0.9, fuzz disabled, short-term scheduling enabled, learning steps 1m/10m and relearning 10m. The active session can requeue learning cards when due, and ends at 30 saved actions or when no next attempt is ready. Do not bring future-due cards forward just to fill a daily target.

Familiar means Review state with stability >=21 days, not perfect recall or comprehension. Progress uses unique canonical word positions for overlap; there is no artificial 80% ceiling. Names do not increase vocabulary overlap.

`activity()` ignores undone reviews, groups by recorded local date, and reports Monday-based weekly activity and 28 days of history. Today combines both collections; Progress separates vocabulary/Names figures and combines the activity chart. **No consecutive-day streak or daily checklist is currently implemented.** See the roadmap for recommendations, not shipped requirements.

## Content and rendering

The compiler groups eligible QUL occurrences by normalized lemma and root, orders by frequency, and selects 300 groups with gloss/transliteration examples. These are vocabulary entries, not 300 Names and not 300 interchangeable root families. The 99 Names are a separate collection. As of 2 October 2026, compile the owner-selected original `data/99names.json`, preserving roots and explanations; NumroQ is historical, not active. Owner selection is not independent editorial certification.

Quran positions are `surah:ayah:word`; ayah references are `surah:ayah`. Use canonical positions and source-backed lemmas, never substring/root-letter guessing. Generated content is read from the same version on client and server. Client reads validate schemas, deduplicate requests, limit concurrency to four, time out at eight seconds, and retain at most 16 surahs in the LRU cache.

Generated output is not an editing surface: change pinned inputs/overrides, then regenerate. A content hash confirms integrity, not linguistic accuracy. Source permission records and editorial approvals are separate. Preserve pending review labels; personal use does not turn unreviewed entries into reviewed entries.

## Presentation, network and security

Paper/Night themes use current CSS variables/classes in `app/globals.css`; inspect them rather than copying obsolete gold-theme tokens. Fonts are local Source Sans 3, Amiri, and Amiri Quran, loaded by `next/font/local`.

`proxy.ts` generates nonce-based CSP for matched page routes; `next.config.ts` supplies common security headers and redirects. Word audio uses recorded Quran.com paths on audio.qurancdn.com; ayah audio contacts everyayah.com or audios.quranwbw.com; optional prayer times use Aladhan with a saved city/country. Geolocation is disabled. Tafsir is parsed into structured text; do not insert raw source HTML into pages.

The service worker is a navigation-fallback worker, not a full Quran offline downloader. Cold offline navigation shows `offline.html`. Never claim installation alone downloads all content/audio.

## Commands and checks

```bash
npm run dev                 # Current source, development server
npm run build:content       # Regenerate content; does not grant approval
npm run validate-data      # Structural/content integrity checks
npm run typecheck
npm test
npm run build:app           # Application-only production build for personal testing
npm start                  # Serve the last build; does NOT rebuild
npm run test:e2e            # Locally starts/reuses dev server; CI uses production
npm run check:budgets       # Requires generated content/application build
npm audit --audit-level=high
npm run build              # Regenerate + release validation + application build
```

After changing compiler/content inputs, stop the server, regenerate content, and rebuild the app before `npm start`. Old builds embed an old version; compiler cleanup can remove that directory, producing ENOENT. Do not run content regeneration against a production process expecting the previous assets. For personal testing use `npm run build:app && npm start` when generated content is already current.

Unit tests are distributed across `lib/**/__tests__` and `components/**/__tests__`. Browser checks are in `e2e/product.spec.ts`, configured for Chromium desktop/mobile and WebKit. CI runs audit, data validation, typecheck, unit tests, app build, browser tests and budgets. The separate release workflow applies editorial gating.

On 1 October 2026, 43 unit tests, typecheck and content validation passed. Full build/browser/performance results recorded in the prior task are historical, not freshly rerun certification. The browser suite does not yet cover every failure/concurrency scenario requested in the original plan. See the roadmap before declaring completion.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

Restored morphology: `scripts/content-morphology.ts` aligns retained Corpus/Quran.com words to canonical positions by Arabic spans. Generated `morphology/` and `roots/` files load on demand (cache bounds: four surahs of morphology, eight root families). Three split phrases share explicitly labelled source analysis; never infer audio filenames from canonical position. Original QuranWBW notes describe their original examples, not every related lemma.
