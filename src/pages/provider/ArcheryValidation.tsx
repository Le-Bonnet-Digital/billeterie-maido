import ReservationValidationForm from '../../components/validation/ReservationValidationForm';

export default function ArcheryValidation() {
  return (
    <div className="max-w-2xl mx-auto">
      <ReservationValidationForm
        activity="tir_arc"
        title="Validation Tir à l'arc"
        help="Scannez le QR code du billet ou saisissez manuellement le numéro de réservation pour valider l'accès à l'activité tir à l'arc."
      />
    </div>
  );
}
