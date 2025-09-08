import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/auth';
import type { User } from '../../lib/auth';
import {
  History,
  Search,
  Download,
  Eye,
  Copy,
  X,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { logger } from '../../lib/logger';
import { debounce } from 'lodash-es';

interface ValidationRecord {
  id: string;
  reservation_id: string;
  activity: 'poney' | 'tir_arc' | 'luge_bracelet';
  validated_at: string;
  validated_by: string;
  revoked_at?: string | null;
  revoked_by?: string | null;
  revoke_reason?: string | null;
  reservation: {
    reservation_number: string;
    client_email: string;
    payment_status: 'paid' | 'pending' | 'refunded';
    created_at: string;
    pass?: {
      id: string;
      name: string;
    } | null;
    time_slot?: {
      id: string;
      slot_time: string;
    } | null;
  };
  validator: {
    email: string;
  };
  revoker?: {
    email: string;
  } | null;
}

interface Filters {
  dateFrom: string;
  dateTo: string;
  activities: string[];
  agents: string[];
  status: 'all' | 'validated' | 'revoked';
  search: string;
}

const ACTIVITY_LABELS = {
  poney: 'Poney',
  tir_arc: "Tir à l'arc",
  luge_bracelet: 'Luge',
};

const PAGE_SIZE = 50;

export default function ValidationHistory() {
  const [user, setUser] = useState<User | null>(null);
  const [validations, setValidations] = useState<ValidationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedValidation, setSelectedValidation] =
    useState<ValidationRecord | null>(null);
  const [availableAgents, setAvailableAgents] = useState<
    Array<{ id: string; email: string }>
  >([]);

  const [filters, setFilters] = useState<Filters>(() => {
    const saved = localStorage.getItem('validation-history-filters');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback to defaults
      }
    }
    return {
      dateFrom: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
      dateTo: format(new Date(), 'yyyy-MM-dd'),
      activities: [],
      agents: [],
      status: 'all',
      search: '',
    };
  });

  // Debounced search
  const debouncedSearch = useMemo(
    () =>
      debounce((searchTerm: string) => {
        setFilters((prev) => ({ ...prev, search: searchTerm }));
        setCurrentPage(1);
      }, 300),
    [],
  );

  // Save filters to localStorage
  useEffect(() => {
    localStorage.setItem('validation-history-filters', JSON.stringify(filters));
  }, [filters]);

  const loadUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (err) {
      logger.error('Erreur chargement utilisateur', { error: err });
      toast.error('Erreur lors de la vérification des permissions');
    }
  }, []);

  const loadAgents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email')
        .in('role', [
          'admin',
          'pony_provider',
          'archery_provider',
          'luge_provider',
          'atlm_collaborator',
        ])
        .order('email');

      if (error) throw error;
      setAvailableAgents(data || []);
    } catch (err) {
      logger.error('Erreur chargement agents', { error: err });
    }
  }, []);

  const loadValidations = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);

        const offset = (page - 1) * PAGE_SIZE;
        const startDate = startOfDay(new Date(filters.dateFrom));
        const endDate = endOfDay(new Date(filters.dateTo));

        let query = supabase
          .from('reservation_validations')
          .select(
            `
          id,
          reservation_id,
          activity,
          validated_at,
          validated_by,
          revoked_at,
          revoked_by,
          revoke_reason,
          reservations!inner (
            reservation_number,
            client_email,
            payment_status,
            created_at,
            passes (id, name),
            time_slots (id, slot_time)
          ),
          users!reservation_validations_validated_by_fkey (email),
          revoker:users!reservation_validations_revoked_by_fkey (email)
        `,
            { count: 'exact' },
          )
          .gte('validated_at', startDate.toISOString())
          .lte('validated_at', endDate.toISOString())
          .order('validated_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        // Apply filters
        if (filters.activities.length > 0) {
          query = query.in('activity', filters.activities);
        }

        if (filters.agents.length > 0) {
          query = query.in('validated_by', filters.agents);
        }

        if (filters.status === 'validated') {
          query = query.is('revoked_at', null);
        } else if (filters.status === 'revoked') {
          query = query.not('revoked_at', 'is', null);
        }

        if (filters.search.trim()) {
          const searchTerm = filters.search.trim();
          if (searchTerm.startsWith('RES-')) {
            query = query.eq('reservations.reservation_number', searchTerm);
          } else if (searchTerm.includes('@')) {
            query = query.ilike('reservations.client_email', `%${searchTerm}%`);
          } else {
            // Search in both reservation number and email
            query = query.or(
              `reservations.reservation_number.ilike.%${searchTerm}%,reservations.client_email.ilike.%${searchTerm}%`,
            );
          }
        }

        const { data, error, count } = await query;

        if (error) throw error;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const shaped: ValidationRecord[] = (data || []).map((v: any) => ({
          id: v.id,
          reservation_id: v.reservation_id,
          activity: v.activity,
          validated_at: v.validated_at,
          validated_by: v.validated_by,
          revoked_at: v.revoked_at,
          revoked_by: v.revoked_by,
          revoke_reason: v.revoke_reason,
          reservation: {
            reservation_number: v.reservations.reservation_number,
            client_email: v.reservations.client_email,
            payment_status: v.reservations.payment_status,
            created_at: v.reservations.created_at,
            pass: v.reservations.passes
              ? {
                  id: v.reservations.passes.id,
                  name: v.reservations.passes.name,
                }
              : null,
            time_slot: v.reservations.time_slots
              ? {
                  id: v.reservations.time_slots.id,
                  slot_time: v.reservations.time_slots.slot_time,
                }
              : null,
          },
          validator: {
            email: v.users?.email || 'Inconnu',
          },
          revoker: v.revoker
            ? {
                email: v.revoker.email,
              }
            : null,
        }));

        setValidations(shaped);
        setTotalCount(count || 0);

        // Log access for audit
        logger.info('Consultation historique validations', {
          user_id: user?.id,
          filters_hash: btoa(JSON.stringify(filters)).slice(0, 16),
          count_returned: shaped.length,
          page,
        });
      } catch (err) {
        logger.error('Erreur chargement historique', { error: err });
        toast.error("Erreur lors du chargement de l'historique");
      } finally {
        setLoading(false);
      }
    },
    [filters, user?.id],
  );

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (user) {
      loadAgents();
      loadValidations(currentPage);
    }
  }, [user, loadAgents, loadValidations, currentPage]);

  const handleRevokeValidation = async (
    validation: ValidationRecord,
    reason: string,
  ) => {
    if (!user || user.role !== 'admin') {
      toast.error('Seuls les administrateurs peuvent annuler des validations');
      return;
    }

    try {
      const { error } = await supabase
        .from('reservation_validations')
        .update({
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
          revoke_reason: reason,
        })
        .eq('id', validation.id);

      if (error) throw error;

      toast.success('Validation annulée');
      loadValidations(currentPage);
      setSelectedValidation(null);
    } catch (err) {
      logger.error('Erreur annulation validation', { error: err });
      toast.error("Erreur lors de l'annulation");
    }
  };

  const exportCSV = () => {
    const csvContent = [
      [
        'Date/Heure',
        'N° Réservation',
        'Pass',
        'Activité',
        'Agent',
        'Statut',
        'Client',
        'Paiement',
      ].join(','),
      ...validations.map((v) =>
        [
          format(new Date(v.validated_at), 'dd/MM/yyyy HH:mm'),
          v.reservation.reservation_number,
          v.reservation.pass?.name || 'N/A',
          ACTIVITY_LABELS[v.activity],
          v.validator.email,
          v.revoked_at ? 'Annulée' : 'Validée',
          v.reservation.client_email,
          v.reservation.payment_status,
        ].join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historique-validations-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success('Export CSV téléchargé');
  };

  const copyReservationNumber = (number: string) => {
    navigator.clipboard.writeText(number);
    toast.success('Numéro de réservation copié');
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (
    !user ||
    ![
      'admin',
      'pony_provider',
      'archery_provider',
      'luge_provider',
      'atlm_collaborator',
    ].includes(user.role)
  ) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <History className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <h1 className="text-2xl font-bold">Historique des Validations</h1>
        <p className="text-gray-600 mt-2">
          Accès réservé au personnel autorisé.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Historique des Validations
            </h1>
            <p className="text-gray-600">
              Suivi chronologique des contrôles d'accès
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadValidations(currentPage)}
            disabled={loading}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            title="Actualiser"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={exportCSV}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exporter CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Search */}
          <div className="xl:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recherche
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="N° réservation (RES-...) ou email client"
                defaultValue={filters.search}
                onChange={(e) => debouncedSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Date range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Du
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, dateFrom: e.target.value }));
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Au
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, dateTo: e.target.value }));
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          {/* Activities */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Activités
            </label>
            <div className="space-y-2">
              {Object.entries(ACTIVITY_LABELS).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.activities.includes(key)}
                    onChange={(e) => {
                      const newActivities = e.target.checked
                        ? [...filters.activities, key]
                        : filters.activities.filter((a) => a !== key);
                      setFilters((prev) => ({
                        ...prev,
                        activities: newActivities,
                      }));
                      setCurrentPage(1);
                    }}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Agents */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Agents
            </label>
            <div className="max-h-24 overflow-y-auto space-y-2">
              {availableAgents.map((agent) => (
                <label key={agent.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.agents.includes(agent.id)}
                    onChange={(e) => {
                      const newAgents = e.target.checked
                        ? [...filters.agents, agent.id]
                        : filters.agents.filter((a) => a !== agent.id);
                      setFilters((prev) => ({ ...prev, agents: newAgents }));
                      setCurrentPage(1);
                    }}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">{agent.email}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Statut
            </label>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value as Filters['status'],
                }));
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tous</option>
              <option value="validated">Validées</option>
              <option value="revoked">Annulées</option>
            </select>
          </div>
        </div>

        {/* Active filters display */}
        {(filters.activities.length > 0 ||
          filters.agents.length > 0 ||
          filters.search ||
          filters.status !== 'all') && (
          <div className="mt-4 flex flex-wrap gap-2">
            {filters.activities.map((activity) => (
              <span
                key={activity}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                {ACTIVITY_LABELS[activity as keyof typeof ACTIVITY_LABELS]}
                <button
                  onClick={() => {
                    setFilters((prev) => ({
                      ...prev,
                      activities: prev.activities.filter((a) => a !== activity),
                    }));
                    setCurrentPage(1);
                  }}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {filters.search && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                Recherche: {filters.search}
                <button
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, search: '' }));
                    setCurrentPage(1);
                  }}
                  className="hover:bg-gray-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.status !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                {filters.status === 'validated' ? 'Validées' : 'Annulées'}
                <button
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, status: 'all' }));
                    setCurrentPage(1);
                  }}
                  className="hover:bg-purple-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Validations ({totalCount})
          </h2>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>
                Page {currentPage} sur {totalPages}
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement de l'historique...</p>
          </div>
        ) : validations.length === 0 ? (
          <div className="p-12 text-center">
            <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune validation trouvée
            </h3>
            <p className="text-gray-600">
              {filters.search ||
              filters.activities.length > 0 ||
              filters.agents.length > 0 ||
              filters.status !== 'all'
                ? 'Aucune validation ne correspond à vos critères.'
                : "Aucune validation n'a encore été effectuée."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date/Heure
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Réservation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pass
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Activité
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {validations.map((validation) => (
                    <tr
                      key={validation.id}
                      className="hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(
                          new Date(validation.validated_at),
                          'dd/MM/yyyy HH:mm',
                          { locale: fr },
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {validation.reservation.reservation_number}
                        </div>
                        <div className="text-sm text-gray-500">
                          {validation.reservation.client_email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {validation.reservation.pass?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                          {ACTIVITY_LABELS[validation.activity]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {validation.validator.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {validation.revoked_at ? (
                          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                            Annulée
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                            Validée
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedValidation(validation)}
                          className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                          title="Voir détails"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Affichage de {(currentPage - 1) * PAGE_SIZE + 1} à{' '}
                  {Math.min(currentPage * PAGE_SIZE, totalCount)} sur{' '}
                  {totalCount} validations
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Précédent
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedValidation && (
        <ValidationDetailModal
          validation={selectedValidation}
          onClose={() => setSelectedValidation(null)}
          onRevoke={user?.role === 'admin' ? handleRevokeValidation : undefined}
          onCopyReservation={copyReservationNumber}
        />
      )}
    </div>
  );
}

interface ValidationDetailModalProps {
  validation: ValidationRecord;
  onClose: () => void;
  onRevoke?: (validation: ValidationRecord, reason: string) => void;
  onCopyReservation: (number: string) => void;
}

function ValidationDetailModal({
  validation,
  onClose,
  onRevoke,
  onCopyReservation,
}: ValidationDetailModalProps) {
  const [revokeReason, setRevokeReason] = useState('');
  const [showRevokeForm, setShowRevokeForm] = useState(false);

  const handleRevoke = () => {
    if (!revokeReason.trim()) {
      toast.error("Veuillez saisir un motif d'annulation");
      return;
    }
    onRevoke?.(validation, revokeReason);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Détail de la Validation
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-6">
          {/* Reservation Info */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Réservation
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Numéro:
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">
                    {validation.reservation.reservation_number}
                  </span>
                  <button
                    onClick={() =>
                      onCopyReservation(
                        validation.reservation.reservation_number,
                      )
                    }
                    className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                    title="Copier"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Client:
                </span>
                <span className="text-sm">
                  {validation.reservation.client_email}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Paiement:
                </span>
                <span
                  className={`text-sm px-2 py-1 rounded-full ${
                    validation.reservation.payment_status === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {validation.reservation.payment_status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Créée le:
                </span>
                <span className="text-sm">
                  {format(
                    new Date(validation.reservation.created_at),
                    'dd/MM/yyyy à HH:mm',
                    { locale: fr },
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Pass Info */}
          {validation.reservation.pass && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Pass</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Nom:
                  </span>
                  <span className="text-sm">
                    {validation.reservation.pass.name}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Activity & Time Slot */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Activité</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Activité:
                </span>
                <span className="text-sm">
                  {ACTIVITY_LABELS[validation.activity]}
                </span>
              </div>
              {validation.reservation.time_slot && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Créneau:
                  </span>
                  <span className="text-sm">
                    {format(
                      new Date(validation.reservation.time_slot.slot_time),
                      'dd/MM/yyyy à HH:mm',
                      { locale: fr },
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Validation Info */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Validation
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Validée le:
                </span>
                <span className="text-sm">
                  {format(
                    new Date(validation.validated_at),
                    'dd/MM/yyyy à HH:mm',
                    { locale: fr },
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-gray-700">Par:</span>
                <span className="text-sm">{validation.validator.email}</span>
              </div>
              {validation.revoked_at && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Annulée le:
                    </span>
                    <span className="text-sm">
                      {format(
                        new Date(validation.revoked_at),
                        'dd/MM/yyyy à HH:mm',
                        { locale: fr },
                      )}
                    </span>
                  </div>
                  {validation.revoker && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Annulée par:
                      </span>
                      <span className="text-sm">
                        {validation.revoker.email}
                      </span>
                    </div>
                  )}
                  {validation.revoke_reason && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        Motif:
                      </span>
                      <p className="text-sm mt-1 p-2 bg-red-50 border border-red-200 rounded">
                        {validation.revoke_reason}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Revoke Action */}
          {onRevoke && !validation.revoked_at && (
            <div>
              {!showRevokeForm ? (
                <button
                  onClick={() => setShowRevokeForm(true)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Annuler cette validation
                </button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Motif d'annulation *
                    </label>
                    <textarea
                      value={revokeReason}
                      onChange={(e) => setRevokeReason(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="Expliquez pourquoi cette validation doit être annulée..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowRevokeForm(false);
                        setRevokeReason('');
                      }}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-md font-medium transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleRevoke}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
                    >
                      Confirmer l'annulation
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
