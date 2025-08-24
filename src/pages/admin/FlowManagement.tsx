import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Clock, Calendar, Download, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

interface TimeSlotWithReservations {
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
  };
  pass: {
    name: string;
    event: {
      name: string;
    };
  };
  reservations: Array<{
    id: string;
    reservation_number: string;
    client_email: string;
    payment_status: string;
    created_at: string;
  }>;
}

interface Event {
  id: string;
  name: string;
  event_date: string;
}

export default function FlowManagement() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [timeSlots, setTimeSlots] = useState<TimeSlotWithReservations[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlotWithReservations | null>(null);
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
      console.error('Erreur chargement événements:', err);
      toast.error('Erreur lors du chargement des événements');
    } finally {
      setLoading(false);
    }
  };

  const loadTimeSlots = async () => {
    try {
      setLoading(true);
      
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(selectedDate);
      endDate.setHours(23, 59, 59, 999);

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
            )
          ),
          passes!inner (
            name,
            events!inner (
              id,
              name
            )
          ),
          reservations (
            id,
            reservation_number,
            client_email,
            payment_status,
            created_at
          )
        `)
        .eq('passes.events.id', selectedEvent)
        .gte('slot_time', startDate.toISOString())
        .lte('slot_time', endDate.toISOString())
        .order('slot_time');

      if (error) throw error;

      // Calculer la capacité restante pour chaque créneau
      const slotsWithCapacity = await Promise.all(
        (slotsData || []).map(async (slot) => {
          const { data: capacityData } = await supabase
            .rpc('get_slot_remaining_capacity', { slot_uuid: slot.id });

          return {
            ...slot,
            remaining_capacity: capacityData || 0,
            event_activity: slot.event_activities,
            pass: {
              name: slot.passes.name,
              event: slot.passes.events
            }
          };
        })
      );

      setTimeSlots(slotsWithCapacity);
    } catch (err) {
      console.error('Erreur chargement créneaux:', err);
      toast.error('Erreur lors du chargement des créneaux');
    } finally {
      setLoading(false);
    }
  };

  const exportParticipantsList = (slot: TimeSlotWithReservations) => {
    const csvContent = [
      ['Numéro de réservation', 'Email', 'Statut', 'Date de réservation'].join(','),
      ...slot.reservations.map(res => [
        res.reservation_number,
        res.client_email,
        res.payment_status,
        format(new Date(res.created_at), 'dd/MM/yyyy HH:mm')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `participants-${slot.event_activity.activity.name}-${format(new Date(slot.slot_time), 'yyyy-MM-dd-HH-mm')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Liste des participants exportée');
  };

  const getSlotStatusColor = (remaining: number, total: number) => {
    const percentage = (remaining / total) * 100;
    if (percentage === 0) return 'bg-red-500';
    if (percentage <= 25) return 'bg-orange-500';
    if (percentage <= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getSlotStatusText = (remaining: number, total: number) => {
    const percentage = (remaining / total) * 100;
    if (percentage === 0) return 'Complet';
    if (percentage <= 25) return 'Presque plein';
    if (percentage <= 50) return 'À moitié plein';
    return 'Disponible';
  };

  if (loading && events.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestion des Flux</h1>
        <p className="text-gray-600">Suivez et gérez les participants par créneau</p>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Vue d'ensemble des créneaux */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Créneaux du {selectedDate ? format(new Date(selectedDate), 'dd MMMM yyyy', { locale: fr }) : '...'}
          </h2>
        </div>

        {timeSlots.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun créneau</h3>
            <p className="text-gray-600">
              {selectedEvent && selectedDate 
                ? 'Aucun créneau programmé pour cette date'
                : 'Sélectionnez un événement et une date'
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {timeSlots.map((slot) => (
              <div key={slot.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{slot.event_activity.activity.icon}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {slot.event_activity.activity.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {format(new Date(slot.slot_time), 'HH:mm')} - {slot.pass.name}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getSlotStatusColor(slot.remaining_capacity, slot.capacity)}`}></div>
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {slot.capacity - slot.remaining_capacity}/{slot.capacity} participants
                        </div>
                        <div className="text-gray-600">
                          {getSlotStatusText(slot.remaining_capacity, slot.capacity)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedSlot(slot)}
                      className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-sm font-medium transition-colors flex items-center gap-1"
                    >
                      <Users className="h-3 w-3" />
                      Voir participants
                    </button>
                    
                    <button
                      onClick={() => exportParticipantsList(slot)}
                      className="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded text-sm font-medium transition-colors flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" />
                      Exporter
                    </button>
                  </div>
                </div>
                
                {/* Barre de progression */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${getSlotStatusColor(slot.remaining_capacity, slot.capacity)}`}
                      style={{ width: `${((slot.capacity - slot.remaining_capacity) / slot.capacity) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal détail des participants */}
      {selectedSlot && (
        <ParticipantsModal
          slot={selectedSlot}
          onClose={() => setSelectedSlot(null)}
        />
      )}
    </div>
  );
}

interface ParticipantsModalProps {
  slot: TimeSlotWithReservations;
  onClose: () => void;
}

function ParticipantsModal({ slot, onClose }: ParticipantsModalProps) {
  const sendReminderEmail = async (email: string) => {
    // Simuler l'envoi d'email de rappel
    toast.success(`Email de rappel envoyé à ${email}`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-2xl">{slot.event_activity.activity.icon}</span>
                {slot.event_activity.activity.name}
              </h2>
              <p className="text-gray-600">
                {format(new Date(slot.slot_time), 'EEEE d MMMM yyyy à HH:mm', { locale: fr })}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {/* Statistiques */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {slot.capacity - slot.remaining_capacity}
              </div>
              <div className="text-sm text-blue-800">Participants inscrits</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {slot.remaining_capacity}
              </div>
              <div className="text-sm text-green-800">Places restantes</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {slot.capacity}
              </div>
              <div className="text-sm text-purple-800">Capacité totale</div>
            </div>
          </div>
          
          {/* Liste des participants */}
          <div className="overflow-y-auto max-h-96">
            <h3 className="font-semibold text-gray-900 mb-3">Liste des participants</h3>
            
            {slot.reservations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Aucun participant inscrit pour ce créneau</p>
              </div>
            ) : (
              <div className="space-y-2">
                {slot.reservations.map((reservation) => (
                  <div key={reservation.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        reservation.payment_status === 'paid' ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {reservation.client_email}
                        </div>
                        <div className="text-sm text-gray-600">
                          {reservation.reservation_number} • {format(new Date(reservation.created_at), 'dd/MM/yyyy HH:mm')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {reservation.payment_status === 'paid' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" title="Payé" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-yellow-600" title="En attente" />
                      )}
                      
                      <button
                        onClick={() => sendReminderEmail(reservation.client_email)}
                        className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                        title="Envoyer un rappel"
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}