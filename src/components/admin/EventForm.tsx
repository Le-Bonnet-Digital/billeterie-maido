import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';
import { debugLog } from '../../lib/logger';

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
}

interface EventFormProps {
  event: Event | null;
  onClose: () => void;
}

export default function EventForm({ event, onClose }: EventFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    event_date: '',
    sales_opening_date: '',
    sales_closing_date: '',
    status: 'draft',
    cgv_content: '',
    faq_content: '',
    key_info_content: '',
    has_animations: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (event) {
      setFormData({
        name: event.name,
        event_date: event.event_date ? new Date(event.event_date).toISOString().substring(0, 10) : '',
        sales_opening_date: event.sales_opening_date ? new Date(event.sales_opening_date).toISOString().substring(0, 16) : '',
        sales_closing_date: event.sales_closing_date ? new Date(event.sales_closing_date).toISOString().substring(0, 16) : '',
        status: event.status,
        cgv_content: event.cgv_content || '',
        faq_content: event.faq_content || '',
        key_info_content: event.key_info_content || '',
        has_animations: event.has_animations || false,
      });
    } else {
      // Reset for new event
      setFormData({
        name: '',
        event_date: '',
        sales_opening_date: '',
        sales_closing_date: '',
        status: 'draft',
        cgv_content: '',
        faq_content: '',
        key_info_content: '',
        has_animations: false,
      });
    }
  }, [event]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const eventData = {
        ...formData,
        event_date: new Date(formData.event_date).toISOString(),
        sales_opening_date: new Date(formData.sales_opening_date).toISOString(),
        sales_closing_date: new Date(formData.sales_closing_date).toISOString(),
    };

    try {
      debugLog('Submitting eventData:', eventData);
      console.log('Submitting eventData:', eventData);
      debugLog('event.id:', event?.id);
      console.log('event.id:', event?.id);

      if (event) {
        // Update existing event
        const { data, error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', event.id)
          .select()
          .single();

        debugLog('Supabase update data:', data);
        console.log('Supabase update data:', data);
        debugLog('Supabase update error:', error);
        console.log('Supabase update error:', error);

        if (error || !data) {
          const errorMessage = error?.message || 'événement introuvable';
          throw new Error(errorMessage);
        }
      } else {
        // Create new event
        const { error: insertError } = await supabase
          .from('events')
          .insert(eventData);
        if (insertError) throw insertError;
      }

      toast.success(`Événement ${event ? 'mis à jour' : 'créé'} avec succès`);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      debugLog('Erreur sauvegarde événement:', err);
      console.error('Erreur sauvegarde événement:', err);
      toast.error(`Erreur lors de la sauvegarde de l'événement: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {event ? "Modifier l'événement" : 'Nouvel Événement'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nom de l'événement</label>
              <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div>
              <label htmlFor="event_date" className="block text-sm font-medium text-gray-700 mb-1">Date de l'événement</label>
              <input type="date" name="event_date" id="event_date" value={formData.event_date} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div>
              <label htmlFor="sales_opening_date" className="block text-sm font-medium text-gray-700 mb-1">Ouverture des ventes</label>
              <input type="datetime-local" name="sales_opening_date" id="sales_opening_date" value={formData.sales_opening_date} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div>
              <label htmlFor="sales_closing_date" className="block text-sm font-medium text-gray-700 mb-1">Fermeture des ventes</label>
              <input type="datetime-local" name="sales_closing_date" id="sales_closing_date" value={formData.sales_closing_date} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select name="status" id="status" value={formData.status} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
                <option value="finished">Terminé</option>
                <option value="cancelled">Annulé</option>
              </select>
            </div>

             <div className="flex items-center">
                <input
                    type="checkbox"
                    name="has_animations"
                    id="has_animations"
                    checked={formData.has_animations}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="has_animations" className="ml-2 block text-sm text-gray-900">
                    Activer les animations pour cet événement
                </label>
            </div>
          </div>

          <div>
            <label htmlFor="key_info_content" className="block text-sm font-medium text-gray-700 mb-1">Informations clés</label>
            <textarea name="key_info_content" id="key_info_content" value={formData.key_info_content} onChange={handleChange} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"></textarea>
          </div>

          <div>
            <label htmlFor="cgv_content" className="block text-sm font-medium text-gray-700 mb-1">Conditions Générales de Vente (CGV)</label>
            <textarea name="cgv_content" id="cgv_content" value={formData.cgv_content} onChange={handleChange} rows={6} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"></textarea>
          </div>

          <div>
            <label htmlFor="faq_content" className="block text-sm font-medium text-gray-700 mb-1">Foire Aux Questions (FAQ)</label>
            <textarea name="faq_content" id="faq_content" value={formData.faq_content} onChange={handleChange} rows={6} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"></textarea>
          </div>

          <div className="flex justify-end items-center p-6 bg-gray-50 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Annuler
            </button>
            <button type="submit" disabled={loading} className="ml-3 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300">
              {loading ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
