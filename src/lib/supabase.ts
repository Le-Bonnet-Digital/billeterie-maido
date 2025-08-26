import { createClient } from '@supabase/supabase-js';
import { debugLog } from './logger';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface DatabaseClient {
  from: (table: string) => unknown;
  rpc: (fn: string, params?: unknown) => Promise<unknown>;
}

/**
 * Vérifie que les variables d'environnement Supabase sont définies.
 * @returns `true` si la configuration est valide
 */
export const isSupabaseConfigured = (): boolean => {
  return !!supabaseUrl && !!supabaseAnonKey && supabaseUrl.includes('.supabase.co');
};

/**
 * Lance une erreur si la configuration Supabase est absente.
 * @throws {Error} Si les variables nécessaires ne sont pas définies
 */
export const ensureSupabaseConfigured = (): void => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase configuration is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }
};

// Warn during module initialization if configuration is missing
if (!isSupabaseConfigured()) {
  const message = 'Supabase configuration is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';
  debugLog(message);
  console.warn(message);
}

export const supabase: DatabaseClient = isSupabaseConfigured()
  ? (createClient(supabaseUrl, supabaseAnonKey) as unknown as DatabaseClient)
  : ({} as DatabaseClient);

export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          name: string;
          event_date: string;
          sales_opening_date: string;
          sales_closing_date: string;
          status: 'draft' | 'published' | 'finished' | 'cancelled';
          cgv_content: string;
          key_info_content: string;
          has_animations: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          event_date: string;
          sales_opening_date: string;
          sales_closing_date: string;
          status?: 'draft' | 'published' | 'finished' | 'cancelled';
          cgv_content?: string;
          key_info_content?: string;
          has_animations?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          event_date?: string;
          sales_opening_date?: string;
          sales_closing_date?: string;
          status?: 'draft' | 'published' | 'finished' | 'cancelled';
          cgv_content?: string;
          key_info_content?: string;
          has_animations?: boolean;
          updated_at?: string;
        };
      };
      event_faqs: {
        Row: {
          id: string;
          event_id: string;
          question: string;
          answer: string;
          position: number;
        };
        Insert: {
          id?: string;
          event_id: string;
          question: string;
          answer: string;
          position: number;
        };
        Update: {
          id?: string;
          event_id?: string;
          question?: string;
          answer?: string;
          position?: number;
        };
      };
      passes: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          price: number;
          description: string;
          initial_stock: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          price: number;
          description?: string;
          initial_stock?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          name?: string;
          price?: number;
          description?: string;
          initial_stock?: number | null;
        };
      };
      time_slots: {
        Row: {
          id: string;
          pass_id: string;
          slot_time: string;
          capacity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          pass_id: string;
          slot_time: string;
          capacity?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          pass_id?: string;
          slot_time?: string;
          capacity?: number;
        };
      };
      reservations: {
        Row: {
          id: string;
          reservation_number: string;
          client_email: string;
          pass_id: string;
          time_slot_id: string | null;
          payment_status: 'paid' | 'pending' | 'refunded';
          created_at: string;
        };
        Insert: {
          id?: string;
          reservation_number?: string;
          client_email: string;
          pass_id: string;
          time_slot_id?: string | null;
          payment_status?: 'paid' | 'pending' | 'refunded';
          created_at?: string;
        };
        Update: {
          id?: string;
          reservation_number?: string;
          client_email?: string;
          pass_id?: string;
          time_slot_id?: string | null;
          payment_status?: 'paid' | 'pending' | 'refunded';
        };
      };
      cart_items: {
        Row: {
          id: string;
          session_id: string;
          pass_id: string;
          time_slot_id: string | null;
          quantity: number;
          reserved_until: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          pass_id: string;
          time_slot_id?: string | null;
          quantity?: number;
          reserved_until?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          pass_id?: string;
          time_slot_id?: string | null;
          quantity?: number;
          reserved_until?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          role: 'admin' | 'pony_provider' | 'archery_provider' | 'client';
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: 'admin' | 'pony_provider' | 'archery_provider' | 'client';
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: 'admin' | 'pony_provider' | 'archery_provider' | 'client';
        };
      };
    };
    Functions: {
      get_pass_remaining_stock: {
        Args: { pass_uuid: string };
        Returns: number;
      };
      get_slot_remaining_capacity: {
        Args: { slot_uuid: string };
        Returns: number;
      };
      cleanup_expired_cart_items: {
        Args: Record<PropertyKey, never>;
        Returns: void;
      };
      get_event_activity_remaining_stock: {
        Args: { event_activity_id_param: string };
        Returns: number;
      };
      get_pass_max_stock_from_activities: {
        Args: { pass_uuid: string };
        Returns: number;
      };
      get_pass_effective_remaining_stock: {
        Args: { pass_uuid: string };
        Returns: number;
      };
      can_reserve_pass: {
        Args: { pass_uuid: string; quantity_requested: number };
        Returns: boolean;
      };
      get_event_passes_activities_stock: {
        Args: { event_uuid: string };
        Returns: {
          passes: {
            id: string;
            name: string;
            price: number;
            description: string;
            initial_stock: number | null;
            remaining_stock: number;
          }[];
          event_activities: {
            id: string;
            activity_id: string;
            stock_limit: number | null;
            requires_time_slot: boolean;
            remaining_stock: number;
            activity: {
              id: string;
              name: string;
              description: string;
              icon: string;
            };
          }[];
        };
      };
    };
  };
};

export interface FAQItem {
  question: string;
  answer: string;
}

export type Event = Database['public']['Tables']['events']['Row'] & {
  faqs: FAQItem[];
};