import { supabase } from './supabase';
import { logger } from './logger';
import type {
  Event,
  Pass,
  TimeSlot,
  TimeSlotRow,
  EventActivityRow,
} from './types';

/**
 * Récupère les informations d'un événement publié.
 * @param eventId Identifiant de l'événement
 * @returns L'événement demandé
 */
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

/**
 * Récupère les passes d'un événement avec leurs activités associées et leur stock restant.
 * @param eventId Identifiant de l'événement
 * @returns Liste des passes
 */
export async function fetchPasses(eventId: string): Promise<Pass[]> {
  logger.info('fetchPasses', { eventId });
  const { data, error } = await supabase.rpc('get_passes_with_activities', {
    event_uuid: eventId,
  });

  if (error) {
    logger.error('fetchPasses error', { eventId, error });
    throw error;
  }

  return (data || []) as Pass[];
}

/**
 * Récupère les créneaux horaires d'une activité.
 * @param eventActivityId Identifiant de l'activité
 * @returns Liste des créneaux
 */
export async function fetchTimeSlots(
  eventActivityId: string,
): Promise<TimeSlot[]> {
  const { data, error } = await supabase
    .from('time_slots')
    .select(
      `
      id,
      event_activity_id,
      slot_time,
      capacity,
      event_activities!inner (
        *,
        activities (*)
      )
    `,
    )
    .eq('event_activity_id', eventActivityId)
    .gte('slot_time', new Date().toISOString())
    .order('slot_time');

  if (error) throw error;

  const slotsWithCapacity = await Promise.all(
    ((data ?? []) as unknown as TimeSlotRow[]).map(
      async (slot): Promise<TimeSlot> => {
        const { data: capacityData } = await supabase.rpc(
          'get_slot_remaining_capacity',
          { slot_uuid: slot.id },
        );

        const eventActivity = (
          slot.event_activities as unknown as EventActivityRow[]
        )[0];

        return {
          ...slot,
          remaining_capacity: capacityData || 0,
          event_activity: {
            ...eventActivity,
            activity: eventActivity.activities,
          },
          event_activity_id: slot.event_activity_id,
        };
      },
    ),
  );

  return slotsWithCapacity;
}

export type { Event, Pass, Activity, EventActivity, TimeSlot } from './types';
