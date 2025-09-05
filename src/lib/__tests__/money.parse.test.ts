import { describe, it, expect } from 'vitest';
import { parsePrice, formatPrice } from '../money';

describe('money utils', () => {
  it('parses formatted prices', () => {
    expect(parsePrice('12,50 €')).toBe(12.5);
    expect(parsePrice('100')).toBe(100);
  });

  it('throws on invalid price', () => {
    expect(() => parsePrice('abc')).toThrowError('Invalid price format');
  });

  it('formats price', () => {
    expect(formatPrice(10)).toContain('10');
  });
});
