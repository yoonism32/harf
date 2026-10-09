# حرف · Harf

Learn Quranic vocabulary through short recall sessions, then meet the words in their ayahs.

## Features

- 300 frequent lemma-based vocabulary entries and a separate 99 Names collection
- FSRS scheduling, resumable study, Again/Hard/Good/Easy ratings and Undo
- Quran reader with word inspection (grammar, root family), bookmarks, notes, search and audio
- Practice history and vocabulary overlap by surah (overlap is not a measure of comprehension)
- Daily Ayah, optional prayer times, Ibn Kathir commentary
- Paper/Night themes, installable, offline navigation fallback
- Guest mode, optional account sync, JSON backup export/import

## Run locally

Requires Node.js 26+.

```bash
npm ci
npm run dev
```

Production build:

```bash
npm run build:content   # regenerate content when sources change
npm run build:app
npm start
```

### Optional account sync

Create `.env.local` with your own Supabase project:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

Apply the migration in `supabase/migrations/`. Never put a service-role key in a
`NEXT_PUBLIC_` variable. Without these variables, guest study still works.

## Keep your progress

Progress lives in the browser (IndexedDB). Each browser, port and domain has its
own storage. Use **Settings → Export progress** regularly and keep the file
somewhere off the device. Account sync is not a backup — imports and resets
propagate to other devices.

## Development checks

```bash
npm run typecheck
npm test
npm run validate-data
npm run test:e2e
```

## Content

Quran data comes from pinned QUL datasets. See [docs/CONTENT_SOURCES.md](docs/CONTENT_SOURCES.md)
for sources and how the vocabulary is selected.
