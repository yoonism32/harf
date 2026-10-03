# Harf — remaining work

Updated 2 October 2026. Current scope: personal use with guest IndexedDB, portable backups, and explicitly requested optional accounts/cloud sync.

## Account setup

- Confirm the deployed origin and callback allowlist in Supabase Auth; verify an actual email link on the owner’s browser. See README.
- Large imports/offline backlogs above the atomic sync limit remain local and require a backup; staged upload support is future work.

## Reliability follow-up

- Implemented: full Corpus grammar, retained QuranWBW notes/verb forms, complete canonical root families, and validated split-phrase alignment at 2:181, 8:6 and 13:37. Word audio uses recorded Quran.com filenames rather than guessed position offsets. See `docs/SOURCE_AUDIT_2026-10-02.md`.

- Prevent or clearly diagnose a stale production build referencing removed generated content. For now, stop the server, regenerate content when needed, rebuild the application, then start it.
- Expand real-browser persistence coverage: reload/resume, competing tabs, failed saves, migration, import atomicity, reset/recovery and loaded-session offline use. Unit checks exist for some rules; not every original browser acceptance case is covered.
- Rerun production browser, accessibility, performance and dependency checks before claiming a newly verified release. Include manual keyboard/screen-reader checks when assessing accessibility.

## Editorial work before public release

- Review all 300 vocabulary entries in `data/course-overrides.json`: lemma identity, form, contextual gloss, transliteration and examples. Record reviewer, date and evidence.
- The owner restored `data/99names.json` for personal use on 2 October. If pursuing public release, review those 99 Names: Arabic, meaning, transliteration convention and the basis of the selected collection. Record reviewer, date and evidence.
- NumroQ is no longer active. Keep the original Names available for personal use without claiming independent editorial certification. See `docs/CONTENT_SOURCES.md`.

Source selection and permission evidence were recorded in the previous task. These are separate from editorial accuracy. Do not invent approval records. Insight labels also remain visibly marked as awaiting editorial review; the two enforced compiler blockers concern vocabulary and Names.

Run `npm run build:content` after changing inputs or approvals, and then rebuild the application before serving it. `npm run build` is the publication gate; `npm run build:app` is available for personal testing with truthful pending-review labels.

## Current evidence

On 1 October 2026: 43 unit tests, typecheck and compiled-content validation passed. Prior-task reports recorded 21 browser tests, app build, performance budgets and dependency audit passing; those were not rerun in this documentation update.

The main app and restored features are implemented. That is not a claim that all acceptance scenarios are covered or that publication approval is complete.

## Habit features

Weekly practice-day counts are implemented. The recommended personal routine and an optional future streak specification are in `docs/ROADMAP.md`. No new daily-goal or streak feature is required or implemented now.

Verification after restoration (2 October 2026): 49 unit tests and 24 production browser tests passed across desktop Chromium, mobile Chromium and WebKit, including automated accessibility checks. Content validation, TypeScript, production application build and content/route size budgets passed. The audio browser check verifies the recorded request path with an intercepted request; it does not certify every remote recording or linguistic interpretation.

Account verification (3 October 2026): 56 unit tests and 30 production browser checks passed across Chromium, mobile Chromium and WebKit, including accessibility checks. TypeScript, application build, content validation and size budgets passed. Live Supabase checks verified user isolation, anonymous denial, stale-write rejection and tombstones; security/performance advisors returned no findings. Real email delivery and the deployed callback still require verification after configuring Render and Supabase Auth. Nothing was pushed or deployed during implementation.
