import { describe, it, expect, vi, afterAll } from 'vitest';

const originalUrl = process.env.VITE_SUPABASE_URL;
const originalKey = process.env.VITE_SUPABASE_ANON_KEY;

describe('Supabase Configuration', () => {
  it('should return true when Supabase is properly configured', async () => {
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'test-key';

    vi.resetModules();
    const { isSupabaseConfigured } = await import('../supabase');

    expect(isSupabaseConfigured()).toBe(true);
  });

  it('should return false when Supabase is not configured', async () => {
    process.env.VITE_SUPABASE_URL = '';
    process.env.VITE_SUPABASE_ANON_KEY = '';

    vi.resetModules();
    const { isSupabaseConfigured } = await import('../supabase');

    expect(isSupabaseConfigured()).toBe(false);
  });
});

afterAll(() => {
  if (originalUrl !== undefined) {
    process.env.VITE_SUPABASE_URL = originalUrl;
  } else {
    delete process.env.VITE_SUPABASE_URL;
  }

  if (originalKey !== undefined) {
    process.env.VITE_SUPABASE_ANON_KEY = originalKey;
  } else {
    delete process.env.VITE_SUPABASE_ANON_KEY;
  }
});

