import { describe, it, expect, vi } from 'vitest';
import { fetchEventFaq } from '../faqService';
import type { DatabaseClient } from '../../lib/supabase';

const from = vi.fn((table: string): Record<string, unknown> => {
  if (table === 'events') {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: '1', name: 'Test Event' }, error: null }),
    };
  }
  if (table === 'event_faqs') {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [{ question: 'Q', answer: 'A', position: 1 }], error: null }),
    };
  }
  return {};
});

const client = { from } as unknown as DatabaseClient;

describe('faqService', () => {
  it('fetchEventFaq returns event and faqs', async () => {
    const result = await fetchEventFaq('1', client);
    expect(result.event).toEqual({ id: '1', name: 'Test Event' });
    expect(result.faqs).toEqual([{ question: 'Q', answer: 'A', position: 1 }]);
  });
});
