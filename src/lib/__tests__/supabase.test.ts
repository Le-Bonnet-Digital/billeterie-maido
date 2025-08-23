import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock environment variables using vi.hoisted
const mockEnv = vi.hoisted(() => ({
  VITE_SUPABASE_URL: '',
  VITE_SUPABASE_ANON_KEY: '',
}));

vi.mock('~/.vite/import-meta-env', () => ({
  default: mockEnv,
}));

// Import after mocking
const { isSupabaseConfigured } = await import('../supabase');

describe('Supabase Configuration', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it('should return true when Supabase is properly configured', () => {
    mockEnv.VITE_SUPABASE_URL = 'https://test.supabase.co';
    mockEnv.VITE_SUPABASE_ANON_KEY = 'test-key';
    
    expect(isSupabaseConfigured()).toBe(true);
  });

  it('should return false when Supabase is not configured', () => {
    mockEnv.VITE_SUPABASE_URL = '';
    mockEnv.VITE_SUPABASE_ANON_KEY = '';
    
    expect(isSupabaseConfigured()).toBe(false);
  });
});