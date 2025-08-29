import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { toast } from 'react-hot-toast';
import { BarChart3 } from 'lucide-react';

interface ValidationRow {
  id: string;
  activity: 'poney' | 'tir_arc' | 'luge_bracelet';
  validated_at: string;
}

export default function ProviderStats() {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
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
      } catch (err) {
        logger.error('Erreur chargement stats prestataires', { error: err });
        toast.error('Impossible de charger les statistiques');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const rows = [
    { label: 'Poney', key: 'poney' },
    { label: "Tir à l'arc", key: 'tir_arc' },
    { label: 'Luge (bracelet)', key: 'luge_bracelet' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-blue-600" />
        <h1 className="text-xl font-semibold">Statistiques (7 derniers jours)</h1>
      </div>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activité</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Validations</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="px-6 py-4 text-sm text-gray-900">{r.label}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{counts[r.key] || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
