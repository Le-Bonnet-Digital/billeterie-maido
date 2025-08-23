import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return !!supabaseUrl &&
         !!supabaseAnonKey &&
         supabaseUrl.includes('.supabase.co');
};

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : ({} as any);

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
          faq_content: string;
          key_info_content: string;
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
          faq_content?: string;
          key_info_content?: string;
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
          faq_content?: string;
          key_info_content?: string;
          updated_at?: string;
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
          event_id: string;
          activity: 'poney' | 'tir_arc';
          slot_time: string;
          capacity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          activity: 'poney' | 'tir_arc';
          slot_time: string;
          capacity?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          activity?: 'poney' | 'tir_arc';
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
    };
  };
};