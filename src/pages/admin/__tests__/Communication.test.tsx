import { describe, it, expect, vi, afterAll } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../../../test/utils';
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
    await user.click(openButton);

    expect(
      await screen.findByRole('heading', { name: /modèles d'email/i })
    ).toBeInTheDocument();
  });
});