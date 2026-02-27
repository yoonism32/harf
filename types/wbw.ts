/** Shape of each entry in wbw-morphology.json */
export interface WBWMorphEntry {
  /** Words in the Quran from the same root family */
  rootFamilyWords?: Array<{
    /** "ch:vs:w" word key */
    key: string;
    /** Uthmani Arabic text */
    uthmani: string;
    /** English gloss */
    english: string;
  }>;
  /** Raw list of "ch:vs:w" keys for the root family (fallback when no rich data) */
  rootFamily: string[];
}

/** The full wbw-morphology JSON shape */
export type WBWMorphologyData = Record<string, WBWMorphEntry>;
