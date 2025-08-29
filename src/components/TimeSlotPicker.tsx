import React, { useEffect, useState } from 'react';
import { fetchTimeSlotsForActivity, type TimeSlot } from '../services/eventService';

interface TimeSlotPickerProps {
  eventActivityId: string;
  onSelect: (slotId: string | null) => void;
}

export default function TimeSlotPicker({ eventActivityId, onSelect }: TimeSlotPickerProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchTimeSlotsForActivity(eventActivityId);
        if (!mounted) return;
        setSlots(data);
      } catch (err) {
        // Log the error to aid debugging while keeping UI friendly
        console.error(err);
        setError("Impossible de charger les créneaux");
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [eventActivityId]);

  if (loading) {
    return <div className="text-sm text-gray-500">Chargement des créneaux...</div>;
  }
  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  if (slots.length === 0) {
    return <div className="text-sm text-gray-500">Aucun créneau disponible</div>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {slots.map((slot) => (
        <button
          key={slot.id}
          onClick={() => onSelect(slot.id)}
          disabled={(slot.remaining_capacity ?? 0) <= 0}
          className="px-3 py-1 rounded-md text-sm border border-gray-300 hover:border-blue-400 disabled:opacity-50"
          title={slot.remaining_capacity ? `${slot.remaining_capacity} place(s) restante(s)` : undefined}
        >
          {new Date(slot.slot_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </button>
      ))}
    </div>
  );
}
