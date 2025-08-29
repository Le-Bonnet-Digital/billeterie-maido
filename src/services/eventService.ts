import { supabase, isSupabaseConfigured, type DatabaseClient } from '../lib/supabase';
import { fetchEventStock } from '../lib/eventStock';

export interface Event {
  id: string;
  name: string;
  event_date: string;
  key_info_content: string;
}

export interface Pass {
  id: string;
  name: string;
  price: number;
  description: string;
  initial_stock: number | null;
  remaining_stock?: number;
  pass_type?: 'moins_8' | 'plus_8' | 'luge_seule' | 'baby_poney';
}

export interface Activity {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface EventActivity {
  id: string;
  activity_id: string;
  stock_limit: number | null;
  requires_time_slot: boolean;
  remaining_stock?: number;
  activity: Activity;
}

/**
 * Récupère un événement publié par son identifiant.
 * @param eventId Identifiant de l'événement
 * @param client Client Supabase optionnel
 * @returns L'événement ou `null`
 */
export async function fetchEvent(
  eventId: string,
  client: DatabaseClient = supabase
): Promise<Event | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await client
    .from('events')
    .select('id, name, event_date, key_info_content')
    .eq('id', eventId)
    .eq('status', 'published')
    .single();
  if (error) throw error;
  return data;
}

/**
 * Récupère les passes d'un événement.
 * @param eventId Identifiant de l'événement
 * @param client Client Supabase optionnel
 */
export async function fetchPasses(
  eventId: string,
  client: DatabaseClient = supabase
): Promise<Pass[]> {
  if (!isSupabaseConfigured()) return [];
  const { passes } = await fetchEventStock(eventId, client);
  return passes as Pass[];
}

/**
 * Récupère les activités d'un événement.
 * @param eventId Identifiant de l'événement
 * @param client Client Supabase optionnel
 */
export async function fetchEventActivities(
  eventId: string,
  client: DatabaseClient = supabase
): Promise<EventActivity[]> {
  if (!isSupabaseConfigured()) return [];
  const { eventActivities } = await fetchEventStock(eventId, client);
  return eventActivities as EventActivity[];
}
