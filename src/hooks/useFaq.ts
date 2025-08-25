import { useState, useEffect } from 'react';
import { fetchEventFaq, Event, FAQItem } from '../services/faqService';

export function useFaq(eventId?: string) {
  const [event, setEvent] = useState<Event | null>(null);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    setError(null);

    const loadFaq = async () => {
      try {
        const { event, faqs } = await fetchEventFaq(eventId);
        setEvent(event);
        setFaqs(faqs);
      } catch (err) {
        setError(err as Error);
        setEvent(null);
        setFaqs([]);
      } finally {
        setLoading(false);
      }
    };

    loadFaq();
  }, [eventId]);

  return { event, faqs, loading, error };
}
