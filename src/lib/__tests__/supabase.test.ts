import { describe, it, expect, vi } from 'vitest';
import { isSupabaseConfigured } from '../supabase';

// Mock environment variables
vi.mock('../../lib/supabase', async () => {
  const actual = await vi.importActual('../../lib/supabase');
  return {
    ...actual,
    isSupabaseConfigured: vi.fn(),
  };
});

describe('Supabase Configuration', () => {
  it('should return true when Supabase is properly configured', () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    expect(isSupabaseConfigured()).toBe(true);
  });

  it('should return false when Supabase is not configured', () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    expect(isSupabaseConfigured()).toBe(false);
  });
});