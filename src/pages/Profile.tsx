import React, { useEffect, useState } from 'react';
import { getCurrentUser } from '../lib/auth';
import type { User } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { logger } from '../lib/logger';
import { User as UserIcon, Ticket, Shield } from 'lucide-react';

interface ReservationItem {
  id: string;
  reservation_number: string;
  payment_status: string;
  created_at: string;
}

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const u = await getCurrentUser();
        setUser(u);
        if (u?.email) {
          const { data, error } = await supabase
            .from('reservations')
            .select('id,reservation_number,payment_status,created_at')
            .eq('client_email', u.email)
            .order('created_at', { ascending: false });
          if (error) throw error;
          setReservations((data ?? []) as ReservationItem[]);
        }
      } catch (err) {
        logger.error('Erreur chargement profil', { error: err });
        toast.error('Impossible de charger le profil');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <Shield className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <h1 className="text-2xl font-bold">Profil</h1>
        <p className="text-gray-600 mt-2">Veuillez vous connecter pour consulter vos commandes.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-3 mb-2">
          <UserIcon className="h-5 w-5 text-blue-600" />
          <h1 className="text-xl font-semibold">Mon profil</h1>
        </div>
        <p className="text-sm text-gray-700">{user.email}</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <Ticket className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Mes réservations</h2>
        </div>
        {loading ? (
          <div className="p-6">Chargement...</div>
        ) : reservations.length === 0 ? (
          <div className="p-6 text-sm text-gray-600">Aucune réservation trouvée.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {reservations.map((r) => (
              <li key={r.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.reservation_number}</div>
                    <div className="text-sm text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    r.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {r.payment_status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

