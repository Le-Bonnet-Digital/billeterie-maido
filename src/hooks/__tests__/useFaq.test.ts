import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFaq } from '../useFaq';
import { fetchEventFaq } from '../../services/faqService';

vi.mock('../../services/faqService', () => ({
  fetchEventFaq: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useFaq', () => {
  it('fetches event and faqs successfully', async () => {
    (fetchEventFaq as Mock).mockResolvedValue({
      event: { id: '1', name: 'Event' },
      faqs: [{ question: 'Q', answer: 'A', position: 1 }],
    });

    const { result } = renderHook(() => useFaq('1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.event).toEqual({ id: '1', name: 'Event' });
    expect(result.current.faqs).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('handles service error', async () => {
    (fetchEventFaq as Mock).mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useFaq('1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.event).toBeNull();
    expect(result.current.faqs).toEqual([]);
  });
});

