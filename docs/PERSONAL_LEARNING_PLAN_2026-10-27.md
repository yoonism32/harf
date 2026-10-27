# Harf: personal understanding and reflection plan

Proposed 27 October 2026. This is a proposal, not a shipped-feature checklist.

## Outcome

Hear a selected Quran passage, follow its wording and meaning, consult its context and tafsir, and retain personal reflections inside Harf. Vocabulary familiarity, listening self-assessment and reflection remain separate concepts.

## Baseline inspected

Local HEAD and the locally cached origin/main both point to `18fc7b5`. No remote fetch was performed. Recent commits include Mushaf compilation, Reading mode, the bottom audio toolbar, loops and reader tests. Further reader/audio/navigation changes are uncommitted; preserve them.

The app already has FSRS vocabulary study, source-backed word analysis, root browsing, reading, translation, tafsir, bookmarks, vocabulary notes, listening location recall and similar-passage practice. The October 1 roadmap understates the current product; use the October 24–26 progress document for more recent history, then verify each outstanding item against code.

The inspected listening activity asks for a surah/ayah reference. This exercises location recognition, not directly the owner's desired ability to understand what was heard. Vocabulary notes are currently attached to entries; the reader has no comparable personal reflection workflow.

## Build order

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

Reflection is a separate slice: saveNote currently rejects colon-separated ayah IDs, and resetProgress clears notes and bookmarks. Resolve note identity and explicit reset-safety semantics before adding reflections. Replacement imports must clearly describe their effect on reflections. Check ID validation, imports, exports, deletion and account sync for the chosen keys. Preserve draft recovery and save-failure handling. Avoid adding a new journal subsystem.

Acceptance: note survives reload, backup/restore and supported account sync; switching ayahs cannot overwrite another note; errors preserve the draft. Never grade reflection or label it authoritative tafsir.

### 4. Resume a personal passage from Today

Today already resumes lastVerse through Continue reading and offers RevisitEntry. Extend those only after the first three steps prove useful. A new synced range meta key requires a server RPC allowlist migration; do not silently add it as though lastVerse already supports ranges. Offer previously difficult ayahs for another attempt. Keep these separate from due vocabulary and from similar-passage comparison cards.

Start with manual revisit; introduce passage scheduling only if repeated personal use demonstrates a need. Avoid a combined “Quran comprehension percentage”.

### 5. Teach a few useful language patterns

Use difficulties collected during passage study to select a small, source-reviewed set of examples for pronoun suffixes, negation, connectors and common verb forms. Explain what each does in its actual ayah. Reuse morphology only with its source permission and editorial status accounted for: several retained datasets still have pending permission records. Do not assume a morphological tag alone supplies sentence interpretation. Defer a general grammar course and automatically generated exercises.

## Existing obligations

Before extending saved similar-passage practice, resolve its unfinished queue and persistence flow. The current practice page still calls `getPracticePairs()` with its default limit, and grading reads the live saved revision. Recheck the documented save/navigation race, account migration and missing due entry point together. These are maintenance of an existing feature, not prerequisites for a non-persistent listening prototype.

For any new persistent feature, verify failed saves, reload and backup round-trip as part of delivery; verify account sync where the feature promises it. Do not claim old test results certify today's dirty working tree.

## Personal evaluation

Try the first slice with one personally relevant short passage for a week. After a delay, listen without the translation and explain the meaning, then compare with the source. Record whether the obstacle was a word, a language construction or missing context. Use those observations to choose the next feature; a week's experience guides this personal app but is not a scientific efficacy study.

Practice testing and distributed practice have strong general support in [Dunlosky et al. (2013)](https://pubmed.ncbi.nlm.nih.gov/26173288/). The proposed Quran-specific workflow is a product hypothesis, not a method directly validated by that review. Keep optional mnemonic notes; defer memory-palace tooling, streak mechanics and another scheduler.

## First implementation boundary

Ship step 1 plus the existing-course “Study next” shortcut from step 2. Evaluate it before building notes, new progress records or curriculum expansion. No framework rewrite, new hosting service or dependency is needed for this first slice. Quran.com can inform individual interaction patterns; inspect the exact repository and asset licenses before reusing code or content, rather than assuming all related projects share one license.

## First slice implemented, 27 October

- Reader entry point opens a separate listening-for-meaning exercise, with optional Arabic hint, explicit translation reveal, word exploration, visit-only self-assessment and hide/retry.
- Optional sequence of up to ten ayahs in the same surah; each is practised separately. Return link preserves the reader URL, mode and page.
- Shared word action in both reader modes and the exercise: prioritize an unintroduced course entry; display existing-card status without changing its schedule; bookmark the ayah for outside-course words.
- No new persistent records, word bookmarks, reflection storage, sync keys or scheduling rules. No timestamp-based range playback.
- Verification uses npm run typecheck, npm test, npm run build:app and targeted Playwright reader/listening/study checks. Build does not regenerate content or claim editorial approval.
- Results: TypeScript and production application build passed; 131 unit tests passed. All 12 new browser checks passed across Chromium, Mobile Chrome and WebKit, including automated accessibility, hidden answers, return navigation, bookmark/priority persistence and failed-save retry. The existing reader/revamp checks contributed 46 passes and two existing skips. A broad alert locator was narrowed after it also matched Next.js's route announcer; study playback now appears after content loads, avoiding an early interaction during initialization. No live account-sync or real-recording audition was performed.
