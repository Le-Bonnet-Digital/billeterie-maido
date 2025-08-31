// src/components/__tests__/Settings.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/utils';
import { act } from '@testing-library/react';
import { toast } from 'react-hot-toast';
import { safeStorage } from '../../../lib/storage';

vi.mock('../../../lib/auth', async () => {
  const actual =
    await vi.importActual<typeof import('../../../lib/auth')>(
      '../../../lib/auth',
    );
  return {
    ...actual,
    getCurrentUser: vi.fn(),
  };
});

import { getCurrentUser } from '../../../lib/auth';
import Settings from '../Settings';

describe('Settings Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(toast, 'success').mockImplementation(() => 'ok');
    vi.spyOn(toast, 'error').mockImplementation(() => 'err');
    return vi.mocked(getCurrentUser).mockResolvedValue({
      id: 'u1',
      email: 'admin@example.com',
      role: 'admin',
    });
  });

  it('loads user and saved settings', async () => {
    vi.spyOn(safeStorage, 'getItem').mockReturnValue(
      JSON.stringify({
        site_name: 'My Site',
        site_description: 'Desc',
        contact_email: 'contact@mysite.com',
        notification_email: 'notify@mysite.com',
        maintenance_mode: true,
        registration_enabled: false,
      }),
    );

    await act(async () => {
      render(<Settings />);
    });

    expect(await screen.findByDisplayValue('My Site')).toBeInTheDocument();
    expect(screen.getByDisplayValue('contact@mysite.com')).toBeInTheDocument();
    expect(
      await screen.findByDisplayValue('admin@example.com'),
    ).toBeInTheDocument();
    expect(getCurrentUser).toHaveBeenCalled();
  });

  it('updates state on user input and saves successfully', async () => {
    const user = userEvent.setup();
    vi.spyOn(safeStorage, 'getItem').mockReturnValue(null);
    const setItemMock = vi
      .spyOn(safeStorage, 'setItem')
      .mockImplementation(() => {});

    await act(async () => {
      render(<Settings />);
    });

    const nameInput = await screen.findByDisplayValue('BilletEvent');
    await act(async () => {
      await user.clear(nameInput);
      await user.type(nameInput, 'New Name');
    });

    const saveBtn = screen.getByRole('button', {
      name: /sauvegarder les paramètres/i,
    });
    await act(async () => {
      await user.click(saveBtn);
    });

    await waitFor(() =>
      expect(setItemMock).toHaveBeenCalledWith(
        'system_settings',
        expect.stringContaining('"site_name":"New Name"'),
      ),
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        'Paramètres sauvegardés avec succès',
      ),
    );
  });

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup();
    vi.spyOn(safeStorage, 'getItem').mockReturnValue(null);

    await act(async () => {
      render(<Settings />);
    });

    const emailInput = await screen.findByDisplayValue(
      'contact@billetevent.com',
    );
    await act(async () => {
      await user.clear(emailInput);
      await user.type(emailInput, 'invalid');
    });

    await waitFor(() => expect(emailInput).toBeInvalid());
  });

  it('shows error toast when save fails', async () => {
    const user = userEvent.setup();
    vi.spyOn(safeStorage, 'getItem').mockReturnValue(null);
    vi.spyOn(safeStorage, 'setItem').mockImplementation(() => {
      throw new Error('fail');
    });

    await act(async () => {
      render(<Settings />);
    });

    const saveBtn = await screen.findByRole('button', {
      name: /sauvegarder les paramètres/i,
    });
    await act(async () => {
      await user.click(saveBtn);
    });

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Erreur lors de la sauvegarde'),
    );
  });
});
