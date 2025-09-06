import { supabase } from './supabase';
import { getCurrentUser } from './auth';

const CODE_PATTERN = /^RES-\d{4}-\d{3}-\d{4}$/;

export type ValidationActivity = 'poney' | 'tir_arc' | 'luge_bracelet';

type ReservationDetails = {
  id: string;
  reservation_number: string;
  client_email: string | null;
  payment_status: 'paid' | 'pending' | 'refunded';
  created_at: string;
  pass: { id: string; name: string } | null;
  event_activity: { id: string; activities: { name: string } | null } | null;
  time_slot: { id: string; start_at: string; end_at: string } | null;
};

export async function validateReservation(
  reservationCode: string,
  activity: ValidationActivity,
): Promise<
  | {
      ok: true;
      alreadyValidated: boolean;
      reservation: {
        id: string;
        number: string;
        client_email: string | null;
        payment_status: 'paid' | 'pending' | 'refunded';
        created_at: string;
        pass: { id: string; name: string } | null;
        activity: string | null;
        time_slot: { id: string; start_at: string; end_at: string } | null;
      };
      validation?: { validated_at: string; validated_by: string; validated_by_email?: string | null };
    }
  | {
      ok: false;
      reason: string;
      meta?: Record<string, unknown>;
      validation?: { validated_at: string; validated_by: string; validated_by_email?: string | null };
    }
> {
  const code = reservationCode.trim();
  if (!code) return { ok: false, reason: 'Code de réservation manquant' };
  if (!CODE_PATTERN.test(code)) return { ok: false, reason: 'Format de code invalide' };

  const me = await getCurrentUser();
  if (!me) return { ok: false, reason: 'Non authentifié' };

  // 1) Lookup réservation par reservation_number (+ détails pour l’UX)
  const { data: r, error: rErr } = await supabase
    .from('reservations')
    .select(
      `
      id,
      reservation_number,
      client_email,
      payment_status,
      created_at,
      pass:pass_id ( id, name ),
      event_activity:event_activity_id (
        id,
        activities ( name )
      ),
      time_slot:time_slot_id (
        id,
        start_at,
        end_at
      )
    `,
    )
    .eq('reservation_number', code)
    .single<ReservationDetails>();

  if (rErr || !r) return { ok: false, reason: 'Réservation introuvable' };
  if (r.payment_status !== 'paid') return { ok: false, reason: 'Paiement non validé' };

  const reservedActivity = r.event_activity?.activities?.name ?? null;
  if (!reservedActivity || reservedActivity !== activity) {
    return {
      ok: false,
      reason: 'Réservation invalide pour cette activité',
      meta: { reservedActivity, requested: activity },
    };
  }

  // 2) Idempotence : déjà validé ?
  const { data: existing, error: exErr } = await supabase
    .from('reservation_validations')
    .select('id, validated_at, validated_by')
    .eq('reservation_id', r.id)
    .eq('activity', activity)
    .order('validated_at', { ascending: false })
    .limit(1);

  if (exErr) {
    return { ok: false, reason: 'Erreur lecture validations' };
  }

  if (existing && existing.length > 0) {
    const first = existing[0];
    let validated_by_email: string | null = null;

    // (Optionnel) afficher l'email de l’agent
    const { data: agent } = await supabase
      .from('users')
      .select('email')
      .eq('id', first.validated_by)
      .single();

    if (agent?.email) validated_by_email = agent.email;

    return {
      ok: true,
      alreadyValidated: true,
      reservation: {
        id: r.id,
        number: r.reservation_number,
        client_email: r.client_email,
        payment_status: r.payment_status,
        created_at: r.created_at,
        pass: r.pass ? { id: r.pass.id, name: r.pass.name } : null,
        activity: reservedActivity,
        time_slot: r.time_slot
          ? { id: r.time_slot.id, start_at: r.time_slot.start_at, end_at: r.time_slot.end_at }
          : null,
      },
      validation: {
        validated_at: first.validated_at as string,
        validated_by: first.validated_by as string,
        validated_by_email,
      },
    };
  }

  // 3) Insérer la validation
  const { error: insErr } = await supabase
    .from('reservation_validations')
    .insert({ reservation_id: r.id, activity, validated_by: me.id });

  // 23505 = contrainte UNIQUE (reservation_id, activity) → déjà validé (race condition)
  if ((insErr as any)?.code === '23505') {
    return {
      ok: true,
      alreadyValidated: true,
      reservation: {
        id: r.id,
        number: r.reservation_number,
        client_email: r.client_email,
        payment_status: r.payment_status,
        created_at: r.created_at,
        pass: r.pass ? { id: r.pass.id, name: r.pass.name } : null,
        activity: reservedActivity,
        time_slot: r.time_slot
          ? { id: r.time_slot.id, start_at: r.time_slot.start_at, end_at: r.time_slot.end_at }
          : null,
      },
    };
  }
  if (insErr) return { ok: false, reason: 'Erreur enregistrement validation' };

  // 4) OK
  return {
    ok: true,
    alreadyValidated: false,
    reservation: {
      id: r.id,
      number: r.reservation_number,
      client_email: r.client_email,
      payment_status: r.payment_status,
      created_at: r.created_at,
      pass: r.pass ? { id: r.pass.id, name: r.pass.name } : null,
      activity: reservedActivity,
      time_slot: r.time_slot
        ? { id: r.time_slot.id, start_at: r.time_slot.start_at, end_at: r.time_slot.end_at }
        : null,
    },
  };
}
