/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { fetchEventFaq } from '../faqService';

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

const client = { from } as any;

describe('faqService', () => {
  it('fetchEventFaq returns event and faqs', async () => {
    const result = await fetchEventFaq('1', client);
    expect(result.event).toEqual({ id: '1', name: 'Test Event' });
    expect(result.faqs).toEqual([{ question: 'Q', answer: 'A', position: 1 }]);
  });
});
