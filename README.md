# حرف · Harf

Learn Quranic vocabulary through short recall sessions, then encounter the words in ayahs. Harf targets personal use, with optional email sign-in, account progress sync, guest study and portable JSON backups.

## What is here

- 300 frequent lemma-based vocabulary entries and a separate 99 Names collection.
- FSRS scheduling, resumable study, Again/Hard/Good/Easy ratings and Undo.
- Quran reader, word inspection, bookmarks, personal notes, search and audio.
- Weekly practice days, activity history and actual vocabulary overlap by surah. Overlap is not a measure of Quran comprehension.
- Additional Practice and Insights, Daily Ayah, optional city-based prayer times, and structured Ibn Kathir commentary.
- Paper/Night themes, install metadata and an offline navigation fallback. Installation does not download the whole Quran/audio for offline use.

## Run locally

Use Node.js 26 or newer, as required by `package.json`.

```bash
npm ci
npm run dev
```

For personal testing with the production server, stop any running Harf server first:

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

`npm run build` is the separate publication path: it regenerates content, enforces release validation, then builds the app. It currently fails because 300 vocabulary entries and 99 Names await editorial approval. `build:app` permits personal testing without claiming those reviews were completed.

## Accounts

Set these **public** build-time variables in `.env.local` and your host, then rebuild:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Harf publishable key from Supabase>
```

Never put a service-role key or database password in a `NEXT_PUBLIC_` variable. Without these variables, guest study still works and sign-in shows an unavailable message.

In Supabase Authentication → URL Configuration, set the Site URL to `https://<your-domain>` and allow `https://<your-domain>/auth/callback` (for local use, `http://localhost:3000/auth/callback`). Email sign-in must be enabled. The default email sender restricts recipients and sending rate; configure your own SMTP before inviting other people. Open each magic link in the browser/device where you requested it. PKCE verification happens at `/auth/callback`; the root also forwards a returned code when Supabase uses the Site URL fallback.

Use `/profile` to check sync, resolve conflicts or sign out. Each account gets an independent IndexedDB cache; no guest import runs. The first load on a device needs a connection. Subsequent loaded study can save offline, with sync after reconnecting. Offline caches are not encrypted; clear site data after syncing/signing out on shared devices.

The migration in `supabase/migrations/` creates **`harf_private.accounts`** and **`harf_private.records`**, not public tables. RLS is enabled; direct table access is denied. The authenticated `public.harf_sync` function checks the caller identity and serializes writes with a version check. Static Quran datasets stay in generated assets. No polling or Realtime subscription is used.

Sync compares local records to the last acknowledged cloud version. Divergent devices require an explicit choice; histories are not silently merged. Choosing cloud keeps the replaced device snapshot in Settings recovery. Choosing this device retains a downloadable previous-cloud copy in Profile. Sync is not a backup: imports and resets can propagate to other devices. Keep JSON exports.

One atomic upload is limited to 1,000 changed records and about 2 MiB. A larger offline backlog/import is retained locally with an error, not partly uploaded; staged server commits would be needed to lift this limit. Initial downloads include the account history, so this implementation targets personal study rather than a large hosted service.

### Render deployment

On Render, set the two public variables above, use Node 26+, build with `npm ci && npm run build:app`, and start with `npm start` for this owner-approved personal deployment. Include the current generated content in the checkout. `npm run build` remains the separate editorial publication gate and will fail while approvals are pending.

After deployment, verify a real email sign-in, one saved review, a second-device sync and sign-out. Automated account browser tests intercept Supabase calls; live database isolation/version checks are tested separately and do not prove email delivery.

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

Source-selection approval, automated file validation and Arabic editorial approval are separate. Existing pending labels remain accurate for personal testing.

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

On 1 October 2026, 43 unit tests, typecheck and content validation passed. Full browser/build/performance results from the previous task are historical. The remaining reliability and editorial work is listed in the [current roadmap](docs/ROADMAP.md) and [task list](todo.md).

Read [AGENTS.md](AGENTS.md) for the current code map and architectural rules. [HARF_REDESIGN_PLAN.md](HARF_REDESIGN_PLAN.md) records the original design rationale; later restored features and the current personal-use scope supersede conflicting parts.

Reader word inspection includes Corpus grammar and word parts, full root-family browsing, and the original QuranWBW notes/verb forms. Shared source phrases are labelled explicitly where reader word boundaries differ. See [the source audit](docs/SOURCE_AUDIT_2026-10-02.md) for alignment details.
