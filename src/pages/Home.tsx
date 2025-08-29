import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Calendar, Loader2, Ticket } from 'lucide-react';
import { logger } from '../lib/logger';
import { toast } from 'react-hot-toast';
import ParkProducts from '../components/ParkProducts';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<Array<{ id: string; name: string; event_date: string; sales_opening_date: string; sales_closing_date: string; key_info_content?: string }>>([]);
  const [nextEvent, setNextEvent] = useState<{ id: string; name: string; event_date: string } | null>(null);

  useEffect(() => {
    const loadEvents = async () => {
      if (!isSupabaseConfigured()) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        type EventRow = {
          id: string;
          name: string;
          event_date: string;
          sales_opening_date: string;
          sales_closing_date: string;
          key_info_content?: string;
        };
        const { data, error } = await supabase
          .from('events')
          .select('id, name, event_date, sales_opening_date, sales_closing_date, key_info_content')
          .order('event_date', { ascending: true });
        if (error) throw error;
        const list: EventRow[] = (data ?? []) as EventRow[];
        const now = new Date();
        // Événements en cours (ventes ouvertes)
        const current = list.filter((e) => {
          const open = e.sales_opening_date ? new Date(e.sales_opening_date) <= now : true;
          const close = e.sales_closing_date ? new Date(e.sales_closing_date) >= now : true;
          return open && close;
        });
        setEvents(current);
        // Prochain événement publié (à venir ou premier)
        const next = list.find((e) => new Date(e.event_date) >= now) || list[0] || null;
        setNextEvent(next ? { id: next.id, name: next.name, event_date: next.event_date } : null);
        setError(null);
      } catch (err) {
        logger.error('Erreur chargement événements', { error: err });
        toast.error('Impossible de charger les événements');
        setError('Impossible de charger les événements');
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, []);

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
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // Page d'accueil: Événements en cours puis billets du parc
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <div className="relative rounded-2xl p-10 mb-10 text-center text-white overflow-hidden bg-gradient-to-r from-emerald-600 to-cyan-700">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">
            Billetterie
          </h1>
          <p className="text-lg sm:text-xl opacity-95 max-w-3xl mx-auto">
            Choisissez vos billets et passez un moment inoubliable.
          </p>
          {nextEvent && (
            <div className="mt-4 inline-flex items-center gap-2 text-sm bg-white/15 px-3 py-1 rounded-full">
              <Ticket className="h-4 w-4" />
              <span>
                Prochain événement publié: {nextEvent.name} — {format(new Date(nextEvent.event_date), 'd MMM yyyy', { locale: fr })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Nos événements */}
      {isSupabaseConfigured() && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Nos événements</h2>
          {events.length === 0 ? (
            <div className="text-gray-600">Aucun événement en cours pour le moment.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {events.map((e) => (
                <div key={e.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden h-full flex flex-col">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-6 h-32 flex flex-col justify-center">
                    <div className="flex items-center gap-2 text-sm opacity-90">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(e.event_date), 'EEEE d MMMM yyyy', { locale: fr })}
                    </div>
                    <div className="text-3xl font-extrabold mt-2">
                      {format(new Date(e.event_date), 'd MMMM', { locale: fr })}
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-lg font-semibold text-gray-900">{e.name}</div>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">En vente</span>
                    </div>
                    {e.key_info_content && (
                      <div className="text-gray-600 mb-3 line-clamp-3">
                        <MarkdownRenderer content={e.key_info_content} className="prose prose-sm max-w-none" />
                      </div>
                    )}
                    {e.sales_closing_date && (
                      <div className="text-xs text-gray-500 flex items-center gap-1 mb-4">
                        <span>Vente jusqu'au {format(new Date(e.sales_closing_date), 'dd/MM à HH:mm', { locale: fr })}</span>
                      </div>
                    )}
                    <div className="mt-auto flex items-center gap-2">
                      <Link
                        to={`/event/${e.id}`}
                        className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        Voir les Billets
                      </Link>
                      <Link
                        to={`/event/${e.id}/faq`}
                        className="inline-flex items-center justify-center border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        FAQ
                      </Link>
                      <Link
                        to={`/event/${e.id}/cgv`}
                        className="inline-flex items-center justify-center border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                      >
                        CGV
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Billets du Parc */}
      <ParkProducts />
    </div>
  );
}
