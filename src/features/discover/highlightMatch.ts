import { normalizeForSearch } from '@/lib/searchText';

export type HighlightedText = { before: string; match: string; after: string };

/**
 * Splits `text` around the first occurrence of `query` using the same forgiving matching as
 * `matchesSearch` ("adr" highlights "Adr" in "Adrasan", "cira" highlights "Çıra" in "Çıralı").
 * Returns everything in `before` when there is no match.
 */
export function highlightMatch(text: string, query: string): HighlightedText {
  const needle = normalizeForSearch(query);
  if (!needle) {
    return { before: text, match: '', after: '' };
  }
  // Fold character by character so indices in the folded string map back to `text`.
  const characters = Array.from(text);
  const starts: number[] = [];
  let folded = '';
  characters.forEach((character, index) => {
    const foldedCharacter = character.trim() === '' ? ' ' : normalizeForSearch(character);
    for (let i = 0; i < foldedCharacter.length; i += 1) {
      starts.push(index);
    }
    folded += foldedCharacter;
  });
  const at = folded.indexOf(needle);
  if (at < 0) {
    return { before: text, match: '', after: '' };
  }
  const first = starts[at];
  const last = starts[at + needle.length - 1];
  return {
    before: characters.slice(0, first).join(''),
    match: characters.slice(first, last + 1).join(''),
    after: characters.slice(last + 1).join(''),
  };
}
