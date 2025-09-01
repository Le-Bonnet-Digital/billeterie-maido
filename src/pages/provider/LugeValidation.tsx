import ReservationValidationForm from '../../components/validation/ReservationValidationForm';

export default function LugeValidation() {
  return (
    <ReservationValidationForm
      activity="luge_bracelet"
      title="Remise Bracelet Luge"
      help="Scannez le QR/numéro de réservation pour remettre le bracelet (luge illimitée – garantie 3 tours)."
    />
  );
}
