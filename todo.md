# Harf — remaining work

Updated 29 October 2026. This is the concise action list; rationale and evidence live in [the roadmap](docs/ROADMAP.md).
The five personal-learning slices are implemented; do not restart them from an old plan.

## Active actions

- [ ] Publish the verified local commits after checks (owner approved on 29 October), then verify Render serves the new passage features.
- [ ] Complete a real signed-in browser round trip for personal passage data after deployment. The owner has signed in.
- [ ] Verify actual existing-account password recovery/callback completion with the owner when needed; signup is intentionally closed.
- [ ] Complete manual keyboard/screen-reader release review. Automated checks do not replace it.

## Completed in this follow-up

- [x] Applied the live passage migration; verified round trips, two-account isolation, conflicts and tombstones with rolled-back synthetic records.
- [x] Added build/content startup protection and checked missing, mismatched and matching records.
- [x] Added browser checks for competing reflection drafts, failed import atomicity, backup recovery and reset retention.
- [x] Confirmed public deployed health HTTP 200 and the scheduled health workflow.
- [x] Passed production size budgets and dependency audit (zero vulnerabilities). Full production browser results are recorded in the roadmap.

## Parked and recurring work

Names audio and staged large uploads are conditional ideas, not active tasks. Broader legacy/offline regression coverage belongs
with changes to those paths. Branch cleanup is housekeeping; old-share-link follow-up is separate security housekeeping.
The owner confirmed registration remains closed. The live Auth advisor reports leaked-password protection disabled;
decide separately whether to enable it (no auth setting was changed here).

## Content follow-up

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

Implementation through `a7998f6` passed TypeScript, app build, 143 unit tests, 18 targeted browser checks and isolated SQL account checks.
The docs refresh does not rerun or extend that certification. Live passage migration and signed-in verification remain open.

Streaks, daily checklists, course expansion, general grammar/generated exercises and passage scheduling remain deferred, not missing shipped features.
