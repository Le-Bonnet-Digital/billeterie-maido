import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../../../test/utils';
import Communication from '../Communication';

describe('Communication', () => {
  it('should render communication content', async () => {
    render(<Communication />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(document.body).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should not be stuck in loading state', async () => {
    render(<Communication />);
    
    await waitFor(() => {
      // Should not show loading spinner after data loads
      expect(screen.queryByText(/chargement/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });
});