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

export interface ValidationRecord {
  validated_at: string;
  validated_by: string;
  validated_by_email?: string;
}

export interface ValidationPayload {
  reservation: {
    id: string | null;
    number: string | null;
    client_email: string | null;
    payment_status: 'paid' | 'pending' | 'refunded' | null;
    created_at: string | null;
    pass: { id: string; name: string } | null;
    activity_expected: string | null;
    time_slot: { id: string; slot_time: string } | null;
  };
  requested_activity: ValidationActivity;
  history: ValidationRecord[];
  status: {
    invalid: boolean;
    notFound: boolean;
    unpaid: boolean;
    wrongActivity: boolean;
    alreadyValidated: boolean;
    validated: boolean;
  };
  ok: boolean;
  reason?: string;
  meta?: { reservedActivity: string | null; requested: ValidationActivity };
}

export async function validateReservation(
  reservationCode: string,
  activity: ValidationActivity,
  doValidate = true,
): Promise<ValidationPayload> {
  const payload: ValidationPayload = {
    reservation: {
      id: null,
      number: null,
      client_email: null,
      payment_status: null,
      created_at: null,
      pass: null,
      activity_expected: null,
      time_slot: null,
    },
    requested_activity: activity,
    history: [],
    status: {
      invalid: false,
      notFound: false,
      unpaid: false,
      wrongActivity: false,
      alreadyValidated: false,
      validated: false,
    },
    ok: false,
  };

  const trimmed = reservationCode.trim();
  if (!trimmed || !CODE_PATTERN.test(trimmed)) {
    payload.status.invalid = true;
    payload.status.notFound = true;
    return payload;
  }

  const me = await getCurrentUser();
  if (!me) {
    payload.status.invalid = true;
    payload.status.notFound = true;
    return payload;
  }

  // 1) Lookup reservation by reservation_number
  const { data, error } = await supabase
    .from('reservations')
    .select(
      'id,reservation_number,client_email,payment_status,created_at,pass:passes(id,name),event_activities(activities(name)),time_slots(id,slot_time)',
    )
    .eq('reservation_number', trimmed)
    .single<ReservationLookup>();

  if (error || !data) {
    payload.status.notFound = true;
    return payload;
  }

  payload.reservation = {
    id: data.id,
    number: data.reservation_number,
    client_email: data.client_email,
    payment_status: data.payment_status,
    created_at: data.created_at,
    pass: data.pass ? { id: data.pass.id, name: data.pass.name } : null,
    activity_expected: data.event_activities?.activities?.name ?? null,
    time_slot: data.time_slots
      ? { id: data.time_slots.id, slot_time: data.time_slots.slot_time }
      : null,
  };

  if (data.payment_status !== 'paid') {
    payload.status.unpaid = true;
  }

  // 2) Fetch existing validations
  const { data: existing } = await supabase
    .from('reservation_validations')
    .select('validated_at,validated_by')
    .eq('reservation_id', data.id)
    .eq('activity', activity);

  if (existing && existing.length > 0) {
    payload.history = await Promise.all(
      existing.map(async (v) => {
        const { data: agent } = await supabase
          .from('users')
          .select('email')
          .eq('id', v.validated_by as string)
          .single();
        return {
          validated_at: v.validated_at as string,
          validated_by: v.validated_by as string,
          ...(agent?.email ? { validated_by_email: agent.email } : {}),
        } as ValidationRecord;
      }),
    );
    if (payload.history.length > 0) payload.status.alreadyValidated = true;
  }

  // 3) Activity guard - ensure reservation matches requested activity
  if (
    !payload.reservation.activity_expected ||
    payload.reservation.activity_expected !== activity
  ) {
    payload.status.wrongActivity = true;
  }

  const eligible =
    !payload.status.notFound &&
    !payload.status.unpaid &&
    !payload.status.wrongActivity &&
    !payload.status.alreadyValidated;

  if (doValidate && eligible) {
    const { data: inserted, error: insertError } = await supabase
      .from('reservation_validations')
      .insert({ reservation_id: data.id, activity, validated_by: me.id })
      .select('validated_at,validated_by')
      .single();
    if (!insertError && inserted) {
      const { data: agent } = await supabase
        .from('users')
        .select('email')
        .eq('id', inserted.validated_by)
        .single();
      payload.history.push({
        validated_at: inserted.validated_at as string,
        validated_by: inserted.validated_by as string,
        ...(agent?.email ? { validated_by_email: agent.email } : {}),
      });
      payload.status.validated = true;
    }
  }
  payload.ok = payload.status.validated;
  if (!payload.ok && payload.status.wrongActivity) {
    payload.reason = 'Réservation invalide pour cette activité';
    payload.meta = {
      reservedActivity: payload.reservation.activity_expected,
      requested: activity,
    };
  }

  return payload;
}
