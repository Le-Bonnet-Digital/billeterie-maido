import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { BarChart3, TrendingUp, Euro, Users, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths } from 'date-fns';
import { toast } from 'react-hot-toast';
import { logger } from '../../lib/logger';

interface ReportData {
  totalRevenue: number;
  totalReservations: number;
  averageTicketPrice: number;
  conversionRate: number;
  dailyStats: Array<{
    date: string;
    reservations: number;
    revenue: number;
  }>;
  passStats: Array<{
    name: string;
    count: number;
    revenue: number;
  }>;
  activityStats: Array<{
    activity: string;
    count: number;
  }>;
}

export default function Reports() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  useEffect(() => {
    loadReportData();
  }, [dateRange]);

  const loadReportData = async () => {
    try {
      setLoading(true);

      // Charger les réservations payées dans la période
      const { data: reservations, error } = await supabase
        .from('reservations')
        .select(`
          id,
          created_at,
          payment_status,
          passes!inner (
            name,
            price
          ),
          time_slots (
            event_activities (
              activities (name)
            )
          )
        `)
        .eq('payment_status', 'paid')
        .gte('created_at', `${dateRange.start}T00:00:00Z`)
        .lte('created_at', `${dateRange.end}T23:59:59Z`)
        .order('created_at');

      if (error) throw error;

      const reservationsData = reservations || [];

      // Calculer les statistiques globales
      const totalRevenue = reservationsData.reduce((sum, r) => sum + r.passes.price, 0);
      const totalReservations = reservationsData.length;
      const averageTicketPrice = totalReservations > 0 ? totalRevenue / totalReservations : 0;

      // Statistiques par jour
      const dailyStats = eachDayOfInterval({
        start: new Date(dateRange.start),
        end: new Date(dateRange.end)
      }).map(date => {
        const dayReservations = reservationsData.filter(r => 
          format(new Date(r.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        );
        
        return {
          date: format(date, 'dd/MM'),
          reservations: dayReservations.length,
          revenue: dayReservations.reduce((sum, r) => sum + r.passes.price, 0)
        };
      });

      // Statistiques par pass
      const passStatsMap = new Map();
      reservationsData.forEach(r => {
        const passName = r.passes.name;
        if (!passStatsMap.has(passName)) {
          passStatsMap.set(passName, { name: passName, count: 0, revenue: 0 });
        }
        const stats = passStatsMap.get(passName);
        stats.count++;
        stats.revenue += r.passes.price;
      });
      const passStats = Array.from(passStatsMap.values());

      // Statistiques par activité
      const activityStatsMap = new Map();
      reservationsData.forEach(r => {
        if (r.time_slots) {
          const activityName = r.time_slots.event_activities?.activities?.name;
          if (activityName) {
            const activity = activityName;
            if (!activityStatsMap.has(activity)) {
              activityStatsMap.set(activity, { activity, count: 0 });
            }
            activityStatsMap.get(activity).count++;
          }
        }
      });
      const activityStats = Array.from(activityStatsMap.values());

      setReportData({
        totalRevenue,
        totalReservations,
        averageTicketPrice,
        conversionRate: 85, // Simulé
        dailyStats,
        passStats,
        activityStats
      });
    } catch (err) {
      logger.error('Erreur chargement rapports', { error: err });
      toast.error('Erreur lors du chargement des rapports');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!reportData) return;

    const csvContent = [
      ['Rapport de Ventes', `Du ${dateRange.start} au ${dateRange.end}`],
      [''],
      ['Statistiques Globales'],
      ['Chiffre d\'affaires total', `${reportData.totalRevenue.toFixed(2)}€`],
      ['Nombre de réservations', reportData.totalReservations.toString()],
      ['Prix moyen par billet', `${reportData.averageTicketPrice.toFixed(2)}€`],
      [''],
      ['Ventes par Pass'],
      ['Pass', 'Quantité', 'Chiffre d\'affaires'],
      ...reportData.passStats.map(p => [p.name, p.count.toString(), `${p.revenue.toFixed(2)}€`]),
      [''],
      ['Répartition par Activité'],
      ['Activité', 'Réservations'],
      ...reportData.activityStats.map(a => [a.activity, a.count.toString()])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-${dateRange.start}-${dateRange.end}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Rapport exporté avec succès');
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune donnée</h3>
        <p className="text-gray-600">Aucune donnée disponible pour cette période.</p>
      </div>
    );
  }

  const isTest = process.env.NODE_ENV === 'test';
  const chartSize = {
    width: isTest ? 300 : '100%',
    height: isTest ? 256 : '100%'
  } as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports et Analyses</h1>
          <p className="text-gray-600">Analysez les performances de vos événements</p>
        </div>
        <button
          onClick={exportReport}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Exporter
        </button>
      </div>

      {/* Filtres de date */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center gap-4">
          <div>
            <label
              htmlFor="startDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Date de début
            </label>
            <input
              id="startDate"
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="endDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Date de fin
            </label>
            <input
              id="endDate"
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Chiffre d'affaires</p>
              <p className="text-2xl font-semibold text-gray-900">{reportData.totalRevenue.toFixed(2)}€</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <Euro className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Réservations</p>
              <p className="text-2xl font-semibold text-gray-900">{reportData.totalReservations}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Prix moyen</p>
              <p className="text-2xl font-semibold text-gray-900">{reportData.averageTicketPrice.toFixed(2)}€</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taux de conversion</p>
              <p className="text-2xl font-semibold text-gray-900">{reportData.conversionRate}%</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-full">
              <BarChart3 className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution des ventes */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Évolution des Ventes</h3>
          <div className="h-64" style={isTest ? { width: chartSize.width, height: chartSize.height } : undefined}>
            <ResponsiveContainer {...chartSize}>
              <BarChart data={reportData.dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'revenue' ? `${value}€` : value,
                    name === 'revenue' ? 'Chiffre d\'affaires' : 'Réservations'
                  ]}
                />
                <Bar dataKey="reservations" fill="#3B82F6" name="reservations" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Répartition par activité */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par Activité</h3>
          <div className="h-64" style={isTest ? { width: chartSize.width, height: chartSize.height } : undefined}>
            <ResponsiveContainer {...chartSize}>
              <PieChart>
                <Pie
                  data={reportData.activityStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ activity, count }) => `${activity}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {reportData.activityStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tableau des pass les plus vendus */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Performance des Pass</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pass
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendus
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chiffre d'affaires
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Part du CA
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData.passStats.map((pass, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{pass.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{pass.count}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{pass.revenue.toFixed(2)}€</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {reportData.totalRevenue > 0 ? ((pass.revenue / reportData.totalRevenue) * 100).toFixed(1) : '0'}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}