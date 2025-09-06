import ReservationValidationForm from '../../components/validation/ReservationValidationForm';

export default function PonyValidation() {
  return (
    <div className="max-w-2xl mx-auto">
      <ReservationValidationForm
        activity="poney"
        title="Validation Poney"
        help="Scannez le QR code du billet ou saisissez manuellement le numéro de réservation pour valider l'accès à l'activité poney."
      />
    </div>
  );
}
