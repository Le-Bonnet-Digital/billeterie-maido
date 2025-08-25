import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Calendar, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Event {
  id: string;
  name: string;
  event_date: string;
  sales_opening_date: string;
  sales_closing_date: string;
  status: 'draft' | 'published' | 'finished' | 'cancelled';
  cgv_content: string;
  faq_content: string;
  key_info_content: string;
  has_animations: boolean;
  created_at: string;
  updated_at: string;
}

interface EventFormProps {
  event?: Event | null;
  onClose: () => void;
}

export default function EventForm({ event, onClose }: EventFormProps) {
  console.log('🔧 EventForm rendered with event:', event?.id);

  const [formData, setFormData] = useState({
    name: '',
    event_date: '',
    sales_opening_date: '',
    sales_closing_date: '',
    status: 'draft' as const,
    cgv_content: '',
    faq_content: '',
    key_info_content: '',
    has_animations: false
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (event) {
      setFormData({
        name: event.name,
        event_date: event.event_date,
        sales_opening_date: event.sales_opening_date.slice(0, 16),
        sales_closing_date: event.sales_closing_date.slice(0, 16),
        status: event.status,
        cgv_content: event.cgv_content || '',
        faq_content: event.faq_content || '',
        key_info_content: event.key_info_content || '',
        has_animations: event.has_animations || false
      });
    }
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('🔧 EventForm handleSubmit called');
    e.preventDefault();
    
    if (!isSupabaseConfigured()) {
      toast.error('Configuration Supabase manquante');
      return;
    }

    console.log('🔧 EventForm saving with has_animations:', formData.has_animations);

    try {
      setLoading(true);

      const eventData = {
        name: formData.name,
        event_date: formData.event_date,
        sales_opening_date: formData.sales_opening_date,
        sales_closing_date: formData.sales_closing_date,
        status: formData.status,
        cgv_content: formData.cgv_content,
        faq_content: formData.faq_content,
        key_info_content: formData.key_info_content,
        has_animations: formData.has_animations,
        updated_at: new Date().toISOString()
      };

      console.log('🔧 EventForm eventData being sent to Supabase:', eventData);

      if (event) {
        console.log('🔧 EventForm updating event:', event.id);
        const { data, error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', event.id)
          .select();

        console.log('🔧 EventForm Supabase update response:', { data, error });

        if (error) throw error;
        console.log('🔧 EventForm event updated successfully');
        toast.success('Événement modifié avec succès');
      } else {
        const { data, error } = await supabase
          .from('events')
          .insert([eventData])
          .select();

        console.log('🔧 EventForm Supabase insert response:', { data, error });

        if (error) throw error;
        console.log('🔧 EventForm event created successfully');
        toast.success('Événement créé avec succès');
      }

      console.log('🔧 EventForm closing modal');
      onClose();
    } catch (err) {
      console.error('🔧 EventForm error:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-red-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {event ? 'Modifier l\'événement' : 'Nouvel événement'}
              </h2>
              {event && (
                <p className="text-red-600 font-mono text-sm">
                  🔧 DEBUG: Editing event {event.id}
                </p>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Informations générales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de l'événement *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Festival de musique"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de l'événement *
                </label>
                <input
                  type="date"
                  required
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Dates de vente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ouverture des ventes *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.sales_opening_date}
                  onChange={(e) => setFormData({ ...formData, sales_opening_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fermeture des ventes *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.sales_closing_date}
                  onChange={(e) => setFormData({ ...formData, sales_closing_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Statut et animations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="draft">Brouillon</option>
                  <option value="published">Publié</option>
                  <option value="finished">Terminé</option>
                  <option value="cancelled">Annulé</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Options
                </label>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="has_animations"
                    checked={formData.has_animations}
                    onChange={(e) => {
                      console.log('🔧 EventForm animations checkbox changed to:', e.target.checked);
                      setFormData({ ...formData, has_animations: e.target.checked });
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="has_animations" className="ml-2 text-sm text-gray-700">
                    Activer les animations
                  </label>
                </div>
              </div>
            </div>

            {/* Informations clés */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Informations clés
              </label>
              <textarea
                value={formData.key_info_content}
                onChange={(e) => setFormData({ ...formData, key_info_content: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Informations importantes à afficher sur la page de l'événement..."
              />
            </div>

            {/* CGV */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conditions Générales de Vente
              </label>
              <textarea
                value={formData.cgv_content}
                onChange={(e) => setFormData({ ...formData, cgv_content: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Conditions générales de vente..."
              />
            </div>

            {/* FAQ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Questions Fréquemment Posées
              </label>
              <textarea
                value={formData.faq_content}
                onChange={(e) => setFormData({ ...formData, faq_content: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Questions et réponses fréquentes..."
              />
            </div>
          </div>

          {/* Boutons */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
            >
              {loading ? 'Sauvegarde...' : (event ? 'Modifier' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}