import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Plus, Settings, Clock, Users, Target, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import TimeSlotsManager from './TimeSlotsManager';
import { logger } from '../../lib/logger';

interface Activity {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface EventActivity {
  id: string;
  activity_id: string;
  stock_limit: number | null;
  requires_time_slot: boolean;
  activity: Activity;
  time_slots_count?: number;
  total_capacity?: number;
}

interface Event {
  id: string;
  name: string;
  event_date: string;
}

interface EventActivitiesManagerProps {
  event: Event;
  onClose: () => void;
}

export default function EventActivitiesManager({ event, onClose }: EventActivitiesManagerProps) {
  const [eventActivities, setEventActivities] = useState<EventActivity[]>([]);
  const [availableActivities, setAvailableActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTimeSlotsModal, setShowTimeSlotsModal] = useState<EventActivity | null>(null);

  const loadData = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      
      // Charger les activités de l'événement
      const { data: eventActivitiesData, error: eventActivitiesError } = await supabase
        .from('event_activities')
        .select(`
          *,
          activities (*)
        `)
        .eq('event_id', event.id);

      if (eventActivitiesError) throw eventActivitiesError;

      // Enrichir avec le nombre de créneaux
      const enrichedEventActivities = await Promise.all(
        (eventActivitiesData || []).map(async (ea) => {
          const { count } = await supabase
            .from('time_slots')
            .select('*', { count: 'exact', head: true })
            .eq('event_activity_id', ea.id);

          const { data: slotsData } = await supabase
            .from('time_slots')
            .select('capacity')
            .eq('event_activity_id', ea.id);

          const totalCapacity = slotsData?.reduce((sum, slot) => sum + slot.capacity, 0) || 0;

          return {
            ...ea,
            activity: ea.activities,
            time_slots_count: count || 0,
            total_capacity: totalCapacity
          };
        })
      );

      setEventActivities(enrichedEventActivities);

      // Charger toutes les activités disponibles
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .order('name');

      if (activitiesError) throw activitiesError;
      setAvailableActivities(activitiesData || []);
    } catch (err) {
      logger.error('Erreur chargement données', { error: err });
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [event.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRemoveActivity = async (eventActivityId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir retirer cette activité de l\'événement ?')) return;

    try {
      const { error } = await supabase
        .from('event_activities')
        .delete()
        .eq('id', eventActivityId);

      if (error) throw error;
      
      toast.success('Activité retirée de l\'événement');
      loadData();
    } catch (err) {
      logger.error('Erreur suppression activité', { error: err });
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleTimeSlotsClose = () => {
    setShowTimeSlotsModal(null);
    loadData(); // Recharger pour mettre à jour les compteurs
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div
          className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-activities-title"
        >
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 id="event-activities-title" className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Settings className="h-6 w-6 text-green-600" />
                  Activités - {event.name}
                </h2>
                <p className="text-gray-600">
                  {format(new Date(event.event_date), 'EEEE d MMMM yyyy', { locale: fr })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter Activité
                </button>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {eventActivities.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune activité</h3>
                <p className="text-gray-600 mb-4">
                  Ajoutez des activités à votre événement pour permettre aux participants de réserver.
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Ajouter une activité
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {eventActivities.map((eventActivity) => (
                  <div key={eventActivity.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <span className="text-3xl">{eventActivity.activity.icon}</span>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {eventActivity.activity.name}
                          </h3>
                          <p className="text-gray-600 text-sm mb-3">
                            {eventActivity.activity.description}
                          </p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-gray-500">
                              <Users className="h-4 w-4" />
                              <span>
                                Stock: {eventActivity.stock_limit === null ? 'Illimité' : eventActivity.stock_limit}
                                {eventActivity.requires_time_slot &&
                                  (eventActivity.total_capacity ?? 0) > 0 && (
                                    <span className="text-blue-600 ml-1">
                                      (calculé: {eventActivity.total_capacity ?? 0})
                                    </span>
                                  )}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-gray-500">
                              <Clock className="h-4 w-4" />
                              <span>
                                {eventActivity.requires_time_slot ? 'Avec créneaux' : 'Sans créneaux'}
                              </span>
                            </div>
                            
                            {eventActivity.requires_time_slot && (
                              <div className="flex items-center gap-2 text-gray-500">
                                <Target className="h-4 w-4" />
                                <span>{eventActivity.time_slots_count} créneau(x)</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {eventActivity.requires_time_slot && (
                          <button
                            onClick={() => setShowTimeSlotsModal(eventActivity)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-sm font-medium transition-colors flex items-center gap-1"
                          >
                            <Clock className="h-3 w-3" />
                            Créneaux ({eventActivity.time_slots_count})
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleRemoveActivity(eventActivity.id)}
                          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                          title="Retirer de l'événement"
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
        </div>
      </div>

      {showAddModal && (
        <AddActivityModal
          event={event}
          availableActivities={availableActivities}
          existingActivityIds={eventActivities.map(ea => ea.activity_id)}
          onClose={() => setShowAddModal(false)}
          onSave={() => {
            setShowAddModal(false);
            loadData();
          }}
        />
      )}

      {showTimeSlotsModal && (
        <TimeSlotsManager
          eventActivity={showTimeSlotsModal}
          event={event}
          onClose={handleTimeSlotsClose}
        />
      )}
    </>
  );
}

interface AddActivityModalProps {
  event: Event;
  availableActivities: Activity[];
  existingActivityIds: string[];
  onClose: () => void;
  onSave: () => void;
}

function AddActivityModal({ event, availableActivities, existingActivityIds, onClose, onSave }: AddActivityModalProps) {
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [stockLimit, setStockLimit] = useState<number | null>(null);
  const [requiresTimeSlot, setRequiresTimeSlot] = useState(false);
  const [saving, setSaving] = useState(false);

  const availableOptions = availableActivities.filter(
    activity => !existingActivityIds.includes(activity.id)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedActivityId) {
      toast.error('Veuillez sélectionner une activité');
      return;
    }

    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('event_activities')
        .insert({
          event_id: event.id,
          activity_id: selectedActivityId,
          stock_limit: stockLimit,
          requires_time_slot: requiresTimeSlot
        });

      if (error) throw error;
      
      toast.success('Activité ajoutée à l\'événement');
      onSave();
    } catch (err) {
      logger.error('Erreur ajout activité', { error: err });
      toast.error('Erreur lors de l\'ajout');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60] overflow-y-auto">
      <div
        className="bg-white rounded-lg max-w-md w-full flex flex-col"
        style={{ maxHeight: '90vh' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-activity-title"
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 id="add-activity-title" className="text-lg font-semibold text-gray-900">
              Ajouter une Activité
          </h3>
          <button onClick={onClose} aria-label="Fermer le modal" className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {availableOptions.length === 0 ? (
          <div className="p-6">
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                Toutes les activités disponibles ont déjà été ajoutées à cet événement.
              </p>
              <button
                onClick={onClose}
                className="mt-4 bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-md font-medium transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 p-6 overflow-y-auto">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Activité *
              </label>
                <select
                  value={selectedActivityId}
                  onChange={(e) => setSelectedActivityId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                >
                  <option value="">Sélectionner une activité</option>
                  {availableOptions.map((activity) => (
                    <option key={activity.id} value={activity.id}>
                      {activity.icon} {activity.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock limite (optionnel)
                </label>
                <input
                  type="number"
                  min="1"
                  value={stockLimit || ''}
                  onChange={(e) => setStockLimit(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Laisser vide pour stock illimité"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="requires_time_slot"
                  checked={requiresTimeSlot}
                  onChange={(e) => setRequiresTimeSlot(e.target.checked)}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="requires_time_slot" className="text-sm font-medium text-gray-700">
                  Nécessite des créneaux horaires
                </label>
              </div>

              {requiresTimeSlot && (
                <div className="p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-800">
                    Le stock sera calculé automatiquement selon la capacité des créneaux créés.
                  </p>
                </div>
              )}

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
                  {saving ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </form>
          )}
      </div>
    </div>
  );
}
