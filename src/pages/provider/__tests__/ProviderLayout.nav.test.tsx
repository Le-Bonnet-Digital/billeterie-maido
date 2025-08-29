import React from 'react';
import { render, screen } from '@testing-library/react';
import ProviderLayout from '../../provider/ProviderLayout';

vi.mock('../../../lib/auth', () => ({
  getCurrentUser: vi.fn(async () => ({ id: 'u1', email: 'pony@test.com', role: 'pony_provider' })),
  signOut: vi.fn(async () => {}),
}));

describe('ProviderLayout navigation', () => {
  it('shows only Pony and Stats for pony providers', async () => {
    render(<ProviderLayout />);
    // Wait for login check
    expect(await screen.findByText('Espace Prestataire')).toBeInTheDocument();
    expect(screen.getByText('Poney')).toBeInTheDocument();
    // Stats link should be rendered
    expect(screen.getByText('Statistiques')).toBeInTheDocument();
    // Not visible
    expect(screen.queryByText(/Tir à l'arc/i)).toBeNull();
    expect(screen.queryByText('Luge')).toBeNull();
  });
});

