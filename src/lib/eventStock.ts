import { supabase, type DatabaseClient } from './supabase';

export interface PassWithStock {
  id: string;
  name: string;
  price: number;
  description: string;
  initial_stock: number | null;
  remaining_stock: number;
}

export interface ActivityDetails {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface EventActivityWithStock {
  id: string;
  activity_id: string;
  stock_limit: number | null;
  requires_time_slot: boolean;
  remaining_stock: number;
  activity: ActivityDetails;
}

export interface EventStockResult {
  passes: PassWithStock[];
  eventActivities: EventActivityWithStock[];
}

/**
 * Récupère les passes et activités d'un événement avec leurs stocks restants
 * via une seule fonction RPC.
 * @param eventId Identifiant de l'événement
 * @param client Client Supabase optionnel
 * @returns Les passes et activités avec leurs stocks
 */
export const fetchEventStock = async (
  eventId: string,
  client: DatabaseClient = supabase
): Promise<EventStockResult> => {
  const { data, error } = await client.rpc('get_event_passes_activities_stock', {
    event_uuid: eventId,
  });

  if (error) {
    throw error;
  }

  return {
    passes: (data?.passes || []) as PassWithStock[],
    eventActivities: (data?.event_activities || []) as EventActivityWithStock[],
  };
};
