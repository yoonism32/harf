# Harf — remaining work

Updated 29 October 2026. This is the concise action list; rationale and evidence live in [the roadmap](docs/ROADMAP.md).
The five personal-learning slices are implemented; do not restart them from an old plan.

## Next actions

- [ ] Apply [the passage sync migration](supabase/migrations/20261028235500_passage_learning.sql) to live Supabase.
- [ ] Verify a real signed-in round trip for reflections, saved ranges, personal assessments and saved comparison cards;
      include a second device/account, conflicts and deletions. The local SQL/protocol checks passed.
- [ ] Verify deployed Render runtime/health and real signup confirmation, password recovery and callback behavior.
- [ ] Fix or clearly diagnose stale production builds after generated-content rotation. Stop/regenerate/rebuild/restart remains the workaround.
- [ ] Expand browser persistence coverage for competing tabs, legacy migration, import interruptions/atomicity,
      reset/recovery and loaded-session offline use. New learning-flow coverage does not certify every scenario.
- [ ] Before a release, run current production browser, size-budget, dependency and manual accessibility checks.
- [ ] If Names audio is still wanted, choose and review exact Quran occurrences before adding a recording map.
- [ ] Add staged account uploads only if the 1,000-record/about-2-MiB limit becomes a real need.
- [ ] Owner-only housekeeping: recheck branches/worktrees before cleanup, confirm shared-link revocation,
      and decide whether to request removal of old exposed commits. See the [dated work record](docs/PLAN_2026-10-24_to_26.md).

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
