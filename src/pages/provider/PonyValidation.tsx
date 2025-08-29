import React from 'react';
import ReservationValidationForm from '../../components/validation/ReservationValidationForm';

export default function PonyValidation() {
  return (
    <ReservationValidationForm
      activity="poney"
      title="Validation Poney"
      help="Scannez le QR/numéro de réservation pour valider l'inscription poney."
    />
  );
}

