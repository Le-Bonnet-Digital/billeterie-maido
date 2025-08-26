/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signInWithEmail, signOut } from '../auth';
import { supabase } from '../supabase';
import { toast } from 'react-hot-toast';

// Mock toast
vi.mock('react-hot-toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() }
}));

// Mock supabase
const insertMock = vi.fn().mockResolvedValue({ error: null });
const singleMock = vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null });
const eqMock = vi.fn().mockReturnValue({ single: singleMock });
const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
const fromMock = vi.fn().mockReturnValue({ select: selectMock, insert: insertMock });

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn()
    },
    from: fromMock
  }
}));

// Ensure mocks reset before each test
beforeEach(() => {
  vi.clearAllMocks();
  (supabase.auth as any).signInWithPassword = vi.fn();
  (supabase.auth as any).signOut = vi.fn();
  singleMock.mockResolvedValue({ data: { role: 'admin' }, error: null });
  insertMock.mockResolvedValue({ error: null });
});

describe('signInWithEmail', () => {
  it('should return user with admin role when found in DB', async () => {
    const user = { id: 'user-1', email: 'test@example.com' };
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user },
      error: null
    });

    const result = await signInWithEmail('test@example.com', 'password');
    expect(result).toEqual({ id: 'user-1', email: 'test@example.com', role: 'admin' });
  });

  it('should assign client role when user does not exist', async () => {
    singleMock.mockResolvedValue({ data: null, error: { message: 'No user' } });

    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user: { id: 'user-2', email: 'client@example.com' } },
      error: null
    });

    const result = await signInWithEmail('client@example.com', 'password');

    expect(result?.role).toBe('client');
    expect(insertMock).toHaveBeenCalledWith({
      id: 'user-2',
      email: 'client@example.com',
      role: 'client'
    });
  });

  it('should return null and show error on failure', async () => {
    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user: null },
      error: new Error('Invalid credentials')
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
