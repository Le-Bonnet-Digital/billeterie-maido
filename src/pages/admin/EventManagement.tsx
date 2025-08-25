import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Plus, Edit, Trash2, Eye, EyeOff, X, Activity, Clock, Users, Settings } from 'lucide-react';
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
  created_at: string;
}

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
  time_slots?: TimeSlot[];
}

interface TimeSlot {
  id: string;
  slot_time: string;
  capacity: number;
  remaining_capacity?: number;
  event_activity_id: string;
}

interface ActivityFormData {
  stock_limit: string;
  requires_time_slot: boolean;
}

export default function EventManagement() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showActivitiesModal, setShowActivitiesModal] = useState(false);
  const [selectedEventForActivities, setSelectedEventForActivities] = useState<Event | null>(null);
  
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

  const toggleEventStatus = async (eventId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    
    try {
      const { error } = await supabase
        .from('events')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', eventId);

      if (error) throw error;
      
      toast.success(`Événement ${newStatus === 'published' ? 'publié' : 'mis en brouillon'}`);
      loadEvents();
    } catch (err) {
      console.error('Erreur changement statut:', err);
      toast.error('Erreur lors du changement de statut');
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
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{event.name}</h3>
                      {getStatusBadge(event.status)}
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(event.event_date), 'dd MMMM yyyy', { locale: fr })}</span>
                      </div>
                      <div>
                        Ventes: {format(new Date(event.sales_opening_date), 'dd/MM')} - {format(new Date(event.sales_closing_date), 'dd/MM')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleEventStatus(event.id, event.status)}
                      className={`p-2 rounded-md transition-colors ${
                        event.status === 'published'
                          ? 'text-gray-600 hover:text-gray-700 hover:bg-gray-100'
                          : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                      }`}
                      title={event.status === 'published' ? 'Mettre en brouillon' : 'Publier'}
                    >
                      {event.status === 'published' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    
                    <button
                      onClick={() => {
                        setSelectedEventForActivities(event);
                        setShowActivitiesModal(true);
                      }}
                      className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
                      title="Gérer les activités"
                    >
                      <Activity className="h-4 w-4" />
                    </button>
                    
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
    event_date: event ? format(new Date(event.event_date), 'yyyy-MM-dd') : '',
    sales_opening_date: event ? format(new Date(event.sales_opening_date), "yyyy-MM-dd'T'HH:mm") : '',
    sales_closing_date: event ? format(new Date(event.sales_closing_date), "yyyy-MM-dd'T'HH:mm") : '',
    cgv_content: event?.cgv_content || '',
    faq_content: event?.faq_content || '',
    key_info_content: event?.key_info_content || ''
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
      
      const eventData = {
        name: formData.name,
        event_date: formData.event_date,
        sales_opening_date: new Date(formData.sales_opening_date).toISOString(),
        sales_closing_date: new Date(formData.sales_closing_date).toISOString(),
        cgv_content: formData.cgv_content,
        faq_content: formData.faq_content,
        key_info_content: formData.key_info_content,
        updated_at: new Date().toISOString()
      };
      
      if (event) {
        // Mise à jour
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', event.id);

        if (error) throw error;
        toast.success('Événement mis à jour avec succès');
      } else {
        // Création
        const { error } = await supabase
          .from('events')
          .insert(eventData);

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
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
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
                Informations Clés
              </label>
              <textarea
                value={formData.key_info_content}
                onChange={(e) => setFormData({ ...formData, key_info_content: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Informations importantes à afficher sur la page de l'événement..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                FAQ (Format Markdown)
              </label>
              <textarea
                value={formData.faq_content}
                onChange={(e) => setFormData({ ...formData, faq_content: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="### Question 1&#10;**Q : &quot;Votre question ?&quot;**&#10;**R : &quot;Votre réponse&quot;**"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Conditions Générales de Vente
              </label>
              <textarea
                value={formData.cgv_content}
                onChange={(e) => setFormData({ ...formData, cgv_content: e.target.value })}
                rows={6}
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
  const [activities, setActivities] = useState<Activity[]>([]);
  const [eventActivities, setEventActivities] = useState<EventActivity[]>([]);
  const [activityForms, setActivityForms] = useState<{[key: string]: ActivityFormData}>({});
  const [showTimeSlotsFor, setShowTimeSlotsFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Initialiser les formulaires pour les activités existantes
    const forms: {[key: string]: ActivityFormData} = {};
    eventActivities.forEach(ea => {
      forms[ea.activity_id] = {
        stock_limit: ea.stock_limit?.toString() || '',
        requires_time_slot: ea.requires_time_slot
      };
    });
    setActivityForms(forms);
  }, [eventActivities]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Charger toutes les activités disponibles
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .order('name');

      if (activitiesError) throw activitiesError;
      setActivities(activitiesData || []);

      // Charger les activités configurées pour cet événement
      const { data: eventActivitiesData, error: eventActivitiesError } = await supabase
        .from('event_activities')
        .select(`
          *,
          activities (*),
          time_slots (
            id,
            slot_time,
            capacity
          )
        `)
        .eq('event_id', event.id);

      if (eventActivitiesError) throw eventActivitiesError;
      setEventActivities((eventActivitiesData || []).map(ea => ({
        ...ea,
        activity: ea.activities,
        time_slots: ea.time_slots || []
      })));
    } catch (err) {
      console.error('Erreur chargement activités:', err);
      toast.error('Erreur lors du chargement des activités');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActivity = async (activity: Activity) => {
    const existingEventActivity = eventActivities.find(ea => ea.activity_id === activity.id);
    
    if (existingEventActivity) {
      // Supprimer l'activité
      const { error } = await supabase
        .from('event_activities')
        .delete()
        .eq('id', existingEventActivity.id);
        
      if (error) {
        toast.error('Erreur lors de la suppression');
        return;
      }
      
      toast.success('Activité supprimée');
    } else {
      // Ajouter l'activité
      const { error } = await supabase
        .from('event_activities')
        .insert({
          event_id: event.id,
          activity_id: activity.id,
          stock_limit: null,
          requires_time_slot: false
        });
        
      if (error) {
        toast.error('Erreur lors de l\'ajout');
        return;
      }
      
      toast.success('Activité ajoutée');
    }
    
    loadData();
  };

  const handleUpdateEventActivity = async (activityId: string, stockLimit?: string, requiresTimeSlot?: boolean) => {
    const eventActivity = eventActivities.find(ea => ea.activity_id === activityId);
    const formData = activityForms[activityId];
    
    if (!eventActivity || !formData) return;
    
    const updates = {
      stock_limit: (stockLimit !== undefined ? stockLimit : formData.stock_limit) ? parseInt(stockLimit !== undefined ? stockLimit : formData.stock_limit) : null,
      requires_time_slot: requiresTimeSlot !== undefined ? requiresTimeSlot : formData.requires_time_slot
    };
    
    const { error } = await supabase
      .from('event_activities')
      .update(updates)
      .eq('id', eventActivity.id);
      
    if (error) {
      toast.error('Erreur lors de la mise à jour');
      return;
    }
    
    toast.success('Activité mise à jour');
    loadData();
  };

  const handleFormChange = (activityId: string, field: keyof ActivityFormData, value: string | boolean) => {
    setActivityForms(prev => ({
      ...prev,
      [activityId]: {
        ...prev[activityId],
        [field]: value
      }
    }));
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
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Activités pour : {event.name}
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-4">
            {activities.map((activity) => {
              const eventActivity = eventActivities.find(ea => ea.activity_id === activity.id);
              const isEnabled = !!eventActivity;
              const formData = activityForms[activity.id] || { stock_limit: '', requires_time_slot: false };
              
              return (
                <div key={activity.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{activity.icon}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">{activity.name}</h3>
                        <p className="text-sm text-gray-600">{activity.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActivity(activity)}
                        className={`px-4 py-2 rounded-md font-medium transition-colors ${
                          isEnabled
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {isEnabled ? 'Retirer' : 'Ajouter'}
                      </button>
                      
                      {isEnabled && eventActivity && eventActivity.requires_time_slot && (
                        <button
                          onClick={() => setShowTimeSlotsFor(showTimeSlotsFor === eventActivity.id ? null : eventActivity.id)}
                          className="px-3 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md font-medium transition-colors flex items-center gap-2"
                        >
                          <Clock className="h-4 w-4" />
                          Créneaux ({eventActivity.time_slots?.length || 0})
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {isEnabled && eventActivity && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Stock limite
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formData.stock_limit}
                          onChange={(e) => handleFormChange(activity.id, 'stock_limit', e.target.value)}
                          onBlur={() => handleUpdateEventActivity(activity.id)}
                          placeholder="Illimité"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`requires-slot-${activity.id}`}
                          checked={formData.requires_time_slot}
                          onChange={(e) => {
                            const newValue = e.target.checked;
                            handleFormChange(activity.id, 'requires_time_slot', newValue);
                            handleUpdateEventActivity(activity.id, formData.stock_limit, newValue);
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`requires-slot-${activity.id}`} className="ml-2 text-sm text-gray-700">
                          Créneau horaire obligatoire
                        </label>
                      </div>
                    </div>
                  )}
                  
                  {/* Lien vers la gestion des créneaux */}
                  {isEnabled && eventActivity && eventActivity.requires_time_slot && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">
                            Gestion des créneaux
                          </span>
                        </div>
                        <p className="text-sm text-blue-700 mb-3">
                          Cette activité nécessite des créneaux horaires. Utilisez la page dédiée pour les gérer.
                        </p>
                        <a
                          href="/admin/time-slots"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                        >
                          <Settings className="h-4 w-4" />
                          Gérer les créneaux
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
      </div>
    </div>
  );
}