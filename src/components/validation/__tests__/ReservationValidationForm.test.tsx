import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ReservationValidationForm from '../ReservationValidationForm';
import { validateReservation } from '../../../lib/validation';

vi.mock('../../../lib/validation', () => ({
  validateReservation: vi.fn(),
}));

describe('ReservationValidationForm', () => {
  it('hides stop camera button when scanner inactive', () => {
    render(<ReservationValidationForm activity="poney" title="Validation" />);
    expect(screen.queryByText(/Arrêter la caméra/i)).toBeNull();
  });

  it('shows reservation details when ticket already validated', async () => {
    const mockValidate = validateReservation as unknown as vi.Mock;
    mockValidate.mockResolvedValueOnce({
      status: {
        alreadyValidated: true,
        validated: false,
        invalid: false,
        notFound: false,
        unpaid: false,
        wrongActivity: false,
      },
      history: [
        {
          validated_at: '2025-09-06T20:57:25.000Z',
          validated_by: 'admin',
          validated_by_email: 'admin@test.com',
        },
      ],
      reservation: {
        number: 'RES-2025-249-7908',
        client_email: 'client@example.com',
        pass: { name: 'Pass Day' },
        time_slot: { slot_time: '2025-09-06T20:00:00.000Z' },
      },
      requested_activity: 'poney',
      ok: false,
    });

    render(<ReservationValidationForm activity="poney" title="Validation" />);

    fireEvent.change(screen.getByPlaceholderText(/Saisissez le code/i), {
      target: { value: 'RES-2025-249-7908' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Valider le billet/i }));

    const msg = await screen.findByText(/Billet déjà validé le/i);
    expect(msg.textContent).toContain('Réservation: RES-2025-249-7908');
    expect(msg.textContent).toContain('Client: client@example.com');
    expect(msg.textContent).toContain('Pass: Pass Day');
    expect(msg.textContent).toMatch(/Créneau: \d{2}:\d{2}/);
  });
});
