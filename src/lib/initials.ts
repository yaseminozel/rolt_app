/** "Yasemin Arslan" → "YA": first letters of the first two words (avatar without a photo). */
export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toLocaleUpperCase('tr'))
    .join('');
}
