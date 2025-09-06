import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { toast } from 'react-hot-toast';
import { BarChart3, RefreshCw } from 'lucide-react';

interface ValidationRow {
  id: string;
  activity: 'poney' | 'tir_arc' | 'luge_bracelet';
  validated_at: string;
}

export default function ProviderStats() {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - 7);
      const { data, error } = await supabase
        .from('reservation_validations')
        .select('id,activity,validated_at')
        .gt('validated_at', since.toISOString());
      if (error) throw error;
      const rows = (data ?? []) as ValidationRow[];
      const grouped: Record<string, number> = {};
      for (const r of rows) {
        grouped[r.activity] = (grouped[r.activity] || 0) + 1;
      }
      setCounts(grouped);
      setLastUpdate(new Date());
    } catch (err) {
      logger.error('Erreur chargement stats prestataires', { error: err });
      toast.error('Impossible de charger les statistiques');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  const rows = [
    { label: 'Poney', key: 'poney' },
    { label: "Tir à l'arc", key: 'tir_arc' },
    { label: 'Luge (bracelet)', key: 'luge_bracelet' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Statistiques</h1>
              <p className="text-sm text-gray-600">7 derniers jours</p>
            </div>
          </div>
          <button
            onClick={loadStats}
            disabled={loading}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            title="Actualiser"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activité
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Validations
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map((r) => (
                <tr key={r.key} className="hover:bg-gray-50">
                  <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-900">{r.label}</td>
                  <td className="px-4 sm:px-6 py-4">
                    <span className="text-2xl font-bold text-blue-600">
                      {counts[r.key] || 0}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {lastUpdate && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Dernière mise à jour : {lastUpdate.toLocaleTimeString('fr-FR')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
