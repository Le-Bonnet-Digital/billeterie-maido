import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, FileText } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  cgv_content: string;
}

export default function EventCGV() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventId) {
      loadEventCGV();
    }
  }, [eventId]);

  const loadEventCGV = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('events')
        .select('id, name, cgv_content')
        .eq('id', eventId)
        .eq('status', 'published')
        .single();

      if (error) throw error;
      setEvent(data);
    } catch (err) {
      console.error('Erreur chargement CGV:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCGVContent = (content: string) => {
    return content
      .replace(/### (.*?)$/gm, '<h3 class="text-xl font-bold text-gray-900 mb-4 mt-8">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/^(?!<)(.+)$/gm, '<p class="mb-4">$1</p>');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des CGV...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">CGV introuvables</h2>
          <p className="text-gray-600">Les conditions générales de cet événement ne sont pas disponibles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Navigation */}
      <div className="mb-8">
        <Link 
          to={`/event/${eventId}`}
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l'événement
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Conditions Générales de Vente</h1>
        </div>
        <p className="text-xl text-gray-600">{event.name}</p>
      </div>

      {/* CGV Content */}
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div 
          className="prose prose-blue max-w-none"
          dangerouslySetInnerHTML={{ 
            __html: formatCGVContent(event.cgv_content) 
          }}
        />
      </div>

      {/* Contact Section */}
      <div className="bg-gray-50 rounded-lg p-6 mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Questions sur les conditions ?
        </h2>
        <p className="text-gray-600 mb-4">
          Pour toute question concernant ces conditions générales de vente, contactez-nous.
        </p>
        <a
          href="mailto:legal@billetevent.com"
          className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          Nous contacter
        </a>
      </div>
    </div>
  );
}