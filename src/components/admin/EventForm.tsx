import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';
import { logger, debugLog } from '../../lib/logger';
import MarkdownEditor from './MarkdownEditor';
import FAQEditor, { FAQFormItem } from './FAQEditor';
import type { FAQItem } from '../FAQAccordion';

interface Event {
  id: string;
  name: string;
  event_date: string;
  sales_opening_date: string;
  sales_closing_date: string;
  status: 'draft' | 'published' | 'finished' | 'cancelled';
  cgv_content: string;
  key_info_content: string;
  has_animations: boolean;
  faqs: FAQItem[];
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
    key_info_content: '',
    has_animations: false,
  });
  const [faqs, setFaqs] = useState<FAQFormItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (event) {
      setFormData({
        name: event.name,
        event_date: event.event_date
          ? new Date(event.event_date).toISOString().substring(0, 10)
          : '',
        sales_opening_date: event.sales_opening_date
          ? new Date(event.sales_opening_date).toISOString().substring(0, 16)
          : '',
        sales_closing_date: event.sales_closing_date
          ? new Date(event.sales_closing_date).toISOString().substring(0, 16)
          : '',
        status: event.status,
        cgv_content: event.cgv_content || '',
        key_info_content: event.key_info_content || '',
        has_animations: event.has_animations || false,
      });
      setFaqs(
        event.faqs.map((f) => ({
          id: crypto.randomUUID(),
          question: f.question,
          answer: f.answer,
        })),
      );
    } else {
      // Reset for new event
      setFormData({
        name: '',
        event_date: '',
        sales_opening_date: '',
        sales_closing_date: '',
        status: 'draft',
        cgv_content: '',
        key_info_content: '',
        has_animations: false,
      });
      setFaqs([]);
    }
  }, [event]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (faqs.some((f) => !f.question.trim() || f.answer.trim().length < 20)) {
      toast.error('Toutes les questions doivent avoir une réponse valide.');
      setLoading(false);
      return;
    }

    const eventData = {
      ...formData,
      event_date: new Date(formData.event_date).toISOString(),
      sales_opening_date: new Date(formData.sales_opening_date).toISOString(),
      sales_closing_date: new Date(formData.sales_closing_date).toISOString(),
    };

    try {
      debugLog('Submitting eventData:', eventData);
      debugLog('event.id:', event?.id);

      let eventId = event?.id;

      if (event) {
        // Update existing event
        const { data, error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', event.id)
          .select('id, event_faqs(question, answer, position)')
          .single();

        debugLog('Supabase update data:', data);
        debugLog('Supabase update error:', error);
        debugLog('Supabase update error code:', error?.code);

        if (error?.code === 'PGRST116') {
          toast.error('Événement introuvable ou accès refusé');
          return;
        }

        if (error) {
          const errorMessage = error.message || 'événement introuvable';
          throw new Error(errorMessage);
        }
        eventId = data.id;
      } else {
        // Create new event
        const { data: inserted, error: insertError } = await supabase
          .from('events')
          .insert(eventData)
          .select('id, event_faqs(question, answer, position)')
          .single();
        if (insertError) throw insertError;
        eventId = inserted.id;
      }

      if (eventId) {
        await supabase.from('event_faqs').delete().eq('event_id', eventId);
        if (faqs.length > 0) {
          const { error: faqError } = await supabase.from('event_faqs').insert(
            faqs.map((f, index) => ({
              event_id: eventId,
              question: f.question,
              answer: f.answer,
              position: index,
            })),
          );
          if (faqError) throw faqError;
        }
      }

      toast.success(`Événement ${event ? 'mis à jour' : 'créé'} avec succès`);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : JSON.stringify(err);
      debugLog('Erreur sauvegarde événement:', err);
      logger.error('Erreur sauvegarde événement', { error: err });
      toast.error(`Erreur lors de la sauvegarde de l'événement: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-form-title"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2
              id="event-form-title"
              className="text-xl font-semibold text-gray-900"
            >
              {event ? "Modifier l'événement" : 'Nouvel Événement'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nom de l'événement
              </label>
              <input
                type="text"
                name="name"
                id="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="event_date"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Date de l'événement
              </label>
              <input
                type="date"
                name="event_date"
                id="event_date"
                value={formData.event_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="sales_opening_date"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Ouverture des ventes
              </label>
              <input
                type="datetime-local"
                name="sales_opening_date"
                id="sales_opening_date"
                value={formData.sales_opening_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="sales_closing_date"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Fermeture des ventes
              </label>
              <input
                type="datetime-local"
                name="sales_closing_date"
                id="sales_closing_date"
                value={formData.sales_closing_date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Statut
              </label>
              <select
                name="status"
                id="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
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
              <label
                htmlFor="has_animations"
                className="ml-2 block text-sm text-gray-900"
              >
                Activer les animations pour cet événement
              </label>
            </div>
          </div>

          <div>
            <MarkdownEditor
              id="key_info_content"
              label="Informations clés"
              value={formData.key_info_content}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, key_info_content: value }))
              }
              rows={4}
            />
          </div>

          <div>
            <MarkdownEditor
              id="cgv_content"
              label="Conditions Générales de Vente (CGV)"
              value={formData.cgv_content}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, cgv_content: value }))
              }
              rows={6}
            />
          </div>

          <div>
            <FAQEditor value={faqs} onChange={setFaqs} />
          </div>

          <div className="flex justify-end items-center p-6 bg-gray-50 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="ml-3 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
            >
              {loading ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
