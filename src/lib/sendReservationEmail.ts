import { supabase } from './supabase';

export interface ReservationEmailPayload {
  email: string;
  reservationId: string;
}

export async function sendReservationEmail(payload: ReservationEmailPayload) {
  const { error } = await supabase.functions.invoke('send-reservation-email', {
    body: payload,
  });

  if (error) {
    throw new Error(error.message);
  }
}

