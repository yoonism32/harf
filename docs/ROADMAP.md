# Harf — current roadmap

Updated 29 October 2026, including the follow-up fixes through `3a7d1bf`. This is the current priority list.
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

## Current direction and next decisions

The active implementation phase is complete and published through `e950cbe`; live health confirmed that revision on Node `v26.12.1`.
Real signed-in reflection and saved-range upload/download checks passed, including cloud-side changes returning to the reader/Today.
Temporary verification data was restored or removed, with cleanup confirmed in cloud.

Use the completed passage flow for real study before choosing another feature batch. Vocabulary supports passage-led understanding,
with source inspection, reflection and deliberate revisit. Neither self-assessments nor vocabulary overlap are a comprehension score.

Owner-only password recovery was explicitly deferred on 29 October. Manual screen-reader/accessibility-conformance review remains
a recurring release check; a keyboard spot check and automated axe coverage do not replace it.
See [the verification record](VERIFICATION_2026-10-29.md) and [the task list](../todo.md) for precise evidence and follow-up.

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

## Latest executed verification

The afternoon release check reran TypeScript, all 151 unit tests, generated-data validation and size budgets successfully.
The full production browser run passed 133 checks with two existing skips; three accessibility checks caught the same
Today footer link missing an underline. That presentation defect was corrected and the affected checks rerun against a rebuilt app.
The follow-up includes stale-range protection, assessment removal, Today retries, on-demand grammar analysis and short
plain-keyboard transliteration matching (`wa radhiya lahu qawla` → 20:109). See the verification record for exact results.

The earlier complete release evidence remains:
146 unit tests, TypeScript, production app build, 118 passing production browser checks (two existing skips),
12 focused persistence browser checks, generated-data validation and size budgets passed. Dependency audit: zero vulnerabilities.
Live database migration and signed-in browser upload/download checks passed. Details: [29 October verification](VERIFICATION_2026-10-29.md).

## Earlier implementation evidence (historical)

- Through `a7998f6`: TypeScript, production app build, 143 unit tests, six new learning-plan browser checks and 12 existing passage-study checks passed.
- Isolated PostgreSQL verified the migration, authenticated RPC, two synthetic accounts, conflicts, tombstones and access restrictions.
- Earlier approval batch `6e5b165`: full release build passed; broader browser suite reported 103 passes and two skips.
  These results predate the final learning implementation.
- The earlier `40f95b4` docs-only refresh did not rerun functional checks or deploy services; the later executed verification above supersedes that snapshot.

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
