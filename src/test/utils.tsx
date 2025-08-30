/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const futureConfig =
    import.meta.env.MODE === 'test'
      ? undefined
      : {
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        };

  return (
    <MemoryRouter future={futureConfig}>
      {children}
    </MemoryRouter>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
