import { supabase } from './supabase';

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
 * Fetch all passes and activities for an event with their remaining stock
 * in a single RPC call.
 */
export const fetchEventStock = async (eventId: string): Promise<EventStockResult> => {
  const { data, error } = await supabase.rpc('get_event_passes_activities_stock', {
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
