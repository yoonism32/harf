/** Strip diacritics + normalise all hamza/alef/ya variants for root matching */
export function normAr(s: string): string {
  return s
    .replace(/([\u0621-\u06FF])[\u064B-\u0650\u0653-\u0655]*\u0651/g, '$1$1') // expand shadda: قَّ → قق
    .replace(/[\u064B-\u065F\u0670\u0640\u06D6-\u06EF]/g, '')
    .replace(/[أإآؤئءٱ\u0671]/g, 'ا')   // all alef/hamza variants + alef wasla
    .replace(/[ى\u06CC]/g, 'ي')          // alef maqsura + Farsi ya (U+06CC) → ya
    .replace(/ة/g, 'ه');
}

/**
 * Check whether the root letters appear as a subsequence inside the token.
 * Handles long vowels between root letters (e.g. كَافِر from root كفر).
 *
 * Weak-letter handling:
 *  - Final weak radical (defective verbs): root دعو → دعا, root رمي → رمى
 *  - Medial weak radical (hollow verbs):   root قول → قال/قيل, root كون → كان
 *    The middle و/ي becomes a long vowel ا/ي in the surface form.
 */
export function tokenContainsRoot(token: string, rootLetters: string): boolean {
  const t = normAr(token);
  const r = normAr(rootLetters.replace(/\s+/g, ''));
  let ri = 0;
  for (let ti = 0; ti < t.length && ri < r.length; ti++) {
    const rl = r[ri]!;
    const tl = t[ti]!;
    // Final weak radical: و/ي → ا (دعا، رمى) or waw↔ya interchange (علو→عليّ)
    const isWeakFinal = ri === r.length - 1 && (
      ((rl === 'و' || rl === 'ي') && tl === 'ا') ||  // defective: surface alef (دعا، رمى)
      (rl === 'و' && tl === 'ي') ||                    // waw↔ya: علو→عليّ
      (rl === 'ي' && tl === 'و')                        // ya-defective plural: لقي→ألقوه، رمي→يرموه
    );
    // Medial weak radical (hollow verbs): middle و/ي → ا/ي in surface form
    // e.g. root قول → قال (و→ا), قيل (و→ي); root كون → كان (و→ا); root بيع → باع (ي→ا)
    const isWeakMedial = ri > 0 && ri < r.length - 1 && (
      (rl === 'و' && (tl === 'ا' || tl === 'ي')) ||
      (rl === 'ي' && (tl === 'ا' || tl === 'و'))
    );
    // Hamzat al-wasl: root-initial ا is elided when the token has no ا at all
    // e.g. root اسم → بسم (ب + إسم, alef wasl dropped after prefix)
    const isWaslSkip = ri === 0 && rl === 'ا' && !t.includes('ا');
    if (tl === rl || isWeakFinal || isWeakMedial) ri++;
    else if (isWaslSkip) ri++; // skip the ا in root, stay on current token char (ti advances by loop)
  }
  return ri === r.length;
}
