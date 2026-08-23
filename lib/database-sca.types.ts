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
  sca: {
    Tables: {
      chef: {
        Row: {
          auth_user_id: string | null
          created_at: string
          id: number
          name: string
          team_name: string | null
          updated_at: string
          username: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          id?: number
          name: string
          team_name?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          id?: number
          name?: string
          team_name?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      competition: {
        Row: {
          city: string | null
          created_at: string
          elevation_ft: number | null
          event_date: string
          id: number
          name: string
          notes: string | null
          organizer: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          elevation_ft?: number | null
          event_date: string
          id?: number
          name: string
          notes?: string | null
          organizer?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          elevation_ft?: number | null
          event_date?: string
          id?: number
          name?: string
          notes?: string | null
          organizer?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cook: {
        Row: {
          chef_id: number
          competition_id: number | null
          cooked_at: string
          created_at: string
          id: number
          steak_label: string | null
          updated_at: string
        }
        Insert: {
          chef_id: number
          competition_id?: number | null
          cooked_at: string
          created_at?: string
          id?: number
          steak_label?: string | null
          updated_at?: string
        }
        Update: {
          chef_id?: number
          competition_id?: number | null
          cooked_at?: string
          created_at?: string
          id?: number
          steak_label?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cook_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "chef"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cook_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competition"
            referencedColumns: ["id"]
          },
        ]
      }
      cook_ai_review: {
        Row: {
          comments: string
          cook_id: number
          created_at: string
          id: number
          model: string | null
          prompt: string | null
          review_type: string | null
        }
        Insert: {
          comments: string
          cook_id: number
          created_at?: string
          id?: number
          model?: string | null
          prompt?: string | null
          review_type?: string | null
        }
        Update: {
          comments?: string
          cook_id?: number
          created_at?: string
          id?: number
          model?: string | null
          prompt?: string | null
          review_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cook_ai_review_cook_id_fkey"
            columns: ["cook_id"]
            isOneToOne: false
            referencedRelation: "cook"
            referencedColumns: ["id"]
          },
        ]
      }
      cook_detail: {
        Row: {
          back_side_interval_count: number | null
          cook_id: number
          cook_notes: string | null
          created_at: string
          grate_temp_f: number | null
          id: number
          meatrix_peak_percent: number | null
          meatrix_pull_percent: number | null
          peak_internal_temp_f: number | null
          prep_notes: string | null
          presentation_side_interval_count: number | null
          pull_internal_temp_f: number | null
          rest_duration_seconds: number | null
          seasoning: string | null
          starting_internal_temp_f: number | null
          steak_thickness_in: number | null
          trimmed_weight_oz: number | null
          turn_interval_seconds: number | null
          updated_at: string
        }
        Insert: {
          back_side_interval_count?: number | null
          cook_id: number
          cook_notes?: string | null
          created_at?: string
          grate_temp_f?: number | null
          id?: number
          meatrix_peak_percent?: number | null
          meatrix_pull_percent?: number | null
          peak_internal_temp_f?: number | null
          prep_notes?: string | null
          presentation_side_interval_count?: number | null
          pull_internal_temp_f?: number | null
          rest_duration_seconds?: number | null
          seasoning?: string | null
          starting_internal_temp_f?: number | null
          steak_thickness_in?: number | null
          trimmed_weight_oz?: number | null
          turn_interval_seconds?: number | null
          updated_at?: string
        }
        Update: {
          back_side_interval_count?: number | null
          cook_id?: number
          cook_notes?: string | null
          created_at?: string
          grate_temp_f?: number | null
          id?: number
          meatrix_peak_percent?: number | null
          meatrix_pull_percent?: number | null
          peak_internal_temp_f?: number | null
          prep_notes?: string | null
          presentation_side_interval_count?: number | null
          pull_internal_temp_f?: number | null
          rest_duration_seconds?: number | null
          seasoning?: string | null
          starting_internal_temp_f?: number | null
          steak_thickness_in?: number | null
          trimmed_weight_oz?: number | null
          turn_interval_seconds?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cook_detail_cook_id_fkey"
            columns: ["cook_id"]
            isOneToOne: true
            referencedRelation: "cook"
            referencedColumns: ["id"]
          },
        ]
      }
      cook_weather: {
        Row: {
          cook_id: number
          created_at: string
          id: number
          observed_at: string
          precipitation: string | null
          temperature_f: number | null
          wind_speed_mph: number | null
        }
        Insert: {
          cook_id: number
          created_at?: string
          id?: number
          observed_at: string
          precipitation?: string | null
          temperature_f?: number | null
          wind_speed_mph?: number | null
        }
        Update: {
          cook_id?: number
          created_at?: string
          id?: number
          observed_at?: string
          precipitation?: string | null
          temperature_f?: number | null
          wind_speed_mph?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cook_weather_cook_id_fkey"
            columns: ["cook_id"]
            isOneToOne: false
            referencedRelation: "cook"
            referencedColumns: ["id"]
          },
        ]
      }
      score: {
        Row: {
          appearance: number | null
          cook_id: number
          created_at: string
          doneness: number | null
          field_size: number | null
          first_place_score: number | null
          id: number
          overall_impression: number | null
          placement: number | null
          score_notes: string | null
          taste: number | null
          texture: number | null
          ticket_number: number | null
          total_score: number | null
          updated_at: string
        }
        Insert: {
          appearance?: number | null
          cook_id: number
          created_at?: string
          doneness?: number | null
          field_size?: number | null
          first_place_score?: number | null
          id?: number
          overall_impression?: number | null
          placement?: number | null
          score_notes?: string | null
          taste?: number | null
          texture?: number | null
          ticket_number?: number | null
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          appearance?: number | null
          cook_id?: number
          created_at?: string
          doneness?: number | null
          field_size?: number | null
          first_place_score?: number | null
          id?: number
          overall_impression?: number | null
          placement?: number | null
          score_notes?: string | null
          taste?: number | null
          texture?: number | null
          ticket_number?: number | null
          total_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_cook_id_fkey"
            columns: ["cook_id"]
            isOneToOne: true
            referencedRelation: "cook"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  sca: {
    Enums: {},
  },
} as const
