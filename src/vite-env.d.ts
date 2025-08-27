/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TEST_DELAY_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
