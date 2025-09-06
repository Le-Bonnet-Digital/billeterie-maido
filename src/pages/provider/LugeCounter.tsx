import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { toast } from 'react-hot-toast';
import { BarChart3, RefreshCw } from 'lucide-react';

export default function LugeCounter() {
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadCount = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('luge_validations_today')
        .select('count')
        .single();
      if (error) throw error;
      setCount(data?.count ?? 0);
      setLastUpdate(new Date());
    } catch (err) {
      logger.error('Erreur chargement compteur luge', { error: err });
      toast.error('Impossible de charger le compteur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCount();
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-semibold text-gray-900">Compteur Luge</h1>
          </div>
          <button
            onClick={loadCount}
            disabled={loading}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            title="Actualiser"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <div className="text-center">
          <div className="text-5xl sm:text-6xl font-bold text-blue-600 mb-2">{count}</div>
          <p className="text-lg text-gray-600 mb-4">validations aujourd'hui</p>
          
          {lastUpdate && (
            <p className="text-sm text-gray-500">
              Dernière mise à jour : {lastUpdate.toLocaleTimeString('fr-FR')}
            </p>
          )}
        </div>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Info :</strong> Ce compteur affiche le nombre de bracelets luge remis aujourd'hui. 
          Il se met à jour automatiquement à chaque validation effectuée.
        </p>
      </div>
    </div>
  );
}
