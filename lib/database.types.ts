// AUTO-GENERATED — DO NOT EDIT BY HAND
// This file is a placeholder. Run `npx supabase gen types typescript --project-id "$PROJECT_REF" > lib/database.types.ts` to regenerate.
// See: .planning/phases/01-foundation/01-RESEARCH.md Pattern 5

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      drops: {
        Row: {
          id: string;
          created_at: string;
          title: string;
          status: string;
          capacity_pulled_pork: number;
          capacity_brisket: number;
          reserved_pulled_pork: number;
          reserved_brisket: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          title: string;
          status?: string;
          capacity_pulled_pork?: number;
          capacity_brisket?: number;
          reserved_pulled_pork?: number;
          reserved_brisket?: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          title?: string;
          status?: string;
          capacity_pulled_pork?: number;
          capacity_brisket?: number;
          reserved_pulled_pork?: number;
          reserved_brisket?: number;
        };
      };
      drop_pickup_options: {
        Row: {
          id: string;
          drop_id: string;
          location_label: string;
          pickup_date: string;
          pickup_at: string;
          capacity_pulled_pork: number;
          capacity_brisket: number;
          reserved_pulled_pork: number;
          reserved_brisket: number;
        };
        Insert: {
          id?: string;
          drop_id: string;
          location_label: string;
          pickup_date: string;
          pickup_at: string;
          capacity_pulled_pork?: number;
          capacity_brisket?: number;
          reserved_pulled_pork?: number;
          reserved_brisket?: number;
        };
        Update: {
          id?: string;
          drop_id?: string;
          location_label?: string;
          pickup_date?: string;
          pickup_at?: string;
          capacity_pulled_pork?: number;
          capacity_brisket?: number;
          reserved_pulled_pork?: number;
          reserved_brisket?: number;
        };
      };
      orders: {
        Row: {
          id: string;
          created_at: string;
          drop_id: string;
          pickup_option_id: string;
          customer_email: string;
          customer_name: string;
          cart_snapshot: Json;
          square_order_id: string | null;
          square_invoice_id: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          drop_id: string;
          pickup_option_id: string;
          customer_email: string;
          customer_name: string;
          cart_snapshot: Json;
          square_order_id?: string | null;
          square_invoice_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          drop_id?: string;
          pickup_option_id?: string;
          customer_email?: string;
          customer_name?: string;
          cart_snapshot?: Json;
          square_order_id?: string | null;
          square_invoice_id?: string | null;
        };
      };
      mailing_list: {
        Row: {
          id: string;
          created_at: string;
          email: string;
          subscribed: boolean;
          unsubscribe_token: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          email: string;
          subscribed?: boolean;
          unsubscribe_token?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          email?: string;
          subscribed?: boolean;
          unsubscribe_token?: string;
        };
      };
      email_logs: {
        Row: {
          id: string;
          created_at: string;
          recipient: string;
          template: string;
          status: string;
          resend_id: string | null;
          order_id: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          recipient: string;
          template: string;
          status?: string;
          resend_id?: string | null;
          order_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          recipient?: string;
          template?: string;
          status?: string;
          resend_id?: string | null;
          order_id?: string | null;
        };
      };
    };
    Functions: {
      reserve_pickup_slot: {
        Args: {
          p_drop_id: string;
          p_pickup_option_id: string;
          p_product_name: string;
          p_quantity: number;
        };
        Returns: Json;
      };
      release_pickup_slot: {
        Args: {
          p_drop_id: string;
          p_pickup_option_id: string;
          p_product_name: string;
          p_quantity: number;
        };
        Returns: Json;
      };
    };
    Views: Record<string, never>;
    Enums: Record<string, never>;
  };
}
