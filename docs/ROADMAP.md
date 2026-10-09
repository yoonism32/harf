# Harf — current status and personal study plan

Updated 1 October 2026 against the working tree. Replaces the obsolete September root-word feature checklist. The original redesign document is historical; later restored features and the owner's personal-use decision supersede its conflicting scope decisions.

## Current scope

Personal Quranic vocabulary study, optional Names practice, reading, portable backups, and owner-requested optional Supabase accounts as of 2 October. `/login` and `/profile` use fresh account caches with no automatic guest import. See README for email configuration and bounded conflict-aware sync.

## Implemented

- Today, setup, due-first vocabulary study, saved sessions, recall ratings, interval previews, pause/resume and Undo.
- 300 frequency-selected lemma entries, contextual examples, word details, personal notes and priority/pause controls.
- Reader with canonical word positions, translation/footnotes, word inspection, audio, bookmarks and search.
- Separate 99 Names collection using the shared learning engine.
- Activity history, distinct weekly entries, study days and per-surah vocabulary overlap.
- IndexedDB transactions, review-attempt deduplication, revision conflict checks, cross-tab refresh, conservative legacy migration.
- JSON backup/replace import, multipart validation, reset and one previous recovery snapshot.
- Restored Practice, Insights, similar-passage practice, Daily Ayah, city-based prayer times and structured local Ibn Kathir commentary.
- Paper/Night appearance, local fonts, install metadata, offline navigation fallback, security headers, legacy redirects.

Implemented does not mean every scenario in the original specification has been independently verified.

## Evidence and remaining work

On 1 October: 43 unit tests, TypeScript and compiled-content validation passed. The previous task reported 21 browser tests, application build, performance checks and a dependency audit passing. Those earlier results are historical; rerun relevant checks after functional changes.

Priority work:

1. **Build/content consistency:** prevent or clearly diagnose starting an old app build after generated content has changed. Until addressed, regenerate then rebuild with the server stopped. The documented command sequence is a workaround, not a code fix.
2. **Real-browser persistence tests:** broaden coverage for reload/resume, simultaneous tabs, failed saves, legacy migration, interrupted/rejected imports, reset recovery and loaded-session offline use. Existing unit tests cover some rules; the seven browser scenarios do not cover all original acceptance cases.
3. **Content accuracy:** the original Names have been restored for personal use on 2 October; NumroQ is no longer active. Retain truthful independent-review status. All 300 vocabulary and 99 Names editorial approvals remain outstanding; see `CONTENT_SOURCES.md`. Personal testing does not require pretending these are complete.
4. **Release verification when needed:** rerun production browser/accessibility/performance/security checks. Automated axe tests are not a manual keyboard/screen-reader or full accessibility-conformance assessment.

No accounts, streak counter, new reward system, or content approvals were implemented by the documentation refresh. The subsequent 2 October task restored the original Names dataset and documented source-comparison results in `SOURCE_AUDIT_2026-10-02.md`.

## Suggested daily routine

This is a recommended personal routine using existing features, not a new enforced checklist or scientifically optimal time quota.

1. **Open Today and resume any saved session.** Otherwise start the next review. Review due vocabulary before pursuing new material.
2. **Try recalling the meaning before revealing it.** Grade honestly: Again if forgotten; Hard for correct but difficult; Good for correct; Easy for effortless. Getting something wrong and saving Again is still practice.
3. **Start with three new vocabulary entries per day.** Set this yourself in Settings; the general default is five. Reduce to reviews-only when the backlog feels heavy. The software can mix new entries into a partially filled review queue; it does not require clearing the entire backlog first.
4. **Finish one manageable session, then read a relevant ayah.** Use the result's context link, inspect the word, and optionally listen or bookmark. Around 5–10 minutes is a starting routine, not an enforced timer. A large backlog is not a requirement to keep studying indefinitely.
5. **Treat Names as optional separate study.** Choose its own 0/3 new-entry setting and use it after vocabulary or on another occasion. It need not become a second compulsory daily task.
6. **Return when reviews are due.** A 1- or 10-minute learning step can justify another short visit, but do not force early reviews just to earn a badge. If nothing is due and the new allowance is exhausted/zero, read and stop comfortably.
7. **Export about weekly and before browser/device/origin changes.** Today already reminds after seven distinct practice days since the last recorded export. Keep a copy outside the browser/device where practical. Import replaces the target library; it is not multi-device sync.

Practice games, Insights, reading and listening can be useful supplements. They do not currently create FSRS review events and therefore do not earn a recorded study day just by opening them.

## What earns a study day now?

The implemented rule is **at least one saved, non-undone review on that local calendar date**. No minimum accuracy, session completion or time spent is required. On Today, either vocabulary or Names counts. Progress also offers collection-specific figures.

- Opening the app, revealing an answer, browsing, or leaving an unsaved/failed answer does not count.
- Again counts as much as Easy for showing up; the scheduler still treats their learning outcomes differently.
- Multiple answers increase action totals but count as one day. Weekly distinct-entry totals deduplicate card identities.
- Undo removes the review from activity. If it was the day's only review, that day no longer qualifies.
- Dates/time zones are captured at review time. Existing dates are not rewritten when travelling; the weekly summary starts Monday using the current local date.
- Earlier aggregate legacy sessions are archived separately rather than invented into detailed review events.

## Recommendation: weekly consistency before a streak

Keep “days practiced this week” as the main measure. Personally aim for five days out of seven, with no penalty for a missed day. The app displays the count but does not currently store a five-day goal or award a completion badge. Reading-only days remain worthwhile even though they are not represented by the current review metric.

A consecutive-day streak is optional future work, not a missing requirement for this personal release. If explicitly requested later, use this small specification:

- Derive qualifying dates from existing non-undone vocabulary/Names review events; do not add a separately incremented streak value that can drift from history.
- If today qualifies, count consecutive dates backwards from today. Otherwise start at yesterday so the streak stays available while today is still in progress. If neither qualifies, show zero.
- Count each calendar date once across both collections. Undo recomputes it. A failed save never increases it.
- Keep recorded historical dates when travelling; test midnight and DST. Do not introduce account/time-server infrastructure to police a personal habit counter.
- Never require a correct answer, extra new words or premature review to preserve it. No freezes, paid repairs, rankings, or spiritual-merit claims.
- Do not call it a general reading/Quran-engagement streak unless reading activity is explicitly recorded in a future feature.

If implemented, verify one review today, yesterday-only, a gap, both collections on one date, an undone sole review and a midnight/DST boundary. Until then, the weekly activity already meets the basic habit-feedback need.


Restored on 2 October: complete Corpus segment analysis, full canonical root-family browsing, original QuranWBW notes/verb forms, and source-backed alignment/audio for the three split phrases. Details and measured counts: `SOURCE_AUDIT_2026-10-02.md`.

Verification after restoration (2 October 2026): 49 unit tests and 24 production browser tests passed across desktop Chromium, mobile Chromium and WebKit, including automated accessibility checks. Content validation, TypeScript, production application build and content/route size budgets passed. The audio browser check verifies the recorded request path with an intercepted request; it does not certify every remote recording or linguistic interpretation.

Account verification (3 October 2026): 56 unit tests and 30 production browser checks passed across Chromium, mobile Chromium and WebKit, including accessibility checks. TypeScript, application build, content validation and size budgets passed. Live Supabase checks verified user isolation, anonymous denial, stale-write rejection and tombstones; security/performance advisors returned no findings. Real email delivery and the deployed callback still require verification after configuring Render and Supabase Auth. Nothing was pushed or deployed during implementation.
