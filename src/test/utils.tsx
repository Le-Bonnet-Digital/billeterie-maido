/* eslint-disable react-refresh/only-export-components */
import { render, RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode, ReactElement } from 'react';

// Custom render function with providers
const AllTheProviders = ({ children }: { children: ReactNode }) => {
  const futureConfig =
    import.meta.env.MODE === 'test'
      ? undefined
      : {
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        };

  return <MemoryRouter future={futureConfig}>{children}</MemoryRouter>;
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
