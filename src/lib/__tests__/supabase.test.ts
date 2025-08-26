import { describe, it, expect, vi, afterAll } from 'vitest';

describe('Supabase Configuration', () => {
  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it('should return true when Supabase is properly configured', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

    vi.resetModules();
    const { isSupabaseConfigured } = await import('../supabase');

    expect(isSupabaseConfigured()).toBe(true);
  });

  it('should return false when Supabase is not configured', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    vi.resetModules();
    const { isSupabaseConfigured } = await import('../supabase');

    expect(isSupabaseConfigured()).toBe(false);
  });
});


