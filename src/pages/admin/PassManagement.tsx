import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Ticket, Plus, Edit, Trash2, Package, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getErrorMessage } from '../../lib/errors';
import MarkdownRenderer from '../../components/MarkdownRenderer';
import MarkdownEditor from '../../components/admin/MarkdownEditor';
import { logger } from '../../lib/logger';

interface Pass {
  id: string;
  name: string;
  price: number;
  description: string;
  initial_stock: number | null;
  remaining_stock?: number;
  calculated_max_stock?: number;
  event_activities?: EventActivity[];
  event: {
    id: string;
    name: string;
  };
}

interface EventActivity {
  id: string;
  activity_id: string;
  stock_limit: number | null;
  activity: {
    id: string;
    name: string;
    icon: string;
  };
}

interface PassActivity {
  id: string;
  event_activity_id: string;
  event_activities: {
    id: string;
    activity_id: string;
    stock_limit: number | null;
    activities: {
      id: string;
      name: string;
      icon: string;
    };
  };
}

interface Event {
  id: string;
  name: string;
}

export default function PassManagement() {
  const [passes, setPasses] = useState<Pass[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPass, setEditingPass] = useState<Pass | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Check if Supabase is properly configured
      if (!isSupabaseConfigured()) {
        logger.error('Supabase is not configured');
        toast.error(
          'Configuration Supabase manquante. Veuillez configurer la base de données.',
        );
        setLoading(false);
        return;
      }

      // Charger les pass avec leurs événements
      const { data: passesData, error: passesError } = await supabase
        .from('passes')
        .select(
          `
          id,
          name,
          price,
          description,
          initial_stock,
          
          pass_activities (
            id,
            event_activity_id,
            event_activities (
              id,
              activity_id,
              stock_limit,
              activities (
                id,
                name,
                icon
              )
            )
          ),
          events!inner (
            id,
            name
          )
        `,
        )
        .order('created_at', { ascending: false });

      if (passesError) throw passesError;

      // Calculer le stock restant pour chaque pass
      type PassRow = {
        id: string;
        name: string;
        price: number;
        description: string;
        initial_stock: number | null;
        pass_activities?: PassActivity[];
        events: { id: string; name: string };
      };

      const passesWithStock = await Promise.all(
        ((passesData || []) as unknown as PassRow[]).map(
          async (pass: PassRow) => {
            // Calculer le stock maximum basé sur les activités liées (maintenant synchronisé automatiquement)
            let calculatedMaxStock = null;

            if (pass.pass_activities && pass.pass_activities.length > 0) {
              // Pour chaque activité du pass, récupérer le stock limite (maintenant synchronisé avec les créneaux)
              const activityStocks = await Promise.all(
                pass.pass_activities.map(async (pa: PassActivity) => {
                  const { data: eventActivityData } = await supabase
                    .from('event_activities')
                    .select('stock_limit')
                    .eq('id', pa.event_activities.id)
                    .single();

                  return eventActivityData?.stock_limit || null;
                }),
              );

              // Le stock maximum du pass est limité par l'activité avec le moins de stock (en excluant les null)
              const validStocks = activityStocks.filter(
                (stock) => stock !== null,
              );
              if (validStocks.length > 0) {
                calculatedMaxStock = Math.min(...validStocks);
              }
            }

            if (pass.initial_stock === null) {
              const shaped: Pass = {
                id: pass.id,
                name: pass.name,
                price: pass.price,
                description: pass.description,
                initial_stock: pass.initial_stock,
                event: pass.events,
                remaining_stock: calculatedMaxStock || 999999,
                calculated_max_stock: calculatedMaxStock ?? undefined,
                event_activities: (pass.pass_activities || []).map(
                  (pa: PassActivity) => ({
                    id: pa.event_activities.id,
                    activity_id: pa.event_activities.activity_id,
                    stock_limit: pa.event_activities.stock_limit,
                    activity: pa.event_activities.activities,
                  }),
                ),
              };
              return shaped;
            }

            const { data: stockData } = await supabase.rpc(
              'get_pass_remaining_stock',
              { pass_uuid: pass.id },
            );

            const actualStock = calculatedMaxStock
              ? Math.min(stockData || 0, calculatedMaxStock)
              : stockData || 0;

            const shaped: Pass = {
              id: pass.id,
              name: pass.name,
              price: pass.price,
              description: pass.description,
              initial_stock: pass.initial_stock,
              event: pass.events,
              remaining_stock: actualStock,
              calculated_max_stock: calculatedMaxStock ?? undefined,
              event_activities: (pass.pass_activities || []).map(
                (pa: PassActivity) => ({
                  id: pa.event_activities.id,
                  activity_id: pa.event_activities.activity_id,
                  stock_limit: pa.event_activities.stock_limit,
                  activity: pa.event_activities.activities,
                }),
              ),
            };
            return shaped;
          },
        ),
      );

      setPasses(passesWithStock);

      // Charger tous les événements pour le formulaire
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, name')
        .order('name');

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);
    } catch (err) {
      logger.error('Erreur chargement pass', { error: err });
      toast.error('Erreur lors du chargement des pass');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeletePass = async (passId: string) => {
    if (
      !window.confirm(
        'Êtes-vous sûr de vouloir supprimer ce pass ? Cette action est irréversible.',
      )
    )
      return;

    try {
      logger.info('Tentative de suppression du pass', { passId });

      // Essayer d'abord de supprimer les réservations liées
      const { error: reservationsError } = await supabase
        .from('reservations')
        .delete()
        .eq('pass_id', passId);

      if (reservationsError) {
        logger.warn('Erreur suppression réservations', {
          error: reservationsError,
        });
      }

      // Puis supprimer le pass
      const { data, error, count } = await supabase
        .from('passes')
        .delete()
        .eq('id', passId)
        .select();

      logger.debug('Réponse Supabase', { data, error, count });

      if (error) {
        logger.error('Erreur Supabase lors de la suppression', { error });
        throw error;
      }

      if (!data || data.length === 0) {
        logger.warn("Aucune ligne supprimée - le pass n'existe peut-être pas");
        toast.error('Pass introuvable ou déjà supprimé');
        return;
      }

      logger.info('Pass supprimé avec succès', { data });

      toast.success('Pass supprimé avec succès');
      await loadData();
    } catch (err) {
      logger.error('Erreur suppression pass', { error: err });
      toast.error(
        `Erreur lors de la suppression: ${getErrorMessage(err) || 'Erreur inconnue'}`,
      );
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
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Pass</h1>
          <p className="text-gray-600">
            Créez et gérez les pass pour vos événements
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nouveau Pass
        </button>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-gray-900">
            {passes.length}
          </div>
          <div className="text-sm text-gray-600">Total Pass</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-green-600">
            {
              passes.filter((p) => p.remaining_stock && p.remaining_stock > 0)
                .length
            }
          </div>
          <div className="text-sm text-gray-600">En stock</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-gray-900">
            {passes.length > 0
              ? (
                  passes.reduce((sum, p) => sum + p.price, 0) / passes.length
                ).toFixed(2)
              : '0.00'}
            €
          </div>
          <div className="text-sm text-gray-600">Prix moyen</div>
        </div>
      </div>

      {/* Liste des pass */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Pass ({passes.length})
          </h2>
        </div>

        {passes.length === 0 ? (
          <div className="p-12 text-center">
            <Ticket className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucun pass
            </h3>
            <p className="text-gray-600">
              Créez votre premier pass pour commencer.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {passes.map((pass) => (
              <div
                key={pass.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {pass.name}
                      </h3>
                      <span className="text-2xl font-bold text-blue-600">
                        {pass.price}€
                      </span>
                    </div>

                    <MarkdownRenderer
                      content={pass.description}
                      className="text-gray-600 mb-2"
                    />

                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4" />
                        <span>
                          {pass.initial_stock === null
                            ? `Stock: ${pass.calculated_max_stock === 999999 ? 'illimité' : pass.calculated_max_stock}`
                            : `${pass.remaining_stock}/${pass.initial_stock} restant(s)`}
                          {pass.calculated_max_stock !== 999999 &&
                            pass.calculated_max_stock !== undefined && (
                              <span className="ml-1 text-xs text-orange-600">
                                (limité par activités:{' '}
                                {pass.calculated_max_stock})
                              </span>
                            )}
                        </span>
                      </div>
                      {pass.event_activities &&
                        pass.event_activities.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              Activités:
                            </span>
                            {pass.event_activities.map((ea, index) => (
                              <span
                                key={ea.id}
                                className="flex items-center gap-1 text-xs"
                              >
                                {pass.calculated_max_stock !== 999999 &&
                                  pass.calculated_max_stock !== undefined &&
                                  pass.calculated_max_stock < 999999 && (
                                    <span>{ea.activity.name}</span>
                                  )}
                                {index < pass.event_activities!.length - 1 && (
                                  <span>,</span>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      <div>Événement: {pass.event.name}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingPass(pass)}
                      className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDeletePass(pass.id)}
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
      {(showCreateModal || editingPass) && (
        <PassFormModal
          pass={editingPass}
          events={events}
          onClose={() => {
            setShowCreateModal(false);
            setEditingPass(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingPass(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

interface PassFormModalProps {
  pass?: Pass | null;
  events: Event[];
  onClose: () => void;
  onSave: () => void;
}

function PassFormModal({ pass, events, onClose, onSave }: PassFormModalProps) {
  const [availableActivities, setAvailableActivities] = useState<
    EventActivity[]
  >([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [activityStocks, setActivityStocks] = useState<{
    [key: string]: number | null;
  }>({});
  const calculatedMaxStock = useMemo(() => {
    if (selectedActivities.length === 0) return null;
    const stocks = selectedActivities
      .map((activityId) => activityStocks[activityId])
      .filter((stock): stock is number => stock !== null);
    return stocks.length > 0 ? Math.min(...stocks) : null;
  }, [selectedActivities, activityStocks]);
  const [formData, setFormData] = useState({
    event_id: pass?.event.id || '',
    name: pass?.name || '',
    price: pass?.price || 0,
    description: pass?.description || '',
    initial_stock: pass?.initial_stock || null,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData((prev) => {
      const newStock = calculatedMaxStock ?? null;
      if (prev.initial_stock === newStock) {
        return prev;
      }
      return { ...prev, initial_stock: newStock };
    });
  }, [calculatedMaxStock]);

  useEffect(() => {
    if (pass?.event_activities && availableActivities.length > 0) {
      const passActivityIds = pass.event_activities.map((ea) => ea.id);
      setSelectedActivities(passActivityIds);
    }
  }, [pass, availableActivities]);

  const loadEventActivities = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('event_activities')
        .select(
          `
          id,
          activity_id,
          stock_limit,
          activities (
            id,
            name,
            icon
          )
        `,
        )
        .eq('event_id', formData.event_id);

      if (error) throw error;

      type RawEventActivity = {
        id: string;
        activity_id: string;
        stock_limit: number | null;
        activities: { id: string; name: string; icon: string };
      };

      const activities: EventActivity[] = (
        (data || []) as RawEventActivity[]
      ).map((ea: RawEventActivity) => ({
        id: ea.id,
        activity_id: ea.activity_id,
        stock_limit: ea.stock_limit,
        activity: ea.activities,
      }));

      setAvailableActivities(activities);

      // Créer un mapping des stocks par activité (maintenant synchronisé automatiquement)
      const stocksMap: { [key: string]: number | null } = {};
      activities.forEach((ea: EventActivity) => {
        stocksMap[ea.id] = ea.stock_limit;
      });
      setActivityStocks(stocksMap);
    } catch (err) {
      logger.error('Erreur chargement activités', { error: err });
      toast.error('Erreur lors du chargement des activités');
    }
  }, [formData.event_id]);

  useEffect(() => {
    if (formData.event_id) {
      loadEventActivities();
    }
  }, [formData.event_id, loadEventActivities]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.event_id || !formData.name || formData.price <= 0) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setSaving(true);

      let passId = pass?.id;

      if (pass) {
        // Mise à jour
        const { error } = await supabase
          .from('passes')
          .update({
            event_id: formData.event_id,
            name: formData.name,
            price: formData.price,
            description: formData.description,
            initial_stock: formData.initial_stock,
          })
          .eq('id', pass.id);

        if (error) throw error;
        toast.success('Pass mis à jour avec succès');
      } else {
        // Création
        const { data: newPass, error } = await supabase
          .from('passes')
          .insert({
            event_id: formData.event_id,
            name: formData.name,
            price: formData.price,
            description: formData.description,
            initial_stock: formData.initial_stock,
          })
          .select()
          .single();

        if (error) throw error;
        passId = newPass.id;
        toast.success('Pass créé avec succès');
      }

      // Gérer les activités du pass
      if (passId) {
        // Supprimer les anciennes associations
        await supabase.from('pass_activities').delete().eq('pass_id', passId);

        // Ajouter les nouvelles associations
        if (selectedActivities.length > 0) {
          const { error: activitiesError } = await supabase
            .from('pass_activities')
            .insert(
              selectedActivities.map((eventActivityId) => ({
                pass_id: passId,
                event_activity_id: eventActivityId,
              })),
            );

          if (activitiesError) throw activitiesError;
        }
      }

      onSave();
    } catch (err) {
      logger.error('Erreur sauvegarde pass', { error: err });
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div
        className="bg-white rounded-lg max-w-md w-full flex flex-col"
        style={{ maxHeight: '90vh' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pass-modal-title"
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2
            id="pass-modal-title"
            className="text-xl font-semibold text-gray-900"
          >
            {pass ? 'Modifier le Pass' : 'Créer un Pass'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fermer le modal"
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Événement *
            </label>
            <select
              value={formData.event_id}
              onChange={(e) =>
                setFormData({ ...formData, event_id: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Sélectionner un événement</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du Pass *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prix (€) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  price: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <MarkdownEditor
              id="description"
              label="Description"
              value={formData.description}
              onChange={(value) =>
                setFormData({ ...formData, description: value })
              }
              rows={3}
            />
          </div>

          {availableActivities.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Activités disponibles
              </label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-3">
                {availableActivities.map((eventActivity) => (
                  <label
                    key={eventActivity.id}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedActivities.includes(eventActivity.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedActivities([
                            ...selectedActivities,
                            eventActivity.id,
                          ]);
                        } else {
                          setSelectedActivities(
                            selectedActivities.filter(
                              (id) => id !== eventActivity.id,
                            ),
                          );
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-lg">
                      {eventActivity.activity.icon}
                    </span>
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-700">
                        {eventActivity.activity.name}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        (Stock:{' '}
                        {eventActivity.stock_limit === null
                          ? 'illimité'
                          : eventActivity.stock_limit}
                        )
                      </span>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Sélectionnez les activités disponibles pour ce pass
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock Initial
              {calculatedMaxStock !== null && (
                <span className="text-xs text-gray-500 ml-2">
                  (Maximum autorisé: {calculatedMaxStock})
                </span>
              )}
            </label>
            <input
              type="number"
              min="0"
              max={calculatedMaxStock || undefined}
              value={formData.initial_stock || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  initial_stock: e.target.value
                    ? parseInt(e.target.value)
                    : null,
                })
              }
              placeholder={
                calculatedMaxStock
                  ? `Maximum: ${calculatedMaxStock}`
                  : 'Laisser vide pour stock illimité'
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required={calculatedMaxStock !== null}
            />
            {calculatedMaxStock !== null && (
              <p className="text-xs text-orange-600 mt-1">
                Le stock est limité par les activités sélectionnées
              </p>
            )}
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
              {saving ? 'Sauvegarde...' : pass ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
