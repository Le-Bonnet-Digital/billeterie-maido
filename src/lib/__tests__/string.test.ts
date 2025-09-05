import { describe, it, expect } from 'vitest';
import { slugify } from '../string';

describe('string utils', () => {
  it('slugifies with accents and spaces', () => {
    expect(slugify('Événement spécial')).toBe('evenement-special');
  });

  it('trims dashes', () => {
    expect(slugify('  --Hello--World--  ')).toBe('hello-world');
  });
});
