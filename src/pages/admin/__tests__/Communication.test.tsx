import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../../../test/utils';
import Communication from '../Communication';

describe('Communication', () => {
  it('should render communication title', async () => {
    render(<Communication />);
    
    await waitFor(() => {
      expect(screen.getByText(/communication/i)).toBeInTheDocument();
    });
  });

  it('should render email form fields', async () => {
    render(<Communication />);
    
    await waitFor(() => {
      expect(screen.getByText(/événement cible/i)).toBeInTheDocument();
      expect(screen.getByText(/objet de l'email/i)).toBeInTheDocument();
      expect(screen.getByText(/contenu de l'email/i)).toBeInTheDocument();
    });
  });

  it('should render templates button', async () => {
    render(<Communication />);
    
    await waitFor(() => {
      expect(screen.getByText(/modèles/i)).toBeInTheDocument();
    });
  });

  it('should open templates modal when button clicked', async () => {
    render(<Communication />);
    
    await waitFor(() => {
      fireEvent.click(screen.getByText(/modèles/i));
      expect(screen.getByText(/modèles d'email/i)).toBeInTheDocument();
    });
  });

  it('should render send button', async () => {
    render(<Communication />);
    
    await waitFor(() => {
      expect(screen.getByText(/envoyer l'email/i)).toBeInTheDocument();
    });
  });
});