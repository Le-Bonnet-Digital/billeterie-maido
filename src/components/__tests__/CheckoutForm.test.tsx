import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/utils';
import CheckoutForm from '../CheckoutForm';

describe('CheckoutForm Component', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render all form fields', () => {
    render(<CheckoutForm onSubmit={mockOnSubmit} loading={false} />);
    
    expect(screen.getByLabelText('Prénom *')).toBeInTheDocument();
    expect(screen.getByLabelText('Nom *')).toBeInTheDocument();
    expect(screen.getByLabelText(/adresse email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/téléphone/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Adresse *')).toBeInTheDocument();
    expect(screen.getByLabelText(/ville/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/code postal/i)).toBeInTheDocument();
  });

  it('should call onSubmit with form data when submitted', async () => {
    render(<CheckoutForm onSubmit={mockOnSubmit} loading={false} />);
    
    fireEvent.change(screen.getByLabelText('Prénom *'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Nom *'), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/adresse email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/téléphone/i), { target: { value: '0692123456' } });
    fireEvent.change(screen.getByLabelText('Adresse *'), { target: { value: '123 Test St' } });
    fireEvent.change(screen.getByLabelText(/ville/i), { target: { value: 'Saint-Denis' } });
    fireEvent.change(screen.getByLabelText(/code postal/i), { target: { value: '97400' } });
    
    fireEvent.click(screen.getByText(/confirmer et payer/i));
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '0692123456',
        address: '123 Test St',
        city: 'Saint-Denis',
        postalCode: '97400'
      });
    });
  });

  it('should show loading state when loading is true', () => {
    render(<CheckoutForm onSubmit={mockOnSubmit} loading={true} />);
    
    expect(screen.getByText(/traitement/i)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
