import { useState, useEffect } from 'react';
import { fetchEventFaq, Event, FAQItem } from '../services/faqService';

export function useFaq(eventId?: string) {
  const [event, setEvent] = useState<Event | null>(null);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    fetchEventFaq(eventId)
      .then(({ event, faqs }) => {
        setEvent(event);
        setFaqs(faqs);
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  return { event, faqs, loading };
}
