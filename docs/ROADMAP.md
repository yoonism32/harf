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

## Remaining priorities

1. **Deploy and verify passage account sync.** Apply [the passage migration](../supabase/migrations/20261028235500_passage_learning.sql)
   to the configured Supabase project, then check a real signed-in two-device round trip for reflections, assessments,
   saved ranges and comparison cards. SQL protocol tests passed locally; deployment was not performed.
2. **Build/content consistency.** Prevent or clearly diagnose a production build referencing content removed by regeneration.
   Server readers now resolve the disk manifest at runtime, but browser bundles still embed a version; that partial fix
   does not make every old client compatible. Stop the server before regenerating, then rebuild and restart.
3. **Remaining persistence coverage.** Extend real-browser tests for competing tabs, legacy migration, interrupted/rejected imports,
   reset/recovery and loaded-session offline use. Reload, reflection failure/retry, saved ranges and assessment persistence now have targeted coverage;
   that does not complete every original acceptance scenario.
4. **Live deployment and release checks.** Verify Render runtime/health, actual signup/reset email delivery and deployed callback/password flows.
   Run relevant production browser, size-budget, dependency and manual keyboard/screen-reader checks before a new release.
   Automated axe results do not constitute a manual accessibility review.
5. **Names audio, if still wanted.** Choose a reviewed Quran occurrence per Name before adding audio. No Names recording map or synthetic voice is shipped.
   Current reader/word audio works without downloading a QUL recitation library.
6. **Large account uploads, if needed.** Current atomic sync is bounded to 1,000 changed records/about 2 MiB.
   Larger imports/offline backlogs remain local with an error; staged uploads are future work.

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
