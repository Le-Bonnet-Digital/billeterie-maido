import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import App from '../App';

describe('App Component', () => {
  it('should render without crashing', async () => {
    const { container } = render(<App />);

    // Should render the layout with header
    expect(screen.getByText('BilletEvent')).toBeInTheDocument();

    // Ensure no accessibility violations
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
