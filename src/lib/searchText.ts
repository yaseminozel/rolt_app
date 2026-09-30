const TURKISH_FOLDS: Record<string, string> = {
  ı: 'i',
  ş: 's',
  ğ: 'g',
  ü: 'u',
  ö: 'o',
  ç: 'c',
};

/**
 * Folds text for forgiving search: Turkish-aware lowercase, Turkish letters mapped to ASCII,
 * remaining diacritics stripped. "İzmir", "izmir" and "IZMIR" all become "izmir".
 */
export function normalizeForSearch(text: string) {
  return text
    .trim()
    .toLocaleLowerCase('tr')
    .replace(/[ışğüöç]/g, (char) => TURKISH_FOLDS[char] ?? char)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** True when `candidate` contains `query` after normalization; an empty query matches everything. */
export function matchesSearch(candidate: string, query: string) {
  const normalizedQuery = normalizeForSearch(query);
  return normalizedQuery === '' || normalizeForSearch(candidate).includes(normalizedQuery);
}
