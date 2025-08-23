import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, HelpCircle } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  faq_content: string;
}

export default function EventFAQ() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventId) {
      loadEventFAQ();
    }
  }, [eventId]);

  const loadEventFAQ = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('events')
        .select('id, name, faq_content')
        .eq('id', eventId)
        .eq('status', 'published')
        .single();

      if (error) throw error;
      setEvent(data);
    } catch (err) {
      console.error('Erreur chargement FAQ:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatFAQContent = (content: string) => {
    // Conversion basique Markdown vers HTML pour les titres et paragraphes
    return content
      .replace(/### (.*?)$/gm, '<h3 class="text-xl font-bold text-gray-900 mb-4 mt-8">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      .replace(/^Q : "(.*?)"$/gm, '<div class="bg-blue-50 p-4 rounded-lg mb-4"><h4 class="font-semibold text-blue-900 mb-2">Q : $1</h4>')
      .replace(/^R : "(.*?)"$/gm, '<p class="text-blue-800">R : $1</p></div>')
      .replace(/\n\n/g, '</p><p class="mb-4">')
      .replace(/^(?!<|Q |R )(.+)$/gm, '<p class="mb-4">$1</p>');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de la FAQ...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">FAQ introuvable</h2>
          <p className="text-gray-600">La FAQ de cet événement n'est pas disponible.</p>
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
          <HelpCircle className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">FAQ</h1>
        </div>
        <p className="text-xl text-gray-600">{event.name}</p>
      </div>

      {/* FAQ Content */}
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div 
          className="prose prose-blue max-w-none"
          dangerouslySetInnerHTML={{ 
            __html: formatFAQContent(event.faq_content) 
          }}
        />
      </div>

      {/* Contact Section */}
      <div className="bg-gray-50 rounded-lg p-6 mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Vous ne trouvez pas la réponse à votre question ?
        </h2>
        <p className="text-gray-600 mb-4">
          Notre équipe est là pour vous aider. N'hésitez pas à nous contacter.
        </p>
        <a
          href="mailto:contact@billetevent.com"
          className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          Nous contacter
        </a>
      </div>
    </div>
  );
}