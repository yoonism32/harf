# Content sources

## Quran data (QUL / Tarteel)

| Layer | Resource |
|---|---|
| Arabic script (Uthmani, word-by-word) | [56](https://qul.tarteel.ai/resources/quran-script/56) |
| Word-level translation | [92](https://qul.tarteel.ai/resources/translation/92) |
| Transliteration | [71](https://qul.tarteel.ai/resources/transliteration/71) |
| Lemmas | [75](https://qul.tarteel.ai/resources/morphology/75) |
| Roots | [76](https://qul.tarteel.ai/resources/morphology/76) |
| Full English translation (Hilali/Khan) | [301](https://qul.tarteel.ai/resources/translation/301) |
| Ibn Kathir commentary | [35](https://qul.tarteel.ai/resources/tafsir/35) |

Inputs are pinned by hash in `data/sources.json`. The Quranic Arabic Corpus
notice is emitted as `source-notices.txt` alongside the generated content.

The 99 Names collection is `data/99names.json` (Arabic, transliteration,
meaning, root and explanation).

## How the 300 vocabulary entries are selected

See `scripts/build-content.ts`, `data/sources.json`,
`data/course-overrides.json` and `data/token-alignment.json`.

1. Verify pinned input hashes and read the QUL datasets.
2. Build canonical ayahs and word positions.
3. Group words by normalized lemma plus root; IDs are stable hashes of that identity.
4. Keep groups with at least one glossed, transliterated occurrence; rank by occurrence count (deterministic tie-breaks) and keep 300.
5. Pick up to three examples from different ayahs, preferring 3–25 word ayahs; overrides can change them.
6. Use the first selected occurrence for the displayed form, gloss and transliteration — a contextual gloss, not a full definition.
7. Emit catalog, entry payloads, indexes and overlap data into a versioned directory.

This is a mechanical frequency selection, not an editor-reviewed course.
Arabic content has not been independently reviewed; check doubtful entries
against a qualified reference.
