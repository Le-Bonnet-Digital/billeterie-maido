import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import 'jest-axe/extend-expect';
import App from '../App';

describe('App Component', () => {
  it('should render without crashing', async () => {
    const { container } = render(<App />);

    // Should render navigation
    expect(screen.getAllByText(/Billetterie/i).length).toBeGreaterThan(0);

    // Ensure no accessibility violations
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
