import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import { toast } from 'react-hot-toast';
import FindTicket from '../FindTicket';

describe('FindTicket Page', () => {
  it('should render search form', () => {
    render(<FindTicket />);
    
    expect(screen.getByText(/retrouver mon billet/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/adresse e-mail/i)).toBeInTheDocument();
    expect(screen.getByText(/rechercher mes billets/i)).toBeInTheDocument();
  });

  it('should show error when email is empty', async () => {
    render(<FindTicket />);
    
    fireEvent.click(screen.getByText(/rechercher mes billets/i));
    
    // Toast error should be called (mocked in setup)
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Veuillez saisir votre adresse e-mail');
    });
  });

  it('should render security information', () => {
    render(<FindTicket />);
    
    expect(screen.getByText(/sécurité et confidentialité/i)).toBeInTheDocument();
  });

  it('should render contact information', () => {
    render(<FindTicket />);
    
    expect(screen.getByText(/vous rencontrez des difficultés/i)).toBeInTheDocument();
  });
});
