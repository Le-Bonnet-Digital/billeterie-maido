import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Plus, Edit, Trash2, X, Activity, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

interface Event {
  id: string;
  name: string;
  event_date: string;
  sales_opening_date: string;
  sales_closing_date: string;
  status: 'draft' | 'published' | 'finished' | 'cancelled';
  cgv_content: string;
  faq_content: string;
  key_info_content: string;
  has_animations: boolean;
  created_at: string;
  updated_at: string;
}

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

interface EventAnimation {
  id: string;
  name: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  capacity: number | null;
  is_active: boolean;
}

export default function EventManagement() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showActivitiesModal, setShowActivitiesModal] = useState(false);
  const [selectedEventForActivities, setSelectedEventForActivities] = useState<Event | null>(null);
  const [showAnimationsModal, setShowAnimationsModal] = useState(false);
  const [selectedEventForAnimations, setSelectedEventForAnimations] = useState<Event | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Erreur chargement événements:', err);
      toast.error('Erreur lors du chargement des événements');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.')) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
      
      toast.success('Événement supprimé avec succès');
      loadEvents();
    } catch (err) {
      console.error('Erreur suppression événement:', err);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleManageActivities = (event: Event) => {
    setSelectedEventForActivities(event);
    setShowActivitiesModal(true);
  };

  const handleManageAnimations = (event: Event) => {
    setSelectedEventForAnimations(event);
    setShowAnimationsModal(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-800' },
      published: { label: 'Publié', color: 'bg-green-100 text-green-800' },
      finished: { label: 'Terminé', color: 'bg-blue-100 text-blue-800' },
      cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Événements</h1>
          <p className="text-gray-600">Créez et gérez vos événements</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nouvel Événement
        </button>
      </div>

      {/* Liste des événements */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Événements ({events.length})</h2>
        </div>

        {events.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun événement</h3>
            <p className="text-gray-600">Créez votre premier événement pour commencer.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {events.map((event) => (
              <div key={event.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{event.name}</h3>
                      {getStatusBadge(event.status)}
                      {event.has_animations && (
                        <span className="px-2 py-1 bg-pink-100 text-pink-800 text-xs font-medium rounded-full">
                          🎭 Animations
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-500 mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(event.event_date), 'dd MMMM yyyy', { locale: fr })}</span>
                      </div>
                      <div>
                        Vente: {format(new Date(event.sales_opening_date), 'dd/MM')} - {format(new Date(event.sales_closing_date), 'dd/MM')}
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm">{event.key_info_content}</p>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-6">
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleManageActivities(event)}
                        className="px-3 py-1 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded text-sm font-medium transition-colors"
                      >
                        Gérer les activités
                      </button>
                      
                      {event.has_animations && (
                        <button
                          onClick={() => handleManageAnimations(event)}
                          className="px-3 py-1 bg-pink-100 text-pink-700 hover:bg-pink-200 rounded text-sm font-medium transition-colors"
                        >
                          🎭 Animations
                        </button>
                      )}
                    </div>
                    
                    <button
                      onClick={() => setEditingEvent(event)}
                      className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
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
      {(showCreateModal || editingEvent) && (
        <EventFormModal
          event={editingEvent}
          onClose={() => {
            setShowCreateModal(false);
            setEditingEvent(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingEvent(null);
            loadEvents();
          }}
        />
      )}

      {/* Modal de gestion des activités */}
      {showActivitiesModal && selectedEventForActivities && (
        <EventActivitiesModal
          event={selectedEventForActivities}
          onClose={() => {
            setShowActivitiesModal(false);
            setSelectedEventForActivities(null);
          }}
        />
      )}

      {/* Modal de gestion des animations */}
      {showAnimationsModal && selectedEventForAnimations && (
        <EventAnimationsModal
          event={selectedEventForAnimations}
          onClose={() => {
            setShowAnimationsModal(false);
            setSelectedEventForAnimations(null);
          }}
        />
      )}
    </div>
  );
}

interface EventFormModalProps {
  event?: Event | null;
  onClose: () => void;
  onSave: () => void;
}

function EventFormModal({ event, onClose, onSave }: EventFormModalProps) {
  const [formData, setFormData] = useState({
    name: event?.name || '',
    event_date: event?.event_date ? format(new Date(event.event_date), 'yyyy-MM-dd') : '',
    sales_opening_date: event?.sales_opening_date ? format(new Date(event.sales_opening_date), "yyyy-MM-dd'T'HH:mm") : '',
    sales_closing_date: event?.sales_closing_date ? format(new Date(event.sales_closing_date), "yyyy-MM-dd'T'HH:mm") : '',
    status: event?.status || 'draft',
    cgv_content: event?.cgv_content || '',
    faq_content: event?.faq_content || '',
    key_info_content: event?.key_info_content || '',
    has_animations: event?.has_animations || false,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.event_date || !formData.sales_opening_date || !formData.sales_closing_date) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setSaving(true);
      
      if (event) {
        // Mise à jour
        const { error } = await supabase
          .from('events')
          .update({
            name: formData.name,
            event_date: formData.event_date,
            sales_opening_date: formData.sales_opening_date,
            sales_closing_date: formData.sales_closing_date,
            status: formData.status,
            cgv_content: formData.cgv_content,
            faq_content: formData.faq_content,
            key_info_content: formData.key_info_content,
            has_animations: formData.has_animations || false,
            updated_at: new Date().toISOString()
          })
          .eq('id', event.id);

        if (error) throw error;
        toast.success('Événement mis à jour avec succès');
      } else {
        // Création
        const { error } = await supabase
          .from('events')
          .insert({
            name: formData.name,
            event_date: formData.event_date,
            sales_opening_date: formData.sales_opening_date,
            sales_closing_date: formData.sales_closing_date,
            status: formData.status,
            cgv_content: formData.cgv_content,
            faq_content: formData.faq_content,
            key_info_content: formData.key_info_content,
            has_animations: formData.has_animations || false
          })
          .select()
          .single();

        if (error) throw error;
        toast.success('Événement créé avec succès');
      }
      
      onSave();
    } catch (err) {
      console.error('Erreur sauvegarde événement:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {event ? 'Modifier l\'Événement' : 'Créer un Événement'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de l'événement *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date de l'événement *
                </label>
                <input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Statut
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="draft">Brouillon</option>
                  <option value="published">Publié</option>
                  <option value="finished">Terminé</option>
                  <option value="cancelled">Annulé</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ouverture des ventes *
                </label>
                <input
                  type="datetime-local"
                  value={formData.sales_opening_date}
                  onChange={(e) => setFormData({ ...formData, sales_opening_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fermeture des ventes *
                </label>
                <input
                  type="datetime-local"
                  value={formData.sales_closing_date}
                  onChange={(e) => setFormData({ ...formData, sales_closing_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Informations clés
              </label>
              <textarea
                value={formData.key_info_content}
                onChange={(e) => setFormData({ ...formData, key_info_content: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Informations importantes à afficher sur la page de l'événement"
              />
              <p className="text-xs text-gray-500 mt-1">
                Informations pratiques affichées sur la page de l'événement
              </p>
            </div>

            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.has_animations}
                  onChange={(e) => setFormData({ ...formData, has_animations: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    🎭 Activer les animations spécifiques
                  </span>
                  <p className="text-xs text-gray-500">
                    Permet d'ajouter des animations programmées (spectacles, démonstrations, etc.)
                  </p>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                FAQ
              </label>
              <textarea
                value={formData.faq_content}
                onChange={(e) => setFormData({ ...formData, faq_content: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Questions fréquemment posées..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Conditions Générales de Vente
              </label>
              <textarea
                value={formData.cgv_content}
                onChange={(e) => setFormData({ ...formData, cgv_content: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Conditions générales de vente..."
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
                {saving ? 'Sauvegarde...' : (event ? 'Modifier' : 'Créer')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

interface EventActivitiesModalProps {
  event: Event;
  onClose: () => void;
}

function EventActivitiesModal({ event, onClose }: EventActivitiesModalProps) {
  const [eventActivities, setEventActivities] = useState<EventActivity[]>([]);
  const [availableActivities, setAvailableActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTimeSlotsModal, setShowTimeSlotsModal] = useState(false);
  const [selectedEventActivity, setSelectedEventActivity] = useState<EventActivity | null>(null);
  const [timeSlotsCount, setTimeSlotsCount] = useState<{[key: string]: number}>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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
      
      const activities = (eventActivitiesData || []).map(ea => ({
        ...ea,
        activity: ea.activities
      }));
      
      setEventActivities(activities);

      // Charger le nombre de créneaux pour chaque activité
      const counts: {[key: string]: number} = {};
      for (const activity of activities) {
        await loadTimeSlotsCount(activity.id, counts);
      }
      setTimeSlotsCount(counts);

      // Charger toutes les activités disponibles
      const { data: allActivitiesData, error: allActivitiesError } = await supabase
        .from('activities')
        .select('*')
        .order('name');

      if (allActivitiesError) throw allActivitiesError;
      setAvailableActivities(allActivitiesData || []);
    } catch (err) {
      console.error('Erreur chargement données:', err);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const loadTimeSlotsCount = async (eventActivityId: string, countsObj: {[key: string]: number}) => {
    try {
      const { count, error } = await supabase
        .from('time_slots')
        .select('*', { count: 'exact', head: true })
        .eq('event_activity_id', eventActivityId);

      if (error) throw error;
      countsObj[eventActivityId] = count || 0;
    } catch (err) {
      console.error('Erreur comptage créneaux:', err);
      countsObj[eventActivityId] = 0;
    }
  };

  const reloadEventActivity = async (eventActivityId: string) => {
    try {
      // Recharger l'activité spécifique
      const { data, error } = await supabase
        .from('event_activities')
        .select(`
          *,
          activities (*)
        `)
        .eq('id', eventActivityId)
        .single();

      if (error) throw error;

      // Mettre à jour dans la liste
      setEventActivities(prev => 
        prev.map(ea => 
          ea.id === eventActivityId 
            ? { ...data, activity: data.activities }
            : ea
        )
      );

      // Recharger le nombre de créneaux
      const newCounts = { ...timeSlotsCount };
      await loadTimeSlotsCount(eventActivityId, newCounts);
      setTimeSlotsCount(newCounts);
    } catch (err) {
      console.error('Erreur rechargement activité:', err);
    }
  };

  const handleManageTimeSlots = (eventActivity: EventActivity) => {
    setSelectedEventActivity(eventActivity);
    setShowTimeSlotsModal(true);
  };

  const handleAddActivity = async (activityId: string) => {
    try {
      const { data, error } = await supabase
        .from('event_activities')
        .insert({
          event_id: event.id,
          activity_id: activityId,
          stock_limit: null,
          requires_time_slot: false
        })
        .select(`
          *,
          activities (*)
        `)
        .single();

      if (error) throw error;
      
      const newEventActivity = { ...data, activity: data.activities };
      setEventActivities([...eventActivities, newEventActivity]);
      
      // Initialiser le compteur de créneaux
      setTimeSlotsCount(prev => ({ ...prev, [newEventActivity.id]: 0 }));
      
      toast.success('Activité ajoutée avec succès');
    } catch (err) {
      console.error('Erreur ajout activité:', err);
      toast.error('Erreur lors de l\'ajout');
    }
  };

  const handleRemoveActivity = async (eventActivityId: string) => {
    if (!confirm('Supprimer cette activité de l\'événement ?')) return;

    try {
      const { error } = await supabase
        .from('event_activities')
        .delete()
        .eq('id', eventActivityId);

      if (error) throw error;
      
      setEventActivities(eventActivities.filter(ea => ea.id !== eventActivityId));
      toast.success('Activité supprimée');
    } catch (err) {
      console.error('Erreur suppression activité:', err);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleToggleTimeSlot = async (eventActivity: EventActivity) => {
    try {
      const newRequiresTimeSlot = !eventActivity.requires_time_slot;
      
      const { error } = await supabase
        .from('event_activities')
        .update({ requires_time_slot: newRequiresTimeSlot })
        .eq('id', eventActivity.id);

      if (error) throw error;
      
      // Attendre un peu pour que les triggers SQL se déclenchent
      setTimeout(() => {
        reloadEventActivity(eventActivity.id);
      }, 500);
      
      toast.success(newRequiresTimeSlot ? 'Créneaux activés' : 'Créneaux désactivés');
    } catch (err) {
      console.error('Erreur toggle créneaux:', err);
      toast.error('Erreur lors de la modification');
    }
  };

  const handleStockChange = async (eventActivity: EventActivity, newStock: number | null) => {
    try {
      const { error } = await supabase
        .from('event_activities')
        .update({ stock_limit: newStock })
        .eq('id', eventActivity.id);

      if (error) throw error;
      
      setEventActivities(prev => 
        prev.map(ea => 
          ea.id === eventActivity.id 
            ? { ...ea, stock_limit: newStock }
            : ea
        )
      );
      
      toast.success('Stock mis à jour');
    } catch (err) {
      console.error('Erreur mise à jour stock:', err);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  const availableToAdd = availableActivities.filter(activity => 
    !eventActivities.some(ea => ea.activity_id === activity.id)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Activités - {event.name}
              </h2>
              <p className="text-sm text-gray-600">
                Gérez les activités disponibles pour cet événement
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Activités de l'événement */}
          <div className="space-y-4 mb-8">
            <h3 className="text-lg font-medium text-gray-900">
              Activités configurées ({eventActivities.length})
            </h3>
            
            {eventActivities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Aucune activité configurée pour cet événement</p>
              </div>
            ) : (
              <div className="space-y-3">
                {eventActivities.map((eventActivity) => (
                  <div key={eventActivity.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{eventActivity.activity.icon}</span>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {eventActivity.activity.name}
                          </h4>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>
                              Stock: {eventActivity.stock_limit === null ? 'Illimité' : eventActivity.stock_limit}
                            </span>
                            <span>
                              Créneaux: {eventActivity.requires_time_slot ? 'Oui' : 'Non'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Stock */}
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={eventActivity.stock_limit || ''}
                            onChange={(e) => handleStockChange(
                              eventActivity, 
                              e.target.value ? parseInt(e.target.value) : null
                            )}
                            disabled={eventActivity.requires_time_slot}
                            placeholder={eventActivity.requires_time_slot ? "Calculé automatiquement" : "Illimité"}
                            className="w-24 px-2 py-1 text-sm border border-gray-300 rounded disabled:bg-gray-100 disabled:text-gray-500"
                          />
                        </div>
                        
                        {/* Toggle créneaux */}
                        <button
                          onClick={() => handleToggleTimeSlot(eventActivity)}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            eventActivity.requires_time_slot
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {eventActivity.requires_time_slot ? '✓ Créneaux' : 'Créneaux'}
                        </button>
                        
                        {/* Gestion créneaux */}
                        {eventActivity.requires_time_slot && (
                          <button
                            onClick={() => handleManageTimeSlots(eventActivity)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-sm font-medium transition-colors"
                          >
                            Créneaux ({timeSlotsCount[eventActivity.id] || 0})
                          </button>
                        )}
                        
                        {/* Supprimer */}
                        <button
                          onClick={() => handleRemoveActivity(eventActivity.id)}
                          className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
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

          {/* Ajouter des activités */}
          {availableToAdd.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Ajouter des activités
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableToAdd.map((activity) => (
                  <button
                    key={activity.id}
                    onClick={() => handleAddActivity(activity.id)}
                    className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                  >
                    <span className="text-2xl">{activity.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900">{activity.name}</div>
                      <div className="text-sm text-gray-600">{activity.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de gestion des créneaux */}
      {showTimeSlotsModal && selectedEventActivity && (
        <TimeSlotsModal
          eventActivity={selectedEventActivity}
          onClose={() => {
            setShowTimeSlotsModal(false);
            setSelectedEventActivity(null);
          }}
          onUpdate={() => {
            // Recharger les données de l'activité
            reloadEventActivity(selectedEventActivity.id);
          }}
        />
      )}
    </div>
  );
}

interface TimeSlotsModalProps {
  eventActivity: EventActivity;
  onClose: () => void;
  onUpdate: () => void;
}

function TimeSlotsModal({ eventActivity, onClose, onUpdate }: TimeSlotsModalProps) {
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    startTime: '09:00',
    endTime: '17:00',
    slotDuration: 30,
    slotCapacity: 15,
    breakDuration: 0
  });

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
      setTimeSlots(data || []);
    } catch (err) {
      console.error('Erreur chargement créneaux:', err);
      toast.error('Erreur lors du chargement des créneaux');
    } finally {
      setLoading(false);
    }
  };

  const createCustomSlots = async () => {
    try {
      setCreating(true);
      
      const startTime = new Date(`2024-01-01T${formData.startTime}:00`);
      const endTime = new Date(`2024-01-01T${formData.endTime}:00`);
      const slotDurationMs = formData.slotDuration * 60 * 1000;
      const breakDurationMs = formData.breakDuration * 60 * 1000;
      
      const slots = [];
      let currentTime = new Date(startTime);
      
      while (currentTime < endTime) {
        const slotEnd = new Date(currentTime.getTime() + slotDurationMs);
        if (slotEnd > endTime) break;
        
        slots.push({
          event_activity_id: eventActivity.id,
          slot_time: `2024-01-01T${currentTime.toTimeString().slice(0, 5)}:00`,
          capacity: formData.slotCapacity
        });
        
        currentTime = new Date(slotEnd.getTime() + breakDurationMs);
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
      await loadTimeSlots();
      onUpdate();
    } catch (err) {
      console.error('Erreur création créneaux:', err);
      toast.error('Erreur lors de la création des créneaux');
    } finally {
      setCreating(false);
    }
  };

  const deleteTimeSlot = async (slotId: string) => {
    try {
      setDeleting(slotId);
      const { error } = await supabase
        .from('time_slots')
        .delete()
        .eq('id', slotId);

      if (error) throw error;
      
      await loadTimeSlots();
      onUpdate();
      toast.success('Créneau supprimé');
    } catch (err) {
      console.error('Erreur suppression créneau:', err);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(null);
    }
  };

  const deleteAllTimeSlots = async () => {
    if (!confirm(`Supprimer tous les ${timeSlots.length} créneaux ?`)) return;
    
    try {
      setCreating(true);
      const { error } = await supabase
        .from('time_slots')
        .delete()
        .eq('event_activity_id', eventActivity.id);

      if (error) throw error;
      
      await loadTimeSlots();
      onUpdate();
      toast.success('Tous les créneaux ont été supprimés');
    } catch (err) {
      console.error('Erreur suppression créneaux:', err);
      toast.error('Erreur lors de la suppression');
    } finally {
      setCreating(false);
    }
  };

  const calculateSlotsCount = () => {
    const startTime = new Date(`2024-01-01T${formData.startTime}:00`);
    const endTime = new Date(`2024-01-01T${formData.endTime}:00`);
    const slotDurationMs = formData.slotDuration * 60 * 1000;
    const breakDurationMs = formData.breakDuration * 60 * 1000;
    
    let count = 0;
    let currentTime = new Date(startTime);
    
    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime.getTime() + slotDurationMs);
      if (slotEnd > endTime) break;
      
      count++;
      currentTime = new Date(slotEnd.getTime() + breakDurationMs);
    }
    
    return count;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-2xl">{eventActivity.activity.icon}</span>
                Créneaux - {eventActivity.activity.name}
              </h3>
              <p className="text-sm text-gray-600">
                {timeSlots.length} créneaux configurés • Capacité totale: {timeSlots.reduce((sum, slot) => sum + slot.capacity, 0)} places
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Création personnalisée */}
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <h4 className="font-medium text-gray-900 mb-4">Créer des créneaux personnalisés</h4>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Début
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fin
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Durée (min)
                </label>
                <input
                  type="number"
                  min="15"
                  max="180"
                  step="15"
                  value={formData.slotDuration}
                  onChange={(e) => setFormData({ ...formData, slotDuration: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacité
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.slotCapacity}
                  onChange={(e) => setFormData({ ...formData, slotCapacity: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pause (min)
                </label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  step="5"
                  value={formData.breakDuration}
                  onChange={(e) => setFormData({ ...formData, breakDuration: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                📊 {calculateSlotsCount()} créneaux seront créés • {calculateSlotsCount() * formData.slotCapacity} places totales
              </div>
              
              <button
                onClick={createCustomSlots}
                disabled={creating || calculateSlotsCount() === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
              >
                {creating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Création...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Créer les créneaux
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Liste des créneaux */}
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">
              Créneaux existants ({timeSlots.length})
            </h4>
            
            {timeSlots.length > 0 && (
              <button
                onClick={deleteAllTimeSlots}
                disabled={creating}
                className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
              >
                Supprimer tout
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : timeSlots.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Aucun créneau configuré</p>
              <p className="text-sm">Utilisez le formulaire ci-dessus pour créer des créneaux</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {timeSlots.map((slot) => (
                <div key={slot.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">
                        {format(new Date(`2024-01-01T${slot.slot_time.split('T')[1]}`), 'HH:mm')}
                      </div>
                      <div className="text-sm text-gray-600">
                        {slot.capacity} places
                      </div>
                    </div>
                    
                    <button
                      onClick={() => deleteTimeSlot(slot.id)}
                      disabled={deleting === slot.id}
                      className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                    >
                      {deleting === slot.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface EventAnimationsModalProps {
  event: Event;
  onClose: () => void;
}

function EventAnimationsModal({ event, onClose }: EventAnimationsModalProps) {
  const [animations, setAnimations] = useState<EventAnimation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAnimation, setEditingAnimation] = useState<EventAnimation | null>(null);

  useEffect(() => {
    loadAnimations();
  }, []);

  const loadAnimations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('event_animations')
        .select('*')
        .eq('event_id', event.id)
        .order('start_time');

      if (error) throw error;
      setAnimations(data || []);
    } catch (err) {
      console.error('Erreur chargement animations:', err);
      toast.error('Erreur lors du chargement des animations');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnimation = async (animationId: string) => {
    if (!confirm('Supprimer cette animation ?')) return;

    try {
      const { error } = await supabase
        .from('event_animations')
        .delete()
        .eq('id', animationId);

      if (error) throw error;
      
      setAnimations(animations.filter(a => a.id !== animationId));
      toast.success('Animation supprimée');
    } catch (err) {
      console.error('Erreur suppression animation:', err);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleToggleActive = async (animation: EventAnimation) => {
    try {
      const { error } = await supabase
        .from('event_animations')
        .update({ is_active: !animation.is_active })
        .eq('id', animation.id);

      if (error) throw error;
      
      setAnimations(animations.map(a => 
        a.id === animation.id 
          ? { ...a, is_active: !a.is_active }
          : a
      ));
      
      toast.success(animation.is_active ? 'Animation désactivée' : 'Animation activée');
    } catch (err) {
      console.error('Erreur toggle animation:', err);
      toast.error('Erreur lors de la modification');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                🎭 Animations - {event.name}
              </h2>
              <p className="text-sm text-gray-600">
                Gérez les animations spécifiques de cet événement
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Bouton d'ajout */}
          <div className="mb-6">
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nouvelle Animation
            </button>
          </div>

          {/* Liste des animations */}
          {animations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">🎭</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune animation</h3>
              <p className="text-gray-600">Créez votre première animation pour cet événement</p>
            </div>
          ) : (
            <div className="space-y-4">
              {animations.map((animation) => (
                <div key={animation.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {animation.name}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          animation.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {animation.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{animation.description}</p>
                      
                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>
                            {format(new Date(animation.start_time), 'HH:mm')} - {format(new Date(animation.end_time), 'HH:mm')}
                          </span>
                        </div>
                        <div>📍 {animation.location}</div>
                        {animation.capacity && (
                          <div>👥 {animation.capacity} places</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(animation)}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          animation.is_active
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {animation.is_active ? 'Désactiver' : 'Activer'}
                      </button>
                      
                      <button
                        onClick={() => setEditingAnimation(animation)}
                        className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteAnimation(animation.id)}
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
      </div>

      {/* Modal de création/édition */}
      {(showCreateForm || editingAnimation) && (
        <AnimationFormModal
          event={event}
          animation={editingAnimation}
          onClose={() => {
            setShowCreateForm(false);
            setEditingAnimation(null);
          }}
          onSave={() => {
            setShowCreateForm(false);
            setEditingAnimation(null);
            loadAnimations();
          }}
        />
      )}
    </div>
  );
}

interface AnimationFormModalProps {
  event: Event;
  animation?: EventAnimation | null;
  onClose: () => void;
  onSave: () => void;
}

function AnimationFormModal({ event, animation, onClose, onSave }: AnimationFormModalProps) {
  const [formData, setFormData] = useState({
    name: animation?.name || '',
    description: animation?.description || '',
    location: animation?.location || '',
    start_time: animation?.start_time ? format(new Date(animation.start_time), "HH:mm") : '10:00',
    end_time: animation?.end_time ? format(new Date(animation.end_time), "HH:mm") : '11:00',
    capacity: animation?.capacity || null,
    is_active: animation?.is_active ?? true
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.location || !formData.start_time || !formData.end_time) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setSaving(true);
      
      const eventDate = format(new Date(event.event_date), 'yyyy-MM-dd');
      const animationData = {
        event_id: event.id,
        name: formData.name,
        description: formData.description,
        location: formData.location,
        start_time: `${eventDate}T${formData.start_time}:00`,
        end_time: `${eventDate}T${formData.end_time}:00`,
        capacity: formData.capacity,
        is_active: formData.is_active
      };
      
      if (animation) {
        // Mise à jour
        const { error } = await supabase
          .from('event_animations')
          .update(animationData)
          .eq('id', animation.id);

        if (error) throw error;
        toast.success('Animation mise à jour avec succès');
      } else {
        // Création
        const { error } = await supabase
          .from('event_animations')
          .insert(animationData);

        if (error) throw error;
        toast.success('Animation créée avec succès');
      }
      
      onSave();
    } catch (err) {
      console.error('Erreur sauvegarde animation:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              {animation ? 'Modifier l\'Animation' : 'Nouvelle Animation'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l'animation *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                placeholder="Spectacle de magie, Démonstration..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                placeholder="Description de l'animation..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lieu *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                placeholder="Scène principale, Chapiteau..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Heure de début *
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Heure de fin *
                </label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacité (optionnel)
              </label>
              <input
                type="number"
                min="1"
                value={formData.capacity || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  capacity: e.target.value ? parseInt(e.target.value) : null 
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                placeholder="Laisser vide si pas de limite"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Animation active
                </span>
              </label>
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
                className="flex-1 bg-pink-600 hover:bg-pink-700 disabled:bg-pink-400 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                {saving ? 'Sauvegarde...' : (animation ? 'Modifier' : 'Créer')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}