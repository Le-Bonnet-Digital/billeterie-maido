import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Plus, Trash2, Clock, Users } from 'lucide-react';
import { format, addMinutes, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { logger } from '../../lib/logger';

interface TimeSlot {
  id: string;
  slot_time: string;
  capacity: number;
  remaining_capacity?: number;
}

interface EventActivity {
  id: string;
  activity: {
    name: string;
    icon: string;
  };
}

interface Event {
  id: string;
  name: string;
  event_date: string;
}

interface TimeSlotsManagerProps {
  eventActivity: EventActivity;
  event: Event;
  onClose: () => void;
}

export default function TimeSlotsManager({ eventActivity, event, onClose }: TimeSlotsManagerProps) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadTimeSlots();
  }, []);

  const loadTimeSlots = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('time_slots')
        .select('*')
        .eq('event_activity_id', eventActivity.id)
        .order('slot_time');

      if (error) throw error;

      // Calculer la capacité restante pour chaque créneau
      const slotsWithCapacity = await Promise.all(
        (data || []).map(async (slot) => {
          const { data: capacityData } = await supabase
            .rpc('get_slot_remaining_capacity', { slot_uuid: slot.id });

          return {
            ...slot,
            remaining_capacity: capacityData || 0
          };
        })
      );

      setTimeSlots(slotsWithCapacity);
    } catch (err) {
      logger.error('Erreur chargement créneaux', { error: err });
      toast.error('Erreur lors du chargement des créneaux');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce créneau ?')) return;

    try {
      const { error } = await supabase
        .from('time_slots')
        .delete()
        .eq('id', slotId);

      if (error) throw error;
      
      toast.success('Créneau supprimé');
      loadTimeSlots();
    } catch (err) {
      logger.error('Erreur suppression créneau', { error: err });
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleFormClose = () => {
    setShowCreateForm(false);
    loadTimeSlots();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60] overflow-y-auto">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60] overflow-y-auto">
        <div
          className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="time-slots-title"
        >
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 id="time-slots-title" className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">{eventActivity.activity.icon}</span>
                  Créneaux - {eventActivity.activity.name}
                </h2>
                <p className="text-gray-600">
                  {event.name} • {format(new Date(event.event_date), 'EEEE d MMMM yyyy', { locale: fr })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Créer Créneaux
                </button>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {timeSlots.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun créneau</h3>
                <p className="text-gray-600 mb-4">
                  Créez des créneaux horaires pour permettre aux participants de réserver cette activité.
                </p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Créer des créneaux
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center gap-2 text-blue-800 mb-2">
                    <Users className="h-5 w-5" />
                    <span className="font-medium">Capacité totale calculée</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {timeSlots.reduce((sum, slot) => sum + slot.capacity, 0)} places
                  </div>
                  <p className="text-sm text-blue-700 mt-1">
                    Cette valeur sera automatiquement synchronisée avec le stock de l'activité
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {timeSlots.map((slot) => (
                    <div key={slot.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="font-medium text-gray-900">
                          {format(new Date(slot.slot_time), 'HH:mm')}
                        </div>
                        <button
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <Users className="h-4 w-4" />
                        <span>{slot.capacity - (slot.remaining_capacity || 0)}/{slot.capacity} participants</span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            (slot.remaining_capacity || 0) === 0 
                              ? 'bg-red-500'
                              : (slot.remaining_capacity || 0) <= slot.capacity * 0.25
                              ? 'bg-orange-500'
                              : 'bg-green-500'
                          }`}
                          style={{ 
                            width: `${((slot.capacity - (slot.remaining_capacity || 0)) / slot.capacity) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreateForm && (
        <CreateTimeSlotsForm
          eventActivity={eventActivity}
          event={event}
          onClose={handleFormClose}
        />
      )}
    </>
  );
}

interface CreateTimeSlotsFormProps {
  eventActivity: EventActivity;
  event: Event;
  onClose: () => void;
}

function CreateTimeSlotsForm({ eventActivity, event, onClose }: CreateTimeSlotsFormProps) {
  const [formData, setFormData] = useState({
    startTime: '09:00',
    endTime: '17:00',
    slotDuration: 30,
    capacity: 15,
    breakDuration: 0
  });
  const [creating, setCreating] = useState(false);

  const calculateSlots = () => {
    const eventDate = startOfDay(new Date(event.event_date));
    const startDateTime = new Date(`${format(eventDate, 'yyyy-MM-dd')}T${formData.startTime}`);
    const endDateTime = new Date(`${format(eventDate, 'yyyy-MM-dd')}T${formData.endTime}`);
    
    const slots = [];
    let currentTime = startDateTime;
    
    while (currentTime < endDateTime) {
      const nextTime = addMinutes(currentTime, formData.slotDuration);
      if (nextTime <= endDateTime) {
        slots.push({
          start: new Date(currentTime),
          end: nextTime
        });
        currentTime = addMinutes(nextTime, formData.breakDuration);
      } else {
        break;
      }
    }
    
    return slots;
  };

  const previewSlots = calculateSlots();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (previewSlots.length === 0) {
      toast.error('Aucun créneau à créer avec ces paramètres');
      return;
    }

    try {
      setCreating(true);
      
      const slotsToCreate = previewSlots.map(slot => ({
        event_activity_id: eventActivity.id,
        slot_time: slot.start.toISOString(),
        capacity: formData.capacity
      }));

      const { error } = await supabase
        .from('time_slots')
        .insert(slotsToCreate);

      if (error) throw error;
      
      toast.success(`${slotsToCreate.length} créneaux créés avec succès`);
      onClose();
    } catch (err) {
      logger.error('Erreur création créneaux', { error: err });
      toast.error('Erreur lors de la création des créneaux');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[70] overflow-y-auto">
      <div
        className="bg-white rounded-lg max-w-md w-full flex flex-col"
        style={{ maxHeight: '90vh' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-slots-title"
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 id="create-slots-title" className="text-lg font-semibold text-gray-900">
              Créer des Créneaux
          </h3>
          <button onClick={onClose} aria-label="Fermer le modal" className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Heure de début
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Heure de fin
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durée par créneau (minutes)
              </label>
              <select
                value={formData.slotDuration}
                onChange={(e) => setFormData({ ...formData, slotDuration: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 heure</option>
                <option value={90}>1h30</option>
                <option value={120}>2 heures</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacité par créneau
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pause entre créneaux (minutes)
              </label>
              <select
                value={formData.breakDuration}
                onChange={(e) => setFormData({ ...formData, breakDuration: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={0}>Aucune pause</option>
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
            </div>

            {/* Prévisualisation */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Prévisualisation</h4>
              <div className="text-sm text-gray-600 mb-2">
                <strong>{previewSlots.length}</strong> créneaux seront créés
              </div>
              <div className="text-sm text-blue-600">
                Capacité totale: <strong>{previewSlots.length * formData.capacity}</strong> places
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-md font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={creating || previewSlots.length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                {creating ? 'Création...' : `Créer ${previewSlots.length} créneaux`}
              </button>
            </div>
          </form>
      </div>
    </div>
  );
}
