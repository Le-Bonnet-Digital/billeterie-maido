import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Clock, Plus, Edit, Trash2, Users, Target, X } from 'lucide-react';
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
  };
  pass: {
    id: string;
    name: string;
    event: {
      id: string;
      name: string;
    };
  };
}

interface Pass {
  id: string;
  name: string;
  event: {
    id: string;
    name: string;
  };
}

export default function TimeSlotManagement() {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [passes, setPasses] = useState<Pass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimeSlot | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Charger les créneaux avec leurs pass et événements
      const { data: slotsData, error: slotsError } = await supabase
        .from('time_slots')
        .select(`
          id,
          slot_time,
          capacity,
          event_activity_id,
          event_activities (
            id,
            stock_limit,
            requires_time_slot,
            activities (
              id,
              name,
              icon
            )
          ),
          passes (
            id,
            name,
            events (
              id,
              name
            )
          )
        `)
        .order('slot_time');

      if (slotsError) throw slotsError;

      // Calculer la capacité restante pour chaque créneau
      const slotsWithCapacity = await Promise.all(
        (slotsData || []).map(async (slot) => {
          // Get event activity remaining capacity
          let eventActivityCapacity = 999999;
          if (slot.event_activities?.stock_limit) {
            const { data: activityCapacityData } = await supabase
              .rpc('get_event_activity_remaining_stock', { 
                event_activity_id_param: slot.event_activities.id 
              });
            eventActivityCapacity = activityCapacityData || 0;
          }
          
          // Get slot specific remaining capacity
          const { data: slotCapacityData } = await supabase
            .rpc('get_slot_remaining_capacity', { slot_uuid: slot.id });
          
          const slotCapacity = slotCapacityData || 0;
          
          // The actual remaining capacity is the minimum of slot capacity and event activity capacity
          const remainingCapacity = Math.min(slotCapacity, eventActivityCapacity);
          
          return { 
            ...slot, 
            pass: {
              id: slot.passes?.id || '',
              name: slot.passes?.name || '',
              event: slot.passes?.events || { id: '', name: 'Événement non défini' }
            }, 
            event_activity: slot.event_activities ? {
              ...slot.event_activities,
              activity: slot.event_activities.activities
            } : null,
            remaining_capacity: remainingCapacity
          };
        })
      );
      
      setTimeSlots(slotsWithCapacity);

      // Charger tous les pass avec leurs activités pour le formulaire
      const { data: passesData, error: passesError } = await supabase
        .from('passes')
        .select(`
          id,
          name,
          pass_activities (
            event_activity_id,
            event_activities (
              id,
              activities (
                id,
                name,
                icon
              )
            )
          ),
          events (
            id,
            name
          )
        `)
        .order('name');

      if (passesError) throw passesError;
      setPasses((passesData || []).map(pass => ({
        id: pass.id,
        name: pass.name,
        event: pass.events || { id: '', name: 'Événement non défini' },
        event_activities: (pass.pass_activities || []).map((pa: any) => ({
          id: pa.event_activities.id,
          activity: pa.event_activities.activities
        }))
      })));
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

      if (error) {
        throw error;
      }
      
      toast.success('Créneau supprimé avec succès');
      loadData();
    } catch (err) {
      console.error('Erreur suppression créneau:', err);
      toast.error('Erreur lors de la suppression');
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
          <p className="text-gray-600">Planifiez les créneaux horaires pour les activités</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nouveau Créneau
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-gray-900">{timeSlots.length}</div>
          <div className="text-sm text-gray-600">Total Créneaux</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-green-600">
            {timeSlots.filter(s => s.event_activity?.activity?.name === 'Poney').length}
          </div>
          <div className="text-sm text-gray-600">Créneaux Poney</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-orange-600">
            {timeSlots.filter(s => s.event_activity?.activity?.name === 'Tir à l\'Arc').length}
          </div>
          <div className="text-sm text-gray-600">Créneaux Tir à l'Arc</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-gray-900">
            {timeSlots.reduce((sum, s) => sum + (s.remaining_capacity || 0), 0)}
          </div>
          <div className="text-sm text-gray-600">Places Disponibles</div>
        </div>
      </div>

      {/* Liste des créneaux */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Créneaux ({timeSlots.length})</h2>
        </div>

        {timeSlots.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun créneau</h3>
            <p className="text-gray-600">Créez votre premier créneau pour commencer.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {timeSlots.map((slot) => (
              <div key={slot.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-600">
                        <span className="text-lg">{slot.event_activity?.activity?.icon || '❓'}</span>
                        {slot.event_activity?.activity?.name || 'Activité inconnue'}
                      </div>
                      <span className="text-lg font-semibold text-gray-900">
                        {format(new Date(slot.slot_time), 'HH:mm')}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div>
                        {format(new Date(slot.slot_time), 'EEEE d MMMM yyyy', { locale: fr })}
                      </div>
                      <div>
                        {slot.remaining_capacity}/{slot.capacity} places disponibles
                        {slot.event_activity && slot.event_activity.stock_limit && (
                          <span className="ml-2 text-xs text-blue-600">
                            (Activité: {slot.event_activity.remaining_capacity}/{slot.event_activity.stock_limit})
                          </span>
                        )}
                      </div>
                      <div>Pass: {slot.pass.name} ({slot.pass.event.name})</div>
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
          passes={passes}
          onClose={() => {
            setShowCreateModal(false);
            setEditingSlot(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingSlot(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

interface TimeSlotFormModalProps {
  timeSlot?: TimeSlot | null;
  passes: Pass[];
  onClose: () => void;
  onSave: () => void;
}

function TimeSlotFormModal({ timeSlot, passes, onClose, onSave }: TimeSlotFormModalProps) {
  const [availableActivities, setAvailableActivities] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    pass_id: timeSlot?.pass.id || '',
    event_activity_id: timeSlot?.event_activity?.id || '',
    slot_time: timeSlot ? format(new Date(timeSlot.slot_time), "yyyy-MM-dd'T'HH:mm") : '',
    capacity: timeSlot?.capacity || 15
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (formData.pass_id) {
      loadPassActivities();
    }
  }, [formData.pass_id]);

  const loadPassActivities = async () => {
    try {
      const selectedPass = passes.find(p => p.id === formData.pass_id);
      if (selectedPass && 'event_activities' in selectedPass) {
        setAvailableActivities((selectedPass as any).event_activities);
      }
    } catch (err) {
      console.error('Erreur chargement activités du pass:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.pass_id || !formData.event_activity_id || !formData.slot_time || formData.capacity <= 0) {
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
            pass_id: formData.pass_id,
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
            pass_id: formData.pass_id,
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
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {timeSlot ? 'Modifier le Créneau' : 'Créer un Créneau'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1">
            <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pass *
              </label>
              <select
                value={formData.pass_id}
                onChange={(e) => setFormData({ ...formData, pass_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Sélectionner un pass</option>
                {passes.map((pass) => (
                  <option key={pass.id} value={pass.id}>
                    {pass.name} ({pass.event?.name || 'Événement non défini'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Activité *
              </label>
              <select
                value={formData.event_activity_id}
                onChange={(e) => setFormData({ ...formData, event_activity_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={!formData.pass_id}
              >
                <option value="">Sélectionner une activité</option>
                {availableActivities.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.activity.icon} {activity.activity.name}
                  </option>
                ))}
              </select>
              {!formData.pass_id && (
                <p className="text-xs text-gray-500 mt-1">
                  Sélectionnez d'abord un pass pour voir les activités disponibles
                </p>
              )}
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
    </div>
  );
}