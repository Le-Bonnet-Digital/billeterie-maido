import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Plus, Clock, Users, Calendar as CalendarIcon, Trash2, Edit, UserCheck } from 'lucide-react';
import { format, addDays, startOfDay, isSameDay, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

interface EventActivity {
  id: string;
  activity_id: string;
  stock_limit: number | null;
  requires_time_slot: boolean;
  activity: {
    id: string;
    name: string;
    icon: string;
  };
}

interface TimeSlot {
  id: string;
  slot_time: string;
  capacity: number;
  remaining_capacity?: number;
  reservations_count?: number;
  reservations?: Reservation[];
}

interface Reservation {
  id: string;
  reservation_number: string;
  client_email: string;
  created_at: string;
}

interface TimeSlotsManagementModalProps {
  eventActivity: EventActivity;
  onClose: () => void;
}

export default function TimeSlotsManagementModal({ eventActivity, onClose }: TimeSlotsManagementModalProps) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkCreateModal, setShowBulkCreateModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [showReservationsModal, setShowReservationsModal] = useState(false);

  useEffect(() => {
    loadTimeSlots();
  }, [selectedDate]);

  const loadTimeSlots = async () => {
    try {
      setLoading(true);
      
      const startDate = startOfDay(selectedDate);
      const endDate = addDays(startDate, 1);
      
      const { data, error } = await supabase
        .from('time_slots')
        .select(`
          id,
          slot_time,
          capacity,
          reservations (
            id,
            reservation_number,
            client_email,
            created_at
          )
        `)
        .eq('event_activity_id', eventActivity.id)
        .gte('slot_time', startDate.toISOString())
        .lt('slot_time', endDate.toISOString())
        .order('slot_time');

      if (error) throw error;

      const slotsWithStats = (data || []).map(slot => ({
        ...slot,
        reservations_count: slot.reservations?.length || 0,
        remaining_capacity: slot.capacity - (slot.reservations?.length || 0)
      }));

      setTimeSlots(slotsWithStats);
    } catch (err) {
      console.error('Erreur chargement créneaux:', err);
      toast.error('Erreur lors du chargement des créneaux');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce créneau ? Toutes les réservations associées seront également supprimées.')) return;

    try {
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

  const getSlotStatusColor = (slot: TimeSlot) => {
    const fillRate = (slot.reservations_count || 0) / slot.capacity;
    if (fillRate >= 1) return 'bg-red-100 border-red-300 text-red-800';
    if (fillRate >= 0.8) return 'bg-orange-100 border-orange-300 text-orange-800';
    if (fillRate >= 0.5) return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    return 'bg-green-100 border-green-300 text-green-800';
  };

  const generateDateOptions = () => {
    const dates = [];
    for (let i = 0; i < 30; i++) {
      dates.push(addDays(new Date(), i));
    }
    return dates;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{eventActivity.activity.icon}</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Créneaux - {eventActivity.activity.name}
                </h2>
                <p className="text-sm text-gray-600">
                  Gérez les créneaux horaires pour cette activité
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          {/* Contrôles */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <select
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {generateDateOptions().map(date => (
                    <option key={date.toISOString()} value={format(date, 'yyyy-MM-dd')}>
                      {format(date, 'EEEE d MMMM yyyy', { locale: fr })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulkCreateModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <CalendarIcon className="h-4 w-4" />
                Création en masse
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nouveau créneau
              </button>
            </div>
          </div>

          {/* Vue calendrier des créneaux */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">
              Créneaux du {format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
            </h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : timeSlots.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Aucun créneau défini pour cette date</p>
                <p className="text-sm">Créez votre premier créneau pour commencer</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {timeSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className={`border-2 rounded-lg p-4 transition-colors ${getSlotStatusColor(slot)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span className="font-semibold">
                          {format(new Date(slot.slot_time), 'HH:mm')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedSlot(slot);
                            setShowReservationsModal(true);
                          }}
                          className="p-1 hover:bg-white hover:bg-opacity-50 rounded"
                          title="Voir les réservations"
                        >
                          <UserCheck className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="p-1 hover:bg-white hover:bg-opacity-50 rounded"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-3 w-3" />
                      <span>
                        {slot.reservations_count}/{slot.capacity} places
                      </span>
                    </div>
                    
                    <div className="mt-2">
                      <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
                        <div
                          className="bg-current h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, ((slot.reservations_count || 0) / slot.capacity) * 100)}%`
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal création simple */}
      {showCreateModal && (
        <CreateTimeSlotModal
          eventActivity={eventActivity}
          selectedDate={selectedDate}
          onClose={() => setShowCreateModal(false)}
          onSave={() => {
            setShowCreateModal(false);
            loadTimeSlots();
          }}
        />
      )}

      {/* Modal création en masse */}
      {showBulkCreateModal && (
        <BulkCreateTimeSlotsModal
          eventActivity={eventActivity}
          onClose={() => setShowBulkCreateModal(false)}
          onSave={() => {
            setShowBulkCreateModal(false);
            loadTimeSlots();
          }}
        />
      )}

      {/* Modal réservations */}
      {showReservationsModal && selectedSlot && (
        <SlotReservationsModal
          timeSlot={selectedSlot}
          onClose={() => {
            setShowReservationsModal(false);
            setSelectedSlot(null);
          }}
        />
      )}
    </div>
  );
}

// Modal de création simple
interface CreateTimeSlotModalProps {
  eventActivity: EventActivity;
  selectedDate: Date;
  onClose: () => void;
  onSave: () => void;
}

function CreateTimeSlotModal({ eventActivity, selectedDate, onClose, onSave }: CreateTimeSlotModalProps) {
  const [formData, setFormData] = useState({
    time: '09:00',
    capacity: 15
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      const slotDateTime = new Date(selectedDate);
      const [hours, minutes] = formData.time.split(':');
      slotDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const { error } = await supabase
        .from('time_slots')
        .insert({
          event_activity_id: eventActivity.id,
          slot_time: slotDateTime.toISOString(),
          capacity: formData.capacity,
          pass_id: '00000000-0000-0000-0000-000000000000' // Valeur par défaut temporaire
        });

      if (error) throw error;
      
      toast.success('Créneau créé avec succès');
      onSave();
    } catch (err) {
      console.error('Erreur création créneau:', err);
      toast.error('Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Nouveau Créneau</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="text"
                value={format(selectedDate, 'EEEE d MMMM yyyy', { locale: fr })}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Heure *
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
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
                {saving ? 'Création...' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Modal de création en masse
interface BulkCreateTimeSlotsModalProps {
  eventActivity: EventActivity;
  onClose: () => void;
  onSave: () => void;
}

function BulkCreateTimeSlotsModal({ eventActivity, onClose, onSave }: BulkCreateTimeSlotsModalProps) {
  const [formData, setFormData] = useState({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '17:00',
    interval: 60, // minutes
    capacity: 15,
    daysOfWeek: [1, 2, 3, 4, 5, 6, 0] // Lun-Dim
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      const slots = [];
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        if (!formData.daysOfWeek.includes(date.getDay())) continue;
        
        const [startHours, startMinutes] = formData.startTime.split(':').map(Number);
        const [endHours, endMinutes] = formData.endTime.split(':').map(Number);
        
        const startTimeMinutes = startHours * 60 + startMinutes;
        const endTimeMinutes = endHours * 60 + endMinutes;
        
        for (let timeMinutes = startTimeMinutes; timeMinutes < endTimeMinutes; timeMinutes += formData.interval) {
          const slotDate = new Date(date);
          slotDate.setHours(Math.floor(timeMinutes / 60), timeMinutes % 60, 0, 0);
          
          slots.push({
            event_activity_id: eventActivity.id,
            slot_time: slotDate.toISOString(),
            capacity: formData.capacity,
            pass_id: '00000000-0000-0000-0000-000000000000' // Valeur par défaut temporaire
          });
        }
      }
      
      if (slots.length === 0) {
        toast.error('Aucun créneau à créer avec ces paramètres');
        return;
      }
      
      const { error } = await supabase
        .from('time_slots')
        .insert(slots);

      if (error) throw error;
      
      toast.success(`${slots.length} créneaux créés avec succès`);
      onSave();
    } catch (err) {
      console.error('Erreur création créneaux:', err);
      toast.error('Erreur lors de la création');
    } finally {
      setSaving(false);
    }
  };

  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Création en Masse</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de début *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de fin *
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Heure de début *
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
                  Heure de fin *
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Intervalle (minutes) *
                </label>
                <select
                  value={formData.interval}
                  onChange={(e) => setFormData({ ...formData, interval: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 heure</option>
                  <option value={120}>2 heures</option>
                </select>
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jours de la semaine
              </label>
              <div className="flex gap-2">
                {dayNames.map((day, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      const newDays = formData.daysOfWeek.includes(index)
                        ? formData.daysOfWeek.filter(d => d !== index)
                        : [...formData.daysOfWeek, index];
                      setFormData({ ...formData, daysOfWeek: newDays });
                    }}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      formData.daysOfWeek.includes(index)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {day}
                  </button>
                ))}
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
                disabled={saving}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                {saving ? 'Création...' : 'Créer les créneaux'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Modal des réservations d'un créneau
interface SlotReservationsModalProps {
  timeSlot: TimeSlot;
  onClose: () => void;
}

function SlotReservationsModal({ timeSlot, onClose }: SlotReservationsModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Réservations - {format(new Date(timeSlot.slot_time), 'HH:mm')}
              </h3>
              <p className="text-sm text-gray-600">
                {format(new Date(timeSlot.slot_time), 'EEEE d MMMM yyyy', { locale: fr })}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm">
              <span>Occupation</span>
              <span>{timeSlot.reservations_count}/{timeSlot.capacity} places</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min(100, ((timeSlot.reservations_count || 0) / timeSlot.capacity) * 100)}%`
                }}
              ></div>
            </div>
          </div>

          {timeSlot.reservations && timeSlot.reservations.length > 0 ? (
            <div className="space-y-3">
              {timeSlot.reservations.map((reservation) => (
                <div key={reservation.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">
                        {reservation.reservation_number}
                      </div>
                      <div className="text-sm text-gray-600">
                        {reservation.client_email}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(reservation.created_at), 'dd/MM/yyyy HH:mm')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Aucune réservation pour ce créneau</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}