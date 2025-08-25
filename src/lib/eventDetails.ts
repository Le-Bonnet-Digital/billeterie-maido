import { supabase } from './supabase';
import type {
  Activity,
  Event,
  EventActivity,
  EventActivityRow,
  Pass,
  PassRow,
  TimeSlot,
  TimeSlotRow,
} from './types';

export async function fetchEvent(eventId: string): Promise<Event> {
  const { data, error } = await supabase
    .from('events')
    .select('id, name, event_date, key_info_content')
    .eq('id', eventId)
    .eq('status', 'published')
    .single();

  if (error) throw error;
  return data as Event;
}

export async function fetchPasses(eventId: string): Promise<Pass[]> {
  const { data, error } = await supabase
    .from('passes')
    .select('id, name, price, description, initial_stock')
    .eq('event_id', eventId);

  if (error) throw error;

  const passesWithStock = await Promise.all(
    (data || []).map(async (pass: PassRow): Promise<Pass> => {
      if (pass.initial_stock === null) {
        return { ...pass, remaining_stock: 999999 };
      }

      const { data: stockData } = await supabase
        .rpc('get_pass_remaining_stock', { pass_uuid: pass.id });

      return { ...pass, remaining_stock: stockData || 0 };
    })
  );

  return passesWithStock;
}

export async function fetchEventActivities(eventId: string): Promise<EventActivity[]> {
  const { data, error } = await supabase
    .from('event_activities')
    .select(`
      *,
      activities (*)
    `)
    .eq('event_id', eventId);

  if (error) throw error;

  const activitiesWithStock = await Promise.all(
    (data || []).map(async (eventActivity: EventActivityRow): Promise<EventActivity> => {
      const { data: stockData } = await supabase
        .rpc('get_event_activity_remaining_stock', { event_activity_id_param: eventActivity.id });

      return {
        ...eventActivity,
        activity: eventActivity.activities,
        remaining_stock: stockData || 0
      };
    })
  );

  return activitiesWithStock;
}

export async function fetchTimeSlots(eventActivityId: string): Promise<TimeSlot[]> {
  const { data, error } = await supabase
    .from('time_slots')
    .select(`
      id,
      slot_time,
      capacity,
      event_activities!inner (
        *,
        activities (*)
      )
    `)
    .eq('event_activity_id', eventActivityId)
    .gte('slot_time', new Date().toISOString())
    .order('slot_time');

  if (error) throw error;

  const slotsWithCapacity = await Promise.all(
    (data || []).map(async (slot: TimeSlotRow): Promise<TimeSlot> => {
      const { data: capacityData } = await supabase
        .rpc('get_slot_remaining_capacity', { slot_uuid: slot.id });

      return {
        ...slot,
        remaining_capacity: capacityData || 0,
        event_activity: {
          ...slot.event_activities,
          activity: slot.event_activities.activities
        }
      };
    })
  );

  return slotsWithCapacity;
}

export type { Event, Pass, Activity, EventActivity, TimeSlot } from './types';
