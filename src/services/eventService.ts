import { supabase, isSupabaseConfigured } from '../lib/supabase';

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

export async function fetchEvent(eventId: string): Promise<Event | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from('events')
    .select('id, name, event_date, key_info_content')
    .eq('id', eventId)
    .eq('status', 'published')
    .single();
  if (error) throw error;
  return data;
}

export async function fetchPasses(eventId: string): Promise<Pass[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('passes')
    .select('id, name, price, description, initial_stock')
    .eq('event_id', eventId);
  if (error) throw error;

  const passesWithStock = await Promise.all(
    (data || []).map(async (pass) => {
      if (pass.initial_stock === null) {
        return { ...pass, remaining_stock: 999999 };
      }
      const { data: stockData } = await supabase.rpc('get_pass_remaining_stock', {
        pass_uuid: pass.id,
      });
      return { ...pass, remaining_stock: stockData || 0 };
    })
  );
  return passesWithStock;
}

export async function fetchEventActivities(eventId: string): Promise<EventActivity[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
    .from('event_activities')
    .select(`*, activities (*)`)
    .eq('event_id', eventId);
  if (error) throw error;

  const activitiesWithStock = await Promise.all(
    (data || []).map(async (eventActivity: any) => {
      const { data: stockData } = await supabase.rpc(
        'get_event_activity_remaining_stock',
        { event_activity_id_param: eventActivity.id }
      );
      return {
        ...eventActivity,
        activity: eventActivity.activities,
        remaining_stock: stockData || 0,
      };
    })
  );
  return activitiesWithStock;
}

export async function fetchTimeSlotsForActivity(eventActivityId: string): Promise<TimeSlot[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase
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
    (data || []).map(async (slot: any) => {
      const { data: capacityData } = await supabase.rpc('get_slot_remaining_capacity', {
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
