import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { toast } from 'react-hot-toast';

export default function LugeCounter() {
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('luge_validations_today')
          .select('count')
          .single();
        if (error) throw error;
        setCount(data?.count ?? 0);
      } catch (err) {
        logger.error('Erreur chargement compteur luge', { error: err });
        toast.error('Impossible de charger le compteur');
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

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Compteur Luge aujourd'hui</h1>
      <div className="text-4xl font-bold">{count}</div>
    </div>
  );
}
