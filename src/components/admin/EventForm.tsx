import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Calendar, Plus, Edit, Trash2, Eye, Settings, Users, X, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import EventForm from '../../components/admin/EventForm';
import AnimationsManager from '../../components/admin/AnimationsManager';
import EventActivitiesManager from '../../components/admin/EventActivitiesManager';

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

interface Animation {
  id: string;
  name: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  capacity: number | null;
  is_active: boolean;
}

interface AnimationsManagementModalProps {
  event: Event;
  onClose: () => void;
}

function AnimationsManagementModal({ event, onClose }: AnimationsManagementModalProps) {
  const [animations, setAnimations] = useState<Animation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAnimation, setEditingAnimation] = useState<Animation | null>(null);

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
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette animation ?')) return;

    try {
      const { error } = await supabase
        .from('event_animations')
        .delete()
        .eq('id', animationId);

      if (error) throw error;
      
      toast.success('Animation supprimée avec succès');
      loadAnimations();
    } catch (err) {
      console.error('Erreur suppression animation:', err);
      toast.error('Erreur lors de la suppression');
    }
  };

  const toggleAnimationStatus = async (animation: Animation) => {
    try {
      const { error } = await supabase
        .from('event_animations')
        .update({ is_active: !animation.is_active })
        .eq('id', animation.id);

      if (error) throw error;
      
      toast.success(`Animation ${!animation.is_active ? 'activée' : 'désactivée'}`);
      loadAnimations();
    } catch (err) {
      console.error('Erreur changement statut animation:', err);
      toast.error('Erreur lors du changement de statut');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                🎭 Animations - {event.name}
              </h2>
              <p className="text-gray-600">
                {format(new Date(event.event_date), 'EEEE d MMMM yyyy', { locale: fr })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nouvelle Animation
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : animations.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎭</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune animation</h3>
              <p className="text-gray-600 mb-4">
                Créez votre première animation pour enrichir l'expérience de vos participants.
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Créer une animation
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {animations.map((animation) => (
                <div key={animation.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{animation.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          animation.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {animation.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{animation.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{animation.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>
                            {format(new Date(animation.start_time), 'HH:mm')} - {format(new Date(animation.end_time), 'HH:mm')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{animation.capacity ? `${animation.capacity} places` : 'Illimité'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => toggleAnimationStatus(animation)}
                        className={`p-2 rounded-md transition-colors ${
                          animation.is_active 
                            ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50' 
                            : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                        }`}
                        title={animation.is_active ? 'Désactiver' : 'Activer'}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => setEditingAnimation(animation)}
                        className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                        title="Modifier"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteAnimation(animation.id)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                        title="Supprimer"
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
  );
}

export default function EventManagement() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showAnimationsModal, setShowAnimationsModal] = useState<Event | null>(null);
  const [showActivitiesModal, setShowActivitiesModal] = useState<Event | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    if (!isSupabaseConfigured()) {
      toast.error('Configuration Supabase manquante');
      setLoading(false);
      return;
    }

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

  const handleFormClose = () => {
    setShowCreateModal(false);
    setEditingEvent(null);
  };

  const handleFormSave = () => {
    setShowCreateModal(false);
    setEditingEvent(null);
    loadEvents();
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

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-gray-900">{events.length}</div>
          <div className="text-sm text-gray-600">Total événements</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-green-600">
            {events.filter(e => e.status === 'published').length}
          </div>
          <div className="text-sm text-gray-600">Publiés</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-gray-600">
            {events.filter(e => e.status === 'draft').length}
          </div>
          <div className="text-sm text-gray-600">Brouillons</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-purple-600">
            {events.filter(e => e.has_animations).length}
          </div>
          <div className="text-sm text-gray-600">Avec animations</div>
        </div>
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
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                          🎭 Animations
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-500 mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(event.event_date), 'EEEE d MMMM yyyy', { locale: fr })}</span>
                      </div>
                      <div>Créé le {format(new Date(event.created_at), 'dd/MM/yyyy')}</div>
                    </div>
                    
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {event.key_info_content || 'Aucune information clé définie'}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setShowActivitiesModal(event)}
                      className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors"
                      title="Gérer les activités"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    
                    {event.has_animations && (
                      <button
                        onClick={() => setShowAnimationsModal(event)}
                        className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
                        title="Gérer les animations"
                      >
                        🎭
                      </button>
                    )}
                    
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

      {/* Modals */}
      {(showCreateModal || editingEvent) && (
        <EventForm
          event={editingEvent}
          onClose={handleFormClose}
          onSave={handleFormSave}
        />
      )}

      {showAnimationsModal && (
        <AnimationsManager
          event={showAnimationsModal}
          onClose={() => setShowAnimationsModal(null)}
        />
      )}

      {showActivitiesModal && (
        <EventActivitiesManager
          event={showActivitiesModal}
          onClose={() => setShowActivitiesModal(null)}
        />
      )}
    </div>
  );
}