import { supabase, isSupabaseConfigured, type DatabaseClient } from '../lib/supabase';

export interface Event {
  id: string;
  name: string;
}

export interface FAQItem {
  question: string;
  answer: string;
  position?: number;
}

/**
 * Récupère la FAQ et les informations d'un événement.
 * @param eventId Identifiant de l'événement
 * @param client Client Supabase optionnel
 * @returns L'événement et sa liste de FAQ
 */
export async function fetchEventFaq(
  eventId: string,
  client: DatabaseClient = supabase
): Promise<{ event: Event | null; faqs: FAQItem[] }> {
  if (!isSupabaseConfigured()) return { event: null, faqs: [] };
  const { data: eventData, error: eventError } = await client
    .from('events')
    .select('id, name')
    .eq('id', eventId)
    .eq('status', 'published')
    .single();
  if (eventError) throw eventError;

  const { data: faqData, error: faqError } = await client
    .from('event_faqs')
    .select('question, answer, position')
    .eq('event_id', eventId)
    .order('position');
  if (faqError) throw faqError;

  return { event: eventData, faqs: faqData || [] };
}
