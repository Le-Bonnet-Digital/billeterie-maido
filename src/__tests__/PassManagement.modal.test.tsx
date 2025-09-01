import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import PassManagement from '../pages/admin/PassManagement';
import { render, screen, waitFor } from '../test/utils';
import { act } from '@testing-library/react';

describe('PassManagement add/edit modal', () => {
  it('renders a scrollable dialog for long content', async () => {
    await act(async () => {
      render(<PassManagement />);
    });

    // Open the creation modal
    const openBtn = await screen.findByRole('button', {
      name: /Nouveau Pass/i,
    });
    await act(async () => {
      await userEvent.click(openBtn);
    });

    // Dialog should be present with proper role
    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(dialog).toBeInTheDocument());

    // Container should constrain height and allow internal scroll
    // Max height enforced via inline style for compatibility
    expect((dialog as HTMLElement).style.maxHeight).toBe('90vh');

    // The form section should be scrollable
    const formRegion = dialog.querySelector('form');
    expect(formRegion).toBeTruthy();
    expect(formRegion?.className).toMatch(/overflow-y-auto/);

    // Accessibility sanity checks
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('opens modal without maximum update depth warning', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await act(async () => {
      render(<PassManagement />);
    });

    const openBtn = await screen.findByRole('button', {
      name: /Nouveau Pass/i,
    });
    await act(async () => {
      await userEvent.click(openBtn);
    });

    await screen.findByRole('dialog');

    const hasWarning = errorSpy.mock.calls.some(([msg]) =>
      String(msg).includes('Maximum update depth exceeded'),
    );
    expect(hasWarning).toBe(false);
    errorSpy.mockRestore();
  });
});
