// src/lib/slug.ts
/**
 * Normalise un libellé en "slug" robuste:
 * - supprime les accents
 * - remplace les séparateurs par underscore
 * - trim des underscores
 * - minuscule
 */
export function toSlug(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}
