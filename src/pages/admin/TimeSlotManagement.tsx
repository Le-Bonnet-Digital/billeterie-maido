import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Clock, Users, Filter, Eye, BarChart3, AlertCircle } from 'lucide-react';
import { format, startOfDay, endOfDay, eachHourOfInterval, isSameHour } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { logger } from '../../lib/logger';

interface Event {
  id: string;
  name: string;
  event_date: string;
}

interface TimeSlotWithDetails {
  id: string;
  slot_time: string;
  capacity: number;
  remaining_capacity: number;
  event_activity: {
    id: string;
    activity: {
      name: string;
      icon: string;
    };
    event: {
      id: string;
      name: string;
      event_date: string;
    };
  };
  reservations_count: number;
}

type ViewMode = 'dashboard' | 'calendar' | 'list';

export default function TimeSlotManagement() {
  const [events, setEvents] = useState<Event[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlotWithDetails[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent && selectedDate) {
      loadTimeSlots();
    }
  }, [selectedEvent, selectedDate]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('id, name, event_date')
        .eq('status', 'published')
        .order('event_date');

      if (error) throw error;
      setEvents(data || []);
      
      // Sélectionner automatiquement le premier événement
      if (data && data.length > 0) {
        setSelectedEvent(data[0].id);
        setSelectedDate(format(new Date(data[0].event_date), 'yyyy-MM-dd'));
      }
    } catch (err) {
      logger.error('Erreur chargement événements', { error: err });
      toast.error('Erreur lors du chargement des événements');
    } finally {
      setLoading(false);
    }
  };

  const loadTimeSlots = async () => {
    try {
      setLoading(true);
      
      const startDate = startOfDay(new Date(selectedDate));
      const endDate = endOfDay(new Date(selectedDate));

      const { data: slotsData, error } = await supabase
        .from('time_slots')
        .select(`
          id,
          slot_time,
          capacity,
          event_activities!inner (
            id,
            activities (
              name,
              icon
            ),
            events!inner (
              id,
              name,
              event_date
            )
          ),
          reservations (
            id
          )
        `)
        .eq('event_activities.events.id', selectedEvent)
        .gte('slot_time', startDate.toISOString())
        .lte('slot_time', endDate.toISOString())
        .order('slot_time');

      if (error) throw error;

      // Calculer la capacité restante et le nombre de réservations
      const slotsWithDetails = await Promise.all(
        (slotsData || []).map(async (slot) => {
          const { data: capacityData } = await supabase
            .rpc('get_slot_remaining_capacity', { slot_uuid: slot.id });

          return {
            ...slot,
            remaining_capacity: capacityData || 0,
            reservations_count: slot.reservations?.length || 0,
            event_activity: {
              id: slot.event_activities.id,
              activity: slot.event_activities.activities,
              event: slot.event_activities.events
            }
          };
        })
      );

      setTimeSlots(slotsWithDetails);
    } catch (err) {
      logger.error('Erreur chargement créneaux', { error: err });
      toast.error('Erreur lors du chargement des créneaux');
    } finally {
      setLoading(false);
    }
  };

  const getCapacityColor = (remaining: number, total: number) => {
    const percentage = (remaining / total) * 100;
    if (percentage === 0) return 'bg-red-500';
    if (percentage <= 25) return 'bg-orange-500';
    if (percentage <= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getCapacityText = (remaining: number, total: number) => {
    const percentage = (remaining / total) * 100;
    if (percentage === 0) return 'Complet';
    if (percentage <= 25) return 'Presque plein';
    if (percentage <= 50) return 'À moitié plein';
    return 'Disponible';
  };

  // Grouper les créneaux par activité
  const slotsByActivity = timeSlots.reduce((acc, slot) => {
    const activityKey = `${slot.event_activity.activity.name}-${slot.event_activity.id}`;
    if (!acc[activityKey]) {
      acc[activityKey] = {
        activity: slot.event_activity.activity,
        slots: []
      };
    }
    acc[activityKey].slots.push(slot);
    return acc;
  }, {} as Record<string, { activity: any; slots: TimeSlotWithDetails[] }>);

  const renderDashboardView = () => (
    <div className="space-y-6">
      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-gray-900">{timeSlots.length}</div>
          <div className="text-sm text-gray-600">Total créneaux</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-green-600">
            {timeSlots.filter(s => s.remaining_capacity > 0).length}
          </div>
          <div className="text-sm text-gray-600">Créneaux disponibles</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-red-600">
            {timeSlots.filter(s => s.remaining_capacity === 0).length}
          </div>
          <div className="text-sm text-gray-600">Créneaux complets</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-blue-600">
            {timeSlots.reduce((sum, s) => sum + s.reservations_count, 0)}
          </div>
          <div className="text-sm text-gray-600">Réservations</div>
        </div>
      </div>

      {/* Vue par activité */}
      <div className="space-y-4">
        {Object.entries(slotsByActivity).map(([key, { activity, slots }]) => (
          <div key={key} className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{activity.icon}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{activity.name}</h3>
                    <p className="text-sm text-gray-600">
                      {slots.length} créneaux • {slots.reduce((sum, s) => sum + s.capacity, 0)} places totales
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Taux de remplissage</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {slots.length > 0 
                      ? Math.round(((slots.reduce((sum, s) => sum + s.capacity, 0) - slots.reduce((sum, s) => sum + s.remaining_capacity, 0)) / slots.reduce((sum, s) => sum + s.capacity, 0)) * 100)
                      : 0
                    }%
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {slots.map((slot) => (
                  <div key={slot.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-gray-900">
                        {format(new Date(slot.slot_time), 'HH:mm')}
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        slot.remaining_capacity === 0 
                          ? 'bg-red-100 text-red-800'
                          : slot.remaining_capacity <= slot.capacity * 0.25
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {getCapacityText(slot.remaining_capacity, slot.capacity)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Users className="h-4 w-4" />
                      <span>{slot.capacity - slot.remaining_capacity}/{slot.capacity} participants</span>
                    </div>
                    
                    {/* Barre de progression */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${getCapacityColor(slot.remaining_capacity, slot.capacity)}`}
                        style={{ width: `${((slot.capacity - slot.remaining_capacity) / slot.capacity) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {Object.keys(slotsByActivity).length === 0 && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun créneau</h3>
          <p className="text-gray-600 mb-4">
            Aucun créneau programmé pour cette date.
          </p>
          <p className="text-sm text-gray-500">
            💡 Conseil : Gérez les créneaux directement depuis la configuration des événements
          </p>
        </div>
      )}
    </div>
  );

  const renderCalendarView = () => {
    const hours = eachHourOfInterval({
      start: new Date(selectedDate + 'T08:00:00'),
      end: new Date(selectedDate + 'T18:00:00')
    });

    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Vue Planning</h3>
        </div>
        
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* En-têtes des heures */}
            <div className="flex border-b border-gray-200">
              <div className="w-32 p-4 font-medium text-gray-900">Activité</div>
              {hours.map((hour) => (
                <div key={hour.toISOString()} className="w-24 p-2 text-center text-sm font-medium text-gray-700 border-l border-gray-200">
                  {format(hour, 'HH:mm')}
                </div>
              ))}
            </div>
            
            {/* Lignes par activité */}
            {Object.entries(slotsByActivity).map(([key, { activity, slots }]) => (
              <div key={key} className="flex border-b border-gray-200">
                <div className="w-32 p-4 flex items-center gap-2">
                  <span className="text-lg">{activity.icon}</span>
                  <span className="text-sm font-medium text-gray-900">{activity.name}</span>
                </div>
                {hours.map((hour) => {
                  const hourSlots = slots.filter(slot => 
                    isSameHour(new Date(slot.slot_time), hour)
                  );
                  
                  return (
                    <div key={hour.toISOString()} className="w-24 p-1 border-l border-gray-200">
                      {hourSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className={`text-xs p-1 rounded mb-1 ${
                            slot.remaining_capacity === 0 
                              ? 'bg-red-100 text-red-800'
                              : slot.remaining_capacity <= slot.capacity * 0.25
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                          title={`${format(new Date(slot.slot_time), 'HH:mm')} - ${slot.capacity - slot.remaining_capacity}/${slot.capacity}`}
                        >
                          {format(new Date(slot.slot_time), 'mm')}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
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
      {/* Header avec navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planning des Créneaux</h1>
          <p className="text-gray-600">Vue d'ensemble et supervision des créneaux</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('dashboard')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'dashboard' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="h-4 w-4 inline mr-1" />
            Dashboard
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'calendar' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Calendar className="h-4 w-4 inline mr-1" />
            Planning
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-4">
          <Filter className="h-5 w-5 text-gray-400" />
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
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
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Message d'information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Vue de supervision</h3>
            <p className="text-sm text-blue-800 mt-1">
              Cette page offre une vue d'ensemble des créneaux. Pour créer ou modifier des créneaux, 
              rendez-vous dans <strong>Gestion des Événements</strong> → <strong>Gérer les activités</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Contenu selon le mode de vue */}
      {!selectedEvent || !selectedDate ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Sélectionnez un événement et une date</h3>
          <p className="text-gray-600">Choisissez un événement et une date pour visualiser les créneaux.</p>
        </div>
      ) : viewMode === 'dashboard' ? (
        renderDashboardView()
      ) : (
        renderCalendarView()
      )}
    </div>
  );
}