import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/utils';
import EventCard from '../EventCard';

const mockEvent = {
  id: 'test-event-id',
  name: 'Test Event',
  event_date: '2024-12-25',
  sales_opening_date: '2024-01-01T00:00:00Z',
  sales_closing_date: '2024-12-24T23:59:59Z',
  key_info_content: 'Test event information'
};

describe('EventCard Component', () => {
  it('should render event information correctly', () => {
    render(<EventCard event={mockEvent} />);

    expect(screen.getByText('Test Event')).toBeInTheDocument();
    expect(screen.getByText('Test event information')).toBeInTheDocument();
  });

  it('renders markdown content without raw syntax', () => {
    const markdownEvent = {
      ...mockEvent,
      key_info_content: '**Information** importante'
    };

    render(<EventCard event={markdownEvent} />);
    expect(screen.getByText('Information', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.queryByText('**Information** importante')).toBeNull();
  });

  it('should render action buttons', () => {
    render(<EventCard event={mockEvent} />);
    
    expect(screen.getByText('Voir les Billets')).toBeInTheDocument();
    expect(screen.getByText('FAQ')).toBeInTheDocument();
    expect(screen.getByText('CGV')).toBeInTheDocument();
  });

  it('should show "En vente" status when sales are active', () => {
    const futureEvent = {
      ...mockEvent,
      sales_closing_date: '2025-12-31T23:59:59Z'
    };
    
    render(<EventCard event={futureEvent} />);
    expect(screen.getByText('En vente')).toBeInTheDocument();
  });
});