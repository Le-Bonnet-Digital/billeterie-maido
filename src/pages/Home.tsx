import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import EventCard from '../components/EventCard';
import { Calendar, Loader2 } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  event_date: string;
  sales_opening_date: string;
  sales_closing_date: string;
  key_info_content: string;
}

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    // Check if Supabase is configured
    if (!isSupabaseConfigured()) {
      setEvents([]);
      setError('Supabase n\'est pas encore configuré. Cliquez sur "Connect to Supabase" en haut à droite.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('id, name, event_date, sales_opening_date, sales_closing_date, key_info_content')
        .eq('status', 'published')
        .order('event_date', { ascending: true });

      if (error) {
        throw error;
      }

      setEvents(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des événements:', err);
      setError('Impossible de charger les événements');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement des événements...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur de chargement</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadEvents}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-blue-600 to-purple-700 rounded-2xl p-12 mb-12 text-center text-white overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-10"></div>
        <div className="relative z-10">
          <h1 className="text-5xl font-bold mb-6">
            Découvrez Nos Événements
          </h1>
          <p className="text-xl opacity-90 max-w-3xl mx-auto mb-8">
            Réservez vos billets pour des expériences uniques et inoubliables à La Réunion. 
            Paiement sécurisé et confirmation instantanée.
          </p>
          <div className="flex items-center justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Paiement sécurisé</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Confirmation instantanée</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Support client</span>
            </div>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      {events.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Aucun événement disponible
          </h2>
          <p className="text-gray-600">
            Revenez bientôt pour découvrir de nouveaux événements !
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {/* CTA Section */}
      <div className="bg-blue-50 rounded-xl p-8 mt-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Organisez Votre Événement
        </h2>
        <p className="text-gray-600 mb-6">
          Vous organisez un événement ? Utilisez notre plateforme pour gérer 
          vos billets et vos participants en toute simplicité.
        </p>
        <a
          href="/admin"
          className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <Calendar className="h-5 w-5 mr-2" />
          Accéder au Dashboard
        </a>
      </div>
    </div>
  );
}