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
      achievements: {
        Row: {
          category: string
          created_at: string
          id: string
          is_hidden: boolean
          rarity: string
          target_value: number
          xp_reward: number
        }
        Insert: {
          category: string
          created_at?: string
          id: string
          is_hidden?: boolean
          rarity?: string
          target_value?: number
          xp_reward?: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          rarity?: string
          target_value?: number
          xp_reward?: number
        }
        Relationships: []
      }
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
      level_history: {
        Row: {
          created_at: string
          id: string
          levels_gained: number
          lifetime_xp: number
          metadata: Json
          new_level: number
          previous_level: number
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          levels_gained?: number
          lifetime_xp?: number
          metadata?: Json
          new_level: number
          previous_level: number
          source?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          levels_gained?: number
          lifetime_xp?: number
          metadata?: Json
          new_level?: number
          previous_level?: number
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      planned_workouts: {
        Row: {
          completed_at: string | null
          cooldown: Json
          created_at: string
          day_number: number
          description: string | null
          difficulty: string
          estimated_calories: number
          estimated_duration_min: number
          exercises: Json
          id: string
          is_completed: boolean
          name: string
          notes: string | null
          plan_id: string
          program_slug: string
          progression_data: Json
          scheduled_date: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
          warmup: Json
          week_number: number
        }
        Insert: {
          completed_at?: string | null
          cooldown?: Json
          created_at?: string
          day_number: number
          description?: string | null
          difficulty: string
          estimated_calories?: number
          estimated_duration_min?: number
          exercises?: Json
          id?: string
          is_completed?: boolean
          name: string
          notes?: string | null
          plan_id: string
          program_slug: string
          progression_data?: Json
          scheduled_date?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          warmup?: Json
          week_number: number
        }
        Update: {
          completed_at?: string | null
          cooldown?: Json
          created_at?: string
          day_number?: number
          description?: string | null
          difficulty?: string
          estimated_calories?: number
          estimated_duration_min?: number
          exercises?: Json
          id?: string
          is_completed?: boolean
          name?: string
          notes?: string | null
          plan_id?: string
          program_slug?: string
          progression_data?: Json
          scheduled_date?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          warmup?: Json
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "planned_workouts_plan_id_fkey"
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
      training_days: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          day_number: number
          day_type: string
          id: string
          notes: string | null
          plan_id: string
          planned_workout_id: string | null
          scheduled_date: string | null
          updated_at: string
          user_id: string
          week_id: string
          week_number: number
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          day_number: number
          day_type: string
          id?: string
          notes?: string | null
          plan_id: string
          planned_workout_id?: string | null
          scheduled_date?: string | null
          updated_at?: string
          user_id: string
          week_id: string
          week_number: number
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          day_number?: number
          day_type?: string
          id?: string
          notes?: string | null
          plan_id?: string
          planned_workout_id?: string | null
          scheduled_date?: string | null
          updated_at?: string
          user_id?: string
          week_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_days_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_days_planned_workout_id_fkey"
            columns: ["planned_workout_id"]
            isOneToOne: false
            referencedRelation: "planned_workouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_days_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "training_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plans: {
        Row: {
          completed_weeks: number
          completed_workouts: number
          created_at: string
          current_day: number
          current_week: number
          days_per_week: number | null
          description: string | null
          difficulty: string | null
          fitness_level: string | null
          id: string
          is_active: boolean
          last_workout_date: string | null
          name: string
          next_workout_date: string | null
          primary_goal: string | null
          program_slug: string
          progress_percentage: number
          start_date: string | null
          started_at: string | null
          status: string
          target_skill: string | null
          total_weeks: number
          updated_at: string
          user_id: string
          workout_duration_min: number | null
        }
        Insert: {
          completed_weeks?: number
          completed_workouts?: number
          created_at?: string
          current_day?: number
          current_week?: number
          days_per_week?: number | null
          description?: string | null
          difficulty?: string | null
          fitness_level?: string | null
          id?: string
          is_active?: boolean
          last_workout_date?: string | null
          name: string
          next_workout_date?: string | null
          primary_goal?: string | null
          program_slug: string
          progress_percentage?: number
          start_date?: string | null
          started_at?: string | null
          status?: string
          target_skill?: string | null
          total_weeks?: number
          updated_at?: string
          user_id: string
          workout_duration_min?: number | null
        }
        Update: {
          completed_weeks?: number
          completed_workouts?: number
          created_at?: string
          current_day?: number
          current_week?: number
          days_per_week?: number | null
          description?: string | null
          difficulty?: string | null
          fitness_level?: string | null
          id?: string
          is_active?: boolean
          last_workout_date?: string | null
          name?: string
          next_workout_date?: string | null
          primary_goal?: string | null
          program_slug?: string
          progress_percentage?: number
          start_date?: string | null
          started_at?: string | null
          status?: string
          target_skill?: string | null
          total_weeks?: number
          updated_at?: string
          user_id?: string
          workout_duration_min?: number | null
        }
        Relationships: []
      }
      training_weeks: {
        Row: {
          created_at: string
          difficulty: string
          estimated_duration_min: number
          id: string
          is_deload: boolean
          objective: string
          plan_id: string
          recovery_days_count: number
          updated_at: string
          user_id: string
          week_number: number
          workout_days_count: number
        }
        Insert: {
          created_at?: string
          difficulty: string
          estimated_duration_min?: number
          id?: string
          is_deload?: boolean
          objective: string
          plan_id: string
          recovery_days_count?: number
          updated_at?: string
          user_id: string
          week_number: number
          workout_days_count?: number
        }
        Update: {
          created_at?: string
          difficulty?: string
          estimated_duration_min?: number
          id?: string
          is_deload?: boolean
          objective?: string
          plan_id?: string
          recovery_days_count?: number
          updated_at?: string
          user_id?: string
          week_number?: number
          workout_days_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_weeks_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievement_progress: {
        Row: {
          achievement_id: string
          created_at: string
          current_value: number
          id: string
          progress_percentage: number
          target_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          created_at?: string
          current_value?: number
          id?: string
          progress_percentage?: number
          target_value?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          created_at?: string
          current_value?: number
          id?: string
          progress_percentage?: number
          target_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievement_progress_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          created_at: string
          id: string
          source_event_id: string | null
          unlocked_at: string
          user_id: string
          xp_awarded: number
        }
        Insert: {
          achievement_id: string
          created_at?: string
          id?: string
          source_event_id?: string | null
          unlocked_at?: string
          user_id: string
          xp_awarded?: number
        }
        Update: {
          achievement_id?: string
          created_at?: string
          id?: string
          source_event_id?: string | null
          unlocked_at?: string
          user_id?: string
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_goals: {
        Row: {
          category: string
          completed_at: string | null
          created_at: string
          current_value: number
          description: string | null
          id: string
          metadata: Json
          progress_type: string
          start_date: string
          status: string
          target_date: string | null
          target_value: number
          title: string
          type: string
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          completed_at?: string | null
          created_at?: string
          current_value?: number
          description?: string | null
          id?: string
          metadata?: Json
          progress_type: string
          start_date?: string
          status?: string
          target_date?: string | null
          target_value?: number
          title: string
          type: string
          unit: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          completed_at?: string | null
          created_at?: string
          current_value?: number
          description?: string | null
          id?: string
          metadata?: Json
          progress_type?: string
          start_date?: string
          status?: string
          target_date?: string | null
          target_value?: number
          title?: string
          type?: string
          unit?: string
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
      user_progression: {
        Row: {
          created_at: string
          current_level: number
          current_xp: number
          highest_level: number
          last_level_up_at: string | null
          lifetime_xp: number
          prestige: number
          progress_percentage: number
          updated_at: string
          user_id: string
          xp_to_next_level: number
        }
        Insert: {
          created_at?: string
          current_level?: number
          current_xp?: number
          highest_level?: number
          last_level_up_at?: string | null
          lifetime_xp?: number
          prestige?: number
          progress_percentage?: number
          updated_at?: string
          user_id: string
          xp_to_next_level?: number
        }
        Update: {
          created_at?: string
          current_level?: number
          current_xp?: number
          highest_level?: number
          last_level_up_at?: string | null
          lifetime_xp?: number
          prestige?: number
          progress_percentage?: number
          updated_at?: string
          user_id?: string
          xp_to_next_level?: number
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          created_at: string
          current_xp: number
          last_activity_at: string | null
          level: number
          lifetime_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_xp?: number
          last_activity_at?: string | null
          level?: number
          lifetime_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_xp?: number
          last_activity_at?: string | null
          level?: number
          lifetime_xp?: number
          updated_at?: string
          user_id?: string
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
      xp_history: {
        Row: {
          amount: number
          created_at: string
          event_type: string
          id: string
          metadata: Json
          reason: string
          running_total: number
          source_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          reason: string
          running_total?: number
          source_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          reason?: string
          running_total?: number
          source_id?: string | null
          user_id?: string
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
