import '@testing-library/jest-dom';
import { vi, expect } from 'vitest';
import React from 'react';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

// Mock only specific URL methods for file download tests
if (!('createObjectURL' in window.URL)) {
  Object.defineProperty(window.URL, 'createObjectURL', {
    value: vi.fn(() => 'mock-url'),
    writable: true,
    configurable: true,
  });
} else {
  vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('mock-url');
}

if (!('revokeObjectURL' in window.URL)) {
  Object.defineProperty(window.URL, 'revokeObjectURL', {
    value: vi.fn(),
    writable: true,
    configurable: true,
  });
} else {
  vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});
}

// Mock BroadcastChannel for Supabase auth
Object.defineProperty(window, 'BroadcastChannel', {
  value: vi.fn(() => ({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    postMessage: vi.fn(),
    close: vi.fn(),
  })),
});

// Mock Supabase with proper method chaining
interface MockBuilder {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  gte: ReturnType<typeof vi.fn>;
  lte: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  then: ReturnType<typeof vi.fn>;
}

const createMockQueryBuilder = (): MockBuilder => {
  const mockBuilder: MockBuilder = {
    select: vi.fn(() => mockBuilder),
    eq: vi.fn(() => mockBuilder),
    gte: vi.fn(() => mockBuilder),
    lte: vi.fn(() => mockBuilder),
    limit: vi.fn(() => mockBuilder),
    order: vi.fn(() => mockBuilder),
    single: vi.fn(() =>
      Promise.resolve({ data: { id: '1', name: 'Test Event' }, error: null }),
    ),
    delete: vi.fn(() => mockBuilder),
    insert: vi.fn(() => mockBuilder),
    update: vi.fn(() => mockBuilder),
    then: vi.fn((callback?: (arg: { data: unknown[]; error: null }) => unknown) => {
      if (callback) {
        return callback({ data: [], error: null });
      }
      return Promise.resolve({ data: [], error: null });
    }),
  };

  return mockBuilder;
};

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => createMockQueryBuilder()),
    rpc: vi.fn(() => Promise.resolve({ data: 10, error: null })),
    select: vi.fn(() => ({
      count: vi.fn(() => Promise.resolve({ count: 0, error: null }))
    })),
    auth: {
      signUp: vi.fn(() => Promise.resolve({ data: null, error: null })),
      signIn: vi.fn(() => Promise.resolve({ data: null, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    },
  },
  isSupabaseConfigured: vi.fn(() => true),
}));

// Mock React Router with proper BrowserRouter
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ eventId: 'test-event-id' }),
    useLocation: () => ({ pathname: '/' }),
    Link: ({ children, to, ...props }: { children: React.ReactNode; to: string; [key: string]: unknown }) =>
      React.createElement('a', { href: to, ...props }, children),
    Outlet: () => React.createElement('div', null, 'Outlet'),
  };
});

// Mock React Hot Toast
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
  Toaster: () => React.createElement('div', null, 'Toaster'),
}));

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-123',
  },
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock, configurable: true });

// Mock HTMLAnchorElement.click for download tests
Object.defineProperty(HTMLAnchorElement.prototype, 'click', {
  value: vi.fn(),
});

// Mock ResizeObserver for components relying on it (e.g., Recharts)
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, 'ResizeObserver', { value: ResizeObserver, configurable: true });
