import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ReservationValidationForm from '../ReservationValidationForm';

vi.mock('../../../lib/validation', () => ({
  validateReservation: vi.fn(),
}));

describe('ReservationValidationForm', () => {
  it('hides stop camera button when scanner inactive', () => {
    render(<ReservationValidationForm activity="poney" title="Validation" />);
    expect(screen.queryByText(/Arrêter la caméra/i)).toBeNull();
  });
});
