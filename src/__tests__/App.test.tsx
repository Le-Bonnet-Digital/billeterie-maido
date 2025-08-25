import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App Component', () => {
  it('should render without crashing', () => {
    render(
      <App />
    );

    // Should render the layout with header
    expect(screen.getByText('BilletEvent')).toBeInTheDocument();
  });
});
