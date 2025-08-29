import { describe, it, expect, vi, afterAll } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, act, waitFor } from '../../../test/utils';
import Communication from '../Communication';

vi.stubEnv('VITE_TEST_DELAY_MS', '0');
afterAll(() => {
  vi.unstubAllEnvs();
});

describe('Communication', () => {
  it('opens template modal from header button', async () => {
    const user = userEvent.setup();
    render(<Communication />);

    const openButton = await screen.findByRole('button', { name: /modèles/i });
    await act(async () => {
      await user.click(openButton);
    });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /modèles d'email/i })
      ).toBeInTheDocument();
    });
  });
});