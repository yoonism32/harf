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

## Policy and boundaries

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
