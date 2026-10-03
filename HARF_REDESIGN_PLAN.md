# Harf: product, design, and implementation plan

**Status:** historical implementation specification, prepared before the rebuild.  
**Prepared:** 21 September 2026.  
**Audience:** the model implementing the replacement application.

> **Current-status note — 1 October 2026:** the rebuild has since been implemented and amended. Practice, Insights, Daily Ayah, prayer times and local tafsir were restored in later work. The owner now explicitly chooses personal use with browser-local persistence and backups; accounts remain out of scope. Read `AGENTS.md`, `docs/ROADMAP.md`, and `docs/CONTENT_SOURCES.md` for current architecture, evidence, outstanding reviews and daily-study guidance. This historical plan does not establish that every acceptance check was completed, and its conflicting removal instructions must not undo later work.

This document makes the product and engineering decisions. Implement them in the order specified. Repository README files, DESIGN.md, roadmaps, and earlier design notes are not requirements. Preserve user data and unrelated working-tree changes. The existing untracked `AGENTS.md` is not part of this deliverable.

## 1. Product decision

The brief left its product-purpose placeholder empty. Adopt this definition:

**Harf helps English-speaking learners who can already read Arabic script recognize Quranic vocabulary through short, repeated practice and direct encounters with words in ayahs. It connects vocabulary study to reading while clearly distinguishing vocabulary familiarity from understanding the Quran.**

Design for an adult using a phone for five to ten minutes, with a desktop experience suitable for longer reading. Arabic alphabet instruction, pronunciation assessment, a complete grammar course, and scholarly interpretation are outside this release.

The core loop is:

1. Open Today and see the next useful study action.
2. Learn a small number of new vocabulary entries or retrieve previously learned meanings.
3. Reveal the answer, inspect its context, and rate recall.
4. Read an ayah containing studied vocabulary.
5. Return when the scheduler makes another review due.

Use spaced retrieval and answer feedback as the learning foundation. The particular session limits below are product decisions, not scientifically established optimal numbers. [Research guidance on retrieval, spacing, and feedback](https://www.retrievalpractice.org/summary).

### Release scope

| Capability | Decision | Reason |
|---|---|---|
| Vocabulary study | Rebuild around 300 frequent lemma groups, including particles and other words without roots | A root family is not one interchangeable word or meaning. |
| Root exploration | Keep as secondary information within vocabulary details | Roots explain relationships without granting familiarity to every derivative. |
| Quran reader | Rebuild as a focused ayah reader with word inspection, translation, bookmarks, and verse audio | Reading makes study useful immediately. |
| Search | Combine Arabic, English, transliteration, and reference search inside Read | One search destination is easier to understand. |
| Progress | Replace comprehension claims with study activity and explicitly labeled vocabulary overlap | Every displayed figure must have a defensible denominator. |
| 99 Names | Keep as an optional collection using the same scheduler and study interface | Preserve an existing useful capability without a second learning engine. |
| Personal mnemonics | Keep, with explicit Save and saved/error status | These are user-authored learning data worth preserving. |
| Prayer times/location | Remove | This product's primary job is learning vocabulary. |
| Verse-identification listening drill | Remove | It tests memorized locations, a different learning objective. |
| Morphology multiple-choice quiz | Remove | The new study and word-inspection flows cover the relevant learning work. |
| Separate Tadabbur, topic browser, similar-verse SRS | Remove from the active product | These substantially widen editorial and interaction scope. Preserve their existing progress in the legacy archive. |
| Embedded tafsir | Remove; offer a clearly labeled external Quran.com tafsir link per ayah | Avoid maintaining an additional interpretation corpus and HTML-rendering pipeline in this release. |
| Accounts/cloud sync | Do not build | Local persistence and portable backups satisfy this release without authentication infrastructure. |
| Offline/PWA | Installable metadata and an honest offline fallback; no full offline-download system | Full offline route and asset synchronization is a separate project. Already-loaded study content remains usable offline. |
| AI explanations, leaderboards, points, religious ranks, streak penalties | Do not build | They do not support the chosen learning promise. |

## 2. Findings that determine the replacement

These observations come from executable source, configuration, and JSON data, not repository design notes. They are a source audit, not a claim that the running application or test suite was verified.

| Evidence | Consequence |
|---|---|
| `data/words.json` has 303 entries. `coverage_weight` sums to approximately 0.567312, while `lib/coverage.ts` renormalizes learned weights to an arbitrary 80% ceiling. | Remove the ceiling and the current metric. Neither this sum nor the old ceiling establishes comprehension. |
| Morphology contains 43,962 root memberships but 41,910 unique occurrence keys; 2,052 occurrence keys belong to multiple entries. | Count unique canonical word positions. Never sum overlapping root-family weights. |
| `app/coverage/page.tsx` assigns the same overall percentage to every surah. | Compute each surah from its own occurrences. |
| `scripts/expand-words.ts` collects glosses from early root occurrences and creates transliterations from root letters. | Existing generated meanings and transliterations are candidate data, not publishable dictionary entries. |
| `english-wbw.json` contains 83,665 entries, including 6,236 numeric ayah-marker glosses. | Explicitly distinguish words from end markers before counting or aligning tokens. |
| The source pipeline mixes tokenization conventions and uses prefix heuristics for some root examples. | Use one canonical occurrence model and explicit alignment exceptions. Never highlight via approximate root matching. |
| `lib/srs.ts` rounds due dates to calendar days, forces reviews to tomorrow, and reconstructs `learning_steps` as zero. | Persist the full FSRS card and honor minute-scale learning steps. |
| Study uses many independent state variables; all examples are prefetched without a concurrency bound. | Use one session state machine and bounded, deduplicated content loading. |
| Progress writes and session completion are separate localStorage operations; several components also access localStorage directly. | Use one transactional persistence boundary. |
| Backup import accepts shallow shapes and writes several keys sequentially; exports omit some progress categories. | Validate complete backups before an atomic replacement and preserve all legacy keys. |
| The service worker caches external audio without a size policy and deletes caches outside its own namespace. | Replace it with the narrowly scoped fallback described below. |
| The manifest references PNG icons absent from the inspected `public/icons` directory. | Generate and verify every referenced icon. |

Keep the installed framework stack: Next.js 16.3.4, React 19.2.8, TypeScript, Tailwind v4, ts-fsrs 5.4.2, Vitest, and Playwright. Retain the lockfile rather than combining this redesign with speculative major upgrades. Read the installed Next.js guides before implementation; App Router parameters are promises and client imports affect browser bundles.

## 3. Visual direction

Create a quiet, contemporary study book. The primary composition is text, ruled sections, generous whitespace, and one obvious action. Do not carry forward the dark gold dashboard, animated introduction, glowing surfaces, rank hero, or grid of equally emphasized widgets.

Reference decisions:

- **Quran.com reader:** adopt Arabic-first verse presentation, explicit verse references, and contextual word actions. Do not reproduce its large set of per-verse tools. The reader was inspected visually. [Reader reference](https://quran.com/al-fatihah).
- **Standard Ebooks:** adopt the emphasis on deliberate typography and reading quality, not its book photography or homepage composition. Its site was inspected visually. [Editorial reference](https://standardebooks.org/).
- **Quranic Arabic Corpus:** use the distinction between a word, its gloss, and its grammatical relationships to organize detail views. [Word-level reference](https://corpus.quran.com/wordbyword.jsp).

### 3.1 Color tokens

Define semantic variables in `app/globals.css` and expose them through Tailwind's `@theme inline`. Components use these tokens, not literal color classes.

| Token | Paper theme | Night theme | Use |
|---|---|---|---|
| `canvas` | `#F6F3EC` | `#14201D` | Page background |
| `surface` | `#FFFDF8` | `#1C2C27` | Study sheet, dialogs, fields |
| `text` | `#182A27` | `#F2F4ED` | Primary text |
| `muted` | `#586762` | `#B1BDB4` | Supporting text |
| `primary` | `#155A4A` | `#8ED4B6` | Main action, active navigation |
| `on-primary` | `#FFFDF8` | `#10231B` | Text on primary controls |
| `accent` | `#865B26` | `#D6B57A` | Small editorial labels, selected references |
| `line` | `#D9DED7` | `#405449` | Nonessential dividers |
| `control-line` | `#78867C` | `#809A8D` | Input and control boundaries |
| `selection` | `#DDEBE4` | `#294C3E` | Selected token, selected filter |
| `danger` | `#A52F2F` | `#FFB4AB` | Error text and destructive actions |
| `focus` | `#006F88` | `#7FD7EA` | Keyboard focus outline |

Default to Paper. Offer Paper and Night in Settings. No automatic theme switching. Persist the preference in the single presentation-only localStorage key `harf:theme`; all access belongs to `lib/theme.ts`, including the initial inline bootstrap emitted by the root layout. Progress never uses this key. Catch unavailable storage and use Paper.

The inspected Paper combinations provide approximately 13.5:1 primary text contrast, 5.9:1 muted text on surface, and 8.0:1 primary-button contrast. Verify all final states; the subtle divider token is not an accessible control boundary.

### 3.2 Type and spacing

- UI: **Source Sans 3**, locally served WOFF2, weights 400 and 600.
- Ordinary Arabic and vocabulary headings: **Amiri**, locally served, weights 400 and 700.
- Quran text: **Amiri Quran**, locally served, weight 400; retain exact Unicode source text.
- Use `next/font/local`; include font license files. Remove Rubik and Google font downloads from builds.
- UI body: 16px / 24px. Supporting text: 14px / 20px. Never use text below 13px.
- Page heading: 32px / 40px desktop; 28px / 36px mobile; weight 600.
- Section heading: 20px / 28px. Landing heading: 48px / 56px desktop; 36px / 44px mobile.
- Study word: 56px, line-height 1.8; 44px on narrow phones. Never clip its diacritics.
- Reader Arabic: default 36px, line-height 2.1; settings offer exactly 30, 36, or 42px.
- English translation: 18px / 29px. Paragraph measure: at most 65 characters.
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64px. Section separation: 32px mobile, 48px desktop.
- Page gutter: 20px below 768px; 32px above. Support 320px-wide screens without horizontal page scrolling.
- Radius: controls 8px; study sheet and dialogs 12px. No pill-shaped page containers.
- Shadow: dialogs only, `0 12px 40px rgb(0 0 0 / 0.12)`. Ordinary sections use spacing and rules.
- Icons: a small checked-in subset of Lucide SVG paths, 20px with 1.75px stroke, retaining its license. No full icon dependency or emoji navigation.

Arabic stays RTL inside its own language boundaries while the English interface remains LTR. Do not add letter spacing to Arabic, split connected letters into spans, justify Quran text, normalize displayed scripture, or synthesize missing diacritics. Use logical CSS properties and isolate verse references with `bdi dir="ltr"`. [Arabic layout guidance](https://www.w3.org/TR/alreq/).

### 3.3 Components and interaction rules

Build only these shared primitives: `Button`, `IconButton`, `Field`, `Dialog`, `StatusMessage`, `Skeleton`, `ArabicText`, and `ProgressBar`.

- Main buttons: minimum height 48px, horizontal padding 20px. Secondary buttons: outlined. Text actions: underlined on hover and focus.
- Every interactive target is at least 44 by 44px; study ratings are at least 56px tall.
- Focus: 3px outline using `focus`, offset 3px. Never remove the outline without a replacement.
- Use native inputs, selects, `details`, and `dialog`. Dialogs restore focus to their trigger; Escape closes nondestructive dialogs.
- Use buttons for actions and links for navigation. Never nest a button inside a whole-row link.
- Use 120ms color transitions and a maximum 160ms content fade. No card rotation, typewriter, parallax, endless decorative animation, or hover movement.
- With reduced motion, replace transitions and animated skeletons with immediate changes and static placeholders.
- Success messages stay visible for five seconds and are announced politely. Save failures persist until resolved or explicitly dismissed.
- Skeletons reserve the final section's approximate space. After a failed request, replace the skeleton with an error and Retry; never leave a permanent loading state.

## 4. Information architecture and screens

### 4.1 Shared navigation

Four destinations, in this order: **Today, Learn, Read, Progress**. Settings is a labeled gear action in the page header. The 99 Names collection lives inside Learn.

- At 1024px and wider: a 208px left rail, full-height canvas background, logo at top, four links, Settings and Sources at bottom. Main content has a maximum width of 1120px.
- Below 1024px: a 56px header and fixed bottom navigation, 64px plus safe-area inset. Labels remain visible beneath icons. Content padding includes the navigation height plus 24px.
- Below 768px: all content is one column, except the 2-by-2 rating controls.
- Study and onboarding use a focus layout without the rail or bottom navigation.
- Put a Skip to content link before navigation. One `main` landmark and one `h1` per screen.
- Mark the active destination with `aria-current="page"`, a visible indicator, and text weight, not color alone.

### 4.2 Route contract

| Route | Purpose |
|---|---|
| `/` | Public introduction |
| `/start` | One-screen first-use setup |
| `/today` | Next action and recent learning |
| `/study` | Start/resume the session identified by `session` query parameter |
| `/learn` | Vocabulary library and entry points to collections |
| `/learn/[id]` | Vocabulary entry detail |
| `/read` | Surah directory, search, bookmarks |
| `/read/[surah]/[ayah]` | Focused ayah reader |
| `/progress` | Study activity and vocabulary overlap |
| `/collections/names` | Names browse and collection study |
| `/settings` | Preferences, backups, recovery, reset |
| `/sources` | Editions, attribution, methodology, privacy explanation |

Query parameters are shareable UI state only: search `q`, search mode `mode`, library `status`, library `sort`, library `page`, reader `word`, study `session`, and the Read directory's `view=surahs|bookmarks`. Do not put notes, backups, or progress values in URLs. Validate and canonicalize parameters; ignore unsupported filter values.

### 4.3 Introduction — `/`

Desktop: a 12-column composition, seven columns for the introduction and five for a live, nonpersistent study example. Mobile: introduction followed by example.

- Header: Harf wordmark on the left; “Open Harf” on the right.
- Heading: **“Meet familiar words in every ayah.”**
- Supporting copy: “Learn Quranic vocabulary through short reviews, then see the words in context.”
- Primary action: “Begin learning” → `/start`. Secondary: “Explore the Quran” → `/read`.
- Example: use the verified `1:2` word for “Lord” from the new content package. Show Arabic, a Reveal meaning button, then its sourced contextual gloss. This example never records a review.
- Below: three numbered explanations, “Learn a word”, “Recall its meaning”, “Read it in context”; one paragraph explaining device-local progress; Sources footer link.
- After local state loads, a returning learner's main action becomes “Continue learning” → `/today`. Do not automatically redirect visitors.
- No testimonial claims, fake statistics, obligatory animation, or account prompt.

### 4.4 Setup — `/start`

Centered form, maximum width 560px. Heading: “Make room for a few words.”

Fields: new vocabulary entries per day, radio options 3, 5, 10, default 5; show transliteration during new-word introductions, checkbox default checked. Display “You can already read Arabic script; this course focuses on meaning.” as explanatory copy, not a proficiency test.

Footer copy: “Your progress stays in this browser. You can export a backup in Settings.” Button: “Start my first session”. Save settings, set `onboardingComplete`, create a first session capped at three new entries, and navigate to it. These three count toward today's selected allowance. Setup is not required to browse Read or Learn.

### 4.5 Today — `/today`

Desktop: main column 2fr, supporting column 1fr, gap 32px. Mobile order is the same as the following list.

1. Heading “Today” and local date.
2. A prominent study block with one primary action. Priority: “Resume session” if one is active; otherwise “Review N words” when any are due; otherwise “Learn N new words” if allowance remains; otherwise “Read an ayah”. Show due backlog separately from the maximum selected for this session.
3. A quiet sentence showing today's unique vocabulary entries reviewed and new entries introduced. No ring or rank.
4. “Continue reading”: last ayah's surah name/reference and a two-line translation preview. First use points to `1:1`.
5. “An ayah to revisit”: use an example from the most recently reviewed vocabulary entry; choose its first example not equal to Continue reading. With no eligible history, use `1:2`. This is an explicit learning recommendation, not a claim of randomized daily inspiration.
6. Supporting column: seven labeled day indicators and “Studied on X days this week”; then at most five recently studied entries as compact rows.
7. If the Names collection has been started, show a small “N Names ready to review” link at the bottom. It does not compete with the vocabulary primary action.

Before hydration, show section skeletons rather than zero counts. A user returning after a long break sees the same neutral review action and bounded session; no guilt message or lost streak.

### 4.6 Study — `/study?session=<uuid>`

Maximum content width 720px. Header: Exit, collection label, “X reviews completed”. A secondary line shows “Y entries remaining”; distinguish unique entries from repeated review actions.

```text
Exit                 Vocabulary                    4 reviews completed
                         12 entries remaining
──────────────────────────────────────────────────────────────────────
                        What does this mean here?

                          [large Arabic word]
                   [Arabic ayah with exact token marked]

                              [Listen]
                         [Reveal meaning]
──────────────────────────────────────────────────────────────────────
After reveal: contextual gloss, translation, source, optional root detail

       Again             Hard              Good              Easy
     Forgot it       Recalled slowly    Recalled it       Effortless
──────────────────────────────────────────────────────────────────────
Undo last answer                                      End session
```

New-entry introduction happens before its first scored recall: show the contextual word, its gloss, transliteration if enabled, root relationship if present, and the ayah. The action is “Try recalling it”; it hides the English and transliteration and enters the question state. Introduction is not a scheduled review.

During questions, display the Arabic context and word audio if a verified word recording exists; otherwise label the control “Listen to ayah”. Never play a different recording under the word label. Transliteration is hidden on question faces; a “Pronunciation hint” disclosure can reveal it without changing the answer automatically.

Reveal inserts the answer beneath the prompt and retains the Arabic. Do not make the entire sheet clickable. Move focus to a programmatically focusable answer heading on reveal and to the question heading when advancing, so scoped shortcuts remain usable without interfering with focused controls. Place four ratings in one row at 768px and above, otherwise a 2-by-2 grid. Each rating shows the actual scheduler's next interval for that grade. “Good” has the strongest emphasis, but no rating is preselected.

Again means the answer was forgotten or incorrect. Hard means it was recalled correctly with difficulty. This distinction must appear in first-use guidance and the Help disclosure; do not map “vague/incorrect” to Hard.

After a rating, disable controls while saving. Advance only after the transaction commits. On failure, retain the answer and selected rating with “Your answer wasn't saved” and Retry.

Keyboard shortcuts work only when the session container has focus and no field, button, link, select, dialog, or editable element owns the event: Space reveals; 1–4 grade; U undoes. Ignore repeated/composing/modifier key events. Native button keyboard behavior must never also trigger a session shortcut. Show shortcuts in a Help disclosure.

Exit pauses immediately after any pending save finishes; it does not discard progress. Browser back and refresh recover the same session. “End session” ends the remaining queue with completed answers retained. A session with no grades produces no activity record.

### 4.7 Session result

Render within `/study`, replacing the sheet when the session is ended or completed. Heading: “A little more familiar.” Show unique entries practiced, newly introduced entries, and how many answers were Again. Do not award mastery for finishing.

Primary: “Read these words in context”, opening the shortest example ayah containing one of the reviewed vocabulary entries. Names sessions use “Back to Names”. Secondary: “Back to Today”. Show “Continue reviews” only if something is currently due; show “Learn remaining new words” only if daily allowance remains. Do not silently exceed the daily allowance.

If learning cards are due later, say “N entries will be ready in about X minutes.” No forced countdown screen. Interval text updates on visibility return and once per minute.

### 4.8 Learn — `/learn`

Heading “Your vocabulary”. Beneath it: labeled search field, status filter, sort select, and result count. Search Arabic surface/lemma/root, verified transliteration, or English gloss. For a catalog of 300 entries, local filtering needs no worker or network.

Statuses: All, New, Learning, Familiar, Paused. “Due now” is a separate checkbox because due state overlaps familiarity. Sort: Course order, Frequency, Alphabetical; default Course order. All selections persist in the URL.

Use a ruled list, 30 entries per page, rather than a card grid. Desktop row: Arabic, short contextual meaning, frequency, status, next review. Mobile: Arabic and meaning on the first line, status/due beneath. “Frequency” means occurrences of this lemma group, not its entire root.

Separate section beneath the list: “Collections” with one 99 Names entry. Empty search state retains the query and offers “Clear filters”. Never show an empty-library state while storage is loading.

### 4.9 Vocabulary detail — `/learn/[id]`

Desktop: 640px reading column plus 280px study-information column. Mobile: one column.

Order: breadcrumb; source lemma label; large representative Arabic form; its transliteration and contextual gloss; status and due date; “Study next” action for a new entry; three example ayahs; root-family section; personal mnemonic; source attribution.

“Study next” adds the new entry to an ordered priority list for the next session and obeys the daily allowance. It does not create a review or mark the entry known. Existing entries show their due time and “Pause reviews”/“Resume reviews”; do not support manual mastery edits.

Each example identifies the exact target occurrence and its own gloss. Root-family links show related entries without inheriting their state. A missing root is shown as “No root assigned in this source”, not as an error.

Mnemonic: textarea, 1,000-character maximum, Save button, dirty-state navigation confirmation. Store plain text. Show “Saved on this device” only after commit. A missing ID renders a real 404 and a Learn link.

### 4.10 Read directory and search — `/read`

Top: Continue reading, then Search. Search mode is explicit: Reference, Arabic, English, Transliteration. Default Reference; example placeholder `2:255`. Changing mode retains the input but reruns validation.

Below: Surahs and Bookmarks as two URL-addressable views. Surahs is a numbered 114-row list with Arabic name, English name, and ayah count. Selecting a surah opens its first ayah. Bookmarks list saved references, translation excerpts, and Remove buttons.

Reference mode validates as the user submits and navigates directly. Other modes debounce by 250ms; require two Arabic letters or three Latin letters, cap input at 200 characters, and return at most 30 results with a “Showing the first 30 matches” note. Results contain a reference, Arabic preview, and translation/gloss excerpt. Selection opens the canonical reader route. No automatic audio.

Load search indexes only when a non-reference mode is first used. Display a real “Preparing search…” state. Handle worker failures with Retry. Clearing a query or changing mode invalidates every previous request, including pending excerpt loads.

### 4.11 Ayah reader — `/read/[surah]/[ayah]`

At 1200px and above: reading column up to 760px, optional word panel 320px, gap 32px. Below 1200px, word details use a native modal dialog styled as a bottom sheet, max-height 75dvh. It has a visible Close button, focus containment, and scrollable contents.

Header: surah name, reference, native surah and ayah selectors, Previous and Next links. At the beginning/end of a surah, these cross to the adjacent surah. `1:1` has no Previous and `114:6` has no Next; do not wrap.

Main section: Arabic ayah, verse audio controls, explicit translator credit, complete English translation. Keep the translation unhighlighted. Below: bookmark toggle, “Read tafsir on Quran.com” external link, and an optional “Show surrounding ayahs” disclosure containing the immediately previous and next ayahs in the same surah.

Arabic word buttons use canonical word positions. Selected words receive a selection background plus an underline. Familiar-entry indication uses a subtle underline and a legend, not recoloring whole verses. The panel contains the exact word/gloss, lemma, root, course-entry link if available, and current review status. Unknown-to-course words still expose sourced word information; they cannot be added as unreviewed custom course content.

Keep Quran end markers visible but not interactive and exclude them from statistics. Never create word buttons by splitting a separately sourced verse string on spaces.

Bookmark writes occur only on explicit action. Last reading position updates after the ayah is successfully displayed and remains visible for two seconds; loading failures do not overwrite it. Word selection is reflected in `?word=N` and restored on direct navigation.

### 4.12 Progress — `/progress`

Lead with “What you've practiced”, followed by three numbers: familiar vocabulary entries, entries reviewed this week, and study days this week. Names statistics appear in a separate section.

Below: a 28-day bar chart of committed review actions, with an equivalent accessible table; status distribution as labeled horizontal bars; then “Vocabulary in the Quran” with the exact overlap metric defined in Section 7. Show a 114-row surah table with per-surah numerators and denominators, sortable by surah number or overlap. Default surah order.

No pie charts, religious status titles, projected fluency dates, or comprehension promises. Empty state: “Your first review will appear here” and Start learning. Imported legacy activity is explicitly labeled separately; never fabricate individual review events from old aggregate sessions.

### 4.13 99 Names — `/collections/names`

Heading, collection description/source, due count, “Study Names” button, and searchable numbered list. Each expandable row includes Arabic, transliteration, sourced meaning, sourced explanation, and review status. Keep original numeric name IDs.

The first Names session introduces at most three Names. Thereafter its independent daily new allowance is three. A Names session never mixes with vocabulary and never contributes to Quran vocabulary-overlap statistics. Use the common study engine with collection-specific presentation; no Quranic verse example is invented for a Name.

The existing explanatory text requires attribution and content verification before shipping. When an explanation lacks a verified source, omit that explanation and identify the available source for the name/meaning. Do not author replacement theological prose.

### 4.14 Settings and Sources

Settings uses ruled sections, maximum width 720px, in this order:

1. Learning: vocabulary new-entry allowance 0, 3, 5, 10; introductory transliteration on/off; Names new-entry allowance 0 or 3.
2. Reading: Arabic size 30/36/42px; reciter; Paper/Night.
3. Your data: last successful backup date, Export, Import, Recover previous data, and legacy archive export.
4. Reset progress: an outlined danger action opening a confirmation dialog with an export action first.
5. Sources and privacy link.

Reciter selection uses a searchable native-select-compatible list drawn from the existing allowlisted metadata; retain a valid existing preference and default to `Alafasy_128kbps`. It never accepts an arbitrary audio URL.

Import flow: pick file → validate without writing → preview counts and replacement warning → explicit “Replace my data” → transaction → success. Cancel changes nothing. There is no merge mode. Reset confirmation text: “This clears learning history, notes, and bookmarks on this device. Your preferences will stay.” Preserve a recovery snapshot before reset.

Sources lists editions and versions, content provenance, attribution/license links, the vocabulary-overlap formula, and the limitations of lemma familiarity. State: progress stays in this browser; browser clearing can remove it; there is no account or cloud recovery; verse audio and external links contact their named providers. Do not call local saving a permanent backup.

## 5. Content model and data pipeline

### 5.1 Fixed sources

Use pinned, checked-in **QUL exports**, served from Harf's own origin. QUL explicitly describes its resources as downloads to package with a project rather than a runtime API. [QUL distribution model](https://qul.tarteel.ai/resources).

Select these resources, not an implementer-selected replacement:

| Content | Selected resource |
|---|---|
| Canonical Arabic words | [Uthmani, word by word, resource 56](https://qul.tarteel.ai/resources/quran-script/56) |
| Word glosses | [English Word by Word Translation, resource 92](https://qul.tarteel.ai/resources/translation/92) |
| Word transliteration | [English word-by-word transliteration, resource 71](https://qul.tarteel.ai/resources/transliteration/71) |
| Lemmas | [Word lemma, resource 75](https://qul.tarteel.ai/resources/morphology/75) |
| Roots | [Word root, resource 76](https://qul.tarteel.ai/resources/morphology/76) |
| Complete English translation | [Muhammad Taqi-ud-Din al-Hilali and Muhammad Muhsin Khan, resource 301](https://qul.tarteel.ai/resources/translation/301) |

Use the named full-verse translation consistently. Word glosses are a separate source and must be labeled separately. Do not align English translation words to Arabic by English stemming or substring guessing.

Create `data/sources.json` with resource IDs, exact downloaded URLs, retrieval date, source version where supplied, SHA-256, attribution, redistribution terms/evidence, and tokenization identifier. Store source exports under `data/source/qul/`. Retain originals unchanged. Check source-specific terms; public download availability is not itself proof that every source has identical redistribution terms. Preserve required notices and source availability. QAC-derived resources carry their own source licensing considerations. [Quranic Arabic Corpus license page](https://corpus.quran.com/license.jsp).

**Content gates are mandatory, not choices for the builder:** missing permission evidence or an unverified course answer blocks production publication of that content. The builder must report the exact missing item, not invent a license, credential, translation, or scholarly approval. Full exports and their linguistic accuracy were not independently verified during this planning pass.

### 5.2 Canonical entities

Define these in `lib/content/schema.ts` using Zod, and infer TypeScript types from them:

- `Surah`: number 1–114, Arabic name, English name, valid ayah count.
- `Ayah`: canonical `surah:ayah` reference; ordered `Token[]`; full translation; translator/source ID.
- `Token`: canonical `surah:ayah:position` key; source position; exact Arabic; kind `word | end-marker`; gloss; transliteration; nullable source lemma; nullable source root; nullable vocabulary-entry ID.
- `VocabularyEntry`: stable ID; exact source lemma; nullable source root; representative occurrence key; up to three approved example occurrence keys; occurrence count; course order; source IDs; approval record.
- `StudyExample`: complete Arabic token list, full translation, target key, target gloss, target transliteration, source references. The gloss is explicitly contextual, not a universal dictionary definition.
- `NameEntry`: original numeric ID, Arabic, transliteration, sourced meaning, optional sourced explanation, source IDs.

Canonical vocabulary identity is `(sourceLemma, sourceRoot-or-empty)`, with NFC Unicode normalization only. ID: `l-` followed by the first 16 hexadecimal characters of SHA-256 of the two strings separated by a NUL. Validate that no IDs collide. Do not use Latin root transliterations as unique IDs, and do not merge distinct lemmas merely because their roots match.

The course is the 300 most frequent eligible lemma groups in the pinned corpus. Eligible means a nonempty source lemma and at least one fully aligned Arabic/gloss/transliteration example; absence of a root is allowed. Count word occurrences, exclude end markers, and retain function words with no root. Sort by descending occurrence count, then raw lemma and root Unicode code-point order. This is also the default course order. Emit excluded groups and their reasons in the compilation report.

For every selected entry, propose three examples from different ayahs: prefer ayahs of 3–25 word tokens; within that set sort by word count, then numeric reference and position. If fewer than three exist, use the shortest remaining valid ayahs; one valid example is the minimum. The first approved example is the representative. Display its actual Arabic form, transliteration, and contextual gloss; do not manufacture an unvocalized lemma's pronunciation or a dictionary definition from root letters.

Store explicit editorial corrections, selected examples, legacy mappings, and approval records in `data/course-overrides.json`. An Arabic-competent content review must verify each course entry's target/gloss alignment, lemma grouping, and example suitability. Implementers may prepare these records but cannot claim that an automated check constitutes that review. If a top-300 entry cannot be verified, release is blocked until corrected; silently replacing it with a different entry is prohibited.

### 5.3 Alignment and generated outputs

`scripts/build-content.ts` must:

1. Verify pinned hashes and parse sources using their schemas.
2. Build canonical tokens from the Arabic source, preserving displayed Unicode and positions.
3. Join other resources by validated occurrence keys. Detect missing keys, extra markers, shifted positions, duplicate positions, and differing segmentation.
4. Apply only documented, source-backed exceptions in `data/token-alignment.json`. A mapping can cover multiple source positions; it must never silently shift all subsequent words.
5. Mark unaligned optional morphology as unavailable. Never guess it from letter subsequences. Missing core Arabic/translation or an unaligned selected study answer fails the build.
6. Derive the course and exact occurrence indexes, including per-surah denominators from canonical `word` tokens. Do not hardcode a universal Quran word count.
7. Generate `public/content/<contentVersion>/catalog.json`, `surahs/1.json` through `surahs/114.json`, `entries/<id>.json`, `names.json`, `overlap.json`, and separate Arabic, English, and transliteration search indexes.
8. Emit a manifest of generated file hashes and an alignment report. Same inputs must produce byte-identical outputs; retrieval timestamps belong in pinned source metadata, not generated payloads.

`contentVersion` is a hash of source hashes plus course/alignment overrides. Generated files are immutable. Ordinary `npm run build` validates and compiles pinned local data; it must not fetch new scripture, descriptions, or fonts from the internet.

Retain original draft datasets in version control during migration, but remove their imports from runtime code. `scripts/expand-words.ts` must no longer be used to generate teaching content.

## 6. Architecture and persistence

### 6.1 Technology decisions

| Area | Decision | Reason |
|---|---|---|
| Framework | Keep Next.js App Router and React | Existing routing, rendering, and deployment are sufficient. |
| Styling | Keep Tailwind v4; replace all design tokens and screen layouts | No additional styling system is needed. |
| Scheduler | Keep installed ts-fsrs; replace wrapper | Scheduling is solved; serialization and session integration are not. |
| Persistence | IndexedDB through `idb` major 8 | Card, answer event, and session cursor require one atomic transaction. |
| Runtime validation | Zod major 4 | Backups and content have nested trust boundaries that static types cannot validate. |
| State | A small cached store with React `useSyncExternalStore`; `useReducer` for transient session presentation | Avoid global state frameworks while making updates consistent. |
| Fetching | Native fetch, AbortController, an in-flight promise map, maximum four concurrent content requests | The content is immutable and does not need a query-cache framework. |
| Search | Native Web Worker; preserve useful transliteration scoring behind regression tests | Corpus search should not block typing. |
| Audio | One lazy HTMLAudioElement owned by `lib/audio.ts` | Prevent overlapping players and duplicated playback state. |
| Components | Native elements and the eight primitives specified above | A component suite would introduce unused behavior and styling constraints. |
| Charts | CSS bars plus accessible tables | These small charts do not require a chart package. |
| Backend | No user-data backend; static content on the same origin | The app's private state remains local. |
| Testing | Keep Vitest/Playwright; add `fake-indexeddb` and `@axe-core/playwright` as dev dependencies | Exercise real persistence semantics and rendered accessibility. |

Pin resolved dependency versions in the lockfile. Do not add Redux, Zustand, XState, TanStack Query, a UI kit, an animation library, a chart library, an ORM, authentication, or a sync service.

Use React's documented cached-snapshot subscription contract; `getSnapshot` must not create a new object on every read. [React external-store API](https://react.dev/reference/react/useSyncExternalStore). Await transaction completion, not just an individual successful put. [idb transaction guidance](https://github.com/jakearchibald/idb).

### 6.2 Final structure

```text
app/
  layout.tsx, page.tsx, globals.css, error.tsx, global-error.tsx, not-found.tsx
  manifest.ts, sitemap.ts, robots.ts
  (main)/layout.tsx
  (main)/today/page.tsx
  (main)/learn/page.tsx
  (main)/learn/[id]/page.tsx
  (main)/read/page.tsx
  (main)/read/[surah]/[ayah]/page.tsx
  (main)/progress/page.tsx
  (main)/collections/names/page.tsx
  (main)/settings/page.tsx
  (main)/sources/page.tsx
  (focus)/layout.tsx
  (focus)/start/page.tsx
  (focus)/study/page.tsx
components/
  ui/{Button,IconButton,Field,Dialog,StatusMessage,Skeleton,ArabicText,ProgressBar}.tsx
  shell/{AppShell,PrimaryNav,FocusShell,StorageStatus}.tsx
  today/TodayView.tsx
  study/{StudySession,StudyPrompt,RatingControls,SessionResult}.tsx
  learn/{VocabularyList,VocabularyDetail}.tsx
  reader/{Reader,WordPanel,ReadDirectory,QuranSearch,AudioControls}.tsx
  progress/ProgressView.tsx
  collections/NamesCollection.tsx
  settings/{SettingsView,BackupControls}.tsx
lib/
  content/{schema,server,client,refs}.ts
  data/{schema,db,migrate,backup,store}.ts
  learning/{scheduler,queue,session,commands,metrics,calendar}.ts
  search/{normalize,english,arabic,transliteration}.ts
  workers/search.worker.ts
  audio.ts, theme.ts
data/
  source/qul/*, sources.json, course-overrides.json, token-alignment.json
scripts/
  build-content.ts, validate-data.ts, check-budgets.ts
public/
  content/<contentVersion>/*, fonts/*, icons/*, sw.js, offline.html
```

Place tests next to the corresponding `lib` module in `__tests__` directories. Do not create generic repositories, adapters, event buses, or a plugin architecture. `db.ts` owns physical persistence; domain commands own meaningful transactions.

Server pages validate routes, load public content, and produce metadata. Client leaves handle local state, forms, study, audio, and selection. Never import an entire corpus into a client component to render one ayah. `lib/content/server.ts` is marked `server-only`; browser code uses `client.ts`.

### 6.3 Database contract

Database name: `harf`; initial IndexedDB version: 1; serialized app/backup schema: 2. These version numbers have different purposes.

| Store | Key and records |
|---|---|
| `meta` | `settings`, `schemaVersion`, `migrationComplete`, `revision`, `activeSessionId`, `priorityEntries`, `lastVerse`, `lastExportAt`, `lastRecoveryAction` |
| `cards` | Key `vocabulary:<entryId>` or `names:<numericId>`; full serialized FSRS card, paused flag, content identity, revision |
| `reviews` | UUID event ID; unique attempt ID index; card ID, session ID, timestamp, captured local date/timezone, grade, before/after card, undone flag; indexes by card and local date |
| `sessions` | UUID; collection, pinned contentVersion, queued study payloads, cursor, presentation phase, counts, status, last undoable event, revision |
| `notes` | Vocabulary entry ID; text, updatedAt |
| `bookmarks` | Ayah reference; createdAt |
| `legacy` | Exact original localStorage strings, legacy session aggregates, unmapped records, migration report |
| `recovery` | One previous complete app-data snapshot, excluding the recovery store itself |

FSRS dates serialize as full ISO timestamps and deserialize to Date only inside the scheduler. Preserve `due`, `stability`, `difficulty`, `elapsed_days`, `scheduled_days`, `learning_steps`, `reps`, `lapses`, `state`, and `last_review`. Do not derive scheduled days from stability. Avoid storing a second mutable mastery score.

Successful commands increment `meta.revision`, update the cached state, and notify other tabs through BroadcastChannel. Also refresh on `visibilitychange` so correctness does not depend on BroadcastChannel support. The database transaction checks expected revisions and session attempt IDs before writing; notifications are not a locking mechanism.

No component directly calls IndexedDB or localStorage. Exceptions are the documented theme helper and the read-only legacy migration path. Public content caches are separate from user progress.

### 6.4 Legacy migration

Read every current `harf:v1:*` key plus `harf-location`, `harf-reciter`, and the older `harf:reciter` alias. If both reciter keys exist, use a valid `harf-reciter` value first. Do not enumerate or copy other applications' storage.

Migration runs once, only when schema-2 state does not already exist:

1. Copy exact raw strings into a prospective legacy archive before parsing.
2. Validate individual records. A malformed key does not erase or invalidate unrelated valid records. Keep invalid raw data with a report.
3. Map old vocabulary IDs through the explicit reviewed mapping in `course-overrides.json`. Map to at most one new lemma entry; never fan one root's mastery out across its derivatives. Ambiguous and absent mappings stay archived.
4. When several old records map to the same new card, retain the valid record with the latest `lastReviewed`, then highest `reps`, then lexicographically smallest old ID. Archive every source record.
5. Preserve supported FSRS fields. Interpret old `YYYY-MM-DD` due values as `00:00:00Z`, matching their previous UTC date convention. Reconstruct missing `scheduled_days` from due minus last review, clamped to a nonnegative integer; use zero if unavailable. Missing `learning_steps` becomes zero. Record these approximations in migration metadata.
6. Convert valid older SM-2 records using the existing migration's interval/repetition mapping; label that conversion. Never invent historical review events.
7. Import Names by original numeric ID. Copy notes and paused status. Preserve old study sessions separately; their coverage numbers are historical draft values, not new overlap statistics.
8. Archive both mutashabihat progress categories and location settings. Migrate a valid last-verse reference. Set onboarding complete when existing learning progress is present.
9. Write all new records, raw archive, and migration-complete marker in one transaction. Leave original localStorage untouched. On failure, retry idempotently without duplicating anything.

After success, show a dismissible “Your existing progress has been preserved” notice with migrated and archived counts and a Settings link. Do not falsely claim all old mastery maps to the redesigned course.

### 6.5 Backup, recovery, and save failures

Backup format: `{ app: 'harf', schemaVersion: 2, contentVersion, exportedAt, data }`, where `data` includes all user stores except `recovery`, transient locks, and caches. Store complete historical records and the legacy archive. Export ordinary JSON while it is at most 20 MiB. Above that size, export a numbered multipart backup: each part contains `{ app: 'harf', schemaVersion: 2, backupId, partIndex, partCount, exportedAt, contentVersion, records }`, with records expressed as `{ store, key, value }`, and each part at most 20 MiB of UTF-8 JSON. Pack whole records; never split a record's text. Include a SHA-256 of the ordered part payloads in a small manifest file. This is one backup set; its files are named consistently and offered together in the export screen. Do not silently trim history or export a file the importer rejects.

Import accepts either the ordinary file or a selected complete multipart set plus manifest. Reject an individual part over 20 MiB before reading it, verify part count/order/hash and unique record keys, and reject a missing or duplicate part without touching active data. Validate parts sequentially into a temporary IndexedDB database named `harf-import-staging`; collect all validated records before the single active-database replacement transaction. Close/delete the staging database after success or cancellation. An interrupted staging import is discarded on next startup. Staging writes never count as progress changes. If storage is insufficient for staging plus recovery, refuse replacement and leave the old data intact. Treat multipart support as part of backup implementation, not a future choice.

Support existing v1 exports through the same migration conversion. An old export that omitted mutashabihat data cannot restore data it never contained; state this in the preview. Accept a versionless v1 file only when it exactly matches the known old export shape and contains at least one recognized payload field. Reject arbitrary empty objects.

Validate finite numbers, integer counts, allowed states/grades, valid timestamps, reference bounds, lengths, IDs, unique primary keys, session/card references, and bounded arrays. Reject dangerous object keys such as `__proto__`, `constructor`, and `prototype`; rebuild records from schema output. Unsupported newer schema versions are a hard failure. For a different contentVersion, preserve unknown entries in legacy storage, omit them from active queues, and show their count.

Parse and validate before opening a write transaction. Import atomically stores the previous complete snapshot in `recovery`, replaces active stores, archives unsupported records, clears the active-session pointer, and changes imported unfinished sessions to ended without adding review events. Preserve their completed reviews. Never run fetches or arbitrary asynchronous work inside an IndexedDB transaction. Recovery restores the saved snapshot atomically and clears the recovery slot; expose its creation time. Reset uses the same snapshot mechanism and clears learning data while keeping preferences and a marker preventing legacy reimport.

If IndexedDB cannot open, allow read-only browsing and label “Progress storage is unavailable”. Disable graded sessions and mutations; do not pretend to save in memory. Quota or transaction failure during a session retains the current answer, permits export, and offers Retry. Storage corruption must produce a recovery screen, never silent empty progress. Browser eviction remains possible; show a modest backup reminder after seven active study days without an export.

## 7. Learning rules and metrics

### 7.1 Scheduler

One pure function computes four scheduling results from `(serializedCard-or-null, now)`. A second pure function selects the grade result. Neither reads storage, calls Date.now internally, nor mutates its input.

Use ts-fsrs with `request_retention: 0.9`, `enable_fuzz: false`, `enable_short_term: true`, learning steps `['1m', '10m']`, relearning steps `['10m']`, and the library's existing default maximum interval. Persist exactly the returned card. Preview intervals and saved grades must use the same card and captured timestamp. [FSRS parameter and learning-step documentation](https://open-spaced-repetition.github.io/ts-fsrs/).

Display states:

- New: no committed review.
- Learning: FSRS Learning/Relearning, or Review with stability below 21 days.
- Familiar: FSRS Review with stability at least 21 days.
- Paused: user pause flag, overriding the visible label while retaining the underlying card.

Familiar is a scheduling classification, not a test of comprehension or a guarantee of present recall. “Due now” is independently `due <= now`. Do not automatically pause difficult cards; after eight lapses show an optional “Add a mnemonic” suggestion on the detail page.

### 7.2 Queue and session rules

At creation, select at most 20 distinct entries from one collection:

1. Valid, unpaused due cards first, ordered by due timestamp then stable ID.
2. Fill remaining slots with new entries, bounded by that collection's remaining daily allowance. Use explicitly prioritized entries first, then course order. Names use their numeric order.
3. If 20 cards are already due, introduce no new entries in that session. Never exclude overdue cards merely because they are overdue.
4. Recheck remaining allowance and active-session state in the session-creation transaction after content loading; concurrent tabs cannot reserve additional new entries unnoticed.
5. Only one active session exists across both collections. Starting another collection offers Resume existing session or End existing session and start this collection.

Persist all selected study payloads and the contentVersion before entering the session. Select examples deterministically by committed review count modulo the entry's approved example count; keep a given attempt's example fixed through retries and refresh. Load at most four payloads concurrently, deduplicate requests, and reject session creation if any required payload is missing. No review is lost because an optional audio request fails. When ending a session, retain its IDs/counts/timestamps/result reference but remove its copied public-content payloads; only an active or paused session needs those snapshots. Historical event records remain intact.

After every grade, insert that card's next same-session learning attempt only if it becomes due while the session is open and the session has fewer than 30 committed grading actions. Choose ready repeated learning attempts before unseen initial-queue entries. Do not grade it early to avoid waiting. If no item is ready, end the session with the next due time. Also end at 30 actions, even if reviews remain. Unfinished cards retain their scheduler due timestamps.

State machine: `loading → introduction | question → answer → saving → introduction | question | complete`. Errors return to the state containing the user's unsaved answer. `paused` is a persistent session status; `error` is not a successful transition.

`commitReview` transaction checks session ID, session revision, current attempt ID, and card revision; then writes the card, review event, updated session, counters, and global revision. An already-committed attempt returns its original result. A stale different attempt produces “This session changed in another tab” and reloads canonical state; it is not reapplied to a different card.

Undo affects only the latest committed event in the active session, provided no later review or external card change superseded it. Restore its exact prior card or delete the newly created card, mark the event undone, restore the session position and queue, and restore introduction counters. Opening a new attempt does not disable Undo; committing a later answer makes that newer answer the undo target. Undo after ending/leaving the session is not offered. Pausing through Exit clears the undo pointer; resuming starts a new undo window.

### 7.3 Time and activity

Use real UTC instants for scheduling. Capture a local `YYYY-MM-DD` and IANA timezone on each review event for activity history. Build dates with `Intl.DateTimeFormat(...).formatToParts`; do not use `toISOString().slice(0,10)` for local-day boundaries. Date-only calendar arithmetic uses calendar components, not subtraction of 86,400,000ms across daylight-saving transitions.

An entry counts as newly introduced on the local date of its first non-undone graded event. Daily allowances count these introductions plus new entries reserved by the one active session. Pausing preserves reservations; ending releases unused reservations. A session crossing midnight retains its reserved entries; new sessions use the current local day's remaining allowance. Changing an allowance does not alter an already-started session.

Activity counts committed, non-undone events. Study days require at least one such event. The week begins Monday. Historical local dates do not change when the user travels. Do not invent missed study days or use a punitive streak.

### 7.4 Vocabulary overlap

Let `F` be active-course entries whose underlying FSRS state is Familiar, including paused familiar entries. Let `W_s` be the set of canonical word-token keys in surah `s`; end markers are excluded. Let `O(F)` be the union of canonical occurrence keys assigned to entries in `F`.

`overlap(s) = 100 × |W_s ∩ O(F)| / |W_s|`

Global overlap uses the union of all `W_s`. Use set membership or disjoint canonical-entry ownership, never summed legacy weights. A zero denominator displays “Unavailable”, not NaN or zero. Round only the final displayed percentage to one decimal place.

Label: **“Word positions linked to familiar vocabulary”**. Supporting text: **“An estimate based on vocabulary practice. Word forms and meanings vary by context; this is not a comprehension score.”** Display the numerator and denominator. Names do not enter this calculation. No 80% cap and no ranking system.

Also show “Course vocabulary appears in X% of word positions”, derived from the same formula with all 300 course entries. This is the measured content ceiling, never a marketing promise about how much the learner understands.

## 8. Search, audio, errors, and performance

### Search implementation

- Reference parsing validates full surah/ayah bounds against canonical metadata; normalize leading zeros before navigation.
- Arabic normalization is for search only: NFC, strip diacritics/tatweel, fold alef variants and final alef-maqsura, collapse whitespace. Do not fold ta marbuta into ha. Rank normalized whole-phrase matches before token matches, then verse order.
- English mode searches the full-verse translation plus token glosses. Lowercase, tokenize Unicode letters, match all nonempty query tokens; rank exact phrase, then whole-token hits, then stem hits. Keep current `stemWord` only after targeted tests. Do not discard a query because it is a common function word.
- Transliteration mode retains the current normalization/scoring algorithm initially, but stops exposing its space-split words as Arabic alignment. Add a fixed query/result corpus before refactoring it.
- The worker initializes only the requested index, identifies responses by monotonically increasing request ID, emits a final result once, and is terminated when search unmounts. Ignore stale results after typing, clearing, or changing mode. No excerpt-fetch race may overwrite a newer result set.

### Audio implementation

Use one shared controller with `idle | loading | playing | paused | error` state. Accept validated occurrence/reference IDs and an allowlisted reciter ID, then construct a URL. Preserve existing working URL-format logic and tests, but remove its localStorage reads.

User action is always required to start playback. Starting another recording stops the previous one. Stop playback on route change, study-card change, and reciter change. Ignore callbacks from a superseded source. Promise rejection or media error returns a visible Retry action. At 12 seconds without playable audio, stop the loading state and show failure. Do not automatically switch reciter or cache external audio in the service worker.

### Failure contract

| Condition | Required result |
|---|---|
| Invalid route/ref | Server 404 for route; inline validation for form. No upstream fetch. |
| Required content load fails | Affected section shows Retry; existing user progress remains intact. |
| Content-version mismatch | Current session uses its saved content snapshot; new sessions use the current catalog. Missing entries cannot crash queues. |
| Missing token morphology | Arabic and translation still work; panel labels morphology unavailable. |
| No due cards and no new allowance | Offer Read; show next due time if one exists. |
| All entries paused | Explain this and link to Learn's Paused filter. |
| Double click/held key | One review event and one queue advance. |
| Two tabs grade | One authoritative transaction; stale tab reloads without writing over it. |
| App closes after successful save | Grade, cursor, and counts resume together. |
| Import invalid/newer/oversized | Zero writes; persistent, specific error and another-file action. |
| Import/reset transaction fails | Previous active data remains readable and unchanged. |
| Audio unavailable/autoplay blocked | Text study remains usable, with visible playback error. |
| Offline during an already-loaded session | Text, grading, and local saving continue; unavailable audio is labeled. |
| Offline cold navigation | Branded fallback explains that this version needs a connection to open pages. Never promise full offline availability. |
| System clock behind the card's last review | Block that card's grade with a clock message; do not feed negative elapsed time into FSRS or reset the card. |
| Browser storage blocked/evicted | Explicit storage/recovery state; never claim that missing data was restored. |
| Huge text, keyboard, zoom | Controls remain reachable; content scrolls normally; nothing important is clipped. |

### Performance and security limits

- Today/Learn route-specific JavaScript above the shared framework: at most 100 KiB gzip per route. Study: at most 150 KiB. Search worker plus loaded index: at most 1 MiB gzip per mode. Measure the production build, not source sizes.
- Catalog: at most 100 KiB gzip; one session's selected text payloads: target at most 250 KiB gzip. Full-corpus files must never be embedded in initial HTML or shared client chunks.
- Reader renders one main ayah; surrounding ayahs load on disclosure. Do not virtualize scripture or render 286 interactive ayahs at once.
- Immutable public-content cache: in-flight deduplication, remove rejected promises so Retry works, 8-second timeout, at most four simultaneous fetches, 16 surah objects retained in an insertion-ordered LRU map. Consumer cancellation must not abort a shared request needed by another view.
- Do not cache failed responses as successful content. Use retry-on-user-action rather than indefinite background retries.
- Target LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 at the 75th percentile when field data exists; before release use five mobile Lighthouse runs and report their median as a lab check, not field evidence. [Web Vitals definitions](https://web.dev/articles/vitals).
- Do not claim these budgets passed during planning. If exceeded during implementation, split content and imports; do not weaken the budget without an explicit report.
- Keep security headers; add `object-src 'none'` and `form-action 'self'`; remove production `unsafe-eval`, unused geolocation permission, and removed API origins. Development may retain eval for Next tooling. Keep the static-rendering-compatible inline-script allowance for Next hydration in this release; do not introduce request nonces that force every static page into dynamic rendering. This is an explicit tradeoff, not a claim of strict CSP.
- Render all content and notes as text/structured React nodes. No `dangerouslySetInnerHTML`, including imported translation annotations. Parse source HTML during content compilation with `parse5`, a build-only dependency. Output ordered `{ kind: 'paragraph' | 'note', text: string }` translation blocks plus a derived plain-text search string. Preserve paragraph breaks and annotation text; discard script/style contents, active elements, and URL-bearing attributes. Do not use regular expressions as an HTML parser.
- No user-derived file paths, arbitrary external fetch URLs, telemetry, session replay, or microphone permission. The content server resolves validated IDs within generated directories.
- Replace `public/sw.js` with same-origin navigation fallback only: precache `offline.html`, handle failed navigation, and delete only old Harf cache names. No audio cache, CDN substring matching, broad cache deletion, or claim of offline lessons. Keep this worker at the same URL to update existing installations.

## 9. Build order

Each task is one independently reviewable implementation change. Follow dependencies in numeric order. Add focused checks with the behavior, not a test framework per feature. Keep the application building after each task; temporary unused new modules are acceptable, public half-wired screens are not. Do not deploy midway through the replacement.

### Task 01 — Establish the build baseline

**Files:** `package.json`, lockfile, `tsconfig.json`, `vitest.config.ts`, `.github/workflows/ci.yml`.

Record the current type-check, unit-test, build, and E2E results before edits. Add `idb@8`, `zod@4`, and the two specified testing dev dependencies. Add scripts `typecheck`, `content:build`, `content:validate`, and `check:budgets`; initially wire only scripts whose implementation exists. Use the existing Node 26 environment. Do not upgrade unrelated packages.

**Check:** `npm ci`, type-check, and original tests still run; record pre-existing failures separately instead of quietly editing assertions to pass.

### Task 02 — Pin source content and define schemas

**Files:** `data/source/qul/*`, `data/sources.json`, `lib/content/schema.ts`, `lib/content/refs.ts`, `lib/content/__tests__/refs.test.ts`.

Acquire the six selected exports, record hashes/terms/source IDs, define all canonical entities, and implement reference bounds and token-kind handling. Retain source files unchanged. Verify metadata across all 114 surahs and 6,236 ayahs.

**Check:** malformed refs, `0:1`, `115:1`, `1:8`, trailing components, marker tokens, and leading-zero normalization have explicit tests. Every pinned hash verifies. Missing source permission evidence is reported as a release blocker.

### Task 03 — Compile aligned content

**Files:** `scripts/build-content.ts`, `scripts/validate-data.ts`, `data/token-alignment.json`, generated `public/content/*`.

Implement the Section 5 compilation steps, bounded source parsing, explicit alignment exceptions, full translation preservation, and deterministic outputs. Replace the existing warning-only data validation where mismatches could produce a wrong study answer. Do not infer compatibility merely because two sources share a numeric key.

**Check:** two compilations produce identical hashes; shuffled input order does not change output; deliberate shifted/missing tokens fail selected-answer validation; every reader reference is valid. Include `1:1`, `2:181`, `2:255`, and `2:282` in alignment checks.

### Task 04 — Define the course and migration map

**Files:** `data/course-overrides.json`, `scripts/build-content.ts`, `lib/content/__tests__/course.test.ts`.

Generate the top-300 lemma candidate set and deterministic example proposals. Complete explicit legacy ID mappings; never map a root record to multiple lemmas. Prepare source-backed review records for the chosen examples and Names content. Keep unverified approval fields false.

**Check:** exactly 300 unique course identities, including rootless entries where selected by frequency; no example crosses lemma identity; all targets/glosses match; production content validation fails on an unapproved entry. Content approval is an external accuracy gate, not an implementer design choice.

### Task 05 — Add transactional storage

**Files:** `lib/data/schema.ts`, `lib/data/db.ts`, `lib/data/__tests__/db.test.ts`.

Create the eight stores and indexes in Section 6.3. Implement opening, blocked-upgrade handling, atomic transaction helpers, revision reads, and plain serialized records. Keep a single database implementation.

**Check:** with fake IndexedDB, a failed multi-store write rolls back all changes; duplicate attempt IDs fail uniqueness; opening/upgrading is idempotent. Add a real-browser persistence smoke check later in Task 24.

### Task 06 — Migrate existing users

**Files:** `lib/data/migrate.ts`, `lib/data/__tests__/migrate.test.ts`, reviewed mappings in `data/course-overrides.json`.

Implement the exact migration rules, raw archival, collision precedence, legacy SM-2 conversion, and all old key categories. Leave localStorage untouched. Emit migrated/archived/invalid counts.

**Check:** realistic v1 fixtures cover valid words, Names, both mutashabihat categories, corrupt JSON, both reciter keys, ambiguous mappings, merged mappings, missing dates, and retry after an aborted transaction. Running migration twice produces identical active data.

### Task 07 — Implement backups and recovery

**Files:** `lib/data/backup.ts`, `lib/data/__tests__/backup.test.ts`.

Implement schema-2 ordinary/multipart export, size-limited staged import, v1 conversion, replacement preview, atomic replacement/reset, and one recoverable previous snapshot. Unknown content IDs survive in the archive. Do not import a recovery snapshot recursively. Enforce per-record lengths so a single supported record never exceeds the part size.

**Check:** export→import preserves all supported stores; test both an ordinary backup and a generated backup larger than 20 MiB split into parts. Missing/duplicate/tampered parts, malformed nested records, prototype keys, duplicate IDs, unsupported versions, and oversized individual files make zero active-data writes; interrupted replacement leaves original data intact; recovery restores the prior state; reset never triggers legacy remigration.

### Task 08 — Replace the scheduler wrapper

**Files:** `lib/learning/scheduler.ts`, `lib/learning/__tests__/scheduler.test.ts`; later delete replaced `lib/srs.ts` consumers.

Implement pure scheduling, complete serialization, fixed parameters, display status derivation, and interval previews. Use captured `now` inputs everywhere.

**Check:** full-card round trips preserve every field; Again on a new card can schedule within the same day; preview and committed result agree; a lapse changes state correctly; existing paused flags are preserved; no forced-tomorrow behavior remains.

### Task 09 — Implement calendar and queue rules

**Files:** `lib/learning/calendar.ts`, `lib/learning/queue.ts`, their focused tests.

Implement local-day/week grouping, daily introductions/reservations, due-first selection, stable ties, priority new entries, excluded paused/unknown cards, and collection isolation.

**Check:** 50 due cards yield 20 selected and zero new; 2 due with allowance 5 yields at most 7 distinct entries; repeated sessions cannot exceed the day's allowance; test London DST, a UTC-negative locale near midnight, allowance zero, all paused, and empty catalog inputs.

### Task 10 — Implement resumable sessions and review commands

**Files:** `lib/learning/session.ts`, `lib/learning/commands.ts`, `lib/learning/__tests__/session.test.ts`, `lib/learning/__tests__/commands.test.ts`.

Implement persistent session state, saved content payloads, same-session ready-learning selection, 30-action cap, pause/end, idempotent commit, revision conflicts, and Undo. All grade-related writes share a transaction.

**Check:** double commit produces one event; a reload resumes the correct face/cursor; failed save leaves the current answer; Undo restores a newly introduced card and quota; later learning steps are not shown early; two simulated tabs cannot overwrite each other or create two active sessions.

### Task 11 — Add the subscription store and loaders

**Files:** `lib/data/store.ts`, `lib/content/client.ts`, `lib/content/server.ts`, corresponding tests.

Implement stable external-store snapshots with explicit loading/ready/error states. Add BroadcastChannel and visibility refresh. Implement content-version URLs, bounded fetches, deduplication, retryable failures, and LRU limits. Client persistence initializes only when needed; public introduction content does not wait for it.

**Check:** repeated snapshot reads retain identity until a change; a committed write updates two subscribers; concurrent duplicate loads issue one request; failed load can retry; the seventeenth surah evicts the least recently used of 16; no server import appears in browser chunks.

### Task 12 — Build the visual foundation

**Files:** `app/globals.css`, `app/layout.tsx`, `lib/theme.ts`, `public/fonts/*`, `components/ui/*.tsx`.

Replace theme tokens, fonts, spacing, focus treatment, and motion rules. Build the eight specified primitives with native semantics. Root layout supplies only global assets, theme bootstrap, and shared announcements; remove its old pathname-dependent `LayoutShell` wrapper.

**Check:** render Arabic diacritics at all sizes, both themes, reduced motion, keyboard focus, 200% text size, and 400% browser zoom. Source Sans/Amiri fonts load from the same origin without external build requests. Dialog focus returns correctly.

### Task 13 — Build both shells and navigation

**Files:** `app/(main)/layout.tsx`, `app/(focus)/layout.tsx`, `components/shell/*.tsx`.

Implement the desktop rail, mobile bottom navigation, focus header, storage status, skip link, safe-area padding, and active states. Add shell-level error and loading boundaries where needed. Avoid leaving duplicate mains or nested navigation landmarks.

**Check:** at 320, 390, 768, 1024, and 1440px, no horizontal page scroll; keyboard focus is never hidden behind navigation; direct routes show the correct active section.

### Task 14 — Build introduction and setup

**Files:** `app/page.tsx`, `app/(focus)/start/page.tsx`, `components/study/StudyPrompt.tsx` for the nonpersistent example.

Implement Sections 4.3–4.4, returning-user CTA, public reader entry, validated preference save, and first-session creation. No typing animation or sessionStorage seen flag remains.

**Check:** a clean browser can reveal the example without recording activity, start exactly three new entries, and reload with settings retained; returning users see Continue learning; read-only storage failure does not claim setup was saved.

### Task 15 — Build the study interaction

**Files:** `app/(focus)/study/page.tsx`, `components/study/{StudySession,StudyPrompt,RatingControls}.tsx`; remove old `app/study/page.tsx` in the same change to avoid duplicate routes.

Implement introduction/question/answer/saving faces, source-linked context, actual interval previews, scoped shortcuts, pending-save handling, pause, end, and Undo using domain commands only. Add no scheduler logic to JSX.

**Check:** keyboard and touch complete a session; native button Space does not double-trigger; held rating keys cannot advance twice; injected storage failure keeps the same answer; reload and browser back preserve committed progress.

### Task 16 — Build results and Today

**Files:** `components/study/SessionResult.tsx`, `app/(main)/today/page.tsx`, `components/today/TodayView.tsx`.

Implement result counts, context-reading destination, next-due messaging, Today action precedence, recent entries, and seven-day activity. All counts come from shared selectors, never from a second queue builder.

**Check:** fresh, partially studied, active session, large backlog, no-due, no-new, Names-started, and long-absence fixtures produce the exact expected CTA. Ending an ungraded session does not create activity.

### Task 17 — Build Learn and entry detail

**Files:** `app/(main)/learn/page.tsx`, `app/(main)/learn/[id]/page.tsx`, `components/learn/*.tsx`.

Implement filtered/paginated list, URL state, exact occurrence frequency, example display, root relationships, Study next ordering, pause/resume, and mnemonic Save. Route metadata uses sourced information without comprehension promises.

**Check:** filtering and sorting survive reload/back; root siblings retain separate progress; Study next respects the new-entry allowance; notes save and survive reload; invalid IDs return 404; dirty notes warn before route departure.

### Task 18 — Rebuild shared audio

**Files:** `lib/audio.ts`, `components/reader/AudioControls.tsx`, `lib/__tests__/audio.test.ts`.

Retain validated URL-format functions, remove storage coupling, and implement one lazy controller with subscription, cancellation, errors, and source sequence IDs. Connect study and reader controls to it.

**Check:** existing URL tests still describe real supported sources; one recording stops another; route/card/reciter changes stop playback; rejected play and a 12-second stall show Retry; stale callbacks cannot set the new track to playing.

### Task 19 — Build reader and bookmarks

**Files:** `app/(main)/read/page.tsx`, `app/(main)/read/[surah]/[ayah]/page.tsx`, `components/reader/{ReadDirectory,Reader,WordPanel}.tsx`.

Implement canonical token rendering, directory/bookmarks views, reference selectors, previous/next boundaries, word URL state, desktop panel/mobile dialog, translation credit, surrounding context, and external tafsir link. Use server-validated params and bounded content reads.

**Check:** navigate `1:1`, `1:7`→`2:1`, and `114:6`; select/close a word with keyboard; restore a bookmarked reference; render `2:282` without clipping; markers cannot open word details; failed loads do not overwrite last position.

### Task 20 — Build unified search

**Files:** `lib/search/*.ts`, `lib/workers/search.worker.ts`, `components/reader/QuranSearch.tsx`, `lib/search/__tests__/*`.

Move useful existing transliteration logic behind the new interface. Implement Arabic and English ranking and the explicit mode UI, lazy indexes, request invalidation, safe highlighting using plain text ranges, and error handling. Retire `components/search/QuranSearch.tsx` after its callers move.

**Check:** a fixed multilingual fixture includes references, Arabic with/without marks, English multiword queries, and common romanization variants. Query A followed by B/clear/mode-change never restores A's results. No corpus search work runs on the UI thread. Invalid references cause zero content requests.

### Task 21 — Build honest progress reporting

**Files:** `lib/learning/metrics.ts`, its tests, `app/(main)/progress/page.tsx`, `components/progress/ProgressView.tsx`.

Implement familiar counts, event-based activity, Names separation, set-based occurrence overlap, per-surah breakdown, accessible bars/table, and methodology copy. Delete all dependencies on old weights and ranks.

**Check:** a synthetic 10-token corpus with two entries sharing three occurrence keys counts the union once; two surahs with different mapped tokens display different percentages; markers and Names contribute zero; undone reviews disappear from activity; no hardcoded 80% remains in runtime code or metadata.

### Task 22 — Build Names, Settings, and Sources

**Files:** `app/(main)/collections/names/page.tsx`, `components/collections/NamesCollection.tsx`, `app/(main)/settings/page.tsx`, `components/settings/*.tsx`, `app/(main)/sources/page.tsx`; delete old `app/settings/page.tsx` in this same task.

Implement collection browsing and common session creation; all specified settings; staged import/export; recovery/reset dialogs; legacy archive export; source and methodology disclosures. Validated settings changes are saved immediately with visible error handling; mnemonic editing remains explicit-save.

**Check:** Names never enter vocabulary metrics; collection switching respects the one-session rule; import preview can cancel without writes; successful replacement/reset/recovery updates every open view; source links and credits correspond to the pinned manifest.

### Task 23 — Retire old routes and unsafe runtime paths

**Files:** `next.config.ts`; old `app/app`, `app/words`, `app/word`, `app/coverage`, `app/names`, `app/verse`, `app/search`, `app/drill`, `app/quiz`, `app/tadabbur`, `app/mutashabihat`, `app/settings`, `app/api/tafsir`; obsolete components/helpers; `app/sitemap.ts`, `app/robots.ts`.

Add permanent redirects: `/app`→`/today`, `/words`→`/learn`, `/coverage`→`/progress`, `/names`→`/collections/names`, `/verse/:surah/:ayah`→`/read/:surah/:ayah`, `/search`→`/read?mode=transliteration`, and Tadabbur ayah routes to the matching reader route. `/tadabbur` and its surah routes lead to Read and the corresponding first ayah. Generate explicit `/word/<oldId>` redirects from the finite reviewed mapping before the catch-all `/word/:id` redirect to `/learn?notice=legacy-entry`. `/drill`, `/quiz`, and `/mutashabihat` lead to `/learn?notice=retired`. Render a dismissible, accurate notice for those query values.

Remove old route files only when their replacements and redirects exist. Delete unused prayer, quiz, drill, topic, raw-HTML tafsir, root-guessing, coverage-rank, and duplicated scheduler runtime code. Do not delete raw legacy user data or source provenance. Remove old `/settings` when the grouped replacement is created, in that earlier same change, to avoid duplicate routes.

**Check:** a route matrix verifies every old path and reader boundary; unmapped legacy IDs do not become wrong entries. `rg` finds no runtime imports of retired corpora, old coverage weights, direct component storage access, or `dangerouslySetInnerHTML`. Metadata and sitemap reflect the new public routes; personal study/progress/settings routes are noindex.

### Task 24 — Verify persistence in actual browsers

**Files:** `e2e/study.spec.ts`, `e2e/storage.spec.ts`, `e2e/migration.spec.ts`, `e2e/backup.spec.ts`, `playwright.config.ts`.

Replace obsolete behavior assertions with end-user flows. Run Chromium desktop/mobile and WebKit, including two tabs sharing one context. Use deterministic content and clocks; stub external audio so correctness does not depend on a CDN.

**Check:** onboarding→review→reload→resume→finish; same-attempt rapid clicks; concurrent sessions/tabs; import failure atomicity; v1 migration; reset recovery; offline after session creation; blocked storage; midnight/DST. Verify real IndexedDB state, not just success messages.

### Task 25 — Finish accessibility and visual verification

**Files:** `e2e/accessibility.spec.ts`, `e2e/visual.spec.ts`, affected components/CSS.

Capture approved baselines for Today, question/answer study, Learn, reader with word panel, Progress, and Settings in Paper/Night at 390px and 1440px. Test 320px reflow separately. Run axe on normal, empty, error, and dialog states. Complete manual keyboard and one screen-reader pass; automated scores alone do not establish conformance.

**Check:** no critical/serious axe findings; visible, unobscured focus; readable Arabic diacritics; complete controls at 200% text and 400% zoom; accessible chart equivalents; no answer announced before reveal; no focus trap outside an open modal. Target WCAG 2.2 AA. [WCAG reference](https://www.w3.org/WAI/WCAG22/quickref/).

### Task 26 — Fix install metadata, worker, and security

**Files:** `app/manifest.ts`, `public/icons/*`, `public/sw.js`, `public/offline.html`, `components/PWARegister.tsx`, `next.config.ts`, `app/layout.tsx`.

Set start URL to `/today`, use the Paper theme color, remove portrait locking, generate existing-size icon requirements plus maskable icon, and point shortcuts to Today/Learn. Replace the worker with the exact fallback-only behavior and scoped cache cleanup. Apply the CSP and permissions decisions. Register only in production.

**Check:** every manifest asset returns 200; upgrading an existing worker removes old Harf media caches but preserves an unrelated cache; offline navigation shows the honest fallback; production has no eval allowance or obsolete API permission; all required scripts/fonts/audio work without CSP errors.

### Task 27 — Enforce release gates

**Files:** `scripts/check-budgets.ts`, `package.json`, `.github/workflows/ci.yml`, performance/route tests.

Wire CI in order: locked install → source/content validation → type-check → unit tests → production build → browser flows → accessibility checks → bundle/payload budgets. Preserve the existing high-severity dependency audit. Upload Playwright traces/screenshots and content-alignment reports on failure. Measure lab performance against the specified budgets.

**Check:** a clean checkout completes the chain using pinned local content and fonts; a deliberately invalid study answer, broken backup migration, missing icon, or oversized route chunk causes an appropriate gate to fail. Resolve failures rather than increasing thresholds or replacing checked content with placeholders.

## 10. Definition of done

The replacement is complete only when all of the following are true:

- The four-destination experience and every retained screen follow this specification, including narrow phones, keyboard interaction, and Night theme.
- The 300-entry course is built from verified lemma groups and approved occurrence/gloss examples; source permissions and attributions are recorded.
- A new user can reach the first question without an account, finish practice, read a relevant ayah, and return to a correctly scheduled review.
- Every committed rating, its review event, and its session advancement survive reload together. Double actions and multiple tabs do not corrupt progress.
- Existing raw data remains recoverable, mapped progress is preserved conservatively, and the import/export/reset/recovery flows pass their browser checks.
- Word/ayah rendering uses canonical positions; no root-letter guess, English substring guess, marker count, or shared-root duplication affects learning or metrics.
- No screen or metadata says that a vocabulary percentage measures Quran comprehension, and no learner receives a religious rank.
- Retired features are absent from navigation and runtime bundles; old links have defined destinations and honest notices.
- Required text study works after a loaded session loses network access, while cold offline navigation makes no unsupported availability promise.
- Content, type, unit, browser, accessibility, security, and performance checks pass with their evidence recorded.

Do not replace unresolved source permissions or religious-content review with an invented approval. Those are the only external release gates in this plan. The product scope, visual direction, architecture, interaction rules, and implementation order are otherwise decided.
