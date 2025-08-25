import { useState, useEffect, useCallback } from 'react';
import {
  fetchEvent,
  fetchPasses,
  fetchEventActivities,
  fetchTimeSlotsForActivity,
  Event,
  Pass,
  EventActivity,
  TimeSlot,
} from '../services/eventService';

export function useEvent(eventId?: string) {
  const [event, setEvent] = useState<Event | null>(null);
  const [passes, setPasses] = useState<Pass[]>([]);
  const [eventActivities, setEventActivities] = useState<EventActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const [eventData, passesData, activitiesData] = await Promise.all([
        fetchEvent(eventId),
        fetchPasses(eventId),
        fetchEventActivities(eventId),
      ]);
      setEvent(eventData);
      setPasses(passesData);
      setEventActivities(activitiesData);
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
    reload: load,
    fetchTimeSlotsForActivity,
  };
}

export type { TimeSlot } from '../services/eventService';
