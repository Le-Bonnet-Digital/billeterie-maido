import ReservationValidationForm from '../../components/validation/ReservationValidationForm';

export default function LugeValidation() {
  return (
    <div className="max-w-2xl mx-auto">
      <ReservationValidationForm
        activity="luge_bracelet"
        title="Remise Bracelet Luge"
        help="Scannez le QR code du billet ou saisissez manuellement le numéro de réservation pour remettre le bracelet luge (accès illimité avec garantie 3 tours minimum)."
      />
    </div>
  );
}
