import { logger } from './logger';
import { supabase } from './supabase';
import { toast } from 'react-hot-toast';

const MAX_RETRIES = 3;
const BASE_DELAY = 500;

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

export async function apiCall<T>(
  operation: () => Promise<{ data: T; error: unknown }>,
  defaultValue: T,
  context: string
): Promise<T> {
  if (!isOnline()) {
    const message = 'Aucune connexion réseau';
    logger.error(message, { context });
    toast.error(message);
    return defaultValue;
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const { data, error } = await operation();
      if (error) throw error;
      return data ?? defaultValue;
    } catch (error) {
      logger.error('Supabase request failed', { context, error, attempt: attempt + 1 });
      if (attempt < MAX_RETRIES - 1 && isOnline()) {
        await wait(BASE_DELAY * 2 ** attempt);
        continue;
      }
      toast.error('Une erreur est survenue');
      return defaultValue;
    }
  }

  return defaultValue;
}

export const apiClient = {
  from: <T extends string>(table: T) => supabase.from(table),
  call: apiCall,
};

export type { SupabaseClient } from '@supabase/supabase-js';
