# Harf — remaining work

Updated 29 October 2026. This is the concise action list; rationale and evidence live in [the roadmap](docs/ROADMAP.md).
The five personal-learning slices are implemented; do not restart them from an old plan.

## Active implementation status

The agreed reliability/deployment implementation is complete. The PLP is also complete as an implementation plan.
See [executed verification](docs/VERIFICATION_2026-10-29.md) for evidence and exact boundaries.

## Active measured-performance follow-up

- [ ] Follow the [Lighthouse plan](docs/LIGHTHOUSE_PLAN_2026-10-29.md): verify label/CSP fixes, profile font/shared bundle/content loading, then compare repeat mobile runs.

## Owner-only and recurring release checks

- [ ] Real password-recovery email/callback completion: explicitly retained as owner-only follow-up on 29 October.
- [ ] Complete manual screen-reader/accessibility-conformance review when assessing a release.
- [ ] Review leaked-password protection in live Auth settings separately; it is disabled and was not changed here.

These checks do not reopen the completed PLP or imply another feature batch.

## Completed in this follow-up

- [x] Published implementation through `e950cbe` and confirmed that revision live on Node `v26.12.1`.
- [x] Verified real signed-in reflection and saved-range upload/download; temporary data was restored/removed and cleanup confirmed in cloud.
- [x] Applied the live passage migration; verified round trips, two-account isolation, conflicts and tombstones with rolled-back synthetic records.
- [x] Added build/content startup protection and checked missing, mismatched and matching records.
- [x] Added browser checks for competing reflection drafts, failed import atomicity, backup recovery and reset retention.
- [x] Confirmed public deployed health HTTP 200 and the scheduled health workflow.
- [x] Passed production size budgets and dependency audit (zero vulnerabilities). Full production browser results are recorded in the roadmap.

## Parked and recurring work

Names audio and staged large uploads are conditional ideas, not active tasks. Legacy migration, loaded offline text study,
mid-write rollback/retry and cross-tab study now have fifteen targeted production browser checks. Further edge cases belong
with changes to those paths. Branch cleanup is housekeeping; old-share-link follow-up is separate security housekeeping.
The owner confirmed registration remains closed. The live Auth advisor reports leaked-password protection disabled;
decide separately whether to enable it (no auth setting was changed here).

## Content follow-up

- [x] Added a checked-in approved semantic baseline and a field-level diff on Progress; missing, invalid and stale reports are stated explicitly rather than shown as clean.
- Owner approval of all 300 vocabulary entries and 99 Names was recorded on 28 October. Current generated content is release-ready.
- Source records distinguish seven externally verified inputs from seven owner-approved inputs. Independent editorial certification is not claimed.
- The owner is handling the original Names collection's unrecorded external publisher. Unused legacy datasets do not block current use.
- Record future source corrections and review evidence in [content sources](docs/CONTENT_SOURCES.md), then regenerate and rebuild as appropriate.
- Keep the upstream Mutashabihat web-preview versus downloaded-artifact discrepancy documented; do not fabricate missing rows.

## Already delivered

Listening-for-meaning practice, both reader study shortcuts, reflections, manual and saved-range Today revisit,
persistent assessments/obstacles, four contextual language examples, full grammar/root browsing, saved comparison due queue,
save/navigation protection, and backup validation are implemented. See the [learning plan](docs/PERSONAL_LEARNING_PLAN_2026-10-27.md).

## Evidence and deferrals

Latest complete production regression: **151 unit tests and 151 production browser checks passed**, with two existing
browser skips. TypeScript and the application build passed. Fifteen added checks cover migration, offline text study,
transaction rollback/retry and cross-tab study. Exact scope is in the verification record.

The subsequent usability batch adds saved-range conflict protection, assessment clearing, Today retries, lazy grammar
loading and plain-keyboard transliteration search. Afternoon checks passed TypeScript, 151 unit tests, data validation
and budgets. The full browser run exposed an inline Profile-link accessibility defect, corrected before publishing;
see the verification record for the affected-check rerun and release status.

The later local learning/practice/queue/content-report slices are not production certification. They reached
**220 unit tests across 34 files**, with **21 content-report browser checks** across Chromium, Mobile Chrome and
WebKit, and `content:baseline:check` reports zero semantic changes for `2bb58c86b4683669`.

Earlier release verification: TypeScript, app build, 146 unit tests, 118 passing production browser checks (two existing skips),
12 focused persistence checks, generated-data validation, size budgets, zero-vulnerability audit and live SQL/browser sync checks passed.

Streaks, daily checklists, course expansion, general grammar/generated exercises and passage scheduling remain deferred, not missing shipped features.
