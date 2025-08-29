import { supabase } from './supabase';

export async function requestReservationEmail(params: { email: string }): Promise<{ found: boolean; sent?: boolean } | null> {
  try {
    const { data, error } = await supabase.functions.invoke<{ found: boolean; sent?: boolean }>('request-reservation-email', {
      body: { email: params.email },
    });

    if (error) throw new Error(error.message);
    return data;
  } catch {
    return null;
  }
}
