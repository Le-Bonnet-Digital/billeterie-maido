import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { render, screen, waitFor } from '../../../test/utils';
import { act } from '@testing-library/react';
import MarkdownEditor from '../MarkdownEditor';

function Wrapper() {
  const [value, setValue] = React.useState('');
  return (
    <MarkdownEditor
      label="Description"
      value={value}
      onChange={setValue}
      id="desc"
    />
  );
}

describe('MarkdownEditor', () => {
  it('updates text and renders markdown preview', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<Wrapper />);
    });
    const textarea = screen.getByLabelText('Description');
    await act(async () => {
      await user.type(textarea, '# Hello');
    });
    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Hello');
  });

  it('shows error when content is empty', async () => {
    const user = userEvent.setup();
    await act(async () => {
      render(<Wrapper />);
    });
    const textarea = screen.getByLabelText('Description');
    await act(async () => {
      await user.type(textarea, 'test');
      await user.clear(textarea);
    });
    await waitFor(() =>
      expect(
        screen.getByText(/le contenu ne peut pas être vide/i),
      ).toBeInTheDocument(),
    );
  });
});
