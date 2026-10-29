# Harf: personal understanding and reflection plan

Proposed 27 October 2026. Implementation and documentation reviewed 29 October; see [the docs index](README.md) and [current roadmap](ROADMAP.md). This is an implemented work record, not the main backlog.

## Outcome

Hear a selected Quran passage, follow its wording and meaning, consult its context and tafsir, and retain personal reflections inside Harf. Vocabulary familiarity, listening self-assessment and reflection remain separate concepts.

## Current implementation status — updated 29 October

1. **Slice 1 — passage study: complete.** The reader opens a separate listening-for-meaning exercise with an
   optional ten-ayah same-surah sequence, hints, reveal, word inspection, visit-only self-assessment and a safe
   return to the reader. It does not alter vocabulary scheduling.
2. **Slice 2 — reader discoveries feed vocabulary: complete at the planned boundary.** Both reader modes and the
   passage exercise show existing course status and can queue an unintroduced course word for normal study. Words
   outside the 300-entry course bookmark their ayah instead. Expanding the course remains deliberately deferred
   until actual blocking words have been observed.
3. **Slice 3 — reflection beside the ayah: complete locally.** Both reader modes render an ayah reflection using
   a safe notes-store identity, retained unsaved drafts and revision-checked writes. It therefore participates in
   existing backup/import and account-sync mechanisms without a new schema or RPC key. A real signed-in sync
   round trip against the live service has not been performed. Backup replacement and the account protocol are
   covered by automated tests, including a disposable PostgreSQL migration check.
4. **Saved-passage maintenance: complete locally.** Due saved pairs have their own ordered queue and Today entry
   point; the comparison browser is no longer capped at 12; review attempts capture their starting revision;
   navigation cannot race a save; and unavailable source pairs remain visible with retained progress. Account
   passage migration was applied to live Harf on 29 October; real signed-in browser verification is tracked separately.
5. **Slice 4 — saved passage and difficult-ayah revisit: implemented.** Today resumes an explicitly saved
   same-surah range and current ayah. Saved assessments record the latest feedback and obstacle for up to 200 ayahs;
   Today offers difficult ayahs for manual revisit. No new scheduler or comprehension percentage.
6. **Slice 5 — useful language patterns: implemented as a curated starting set.** Four examples in 1:5, 1:7 and
   112:3 cover pronoun suffixes, connectors, first-person plural verbs and negation. Explanations appear after reveal
   beside the actual ayah, with inspectable pinned Corpus morphology. These authored teaching notes are not an
   independent scholarly certification. Saved obstacles and reflections guide future additions.

### Current source and review gates

`data/sources.json` records seven externally verified and seven owner-approved pinned inputs. The verified core is
QUL Arabic script, word glosses, transliteration, Hilali/Khan translation, lemmas, roots and Ibn Kathir commentary.
Owner-approved records cover the selected 99 Names, retained Quranic Arabic Corpus morphology and Quran.com word
exports, QuranWBW morphology notes, and QPC V2 Mushaf glyph/layout/font assets. The owner also approved the current
300 vocabulary entries and 99 Names for Harf release on 28 October. See `docs/CONTENT_SOURCES.md` and the source
registry for the file-level record; owner approval remains distinct from independent editorial certification.

## Historical baseline inspected — 27 October

Local HEAD and the locally cached origin/main both point to `18fc7b5`. No remote fetch was performed. Recent commits include Mushaf compilation, Reading mode, the bottom audio toolbar, loops and reader tests. Further reader/audio/navigation changes are uncommitted; preserve them.

The app already has FSRS vocabulary study, source-backed word analysis, root browsing, reading, translation, tafsir, bookmarks, vocabulary notes, listening location recall and similar-passage practice. The October 1 roadmap understates the current product; use the October 24–26 progress document for more recent history, then verify each outstanding item against code.

The inspected listening activity asks for a surah/ayah reference. This exercises location recognition, not directly the owner's desired ability to understand what was heard. Vocabulary notes are currently attached to entries; the reader has no comparable personal reflection workflow.

## Original build order and acceptance criteria

All five slices below have since been implemented at the boundaries recorded above. Imperative wording preserves the original proposal; it is not a fresh instruction to rebuild shipped features.

### 1. One passage, one complete study flow

Add a “Study this passage” action to the reader. Begin with a selected ayah and an optional short range within its surah. Keep the ordinary reader available.

1. Listen with Arabic and translation initially hidden, with a text hint available.
2. Attempt the meaning mentally or in an optional short draft.
3. Reveal Arabic and the existing translation; inspect unfamiliar words.
4. Mark “understood”, “partly understood”, or “need another look” as personal feedback, not an automatically validated score.
5. Replay with the text hidden, or return to the reader in the same place.

Reuse existing ayah playback and content loaders. Preserve “identify the ayah” as a separate activity. Do not alter vocabulary FSRS scheduling from this self-assessment. Do not introduce timestamp-based playback ranges or AI grading.

Acceptance: complete the flow from a reader ayah on desktop and mobile; hints/reveal do not lose the selected passage; missing audio allows a text fallback; navigation cancels stale playback. An accessible hidden-answer state must not leak answers through labels. First version needs no new scheduling engine.

### 2. Make reader discoveries feed vocabulary study

Show the selected word's existing course status and “Study next” directly in its panel, reusing entry prioritization and current daily limits. Preserve its exact occurrence and contextual meaning. For words outside the 300-entry course, offer an existing ayah bookmark rather than a new word-position bookmark, course card or guessed root mapping.

Acceptance: actions behave consistently in both reader modes; existing cards are not duplicated or reset; a queued entry is reachable through the normal study flow. Revisit expansion beyond the current course only after observing which missing words repeatedly block the owner.

### 3. Reflection beside the ayah

Add an ayah-linked personal note beside translation and tafsir. Start with one free-text note, optionally prompted by “What did I understand?” and “What do I still need to look up?”. Keep personal writing visibly distinct from sourced commentary. Show surrounding ayahs and existing related-passage links without requiring the learner to abandon the selected verse.

Historical constraint resolved by the implemented safe note identity and reflection command: saveNote rejects colon-separated ayah IDs, and resetProgress clears notes and bookmarks. Resolve note identity and explicit reset-safety semantics before adding reflections. Replacement imports must clearly describe their effect on reflections. Check ID validation, imports, exports, deletion and account sync for the chosen keys. Preserve draft recovery and save-failure handling. Avoid adding a new journal subsystem.

Acceptance: note survives reload, backup/restore and supported account sync; switching ayahs cannot overwrite another note; errors preserve the draft. Never grade reflection or label it authoritative tafsir.

### 4. Resume a personal passage from Today

Today already resumes lastVerse through Continue reading and offers RevisitEntry. Extend those only after the first three steps prove useful. A new synced range meta key requires a server RPC allowlist migration; do not silently add it as though lastVerse already supports ranges. Offer previously difficult ayahs for another attempt. Keep these separate from due vocabulary and from similar-passage comparison cards.

Start with manual revisit; introduce passage scheduling only if repeated personal use demonstrates a need. Avoid a combined “Quran comprehension percentage”.

### 5. Teach a few useful language patterns

Use difficulties collected during passage study to select a small, source-reviewed set of examples for pronoun suffixes, negation, connectors and common verb forms. Explain what each does in its actual ayah. Reuse morphology with its recorded source and owner approval accounted for (the pending release gates were resolved on 28 October). Do not assume a morphological tag alone supplies sentence interpretation. Defer a general grammar course and automatically generated exercises.

## Existing obligations

The local saved-passage queue and persistence work described in the original proposal is now resolved: all eligible
pairs can be browsed, due pairs are ordered separately, Today links to them only when due, and review attempts keep
their original revision while a save is in flight. Migration `20261029005835_passage_learning.sql` supplies the passage
collections and preference allowlist. Disposable PostgreSQL checks cover two accounts, conflicts, reflection round trips,
tombstones and access restrictions. The migration was subsequently applied live on 29 October and passed rolled-back synthetic account tests.
A real signed-in browser round trip remains separate from the SQL protocol evidence.

For any new persistent feature, verify failed saves, reload and backup round-trip as part of delivery; verify account sync where the feature promises it. Do not claim old test results certify today's dirty working tree.

## Personal evaluation

Try the first slice with one personally relevant short passage for a week. After a delay, listen without the translation and explain the meaning, then compare with the source. Record whether the obstacle was a word, a language construction or missing context. Use those observations to choose the next feature; a week's experience guides this personal app but is not a scientific efficacy study.

Practice testing and distributed practice have strong general support in [Dunlosky et al. (2013)](https://pubmed.ncbi.nlm.nih.gov/26173288/). The proposed Quran-specific workflow is a product hypothesis, not a method directly validated by that review. Keep optional mnemonic notes; defer memory-palace tooling, streak mechanics and another scheduler.

## Historical first implementation boundary

Ship step 1 plus the existing-course “Study next” shortcut from step 2. Evaluate it before building notes, new progress records or curriculum expansion. No framework rewrite, new hosting service or dependency is needed for this first slice. Quran.com can inform individual interaction patterns; inspect the exact repository and asset licenses before reusing code or content, rather than assuming all related projects share one license.

## First slice implemented, 27 October

- Reader entry point opens a separate listening-for-meaning exercise, with optional Arabic hint, explicit translation reveal, word exploration, visit-only self-assessment and hide/retry.
- Optional sequence of up to ten ayahs in the same surah; each is practised separately. Return link preserves the reader URL, mode and page.
- Shared word action in both reader modes and the exercise: prioritize an unintroduced course entry; display existing-card status without changing its schedule; bookmark the ayah for outside-course words.
- No new persistent records, word bookmarks, reflection storage, sync keys or scheduling rules. No timestamp-based range playback.
- Verification uses npm run typecheck, npm test, npm run build:app and targeted Playwright reader/listening/study checks. Build does not regenerate content or claim editorial approval.
- Results: TypeScript and production application build passed; 131 unit tests passed. All 12 new browser checks passed across Chromium, Mobile Chrome and WebKit, including automated accessibility, hidden answers, return navigation, bookmark/priority persistence and failed-save retry. The existing reader/revamp checks contributed 46 passes and two existing skips. A broad alert locator was narrowed after it also matched Next.js's route announcer; study playback now appears after content loads, avoiding an early interaction during initialization. No live account-sync or real-recording audition was performed.

## Follow-on maintenance slice implemented, 28 October

- Saved similar-passage cards now have a separate due queue, ordered by due time, with a conditional Today entry
  point. The comparison browser exposes all eligible source pairs, not only the first 12.
- A recall attempt captures its card revision when it begins. The review UI prevents navigation during a save, and
  unavailable source pairs remain visible with their saved progress.
- This is local persistence work only. The later migration is now in the repository and locally tested; live deployment and signed-in verification remain open.

## Slice 4 manual revisit implemented, 28 October

Historical initial boundary; the final implementation below extends this slice.

- Today offers “Study this ayah again” beside the last-read ayah, using the existing passage exercise.
- The exercise returns directly to Today; reader entry points still return to their original reader location.
- No new persistent data or sync keys. Difficulty feedback remains tab-only; saved ranges and scheduling remain deferred.
- Verification: TypeScript, 138 unit tests and three browser checks (Chromium, Mobile Chrome and WebKit) passed.
  Browser coverage checks the remembered ayah after reload, passage navigation and return to Today.

## Remaining learning slices implemented, 28–29 October

- Passage practice includes an optional tab-retained attempt at the meaning, saved reflection and local tafsir after reveal.
- Save a range of up to ten ayahs and the current ayah, then resume it from Today. Saving again explicitly updates
  the place; removing the saved range keeps reflections and assessments.
- Save personal feedback and an obstacle (word, construction, context or none). Today lists difficult ayahs. Each ayah
  keeps its latest assessment; the most recent 200 are retained.
- `passageLearning` metadata uses transactional writes, revision bumps, per-ayah stale-write checks, backup validation
  and existing explicit account conflict resolution. Failed saves retain inputs. Resetting scheduled learning retains
  personal passage data, as it retains reflections; replacement imports replace it.
- Four authored language examples are anchored to canonical word keys and tested against pinned morphology features.
  Translation and tafsir remain available for context; tags alone are not sentence interpretation.
- Deferred ideas remain deferred: course expansion based on blocking words, a general grammar course, generated exercises,
  passage scheduling, streaks and memory-palace tooling. The owner's week of evaluation is a real-use activity.
- Verification: production application build, TypeScript, 143 unit tests, six new browser checks across Chromium,
  Mobile Chrome and WebKit, and 12 existing passage-study checks passed. The new browser checks include automated
  accessibility. Isolated PostgreSQL checks passed; no live account service was changed or certified.
