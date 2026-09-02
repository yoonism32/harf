# Harf Roadmap

Source of truth for feature status. Supersedes the old out-of-repo memory
note (`harf-feature-batches.md`) — that file is now a pointer here.

Verified against code on 2026-09-02 (grep + manual check of each item,
not just recollection).

## Shipped, not in any lettered batch

These landed after the original batch list was drafted and were never
tracked against it:

| Feature | Where |
|---|---|
| **Tadabbur** — thematic verse reflection mode | `/tadabbur`, `/tadabbur/[surah]`, `/tadabbur/[surah]/[ayah]`, `lib/tadabbur.ts`, backed by `data/ayah-themes.json` |
| **Mutashabihat** — similar/confusable verse SRS deck | `/mutashabihat`, progress tracking in storage |
| **Transliteration search** | `/search`, `components/search/QuranSearch.tsx` |
| **Individual verse page** | `/verse/[surah]/[ayah]` |
| **Tafsir API route** | `app/api/tafsir/route.ts` — the one server endpoint in an otherwise client-only app; validates `ref` against `^\d{1,3}:\d{1,3}$`, serves from a local JSON file, no external calls |

## Batch A

| # | Feature | Status |
|---|---------|--------|
| A1 | Verse Bookmarks — save any ayah with note, navbar shelf | ⬜ Unbuilt |
| A2 | Study Streak — daily streak + break-recovery | ✅ Built — `getStreak()` in `lib/storage.ts`, wired into `StudyQueue.tsx` dashboard widget |
| A3 | Surah Reading Mode — sequential read-through, not SRS | ⬜ Unbuilt |
| A4 | Morphology Quiz — see word, ID root/pattern/meaning | ✅ Built — `/quiz` |
| A5 | Juz / Surah Navigator — quick-jump modal | ⬜ Unbuilt |

## Batch B

| # | Feature | Status |
|---|---------|--------|
| B1 | Roots-in-verse overlay on `/verse` for studied roots | ⬜ Unbuilt — `FlashCard.tsx` highlights roots during study, but the standalone `/verse/[surah]/[ayah]` page does not |
| B2 | Listening Drill — hear clip, guess surah:ayah | ✅ Built — `/drill` |
| B3 | Daily Ayah Word Learning — unknown roots from today's ayah | ✅ Built — dashboard widget |
| B4 | Coverage by Juz heatmap | ⬜ Unbuilt |
| B5 | Words-to-next-milestone counter | ⬜ Unbuilt |
| B6 | Surah Index — browse all 114 surahs + coverage per surah | 🟡 Partial — `/coverage` lists all 114 with number/name/ayah-count, but per-surah coverage % is currently the overall figure repeated, not per-surah (code comment in `app/coverage/page.tsx` flags this as a known simplification) |
| B7 | Continue Reading — navbar link to last visited verse | ✅ Built |
| B8 | Thematic word lists (mercy, judgment, nature...) | ⬜ Unbuilt — not the same as Tadabbur, which themes *verses* not *words* |
| B9 | Word of the Day dashboard widget | ⬜ Unbuilt |
| B10 | Root Family Tree — visual root → derived words | ⬜ Unbuilt |
| B11 | Export / Import JSON backup | ✅ Built — Settings page |
| B12 | Font Size Slider for Arabic verse text | ⬜ Unbuilt — Settings page has reciter + location only |
| B13 | Study Reminders — browser notification at chosen hour | ⬜ Unbuilt |
| B14 | Keyboard Shortcut Modal (`?` key) | ⬜ Unbuilt |

## Batch C

| # | Feature | Status |
|---|---------|--------|
| C1 | Install as App — PWA manifest + install prompt | ✅ Built — `app/manifest.ts`, `components/PWARegister.tsx` |
| C2 | Offline-first Service Worker | ✅ Built — `public/sw.js`, registered in `PWARegister.tsx` |
| C3 | Cross-tab Sync via `BroadcastChannel` | ⬜ Unbuilt |
| C4 | Web Worker for `/search` | ✅ Built — `search.worker.ts` |
| C5 | Streaming search results (~15ms) | ✅ Built — `searchVersesStreaming()` |
| C6 | Streak freeze tokens | ⬜ Unbuilt |
| C7 | Milestone celebrations (confetti) | ⬜ Unbuilt |
| C8 | Weekly digest dashboard card | ⬜ Unbuilt |
| C9 | Onboarding wizard | ⬜ Unbuilt |
| C10 | High-contrast mode toggle | ⬜ Unbuilt |
| C11 | Swipe gestures on flashcard | ⬜ Unbuilt |

## Unlettered idea

**Morphology Game** — ~20 floating Arabic words (physics), drag to bucket by
root (mode 1) or meaning (mode 2). Distinct from A4's static MCQ quiz.
⬜ Unbuilt. No code found.

## Corrections from the old memory note

The prior tracking (an out-of-repo Claude memory file, last touched
2026-03-02) had drifted from the code:

- **A2, C1, C2** were marked unbuilt — all three shipped since then.
- **B6** was marked unbuilt — it's partially there via `/coverage`.
- Four shipped features (Tadabbur, Mutashabihat, transliteration search,
  the tafsir API route) were never in the lettered scheme at all, so
  they read as "missing" against this list even though they exist.

Going forward: update this file when a batch item ships, not the memory
note — a roadmap that only Claude's memory can see isn't a roadmap.
