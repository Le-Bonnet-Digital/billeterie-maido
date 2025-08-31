/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import MarkdownRenderer from '../MarkdownRenderer';

describe('MarkdownRenderer', () => {
  it('renders headings, lists, and emphasis', () => {
    const markdown = '# Title\n\n- Item 1\n- Item 2\n\n**bold** *italic*';
    render(<MarkdownRenderer content={markdown} />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Title');

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);

    const bold = screen.getByText('bold');
    expect(bold.tagName).toBe('STRONG');

    const italic = screen.getByText('italic');
    expect(italic.tagName).toBe('EM');
  });

  it('neutralizes script injection', () => {
    const markdown = '# Hello\n\n<script>window.hacked = true;</script>';
    render(<MarkdownRenderer content={markdown} />);

    expect(document.querySelector('script')).toBeNull();
    expect((window as any).hacked).toBeUndefined();
  });

  it('renders fallback message when content is empty', () => {
    render(<MarkdownRenderer content="" />);
    expect(screen.getByText('Aucune information définie')).toBeInTheDocument();
  });
});
