/** Types partagés entre les différentes couches de l'application. */
export interface Event {
  id: string;
  name: string;
  event_date: string;
  key_info_content: string;
}

export interface Pass {
  id: string;
  name: string;
  price: number;
  description: string;
  initial_stock: number | null;
  remaining_stock?: number;
  pass_type?: 'moins_8' | 'plus_8' | 'luge_seule' | 'baby_poney';
  /** Optional field: number of guaranteed runs for certain passes */
  guaranteed_runs?: number;
  event_activities: EventActivity[];
}

export interface Activity {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface EventActivity {
  id: string;
  activity_id: string;
  stock_limit: number | null;
  requires_time_slot: boolean;
  remaining_stock?: number;
  activity: Activity;
}

export interface TimeSlot {
  id: string;
  event_activity_id: string;
  slot_time: string;
  capacity: number;
  remaining_capacity?: number;
  event_activity: EventActivity;
}

// Raw database row types
export interface PassRow {
  id: string;
  name: string;
  price: number;
  description: string;
  initial_stock: number | null;
}

export interface EventActivityRow {
  id: string;
  activity_id: string;
  stock_limit: number | null;
  requires_time_slot: boolean;
  activities: Activity;
}

export interface TimeSlotRow {
  id: string;
  event_activity_id: string;
  slot_time: string;
  capacity: number;
  event_activities: EventActivityRow;
}
