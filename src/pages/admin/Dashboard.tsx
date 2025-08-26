import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Calendar, Users, Euro, TrendingUp, Activity } from 'lucide-react';
import { logger } from '../../lib/logger';
import { toast } from 'react-hot-toast';

interface DashboardStats {
  totalEvents: number;
  totalReservations: number;
  totalRevenue: number;
  activeEvents: number;
}

interface ReservationWithPass {
  passes: {
    price: number;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEvents: 0,
    totalReservations: 0,
    totalRevenue: 0,
    activeEvents: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);

      // Compter les événements
      const { count: eventCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true });

      // Compter les événements actifs
      const { count: activeEventCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published');

      // Compter les réservations payées
      const { count: reservationCount } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('payment_status', 'paid');

      // Calculer le chiffre d'affaires (approximatif)
      const { data: reservations, error: revenueError } = await supabase
        .from('reservations')
        .select<ReservationWithPass>(`
          passes!inner (
            price
          )
        `)
        .eq('payment_status', 'paid');

      let revenue = 0;
      if (!revenueError && reservations) {
        revenue = reservations.reduce((total, reservation) => {
          return total + (reservation.passes?.price || 0);
        }, 0);
      }

      setStats({
        totalEvents: eventCount || 0,
        totalReservations: reservationCount || 0,
        totalRevenue: revenue,
        activeEvents: activeEventCount || 0
      });
    } catch (err) {
      logger.error('Erreur chargement statistiques', { error: err });
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Événements Total',
      value: stats.totalEvents,
      icon: Calendar,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      title: 'Événements Actifs',
      value: stats.activeEvents,
      icon: Activity,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    {
      title: 'Réservations',
      value: stats.totalReservations,
      icon: Users,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    },
    {
      title: 'Chiffre d\'affaires',
      value: `${stats.totalRevenue.toFixed(2)}€`,
      icon: Euro,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord</h1>
        <p className="text-gray-600">Vue d'ensemble de votre activité événementielle</p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className={`${stat.bgColor} rounded-lg p-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${stat.textColor}`}>
                    {stat.title}
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-full`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions rapides */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions Rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/admin/events" className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left block">
            <Calendar className="h-6 w-6 text-blue-600 mb-2" />
            <h3 className="font-medium text-gray-900">Créer un Événement</h3>
            <p className="text-sm text-gray-600">Configurer un nouvel événement</p>
          </Link>
          
          <Link to="/admin/reservations" className="p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors text-left block">
            <Users className="h-6 w-6 text-green-600 mb-2" />
            <h3 className="font-medium text-gray-900">Voir les Réservations</h3>
            <p className="text-sm text-gray-600">Gérer les inscriptions</p>
          </Link>
          
          <Link to="/admin/reports" className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors text-left block">
            <TrendingUp className="h-6 w-6 text-purple-600 mb-2" />
            <h3 className="font-medium text-gray-900">Rapports</h3>
            <p className="text-sm text-gray-600">Analyser les performances</p>
          </Link>
        </div>
      </div>

      {/* Événements récents */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Activité Récente</h2>
        <div className="text-center py-8 text-gray-500">
          <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>Aucune activité récente à afficher</p>
        </div>
      </div>
    </div>
  );
}