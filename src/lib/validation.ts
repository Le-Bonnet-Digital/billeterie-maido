import { supabase } from './supabase';
import { getCurrentUser } from './auth';

// Reservation numbers follow the pattern
// RES-<year>-<day-of-year>-<4 random digits>
// Example: RES-2025-249-7908
const CODE_PATTERN = /^RES-\d{4}-\d{3}-\d{4}$/;

export type ValidationActivity = 'poney' | 'tir_arc' | 'luge_bracelet';

interface ReservationLookup {
  id: string;
  reservation_number: string;
  client_email: string;
  payment_status: 'paid' | 'pending' | 'refunded';
  created_at: string;
  pass?: { id: string; name: string } | null;
  event_activities?: { activities?: { name: string } | null } | null;
  time_slots?: { id: string; slot_time: string } | null;
}

export async function validateReservation(
  reservationCode: string,
  activity: ValidationActivity,
): Promise<
  | {
      ok: true;
      reservation: {
        id: string;
        number: string;
        client_email: string;
        payment_status: 'paid' | 'pending' | 'refunded';
        created_at: string;
        pass: { id: string; name: string } | null;
        activity: string;
        time_slot: { id: string; slot_time: string } | null;
      };
    }
  | {
      ok: true;
      alreadyValidated: true;
      validation: {
        validated_at: string;
        validated_by: string;
        validated_by_email?: string;
      };
    }
  | {
      ok: false;
      reason: string;
    }
> {
  const trimmed = reservationCode.trim();
  if (!trimmed) return { ok: false, reason: 'Code de réservation manquant' };
  if (!CODE_PATTERN.test(trimmed))
    return { ok: false, reason: 'Format de code invalide' };

  const me = await getCurrentUser();
  if (!me) return { ok: false, reason: 'Non authentifié' };

  // 1) Lookup reservation by reservation_number
  const { data, error } = await supabase
    .from('reservations')
    .select(
      'id,reservation_number,client_email,payment_status,created_at,pass:passes(id,name),event_activities(activities(name)),time_slots(id,slot_time)',
    )
    .eq('reservation_number', trimmed)
    .single<ReservationLookup>();

  if (error || !data) return { ok: false, reason: 'Réservation introuvable' };
  if (data.payment_status !== 'paid')
    return { ok: false, reason: 'Paiement non validé' };

  // 2) Activity guard - ensure reservation matches requested activity
  const reservedActivity = data.event_activities?.activities?.name;
  
  // 3) Check for existing validation first (before activity guard)
  const { data: existing, error: validationError } = await supabase
    .from('reservation_validations')
    .select('validated_at,validated_by')
    .eq('reservation_id', data.id)
    .eq('activity', activity)
    .limit(1);

  if (validationError) {
    return { ok: false, reason: 'Erreur vérification validation' };
  }

  if (existing && existing.length > 0) {
    const first = existing[0];
    const validationInfo = {
      validated_at: first.validated_at as string,
      validated_by: first.validated_by as string,
    };

    // Try to get the agent's email
    const { data: agent } = await supabase
      .from('users')
      .select('email')
      .eq('id', first.validated_by)
      .single();

    return {
      ok: true,
      alreadyValidated: true,
      validation: {
        ...validationInfo,
        ...(agent?.email ? { validated_by_email: agent.email } : {}),
      },
    };
  }

  // 4) Activity guard - ensure reservation matches requested activity
  if (!reservedActivity || reservedActivity !== activity)
    return { ok: false, reason: 'Réservation invalide pour cette activité' };

  // 5) Insert validation
  const { error: insertError } = await supabase
    .from('reservation_validations')
    .insert({ reservation_id: data.id, activity, validated_by: me.id });
  if (insertError)
    return { ok: false, reason: 'Erreur enregistrement validation' };

  return {
    ok: true,
    reservation: {
      id: data.id,
      number: data.reservation_number,
      client_email: data.client_email,
      payment_status: data.payment_status,
      created_at: data.created_at,
      pass: data.pass ? { id: data.pass.id, name: data.pass.name } : null,
      activity: data.event_activities?.activities?.name as string,
      time_slot: data.time_slots
        ? {
            id: data.time_slots.id,
            slot_time: data.time_slots.slot_time,
          }
        : null,
    },
  };
}
