import { logger } from './logger';
import { supabase } from './supabase';
import { toast } from 'react-hot-toast';

const MAX_RETRIES = 3;
const BASE_DELAY = 500;

/**
 * Attend pendant le nombre de millisecondes indiqué.
 * @param ms Durée d'attente en millisecondes
 * @returns Une promesse résolue après l'attente
 */
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Indique si le navigateur est connecté à Internet.
 * @returns `true` si une connexion est disponible, sinon `false`
 */
function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

/**
 * Exécute une opération Supabase avec une logique de retry et de gestion d'erreurs.
 * Affiche un toast en cas d'échec et consigne l'erreur dans le logger.
 * @param operation Fonction effectuant l'appel Supabase
 * @param defaultValue Valeur retournée en cas d'échec
 * @param context Contexte pour les logs
 * @returns Les données retournées par Supabase ou `defaultValue`
 */
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

/**
 * Client utilitaire pour centraliser les appels Supabase.
 */
export const apiClient = {
  from: <T extends string>(table: T) => supabase.from(table),
  call: apiCall,
};

export type { SupabaseClient } from '@supabase/supabase-js';
