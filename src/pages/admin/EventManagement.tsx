import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Calendar, Plus, Edit, Trash2, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import EventForm from '../../components/admin/EventForm';
import AnimationsManager from '../../components/admin/AnimationsManager';
import EventActivitiesManager from '../../components/admin/EventActivitiesManager';
import MarkdownRenderer from '../../components/MarkdownRenderer';
import { logger, debugLog } from '../../lib/logger';
import type { FAQItem } from '../../components/FAQAccordion';

interface Event {
  id: string;
  name: string;
  event_date: string;
  sales_opening_date: string;
  sales_closing_date: string;
  status: 'draft' | 'published' | 'finished' | 'cancelled';
  cgv_content: string;
  key_info_content: string;
  has_animations: boolean;
  created_at: string;
  updated_at: string;
  faqs: FAQItem[];
}

export default function EventManagement() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showAnimationsModal, setShowAnimationsModal] = useState<Event | null>(
    null,
  );
  const [showActivitiesModal, setShowActivitiesModal] = useState<Event | null>(
    null,
  );

  useEffect(() => {
    debugLog('🔧 EventManagement mounted');
    loadEvents();
  }, []);

  const loadEvents = async () => {
    debugLog('🔧 EventManagement loadEvents called');
    if (!isSupabaseConfigured()) {
      toast.error('Configuration Supabase manquante');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select(
          `
          id,
          name,
          event_date,
          sales_opening_date,
          sales_closing_date,
          status,
          cgv_content,
          key_info_content,
          has_animations,
          created_at,
          updated_at,
          event_faqs(question, answer, position)
        `,
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      const eventsWithFaqs = (data || []).map((e) => ({
        ...e,
        faqs: (e.event_faqs || [])
          .sort((a, b) => a.position - b.position)
          .map(({ question, answer }) => ({ question, answer })),
      }));
      debugLog(
        '🔧 EventManagement Events loaded with has_animations:',
        eventsWithFaqs.map((e) => ({
          id: e.id,
          name: e.name,
          has_animations: e.has_animations,
        })),
      );
      setEvents(eventsWithFaqs);
    } catch (err) {
      logger.error('Erreur chargement événements', { error: err });
      toast.error('Erreur lors du chargement des événements');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (
      !confirm(
        'Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.',
      )
    )
      return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast.success('Événement supprimé avec succès');
      loadEvents();
    } catch (err) {
      logger.error('Erreur suppression événement', { error: err });
      toast.error('Erreur lors de la suppression');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-800' },
      published: { label: 'Publié', color: 'bg-green-100 text-green-800' },
      finished: { label: 'Terminé', color: 'bg-blue-100 text-blue-800' },
      cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  const handleFormClose = () => {
    debugLog('🔧 EventManagement handleFormClose called');
    setShowCreateModal(false);
    setEditingEvent(null);
    loadEvents(); // Recharger après fermeture
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  debugLog('🔧 EventManagement rendering with modals:', {
    showCreateModal,
    editingEvent: editingEvent?.id,
    showAnimationsModal: showAnimationsModal?.id,
    showActivitiesModal: showActivitiesModal?.id,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gestion des Événements
          </h1>
          <p className="text-gray-600">Créez et gérez vos événements</p>
        </div>
        <button
          onClick={() => {
            debugLog('🔧 EventManagement opening create modal');
            setShowCreateModal(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nouvel Événement
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-gray-900">
            {events.length}
          </div>
          <div className="text-sm text-gray-600">Total événements</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-green-600">
            {events.filter((e) => e.status === 'published').length}
          </div>
          <div className="text-sm text-gray-600">Publiés</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-gray-600">
            {events.filter((e) => e.status === 'draft').length}
          </div>
          <div className="text-sm text-gray-600">Brouillons</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-purple-600">
            {events.filter((e) => e.has_animations).length}
          </div>
          <div className="text-sm text-gray-600">Avec animations</div>
        </div>
      </div>

      {/* Liste des événements */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Événements ({events.length})
          </h2>
        </div>

        {events.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun événement
            </h3>
            <p className="text-gray-600 mb-4">
              Créez votre premier événement pour commencer à vendre des billets.
            </p>
            <button
              onClick={() => {
                debugLog(
                  '🔧 EventManagement opening create modal from empty state',
                );
                setShowCreateModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Créer un événement
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {events.map((event) => (
              <div
                key={event.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {event.name}
                      </h3>
                      {getStatusBadge(event.status)}
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-500 mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(
                            new Date(event.event_date),
                            'EEEE d MMMM yyyy',
                            { locale: fr },
                          )}
                        </span>
                      </div>
                      <div>
                        Créé le{' '}
                        {format(new Date(event.created_at), 'dd/MM/yyyy')}
                      </div>
                      <div>
                        Animations:{' '}
                        {event.has_animations
                          ? '✅ Activées'
                          : '❌ Désactivées'}
                      </div>
                    </div>

                    <MarkdownRenderer
                      content={event.key_info_content}
                      className="text-gray-600 text-sm line-clamp-2"
                    />
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => {
                        debugLog(
                          '🔧 EventManagement opening activities modal for:',
                          event.id,
                        );
                        setShowActivitiesModal(event);
                      }}
                      className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors"
                      title="Gérer les activités"
                    >
                      <Settings className="h-4 w-4" />
                    </button>

                    {event.has_animations && (
                      <button
                        onClick={() => {
                          debugLog(
                            '🔧 EventManagement opening animations modal for:',
                            event.id,
                          );
                          setShowAnimationsModal(event);
                        }}
                        className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-colors"
                        title="Gérer les animations"
                      >
                        <span className="text-lg">🎭</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        debugLog(
                          '🔧 EventManagement opening edit modal for:',
                          event.id,
                        );
                        setEditingEvent(event);
                      }}
                      className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                      title="Modifier l'événement"
                    >
                      <Edit className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                      title="Supprimer l'événement"
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

      {/* Modals - UN SEUL À LA FOIS */}
      {(showCreateModal || editingEvent) && (
        <EventForm event={editingEvent} onClose={handleFormClose} />
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
