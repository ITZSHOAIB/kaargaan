/** "Rupa", "Rupa and Arjun", "Rupa, Arjun and Mitali". */
export function listNames(names: string[]): string {
  return names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
