import { useEffect, useState } from 'react';
import ProviderLayout from './ProviderLayout';
import {
  fetchValidationHistory,
  ValidationHistoryRow,
  ValidationHistoryFilters,
  exportValidationHistoryCSV,
  fetchValidationDetail,
  revokeValidation,
  ValidationDetail,
} from '../../lib/history';

const ACTIVITIES = ['poney', 'tir_arc', 'luge_bracelet'];

export default function ValidationHistory() {
  const [rows, setRows] = useState<ValidationHistoryRow[]>([]);
  const [filters, setFilters] = useState<ValidationHistoryFilters>(() => {
    const saved = localStorage.getItem('validationFilters');
    if (saved) return JSON.parse(saved);
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      limit: 20,
      offset: 0,
    };
  });
  const [search, setSearch] = useState(filters.search ?? '');
  const [detail, setDetail] = useState<ValidationDetail | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const id = setTimeout(() => {
      setFilters((f) => ({ ...f, search, offset: 0 }));
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  // Fetch rows when filters change
  useEffect(() => {
    localStorage.setItem('validationFilters', JSON.stringify(filters));
    fetchValidationHistory(filters).then(setRows);
  }, [filters]);

  const toggleActivity = (act: string) => {
    setFilters((f) => {
      const list = new Set(f.activities ?? []);
      if (list.has(act)) {
        list.delete(act);
      } else {
        list.add(act);
      }
      return { ...f, activities: Array.from(list), offset: 0 };
    });
  };

  const loadMore = () =>
    setFilters((f) => ({ ...f, offset: (f.offset ?? 0) + (f.limit ?? 20) }));

  const exportCsv = () => {
    const csv = exportValidationHistoryCSV(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'validation_history.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const openDetail = async (id: string) => {
    setDetailId(id);
    const d = await fetchValidationDetail(id);
    setDetail(d);
  };

  const revoke = async () => {
    if (!detailId) return;
    const reason = prompt("Motif d'annulation ?");
    if (!reason) return;
    const ok = await revokeValidation(detailId, reason);
    if (ok) {
      setDetail(null);
      fetchValidationHistory(filters).then(setRows);
    }
  };

  return (
    <ProviderLayout>
      <div className="p-4">
        <h1 className="text-2xl mb-4">Historique des validations</h1>
        <div className="flex flex-wrap gap-2 mb-4">
          <label>
            Début
            <input
              type="date"
              value={filters.startDate?.slice(0, 10) || ''}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  startDate: new Date(e.target.value).toISOString(),
                  offset: 0,
                }))
              }
              className="border px-2 ml-1"
            />
          </label>
          <label>
            Fin
            <input
              type="date"
              value={filters.endDate?.slice(0, 10) || ''}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  endDate: new Date(e.target.value).toISOString(),
                  offset: 0,
                }))
              }
              className="border px-2 ml-1"
            />
          </label>
          <div className="flex items-center gap-1">
            {ACTIVITIES.map((act) => (
              <label key={act} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={filters.activities?.includes(act) ?? false}
                  onChange={() => toggleActivity(act)}
                />
                {act}
              </label>
            ))}
          </div>
          <input
            type="text"
            placeholder="Recherche (RES-..., email)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border px-2"
          />
          <button onClick={exportCsv} className="border px-2">
            Exporter CSV
          </button>
        </div>
        <table className="w-full text-left border">
          <thead>
            <tr>
              <th className="border px-2">Date</th>
              <th className="border px-2">N° réservation</th>
              <th className="border px-2">Pass</th>
              <th className="border px-2">Activité</th>
              <th className="border px-2">Agent</th>
              <th className="border px-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="cursor-pointer"
                onClick={() => openDetail(r.id)}
              >
                <td className="border px-2">
                  {new Date(r.validated_at).toLocaleString()}
                </td>
                <td className="border px-2">{r.reservation_number}</td>
                <td className="border px-2">{r.pass_name}</td>
                <td className="border px-2">{r.activity}</td>
                <td className="border px-2">{r.agent_email}</td>
                <td className="border px-2">
                  {r.status === 'revoked' ? 'Annulée' : 'Validée'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2">
          <button onClick={loadMore} className="border px-2">
            Charger plus
          </button>
        </div>

        {detail && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-4 w-96">
              <h2 className="text-xl mb-2">Détail</h2>
              <p>Réservation : {detail.reservation_number}</p>
              <p>Email client : {detail.client_email}</p>
              <p>Statut paiement : {detail.payment_status}</p>
              <p>Créé le : {new Date(detail.created_at).toLocaleString()}</p>
              <p>Pass : {detail.pass_name}</p>
              <p>Activité : {detail.activity}</p>
              {detail.time_slot_start && (
                <p>
                  Créneau :{' '}
                  {new Date(detail.time_slot_start).toLocaleTimeString()} -
                  {detail.time_slot_end &&
                    new Date(detail.time_slot_end).toLocaleTimeString()}
                </p>
              )}
              <p>
                Validé le : {new Date(detail.validated_at).toLocaleString()}
              </p>
              <p>Agent : {detail.agent_email}</p>
              {detail.revoked_at && <p className="text-red-600">Annulé</p>}
              <button
                onClick={() =>
                  navigator.clipboard.writeText(detail.reservation_number)
                }
                className="border px-2 mt-2"
              >
                Copier N° réservation
              </button>
              {!detail.revoked_at && (
                <button onClick={revoke} className="border px-2 mt-2 ml-2">
                  Annuler
                </button>
              )}
              <button
                onClick={() => setDetail(null)}
                className="border px-2 mt-2 ml-2"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </ProviderLayout>
  );
}
