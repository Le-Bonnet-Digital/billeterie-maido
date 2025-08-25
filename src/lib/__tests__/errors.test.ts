import { describe, it, expect } from 'vitest';
import { getErrorMessage } from '../errors';

describe('getErrorMessage', () => {
  it('returns message from Error instance', () => {
    const error = new Error('boom');
    expect(getErrorMessage(error)).toBe('boom');
  });

  it('extracts message from objects with message property', () => {
    const errorLike = { message: 'bad' } as const;
    expect(getErrorMessage(errorLike)).toBe('bad');
  });

  it('handles non-standard values', () => {
    expect(getErrorMessage('oops')).toBe('oops');
    expect(getErrorMessage({ foo: 'bar' })).toBe(JSON.stringify({ foo: 'bar' }));
    expect(getErrorMessage(null)).toBe('');
  });
});
