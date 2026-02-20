import type { WordProgress } from './storage';

export interface CoverageResult {
  percentage: number;       // 0–100
  rank: RankInfo;
  masteredCount: number;
  totalWords: number;
}

export interface RankInfo {
  level: number;            // 1–5
  arabic: string;
  transliteration: string;
  label: string;
  minPct: number;
  maxPct: number;
}

export const RANKS: RankInfo[] = [
  { level: 1, arabic: 'مبتدئ',       transliteration: "Mubtadi'",       label: 'Beginner',       minPct: 0,  maxPct: 20  },
  { level: 2, arabic: 'متعلم',       transliteration: "Muta'allim",     label: 'Student',        minPct: 20, maxPct: 40  },
  { level: 3, arabic: 'طالب العلم',  transliteration: 'Talib al-Ilm',  label: 'Seeker of Knowledge', minPct: 40, maxPct: 60 },
  { level: 4, arabic: 'متقدم',       transliteration: 'Mutaqaddim',    label: 'Advanced',        minPct: 60, maxPct: 75  },
  { level: 5, arabic: 'عالم',        transliteration: 'Alim',          label: 'Scholar',         minPct: 75, maxPct: 100 },
];

export function getRank(percentage: number): RankInfo {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    const rank = RANKS[i];
    if (rank && percentage >= rank.minPct) return rank;
  }
  return RANKS[0]!;
}

export interface WordWithWeight {
  id: string;
  coverage_weight: number;
}

/**
 * Calculate Quran coverage percentage based on mastered words.
 * Uses coverage_weight per word (frequency / total_quran_words).
 * A word counts toward coverage if mastery >= 4 (Confident or Mastered).
 */
export function calculateCoverage(
  words: WordWithWeight[],
  allProgress: Record<string, WordProgress>,
  masteryThreshold = 4,
): CoverageResult {
  let totalWeight = 0;
  let masteredWeight = 0;
  let masteredCount = 0;

  for (const word of words) {
    totalWeight += word.coverage_weight;
    const progress = allProgress[word.id];
    if (progress && progress.mastery >= masteryThreshold) {
      masteredWeight += word.coverage_weight;
      masteredCount++;
    }
  }

  // Normalize: the words.json set covers ~80% of Quran
  // Total Quran word count = 77,429 (Quranic Arabic Corpus v0.4)
  // Max achievable coverage with our dataset ≈ 80%
  const rawPct = totalWeight > 0 ? (masteredWeight / totalWeight) * 80 : 0;
  const percentage = Math.min(80, Math.round(rawPct * 10) / 10);

  return {
    percentage,
    rank: getRank(percentage),
    masteredCount,
    totalWords: words.length,
  };
}

/** Progress within current rank tier (0–1) */
export function rankProgress(percentage: number): number {
  const rank = getRank(percentage);
  const range = rank.maxPct - rank.minPct;
  if (range === 0) return 1;
  return Math.min(1, (percentage - rank.minPct) / range);
}

/** Format coverage percentage nicely */
export function formatPct(pct: number): string {
  if (pct === 0) return '0%';
  if (pct < 1) return `${pct.toFixed(1)}%`;
  return `${Math.round(pct)}%`;
}

// ── Surah metadata for coverage map ──────────────────────────

export interface SurahMeta {
  number: number;
  name: string;
  nameArabic: string;
  ayahs: number;
}

// 114 surahs - number, English name, Arabic name, ayah count
export const SURAHS: SurahMeta[] = [
  { number: 1,   name: 'Al-Fatiha',     nameArabic: 'الفاتحة',    ayahs: 7   },
  { number: 2,   name: 'Al-Baqarah',    nameArabic: 'البقرة',     ayahs: 286 },
  { number: 3,   name: 'Ali Imran',     nameArabic: 'آل عمران',   ayahs: 200 },
  { number: 4,   name: 'An-Nisa',       nameArabic: 'النساء',     ayahs: 176 },
  { number: 5,   name: 'Al-Maida',      nameArabic: 'المائدة',    ayahs: 120 },
  { number: 6,   name: 'Al-Anam',       nameArabic: 'الأنعام',    ayahs: 165 },
  { number: 7,   name: 'Al-Araf',       nameArabic: 'الأعراف',    ayahs: 206 },
  { number: 8,   name: 'Al-Anfal',      nameArabic: 'الأنفال',    ayahs: 75  },
  { number: 9,   name: 'At-Tawbah',     nameArabic: 'التوبة',     ayahs: 129 },
  { number: 10,  name: 'Yunus',         nameArabic: 'يونس',       ayahs: 109 },
  { number: 11,  name: 'Hud',           nameArabic: 'هود',        ayahs: 123 },
  { number: 12,  name: 'Yusuf',         nameArabic: 'يوسف',       ayahs: 111 },
  { number: 13,  name: 'Ar-Rad',        nameArabic: 'الرعد',      ayahs: 43  },
  { number: 14,  name: 'Ibrahim',       nameArabic: 'إبراهيم',    ayahs: 52  },
  { number: 15,  name: 'Al-Hijr',       nameArabic: 'الحجر',      ayahs: 99  },
  { number: 16,  name: 'An-Nahl',       nameArabic: 'النحل',      ayahs: 128 },
  { number: 17,  name: 'Al-Isra',       nameArabic: 'الإسراء',    ayahs: 111 },
  { number: 18,  name: 'Al-Kahf',       nameArabic: 'الكهف',      ayahs: 110 },
  { number: 19,  name: 'Maryam',        nameArabic: 'مريم',       ayahs: 98  },
  { number: 20,  name: 'Ta-Ha',         nameArabic: 'طه',         ayahs: 135 },
  { number: 21,  name: 'Al-Anbiya',     nameArabic: 'الأنبياء',   ayahs: 112 },
  { number: 22,  name: 'Al-Hajj',       nameArabic: 'الحج',       ayahs: 78  },
  { number: 23,  name: 'Al-Muminun',    nameArabic: 'المؤمنون',   ayahs: 118 },
  { number: 24,  name: 'An-Nur',        nameArabic: 'النور',      ayahs: 64  },
  { number: 25,  name: 'Al-Furqan',     nameArabic: 'الفرقان',    ayahs: 77  },
  { number: 26,  name: 'Ash-Shuara',    nameArabic: 'الشعراء',    ayahs: 227 },
  { number: 27,  name: 'An-Naml',       nameArabic: 'النمل',      ayahs: 93  },
  { number: 28,  name: 'Al-Qasas',      nameArabic: 'القصص',      ayahs: 88  },
  { number: 29,  name: 'Al-Ankabut',    nameArabic: 'العنكبوت',   ayahs: 69  },
  { number: 30,  name: 'Ar-Rum',        nameArabic: 'الروم',      ayahs: 60  },
  { number: 31,  name: 'Luqman',        nameArabic: 'لقمان',      ayahs: 34  },
  { number: 32,  name: 'As-Sajdah',     nameArabic: 'السجدة',     ayahs: 30  },
  { number: 33,  name: 'Al-Ahzab',      nameArabic: 'الأحزاب',    ayahs: 73  },
  { number: 34,  name: 'Saba',          nameArabic: 'سبأ',        ayahs: 54  },
  { number: 35,  name: 'Fatir',         nameArabic: 'فاطر',       ayahs: 45  },
  { number: 36,  name: 'Ya-Sin',        nameArabic: 'يس',         ayahs: 83  },
  { number: 37,  name: 'As-Saffat',     nameArabic: 'الصافات',    ayahs: 182 },
  { number: 38,  name: 'Sad',           nameArabic: 'ص',          ayahs: 88  },
  { number: 39,  name: 'Az-Zumar',      nameArabic: 'الزمر',      ayahs: 75  },
  { number: 40,  name: 'Ghafir',        nameArabic: 'غافر',       ayahs: 85  },
  { number: 41,  name: 'Fussilat',      nameArabic: 'فصلت',       ayahs: 54  },
  { number: 42,  name: 'Ash-Shura',     nameArabic: 'الشورى',     ayahs: 53  },
  { number: 43,  name: 'Az-Zukhruf',    nameArabic: 'الزخرف',     ayahs: 89  },
  { number: 44,  name: 'Ad-Dukhan',     nameArabic: 'الدخان',     ayahs: 59  },
  { number: 45,  name: 'Al-Jathiyah',   nameArabic: 'الجاثية',    ayahs: 37  },
  { number: 46,  name: 'Al-Ahqaf',      nameArabic: 'الأحقاف',    ayahs: 35  },
  { number: 47,  name: 'Muhammad',      nameArabic: 'محمد',       ayahs: 38  },
  { number: 48,  name: 'Al-Fath',       nameArabic: 'الفتح',      ayahs: 29  },
  { number: 49,  name: 'Al-Hujurat',    nameArabic: 'الحجرات',    ayahs: 18  },
  { number: 50,  name: 'Qaf',           nameArabic: 'ق',          ayahs: 45  },
  { number: 51,  name: 'Adh-Dhariyat',  nameArabic: 'الذاريات',   ayahs: 60  },
  { number: 52,  name: 'At-Tur',        nameArabic: 'الطور',      ayahs: 49  },
  { number: 53,  name: 'An-Najm',       nameArabic: 'النجم',      ayahs: 62  },
  { number: 54,  name: 'Al-Qamar',      nameArabic: 'القمر',      ayahs: 55  },
  { number: 55,  name: 'Ar-Rahman',     nameArabic: 'الرحمن',     ayahs: 78  },
  { number: 56,  name: 'Al-Waqiah',     nameArabic: 'الواقعة',    ayahs: 96  },
  { number: 57,  name: 'Al-Hadid',      nameArabic: 'الحديد',     ayahs: 29  },
  { number: 58,  name: 'Al-Mujadila',   nameArabic: 'المجادلة',   ayahs: 22  },
  { number: 59,  name: 'Al-Hashr',      nameArabic: 'الحشر',      ayahs: 24  },
  { number: 60,  name: 'Al-Mumtahanah', nameArabic: 'الممتحنة',   ayahs: 13  },
  { number: 61,  name: 'As-Saf',        nameArabic: 'الصف',       ayahs: 14  },
  { number: 62,  name: 'Al-Jumuah',     nameArabic: 'الجمعة',     ayahs: 11  },
  { number: 63,  name: 'Al-Munafiqun',  nameArabic: 'المنافقون',  ayahs: 11  },
  { number: 64,  name: 'At-Taghabun',   nameArabic: 'التغابن',    ayahs: 18  },
  { number: 65,  name: 'At-Talaq',      nameArabic: 'الطلاق',     ayahs: 12  },
  { number: 66,  name: 'At-Tahrim',     nameArabic: 'التحريم',    ayahs: 12  },
  { number: 67,  name: 'Al-Mulk',       nameArabic: 'الملك',      ayahs: 30  },
  { number: 68,  name: 'Al-Qalam',      nameArabic: 'القلم',      ayahs: 52  },
  { number: 69,  name: 'Al-Haqqah',     nameArabic: 'الحاقة',     ayahs: 52  },
  { number: 70,  name: 'Al-Maarij',     nameArabic: 'المعارج',    ayahs: 44  },
  { number: 71,  name: 'Nuh',           nameArabic: 'نوح',        ayahs: 28  },
  { number: 72,  name: 'Al-Jinn',       nameArabic: 'الجن',       ayahs: 28  },
  { number: 73,  name: 'Al-Muzzammil',  nameArabic: 'المزمل',     ayahs: 20  },
  { number: 74,  name: 'Al-Muddaththir',nameArabic: 'المدثر',     ayahs: 56  },
  { number: 75,  name: 'Al-Qiyamah',    nameArabic: 'القيامة',    ayahs: 40  },
  { number: 76,  name: 'Al-Insan',      nameArabic: 'الإنسان',    ayahs: 31  },
  { number: 77,  name: 'Al-Mursalat',   nameArabic: 'المرسلات',   ayahs: 50  },
  { number: 78,  name: 'An-Naba',       nameArabic: 'النبأ',      ayahs: 40  },
  { number: 79,  name: 'An-Naziat',     nameArabic: 'النازعات',   ayahs: 46  },
  { number: 80,  name: 'Abasa',         nameArabic: 'عبس',        ayahs: 42  },
  { number: 81,  name: 'At-Takwir',     nameArabic: 'التكوير',    ayahs: 29  },
  { number: 82,  name: 'Al-Infitar',    nameArabic: 'الانفطار',   ayahs: 19  },
  { number: 83,  name: 'Al-Mutaffifin', nameArabic: 'المطففين',   ayahs: 36  },
  { number: 84,  name: 'Al-Inshiqaq',   nameArabic: 'الانشقاق',   ayahs: 25  },
  { number: 85,  name: 'Al-Buruj',      nameArabic: 'البروج',     ayahs: 22  },
  { number: 86,  name: 'At-Tariq',      nameArabic: 'الطارق',     ayahs: 17  },
  { number: 87,  name: 'Al-Ala',        nameArabic: 'الأعلى',     ayahs: 19  },
  { number: 88,  name: 'Al-Ghashiyah',  nameArabic: 'الغاشية',    ayahs: 26  },
  { number: 89,  name: 'Al-Fajr',       nameArabic: 'الفجر',      ayahs: 30  },
  { number: 90,  name: 'Al-Balad',      nameArabic: 'البلد',      ayahs: 20  },
  { number: 91,  name: 'Ash-Shams',     nameArabic: 'الشمس',      ayahs: 15  },
  { number: 92,  name: 'Al-Layl',       nameArabic: 'الليل',      ayahs: 21  },
  { number: 93,  name: 'Ad-Duha',       nameArabic: 'الضحى',      ayahs: 11  },
  { number: 94,  name: 'Ash-Sharh',     nameArabic: 'الشرح',      ayahs: 8   },
  { number: 95,  name: 'At-Tin',        nameArabic: 'التين',      ayahs: 8   },
  { number: 96,  name: 'Al-Alaq',       nameArabic: 'العلق',      ayahs: 19  },
  { number: 97,  name: 'Al-Qadr',       nameArabic: 'القدر',      ayahs: 5   },
  { number: 98,  name: 'Al-Bayyinah',   nameArabic: 'البينة',     ayahs: 8   },
  { number: 99,  name: 'Az-Zalzalah',   nameArabic: 'الزلزلة',    ayahs: 8   },
  { number: 100, name: 'Al-Adiyat',     nameArabic: 'العاديات',   ayahs: 11  },
  { number: 101, name: 'Al-Qariah',     nameArabic: 'القارعة',    ayahs: 11  },
  { number: 102, name: 'At-Takathur',   nameArabic: 'التكاثر',    ayahs: 8   },
  { number: 103, name: 'Al-Asr',        nameArabic: 'العصر',      ayahs: 3   },
  { number: 104, name: 'Al-Humazah',    nameArabic: 'الهمزة',     ayahs: 9   },
  { number: 105, name: 'Al-Fil',        nameArabic: 'الفيل',      ayahs: 5   },
  { number: 106, name: 'Quraysh',       nameArabic: 'قريش',       ayahs: 4   },
  { number: 107, name: 'Al-Maun',       nameArabic: 'الماعون',    ayahs: 7   },
  { number: 108, name: 'Al-Kawthar',    nameArabic: 'الكوثر',     ayahs: 3   },
  { number: 109, name: 'Al-Kafirun',    nameArabic: 'الكافرون',   ayahs: 6   },
  { number: 110, name: 'An-Nasr',       nameArabic: 'النصر',      ayahs: 3   },
  { number: 111, name: 'Al-Masad',      nameArabic: 'المسد',      ayahs: 5   },
  { number: 112, name: 'Al-Ikhlas',     nameArabic: 'الإخلاص',    ayahs: 4   },
  { number: 113, name: 'Al-Falaq',      nameArabic: 'الفلق',      ayahs: 5   },
  { number: 114, name: 'An-Nas',        nameArabic: 'الناس',      ayahs: 6   },
];
