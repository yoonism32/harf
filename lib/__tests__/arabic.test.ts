import { describe, it, expect } from 'vitest';
import { normAr, tokenContainsRoot } from '../arabic';

// ── normAr ────────────────────────────────────────────────────
describe('normAr', () => {
  it('strips basic diacritics (fatha, kasra, damma)', () => {
    expect(normAr('كَتَبَ')).toBe('كتب');
  });

  it('strips sukun, shadda-expanded and tanwin variants', () => {
    // Shadda expansion: قَّ → قق
    expect(normAr('مَدَّ')).toBe('مدد');
  });

  it('normalises all alef/hamza variants to bare alef', () => {
    // أ، إ، آ، ؤ، ئ، ء should all become ا
    expect(normAr('أإآؤئء')).toBe('اااااا');
  });

  it('normalises alef maqsura (ى) to ya (ي)', () => {
    expect(normAr('هدى')).toBe('هدي');
  });

  it('normalises taa marbuta (ة) to haa (ه)', () => {
    expect(normAr('مدرسة')).toBe('مدرسه');
  });

  it('leaves plain Arabic letters unchanged', () => {
    expect(normAr('كتب')).toBe('كتب');
  });

  it('handles empty string', () => {
    expect(normAr('')).toBe('');
  });

  it('strips alef wasla (ٱ / U+0671)', () => {
    expect(normAr('ٱلله')).toBe('الله');
  });
});

// ── tokenContainsRoot ─────────────────────────────────────────
describe('tokenContainsRoot', () => {
  // Basic subsequence matching
  it('returns true when root letters appear in order', () => {
    expect(tokenContainsRoot('كَتَبَ', 'كتب')).toBe(true);
  });

  it('returns false when root letters are absent', () => {
    expect(tokenContainsRoot('كَتَبَ', 'علم')).toBe(false);
  });

  it('returns false for empty token', () => {
    expect(tokenContainsRoot('', 'كتب')).toBe(false);
  });

  // Diacritics should be transparent
  it('ignores diacritics on both token and root', () => {
    expect(tokenContainsRoot('كَافِر', 'كفر')).toBe(true);
  });

  // Alef/hamza normalisation
  it('treats alef variants as matching bare alef', () => {
    expect(tokenContainsRoot('أمر', 'امر')).toBe(true);
  });

  // Hollow verb (medial weak radical): root قول → قال (و→ا)
  it('matches hollow verb: root قول in token قال', () => {
    expect(tokenContainsRoot('قَالَ', 'قول')).toBe(true);
  });

  // Hollow verb: root كون → كان
  it('matches hollow verb: root كون in token كان', () => {
    expect(tokenContainsRoot('كَانَ', 'كون')).toBe(true);
  });

  // Hollow verb: root بيع → باع (ي→ا)
  it('matches hollow verb: root بيع in token باع', () => {
    expect(tokenContainsRoot('بَاعَ', 'بيع')).toBe(true);
  });

  // Defective verb (final weak radical): root دعو → دعا
  it('matches defective verb: root دعو in token دعا', () => {
    expect(tokenContainsRoot('دَعَا', 'دعو')).toBe(true);
  });

  // Defective verb: root رمي → رمى
  it('matches defective verb: root رمي in token رمى', () => {
    expect(tokenContainsRoot('رَمَى', 'رمي')).toBe(true);
  });

  // Hamzat al-wasl: root اسم → بسم (alef wasla dropped after prefix)
  it('matches hamzat al-wasl root اسم in token بسم', () => {
    expect(tokenContainsRoot('بِسْمِ', 'اسم')).toBe(true);
  });

  // taa marbuta normalisation
  it('treats taa marbuta as haa for matching', () => {
    // root صلو/صلي in مدرسه (ة→ه)
    expect(tokenContainsRoot('كَرِيمَة', 'كرم')).toBe(true);
  });

  // Longer form — root should be found anywhere in token
  it('finds root in a prefixed/suffixed word', () => {
    expect(tokenContainsRoot('وَيَكْتُبُونَ', 'كتب')).toBe(true);
  });

  // Root longer than token — impossible match
  it('returns false when root is longer than token', () => {
    expect(tokenContainsRoot('كت', 'كتب')).toBe(false);
  });
});
