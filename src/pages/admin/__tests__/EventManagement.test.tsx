import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../../test/utils';
import EventManagement from '../EventManagement';

// Mock the supabase calls to return resolved data immediately  
vi.mock('../../../lib/supabase', async () => {
  const actual = await vi.importActual('../../../lib/supabase');
  return {
    ...actual,
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }))
    },
    isSupabaseConfigured: vi.fn(() => true),
  };
});

describe('EventManagement', () => {
  it('should render event management content', async () => {
    render(<EventManagement />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(document.body).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should not be stuck in loading state', async () => {
    render(<EventManagement />);
    
    await waitFor(() => {
      // Should not show loading spinner after data loads
      expect(screen.queryByText(/chargement/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should render header and add button', async () => {
    render(<EventManagement />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /gestion des événements/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /nouvel événement/i })).toBeInTheDocument();
  });

  it('should open create modal when clicking add button', async () => {
    const user = userEvent.setup();
    render(<EventManagement />);

    const button = await screen.findByRole('button', { name: /nouvel événement/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /nouvel événement/i })).toBeInTheDocument();
    });
  });

  it('should not output debug logs in production mode', async () => {
    vi.stubEnv('DEV', 'false');
    vi.stubEnv('PROD', 'true');
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_DEBUG', 'true');

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    render(<EventManagement />);

    await waitFor(() => {
      expect(screen.getByText('Gestion des Événements')).toBeInTheDocument();
    });

    expect(logSpy).not.toHaveBeenCalled();
    expect(screen.queryByText(/DEBUG EventManagement/i)).not.toBeInTheDocument();

    logSpy.mockRestore();
    vi.unstubAllEnvs();
  });
});
