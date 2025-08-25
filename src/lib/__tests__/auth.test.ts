import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('react-hot-toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() }
}));

const insertMock = vi.fn().mockResolvedValue({ error: null });
const singleMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'No user' } });
const eqMock = vi.fn().mockReturnValue({ single: singleMock });
const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
const fromMock = vi.fn().mockReturnValue({ select: selectMock, insert: insertMock });

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
    },
    from: fromMock
  }
}));

describe('signInWithEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    singleMock.mockResolvedValue({ data: null, error: { message: 'No user' } });
    insertMock.mockResolvedValue({ error: null });
  });

  it('should assign client role when user does not exist', async () => {
    const { signInWithEmail } = await import('../auth');
    const { supabase } = await import('../supabase');

    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
      error: null
    });

    const user = await signInWithEmail('test@example.com', 'password');

    expect(user?.role).toBe('client');
    expect(user?.role).not.toBe('admin');
    expect(insertMock).toHaveBeenCalledWith({
      id: 'user-1',
      email: 'test@example.com',
      role: 'client'
    });
  });
});

