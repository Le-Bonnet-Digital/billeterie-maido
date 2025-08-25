import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Clock, Plus, Edit, Trash2, Users, Target, X, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

interface TimeSlot {
  id: string;
  slot_time: string;
  capacity: number;
  remaining_capacity?: number;
  event_activity: {
    id: string;
    stock_limit: number | null;
    requires_time_slot: boolean;
    activity: {
      id: string;
      name: string;
      icon: string;
    };
    event: {
      id: string;
      name: string;
    };
  };
}

interface Event {
  id: string;
  name: string;
  event_date: string;
}

interface EventActivity {
  id: string;
  stock_limit: number | null;
  requires_time_slot: boolean;
  activity: {
    id: string;
    name: string;
    icon: string;
  };
  event: {
    id: string;
    name: string;
  };
}

export default function TimeSlotManagement() {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [eventActivities, setEventActivities] = useState<EventActivity[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      loadEventActivities();
      loadTimeSlots();
    }
  }, [selectedEvent]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Charger tous les événements
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, name, event_date')
        .order('event_date', { ascending: false });

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);
      
      // Sélectionner automatiquement le premier événement
      if (eventsData && eventsData.length > 0 && !selectedEvent) {
        setSelectedEvent(eventsData[0].id);
      }
    } catch (err) {
      console.error('Erreur chargement données:', err);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const loadEventActivities = async () => {
    if (!selectedEvent) return;
    
    try {
      const { data, error } = await supabase
        .from('event_activities')
        .select(`
          id,
          stock_limit,
          requires_time_slot,
          activities (
            id,
            name,
            icon
          ),
          events (
            id,
            name
          )
        `)
        .eq('event_id', selectedEvent)
        .eq('requires_time_slot', true);

      if (error) throw error;
      
      setEventActivities((data || []).map(ea => ({
        id: ea.id,
        stock_limit: ea.stock_limit,
        requires_time_slot: ea.requires_time_slot,
        activity: ea.activities,
        event: ea.events
      })));
    } catch (err) {
      console.error('Erreur chargement activités événement:', err);
      toast.error('Erreur lors du chargement des activités');
    }
  };

  const loadTimeSlots = async () => {
    if (!selectedEvent) return;
    
    try {
      const { data: slotsData, error: slotsError } = await supabase
        .from('time_slots')
        .select(`
          id,
          slot_time,
          capacity,
          event_activities!inner (
            id,
            stock_limit,
            requires_time_slot,
            event_id,
            activities (
              id,
              name,
              icon
            ),
            events (
              id,
              name
            )
          )
        `)
        .eq('event_activities.event_id', selectedEvent)
        .order('slot_time');

      if (slotsError) throw slotsError;

      // Calculer la capacité restante pour chaque créneau
      const slotsWithCapacity = await Promise.all(
        (slotsData || []).map(async (slot) => {
          const { data: capacityData } = await supabase
            .rpc('get_slot_remaining_capacity', { slot_uuid: slot.id });
          
          return { 
            ...slot, 
            event_activity: {
              ...slot.event_activities,
              activity: slot.event_activities.activities,
              event: slot.event_activities.events
            },
            remaining_capacity: capacityData || 0
          };
        })
      );
      
      setTimeSlots(slotsWithCapacity);
    } catch (err) {
      console.error('Erreur chargement créneaux:', err);
      toast.error('Erreur lors du chargement des créneaux');
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce créneau ? Toutes les réservations associées seront également supprimées.')) return;

    try {
      // D'abord supprimer toutes les réservations liées à ce créneau
      const { error: reservationsError } = await supabase
        .from('reservations')
        .delete()
        .eq('time_slot_id', slotId);
      
      if (reservationsError) {
        console.warn('Erreur suppression réservations:', reservationsError);
      }
      
      // Puis supprimer le créneau
      const { error } = await supabase
        .from('time_slots')
        .delete()
        .eq('id', slotId);

      if (error) throw error;
      
      toast.success('Créneau supprimé avec succès');
      loadTimeSlots();
    } catch (err) {
      console.error('Erreur suppression créneau:', err);
      toast.error('Erreur lors de la suppression');
    }
  };

  const createBulkSlots = async () => {
    if (!selectedEvent) {
      toast.error('Veuillez sélectionner un événement');
      return;
    }

    const activitiesRequiringSlots = eventActivities.filter(ea => ea.requires_time_slot);
    
    if (activitiesRequiringSlots.length === 0) {
      toast.error('Aucune activité ne nécessite de créneaux pour cet événement');
      return;
    }

    try {
      const selectedEventData = events.find(e => e.id === selectedEvent);
      if (!selectedEventData) return;

      const eventDate = new Date(selectedEventData.event_date);
      const slots = [];

      // Créer des créneaux de 9h à 17h pour chaque activité
      for (const activity of activitiesRequiringSlots) {
        for (let hour = 9; hour <= 17; hour++) {
          const slotTime = new Date(eventDate);
          slotTime.setHours(hour, 0, 0, 0);
          
          slots.push({
            event_activity_id: activity.id,
            slot_time: slotTime.toISOString(),
            capacity: 15 // Capacité par défaut
          });
        }
      }

      const { error } = await supabase
        .from('time_slots')
        .insert(slots);

      if (error) throw error;
      
      toast.success(`${slots.length} créneaux créés avec succès`);
      loadTimeSlots();
    } catch (err) {
      console.error('Erreur création créneaux en masse:', err);
      toast.error('Erreur lors de la création en masse');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Créneaux</h1>
          <p className="text-gray-600">Planifiez les créneaux horaires pour les activités d'événement</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={createBulkSlots}
            disabled={!selectedEvent || eventActivities.length === 0}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            Création en masse
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            disabled={!selectedEvent || eventActivities.length === 0}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nouveau Créneau
          </button>
        </div>
      </div>

      {/* Sélection d'événement */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Événement
            </label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Sélectionner un événement</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} - {format(new Date(event.event_date), 'dd/MM/yyyy')}
                </option>
              ))}
            </select>
          </div>
          
          {selectedEvent && (
            <div className="text-sm text-gray-600">
              <div className="font-medium">Activités nécessitant des créneaux :</div>
              <div>{eventActivities.length} activité(s)</div>
            </div>
          )}
        </div>
        
        {selectedEvent && eventActivities.length === 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              Aucune activité de cet événement ne nécessite de créneaux horaires. 
              Configurez d'abord les activités dans la gestion des événements.
            </p>
          </div>
        )}
      </div>

      {/* Statistiques */}
      {selectedEvent && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-gray-900">{timeSlots.length}</div>
            <div className="text-sm text-gray-600">Total Créneaux</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-green-600">
              {timeSlots.filter(s => s.remaining_capacity && s.remaining_capacity > 0).length}
            </div>
            <div className="text-sm text-gray-600">Créneaux Disponibles</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-red-600">
              {timeSlots.filter(s => s.remaining_capacity === 0).length}
            </div>
            <div className="text-sm text-gray-600">Créneaux Complets</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-gray-900">
              {timeSlots.reduce((sum, s) => sum + (s.remaining_capacity || 0), 0)}
            </div>
            <div className="text-sm text-gray-600">Places Disponibles</div>
          </div>
        </div>
      )}

      {/* Liste des créneaux */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Créneaux {selectedEvent ? `(${timeSlots.length})` : ''}
          </h2>
        </div>

        {!selectedEvent ? (
          <div className="p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Sélectionnez un événement</h3>
            <p className="text-gray-600">Choisissez un événement pour voir et gérer ses créneaux.</p>
          </div>
        ) : timeSlots.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun créneau</h3>
            <p className="text-gray-600">
              {eventActivities.length === 0 
                ? 'Configurez d\'abord les activités nécessitant des créneaux dans cet événement.'
                : 'Créez votre premier créneau ou utilisez la création en masse.'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {timeSlots.map((slot) => (
              <div key={slot.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-600">
                        <span className="text-lg">{slot.event_activity.activity.icon}</span>
                        {slot.event_activity.activity.name}
                      </div>
                      <span className="text-lg font-semibold text-gray-900">
                        {format(new Date(slot.slot_time), 'HH:mm')}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div>
                        {format(new Date(slot.slot_time), 'EEEE d MMMM yyyy', { locale: fr })}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {slot.remaining_capacity}/{slot.capacity} places disponibles
                      </div>
                      <div>Événement: {slot.event_activity.event.name}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingSlot(slot)}
                      className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de création/édition */}
      {(showCreateModal || editingSlot) && (
        <TimeSlotFormModal
          timeSlot={editingSlot}
          eventActivities={eventActivities}
          onClose={() => {
            setShowCreateModal(false);
            setEditingSlot(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingSlot(null);
            loadTimeSlots();
          }}
        />
      )}
    </div>
  );
}

interface TimeSlotFormModalProps {
  timeSlot?: TimeSlot | null;
  eventActivities: EventActivity[];
  onClose: () => void;
  onSave: () => void;
}

function TimeSlotFormModal({ timeSlot, eventActivities, onClose, onSave }: TimeSlotFormModalProps) {
  const [formData, setFormData] = useState({
    event_activity_id: timeSlot?.event_activity.id || '',
    slot_time: timeSlot ? format(new Date(timeSlot.slot_time), "yyyy-MM-dd'T'HH:mm") : '',
    capacity: timeSlot?.capacity || 15
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.event_activity_id || !formData.slot_time || formData.capacity <= 0) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setSaving(true);
      
      if (timeSlot) {
        // Mise à jour
        const { error } = await supabase
          .from('time_slots')
          .update({
            event_activity_id: formData.event_activity_id,
            slot_time: new Date(formData.slot_time).toISOString(),
            capacity: formData.capacity
          })
          .eq('id', timeSlot.id);

        if (error) throw error;
        toast.success('Créneau mis à jour avec succès');
      } else {
        // Création
        const { error } = await supabase
          .from('time_slots')
          .insert({
            event_activity_id: formData.event_activity_id,
            slot_time: new Date(formData.slot_time).toISOString(),
            capacity: formData.capacity
          });

        if (error) throw error;
        toast.success('Créneau créé avec succès');
      }
      
      onSave();
    } catch (err) {
      console.error('Erreur sauvegarde créneau:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {timeSlot ? 'Modifier le Créneau' : 'Créer un Créneau'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Activité *
              </label>
              <select
                value={formData.event_activity_id}
                onChange={(e) => setFormData({ ...formData, event_activity_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Sélectionner une activité</option>
                {eventActivities.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.activity.icon} {activity.activity.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date et Heure *
              </label>
              <input
                type="datetime-local"
                value={formData.slot_time}
                onChange={(e) => setFormData({ ...formData, slot_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacité *
              </label>
              <input
                type="number"
                min="1"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
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
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                {saving ? 'Sauvegarde...' : (timeSlot ? 'Modifier' : 'Créer')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}