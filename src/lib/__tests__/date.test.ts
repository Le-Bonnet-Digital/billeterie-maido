import { describe, it, expect } from 'vitest';
import { formatDate } from '../date';

describe('date utils', () => {
  it('formats ISO strings', () => {
    expect(formatDate('2025-02-01')).toBe('01/02/2025');
  });

  it('supports locales', () => {
    expect(formatDate('2025-02-01', 'en-US')).toBe('2/1/2025');
  });
});
