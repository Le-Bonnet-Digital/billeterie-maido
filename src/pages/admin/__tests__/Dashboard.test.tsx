import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../../test/utils';
import AdminDashboard from '../Dashboard';

// Mock the supabase calls to return resolved data immediately  
vi.mock('../../../lib/supabase', async () => {
  const actual = await vi.importActual('../../../lib/supabase');
  return {
    ...actual,
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          count: vi.fn(() => Promise.resolve({ count: 5, error: null })),
          eq: vi.fn(() => ({
            count: vi.fn(() => Promise.resolve({ count: 3, error: null }))
          }))
        }))
      }))
    },
    isSupabaseConfigured: vi.fn(() => true),
  };
});

describe('AdminDashboard', () => {
  it('displays statistics and quick links', async () => {
    render(<AdminDashboard />);

    // Verify main heading and a quick action link
    expect(await screen.findByText(/Tableau de Bord/i)).toBeInTheDocument();
    expect(screen.getByText(/Événements Total/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Créer un Événement/i })
    ).toBeInTheDocument();
  });

  it('renders without console warnings', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<AdminDashboard />);

    await screen.findByText(/Tableau de Bord/i);

    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});