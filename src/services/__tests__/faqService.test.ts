import { describe, it, expect, vi, afterAll } from 'vitest';

vi.mock('../../lib/supabase', () => {
  const from = vi.fn((table: string) => {
    if (table === 'events') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1', name: 'Test Event' }, error: null }),
      } as any;
    }
    if (table === 'event_faqs') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [{ question: 'Q', answer: 'A', position: 1 }], error: null }),
      } as any;
    }
    return {} as any;
  });
  return {
    supabase: { from } as any,
    isSupabaseConfigured: () => true,
  };
});

afterAll(() => {
  vi.resetModules();
});

import { fetchEventFaq } from '../faqService';

describe('faqService', () => {
  it('fetchEventFaq returns event and faqs', async () => {
    const result = await fetchEventFaq('1');
    expect(result.event).toEqual({ id: '1', name: 'Test Event' });
    expect(result.faqs).toEqual([{ question: 'Q', answer: 'A', position: 1 }]);
  });
});
