# حرف · Harf

Learn Quranic vocabulary through short recall sessions, then encounter the words in ayahs. Harf targets personal use, with optional email sign-in, account progress sync, guest study and portable JSON backups.

Documentation reviewed 29 October 2026. See the [documentation index](docs/README.md) for current plans and archived specifications.

## What is here

- 300 frequent lemma-based vocabulary entries and a separate 99 Names collection.
- FSRS scheduling, resumable study, Again/Hard/Good/Easy ratings and Undo.
- Quran reader, word inspection, bookmarks, personal notes, search and audio.
- Weekly practice days, activity history and actual vocabulary overlap by surah. Overlap is not a measure of Quran comprehension.
- Additional Practice and Insights, Daily Ayah, optional city-based prayer times, and structured Ibn Kathir commentary.
- Paper/Night themes, install metadata and an offline navigation fallback. Installation does not download the whole Quran/audio for offline use.

## Run locally

Use Node.js 26.12.1 or newer (the `.node-version` pin is 26.12.1), as required by `package.json`.

```bash
npm ci
npm run dev
```

For personal testing with the production server, stop any running Harf server first. The build records its content version; startup refuses missing or mismatched records and tells you to rebuild:

```bash
npm run build:app
npm start
```

`npm start` serves the last compiled build; it does not compile your current files. When content sources, approvals, compiler or content schema change, regenerate **before** rebuilding:

```bash
npm run build:content
npm run validate-data
npm run build:app
npm start
```

Keep the server stopped while regenerating/rebuilding. Generated content has versioned URLs. Starting an old build after its content directory has been removed causes missing-file errors; a successful server startup alone does not establish that pages can load.

`npm run build` is the separate publication path: it regenerates content, enforces release validation, then builds the app. The owner approved the current 300 vocabulary entries and 99 Names on 28 October; the current pinned content passes that gate. Future unapproved input changes can block it. `build:app` builds only the application against existing generated content.

## Accounts

Set these **public** build-time variables in `.env.local` and your host, then rebuild:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Harf publishable key from Supabase>
```

Never put a service-role key or database password in a `NEXT_PUBLIC_` variable. Without these variables, guest study still works and sign-in shows an unavailable message.

Sign in at `/login` with an email and password. New users register at `/signup` and confirm their email. Sessions persist and refresh automatically in each browser, so ordinary return visits do not need another email. A new browser/device needs its own sign-in to the same account. Passwords go directly to Supabase Auth and are never included in Harf progress or backups.

Existing email-link accounts keep their user ID and progress: on a device already signed in, open Profile → **Set or change password**. Otherwise use `/forgot-password` to request a recovery email and set a password for the existing account. Do not register a replacement account. `/account/password` requires an authenticated session; Supabase authorizes the update. Harf asks for matching passwords of 12–128 characters, and Supabase applies its configured password policy.

Current owner policy (29 October): registration stays closed for personal use. Live Supabase has new signup disabled and automatic email confirmation enabled; existing-account password sign-in remains enabled. Do not reopen registration or claim a signup-confirmation email was tested. Password recovery remains relevant for the existing account.

In Supabase Authentication → URL Configuration, set the Site URL to `https://<your-domain>` and allow `https://<your-domain>/auth/callback` (for local use, `http://localhost:3000/auth/callback`). Keep email authentication enabled. If registration is deliberately reopened in a future task, decide and configure email confirmation at that time. Both signup confirmation and password recovery reuse this callback; no additional redirect URL is needed. Open verification/recovery links in the browser where you requested them. Recovery opens password setup instead of Profile. The root forwards callback codes and query errors when Supabase uses the Site URL fallback. Expired links offer sign-in and recovery rather than trying to exchange an invalid code.

The default email sender restricts recipients and sending rate; configure your own SMTP before inviting other people. Password sign-in does not send email or consume that email quota. Confirmation and recovery still do. Browser tests intercept every Supabase request and do not send real emails or change real passwords.

Use `/profile` to check sync, resolve conflicts or sign out. Each account gets an independent IndexedDB cache; no guest import runs. The first load on a device needs a connection. Subsequent loaded study can save offline, with sync after reconnecting. Offline caches are not encrypted; clear site data after syncing/signing out on shared devices.

The migration in `supabase/migrations/` creates **`harf_private.accounts`** and **`harf_private.records`**, not public tables. RLS is enabled; direct table access is denied. The authenticated `public.harf_sync` function checks the caller identity and serializes writes with a version check. Static Quran datasets stay in generated assets. No polling or Realtime subscription is used.

Sync compares local records to the last acknowledged cloud version. Divergent devices require an explicit choice; histories are not silently merged. Choosing cloud keeps the replaced device snapshot in Settings recovery. Choosing this device retains a downloadable previous-cloud copy in Profile. Sync is not a backup: imports and resets can propagate to other devices. Keep JSON exports.

One atomic upload is limited to 1,000 changed records and about 2 MiB. A larger offline backlog/import is retained locally with an error, not partly uploaded; staged server commits would be needed to lift this limit. Initial downloads include the account history, so this implementation targets personal study rather than a large hosted service.

### Render deployment

On Render, set the two public variables above, use Node 26+, build with `npm ci && npm run build:app`, and start with `npm start` for this owner-approved personal deployment. Include the current generated content in the checkout. `npm run build` remains the separate editorial publication gate and passes for the currently approved inputs; future pending approvals can block it.

After deployment, set a password on the existing account, verify password sign-in on another device, reload persistence, one saved review, second-device sync, recovery and sign-out. Automated account browser tests intercept Supabase calls; live database isolation/version checks are tested separately and do not prove email delivery.

### Keeping Supabase awake

A free Supabase project pauses after seven days without a database query, and a request to the project URL is answered by the edge, so it does not count. Apply `supabase/migrations/20261027120000_keepalive.sql` in the SQL editor (or with `supabase db push`); it publishes `public.harf_keepalive()`, a constant-returning query the anon role may execute. Then add the two public values as repository secrets, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, so `.github/workflows/supabase-keepalive.yml` can call it every three days. Run that workflow once from the Actions tab to confirm it returns HTTP 200 and `1`. The job fails on any other response, so a paused project or a rotated key is visible instead of assumed. It only prevents pausing; it cannot wake a paused project.

### Keeping the Render service awake

A free Render web service stops after fifteen minutes without a request, so the app has to be asked for a response more often than that. `app/api/health/route.ts` answers `200 {"status":"ok",...}` from the app process, with no session and no Supabase call, so one URL serves both purposes: set it as Render's health-check path and point a frequent monitor at it. `.github/workflows/render-keepalive.yml` requests `<HARF_BASE_URL>/api/health` every ten minutes and fails on anything other than HTTP 200 with `"status":"ok"`; it resolves `HARF_BASE_URL` from a repository secret first, then a repository variable, fails if neither is configured (there is no hardcoded fallback). Run it once from the Actions tab after the first deploy.

Scheduled workflows run only from the default branch, are best-effort (a delayed run can let the service idle out, which makes the next request a slow cold start rather than a failure), and are disabled after sixty days without repository activity — re-enable from the Actions tab. If the deployed instance is an always-on plan it never idles out (ReadSync's reports three weeks of uninterrupted uptime), and the same job then works purely as a status check — slow the cadence rather than delete it. An always-on uptime monitor pointed at the same URL is the more reliable driver if ten minutes proves too loose. This job never touches Postgres; the three-day `harf_keepalive` job above still owns that.

## Keep your progress

Progress, notes, bookmarks and learning history live in IndexedDB. Theme uses localStorage; temporary note drafts use sessionStorage. When signed in, progress also syncs to your Supabase account. Guest progress stays separate; first sign-in does not import it.

Use one browser profile and address consistently. `http://localhost:3000` and a LAN address such as `http://<lan-ip>:3000` have separate storage, as do different browsers, ports and domains. Guest progress is separate on each device. Sign into the same account and sync to continue account progress elsewhere.

In Settings, choose **Export progress** about weekly and before clearing site data or changing devices/addresses. Keep all parts and the manifest of a multipart backup together. Keep a copy outside the browser and preferably off the device. Today reminds after seven distinct practice days since the last recorded export.

Import validates and previews a replacement; it does not merge two devices. Import/reset retains one previous local snapshot for recovery. That snapshot can be lost with browser data, so it is not a substitute for an exported backup.

## A simple daily routine

Resume your saved session or review what is due. Try recalling each meaning, reveal, then rate honestly. Start with three new vocabulary entries a day in Settings and reduce to reviews-only if needed. Read one contextual ayah after a session. Names are optional separate practice.

A saved, non-undone review earns a recorded practice day, including an Again answer. Today already shows weekly practice days; no consecutive-day streak is implemented. See the [daily routine and optional streak specification](docs/ROADMAP.md#suggested-daily-routine).

## Content and status

Quran vocabulary is compiled from pinned QUL datasets. The current Names input is the original Harf collection, selected by the owner for personal use on 2 October 2026, including its meanings, roots and explanations. NumroQ is no longer active. The old and current data differ in transliteration conventions and English glosses. See the [source comparison and review explanation](docs/CONTENT_SOURCES.md), including Ar-Rahman versus Al-Rahman.

Source-selection approval, automated integrity and independent Arabic editorial certification are separate. The current owner-approved content is release-ready, with seven externally verified and seven owner-approved source records. Original Names publisher provenance remains unrecorded; NumroQ is historical. See the source registry and source guide for the exact evidence.

## Development checks

```bash
npm run typecheck
npm test
npm run validate-data
npm run build:app
npm run test:e2e
npm run check:budgets
npm audit --audit-level=high
```

Locally, Playwright starts/reuses a development server; CI runs browser checks against the production build. Chromium desktop/mobile and WebKit are configured. Passing automated accessibility checks does not certify full accessibility conformance.

Implementation through `a7998f6` passed 143 unit tests, TypeScript, production app build, 18 targeted learning/passage browser checks and isolated PostgreSQL account checks. Those results are historical. The subsequent reliability phase passed 146 unit tests, 118 production browser checks (two skips), size budgets and a zero-vulnerability dependency audit; see [current verification](docs/VERIFICATION_2026-10-29.md). The remaining reliability and editorial work is listed in the [current roadmap](docs/ROADMAP.md) and [task list](todo.md).

Read [AGENTS.md](AGENTS.md) for the current code map and architectural rules. [HARF_REDESIGN_PLAN.md](HARF_REDESIGN_PLAN.md) records the original design rationale; later restored features and the current personal-use scope supersede conflicting parts.

Reader word inspection includes Corpus grammar and word parts, full root-family browsing, and the original QuranWBW notes/verb forms. Shared source phrases are labelled explicitly where reader word boundaries differ. See [the source audit](docs/SOURCE_AUDIT_2026-10-02.md) for alignment details.

The reader offers **Ayah mode** and **Reading mode** (Madinah QPC V2, 604 pages). Entering Reading mode opens the page containing the selected ayah; returning to Ayah mode opens the first ayah visible on the current page, including a continued ayah. Tapping a Mushaf word shows its ayah translation on the left and its meaning/analysis on the right on desktop; smaller screens combine these in a centered dialog. The translation panel can also switch between ayahs on the page. Page fonts load on demand; this does not make the complete Mushaf available offline. Surah headings and basmallah use Harf's Arabic font, while verse words use the supplied QPC page fonts.

**Study this passage** opens listening-for-meaning practice from either reader mode. Listen before revealing Arabic or translation, inspect words after reveal, and optionally practise a sequence of up to ten ayahs one at a time. Return to reading preserves the mode and page. Explicitly save personal assessments and a range for revisiting from Today; these do not change FSRS progress. Course words offer **Study next** with normal daily limits; existing cards show their status without resetting their schedule. Outside-course words offer an ayah bookmark. After reveal, personal reflection, tafsir and contextual language examples are available.

Both modes share audio controls: play/pause/resume, stop, a range within the selected surah, reciter, and 0.5–1.5× speed. Reading mode follows each newly playing ayah to its first page. Changing the selected ayah or reciter stops the current range. Word audio interrupts ayah playback and retains its fixed recording voice. Audio range and speed are visit-only choices; the reciter is saved in Settings. The reciter picker shows recording bitrate separately from the name.

## Personal passage learning

Passage practice offers an optional attempt at the meaning, reflection, tafsir and four contextual language examples.
Save a range and current ayah for Today, or save personal feedback with a word/construction/context obstacle.
Today lists difficult ayahs for manual revisit. The latest assessments for up to 200 ayahs are retained.
These records are included in portable backups and remain when resetting scheduled learning; replacement imports replace them.

Migration `supabase/migrations/20261029005835_passage_learning.sql` was applied to the live Harf project on 29 October. It adds the passage collections and `passageLearning` preference to the existing atomic
sync protocol through `harf_sync_v3`. The live database now accepts these uploads.
Local and live PostgreSQL checks passed for round trips, isolation, conflicts and deletions; synthetic live records were rolled back. Real signed-in reflection/range upload-download checks passed on 29 October; test data was cleaned up. See [verification evidence](docs/VERIFICATION_2026-10-29.md). Real password recovery remains owner-only follow-up.
For a reproducible isolated check, run `psql -v ON_ERROR_STOP=1 -f scripts/test-passage-sync.sql` against an **empty disposable database**.
