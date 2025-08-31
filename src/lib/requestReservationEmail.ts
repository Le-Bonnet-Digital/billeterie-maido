import { supabase } from './supabase';
import { logger } from './logger';

export async function requestReservationEmail(params: { email: string }): Promise<{ found: boolean; sent?: boolean }> {
  try {
    const { data, error } = await supabase.functions.invoke<{ found: boolean; sent?: boolean }>(
      'request-reservation-email',
      {
        body: { email: params.email },
      },
    );

    if (error) throw new Error(error.message);
    return data ?? { found: false };
  } catch (err) {
    logger.error('Erreur requestReservationEmail', { error: err });
    throw err;
  }
}
