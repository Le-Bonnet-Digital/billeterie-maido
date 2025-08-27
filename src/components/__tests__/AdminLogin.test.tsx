import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import AdminLogin from '../AdminLogin';
import { signInWithEmail } from '../../lib/auth';
import { toast } from 'react-hot-toast';
import { logger } from '../../lib/logger';

vi.mock('../../lib/auth', () => ({
  signInWithEmail: vi.fn(),
}));

vi.mock('../../lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('AdminLogin Component', () => {
  const mockOnLogin = vi.fn();
  const mockSignIn = signInWithEmail as unknown as vi.Mock;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('calls onLogin when admin credentials are valid', async () => {
    mockSignIn.mockResolvedValue({
      id: '1',
      email: 'admin@example.com',
      role: 'admin',
    });

    render(<AdminLogin onLogin={mockOnLogin} />);

    fireEvent.change(screen.getByLabelText(/adresse email/i), { target: { value: 'admin@example.com' } });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith({
        id: '1',
        email: 'admin@example.com',
        role: 'admin',
      });
    });
  });

  it('logs error and shows toast on login failure', async () => {
    mockSignIn.mockRejectedValue(new Error('fail'));

    render(<AdminLogin onLogin={mockOnLogin} />);

    fireEvent.change(screen.getByLabelText(/adresse email/i), { target: { value: 'admin@example.com' } });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));

    await waitFor(() => {
      expect(logger.error).toHaveBeenCalledWith('Erreur connexion', { error: expect.any(Error) });
      expect(toast.error).toHaveBeenCalledWith('Erreur de connexion');
    });
  });

  it('renders demo info based on VITE_SHOW_TEST_CREDENTIALS', () => {
    vi.stubEnv('VITE_SHOW_TEST_CREDENTIALS', 'true');
    const { rerender } = render(<AdminLogin onLogin={mockOnLogin} />);

    expect(
      screen.getByText(
        'Environnement de démonstration : les identifiants de test sont fournis sur demande.'
      )
    ).toBeInTheDocument();

    vi.stubEnv('VITE_SHOW_TEST_CREDENTIALS', 'false');
    rerender(<AdminLogin onLogin={mockOnLogin} />);

    expect(
      screen.queryByText(
        'Environnement de démonstration : les identifiants de test sont fournis sur demande.'
      )
    ).not.toBeInTheDocument();
  });
});
