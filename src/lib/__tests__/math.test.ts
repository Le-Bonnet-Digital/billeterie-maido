import { describe, it, expect } from 'vitest';
import { clamp } from '../math';

describe('math utils', () => {
  it('clamps below min', () => {
    expect(clamp(1, 5, 10)).toBe(5);
  });

  it('clamps above max', () => {
    expect(clamp(15, 5, 10)).toBe(10);
  });
});
