# Harf — current roadmap

Updated 29 October 2026 against local implementation through `a7998f6`. This is the current priority list.
See the [documentation index](README.md) for current guides versus historical plans.

## Current scope and implemented work

Personal Quranic vocabulary study with guest progress, portable backups, optional email/password accounts and conflict-aware Supabase sync.
The app includes 300 lemma-based vocabulary entries, a separate 99 Names collection, due-first FSRS study,
saved sessions, Undo, activity and actual word-position overlap.

Reading includes Ayah and QPC V2 Mushaf modes, translation/footnotes, source-aligned grammar and root families,
word/ayah audio, bookmarks, search, surrounding context and local tafsir. Practice, Insights, Daily Ayah and city-based prayer times remain part of the product.

All five [personal learning slices](PERSONAL_LEARNING_PLAN_2026-10-27.md) are implemented at their stated boundaries:
listening for meaning, reader-to-course shortcuts, reflections, saved-range/difficult-ayah revisits from Today,
and four contextual language examples. Optional meaning drafts stay in the tab. Saved assessments and ranges
participate in backup and account records. They do not change vocabulary scheduling or produce a comprehension score.
Similar-passage comparison has its own due queue and persistence.

## Completed reliability follow-up — 29 October

- Applied `20261029005835_passage_learning.sql` to live Harf Supabase. Live transactional tests passed for reflection/passage
  round trips, two-account isolation, stale-version conflicts, tombstones and access restrictions. Synthetic records were rolled back.
- Production build now records its content version; `npm start` rejects missing/stale records with rebuild instructions.
  The build also fails if content changes while compilation is running. Existing browser 404 recovery remains available.
- Added real-browser two-tab reflection conflict, failed import atomicity, backup replacement/recovery and reset-retention checks.
- Public health endpoint returned HTTP 200 with `status: ok` on 29 October; the scheduled deployed-health check also passed.
- Production size budgets passed and the dependency audit reported zero vulnerabilities. Live Auth's advisor reports leaked-password
  protection disabled; changing that setting remains a separate owner decision.

## Remaining priorities

1. **Publish the local implementation after owner approval.** Remote main was still at `6e5b165` when inspected on 29 October;
   the PLP and reliability commits need publication before Render can serve them. Recheck the remote before pushing.
2. **Real signed-in browser verification.** Live SQL checks passed, but the opened deployed browser is a guest.
   Sign in and verify a two-device round trip for reflections, assessments, saved ranges and comparison cards after deployment.
3. **Owner-assisted auth verification.** Check real signup/reset email delivery and callback/password completion. Never substitute mocks
   or SQL protocol checks for actual email delivery. The user must enter any credentials themselves.
4. **Manual accessibility verification.** Automated axe is covered by browser tests; a manual keyboard/screen-reader pass remains open.

Legacy-migration edge cases, mid-transaction failure injection and loaded-session offline use remain broader regression work,
not a reason to reopen the completed learning plan. Add targeted checks when changing those paths.

Names audio and staged large uploads are parked conditional ideas, not active tasks. Names audio requires reviewed Quran occurrences;
large uploads should be revisited only if the 1,000-record/about-2-MiB bound blocks actual use.

The [24–26 October record](PLAN_2026-10-24_to_26.md) also retains owner-only housekeeping:
branch/worktree cleanup, share-link revocation and any request to purge old exposed commits. These were not performed or reverified in this docs update.

## Content status

The owner approved the current 300 vocabulary entries, 99 Names and formerly pending pinned sources on 28 October.
Generated content `2bb58c86b4683669` reports `releaseReady: true` with no blockers. The registry has seven
`verified` and seven `owner-approved` source records. This clears Harf's internal release gate and preserves the distinction
between owner approval, external permission evidence and independent editorial certification.

The original Names collection remains selected. Its external publisher is still unrecorded; the owner chose to handle that provenance.
Unused historical words/morphology/transliteration files are not active refresh or release blockers.
See [content sources](CONTENT_SOURCES.md) for the QUL refresh results and the Mutashabihat preview/download discrepancy.
New language-pattern explanations are authored teaching notes anchored to pinned Corpus analyses, not a new external corpus.

## Verification recorded from implementation

- Through `a7998f6`: TypeScript, production app build, 143 unit tests, six new learning-plan browser checks and 12 existing passage-study checks passed.
- Isolated PostgreSQL verified the migration, authenticated RPC, two synthetic accounts, conflicts, tombstones and access restrictions.
- Earlier approval batch `6e5b165`: full release build passed; broader browser suite reported 103 passes and two skips.
  These results predate the final learning implementation.
- No functional checks were rerun solely for this Markdown refresh. No live service was deployed or certified.

## Suggested daily routine

1. Open Today and resume a saved vocabulary session or review due words. Start with three new words per day if that feels manageable.
2. Recall before revealing, then rate honestly. Reduce new entries to zero when reviews feel heavy.
3. Read or listen to one relevant ayah. Use Study this passage to attempt the meaning, then compare with translation and tafsir.
4. Save a reflection, assessment or short passage when useful. Revisit difficult ayahs manually from Today.
5. Keep Names optional and separate. Return for minute-scale reviews when due; do not bring future cards forward.
6. Export about weekly and before device/origin changes. Keep all backup parts together outside the browser.

A recorded study day requires a saved, non-undone vocabulary or Names review on that local date; Again counts.
Reading, reflection and personal passage assessments are worthwhile but do not increment that metric.
Today combines collection activity; Progress separates collection figures. Dates are recorded at review time and weeks start Monday.

## Deliberately deferred

A consecutive-day streak, enforced daily checklist, memory-palace tools, general grammar course, generated language exercises,
expanded vocabulary course and another passage scheduler remain deferred. Use real blocking words and a week of personal passage practice
to decide what helps next. No score measures Quran comprehension or religious merit.
