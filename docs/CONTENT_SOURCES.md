# Harf content: where it came from and what changed

Checked against the working tree, Git history, and linked publisher pages on 1 October 2026; QUL downloads were rechecked on 28 October 2026. The owner approved the current pinned inputs and selected Names collection for Harf release on 28 October. This records an owner decision, not new third-party licence evidence or independent editorial certification.

## Update — 2 October 2026

The owner has selected the **original `data/99names.json`** for personal use. The compiler and Names screen now preserve its Arabic, Ar-Rahman/Ar-Raheem labels, meanings, roots and explanations. NumroQ is retained for historical comparison but is no longer an active compiler input. This selection does not claim an external publisher or independent editorial certification. Attribution completeness is not a requirement to use this selected collection in the personal app.

The old/new tables below describe the earlier switch to NumroQ, not the restored current selection. Read the [measured source audit](SOURCE_AUDIT_2026-10-02.md) for range tests, missing grammar fields and discovered annotation gaps.

## Download verification — 28 October 2026

The owner downloaded current QUL exports into a temporary review folder and Harf compared them without replacing repository files.

| Harf layer | Upstream resource and format | Result |
|---|---|---|
| Ayah themes | [62: QUL Ayah Themes](https://qul.tarteel.ai/resources/ayah-theme/62), SQLite | All 1,049 distinct records match the local JSON projection. The downloaded database contains every row twice (2,098 rows); Harf correctly retains the 1,049 distinct records. |
| Similar ayahs | [74: QUL Similar Ayah](https://qul.tarteel.ai/resources/ayah-theme/74), JSON | Byte-identical to `data/matching-ayah.json`. |
| Repeated phrases | [73: QUL Mutashabihat](https://qul.tarteel.ai/resources/mutashabihat/73), two JSON files | Both `phrases.json` and `phrase_verses.json` are byte-identical to Harf's phrase data and reverse index. The web preview currently reports 13 occurrences for one 2:112 phrase while its downloaded JSON contains 12; treat the downloaded artifact as the reproducible input and record the preview disagreement as an upstream issue. |
| Topics and ayah links | [45: QUL Ayah Topics](https://qul.tarteel.ai/resources/ayah-topics/45), SQLite | All 2,512 topic rows and 5,804 reverse links match after the local projection represents SQL `NULL` Arabic labels as empty strings. QUL identifies the ontology layer as Quranic Arabic Corpus material and its thematic layer as Clear Quran material. |
| Basic surah metadata | [70: QUL Surah Names](https://qul.tarteel.ai/resources/quran-metadata/70), JSON | Harf's 114-row `quran-surah-meta.json` exactly matches the current export's simple name, Arabic name and ayah count fields. |

These Insights inputs are QUL-derived even though they are bundled as app-friendly JSON rather than listed in `data/sources.json`. The registry deliberately remains the compiler's versioned input list; this document records the separate runtime/reference provenance and transformations.

The fresh [301: Hilali/Khan translation](https://qul.tarteel.ai/resources/translation/301) has the same 6,236 ayah keys but different bytes. QUL's 13 October 2026 change log attributes this to translation and footnote formatting. Harf's parser successfully processed all 6,236 fresh records (760 notes; no failures, empty translations or raw markers). The verified 13 October export was adopted on 28 October and all generated content was rebuilt from it.

`data/surah-info.json` has a different origin: the historical `scripts/fetch-surah-info.py` fetched and structured all 114 Quran.com `/surah/{n}/info` pages, including the material marked as adapted from Ibn Ashur. That historical script is not in the current working tree. `data/99names.json` remains the owner-selected original Harf collection without an external publisher record.

The historical QuranWBW morphology generator used JSON endpoints under `https://static.quranwbw.com/data/v4` for word/root data, root families, verb forms and per-surah summaries. It produced `data/wbw-morphology.json`; it is not a QUL export. The historical generator is also absent from the current tree.

## Two different collections

- **300 vocabulary entries:** frequent Quranic lemma groups used for contextual vocabulary practice. A lemma is a dictionary-like word identity; a root can have several distinct lemmas. Particles and rootless words can belong to this course.
- **99 Names of Allah:** a separate collection with its own scheduling records. It does not contribute to Quran vocabulary-overlap percentages.

Neither number proves that the content was reviewed by a qualified editor.

## Old and current sources

| Layer | Earlier implementation: evidence available | Current implementation |
|---|---|---|
| Arabic ayahs | `HEAD:lib/quran-api.ts` fetched the `ara-quranacademy` edition through the fawazahmed0 Quran API on jsDelivr | Pinned QUL Uthmani word-by-word export, resource 56 |
| Full English translation | Same helper fetched `eng-muhammadtaqiudd` (Hilali/Khan) | QUL resource 301, Hilali/Khan with inline footnotes; same named translators, different distribution/export pipeline |
| Vocabulary | `data/words.json`, root-based entries; the historical expansion script added frequent root families using QuranWBW morphology and gloss data | Compiler selects 300 eligible lemma/root groups from pinned QUL occurrence data |
| Morphology/gloss enrichment | `HEAD:scripts/expand-words.ts` and `HEAD:scripts/fetch-morphology.ts` use `static.quranwbw.com/data/v4`; root-family size was a frequency proxy | QUL glosses 92, transliteration 71, lemmas 75, roots 76, aligned by word location |
| 99 Names | `data/99names.json`: Arabic, transliteration, meaning, root and explanatory paragraph; no publisher/licence attached in that file | Owner-approved for Harf release on 28 October; its external publisher remains unrecorded |
| Tafsir | Local `data/tafsir-ibn-kathir.json`; old route exposed source HTML | Retained corpus, QUL resource 35 attribution/hash record, structured plain-text rendering; registry also records a specific typo correction |
| Progress percentage | Root weights and a fixed 80% ceiling, described as comprehension | Actual unique word-position overlap for familiar course entries; explicitly not comprehension |

`HEAD:<path>` above identifies the earlier committed code inspected for this comparison. The working tree has removed those helpers; use Git history to inspect them, not runtime imports.

The old vocabulary scripts establish a QuranWBW source for expansion/enrichment. They do **not** establish the original authorship or editorial review of every seed entry. Likewise, no publisher attribution was found in the old Names file: do not guess that it came from a particular Islamic website, or claim its content was wrong simply because its provenance is incomplete.

The compiler still contains a preview path using Quran.com chapter exports and QAC morphology. `data/sources.json` currently selects `mode: "qul"`; preview data is not the active production source.

## How the 300 are selected

Read `scripts/build-content.ts`, `data/sources.json`, `data/course-overrides.json`, and `data/token-alignment.json` together.

1. Verify pinned input hashes and read the QUL Arabic, gloss, transliteration, translation, lemma and root datasets.
2. Build canonical ayahs and word positions, distinguishing end markers from words.
3. Group words by normalized lemma plus root. Generate stable hashed entry IDs from that identity.
4. Exclude groups without at least one occurrence with both gloss and transliteration. Rank eligible groups by occurrence count, using deterministic tie-breaks, and keep 300.
5. Propose up to three examples from different ayahs. Prefer ayahs with 3–25 words, then shorter ayahs and earlier references. Explicit overrides can change the selected examples.
6. Use the first selected occurrence for the displayed form, gloss and transliteration. This is a contextual gloss, not a promise that one English meaning covers every use of the lemma.
7. Emit catalog, entry payloads, surahs, indexes, occurrence-overlap data and validation reports into a versioned directory.

This is a mechanically reproducible course selection, not a publisher-supplied, editor-approved “top 300 course.” Editorial work must check the grouping, representative form, contextual meaning and example suitability. Changing the source can also change identities; old root progress must not be blindly copied onto all related lemmas.

### Current QUL references

- [56: Quran script](https://qul.tarteel.ai/resources/quran-script/56)
- [92: word-level translation](https://qul.tarteel.ai/resources/translation/92)
- [71: transliteration](https://qul.tarteel.ai/resources/transliteration/71)
- [75: lemmas](https://qul.tarteel.ai/resources/morphology/75)
- [76: roots](https://qul.tarteel.ai/resources/morphology/76)
- [301: full translation](https://qul.tarteel.ai/resources/translation/301)
- [35: Ibn Kathir commentary](https://qul.tarteel.ai/resources/tafsir/35)

The local registry records the earlier project's permission evidence and owner source-selection approval. This documentation update preserves those records; it does not independently recertify every underlying publication right.

## Why Ar-Rahman became Al-Rahman

Actual local records:

| Field | Old Names file | Current Names input |
|---|---|---|
| Name 1 Arabic | الرَّحْمَٰن | الرَّحْمَن |
| Name 1 Latin label | Ar-Rahman | Al-Rahman |
| Name 1 meaning | The Most Gracious | The Most Merciful |
| Name 2 Latin label | Ar-Raheem | Al-Rahim |
| Name 2 meaning | The Most Merciful | The Most Compassionate |
| Root and explanatory paragraph | Present, without attached attribution | Omitted from the new records |
| Editorial approval record | None attached | Owner-approved for Harf release on 28 October |

**Al- versus Ar- is a transliteration convention, not a different Name.** Arabic writes the article ال. Before a sun letter such as ر, its l sound assimilates to the following consonant. “Ar-Raḥmān” reflects pronunciation; “Al-Rahman” preserves the written article. See [Madinah Arabic's definite-article lesson](https://madinaharabic.com/free-content/grammar/lesson-3/part-7).

The two Arabic strings also differ in diacritic representation, including the old superscript alif; they are not byte-identical. Do not use a Latin-label difference or raw string equality alone to decide semantic identity. The English gloss change is a separate translation choice requiring content review; licensing does not establish that the new wording is better.

Historical recommendation, superseded by the owner’s restoration decision above: retain the publisher's source label in provenance, and use a consistently reviewed pronunciation-oriented display label such as Ar-Raḥmān for learners. Any display normalization should have an explicit editorial record; do not silently rewrite the pinned source or switch datasets based only on al-/ar- spelling.

## Why NumroQ was used, and its limitation

The previous project conversation records the choice of an attributable replacement with explicit reuse terms. The [NumroQ table](https://numroq.com/reference/99-names-of-allah) currently offers CC BY 4.0 attribution-based reuse. Harf imports the Names/meanings, not its Abjad calculations.

However, the publisher describes its broader site as numerology, astrology and divination tooling. Clear reuse terms establish provenance and permissions; they do not establish specialist authority for religious education. This is a reason to independently check the Names and meanings, not proof that every row is incorrect. Do not describe the switch as an established improvement in theological accuracy.

For personal use, keep the existing disclosure and check doubtful entries against a qualified reference. Before public release, review the collection with an Arabic-competent reviewer with appropriate Islamic subject knowledge, including the basis for the selected list and translations. A future source replacement requires both attributable reuse evidence and content-quality review. No source replacement or approval was performed in this documentation update.

## What editorial review means here

Three distinct checks must not be conflated:

| Check | What it establishes | Current status |
|---|---|---|
| Source selection/provenance | Publisher, file/version, attribution, recorded reuse evidence | Recorded in `data/sources.json`; owner approval in prior conversation |
| Automated integrity/alignment | Files match their hashes; expected counts, schemas and example positions are consistent | Validation passed on 1 October 2026 |
| Editorial accuracy | Arabic form, grouping, contextual meaning, transliteration, examples and Names treatment are suitable | Owner-approved for Harf release on 28 October; not an independent certification |

Vocabulary reviews belong in `data/course-overrides.json`; the owner approval record supplies the reviewer, date and evidence for the current generated course. The earlier NumroQ review records remain historical; they do not certify the restored original collection. This is a release decision, not an independently qualified editor's certification.

A useful review record identifies the entry, the references examined, the exact example positions checked, any corrections, and any unresolved interpretation. Review the meaning and examples as well as spelling. A source's own review date is not a Harf editorial sign-off.

After legitimate changes to pinned Names data, update its registry hash, regenerate content and validate it. Update review evidence together with any changed examples. `npm run build` enforces the release gate. Personal testing can use `npm run build:app` without claiming public-release approval; pending labels remain truthful.


## Implemented restoration — 2 October 2026

The reader now exposes Quranic Arabic Corpus word parts and grammar, with 128,011 segments aligned from 77,429 source words to all 77,432 canonical reader words. The compiler checks every ayah's ordered Arabic text and every Corpus word against the retained Quran.com export. Different word counts are accepted only when their character spans align; changed scripture fails compilation.

The three source phrases at 2:181:3, 8:6:4 and 13:37:8 span two canonical words each. Both reader positions explicitly share the source phrase meaning, transliteration, grammar and recording. Later words link through the alignment map rather than a guessed numeric offset. Two additional missing transliterations come from the retained export.

Full root families are available from reader words and course entries, including occurrences outside the 300-entry course. Original QuranWBW summaries and verb forms are retained as notes about their original examples, with canonical links. Related words do not inherit each other's meanings or learning progress. The original 99 Names remain active with roots and explanations.

Word recordings use each retained Quran.com `audio_url`, resolved against `https://audio.qurancdn.com/`, as documented by the [Quran Foundation SDK](https://api-docs.quran.com/docs/sdk/javascript/audio/). Filenames are not assumed to equal canonical word numbers. A missing recording is shown honestly; ayah audio remains available. The old root-family English strings are not copied over mismatched word positions: the family uses canonical contextual glosses.

Inputs are pinned, generated detail files are validated and checksummed, and the original Corpus notice is emitted as `source-notices.txt` alongside the versioned content. Source selection does not invent independent editorial approval. Historical comparison sections above describe the pre-restoration state.
# QPC V2 Mushaf additions — 27 October 2026

Owner-supplied QUL downloads: layout resource 10, word-glyph resource 61, and page-font resource 249. Pinned inputs live in `data/source/qul/mushaf-v2/`; `fonts.json` pins all 604 WOFF files individually. The download labelled `.woff.bz2` was a ZIP archive. Glyph keys match all 83,668 canonical token positions (including verse markers). The compiler validates unique IDs, canonical keys, complete nonduplicated page coverage, and every font checksum, then emits versioned page JSON, an ayah-to-first-page index and fonts. Glyph codes are for display only; existing canonical Arabic remains the source for meanings, search and accessibility labels. The owner approved these pinned inputs for Harf release on 28 October. That decision is recorded as `permission: "owner-approved"`; it does not create new source-specific redistribution evidence or independent calligraphic/editorial review.

The 604 page fonts under `data/source/qul/mushaf-v2/fonts/` are deliberately not tracked in git. They are 105 MB of WOFF files whose byte-identical copies already ship in the generated content package, and `fonts.json` pins every one of them by SHA-256. `glyphs.json`, `fonts.json` and `layout.db` are tracked. A fresh checkout that needs to regenerate content must first re-download QUL resources 10 (layout), 61 (glyphs) and 249 (fonts) into `data/source/qul/mushaf-v2/`; without them `npm run build:content` stops at the first missing file, and with them it re-verifies every font checksum and fails on any mismatch.
