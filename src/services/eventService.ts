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

export interface TimeSlot {
  id: string;
  event_activity_id: string;
  slot_time: string;
  capacity: number;
  remaining_capacity?: number;
  event_activity: EventActivity;
}

interface RawSlot {
  id: string;
  slot_time: string;
  capacity: number;
  event_activities: EventActivity & { activities: Activity };
}

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

export async function fetchPasses(
  eventId: string,
  client: DatabaseClient = supabase
): Promise<Pass[]> {
  if (!isSupabaseConfigured()) return [];
  const { passes } = await fetchEventStock(eventId, client);
  return passes as Pass[];
}

export async function fetchEventActivities(
  eventId: string,
  client: DatabaseClient = supabase
): Promise<EventActivity[]> {
  if (!isSupabaseConfigured()) return [];
  const { eventActivities } = await fetchEventStock(eventId, client);
  return eventActivities as EventActivity[];
}

export async function fetchTimeSlotsForActivity(
  eventActivityId: string,
  client: DatabaseClient = supabase
): Promise<TimeSlot[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await client
    .from('time_slots')
    .select(
      `
      id,
      slot_time,
      capacity,
      event_activities!inner (
        *,
        activities (*)
      )
    `
    )
    .eq('event_activity_id', eventActivityId)
    .gte('slot_time', new Date().toISOString())
    .order('slot_time');
  if (error) throw error;

  const slotsWithCapacity = await Promise.all(
    (data || []).map(async (slot: RawSlot) => {
      const { data: capacityData } = await client.rpc('get_slot_remaining_capacity', {
        slot_uuid: slot.id,
      });
      return {
        ...slot,
        remaining_capacity: capacityData || 0,
        event_activity: {
          ...slot.event_activities,
          activity: slot.event_activities.activities,
        },
      };
    })
  );
  return slotsWithCapacity;
}
