export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      attribution_sources: {
        Row: {
          code: string
          created_at: string
          id: number
          is_active: boolean
          label: string
          requires_detail: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: number
          is_active?: boolean
          label: string
          requires_detail?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: number
          is_active?: boolean
          label?: string
          requires_detail?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      drop_pickup_options: {
        Row: {
          capacity_backyard_host: number
          capacity_brisket: number
          capacity_family_night: number
          capacity_freezer_filler: number
          capacity_pulled_pork: number
          capacity_sauce: number
          drop_id: string
          id: string
          location_label: string
          pickup_at: string
          pickup_date: string
          reserved_backyard_host: number
          reserved_brisket: number
          reserved_family_night: number
          reserved_freezer_filler: number
          reserved_pulled_pork: number
          reserved_sauce: number
        }
        Insert: {
          capacity_backyard_host?: number
          capacity_brisket?: number
          capacity_family_night?: number
          capacity_freezer_filler?: number
          capacity_pulled_pork?: number
          capacity_sauce?: number
          drop_id: string
          id?: string
          location_label: string
          pickup_at: string
          pickup_date: string
          reserved_backyard_host?: number
          reserved_brisket?: number
          reserved_family_night?: number
          reserved_freezer_filler?: number
          reserved_pulled_pork?: number
          reserved_sauce?: number
        }
        Update: {
          capacity_backyard_host?: number
          capacity_brisket?: number
          capacity_family_night?: number
          capacity_freezer_filler?: number
          capacity_pulled_pork?: number
          capacity_sauce?: number
          drop_id?: string
          id?: string
          location_label?: string
          pickup_at?: string
          pickup_date?: string
          reserved_backyard_host?: number
          reserved_brisket?: number
          reserved_family_night?: number
          reserved_freezer_filler?: number
          reserved_pulled_pork?: number
          reserved_sauce?: number
        }
        Relationships: [
          {
            foreignKeyName: "drop_pickup_options_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "drops"
            referencedColumns: ["id"]
          },
        ]
      }
      drops: {
        Row: {
          capacity_backyard_host: number
          capacity_brisket: number
          capacity_enforced: boolean
          capacity_family_night: number
          capacity_freezer_filler: number
          capacity_pulled_pork: number
          capacity_sauce: number
          created_at: string
          id: string
          order_cutoff_at: string | null
          reserved_backyard_host: number
          reserved_brisket: number
          reserved_family_night: number
          reserved_freezer_filler: number
          reserved_pulled_pork: number
          reserved_sauce: number
          status: string
          title: string
        }
        Insert: {
          capacity_backyard_host?: number
          capacity_brisket?: number
          capacity_enforced?: boolean
          capacity_family_night?: number
          capacity_freezer_filler?: number
          capacity_pulled_pork?: number
          capacity_sauce?: number
          created_at?: string
          id?: string
          order_cutoff_at?: string | null
          reserved_backyard_host?: number
          reserved_brisket?: number
          reserved_family_night?: number
          reserved_freezer_filler?: number
          reserved_pulled_pork?: number
          reserved_sauce?: number
          status?: string
          title: string
        }
        Update: {
          capacity_backyard_host?: number
          capacity_brisket?: number
          capacity_enforced?: boolean
          capacity_family_night?: number
          capacity_freezer_filler?: number
          capacity_pulled_pork?: number
          capacity_sauce?: number
          created_at?: string
          id?: string
          order_cutoff_at?: string | null
          reserved_backyard_host?: number
          reserved_brisket?: number
          reserved_family_night?: number
          reserved_freezer_filler?: number
          reserved_pulled_pork?: number
          reserved_sauce?: number
          status?: string
          title?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          recipient: string
          resend_id: string | null
          status: string
          template: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          recipient: string
          resend_id?: string | null
          status?: string
          template: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          recipient?: string
          resend_id?: string | null
          status?: string
          template?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      mailing_list: {
        Row: {
          created_at: string
          email: string
          id: string
          subscribed: boolean
          unsubscribe_token: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          subscribed?: boolean
          unsubscribe_token?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          subscribed?: boolean
          unsubscribe_token?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          cart_snapshot: Json
          created_at: string
          customer_email: string
          customer_name: string
          drop_id: string
          id: string
          pickup_option_id: string
          square_invoice_id: string | null
          square_order_id: string | null
        }
        Insert: {
          cart_snapshot: Json
          created_at?: string
          customer_email: string
          customer_name: string
          drop_id: string
          id?: string
          pickup_option_id: string
          square_invoice_id?: string | null
          square_order_id?: string | null
        }
        Update: {
          cart_snapshot?: Json
          created_at?: string
          customer_email?: string
          customer_name?: string
          drop_id?: string
          id?: string
          pickup_option_id?: string
          square_invoice_id?: string | null
          square_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_drop_id_fkey"
            columns: ["drop_id"]
            isOneToOne: false
            referencedRelation: "drops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_pickup_option_id_fkey"
            columns: ["pickup_option_id"]
            isOneToOne: false
            referencedRelation: "drop_pickup_options"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      place_preorder: {
        Args: {
          p_drop_id: string
          p_email: string
          p_full_name: string
          p_items: Json
          p_opt_in?: boolean
          p_phone?: string
          p_pickup_id: string
        }
        Returns: Json
      }
      release_pickup_slot: {
        Args: {
          p_drop_id: string
          p_pickup_option_id: string
          p_product_name: string
          p_quantity: number
        }
        Returns: Json
      }
      reserve_pickup_slot: {
        Args: {
          p_drop_id: string
          p_pickup_option_id: string
          p_product_name: string
          p_quantity: number
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
