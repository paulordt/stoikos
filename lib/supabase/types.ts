export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          name: string | null
          weight_kg: number | null
          height_cm: number | null
          goal: string | null
          calories_target: number | null
          protein_target: number | null
          carbs_target: number | null
          fat_target: number | null
          supplements: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name?: string | null
          weight_kg?: number | null
          height_cm?: number | null
          goal?: string | null
          calories_target?: number | null
          protein_target?: number | null
          carbs_target?: number | null
          fat_target?: number | null
          supplements?: Json | null
        }
        Update: {
          user_id?: string
          name?: string | null
          weight_kg?: number | null
          height_cm?: number | null
          goal?: string | null
          calories_target?: number | null
          protein_target?: number | null
          carbs_target?: number | null
          fat_target?: number | null
          supplements?: Json | null
        }
        Relationships: []
      }
      meals: {
        Row: {
          id: string
          user_id: string
          date: string
          meal_type: string
          name: string
          calories: number | null
          protein: number | null
          carbs: number | null
          fat: number | null
          photo_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          meal_type: string
          name: string
          calories?: number | null
          protein?: number | null
          carbs?: number | null
          fat?: number | null
          photo_url?: string | null
        }
        Update: {
          user_id?: string
          date?: string
          meal_type?: string
          name?: string
          calories?: number | null
          protein?: number | null
          carbs?: number | null
          fat?: number | null
          photo_url?: string | null
        }
        Relationships: []
      }
      sleep_logs: {
        Row: {
          id: string
          user_id: string
          date: string
          bedtime: string | null
          wake_time: string | null
          quality: number | null
          notes: string | null
          source: string
          duration_hours: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          bedtime?: string | null
          wake_time?: string | null
          quality?: number | null
          notes?: string | null
          source?: string
          duration_hours?: number | null
        }
        Update: {
          user_id?: string
          date?: string
          bedtime?: string | null
          wake_time?: string | null
          quality?: number | null
          notes?: string | null
          source?: string
          duration_hours?: number | null
        }
        Relationships: []
      }
      supplement_logs: {
        Row: {
          id: string
          user_id: string
          date: string
          items: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          items?: Json
        }
        Update: {
          user_id?: string
          date?: string
          items?: Json
        }
        Relationships: []
      }
      routines: {
        Row: {
          id: string
          user_id: string
          name: string
          weekly_schedule: Json | null
          exercises: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          weekly_schedule?: Json | null
          exercises?: Json
        }
        Update: {
          user_id?: string
          name?: string
          weekly_schedule?: Json | null
          exercises?: Json
        }
        Relationships: []
      }
      workout_logs: {
        Row: {
          id: string
          user_id: string
          routine_id: string | null
          date: string
          completed_exercises: Json
          duration_min: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          routine_id?: string | null
          date: string
          completed_exercises?: Json
          duration_min?: number | null
          notes?: string | null
        }
        Update: {
          user_id?: string
          routine_id?: string | null
          date?: string
          completed_exercises?: Json
          duration_min?: number | null
          notes?: string | null
        }
        Relationships: []
      }
      stoic_entries: {
        Row: {
          id: string
          user_id: string
          date: string
          theme: string | null
          reflection: string | null
          practice: string | null
          read: boolean
          saved: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          theme?: string | null
          reflection?: string | null
          practice?: string | null
          read?: boolean
          saved?: boolean
        }
        Update: {
          user_id?: string
          date?: string
          theme?: string | null
          reflection?: string | null
          practice?: string | null
          read?: boolean
          saved?: boolean
        }
        Relationships: []
      }
      gratitude_entries: {
        Row: {
          id: string
          user_id: string
          date: string
          items: string[]
          second_prompt: string | null
          second_answer: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          items?: string[]
          second_prompt?: string | null
          second_answer?: string | null
        }
        Update: {
          user_id?: string
          date?: string
          items?: string[]
          second_prompt?: string | null
          second_answer?: string | null
        }
        Relationships: []
      }
      evening_reflections: {
        Row: {
          id: string
          user_id: string
          date: string
          went_well: string | null
          do_differently: string | null
          coach_response: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          went_well?: string | null
          do_differently?: string | null
          coach_response?: string | null
        }
        Update: {
          user_id?: string
          date?: string
          went_well?: string | null
          do_differently?: string | null
          coach_response?: string | null
        }
        Relationships: []
      }
      habits: {
        Row: {
          id: string
          user_id: string
          name: string
          frequency: Json
          category: string | null
          note: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          frequency?: Json
          category?: string | null
          note?: string | null
          active?: boolean
        }
        Update: {
          user_id?: string
          name?: string
          frequency?: Json
          category?: string | null
          note?: string | null
          active?: boolean
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          id: string
          user_id: string
          habit_id: string
          date: string
          completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          habit_id: string
          date: string
          completed?: boolean
        }
        Update: {
          user_id?: string
          habit_id?: string
          date?: string
          completed?: boolean
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
  }
}
