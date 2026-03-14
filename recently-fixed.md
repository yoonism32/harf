# Recently Fixed

## Study Session queue drift
- **Weakness:** `/app/study/page.tsx` reimplemented the session queue logic instead of using the tested scheduler in `lib/srs.ts`, so queue composition could drift from the SRS rules and the tests covering `buildSessionQueue` wouldn’t guard the UI.
- **Fix:** Reused `buildSessionQueue` for queue construction and corrected the review count bookkeeping so the last card is included in saved session stats.

## Word detail performance and examples
- **Weakness:** `/app/word/[id]/page.tsx` eagerly imported the ~1 MB `wbw-morphology.json`, inflating the bundle for every word page, and only fetched one example verse despite the UI promising three.
- **Fix:** Morphology now lazy-loads on demand and the root family panel shows a loading skeleton; example verses fetch the previous, current, and next ayah when available.

## Backup integrity
- **Weakness:** `importAllData` accepted any JSON without checking the schema version, risking silent corruption if an older/newer backup was loaded.
- **Fix:** Added schema version validation against the exported `SCHEMA_VERSION` constant and return a clear error when versions diverge.

## Coverage display accuracy
- **Weakness:** Word coverage percentage in `/app/word/[id]/page.tsx` double-normalized the value and mislabeled the source.
- **Fix:** Use the stored weight directly for the percentage and update the source label to reflect the CDN API used.

## Coverage ceiling clarity
- **Weakness:** Docs/UI implied ~90% coverage though the dataset caps at ~80%.
- **Fix:** README/CLAUDE now state the 80% ceiling and CoverageHero surfaces the cap note.

## Resilient widget fetches
- **Weakness:** Daily Ayah and Prayer Times silently failed on network errors.
- **Fix:** Added user-visible errors and retry actions to both widgets, keeping dashboards informative under flaky networks.
