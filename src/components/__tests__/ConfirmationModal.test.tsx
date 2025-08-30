import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../test/utils';
import ConfirmationModal from '../ConfirmationModal';

vi.mock('qrcode', () => ({
  default: { toDataURL: vi.fn().mockResolvedValue('data:qr') }
}));

describe('ConfirmationModal Component', () => {
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    reservationNumber: 'RES-123456',
    email: 'test@example.com',
    eventName: 'Test Event',
    passName: 'Test Pass',
    price: 25,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(<ConfirmationModal {...mockProps} isOpen={false} />);
    expect(screen.queryByText(/réservation confirmée/i)).not.toBeInTheDocument();
  });

  it('should render confirmation details when open', async () => {
    render(<ConfirmationModal {...mockProps} />);

    expect(screen.getByText(/réservation confirmée/i)).toBeInTheDocument();
    expect(screen.getByText('RES-123456')).toBeInTheDocument();
    expect(screen.getByText('Test Event')).toBeInTheDocument();
    expect(screen.getByText('Test Pass')).toBeInTheDocument();
    expect(screen.getByText('25€')).toBeInTheDocument();
    expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
    expect(await screen.findByAltText('QR RES-123456')).toBeInTheDocument();
  });

  it('should render activity information when provided', () => {
    const propsWithDetails = {
      ...mockProps,
      timeSlot: {
        slot_time: '2024-01-01T10:00:00Z'
      },
      activityName: 'Poney'
    };

    render(<ConfirmationModal {...propsWithDetails} />);

    expect(screen.getByText(/Poney/i)).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    render(<ConfirmationModal {...mockProps} />);
    
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('should trigger download when download button is clicked', () => {
    render(<ConfirmationModal {...mockProps} />);
    
    fireEvent.click(screen.getByText(/télécharger le billet/i));
    // Verify that the download was triggered (mocked in setup)
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });
});

