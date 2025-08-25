import { useCallback, useEffect, useState } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  Event,
  Pass,
  EventActivity,
  TimeSlot,
  fetchEvent,
  fetchPasses,
  fetchEventActivities,
  fetchTimeSlots,
} from '../lib/eventDetails';

interface UseEventDetailsResult {
  event: Event | null;
  passes: Pass[];
  eventActivities: EventActivity[];
  loading: boolean;
  error: string | null;
  loadTimeSlotsForActivity: (eventActivityId: string) => Promise<TimeSlot[]>;
  refresh: () => Promise<void>;
}

export function useEventDetails(eventId?: string): UseEventDetailsResult {
  const [event, setEvent] = useState<Event | null>(null);
  const [passes, setPasses] = useState<Pass[]>([]);
  const [eventActivities, setEventActivities] = useState<EventActivity[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadTimeSlotsForActivity = useCallback(async (eventActivityId: string) => {
    try {
      return await fetchTimeSlots(eventActivityId);
    } catch (err) {
      console.error('Erreur chargement créneaux pour l\'activité:', err);
      setError('Erreur lors du chargement des créneaux');
      return [];
    }
  }, []);

  const load = useCallback(async () => {
    if (!eventId || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [evt, passesData, activitiesData] = await Promise.all([
        fetchEvent(eventId),
        fetchPasses(eventId),
        fetchEventActivities(eventId),
      ]);
      setEvent(evt);
      setPasses(passesData);
      setEventActivities(activitiesData);
      setError(null);
    } catch (err) {
      console.error('Erreur chargement événement:', err);
      setError('Erreur lors du chargement de l\'événement');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    event,
    passes,
    eventActivities,
    loading,
    error,
    loadTimeSlotsForActivity,
    refresh: load,
  };
}

export default useEventDetails;
