import ReservationValidationForm from '../../components/validation/ReservationValidationForm';

export default function ArcheryValidation() {
  return (
    <ReservationValidationForm
      activity="tir_arc"
      title="Validation Tir à l'arc"
      help="Scannez le QR/numéro de réservation pour valider l'inscription tir à l'arc."
    />
  );
}
