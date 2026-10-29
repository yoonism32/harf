# Active-roadmap verification — 29 October 2026

Functional commits: `40bf454` (startup protection and persistence checks), `e950cbe` (public deployment diagnostics).
Learning implementation: `a7998f6`. This record separates executed checks from owner-only follow-up.

## Implemented and checked

| Requirement | Evidence |
|---|---|
| Live passage migration | Applied `20261029005835_passage_learning.sql` to Harf; filename matches live migration history. |
| Isolation, conflicts and deletion | Local and live SQL assertions passed with two synthetic users, stale versions, reflection/passage records, tombstones and access restrictions. Synthetic live data was rolled back. |
| Real signed-in reflection sync | Owner signed in. A temporary note on an initially empty ayah uploaded from the UI and was confirmed in cloud. A guarded cloud update downloaded through Sync now and appeared in the reader. Note restored to empty; cleanup confirmed in cloud. |
| Real signed-in saved-range sync | UI saved a temporary range; cloud storage confirmed. A guarded cloud update appeared in Today; Resume opened the correct ayah/range. Temporary range removed and null cloud value confirmed. Existing assessments preserved. |
| Live runtime and health | HTTP 200, Node `v26.12.1`, revision `e950cbe637ae9c4b4ad8d5825287154967af5c76`. Scheduled health check also passed. |
| Build/content consistency | Build records content version after successful compilation and rejects mid-build changes. Startup refuses missing/stale records. Subprocess tests cover missing, stale and matching records. Browser 404 recovery remains available. |
| Focused persistence | Browser tests cover competing reflection drafts, failed-save retry, rejected imports, failed replacement without data loss, backup recovery and reset retention. |

## Automated evidence

- TypeScript and production application build passed.
- 146 unit tests passed across 26 files, including the final health diagnostic.
- Full production browser suite: 118 passed, two existing skips. The additive health diagnostic was subsequently unit-tested and rebuilt.
- Focused persistence suite: 12 passed across Chromium, Mobile Chrome and WebKit, including automated axe checks.
- Generated-data validation: 6,236 ayahs, 77,432 words, 300 entries, output hashes and alignment passed.
- Production size budgets passed; dependency audit reported zero vulnerabilities.
- GitHub CI passed for both [the reliability commit](https://github.com/yoonism32/harf/actions/runs/40798432327)
  and [the final functional health commit](https://github.com/yoonism32/harf/actions/runs/40798800277).

SQL assertions and the signed-in browser checks are separate evidence. The browser upload/download check used an independent
cloud writer; it is not described as a physical second-device test. No comprehension ratings were fabricated in the owner's account.

## Follow-up usability checks

The subsequent local batch adds stale-range protection between tabs, assessment removal without deleting reflections,
readable obstacle labels, accurate signed-in Today copy, retry controls for Today resources and on-demand language analysis.
Range validation now rejects malformed references without throwing outside schema validation. No database migration is needed.
TypeScript, the production application build and 151 unit tests passed. Targeted production browser checks exercised
learning, accounts and search across Chromium, Mobile Chrome and WebKit. The initial 87-check run had 82 passes,
two existing skips, two retries and one failed backup assertion that also matched Next.js's hidden route announcer;
the assertion was narrowed to main content and all six affected checks passed on rerun. These local changes are not live-sync certification.

Plain-keyboard transliteration search now matches short spelling variants anywhere in an ayah, preserving source text
and highlights. Regression examples `wa radiya lahu qawla`, `wa radhiya lahu qawla` and `waradhiyalahuqawla`
rank 20:109 first. The two `dh` variants also passed the production browser search journey in all three browser projects.

Saved-study slice (local working tree, not deployed): the derived `StudyThread` library is exposed at `/read?view=saved` with filters, personal-text search, orphan handling and an on-open detail model. TypeScript, 165 unit tests and two targeted Chromium checks passed; the populated check includes an axe scan. One manual browser check rendered the revised Today prayer widget with a next-prayer card and a current-prayer row. No schema, cloud-store or backup fields changed. These local checks are not production or live-sync certification.

Focused-practice slice (local working tree, not deployed): a saved ayah or passage now offers one data-backed practice reason and a focused word round. The pure pool selector uses non-`Understood` assessments first, then existing priority entries, then the thread's course words; it never writes or creates a record. The saved detail carries `focus` and the detail URL as `returnTo`; answer, next round, start and End practice use one validated builder, so the origin survives a multi-round set and the completion summary. A bookmark-only ayah with no assessment or priority starts a normal targeted round, and a saved thread with no course words falls back rather than inventing a reason. TypeScript, **181 unit tests across 30 files**, four existing practice/listening regression checks, and **15 saved-study browser checks across Chromium, Mobile Chrome and WebKit** passed. The browser checks cover the three-round completion path, End practice back to the detail, chooser-origin propagation and mobile-width assertions. No production build, deployment, live-sync certification or commit was performed.

Passage-preparation slice (local working tree, not deployed): a saved passage's detail lists its distinct course words with states derived only from recorded data — already queued, last review was difficult, familiar, in progress or not started. Checkboxes queue and unqueue through the existing `meta.priorityEntries` key; there is no new store, schema, cloud or backup field and no shadow queue. Start prepared words carries `prepared=1` through start, answer, next round, restart and End practice, and the prepared pool is the queued intersection ahead of the normal assessment fallback. The panel handles passages with no course words and its footer returns to the saved detail. TypeScript, **191 unit tests across 31 files**, four existing practice/listening regression checks and **21 saved-study browser checks across Chromium, Mobile Chrome and WebKit** passed. Browser coverage includes queue → unqueue → requeue → practise exactly two words → answer through → return, the prepared round's End practice exit, the no-course-words panel, the saved list loading no ayah content, origin propagation through the round, and mobile width. The saved-study list still loads no ayah content; the saved detail already loaded its passage content before this slice. No production build, deployment, live-sync certification or commit was performed.

Explainable queue/history slice (local working tree, not deployed): Today's next-step card exposes **Why these words?**. The disclosure annotates the exact `buildQueue` output in order when no session is active, or the stored remaining attempts of an active vocabulary session (including learning requeues) when one is. Rows carry one primary reason — due, queued from saved study, next in course order, new in the active session, or scheduled later — and a secondary “Also queued” badge when a due word is also in `priorityEntries`. History uses only non-undone vocabulary review events, newest first by parsed timestamp, capped at five with an unchanged total, and renders stored local dates plus times in the stored time zone. Empty history says **No review history yet.** No schema, cloud or backup field changed.

Verified: TypeScript; **199 unit tests across 32 files**; **9 new browser checks across Chromium, Mobile Chrome and WebKit** covering the exact queue/reasons, real two-event history with an undone event excluded, a no-history word, an empty queue, mobile width and the session's first two words matching the explanation; and two existing Today/accessibility checks. The disclosure passed a scoped axe scan. No production build, deployment, live-sync certification or commit was performed.

Plan mismatch: the app's queued vocabulary session starts from Today, not the `/practice` tab, which is a separate random drill with no queue. Also, an active session has its own stored order and learning requeues, so the explanation must follow that saved order rather than recomputing a hypothetical next `buildQueue` result.

Semantic content report (initial slice 6, local working tree, not deployed): the bottom of Progress gained a read-only **Content report** disclosure derived from the already-loaded catalog/overlap and current study snapshot. It groups by approval, source bundle, root and example count; reports stored cards/reviews and orphaned progress; and labels figures as stored content/records rather than learning. No new store key, cloud/backup field, route, cached file or content fetch was added. TypeScript, **205 unit tests across 33 files** and **9 browser checks across Chromium, Mobile Chrome and WebKit** passed, covering a populated report with numbers read back from the live catalog, the clean no-findings state, an intentionally orphaned card and active review, mobile width and a scoped axe scan. At that point no approved baseline existed, so no before/after change set was claimed; the following follow-up adds it.

Approved-baseline semantic diff (local working tree, not deployed): `data/content-baseline.json` records 300 entries and 6,236 ayahs from compiled content `2bb58c86b4683669`, including each entry's catalog approval record, source IDs and exact occurrence keys, plus every ayah translation and footnote. Its SHA-256 digest is verified before use; an unapproved catalog cannot be recorded as an approved baseline. A post-compile `content:report` step writes `semantic-diff.json` beside the compiled content, and Progress reads it only when the Content report is expanded. The diff classifies added, removed, re-keyed and changed entries, reports exact occurrence additions/removals, and covers Arabic surface, lemma, root, representative example, example selection, gloss, source IDs, approval records, translations and footnotes with ayah/word citations. Re-keying is matched by unchanged lemma (then root), so it is not reported as remove-plus-add and progress is never remapped.

Verified: TypeScript; `npm run content:baseline:check` returned `status: ok` with zero added/removed/re-keyed/changed for compiled content `2bb58c86b4683669`; a trial content rebuild into a temporary new version also produced zero semantic changes, but its 171 MB of unchanged generated assets were discarded and the compiler restored rather than committing a duplicate content version. **220 unit tests across 34 files** passed, including 15 new semantic-diff tests for a changed example, changed root, re-keyed entry, added/removed entry, translation/footnote change, occurrence change, unchanged and reordered input, missing/invalid/stale reports and non-mutation. **21 content-report browser checks across Chromium, Mobile Chrome and WebKit** passed (seven checks per project): the real clean change set and baseline/current versions, a populated change set with its citations and classifications, no-findings and study-mapping state, a missing report artifact, a missing baseline, a report generated for another content version, orphaned progress, mobile width and a scoped axe scan. Data validation confirmed 6,236 ayahs, 77,432 words, 300 entries, output hashes and the new artifact's schema/version. No production build, deployment, live-sync certification or commit was performed.

Remaining plan wording that this data cannot satisfy: a prior approval bundle is not automatically re-evaluated against a changed gloss or example, so the report does not revoke or grant approval; it shows the recorded approval and the change side by side. Human-readable citations are canonical surah/ayah/word references plus the stored source IDs, not publisher URLs or page numbers. Split-phrase and Unicode integrity is tested only as exact-value comparison, not as a typographic certification. Exact-word interests, cloud/backup changes and production-build proof stay deferred.

## Policy and boundaries

Final regression after the three follow-up clusters: the complete production browser suite passed **151 checks**
with **two existing skips** (153 total), without retries. All **151 unit tests**, TypeScript and the rebuilt application
passed. No new content, database schema, authentication policy or dependencies were introduced.

Cross-tab study follow-up: three production browser checks passed, one per browser project. A saved review appears
in the second tab; Undo there restores the first tab's answer and leaves one undone event with no card; ending the
session updates both tabs and survives reload. These use real shared IndexedDB and BroadcastChannel, not mocked sync.

At 15:28 GMT the public production health endpoint returned HTTP 200 for revision
`ed17f6254dd6d8b5b0c061cb62a9dc137469ea7b` on Node `v26.12.1`, confirming the earlier search/passage release
had deployed. This health response does not certify the subsequent migration-report change or replace signed-in browser checks.

Loaded-session reliability follow-up: six production browser checks passed across all three projects. Text practice
can reveal, save, Undo and save again while offline; reconnect/reload retains exactly one effective review.
An injected transaction abort after the card write leaves cards, reviews and session unchanged. Retrying saves
the original attempt once. This checks loaded text study, not cold offline navigation or unavailable audio.

Legacy migration follow-up: six production browser checks passed across Chromium, Mobile Chrome and WebKit.
Known vocabulary mappings retain scheduling and notes; ambiguous or malformed records remain archived; original
localStorage keys remain intact; reload does not reimport altered old data. Settings now reads migration details
from the legacy store where they are actually written. TypeScript and the application build passed.

Afternoon release follow-up: TypeScript, 151 unit tests, data validation and size budgets passed again.
The full production browser run passed 133 checks with two existing skips and three accessibility failures,
all identifying the newly added inline Profile link in Today's footer. Both signed-in and guest links now have
an explicit underline. The application rebuilt successfully and all three affected core-page accessibility
checks passed on rerun (Chromium, Mobile Chrome, WebKit). This is combined evidence, not a claim that the
entire browser suite was rerun after the one-line presentation fix.

- Owner confirmed registration stays **closed for personal use**. Live signup is disabled, automatic email confirmation is enabled,
  and existing email/password sign-in works. No Auth setting was changed here.
- The owner explicitly retained real password recovery as owner-only follow-up on 29 October. Email delivery and any new password entry require the owner. Mocked tests cover the flow but do not prove delivery.
- A deployed keyboard spot check passed for passage entry, hint-to-reveal focus order and Enter-to-reveal; Tab then reached the first word. No complete manual screen-reader/accessibility-conformance review was performed. Automated axe results are recorded above.
- Live Auth advisor reports leaked-password protection disabled; see [remediation guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
  This is an owner configuration follow-up, not a migration account-isolation finding.
- Names audio and staged large uploads remain parked. General grammar, generated exercises, streaks and course expansion remain deferred.
- Stop the server before content regeneration: startup diagnosis does not make replacing assets under a running process safe.
