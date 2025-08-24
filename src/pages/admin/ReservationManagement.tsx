import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Search, Download, Filter, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'react-hot-toast';

interface Reservation {
  id: string;
  reservation_number: string;
  client_email: string;
  payment_status: 'paid' | 'pending' | 'refunded';
  created_at: string;
  passes: {
    name: string;
    price: number;
    events: {
      name: string;
    };
  };
  time_slots?: {
    slot_time: string;
    event_activities: {
      activities: {
        name: string;
      };
    };
  };
}

export default function ReservationManagement() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id,
          reservation_number,
          client_email,
          payment_status,
          created_at,
          passes!inner (
            name,
            price,
            events!inner (
              name
            )
          ),
          time_slots (
            slot_time,
            event_activities (
              activities (
                name
              )
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReservations(data || []);
    } catch (err) {
      console.error('Erreur chargement réservations:', err);
      toast.error('Erreur lors du chargement des réservations');
    } finally {
      setLoading(false);
    }
  };

  const filteredReservations = reservations.filter(reservation => {
    const matchesSearch = 
      reservation.client_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reservation.reservation_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || reservation.payment_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { label: 'Payé', color: 'bg-green-100 text-green-800' },
      pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
      refunded: { label: 'Remboursé', color: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const exportReservations = () => {
    const csvContent = [
      ['Numéro', 'Email', 'Événement', 'Pass', 'Activité', 'Horaire', 'Prix', 'Statut', 'Date'].join(','),
      ...filteredReservations.map(res => [
        res.reservation_number,
        res.client_email,
        res.passes.events.name,
        res.passes.name,
        res.time_slots?.event_activities?.activities?.name || 'Aucune',
        res.time_slots ? format(new Date(res.time_slots.slot_time), 'HH:mm') : 'Aucun',
        `${res.passes.price}€`,
        res.payment_status,
        format(new Date(res.created_at), 'dd/MM/yyyy HH:mm')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reservations-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Export CSV téléchargé');
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
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Réservations</h1>
          <p className="text-gray-600">Suivez et gérez toutes les réservations</p>
        </div>
        <button
          onClick={exportReservations}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Exporter CSV
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par email ou numéro de réservation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="paid">Payé</option>
              <option value="pending">En attente</option>
              <option value="refunded">Remboursé</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-gray-900">{reservations.length}</div>
          <div className="text-sm text-gray-600">Total réservations</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-green-600">
            {reservations.filter(r => r.payment_status === 'paid').length}
          </div>
          <div className="text-sm text-gray-600">Payées</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-yellow-600">
            {reservations.filter(r => r.payment_status === 'pending').length}
          </div>
          <div className="text-sm text-gray-600">En attente</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="text-2xl font-bold text-gray-900">
            {reservations.reduce((sum, r) => sum + (r.payment_status === 'paid' ? r.passes.price : 0), 0).toFixed(2)}€
          </div>
          <div className="text-sm text-gray-600">Chiffre d'affaires</div>
        </div>
      </div>

      {/* Liste des réservations */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Réservations ({filteredReservations.length})
          </h2>
        </div>

        {filteredReservations.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune réservation</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all' 
                ? 'Aucune réservation ne correspond à vos critères.'
                : 'Aucune réservation n\'a encore été effectuée.'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Réservation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pass
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activité
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prix
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReservations.map((reservation) => (
                  <tr key={reservation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {reservation.reservation_number}
                      </div>
                      <div className="text-sm text-gray-500">
                        {reservation.passes.events.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{reservation.client_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{reservation.passes.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {reservation.time_slots ? (
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {reservation.time_slots.event_activities?.activities?.name || 'Activité inconnue'}
                          </div>
                          <div className="text-gray-500">
                            {format(new Date(reservation.time_slots.slot_time), 'HH:mm')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Aucune</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {reservation.passes.price}€
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(reservation.payment_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(reservation.created_at), 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        className="text-blue-600 hover:text-blue-700 p-1"
                        title="Renvoyer confirmation"
                      >
                        <Mail className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}