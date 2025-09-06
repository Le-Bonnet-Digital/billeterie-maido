import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
/* eslint-disable @typescript-eslint/no-explicit-any -- Tests use flexible fakes for query builders */

const successToast = vi.fn();
const errorToast = vi.fn();
vi.mock('react-hot-toast', () => ({
  toast: {
    success: (...args: unknown[]) => successToast(...args),
    error: (...args: unknown[]) => errorToast(...args),
  },
}));

vi.mock('../../../lib/auth', () => ({
  getCurrentUser: vi.fn(async () => ({
    id: 'prov-1',
    email: 'p@test.com',
    role: 'pony_provider',
  })),
}));

describe('ReservationValidationForm', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('validates reservation successfully', async () => {
    const from = vi.fn();
    const builder: any = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      single: vi.fn(async () => ({
        data: {
          id: 'res-1',
          payment_status: 'paid',
        },
        error: null,
      })),
    };
    // first select: reservations .single -> paid
    // second select: reservation_validations -> none existing
    const builder2: any = {
      select: vi.fn(() => builder2),
      eq: vi.fn(() => builder2),
      limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
      insert: vi.fn(() => ({ error: null })),
    };

    from.mockImplementation((table: string) => {
      if (table === 'reservations') return builder;
      if (table === 'reservation_validations') return builder2;
      return builder2;
    });

    vi.doMock('../../../lib/supabase', () => ({
      supabase: { from },
    }));

    const { default: Form } = await import('../ReservationValidationForm');
    render(<Form activity="poney" title="Validation Poney" />);
    fireEvent.change(
      screen.getByPlaceholderText(/Scannez ou saisissez le code/i),
      { target: { value: 'RES2025-0001' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /Valider/i }));
    await waitFor(() => expect(successToast).toHaveBeenCalled());
  });

  it('handles duplicate validation', async () => {
    const from = vi.fn();
    const builder: any = {
      select: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      single: vi.fn(async () => ({
        data: {
          id: 'res-1',
          payment_status: 'paid',
        },
        error: null,
      })),
    };
    const builder2: any = {
      select: vi.fn(() => builder2),
      eq: vi.fn(() => builder2),
      limit: vi.fn(() =>
        Promise.resolve({ data: [{ id: 'v1' }], error: null }),
      ),
      insert: vi.fn(() => ({ error: null })),
    };
    from.mockImplementation((table: string) => {
      if (table === 'reservations') return builder;
      if (table === 'reservation_validations') return builder2;
      return { insert: vi.fn() } as any;
    });

    vi.doMock('../../../lib/supabase', () => ({
      supabase: { from },
    }));

    const { default: Form } = await import('../ReservationValidationForm');
    render(<Form activity="poney" title="Validation Poney" />);
    fireEvent.change(
      screen.getByPlaceholderText(/Scannez ou saisissez le code/i),
      { target: { value: 'RES2025-0001' } },
    );
    fireEvent.click(screen.getByRole('button', { name: /Valider/i }));
    await waitFor(() =>
      expect(errorToast).toHaveBeenCalledWith(
        expect.stringMatching(/Déjà validé/),
      ),
    );
  });
});
