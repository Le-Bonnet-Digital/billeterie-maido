import { render, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ValidationHistory from '../ValidationHistory';
import * as historyLib from '../../../lib/history';

describe('ValidationHistory page', () => {
  it('loads with default 7 day filter', async () => {
    const spy = vi
      .spyOn(historyLib, 'fetchValidationHistory')
      .mockResolvedValue([]);
    render(<ValidationHistory />);
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const args = spy.mock.calls[0][0];
    const start = new Date();
    start.setDate(start.getDate() - 7);
    expect(new Date(args.startDate).toDateString()).toBe(start.toDateString());
  });
});
