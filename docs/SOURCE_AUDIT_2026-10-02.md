# Old versus rebuilt Harf: source sample and range audit

Checked 2 October 2026. Baseline generated version: `cff6f17340c5337e`, before restoring the original Names in this task. Comparisons use the actual local files, previous committed source (`git show HEAD:<path>`), pinned SQLite databases and the retained Quran.com/QAC preview files. This is a data audit, not a claim of expert linguistic certification.

## Answer: are QuranWBW and Quranic Corpus still used?

**Their old morphology files are not inputs to the currently selected compiler mode.** `data/sources.json` selects QUL. The QAC compiler branch runs only in preview mode. The old grammar-table component was removed.

However:

- Old datasets still exist on disk; they were not erased by this audit or the Names restoration.
- QuranWBW word audio is still referenced in `lib/audio.ts` and the reader.
- The old English gloss dictionary and QUL's gloss dictionary are exactly identical in this checkout.
- Similar roots/lemmas across sources do not prove independent authorship. The QUL resource pages describe the exports but do not establish a complete upstream lineage for every annotation. “Different distributor” must not be represented as “all-new linguistic research.”

## Range and equality checks

| Data | Earlier/retained source | Rebuilt source | Finding |
|---|---|---|---|
| Ayah coverage | Quran.com preview: 6,236; QAC: 6,236 | QUL compiled: 6,236 | Same full reference range |
| Arabic word segmentation | Preview and QAC: 77,429 word locations | QUL: 77,432 words, plus 6,236 end markers | Three additional split positions, not three extra words inserted into scripture |
| Whole Arabic ayahs | Retained Quran.com preview | QUL Arabic | All 6,236 equal after removing ordinary spaces and excluding end markers |
| English word glosses | `english-wbw.json`: 83,665 keys | QUL gloss JSON: 83,665 keys | All keys and values exactly equal, including non-word/marker entries |
| Quran transliteration | Old `transliteration.json`: 6,236 ayah strings | QUL word transliteration: 77,428 keys | Different granularity; not an equal-record-count replacement |
| Lemma annotations | Full QAC contains segmented linguistic analysis | QUL: 4,817 lemma identities, 72,510 mappings | 72,507 mappings land on current word positions; three are outside current word positions |
| Root annotations | Old root index: 300 selected roots; QAC supplies wider annotations | QUL: 1,642 roots, 50,298 mappings | All 50,298 mappings land on current words; rootless words need not have roots |
| Course | 303 records in old `words.json` | 300 selected lemma/root groups | Different curriculum, not three dropped records from the same list |
| Names before restoration | 99 old records | 99 NumroQ records | Same count, materially different fields/wording; owner now restores original |
| Tafsir | 6,236 keyed records in HEAD | 6,236 current keyed records | Same keys; three raw records changed: 2:238, 24:30, 44:43 |

The old runtime ayah helper fetched jsDelivr Quran API editions on demand. Those original network responses were not archived as a complete old corpus here. The full Arabic equality result above is specifically **retained Quran.com preview versus QUL**, not a claim that every historical jsDelivr response was compared.

The old full translation helper and current QUL resource name Hilali/Khan, but different exports and footnote handling are involved. Identical named translators do not prove byte-for-byte edition equality. No full historical translation equality claim is made.

## Sample verses

| Reference | Preview words | QAC words | Current QUL words |
|---|---:|---:|---:|
| 1:1 | 4 | 4 | 4 |
| 2:181 | 13 | 13 | 14 |
| 2:255 | 50 | 50 | 50 |
| 2:282 | 128 | 128 | 128 |
| 35:1 | 24 | 24 | 24 |
| 114:6 | 3 | 3 | 3 |

At `2:181`, the preview groups **بَعْدَ مَا** into word 3; QUL splits it across words 3 and 4. Subsequent position numbers differ by one. The same split occurs at `8:6` and `13:37`. Across shared positions, 77,398 Arabic token strings agree exactly and 31 differ; there are three additional QUL word keys. Whole-ayah Arabic still agrees when spaces are removed.

**Do not attach old grammar or audio locations to new words merely because a `surah:ayah:word` key exists in both.** Some earlier positions identify a different word. Use an explicit correspondence between token spans, with checks for the three split ayahs and any other orthographic exceptions. The audio helper constructs a QuranWBW URL from the current numeric position; this audit has not verified those recordings against the changed segmentation. That is a specific follow-up check, not a confirmed claim that every recording is wrong.

## Annotation gaps found in the active inputs

Current word positions with empty gloss: `2:181:4`, `8:6:5`, `13:37:9` (the separately split **مَا**). The preceding **بَعْدَ** retains a gloss covering the combined phrase. This is a granularity mismatch worth handling explicitly, not an excuse to fabricate a translation.

Current word positions without a non-empty transliteration: those three, plus `2:181:6` and `36:52:7`.

QUL lemma mappings outside current word positions: `2:275:46`, `4:176:51`, `13:5:26`. Do not silently interpret these as proven missing scripture; inspect the export/tokenization relationship before changing the corpus.

The compiler can pass structural validation with these gaps: reader fields permit empty values, and course examples require non-empty target fields. “Validation passed” therefore does not mean every word has complete or independently verified linguistic data.

## What the old morphology supplied that is missing now

`data/morphology.json` contains 172 ayahs and 3,106 segment records. The old UI explicitly attributed its grammar table to Quranic Arabic Corpus v0.4. Its fields include:

- Prefix/stem/suffix segments and segment surface forms.
- Part-of-speech tags and labels.
- Lemma and root, plus Buckwalter root representation.
- Case, gender, number, tense, voice and morphological form where supplied.

The retained full QAC file has 128,011 segments across 77,429 word positions and 6,236 ayahs. It is richer than the small old app subset. The new token schema retains Arabic, position, gloss, transliteration, lemma, root and course identity; it does not preserve the detailed grammatical fields.

Example: **بِسْمِ at 1:1:1**.

| Earlier segmented analysis | Current token |
|---|---|
| **بِ**: prepositional prefix; **سْمِ**: noun stem; masculine/genitive; lemma and root | Whole **بِسْمِ**, contextual gloss, transliteration, lemma **اسْم**, root **سمو** |

The current representation is useful for vocabulary recall, but not a replacement for a grammar inspector.

`data/wbw-morphology.json` also retains 303 course records, including 299 non-empty grammar summaries and 259 non-empty verb-form objects. Its family lists cover 41,910 distinct word keys; all those keys exist in the new reader, but key existence alone does not prove alignment. Detailed surface/gloss examples cover 11,580 positions; 11,165 surface forms match after limited diacritic/space normalization and 415 differ, often through orthography such as ي/ى or hamza representation. These differences are not automatically correctness errors.

The old fetch script explicitly used QuranWBW root families, verb data and per-chapter word summaries. Current root links in `WordDetail.tsx` search only the **300-entry course catalog**, not the full Quran root family. The new 300 entries contain 45 rootless groups and 179 distinct non-empty roots. This broadens frequent-word coverage but narrows the exposed root-family exploration compared with a full root resource.

A conservative comparison of QAC and QUL on surface-aligned, singly annotated words found all 43,712 comparable roots equal after limited normalization. Of 65,269 comparable lemma values, 65,089 matched and 180 differed, including corpus suffix notation such as `مع2` versus `مع`. This is a restricted comparison, not a corpus-wide accuracy score; ambiguous segments, surface mismatches and unsupported notation were excluded. It demonstrates substantial agreement without establishing source lineage.

## Names comparison and owner's decision

Before restoration, old versus NumroQ had 68/99 exact Arabic strings, 77/99 exact transliterations, and 37/99 exact English meanings. Removing diacritics/spacing and normalizing alif-wasla made 97/99 Arabic forms equal at the same ID; remaining spelling differences were IDs 67 and 78. This does not establish that they name different attributes.

NumroQ omitted the old root and explanatory paragraph. On 2 October the owner explicitly preferred the original personal collection. The app now compiles `data/99names.json`, preserving all its fields and IDs, rather than rewriting its labels to match NumroQ. Independent editorial certification is not claimed. Existing Names progress IDs remain unchanged; an already-saved session retains its captured payload until ended/completed, and newly created sessions use the restored content.

## What I would keep or restore

1. **Keep QUL's canonical reader pipeline and lemma-based study identities.** These solve useful positioning and curriculum problems, though the annotation gaps above remain.
2. **Add QAC's segmented grammar as a linked optional layer**, preserving its richer fields and source references. Do not merge by numeric key without alignment, and do not award mastery to every word sharing a root.
3. **Reuse QuranWBW's root-family examples, summaries and verb data where aligned.** The old files are already available; restoring an inspection view need not replace the scheduler or reader.
4. **Use the owner's original Names for this personal app.** Explanations and roots are useful information; missing publisher metadata alone was not a sufficient product reason to replace them against the owner's preference.
5. **Keep the existing tafsir corpus.** It was not broadly replaced; the app improved how it parses/displays it. Three raw changed records need to be distinguished from a source-wide content change.

More fields make a source richer, not automatically more correct. Clear attribution makes provenance clearer, not automatically more accurate. For this project, linking complementary datasets is preferable to treating one reduced export as a replacement for every old capability.

## Restoration verification

After restoring the original Names: 44 unit tests passed, TypeScript passed, generated-content validation passed, and the production application build passed. The original-data regression check compares all 99 generated records against every original field.

## Mini-test boundaries

The runnable local audit `/tmp/harf-source-audit.py` produced `/tmp/harf-source-audit.json` for the baseline version. Assertions passed for full ayah counts, source-to-output Arabic, collection counts and selected example positions. Whole-ayah equality was checked separately across all ayahs. Source differences were reported rather than suppressed as test failures. The script/report are temporary audit artifacts, not application dependencies.

No full expert Arabic review, complete historical network capture, or audio-position verification was performed. Detailed morphology restoration is a recommendation, not implemented by this task.

References: [QUL lemma export](https://qul.tarteel.ai/resources/morphology/75), [QUL root export](https://qul.tarteel.ai/resources/morphology/76); local QAC v0.4 header and old `MorphologyTable.tsx` establish the retained Corpus attribution.


## Implemented restoration — 2 October 2026

The reader now exposes Quranic Arabic Corpus word parts and grammar, with 128,011 segments aligned from 77,429 source words to all 77,432 canonical reader words. The compiler checks every ayah's ordered Arabic text and every Corpus word against the retained Quran.com export. Different word counts are accepted only when their character spans align; changed scripture fails compilation.

The three source phrases at 2:181:3, 8:6:4 and 13:37:8 span two canonical words each. Both reader positions explicitly share the source phrase meaning, transliteration, grammar and recording. Later words link through the alignment map rather than a guessed numeric offset. Two additional missing transliterations come from the retained export.

Full root families are available from reader words and course entries, including occurrences outside the 300-entry course. Original QuranWBW summaries and verb forms are retained as notes about their original examples, with canonical links. Related words do not inherit each other's meanings or learning progress. The original 99 Names remain active with roots and explanations.

Word recordings use each retained Quran.com `audio_url`, resolved against `https://audio.qurancdn.com/`, as documented by the [Quran Foundation SDK](https://api-docs.quran.com/docs/sdk/javascript/audio/). Filenames are not assumed to equal canonical word numbers. A missing recording is shown honestly; ayah audio remains available. The old root-family English strings are not copied over mismatched word positions: the family uses canonical contextual glosses.

Inputs are pinned, generated detail files are validated and checksummed, and the original Corpus notice is emitted as `source-notices.txt` alongside the versioned content. Source selection does not invent independent editorial approval. Historical comparison sections above describe the pre-restoration state.

Verification after restoration (2 October 2026): 49 unit tests and 24 production browser tests passed across desktop Chromium, mobile Chromium and WebKit, including automated accessibility checks. Content validation, TypeScript, production application build and content/route size budgets passed. The audio browser check verifies the recorded request path with an intercepted request; it does not certify every remote recording or linguistic interpretation.
