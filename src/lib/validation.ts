// src/lib/validation.ts
import { supabase } from './supabase';
import { toSlug } from './slug';
import { getCurrentUser } from './auth';

export type ValidationActivity = string;

type ReservationLookup = {
  id: string;
  reservation_number: string;
  client_email: string;
  payment_status: 'paid' | 'pending' | 'failed' | string;
  created_at: string;
  pass: { id: string; name: string } | null;
  event_activities: { activities: { name: string } } | null;
  time_slots: { id: string; slot_time: string } | null;
};

type ValidationRecord = {
  id: string;
  reservation_id: string;
  agent_id: string;
  created_at: string;
  status: 'validated' | 'revoked' | string;
};

export type ValidationResult = {
  reservation: {
    id: string;
    number: string;
    client_email: string;
    payment_status: string;
    created_at: string;
    pass: { id: string; name: string } | null;
    activity_expected: string | null; // slug attendu (name BDD -> slug)
    time_slot: { id: string; slot_time: string } | null;
  } | null;
  requested_activity: string; // slug reçu du front
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
  meta?: { reservedActivity?: string; requested?: string };
};

function normalizeReservation(
  row: ReservationLookup | null,
): ValidationResult['reservation'] {
  if (!row) return null;
  const reservedName = row.event_activities?.activities?.name ?? null;
  const reservedSlug = reservedName ? toSlug(reservedName) : null;
  return {
    id: row.id,
    number: row.reservation_number,
    client_email: row.client_email,
    payment_status: row.payment_status,
    created_at: row.created_at,
    pass: row.pass ? { id: row.pass.id, name: row.pass.name } : null,
    activity_expected: reservedSlug,
    time_slot: row.time_slots
      ? { id: row.time_slots.id, slot_time: row.time_slots.slot_time }
      : null,
  };
}

export async function validateReservation(
  code: string,
  activitySlug: string,
): Promise<ValidationResult> {
  const requestedSlug = toSlug(activitySlug);

  // 1) Réservation par numéro
  const { data: row, error: rErr } = await supabase
    .from('reservations')
    .select(
      [
        'id',
        'reservation_number',
        'client_email',
        'payment_status',
        'created_at',
        'pass(id,name)',
        'event_activities(activities(name))',
        'time_slots(id,slot_time)',
      ].join(','),
    )
    .eq('reservation_number', code)
    .single<ReservationLookup>();

  if (rErr || !row) {
    return {
      reservation: null,
      requested_activity: requestedSlug,
      history: [],
      status: {
        invalid: false,
        notFound: true,
        unpaid: false,
        wrongActivity: false,
        alreadyValidated: false,
        validated: false,
      },
      ok: false,
      reason: 'Réservation introuvable',
      meta: { requested: requestedSlug },
    };
  }

  // 2) Historique des validations
  const { data: hist, error: hErr } = await supabase
    .from('reservation_validations')
    .select('id,reservation_id,agent_id,created_at,status')
    .eq('reservation_id', row.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const history = hErr || !hist ? [] : (hist as ValidationRecord[]);

  // 3) Statuts métier
  const reservedName = row.event_activities?.activities?.name ?? null;
  const reservedSlug = reservedName ? toSlug(reservedName) : null;

  const unpaid = row.payment_status !== 'paid';
  const wrongActivity = !!reservedSlug && reservedSlug !== requestedSlug;

  const base = {
    reservation: normalizeReservation(row),
    requested_activity: requestedSlug,
    history,
    reason: undefined as string | undefined,
    meta: reservedSlug
      ? { reservedActivity: reservedSlug, requested: requestedSlug }
      : { requested: requestedSlug },
  };

  if (unpaid) {
    return {
      ...base,
      status: {
        invalid: false,
        notFound: false,
        unpaid: true,
        wrongActivity: false,
        alreadyValidated: false,
        validated: false,
      },
      ok: false,
      reason: 'Réservation non payée',
    };
  }

  if (wrongActivity) {
    return {
      ...base,
      status: {
        invalid: false,
        notFound: false,
        unpaid: false,
        wrongActivity: true,
        alreadyValidated: false,
        validated: false,
      },
      ok: false,
      reason: 'Réservation invalide pour cette activité',
    };
  }

  // déjà validée ?
  const last = history[0];
  if (last?.status === 'validated') {
    return {
      ...base,
      status: {
        invalid: false,
        notFound: false,
        unpaid: false,
        wrongActivity: false,
        alreadyValidated: true,
        validated: true,
      },
      ok: true,
      reason: 'Réservation déjà validée',
    };
  }

  // 4) Insertion d'une validation (re-validation possible après revoked)
  const user = await getCurrentUser();
  if (!user?.id) {
    return {
      ...base,
      status: {
        invalid: false,
        notFound: false,
        unpaid: false,
        wrongActivity: false,
        alreadyValidated: false,
        validated: false,
      },
      ok: false,
      reason: 'Utilisateur non authentifié',
    };
  }

  const { error: insErr } = await supabase
    .from('reservation_validations')
    .insert({ reservation_id: row.id, agent_id: user.id, status: 'validated' });

  if (insErr) {
    return {
      ...base,
      status: {
        invalid: false,
        notFound: false,
        unpaid: false,
        wrongActivity: false,
        alreadyValidated: false,
        validated: false,
      },
      ok: false,
      reason: 'Échec de la validation',
    };
  }

  return {
    ...base,
    status: {
      invalid: false,
      notFound: false,
      unpaid: false,
      wrongActivity: false,
      alreadyValidated: false,
      validated: true,
    },
    ok: true,
  };
}
