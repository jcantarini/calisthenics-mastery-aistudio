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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      fitness_assessment: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          dips: string | null
          mobility: string | null
          plank: string | null
          pullups: string | null
          pushups: string | null
          score: number | null
          skills: Json
          skipped: Json
          squats: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          dips?: string | null
          mobility?: string | null
          plank?: string | null
          pullups?: string | null
          pushups?: string | null
          score?: number | null
          skills?: Json
          skipped?: Json
          squats?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          dips?: string | null
          mobility?: string | null
          plank?: string | null
          pullups?: string | null
          pushups?: string | null
          score?: number | null
          skills?: Json
          skipped?: Json
          squats?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      generated_workouts: {
        Row: {
          cooldown: Json
          created_at: string
          description: string | null
          difficulty: string
          estimated_calories: number
          estimated_duration_min: number
          exercises: Json
          id: string
          is_first: boolean
          name: string
          notes: string | null
          plan_id: string | null
          program_slug: string
          updated_at: string
          user_id: string
          warmup: Json
        }
        Insert: {
          cooldown?: Json
          created_at?: string
          description?: string | null
          difficulty: string
          estimated_calories?: number
          estimated_duration_min?: number
          exercises?: Json
          id?: string
          is_first?: boolean
          name: string
          notes?: string | null
          plan_id?: string | null
          program_slug: string
          updated_at?: string
          user_id: string
          warmup?: Json
        }
        Update: {
          cooldown?: Json
          created_at?: string
          description?: string | null
          difficulty?: string
          estimated_calories?: number
          estimated_duration_min?: number
          exercises?: Json
          id?: string
          is_first?: boolean
          name?: string
          notes?: string | null
          plan_id?: string | null
          program_slug?: string
          updated_at?: string
          user_id?: string
          warmup?: Json
        }
        Relationships: [
          {
            foreignKeyName: "generated_workouts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      training_plans: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          program_slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          program_slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          program_slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_onboarding: {
        Row: {
          age: number | null
          completed_at: string | null
          country: string | null
          created_at: string
          current_performance: Json
          days_per_week: number | null
          equipment: Json
          fitness_level: string | null
          gender: string | null
          has_experience: boolean | null
          height_cm: number | null
          injuries: string | null
          language: string | null
          motivation: string | null
          onboarding_completed: boolean
          primary_goal: string | null
          skill_goal: string | null
          target_areas: Json
          updated_at: string
          user_id: string
          weight_kg: number | null
          workout_duration_min: number | null
        }
        Insert: {
          age?: number | null
          completed_at?: string | null
          country?: string | null
          created_at?: string
          current_performance?: Json
          days_per_week?: number | null
          equipment?: Json
          fitness_level?: string | null
          gender?: string | null
          has_experience?: boolean | null
          height_cm?: number | null
          injuries?: string | null
          language?: string | null
          motivation?: string | null
          onboarding_completed?: boolean
          primary_goal?: string | null
          skill_goal?: string | null
          target_areas?: Json
          updated_at?: string
          user_id: string
          weight_kg?: number | null
          workout_duration_min?: number | null
        }
        Update: {
          age?: number | null
          completed_at?: string | null
          country?: string | null
          created_at?: string
          current_performance?: Json
          days_per_week?: number | null
          equipment?: Json
          fitness_level?: string | null
          gender?: string | null
          has_experience?: boolean | null
          height_cm?: number | null
          injuries?: string | null
          language?: string | null
          motivation?: string | null
          onboarding_completed?: boolean
          primary_goal?: string | null
          skill_goal?: string | null
          target_areas?: Json
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
          workout_duration_min?: number | null
        }
        Relationships: []
      }
      workout_reminder_settings: {
        Row: {
          created_at: string
          enabled: boolean
          reminders: Json
          sound: boolean
          updated_at: string
          user_id: string
          vibration: boolean
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          reminders?: Json
          sound?: boolean
          updated_at?: string
          user_id: string
          vibration?: boolean
        }
        Update: {
          created_at?: string
          enabled?: boolean
          reminders?: Json
          sound?: boolean
          updated_at?: string
          user_id?: string
          vibration?: boolean
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
