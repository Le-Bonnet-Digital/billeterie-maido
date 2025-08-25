import { supabase } from './supabase';

/**
 * Payload utilisé pour envoyer un e-mail de réservation.
 */
export interface ReservationEmailPayload {
  email: string;
  reservationId: string;
}

/**
 * Déclenche l'envoi d'un e-mail de confirmation de réservation.
 * @param payload Données nécessaires à l'envoi
 * @throws Si la fonction Supabase renvoie une erreur
 */
export async function sendReservationEmail(payload: ReservationEmailPayload): Promise<void> {
  const { error } = await supabase.functions.invoke('send-reservation-email', {
    body: payload,
  });

  if (error) {
    throw new Error(error.message);
  }
}

