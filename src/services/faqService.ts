import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface Event {
  id: string;
  name: string;
}

export interface FAQItem {
  question: string;
  answer: string;
  position?: number;
}

export async function fetchEventFaq(eventId: string): Promise<{ event: Event | null; faqs: FAQItem[] }> {
  if (!isSupabaseConfigured()) return { event: null, faqs: [] };
  const { data: eventData, error: eventError } = await supabase
    .from('events')
    .select('id, name')
    .eq('id', eventId)
    .eq('status', 'published')
    .single();
  if (eventError) throw eventError;

  const { data: faqData, error: faqError } = await supabase
    .from('event_faqs')
    .select('question, answer, position')
    .eq('event_id', eventId)
    .order('position');
  if (faqError) throw faqError;

  return { event: eventData, faqs: faqData || [] };
}
