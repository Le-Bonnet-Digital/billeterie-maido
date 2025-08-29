import { supabase } from './supabase';
import { getCurrentUser } from './auth';

export type ValidationActivity = 'poney' | 'tir_arc' | 'luge_bracelet';

interface ReservationLookup {
  id: string;
  reservation_number: string;
  payment_status: 'paid' | 'pending' | 'refunded';
  time_slots?: { activity?: 'poney' | 'tir_arc' } | null;
}

export async function validateReservation(
  reservationCode: string,
  activity: ValidationActivity
): Promise<{ ok: true; reservationId: string } | { ok: false; reason: string }> {
  const trimmed = reservationCode.trim();
  if (!trimmed) return { ok: false, reason: 'Code de réservation manquant' };

  const me = await getCurrentUser();
  if (!me) return { ok: false, reason: 'Non authentifié' };

  // 1) Lookup reservation by reservation_number
  const { data, error } = await supabase
    .from('reservations')
    .select('id,reservation_number,payment_status,time_slots(activity)')
    .eq('reservation_number', trimmed)
    .single<ReservationLookup>();

  if (error || !data) return { ok: false, reason: 'Réservation introuvable' };
  if (data.payment_status !== 'paid') return { ok: false, reason: 'Paiement non validé' };

  // 2) Activity guard for slot-bound activities
  if (activity === 'poney' || activity === 'tir_arc') {
    const slotActivity = data.time_slots?.activity;
    if (slotActivity !== activity) {
      return { ok: false, reason: `Réservation non prévue pour ${activity}` };
    }
  }

  // 3) Prevent duplicate validation (idempotent check)
  const { data: existing } = await supabase
    .from('reservation_validations')
    .select('id')
    .eq('reservation_id', data.id)
    .eq('activity', activity)
    .limit(1);
  if (existing && existing.length > 0) {
    return { ok: false, reason: 'Déjà validé' };
  }

  // 4) Insert validation
  const { error: insertError } = await supabase
    .from('reservation_validations')
    .insert({ reservation_id: data.id, activity, validated_by: me.id });
  if (insertError) return { ok: false, reason: 'Erreur enregistrement validation' };

  return { ok: true, reservationId: data.id };
}

