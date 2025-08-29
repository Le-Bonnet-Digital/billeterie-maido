import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/utils';

vi.mock('../../../lib/auth', async () => {
  const actual = await vi.importActual<
    typeof import('../../../lib/auth')
  >('../../../lib/auth');
  return {
    ...actual,
    getCurrentUser: vi.fn().mockResolvedValue({
      role: 'admin',
      email: 'admin@example.com',
    }),
    signOut: vi.fn(),
  };
});

import AdminLayout from '../AdminLayout';

describe('AdminLayout', () => {
  it('should render admin panel title', async () => {
    render(<AdminLayout />);

    expect(await screen.findByText('Admin Panel')).toBeInTheDocument();
    expect(
      await screen.findByText(/gestion des événements/i),
    ).toBeInTheDocument();
  });

  it('should render navigation menu', async () => {
    render(<AdminLayout />);

    expect(await screen.findByText(/tableau de bord/i)).toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: /événements/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/pass/i)).toBeInTheDocument();
    expect(await screen.findByText(/planning/i)).toBeInTheDocument();
    expect(
      await screen.findByRole('link', { name: /^activités$/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/gestion des flux/i)).toBeInTheDocument();
    expect(await screen.findByText(/réservations/i)).toBeInTheDocument();
    expect(await screen.findByText(/reporting/i)).toBeInTheDocument();
    expect(await screen.findByText(/communication/i)).toBeInTheDocument();
    expect(await screen.findByText(/paramètres/i)).toBeInTheDocument();
  });

  it('should render back to site link', async () => {
    render(<AdminLayout />);

    expect(await screen.findByText(/retour au site/i)).toBeInTheDocument();
  });

  it('should render outlet for nested routes', async () => {
    render(<AdminLayout />);

    expect(await screen.findByText('Outlet')).toBeInTheDocument();
  });
});
