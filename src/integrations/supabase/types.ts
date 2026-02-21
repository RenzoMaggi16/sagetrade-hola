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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
<<<<<<< HEAD
=======
      mentor_chat_messages: {
        Row: {
          id: string
          user_id: string
          role: 'user' | 'assistant'
          content: string
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          role: 'user' | 'assistant'
          content: string
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'user' | 'assistant'
          content?: string
          created_at?: string | null
        }
        Relationships: []
      }
>>>>>>> 74aa8f8 (Actualizacion Mentor IA)
      rules: {
        Row: {
          created_at: string | null
          descripcion: string | null
          id: string
          nombre: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          id?: string
          nombre?: string
          user_id?: string
        }
        Relationships: []
      }
      accounts: {
        Row: {
          id: string
          user_id: string
          account_name: string
          account_type: 'personal' | 'evaluation' | 'live'
          asset_class: 'futures' | 'forex' | 'crypto' | 'stocks' | 'other'
          initial_capital: number
          current_capital: number
          funding_company: string | null
          funding_target_1: number | null
          funding_target_2: number | null
          funding_phases: number | null
          created_at: string | null
          drawdown_type: 'fixed' | 'trailing' | null
          drawdown_amount: number | null
          profit_target: number | null
          highest_balance: number | null
        }
        Insert: {
          id?: string
          user_id: string
          account_name: string
          account_type: 'personal' | 'evaluation' | 'live'
          asset_class: 'futures' | 'forex' | 'crypto' | 'stocks' | 'other'
          initial_capital: number
          current_capital: number
          funding_company?: string | null
          funding_target_1?: number | null
          funding_target_2?: number | null
          funding_phases?: number | null
          created_at?: string | null
          drawdown_type?: 'fixed' | 'trailing' | null
          drawdown_amount?: number | null
          profit_target?: number | null
          highest_balance?: number | null
        }
        Update: {
          id?: string
          user_id?: string
          account_name?: string
          account_type?: 'personal' | 'evaluation' | 'live'
          asset_class?: 'futures' | 'forex' | 'crypto' | 'stocks' | 'other'
          initial_capital?: number
          current_capital?: number
          funding_company?: string | null
          funding_target_1?: number | null
          funding_target_2?: number | null
          funding_phases?: number | null
          created_at?: string | null
          drawdown_type?: 'fixed' | 'trailing' | null
          drawdown_amount?: number | null
          profit_target?: number | null
          highest_balance?: number | null
        }
        Relationships: []
      }
      payouts: {
        Row: {
          id: string
          user_id: string
          account_id: string
          amount: number
          payout_date: string
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          account_id: string
          amount: number
          payout_date?: string
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string
          amount?: number
          payout_date?: string
          notes?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      trades: {
        Row: {
          id: string
          user_id: string
          account_id: string | null
          entry_time: string | null
          exit_time: string | null
          par: string | null
          pnl_neto: number
          riesgo: number | null
          emocion: string | null
          trade_type: 'buy' | 'sell'
          setup_rating: string | null
          pre_trade_notes: string | null
          post_trade_notes: string | null
          strategy_id: string | null
          is_outside_plan: boolean
          setup_compliance: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          account_id?: string | null
          entry_time?: string | null
          exit_time?: string | null
          par?: string | null
          pnl_neto: number
          riesgo?: number | null
          emocion?: string | null
          trade_type: 'buy' | 'sell'
          setup_rating?: string | null
          pre_trade_notes?: string | null
          post_trade_notes?: string | null
          strategy_id?: string | null
          is_outside_plan?: boolean
          setup_compliance?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          account_id?: string | null
          entry_time?: string | null
          exit_time?: string | null
          par?: string | null
          pnl_neto?: number
          riesgo?: number | null
          emocion?: string | null
          trade_type?: 'buy' | 'sell'
          setup_rating?: string | null
          pre_trade_notes?: string | null
          post_trade_notes?: string | null
          strategy_id?: string | null
          is_outside_plan?: boolean
          setup_compliance?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      trading_plans: {
        Row: {
          id: string
          user_id: string
          market: string | null
          instrument: string | null
          trading_type: string | null
          session: string | null
          allowed_hours_start: string | null
          allowed_hours_end: string | null
          risk_per_trade: number | null
          max_daily_risk: number | null
          max_trades_per_day: number | null
          min_rr: number | null
          stop_after_consecutive_losses: number | null
          psychological_rules: any[] | null
          setup_rules: any[] | null
          monthly_goals: Record<string, string> | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          market?: string | null
          instrument?: string | null
          trading_type?: string | null
          session?: string | null
          allowed_hours_start?: string | null
          allowed_hours_end?: string | null
          risk_per_trade?: number | null
          max_daily_risk?: number | null
          max_trades_per_day?: number | null
          min_rr?: number | null
          stop_after_consecutive_losses?: number | null
          psychological_rules?: any[] | null
          setup_rules?: any[] | null
          monthly_goals?: Record<string, string> | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          market?: string | null
          instrument?: string | null
          trading_type?: string | null
          session?: string | null
          allowed_hours_start?: string | null
          allowed_hours_end?: string | null
          risk_per_trade?: number | null
          max_daily_risk?: number | null
          max_trades_per_day?: number | null
          min_rr?: number | null
          stop_after_consecutive_losses?: number | null
          psychological_rules?: any[] | null
          setup_rules?: any[] | null
          monthly_goals?: Record<string, string> | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          profit_color_hex: string
          loss_color_hex: string
          background_color_hex: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          profit_color_hex?: string
          loss_color_hex?: string
          background_color_hex?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          profit_color_hex?: string
          loss_color_hex?: string
          background_color_hex?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
  public: {
    Enums: {},
  },
} as const
