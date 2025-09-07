import { supabase } from './supabase';
import { getCurrentUser } from './auth';
import { debugLog } from './logger';

export interface ValidationHistoryFilters {
  startDate?: string;
  endDate?: string;
  activities?: string[];
  agentId?: string;
  status?: 'validated' | 'revoked';
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ValidationHistoryRow {
  id: string;
  validated_at: string;
  revoked_at: string | null;
  reservation_number: string;
  client_email: string;
  pass_name: string | null;
  activity: string;
  agent_email: string | null;
  payment_status: string;
  status: 'validated' | 'revoked';
}

interface RawHistoryRow {
  id: string;
  validated_at: string;
  revoked_at: string | null;
  activity: string;
  reservations?: {
    reservation_number?: string;
    client_email?: string;
    payment_status?: string;
    pass?: { name?: string } | null;
  } | null;
  agent?: { email?: string | null } | null;
}

/**
 * Fetch reservation validations history with optional filters.
 * Filters can be combined; server-side pagination supported via limit/offset.
 */
export async function fetchValidationHistory(
  filters: ValidationHistoryFilters = {},
): Promise<ValidationHistoryRow[]> {
  const me = await getCurrentUser();

  const query = supabase
    .from('reservation_validations')
    .select(
      `id,validated_at,revoked_at,activity,reservations:reservations(id,reservation_number,client_email,payment_status,pass:passes(name)),agent:users(email)`,
      { count: 'exact' },
    )
    .order('validated_at', { ascending: false });

  if (filters.startDate) query.gte('validated_at', filters.startDate);
  if (filters.endDate) query.lte('validated_at', filters.endDate);
  if (filters.activities && filters.activities.length)
    query.in('activity', filters.activities);
  if (filters.agentId) query.eq('validated_by', filters.agentId);
  if (filters.status === 'revoked') query.not('revoked_at', 'is', null);
  if (filters.status === 'validated') query.is('revoked_at', null);
  if (filters.search)
    query.or(
      `reservations.reservation_number.eq.${filters.search},reservations.client_email.eq.${filters.search}`,
    );
  if (typeof filters.limit === 'number') query.limit(filters.limit);
  if (typeof filters.offset === 'number' && typeof filters.limit === 'number')
    query.range(filters.offset, filters.offset + filters.limit - 1);

  const { data, error, count } = await query;
  if (me) {
    const safeFilters = JSON.stringify(filters);
    debugLog('history_access', {
      user_id: me.id,
      filters: safeFilters,
      count: count ?? data?.length ?? 0,
    });
  }
  if (error || !data) return [];

  return (data as RawHistoryRow[]).map((row) => ({
    id: row.id,
    validated_at: row.validated_at,
    revoked_at: row.revoked_at ?? null,
    reservation_number: row.reservations?.reservation_number ?? '',
    client_email: row.reservations?.client_email ?? '',
    pass_name: row.reservations?.pass?.name ?? null,
    activity: row.activity,
    agent_email: row.agent?.email ?? null,
    payment_status: row.reservations?.payment_status ?? '',
    status: row.revoked_at ? 'revoked' : 'validated',
  }));
}

export interface ValidationDetail {
  reservation_number: string;
  client_email: string;
  payment_status: string;
  created_at: string;
  pass_id: string | null;
  pass_name: string | null;
  activity: string;
  time_slot_start: string | null;
  time_slot_end: string | null;
  validated_at: string;
  agent_email: string | null;
  revoked_at: string | null;
  revoke_reason: string | null;
}

/** Fetch detailed info for a single validation record. */
export async function fetchValidationDetail(
  id: string,
): Promise<ValidationDetail | null> {
  const { data, error } = await supabase
    .from('reservation_validations')
    .select(
      `validated_at,revoked_at,revoke_reason,activity,reservations:reservations(reservation_number,client_email,payment_status,created_at,pass_id,pass:passes(name),time_slot:time_slots(start_at,end_at)),agent:users(email)`,
    )
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return {
    reservation_number: data.reservations?.reservation_number ?? '',
    client_email: data.reservations?.client_email ?? '',
    payment_status: data.reservations?.payment_status ?? '',
    created_at: data.reservations?.created_at ?? '',
    pass_id: data.reservations?.pass_id ?? null,
    pass_name: data.reservations?.pass?.name ?? null,
    activity: data.activity as string,
    time_slot_start: data.reservations?.time_slot?.start_at ?? null,
    time_slot_end: data.reservations?.time_slot?.end_at ?? null,
    validated_at: data.validated_at as string,
    agent_email: data.agent?.email ?? null,
    revoked_at: data.revoked_at ?? null,
    revoke_reason: data.revoke_reason ?? null,
  } as ValidationDetail;
}

/** Revoke a validation with reason (admin only). */
export async function revokeValidation(
  id: string,
  reason: string,
): Promise<boolean> {
  const me = await getCurrentUser();
  if (!me) return false;
  const { error } = await supabase
    .from('reservation_validations')
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: me.id,
      revoke_reason: reason,
    })
    .eq('id', id);
  if (!error) {
    debugLog('validation_revoked', { user_id: me.id, validation_id: id });
  }
  return !error;
}

/**
 * Convert history rows to CSV string for export.
 */
export function exportValidationHistoryCSV(
  rows: ValidationHistoryRow[],
): string {
  const header = [
    'validated_at',
    'reservation_number',
    'pass_name',
    'activity',
    'agent_email',
    'payment_status',
  ];
  const csvRows = rows.map((r) =>
    [
      r.validated_at,
      r.reservation_number,
      r.pass_name ?? '',
      r.activity,
      r.agent_email ?? '',
      r.payment_status,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  );
  return [header.join(','), ...csvRows].join('\n');
}
