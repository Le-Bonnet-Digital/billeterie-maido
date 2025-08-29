import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
// Imported dynamically after mocks

const successToast = vi.fn();
const errorToast = vi.fn();
vi.mock('react-hot-toast', () => ({
  toast: {
    success: (...args: unknown[]) => successToast(...args),
    error: (...args: unknown[]) => errorToast(...args),
  },
}));

vi.mock('../../../lib/auth', () => ({
  getCurrentUser: vi.fn(async () => ({ id: 'admin-1', email: 'admin@test.com', role: 'admin' })),
}));

// We'll override supabase.from at runtime after importing the component

describe('Admin UserManagement', () => {
  it('searches users and updates role', async () => {
    const users = [
      { id: 'u1', email: 'prov@test.com', role: 'client' as const },
    ];

    // Minimal builder interface matching the calls used by the component
    interface UsersQueryBuilder {
      select: (cols?: string) => UsersQueryBuilder;
      ilike: (
        column: string,
        pattern: string
      ) => Promise<{ data: typeof users; error: null }>;
      limit: (
        n: number
      ) => Promise<{ data: typeof users; error: null }>;
      update: (
        data: Partial<(typeof users)[number]>
      ) => UsersQueryBuilder;
      eq: (column: string, value: string) => { error: null };
    }

    const usersBuilder: UsersQueryBuilder = {
      select: vi.fn(() => usersBuilder),
      ilike: vi.fn(async () => ({ data: users, error: null })),
      limit: vi.fn(async () => ({ data: users, error: null })),
      update: vi.fn(() => usersBuilder),
      eq: vi.fn(() => ({ error: null })),
    };

    const { default: UserManagement } = await import('../UserManagement');
    const supa = (await import('../../../lib/supabase')) as unknown as {
      supabase: { from: (table: string) => UsersQueryBuilder | Record<string, never> };
    };
    supa.supabase.from = vi.fn((table: string) => (table === 'users' ? usersBuilder : {}));

    render(<UserManagement />);
    const input = screen.getByPlaceholderText(/Rechercher par email/i);
    fireEvent.change(input, { target: { value: 'prov@test.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Rechercher/i }));
    expect(await screen.findByText('prov@test.com')).toBeInTheDocument();

    const select = await screen.findByLabelText(/Rôle de prov@test.com/i);
    fireEvent.change(select as HTMLSelectElement, { target: { value: 'pony_provider' } });
    await waitFor(() => expect(successToast).toHaveBeenCalled());
  });
});
