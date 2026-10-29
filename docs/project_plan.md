
Project plan

Read files, ran commands
Recommended direction: make Harf a coherent personal study workspace around passages the learner has chosen. The strongest improvement is helping someone move from “this ayah stopped me” to “I practised the relevant words, returned to the ayah and can explain what changed.” Harf already contains nearly all the primitives; the opportunity is composition and retrieval, not another scheduler or broad feature catalogue.

I inspected the current source and traversed Graphify from components/practice/PassageStudy.tsx and scripts/build-content.ts. The graph is current at 72346a3, with 1,839 nodes and 3,946 edges. I applied MyAgency’s agents/researcher.md and specialists/arabic-text.md. These are code-grounded opportunities, not observed defects, user-trial findings, or claims of pedagogical effectiveness.

Whole-project coverage
Area	Current evidence	Planning judgment
Vocabulary scheduling	lib/learning/queue.ts:26: due first, bounded daily introductions, explicit priorities. components/learning/start.ts:5: examples already rotate by reps % examples.length.	Preserve scheduler and rotation. Improve selection context and explanation, not scheduling mathematics.
Passage learning	lib/learning/passage-learning.ts:11: one range; latest assessment/obstacle for up to 200 ayahs.	Build retrieval and follow-through around existing records. Do not relabel the completed PLP as unfinished.
Reader/search	app/(main)/read/page.tsx: surah directory and bookmark view. Word inspection, contextual links and tolerant search already exist.	Add personal retrieval; keep Quran search/source text separate from private notes.
Practice	lib/practice/questions.ts:39: deterministic seeded sampling across the eligible catalog; root/meaning answers do not touch FSRS.	Add explicit learner-selected pools and contextual practice, keeping independent practice separate from due review.
Grammar/root families	components/reader/RootFamily.tsx: full source-backed occurrences including outside-course words. Four authored examples in lib/learning/language-patterns.ts.	Use these for carefully reviewed comparisons; do not infer sentence interpretation from morphology or offer a generated grammar course.
Content/compiler	scripts/build-content.ts:121–136: 300 frequency-selected groups, overrides and approvals; stable IDs/source IDs; structural reports and hashes.	Add semantic review tooling for future editorial changes, not another source refresh.
Notes/bookmarks	Existing independent stores and ayah-… reflection identifiers.	Highest-value first step: make existing saved work findable together.
Persistence/sync/backup	lib/account/records.ts:5–6: explicit cloud stores/meta; lib/account/sync.ts handles conflicts; backup/import are already established.	Preserve boundaries. New records require the complete persistence contract, not local-only feature delivery.
Progress	lib/learning/metrics.ts: undone-aware review activity and canonical occurrence overlap.	Make explanations and next actions clearer; do not add “Quran comprehension”, streak pressure or religious ranking.
Names	Separate collection and scheduler policy.	Maintain as optional separate study. No new audio or curriculum requirement in this plan.
Prayer/Daily Ayah/audio	Existing support functions and provider boundaries.	Maintain and ensure new journeys reuse controls. Do not make prayer times or Daily Ayah part of scored learning progress.
Authentication/operations	Personal-use registration policy, isolated guest/account data, release checks.	Maintain current policy. No public launch, payments, analytics platform or auth rewrite proposed.
Architecture	Graph hubs include store, content reader and command functions.	Add a few pure domain selectors where the new journey needs them; avoid a global rewrite or architectural layer for every component.
Prioritized opportunities
1. Personal study library — recommended first release
Existing: Bookmarks are listed only by ayah in app/(main)/read/page.tsx; reflections are opened beside their ayah; difficult assessments appear separately in components/today/PassageRevisit.tsx. There is no unified personal retrieval surface in these routes.

Proposal: A “Saved study” view that derives items from current bookmarks, ayah reflections and passage assessments. Show reference, a short reflection excerpt where present, latest obstacle, and the right return action. Filters: all, reflections, revisit, bookmarks; local text search of personal reflections. One ayah appears once with multiple indicators.

Smallest implementation:

New pure selector, e.g. lib/learning/saved-study.ts, consuming DataSnapshot.
Extend the reader directory or a /read/saved route; do not add another main navigation destination initially.
Reuse ExploreLink/QuickReturn, existing reflection commands and PassageStudy links.
No storage/schema change in the first release. Do not create folders, tags or duplicate saved-record models.
Acceptance: A reflection saved in the reader is discoverable after reload and cloud download; deleting a bookmark preserves the reflection; undone reviews do not alter library membership; orphaned/unavailable content is explained and private text remains searchable/exportable.

Stop gate: If this view cannot reduce the number of places the owner checks to find a saved thought, do not add tagging or collections to compensate. Rework the information model.

Risk/size: Low–medium; approximately one independently releasable UI/domain slice.

2. Passage-focused preparation using the existing course
Existing: WordStudyAction.tsx:20 can prioritize an individual course entry; queue.ts already consumes meta.priorityEntries. Outside-course words can only bookmark their ayah. Saved ranges already have canonical references.

Proposal: From a chosen range, show the distinct current-course entries encountered there, grouped as familiar, already scheduled and new. Let the learner explicitly choose new entries to prioritize before returning to the passage. Explain that due reviews and daily limits still apply.

Smallest implementation:

Derive eligible entries from range tokens’ canonical entryIds; deduplicate by entry ID.
Pure selection in a small domain function; UI near the saved-passage study header.
Use existing priority command/queue and unchanged FSRS.
Preserve origin through the existing return-link system so session completion offers the chosen passage.
Range may be URL/session context initially; durable focus context needs a separately specified persisted field if actual use requires it.
Acceptance: A ten-ayah range containing the same entry repeatedly queues it once; due cards retain precedence; daily allowance remains bounded across repeated sessions; unavailable/outside-course words are clearly excluded; user returns to the exact selected range.

Stop gate: If the owner gets no benefit from preparing three relevant existing entries before rereading, stop before expanding the catalog.

Risk/size: Medium; dependencies are existing library/range selectors, not new source approval or course content.

3. Focused practice that tests transfer, not just catalog recall
Existing: Word/root practice randomly samples eligible catalog entries; spaced sessions already rotate examples. Simply adding another context rotation would be redundant.

Proposal: Add explicit practice pools: current passage, a selection from saved study, or chosen familiar course entries. A bounded session should ask about the target word in its sourced ayah, then reveal its exact contextual gloss and provide a comparison with a second approved example when available.

Boundaries:

Reuse the current deterministic generator in lib/practice/questions.ts with an explicit eligible pool.
Keep practice outcomes separate from FSRS. A “review this entry” action is explicit, not an automatic penalty.
First version can keep a small session summary without recording a new permanent attempt history.
Do not generate distractors from unrelated roots and call them semantic equivalents; use approved content or choose a recall/reveal format.
Acceptance: Same seed/pool produces the same bounded session; no target repeats until the pool is exhausted; fewer-than-four eligible options has an honest fallback; selected occurrence, gloss, audio and reveal remain aligned; session never schedules or unschedules a card.

Stop gate: If examples only test memorisation of a stored English label, retain the existing practice rather than branding it comprehension training.

Risk/size: Medium; ship after passage preparation. Requires a clear question format decision, not a new learning algorithm.

4. Explainable progress and next actions
Existing: Today assembles queue information inline; Progress shows aggregate familiarity/activity/overlap. Review events already contain before, after, grade, local date and undo status. Passage records retain only the latest assessment, not a historical series.

Proposal: Make existing evidence usable:

“Why this is next”: due review versus selected passage priority versus course order.
Entry review history using recorded review events.
“What changed this week”: entries introduced/reviewed and links back to selected study material.
A deliberate “revisit this passage” action when relevant familiar entries were practised.
Architecture: Pure selectors shared by Today, Progress and entry detail; use existing metrics and queue rules. No new streak system, comprehension percentage or retroactively fabricated passage history.

Acceptance: Counts reconcile with review records including Undo, timezone/local-date behaviour and collection separation; displayed queue explanations match actual queue selection; absence of historical assessment data is never presented as improvement.

Stop gate: If the screen becomes a dashboard to inspect rather than a clear explanation with one useful action, reduce it.

Risk/size: Medium. Can run in parallel with focused-practice design after shared selectors are settled.

5. A reviewable editorial workflow for future learning depth
Existing: Compiler outputs have hashes and provenance; course-overrides.json can select up to three examples and carries approvals; four language examples are authored in code. Hashes detect byte differences but do not provide a reviewer-friendly explanation of linguistic changes.

Proposal: A semantic content change report for proposed input/override changes:

Added/removed/re-keyed entries and occurrences.
Changes to Arabic surface, lemma/root assignment, representative example, gloss, translation/footnote and source IDs.
Human-readable affected examples with before/after source citations.
Explicit approval applicability: a previously approved bundle does not silently certify newly authored explanations or changed examples.
Start with a script/report, not an admin application. Retain determinism and source text exactly.

Dependencies: Compiler and content schema; a defined approved-baseline manifest. No runtime app changes required for the first report.

Acceptance: Rebuilding unchanged inputs produces no semantic changes; an intentionally changed gloss/exemplar is shown at the precise canonical location; reordered JSON alone produces no false semantic change; split-phrase scope and Unicode are preserved; unresolved ID replacement never remaps progress automatically.

Stop gate: Only build a UI/editor after the report proves useful in an actual content review.

Risk/size: Medium–high but isolated. This is the enabling infrastructure for carefully chosen future depth.

6. Reviewed language comparisons and demand-led catalog growth — conditional second horizon
Existing: Root families contain source occurrences beyond the course; only four reviewed teaching notes exist; WordStudyAction loses the exact outside-course word of interest because its save action is an ayah bookmark.

Proposal, only after the first release has real use:

Preserve explicit “I want to study this word” interest at the canonical word position, separately from enrollment.
Review accumulated interests to choose a small content pack, rather than broadly raising .slice(0,300).
Add a handful of reviewed contrastive language examples: what two forms share and what changes in these specific contexts.
Use the semantic report from phase 5 and explicit per-pack editorial approval.
Persistence: Exact-word interest is genuinely new data. Specify schemas, stable IDs, mutation commands, backup handling, account record/SQL allowlists, migration and conflict semantics together. Do not hide it inside reflection text or pretend existing bookmarks capture it.

Acceptance: Saved interest retains the precise word and source version; approved addition retains old entry IDs/progress; no inference from root letters; teaching notes cite exact evidence and distinguish morphology from interpretation; refusal/unreviewed status remains visible.

Stop gate: No expansion without repeated real learner demand and editorial capacity. No generated tafsir or machine-certified Arabic explanations.

Risk/size: High; not in the first-release commitment.

Recommended build order and commit boundaries
Derived saved-study library, no migration.
Passage vocabulary preview and explicit prioritisation, unchanged due-first scheduling.
Return-to-passage handoff + focused practice pool, separate commit from permanent data.
Explainable queue/history selectors and views, based on actual existing events.
Semantic content report and approval contract, independently releasable developer tooling.
Conditional new exact-word interests/reviewed content packs only after trial evidence.
A good first milestone is not “all six shipped”: it is one complete loop—find a saved passage, prepare a few relevant entries, practise, and return without losing place—with a single coherent saved-study surface. Agree this milestone first, then run an owner trial before expanding.

Ideas to reject or keep out
Another scheduler for passage assessments; current assessment records are personal feedback.
A global “understanding score” derived from vocabulary overlap.
Rebuilding the 300-entry course just to make the catalog bigger.
An AI teacher or automated religious interpretation.
Automatic guest import or silent cloud conflict merging.
New top-level screens for every data type.
Microservices, a generic event bus, global state-library replacement or a new database.
Repeating already delivered example rotation, notes, grammar/root browsing, sync or persistence checks as “new features”.
Lighthouse/performance work, auth-policy changes, Names audio, prayer changes, public signup, payments and generic analytics in this plan.
No files changed and no implementation or fresh runtime certification performed. The proposals require product decisions and real-use validation; graph connectivity demonstrates dependencies, not learner value.

---

# Expert addendum — the contracts that make this plan S-tier

*Added 29 October 2026. This section is additive: it keeps every recommendation above. It is still code-first; no Lighthouse, launch, pricing, analytics-platform or auth-policy work is reopened. The original audit recorded no code changes; a separate `/read` search-input fix is now in the working tree, and the Graphify snapshot at `72346a3` predates it. Regenerate the graph before using its edges for line-level decisions.*

## 1. Add one shared spine: `StudyThread`, derived and disposable

The first three slices currently meet only through links. Add one pure view model so the saved-study surface, passage preview and practice pool cannot drift into three different definitions of "what I saved". Do not persist it and do not add a store.

```ts
type StudyThread = {
  kind: 'ayah' | 'passage';
  ref: string;                 // canonical surah:ayah
  range?: PassageRange;        // passage thread only
  bookmark?: Bookmark;         // ayah threads
  reflection?: Note;           // ayah threads; valid ayah-reflection id only
  assessments: Assessment[];   // 0/1 for an ayah, 0..n inside a passage
  signals: {
    bookmarked: boolean;
    reflected: boolean;
    needsRevisit: boolean;     // any assessment !== 'Understood'
    needsRevisitCount: number;
  };
  lastActivityAt?: string;     // absent when only an undated saved range exists
  reflectionExcerpt?: string;  // max 160 chars, whitespace-collapsed, text only
};

// Built only when a thread is opened or previewed; requires ayah content.
type StudyThreadDetail = StudyThread & {
  entryIds: string[];
  prepared: boolean;           // intersects meta.priorityEntries; a global signal, not proof for this passage
  practisedAt: string | null;  // latest relevant non-undone review
};
```

Rules:

- One ayah appears once. Merge bookmark, reflection and assessment by canonical ref; indicators replace duplicate rows.
- A saved range is one passage thread, not ten ayah rows. An ayah inside it may still appear as its own ayah thread with an "in saved passage" indicator when it was separately saved.
- `lastActivityAt` is the maximum of the capture timestamps that exist: bookmark `createdAt`, note `updatedAt` and assessment `updatedAt` (for a passage, the latest assessment in the range). If only an undated saved range exists, leave it undefined: do not use `Date.now()` or a content-load time. Sort undated threads after dated threads, then by canonical ref, so ordering is deterministic.
- Keep practice signals out of the list model. `practisedAt` comes from non-undone review events for relevant entries and requires content mapping; compute it only in `StudyThreadDetail`, and do not use it to sort the list unless a real entry-to-ayah index exists. Do not infer practice from content reads or navigation, and do not invent a "returned" state: we do not record it, so it would be fabricated evidence.
- Do not compute entry IDs for every row in the library list. Load ayah tokens only when a passage thread is opened or previewed, and cache by ref. This avoids N+1 content reads and keeps list rendering independent of the content service.
- The selector takes `DataSnapshot` (plus catalog only for an opened passage), an injected `now`, and returns plain data. It must not import `useHarfStore`, `getDB`, `fetch`, or any command, and it must never write.
- If the library and passage preview need different shapes, derive both from this model. Do not create a second membership implementation.

This is the smallest architectural addition that turns three features into one product idea.

## 2. Resolve the note-store ambiguity before writing the selector

`notes` is two datasets in one store:

- ayah reflections: `reflectionId(reference)` produces `ayah-<surah>-<ayah>` and `saveReflection` writes them;
- vocabulary memory notes: `components/learning/WordDetail.tsx` calls `saveNote(entryId, text)` with a course entry ID.

A selector that treats every note as an ayah reflection will ship vocabulary mnemonics as Quran reflections. Therefore:

- include a note only when its ID matches the ayah-reflection pattern and the decoded reference passes `parseRef`;
- exclude vocabulary notes from the ayah library in release 1; a later word-notes surface can reuse them without changing this contract;
- add an `isReflectionId` helper next to `reflectionId` so UI, selectors and tests share one parser;
- treat empty or whitespace-only reflection text as "no reflection" for membership, but do not delete the note record;
- add a fixture containing both note kinds and an invalid ID; this is the cheapest guard against the most likely data bug.

Membership and indicators:

| Source | Key | Include when | Indicator |
|---|---|---|---|
| Bookmark | `bookmarks`, key `surah:ayah` | Always | Bookmarked |
| Ayah reflection | `notes`, id `ayah-...` | Valid ref and non-empty text | Reflection |
| Assessment | `meta.passageLearning.assessments` | Always; `needsRevisit` only when not `Understood` | Assessment label + obstacle |
| Saved range | `meta.passageLearning.range` | Always, as one passage thread | Resume at ayah `current` |

Rules:

- Counts are unique threads, not raw records. Filters operate on threads; indicators show why a thread is present.
- Orphaned or unavailable references stay visible as "Unavailable in this content version", with their ref and reflection excerpt. Never silently drop the learner's text because the content build changed.
- `Understood` is saved data, not a problem. Keep it out of the default "Needs another look" filter, matching `PassageRevisit`; optionally expose a separate "Assessed" filter. Do not present success as unresolved work.
- Deletion semantics must be explicit: removing a bookmark leaves the reflection; clearing a reflection leaves the bookmark; removing the saved range leaves assessments; `resetProgress` clears cards, reviews, sessions, passage cards/reviews and `priorityEntries` but keeps notes, bookmarks and `passageLearning`. Test all four, including the fact that the `prepared` signal disappears after reset.

## 3. First-release data contract: no schema change, but a real contract

- The view is read-only. It must not call `saveNote`, `toggleBookmark`, `savePassageLearning` or `prioritizeEntry` while rendering. Mutations stay in the reader, study or practice surface that owns the interaction.
- Guest and account use the same selector. `notes`, `bookmarks` and `passageLearning` already participate in sync (`cloudStores` and `cloudMeta`); do not add derived data to either list, to IndexedDB, or to the backup schema.
- Offline: render from the `useHarfStore()` snapshot. A sync or network failure must not blank the library. If `store.status === 'unavailable'`, reuse the existing error and export path rather than inventing a second recovery UI.
- Conflict: cloud sync is all-or-nothing per device/cloud through `harf_sync_v3`. The library must never attempt to merge. After the learner chooses cloud/device in Profile, re-render from the refreshed snapshot. Test both choices.
- Backup/import: the current `backupSchema` already carries notes, bookmarks and `meta.passageLearning`; add no fields. A round trip must preserve membership, excerpts and orphan refs, and duplicate IDs must still reject. Exercise the multipart path if the data crosses the part limit.
- Content version: notes and bookmarks store references, not content versions. Never remap an ayah because a content build changed; show it as unavailable instead.
- Privacy: reflections are personal. Render them as text, never HTML; keep them out of URLs, logs and third-party requests. Unsaved drafts remain per-tab `sessionStorage`; the library reads saved notes only.
- Scale: the schema allows up to 100,000 notes, 6,236 bookmarks and 2,000,000 reviews. Build the thread list once per snapshot with `useMemo`; pre-index reviews by entry/ref instead of scanning all reviews per keystroke. Search personal text with a debounced local filter and a visible result cap. Do not add a full-text index, server call or new dependency for the first release.

## 4. Continuity protocol: the loop is only as good as the return

The existing primitives are close, but two protocols coexist:

- `ExploreLink`/`QuickReturn` use `returnTo`, validated by `safeReturn` (internal route allowlist, max 6,000 chars, no backslashes or newlines).
- `PassageStudyLink` and `PassageRevisit` use `back` (and `resume=1`) for the passage-study completion destination.

Make that distinction explicit and test it:

- `returnTo` is for read/learn/practice/insights routes. Any new route must be added to `safeReturn`'s allowlist and covered by a test.
- `back` is the passage-study exit. `resume=1` restores the saved range. Do not mix `back` and `returnTo` on one link without a documented precedence.
- Carry the origin through every transition, not just the first. Concrete dependency to close: `answerHref()` and `nextRoundHref()` in `components/practice/PracticeHub.tsx` rebuild practice URLs from only `mode`, `seed`, `round` and `answer`, so answering a round drops `returnTo`; `StartPractice` also drops it. Extend those builders or pass an explicit origin, then assert: entry → practice → answer → next round → end practice → back to the source.
- Preserve `?word=` through the reader; preserve the passage's current ayah through resume; preserve the library's filter and search through a reader round-trip. One browser-back action should be enough.
- Use replace for filter changes and push for real navigation. Do not create history entries for every filter keystroke.
- Restore focus to the return target (heading or selected ayah), not the top of the page. Add a keyboard-only test.

Search inputs are part of this protocol. A text input whose value is read from `useSearchParams` and whose `onChange` calls `router.replace` loses characters under fast typing and held Backspace. Keep the input in local state, sync the URL after a short pause, and treat the URL as a deep-link projection. The `/read` fix now follows that rule; apply the same policy to `/learn` filters and add a regression test for fast typing, held Backspace, deep-link hydration and back/forward.

## 5. Evidence gate: define how we will know it is better

The plan says "owner trial" but does not define it. Make the trial executable before building slice 2.

Seven-day owner trial, no analytics service, manual baseline:

| # | Task | Pass condition |
|---|---|---|
| 1 | Save a reflection on an ayah that stopped you | Saved and visible after reload |
| 2 | Find it from `/read` | ≤2 actions and ≤15 seconds, without opening the old bookmarks page |
| 3 | Choose up to three course entries from that thread and prepare them | Clear explanation of why each is relevant; due reviews still take precedence |
| 4 | Complete a short session and return | Returns to the exact ayah/range with one back action |
| 5 | Explain what changed in your reading | One specific sentence; no claim beyond the evidence |

Also record before/after step counts, time-to-find, whether the owner returns to the loop on at least two separate days without a prompt, and any moment requiring explanation. Pass only if there is zero lost or duplicated personal data, no new sync conflict, no new console error, no new top-level navigation, and the owner never needs two places to find a saved thought.

Stop/iterate triggers:

- the library is only a prettier bookmark list;
- the owner still checks two places;
- the find task takes more than three actions or feels slower than the existing route;
- a reflection excerpt is not enough to recognise the thought;
- the loop needs a verbal explanation;
- list construction is visibly slow on a realistic snapshot (use the selector budget, not a Lighthouse score);
- practice tests stored labels rather than words in the passage.

Claims ladder: recognition ("I know this gloss") → cued recall ("I can produce it with the ayah") → transfer ("I can explain this wording with evidence") → comprehension (not claimed). Only claim the rung the trial actually tests. No "understanding score", streak, religious rank or fabricated passage history.

## 6. Verification matrix and per-slice definition of done

| Layer | What must be true | Check |
|---|---|---|
| Selector unit tests | One row per ayah; note classification; `Understood` excluded from revisit; orphan preserved; deterministic sort; empty/loading; 10k synthetic notes; Arabic/English search normalization; no mutation | New Vitest fixtures |
| Data | Backup round trip preserves notes, bookmarks and `passageLearning`; guest/account parity; conflict choice both ways; no new cloud/backup fields | Existing backup/sync suites plus new cases |
| End-to-end | Five-task loop; `returnTo` survives practice; bookmark removal preserves reflection; reflection save → library → reader; offline render from stored data | Chromium, Mobile Chrome, WebKit |
| Regression | Fast typing and held Backspace in `/read`; `?q=` deep link; back/forward; result `returnTo` includes current q | New Playwright spec |
| Accessibility | Keyboard-only loop; focus restored; labels and live regions; RTL/bidi isolation for mixed Arabic/English rows | Manual keyboard pass plus targeted assertions |
| Release | `npm run typecheck`, `npm test`, `npm run build:app`, targeted `npm run test:e2e`; `npm run check:budgets` when build/content changes | Follow `AGENTS.md`; do not bypass `npm start`'s content-version guard |

Definition of done for each slice: tests first where practical; no schema change in slices 1–4; no new dependency; no new global store or event bus; every new URL builder has a validation test; docs and verification record updated; rollback is "remove the entry point, keep the data". A slice is not done because the screen renders; it is done when its contract and return path are verified.

## 7. Architecture guardrails, grounded in the graph

The graph at `72346a3` (1,839 nodes, 3,946 edges) concentrates connections in `getDB`, `commands.ts`, `content/client.ts`, `useHarfStore` and the search community. Keep the new work at the leaves:

- `lib/learning/study-thread.ts` — pure model; imports types only.
- `lib/learning/saved-study.ts` — filters, sort and personal-text search over threads; no store, DB or content fetch.
- `lib/practice/pools.ts` — pure pool selection from explicit entry IDs; no scheduler change.
- UI components import selectors and `useMemo`; they do not re-derive membership or scan raw arrays.
- No new persisted model, global state/context, event bus, database or generic plugin layer in the first release.
- Keep `buildQueue`, FSRS and `priorityEntries` semantics untouched. A thread's entry IDs are an input to the existing priority command, not a second queue.
- Read content only through canonical refs and entry IDs (`parseRef`, `parseWordKey`); never infer from Arabic surface strings.
- Put new URL builders beside `lib/navigation/return.ts` and validate them with the same `safeReturn` rules. Do not put reflection text in URLs.

The graph is stale after any code change. Regenerate it before using it for line-level decisions; the `/read` input fix is separate from this plan and does not change its scope.

## 8. Risk register and pre-mortem

| Risk | Why it is credible | Mitigation | Trigger |
|---|---|---|---|
| Another list | The feature becomes a fourth place to check | One entry point; one row per ayah; measure the find task | Owner opens bookmarks first |
| Sparse reflections | Most saved items are bookmarks/assessments | Membership includes all sources; zero-state explains saving; never require a note | <5 threads after a week of normal use |
| Note misclassification | Vocabulary notes share the `notes` store | Strict `isReflectionId` parser and mixed fixtures | Any library row without a valid ayah ref |
| Sync/backup loss | Derived view tempts a new stored record | No schema change; round-trip and conflict tests; new-record checklist for slice 6 | `cloudStores`/`cloudMeta`/backup diff |
| Continuity loss | Practice builders drop `returnTo`; reader loses `?word=` | URL propagation tests; one builder per transition | End practice lands on `/practice` |
| Selector cost | Snapshot allows 2M reviews | Memoize by snapshot; pre-index reviews; cap search | Visible typing lag or selector over budget |
| False claims | Vocabulary overlap sounds like comprehension | Claims ladder and copy review | Any copy that says understanding |
| Privacy leak | Reflections are sensitive | Text-only render; no URLs/logs/third parties; sync-only network | Reflection text appears in a request |
| Accessibility/RTL | Mixed Arabic/English rows and custom buttons | Semantic lists, labels, focus tests, bidi isolation | Keyboard or screen-reader check fails |

Pre-mortem, written before building: "Three months later the loop failed because…" (1) the library was a static list the owner never reopened; (2) reflection capture was too slow on mobile; (3) preparation queued words but the session did not return to the passage; (4) practice tested labels rather than the passage; (5) sync conflicts made the owner distrust the library. The first-release gates above are the mitigations; adding features is not.

## 9. Decisions to record before coding

| Decision | Recommended default | Rationale |
|---|---|---|
| Library contents | Ayah threads only; vocabulary notes later | Avoids misclassification; keeps release 1 focused |
| `Understood` assessments | Exclude from "Needs attention"; optional "Assessed" filter | Does not frame success as a problem |
| Saved range | One passage thread, not ten rows | Matches the stored shape and user intent |
| Inline reflection editing | No; excerpt + "Open ayah" | Reuses `AyahReflection` conflict handling; avoids a second editor |
| Search scope | Personal text only; Quran search stays in `/read` | Does not conflate two retrieval models |
| Default practice pool | Current passage's course entries; saved familiar entries second | Strongest transfer story; explicit learner choice |
| New navigation | Extend `/read`; no new bottom-nav destination | Mobile navigation is already full |
| Trial | 7 days, five tasks, manual baseline | Small enough to run; strong enough to stop |
| Exact-word interests | Defer; full persistence contract if approved | New data is the highest-risk part |
| Editorial | No generated explanations; evidence ledger + per-pack approval | Preserves the trust boundary |

## 10. Additive sequencing with gates

0. Baseline and trial harness: record current steps/time, write the five tasks. No UI.
1. `StudyThread` selector and fixtures. Gate: classification, dedupe, orphan and determinism tests.
2. Saved-study view, empty/loading/error states and the `/read` entry point. Gate: trial tasks 1–2.
3. Passage preview and explicit priority using existing commands. Gate: task 3.
4. Practice pool and origin-aware return. Gate: tasks 4–5 plus URL propagation tests.
5. Explainable queue/history selectors. Gate: counts reconcile with review records, Undo and collection separation.
6. Semantic content report. Independent; no runtime dependency.
7. Conditional exact-word interests. Only after the trial and a complete persistence contract.

Parallel tracks: trial harness, accessibility checks and the content report. Do not parallelise slices that share the selector contract.

If slice 7 is ever approved, its checklist is: Zod schema; `DataSnapshot`/`emptyData`; IndexedDB store/version or meta shape; `cloudStores`/`cloudMeta` and RPC SQL allowlist; backup schema/version and import validation; commands with revision/expected checks; reset/recovery semantics; conflict tests; export/import tests; migration and rollback; UI and docs. Partial delivery is not acceptable for a new persisted record.

## 11. Implementation status — Saved study (slice 1)

Implemented in the working tree: `lib/learning/study-thread.ts`, `lib/learning/saved-study.ts`, `lib/learning/reflection-id.ts`, `lib/navigation/saved-study.ts`, and the `/read?view=saved` surface (`components/reader/SavedStudy.tsx`, `components/reader/SavedThreadDetail.tsx`). The selector is derived from `DataSnapshot`; there is no new store, schema, cloud field or backup field. Vocabulary notes are excluded by the shared strict reflection-id parser. A saved range is one passage row; assessments inside it belong to that row, while separately bookmarked/reflected ayahs can still appear with an "in saved passage" indicator. The list does not load ayah content; the detail view loads and caches it only when opened.

Verified: `npm run typecheck`, **165 unit tests** (28 files), and two targeted Chromium browser tests covering empty/populated states, the vocabulary-note exclusion, an orphaned reference, filters/search, detail content loading only on open, passage resume at `current`, and the reader `returnTo` round-trip. The targeted populated view also passed an axe scan. No commit, production build or live-sync certification was performed in this slice.

One planning inconsistency: section 3 says reflections must stay out of URLs, while section 4 requires preserving the library's search through a reader round-trip. The implementation keeps full reflection text out of URLs but projects the typed search phrase into `?find=` so the deep link and return context survive; that query can contain personal wording. Revisit the privacy/search contract before sharing library URLs or adding analytics.

## 12. Additional non-goals

- AI summaries, tags or "insights" derived from personal reflections; generated tafsir.
- Streaks, notifications, nudges, social features or public profiles.
- One global search across Quran, notes and vocabulary; keep the retrieval models separate.
- A new scheduler, database, global store, event bus or generic plugin layer.
- New top-level navigation, public signup, payments or an analytics platform.
- Lighthouse/performance work (already excluded and not reopened here).

## 13. Implementation status — Focused practice and origin-aware return (slice 3)

Implemented in the working tree: `lib/practice/pools.ts`, `lib/navigation/practice.ts`, the saved-thread practice entry point in `components/reader/SavedThreadDetail.tsx`, and the focused round, bounded completion and origin-aware links in `components/practice/PracticeHub.tsx`. No store, schema, cloud field or backup field changed.

Pool rules, in order: a non-`Understood` assessment narrows practice to the course entries in the assessed ayah(s); otherwise entries already in `meta.priorityEntries` narrow to their intersection; otherwise the saved thread's own course words are used. The reason is emitted only for the signal that selected the pool: needs another look, already queued, saved reflection, saved bookmark, or a saved passage/ayah with no stronger signal. `Understood` alone never produces a revisit reason. A thread with no course words gets no focused CTA and the ordinary practice pool still works.

The saved-detail CTA carries the thread key and the detail URL as `returnTo`. Answer, next-round, start and End practice all go through one validated builder; unsafe origins and malformed focus keys are dropped. Focused word rounds keep broad approved distractors, draw targets only from the pool, stop after the pool is exhausted, and offer a completion summary. End practice returns directly to the originating saved detail. Normal infinite practice is unchanged.

Verified in this slice: `npm run typecheck`; **181 unit tests across 30 files**; **15 saved-study browser checks across Chromium, Mobile Chrome and WebKit**, including the three-round completion path, the bookmark-only path with no assessment or priority, End practice, chooser-origin propagation and mobile-width assertions; and four existing practice/listening regression checks. No production build, deployment, live-sync certification or commit was performed.

Deliberately deferred at that point: explainable queue/history (slice 5; see §15), semantic content report (slice 6); exact-word interests (slice 7); cloud/backup changes. The plan's "saved familiar entries second" pool is not a second selector: after the strong signals, the fallback is all course words in the saved thread.

## 14. Implementation status — Passage preparation (slice 2)

Implemented in the working tree after slice 3: `lib/practice/preparation.ts`, `components/reader/PassagePreparation.tsx`, `setEntryPriority` in `lib/learning/commands.ts`, the `prepared` flag in `lib/navigation/practice.ts`, and the queued-first option in `lib/practice/pools.ts`. The saved-passage detail exposes **Prepare words**. No store, schema, cloud field or backup field changed; the queued set remains `meta.priorityEntries`.

Each distinct course word gets exactly one state from recorded data: **Already queued** (present in `priorityEntries`), **Last review was difficult** (latest non-undone vocabulary review graded Again or Hard), **Familiar** (current card passes the existing familiarity rule), **In progress** (a card or non-undone review exists), or **Not started** (neither exists). The difficult label deliberately describes the last recorded review rather than inferring a recency window. Checkboxes queue and unqueue through the existing meta key; the panel shows no shadow priority list, only a transient optimistic checkbox state reconciled from the refreshed snapshot.

The prepared CTA carries `prepared=1`, the saved thread and the detail origin. `buildFocusedPracticePool(..., {preferQueued: true})` puts the queued intersection ahead of an assessment signal, so a two-word selection practises exactly those two words; if the queue is empty, the normal assessment/saved fallback still applies. Start, answer, next round and restart preserve the flag. Finishing or ending the round returns to the same saved detail.

Verified: `npm run typecheck`; **191 unit tests across 31 files**; **21 saved-study browser checks across Chromium, Mobile Chrome and WebKit**, including queue → unqueue → requeue → practise two → finish → return, the no-course-words panel, list-without-content, origin propagation and mobile width; and four existing practice/listening regression checks. No production build, deployment, live-sync certification or commit was performed.

Deliberately deferred at that point: explainable queue/history (slice 5; see §15), semantic content report (slice 6); exact-word interests (slice 7); cloud/backup changes and production-build proof.

Plan mismatches to keep visible: the plan grouped words as familiar/already scheduled/new, while the target's single-state list is implemented; the plan said preparation words should load only when preparation opens, but the existing saved detail already loads its ayah content to show course words and practice, so preparation reuses that content rather than adding a second loader (the saved-study list still loads none); and the plan's “saved familiar entries second” was not added as a second selector.

## 15. Implementation status — Explainable queue and history (slice 5)

Implemented in the working tree: `lib/learning/queue-explanation.ts`, `components/today/QueueExplanation.tsx`, and the **Why these words?** disclosure inside Today's next-step card. No new route, store key, cloud field, backup field or shadow queue was added. The surface is read-only.

The selector explains the queue the learner will actually meet. With no active vocabulary session it calls `buildQueue` and annotates those items, so due-first ordering, the daily new allowance, the 20-attempt bound and the priority-then-course-order rule are not reimplemented. With an active vocabulary session it reads `session.queue` from the cursor, including learning requeues, because that saved order is the one the session will use. Each row has one primary reason: **Due for review**, **Queued from saved study**, **Next in course order**, **New word in your active session**, or **Scheduled later in this session**. A due item can also carry an “Also queued” badge without changing its primary due reason.

History is derived only from non-undone vocabulary `ReviewEvent`s: newest first by the parsed timestamp (offsets are handled), capped at five with a total count, and rendered from the stored `localDate` plus the time in the stored `timeZone`. Due times come from the card's stored `due`; no “recently” window, score or streak is invented. A word with no matching events says **No review history yet.** A removed catalog entry keeps its stored ref/ID and history rather than receiving fabricated content. The body is built lazily when the disclosure opens; the existing Today queue counts still come from `buildQueue`.

Verified: `npm run typecheck`; **199 unit tests across 32 files**; **9 new browser checks across Chromium, Mobile Chrome and WebKit** covering exact order/reasons, a real two-event history with an undone event excluded, a word with no history, an empty queue, mobile width and the session's first two words matching the explanation; plus two existing Today/accessibility checks. The new disclosure also passed a scoped axe scan. No production build, deployment, live-sync certification or commit was performed.

Deliberately deferred: reusing the explanation in Progress or the vocabulary entry detail, the semantic content report (slice 6), exact-word interests (slice 7), cloud/backup changes and production-build proof.

Plan mismatches to keep visible: the app's queued vocabulary session starts from Today; the `/practice` tab is a separate random drill with no queue, so the entry point belongs on Today rather than under the `Practice` route. The plan also treats the queue as one `buildQueue` result, but an already-active session has its own stored order and learning requeues; explaining a hypothetical next queue there would be false, so the active session's stored attempts are used unchanged.

## 16. Implementation status — Semantic content baseline report (slice 6)

Implemented in the working tree: `lib/content/report.ts`, `components/content/ContentReport.tsx`, and a read-only **Content report** disclosure at the bottom of Progress. No new store key, cloud field, backup field, route, cached derived file or content fetch was added: Progress already loads the catalog and compiled overlap and passes the current `DataSnapshot` into the surface. The selector writes nothing and is covered by pure tests.

The report derives counts from the catalog and compiled overlap: entries, approval status, course versus compiled word positions, release readiness, source-ID groups, rooted/rootless entries, distinct and shared roots, examples per entry, stored vocabulary cards/reviews, and orphaned study records. It groups by the content's real structures (approval, source bundle, root, example count) and checks approval completeness, source IDs, course order, occurrence counts, representative/example selection, blockers and stored-record mapping. Approval is read per entry; nothing is inferred from a bundle, hash or unchanged field. A clean baseline says **No findings in this baseline.** Orphaned cards/reviews are reported without remapping them.

The surface explicitly separates the plan's proposed change set from this baseline. It states that no approved baseline manifest is stored, so no before/after semantic change set is claimed; it reports the current baseline and its study mapping. Ayah translation/footnote changes and field-level before/after citations are outside a catalog-only report. Counts are labelled as stored content and records, not learning.

Verified: `npm run typecheck`; **205 unit tests across 33 files**; **9 browser checks across Chromium, Mobile Chrome and WebKit** covering the populated report with numbers read back from the live catalog/overlap, the clean no-findings state, an intentionally orphaned card and active review, mobile width and a scoped axe scan. No production build, deployment, live-sync certification or commit was performed.

Deliberately deferred: exact-word interests (slice 7), cloud/backup changes and production-build proof. The plan's actual before/after diff remains unbuilt because this repository has no defined approved-baseline manifest. The surface can show an incomplete approval record, but it cannot prove that a changed Arabic surface, gloss, example or translation was reapproved; that needs the baseline and a field-level diff. It also cannot report “added/removed/re-keyed” as a historical change list: it detects current inconsistencies and orphaned progress instead.

Plan mismatches to keep visible: section 5 says “No runtime app changes required for the first report” and “start with a script/report, not an admin application.” The requested surface is a runtime disclosure on Progress, not a script or an admin application. The plan lists translation/footnote and before/after source citations as report fields, but the catalog does not carry translations, footnotes or a prior baseline. The acceptance “rebuilding unchanged inputs produces no semantic changes” is not demonstrated by this surface; a reordered entries array is tested not to create false course-order findings, but compiler rebuild equivalence still needs a baseline manifest and a diff.

Superseded by §17: the approved baseline manifest and field-level diff now exist, the report loads the generated change set, and missing, invalid or stale artifacts are stated explicitly. The limitations above describe the state before that follow-up.

## 17. Implementation status — Approved semantic baseline and diff (slice 6 follow-up)

Implemented in the working tree: `data/content-baseline.json` (a checked-in manifest generated from compiled content `2bb58c86b4683669`), `lib/content/semantic-diff.ts` (the pure snapshot/diff contract), `scripts/content-report.ts` (baseline write/check and post-compile artifact), and the existing Progress **Content report**, which now loads the generated `semantic-diff.json` only when expanded. No route, store key, cloud/backup field or shadow content copy was added. The baseline is deliberately versioned separately from the current compiled output: the compiler can rebuild to a new content version without manufacturing a semantic change.

The baseline records 300 entries and 6,236 ayahs, each entry's exact catalog approval record, source IDs, representative/example keys and occurrence keys, and each ayah's translation and footnotes. Its SHA-256 digest is checked before use. Writing a baseline requires a release-ready catalog with no pending entries; approval is never asserted by the report. The diff classifies added, removed, re-keyed and changed entries, matches a re-keyed entry by unchanged lemma then root rather than remove-plus-add, reports exact occurrence additions/removals, and covers Arabic surface, lemma, root, representative example, example selection, gloss, source IDs, approval records, translations and footnotes. Every change carries a canonical surah/ayah/word citation and before/after values. Missing, invalid and stale artifacts are stated as such and are not rendered as a clean change set.

Verified: TypeScript; **220 unit tests across 34 files**, including 15 new semantic-diff tests for changed example, changed root, re-keyed entry, added/removed entry, translation/footnote change, occurrence change, unchanged and reordered input, missing/invalid/stale status and non-mutation; `content:baseline:check` returned zero semantic changes for compiled content `2bb58c86b4683669` against its baseline (a trial rebuild under a temporary version also produced none, then was discarded to avoid duplicating 171 MB of unchanged generated assets); **21 browser checks across Chromium, Mobile Chrome and WebKit** for the real clean diff, a populated change set with citations, no-findings state, missing artifact, missing baseline, stale artifact, orphaned progress, mobile width and a scoped axe scan; and data validation including the new artifact's schema/version. No production build, deployment, live-sync certification or commit was performed.

Still not satisfied by the data: the report cannot decide whether a prior approval applies to a newly changed field, so it shows the recorded approval and the change side by side but never grants or revokes approval; citations use canonical references and stored source IDs rather than publisher URLs; and Unicode/split-phrase integrity is only exact-value comparison. Exact-word interests, cloud/backup changes and production-build proof remain deferred. The plan's “script/report, no runtime app changes” wording also remains a mismatch: the requested contract lives in the existing runtime disclosure.
