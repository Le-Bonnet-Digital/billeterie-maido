import { describe, it, expect } from 'vitest';
import { render, screen } from '../../../test/utils';
import AdminLayout from '../AdminLayout';

describe('AdminLayout', () => {
  it('should render admin panel title', () => {
    render(<AdminLayout />);
    
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    expect(screen.getByText(/gestion des événements/i)).toBeInTheDocument();
  });

  it('should render navigation menu', () => {
    render(<AdminLayout />);

    expect(screen.getByText(/tableau de bord/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /événements/i })).toBeInTheDocument();
    expect(screen.getByText(/pass/i)).toBeInTheDocument();
    expect(screen.getByText(/créneaux/i)).toBeInTheDocument();
    expect(screen.getByText(/réservations/i)).toBeInTheDocument();
    expect(screen.getByText(/reporting/i)).toBeInTheDocument();
    expect(screen.getByText(/communication/i)).toBeInTheDocument();
    expect(screen.getByText(/paramètres/i)).toBeInTheDocument();
  });

  it('should render back to site link', () => {
    render(<AdminLayout />);
    
    expect(screen.getByText(/retour au site/i)).toBeInTheDocument();
  });

  it('should render outlet for nested routes', () => {
    render(<AdminLayout />);
    
    expect(screen.getByText('Outlet')).toBeInTheDocument();
  });
});