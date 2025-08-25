import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signInWithEmail, signOut } from '../auth';
import { supabase } from '../supabase';
import { toast } from 'react-hot-toast';

// Ensure auth methods exist on supabase mock
beforeEach(() => {
  vi.clearAllMocks();
  (supabase.auth as any).signInWithPassword = vi.fn();
  (supabase.auth as any).signOut = vi.fn();
});

describe('signInWithEmail', () => {
  it('should return user when sign in succeeds', async () => {
    const user = { id: 'user-1', email: 'test@example.com' };
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user },
      error: null,
    });
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
      insert: vi.fn(),
    });

    const result = await signInWithEmail('test@example.com', 'password');
    expect(result).toEqual({ id: 'user-1', email: 'test@example.com', role: 'admin' });
  });

  it('should return null and show error on failure', async () => {
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user: null },
      error: new Error('Invalid credentials'),
    });

    const result = await signInWithEmail('test@example.com', 'wrong');
    expect(result).toBeNull();
    expect(toast.error).toHaveBeenCalled();
  });
});

describe('signOut', () => {
  it('should show success when sign out succeeds', async () => {
    (supabase.auth.signOut as any).mockResolvedValue({ error: null });
    await signOut();
    expect(toast.success).toHaveBeenCalledWith('Déconnexion réussie');
  });

  it('should show error when sign out fails', async () => {
    (supabase.auth.signOut as any).mockResolvedValue({ error: new Error('fail') });
    await signOut();
    expect(toast.error).toHaveBeenCalledWith('Erreur lors de la déconnexion');
  });
});
