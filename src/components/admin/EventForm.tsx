import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Calendar, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
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
  const [formData, setFormData] = useState({
    name: event?.name || '',
    event_date: event?.event_date ? format(new Date(event.event_date), 'yyyy-MM-dd') : '',
    sales_opening_date: event?.sales_opening_date ? format(new Date(event.sales_opening_date), "yyyy-MM-dd'T'HH:mm") : '',
    sales_closing_date: event?.sales_closing_date ? format(new Date(event.sales_closing_date), "yyyy-MM-dd'T'HH:mm") : '',
    status: event?.status || 'draft',
    cgv_content: event?.cgv_content || '',
    faq_content: event?.faq_content || '',
    key_info_content: event?.key_info_content || '',
    has_animations: event?.has_animations || false
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.event_date || !formData.sales_opening_date || !formData.sales_closing_date) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setSaving(true);
      console.log('Sauvegarde événement avec animations:', formData.has_animations);
      
      const eventData = {
        name: formData.name,
        event_date: formData.event_date,
        sales_opening_date: new Date(formData.sales_opening_date).toISOString(),
        sales_closing_date: new Date(formData.sales_closing_date).toISOString(),
        status: formData.status,
        cgv_content: formData.cgv_content,
        faq_content: formData.faq_content,
        key_info_content: formData.key_info_content,
        has_animations: formData.has_animations,
        updated_at: new Date().toISOString()
      };

      if (event) {
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', event.id);

        if (error) throw error;
        console.log('Événement mis à jour avec animations:', formData.has_animations);
        toast.success('Événement mis à jour avec succès');
      } else {
        const { error } = await supabase
          .from('events')
          .insert(eventData);

        if (error) throw error;
        console.log('Événement créé avec animations:', formData.has_animations);
        toast.success('Événement créé avec succès');
      }
      
      onClose();
    } catch (err) {
      console.error('Erreur sauvegarde événement:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {event ? 'Modifier l\'Événement' : 'Créer un Événement'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l'événement *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de l'événement *
              </label>
              <input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ouverture des ventes *
                </label>
                <input
                  type="datetime-local"
                  value={formData.sales_opening_date}
                  onChange={(e) => setFormData({ ...formData, sales_opening_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fermeture des ventes *
                </label>
                <input
                  type="datetime-local"
                  value={formData.sales_closing_date}
                  onChange={(e) => setFormData({ ...formData, sales_closing_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Statut
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
                <option value="finished">Terminé</option>
                <option value="cancelled">Annulé</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="has_animations"
                checked={formData.has_animations}
                onChange={(e) => {
                  console.log('Checkbox animations changée:', e.target.checked);
                  setFormData({ ...formData, has_animations: e.target.checked });
                }}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <label htmlFor="has_animations" className="text-sm font-medium text-gray-700">
                Activer les animations pour cet événement
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Informations clés
              </label>
              <textarea
                value={formData.key_info_content}
                onChange={(e) => setFormData({ ...formData, key_info_content: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Informations importantes à afficher sur la page de l'événement"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                FAQ
              </label>
              <textarea
                value={formData.faq_content}
                onChange={(e) => setFormData({ ...formData, faq_content: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Questions fréquemment posées..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Conditions Générales de Vente
              </label>
              <textarea
                value={formData.cgv_content}
                onChange={(e) => setFormData({ ...formData, cgv_content: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Conditions générales de vente..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-md font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                {saving ? 'Sauvegarde...' : (event ? 'Modifier' : 'Créer')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}