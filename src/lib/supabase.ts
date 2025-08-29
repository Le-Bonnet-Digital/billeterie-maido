import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { debugLog } from './logger';

const env =
  typeof process !== 'undefined' && process.env
    ? (process.env as Record<string, string | undefined>)
    : (import.meta.env as Record<string, string | undefined>);
// We rely on the official Supabase client type to ensure
// query builder methods are correctly typed across the app.
// When env is not configured, we still export a value cast to this type
// to keep call sites type-safe and avoid `unknown` chaining.
export type DatabaseClient = SupabaseClient;

/**
 * Vérifie que les variables d'environnement Supabase sont définies.
 * @returns `true` si la configuration est valide
 */
export const isSupabaseConfigured = (): boolean => {
  const url = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;
  return !!url && !!anonKey && url.includes('.supabase.co');
};

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

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
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : ({} as unknown as DatabaseClient);

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
          event_id: string | null;
          name: string;
          price: number;
          description: string;
          initial_stock: number | null;
          is_park?: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id?: string | null;
          name: string;
          price: number;
          description?: string;
          initial_stock?: number | null;
          is_park?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string | null;
          name?: string;
          price?: number;
          description?: string;
          initial_stock?: number | null;
          is_park?: boolean;
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
          pass_id: string | null;
          time_slot_id: string | null;
          quantity: number;
          reserved_until: string;
          attendee_first_name: string | null;
          attendee_last_name: string | null;
          attendee_birth_year: number | null;
          access_conditions_ack: boolean | null;
          product_type: 'event_pass' | 'activity_variant' | null;
          product_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          pass_id?: string | null;
          time_slot_id?: string | null;
          quantity?: number;
          reserved_until?: string;
          attendee_first_name?: string | null;
          attendee_last_name?: string | null;
          attendee_birth_year?: number | null;
          access_conditions_ack?: boolean | null;
          product_type?: 'event_pass' | 'activity_variant' | null;
          product_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          pass_id?: string | null;
          time_slot_id?: string | null;
          quantity?: number;
          reserved_until?: string;
          attendee_first_name?: string | null;
          attendee_last_name?: string | null;
          attendee_birth_year?: number | null;
          access_conditions_ack?: boolean | null;
          product_type?: 'event_pass' | 'activity_variant' | null;
          product_id?: string | null;
        };
      };
      park_time_slots: {
        Row: {
          id: string;
          activity_id: string;
          slot_time: string;
          capacity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          activity_id: string;
          slot_time: string;
          capacity?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          activity_id?: string;
          slot_time?: string;
          capacity?: number;
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
      activity_variants: {
        Row: {
          id: string;
          activity_id: string;
          name: string;
          price: number;
          is_active: boolean;
          sort_order: number;
          variant_stock: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          activity_id: string;
          name: string;
          price: number;
          is_active?: boolean;
          sort_order?: number;
          variant_stock?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          activity_id?: string;
          name?: string;
          price?: number;
          is_active?: boolean;
          sort_order?: number;
          variant_stock?: number | null;
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
      get_activity_variant_remaining_stock: {
        Args: { variant_uuid: string };
        Returns: number;
      };
      get_parc_activities_with_variants: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          name: string;
          description: string;
          parc_description?: string | null;
          icon: string;
          category: string;
          requires_time_slot: boolean;
          variants: {
            id: string;
            name: string;
            price: number;
            sort_order: number;
            remaining_stock: number;
            image_url?: string | null;
          }[];
          image_url?: string | null;
        }[];
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
