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
      dish_profiles: {
        Row: {
          analysis_period_end: string | null
          analysis_period_start: string | null
          cannibalization_score: number | null
          classification: string
          competing_dishes: Json | null
          computed_at: string | null
          created_at: string
          demand_pattern: Json | null
          demand_spike_frequency: number | null
          demand_trend: string | null
          id: string
          menu_item_id: string
          peak_hour_concentration: number | null
          prep_time_volatility: number | null
          profit_contribution: number | null
          restaurant_id: string
          risk_flags: Json | null
          stress_score: number | null
          true_margin: number | null
          updated_at: string
          volume_pressure: number | null
          weekly_orders: number | null
          weekly_profit: number | null
          weekly_revenue: number | null
        }
        Insert: {
          analysis_period_end?: string | null
          analysis_period_start?: string | null
          cannibalization_score?: number | null
          classification?: string
          competing_dishes?: Json | null
          computed_at?: string | null
          created_at?: string
          demand_pattern?: Json | null
          demand_spike_frequency?: number | null
          demand_trend?: string | null
          id?: string
          menu_item_id: string
          peak_hour_concentration?: number | null
          prep_time_volatility?: number | null
          profit_contribution?: number | null
          restaurant_id: string
          risk_flags?: Json | null
          stress_score?: number | null
          true_margin?: number | null
          updated_at?: string
          volume_pressure?: number | null
          weekly_orders?: number | null
          weekly_profit?: number | null
          weekly_revenue?: number | null
        }
        Update: {
          analysis_period_end?: string | null
          analysis_period_start?: string | null
          cannibalization_score?: number | null
          classification?: string
          competing_dishes?: Json | null
          computed_at?: string | null
          created_at?: string
          demand_pattern?: Json | null
          demand_spike_frequency?: number | null
          demand_trend?: string | null
          id?: string
          menu_item_id?: string
          peak_hour_concentration?: number | null
          prep_time_volatility?: number | null
          profit_contribution?: number | null
          restaurant_id?: string
          risk_flags?: Json | null
          stress_score?: number | null
          true_margin?: number | null
          updated_at?: string
          volume_pressure?: number | null
          weekly_orders?: number | null
          weekly_profit?: number | null
          weekly_revenue?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dish_profiles_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: true
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_profiles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      ingestion_logs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          records_imported: number | null
          records_skipped: number | null
          records_total: number | null
          restaurant_id: string
          source: string
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          records_imported?: number | null
          records_skipped?: number | null
          records_total?: number | null
          restaurant_id: string
          source: string
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          records_imported?: number | null
          records_skipped?: number | null
          records_total?: number | null
          restaurant_id?: string
          source?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_logs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_data: {
        Row: {
          category: string | null
          cost: number | null
          created_at: string | null
          id: string
          name: string | null
          price: number | null
          quantity: number | null
          sales: number | null
          updated_at: string | null
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          cost?: number | null
          created_at?: string | null
          id?: string
          name?: string | null
          price?: number | null
          quantity?: number | null
          sales?: number | null
          updated_at?: string | null
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          cost?: number | null
          created_at?: string | null
          id?: string
          name?: string | null
          price?: number | null
          quantity?: number | null
          sales?: number | null
          updated_at?: string | null
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_data_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_intelligence_snapshots: {
        Row: {
          avg_margin: number
          avg_stress: number
          category_performance: Json
          classification_breakdown: Json
          computed_at: string
          created_at: string
          health_delta: number
          health_score: number
          hidden_loss_makers: Json
          highest_stress_contributors: Json
          id: string
          low_impact_items: Json
          restaurant_id: string
          risk_summary: Json
          top_profit_contributors: Json
          total_dishes: number
          total_profit: number
          total_revenue: number
          week_end: string
          week_start: string
        }
        Insert: {
          avg_margin?: number
          avg_stress?: number
          category_performance?: Json
          classification_breakdown?: Json
          computed_at?: string
          created_at?: string
          health_delta?: number
          health_score?: number
          hidden_loss_makers?: Json
          highest_stress_contributors?: Json
          id?: string
          low_impact_items?: Json
          restaurant_id: string
          risk_summary?: Json
          top_profit_contributors?: Json
          total_dishes?: number
          total_profit?: number
          total_revenue?: number
          week_end: string
          week_start: string
        }
        Update: {
          avg_margin?: number
          avg_stress?: number
          category_performance?: Json
          classification_breakdown?: Json
          computed_at?: string
          created_at?: string
          health_delta?: number
          health_score?: number
          hidden_loss_makers?: Json
          highest_stress_contributors?: Json
          id?: string
          low_impact_items?: Json
          restaurant_id?: string
          risk_summary?: Json
          top_profit_contributors?: Json
          total_dishes?: number
          total_profit?: number
          total_revenue?: number
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_intelligence_snapshots_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category: string
          complexity: string
          created_at: string
          external_pos_id: string | null
          food_cost: number
          id: string
          is_active: boolean
          is_combo: boolean
          name: string
          prep_time_minutes: number
          restaurant_id: string
          selling_price: number
          station: string
          updated_at: string
        }
        Insert: {
          category?: string
          complexity?: string
          created_at?: string
          external_pos_id?: string | null
          food_cost?: number
          id?: string
          is_active?: boolean
          is_combo?: boolean
          name: string
          prep_time_minutes?: number
          restaurant_id: string
          selling_price?: number
          station?: string
          updated_at?: string
        }
        Update: {
          category?: string
          complexity?: string
          created_at?: string
          external_pos_id?: string | null
          food_cost?: number
          id?: string
          is_active?: boolean
          is_combo?: boolean
          name?: string
          prep_time_minutes?: number
          restaurant_id?: string
          selling_price?: number
          station?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          restaurant_id: string | null
          restaurant_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          restaurant_id?: string | null
          restaurant_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          restaurant_id?: string | null
          restaurant_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_feedback: {
        Row: {
          created_at: string
          decided_at: string
          decision: string
          id: string
          implemented_at: string | null
          recommendation_id: string
          restaurant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string
          decision: string
          id?: string
          implemented_at?: string | null
          recommendation_id: string
          restaurant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string
          decision?: string
          id?: string
          implemented_at?: string | null
          recommendation_id?: string
          restaurant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_feedback_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_outcomes: {
        Row: {
          action_at: string
          action_taken: string
          actual_profit_impact: number | null
          actual_revenue_impact: number | null
          actual_stress_impact: number | null
          baseline_profit: number
          baseline_revenue: number
          baseline_stress: number
          created_at: string
          effectiveness_score: number | null
          id: string
          measured_at: string | null
          measured_profit: number | null
          measured_revenue: number | null
          measured_stress: number | null
          menu_item_id: string
          observation_weeks: number
          prediction_accuracy_profit: number | null
          prediction_accuracy_revenue: number | null
          prediction_accuracy_stress: number | null
          profit_delta: number | null
          recommendation_id: string
          recommendation_type: string
          restaurant_id: string
          revenue_delta: number | null
          stress_delta: number | null
          updated_at: string
        }
        Insert: {
          action_at?: string
          action_taken: string
          actual_profit_impact?: number | null
          actual_revenue_impact?: number | null
          actual_stress_impact?: number | null
          baseline_profit?: number
          baseline_revenue?: number
          baseline_stress?: number
          created_at?: string
          effectiveness_score?: number | null
          id?: string
          measured_at?: string | null
          measured_profit?: number | null
          measured_revenue?: number | null
          measured_stress?: number | null
          menu_item_id: string
          observation_weeks?: number
          prediction_accuracy_profit?: number | null
          prediction_accuracy_revenue?: number | null
          prediction_accuracy_stress?: number | null
          profit_delta?: number | null
          recommendation_id: string
          recommendation_type: string
          restaurant_id: string
          revenue_delta?: number | null
          stress_delta?: number | null
          updated_at?: string
        }
        Update: {
          action_at?: string
          action_taken?: string
          actual_profit_impact?: number | null
          actual_revenue_impact?: number | null
          actual_stress_impact?: number | null
          baseline_profit?: number
          baseline_revenue?: number
          baseline_stress?: number
          created_at?: string
          effectiveness_score?: number | null
          id?: string
          measured_at?: string | null
          measured_profit?: number | null
          measured_revenue?: number | null
          measured_stress?: number | null
          menu_item_id?: string
          observation_weeks?: number
          prediction_accuracy_profit?: number | null
          prediction_accuracy_revenue?: number | null
          prediction_accuracy_stress?: number | null
          profit_delta?: number | null
          recommendation_id?: string
          recommendation_type?: string
          restaurant_id?: string
          revenue_delta?: number | null
          stress_delta?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_outcomes_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_outcomes_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_outcomes_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          created_at: string
          dish_name: string
          expected_profit_impact: number
          expected_revenue_impact: number
          expected_stress_impact: number
          id: string
          menu_item_id: string
          priority: number
          reasoning: string
          restaurant_id: string
          snapshot_id: string | null
          status: string
          title: string
          type: string
          updated_at: string
          week_start: string
        }
        Insert: {
          created_at?: string
          dish_name: string
          expected_profit_impact?: number
          expected_revenue_impact?: number
          expected_stress_impact?: number
          id?: string
          menu_item_id: string
          priority?: number
          reasoning: string
          restaurant_id: string
          snapshot_id?: string | null
          status?: string
          title: string
          type?: string
          updated_at?: string
          week_start: string
        }
        Update: {
          created_at?: string
          dish_name?: string
          expected_profit_impact?: number
          expected_revenue_impact?: number
          expected_stress_impact?: number
          id?: string
          menu_item_id?: string
          priority?: number
          reasoning?: string
          restaurant_id?: string
          snapshot_id?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "menu_intelligence_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          created_at: string
          id: string
          last_sync_error: string | null
          last_sync_status: string | null
          last_synced_at: string | null
          name: string
          pos_provider: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_sync_error?: string | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          name: string
          pos_provider?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_sync_error?: string | null
          last_sync_status?: string | null
          last_synced_at?: string | null
          name?: string
          pos_provider?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sales_aggregates_daily: {
        Row: {
          avg_price: number
          bucket_date: string
          computed_at: string
          created_at: string
          delivery_qty: number
          dine_in_qty: number
          dish_name: string
          dish_name_normalized: string
          id: string
          order_count: number
          restaurant_id: string
          running_total_quantity: number
          running_total_revenue: number
          takeaway_qty: number
          total_quantity: number
          total_revenue: number
        }
        Insert: {
          avg_price?: number
          bucket_date: string
          computed_at?: string
          created_at?: string
          delivery_qty?: number
          dine_in_qty?: number
          dish_name: string
          dish_name_normalized: string
          id?: string
          order_count?: number
          restaurant_id: string
          running_total_quantity?: number
          running_total_revenue?: number
          takeaway_qty?: number
          total_quantity?: number
          total_revenue?: number
        }
        Update: {
          avg_price?: number
          bucket_date?: string
          computed_at?: string
          created_at?: string
          delivery_qty?: number
          dine_in_qty?: number
          dish_name?: string
          dish_name_normalized?: string
          id?: string
          order_count?: number
          restaurant_id?: string
          running_total_quantity?: number
          running_total_revenue?: number
          takeaway_qty?: number
          total_quantity?: number
          total_revenue?: number
        }
        Relationships: []
      }
      sales_aggregates_monthly: {
        Row: {
          avg_price: number
          computed_at: string
          created_at: string
          delivery_qty: number
          dine_in_qty: number
          dish_name: string
          dish_name_normalized: string
          id: string
          month_start: string
          order_count: number
          restaurant_id: string
          takeaway_qty: number
          total_quantity: number
          total_revenue: number
        }
        Insert: {
          avg_price?: number
          computed_at?: string
          created_at?: string
          delivery_qty?: number
          dine_in_qty?: number
          dish_name: string
          dish_name_normalized: string
          id?: string
          month_start: string
          order_count?: number
          restaurant_id: string
          takeaway_qty?: number
          total_quantity?: number
          total_revenue?: number
        }
        Update: {
          avg_price?: number
          computed_at?: string
          created_at?: string
          delivery_qty?: number
          dine_in_qty?: number
          dish_name?: string
          dish_name_normalized?: string
          id?: string
          month_start?: string
          order_count?: number
          restaurant_id?: string
          takeaway_qty?: number
          total_quantity?: number
          total_revenue?: number
        }
        Relationships: []
      }
      sales_aggregates_weekly: {
        Row: {
          avg_price: number
          computed_at: string
          created_at: string
          delivery_qty: number
          dine_in_qty: number
          dish_name: string
          dish_name_normalized: string
          id: string
          order_count: number
          restaurant_id: string
          takeaway_qty: number
          total_quantity: number
          total_revenue: number
          week_end: string
          week_start: string
        }
        Insert: {
          avg_price?: number
          computed_at?: string
          created_at?: string
          delivery_qty?: number
          dine_in_qty?: number
          dish_name: string
          dish_name_normalized: string
          id?: string
          order_count?: number
          restaurant_id: string
          takeaway_qty?: number
          total_quantity?: number
          total_revenue?: number
          week_end: string
          week_start: string
        }
        Update: {
          avg_price?: number
          computed_at?: string
          created_at?: string
          delivery_qty?: number
          dine_in_qty?: number
          dish_name?: string
          dish_name_normalized?: string
          id?: string
          order_count?: number
          restaurant_id?: string
          takeaway_qty?: number
          total_quantity?: number
          total_revenue?: number
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      sales_transactions: {
        Row: {
          created_at: string
          dish_id: string | null
          dish_name: string
          external_order_id: string | null
          id: string
          order_timestamp: string
          order_type: string
          quantity_sold: number
          raw_payload: Json | null
          restaurant_id: string
          selling_price: number
          source: string
          synced_at: string | null
        }
        Insert: {
          created_at?: string
          dish_id?: string | null
          dish_name: string
          external_order_id?: string | null
          id?: string
          order_timestamp: string
          order_type?: string
          quantity_sold?: number
          raw_payload?: Json | null
          restaurant_id: string
          selling_price: number
          source?: string
          synced_at?: string | null
        }
        Update: {
          created_at?: string
          dish_id?: string | null
          dish_name?: string
          external_order_id?: string | null
          id?: string
          order_timestamp?: string
          order_type?: string
          quantity_sold?: number
          raw_payload?: Json | null
          restaurant_id?: string
          selling_price?: number
          source?: string
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_transactions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      uploads: {
        Row: {
          created_at: string | null
          dish_count: number | null
          file_name: string | null
          id: string
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dish_count?: number | null
          file_name?: string | null
          id?: string
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dish_count?: number | null
          file_name?: string | null
          id?: string
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uploads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          restaurant_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          restaurant_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          restaurant_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string
          id: string
          plan: string | null
          plan_activated_at: string | null
          plan_status: string | null
          razorpay_subscription_id: string | null
          restaurant_name: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          email: string
          id: string
          plan?: string | null
          plan_activated_at?: string | null
          plan_status?: string | null
          razorpay_subscription_id?: string | null
          restaurant_name?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          plan?: string | null
          plan_activated_at?: string | null
          plan_status?: string | null
          razorpay_subscription_id?: string | null
          restaurant_name?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_restaurant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "manager"
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
    Enums: {
      app_role: ["owner", "manager"],
    },
  },
} as const
