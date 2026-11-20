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
      couples: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      couple_members: {
        Row: {
          couple_id: string
          joined_at: string
          role: 'owner' | 'partner'
          user_id: string
        }
        Insert: {
          couple_id: string
          joined_at?: string
          role: 'owner' | 'partner'
          user_id: string
        }
        Update: {
          couple_id?: string
          joined_at?: string
          role?: 'owner' | 'partner'
          user_id?: string
        }
        Relationships: []
      }
      occasions: {
        Row: {
          category: 'anniversary' | 'birthday' | 'reservation' | 'other'
          couple_id: string
          created_at: string
          created_by: string
          id: string
          notes: string | null
          occasion_date: string
          repeats_yearly: boolean
          title: string
          updated_at: string
        }
        Insert: {
          category?: 'anniversary' | 'birthday' | 'reservation' | 'other'
          couple_id: string
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          occasion_date: string
          repeats_yearly?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          category?: 'anniversary' | 'birthday' | 'reservation' | 'other'
          couple_id?: string
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          occasion_date?: string
          repeats_yearly?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      activity_suggestions: {
        Row: {
          category: 'food' | 'outdoors' | 'at_home' | 'date_night' | 'travel' | 'other'
          couple_id: string
          created_at: string
          created_by: string
          details: string | null
          id: string
          status: 'idea' | 'planned' | 'done'
          title: string
          updated_at: string
        }
        Insert: {
          category?: 'food' | 'outdoors' | 'at_home' | 'date_night' | 'travel' | 'other'
          couple_id: string
          created_at?: string
          created_by?: string
          details?: string | null
          id?: string
          status?: 'idea' | 'planned' | 'done'
          title: string
          updated_at?: string
        }
        Update: {
          category?: 'food' | 'outdoors' | 'at_home' | 'date_night' | 'travel' | 'other'
          couple_id?: string
          created_at?: string
          created_by?: string
          details?: string | null
          id?: string
          status?: 'idea' | 'planned' | 'done'
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      memories: {
        Row: {
          couple_id: string
          created_at: string
          created_by: string
          id: string
          image_path: string | null
          location: string | null
          memory_date: string | null
          memory_type: 'memory' | 'place' | 'recipe' | 'trip' | 'gift' | 'other'
          notes: string | null
          rating: number | null
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          created_by?: string
          id?: string
          image_path?: string | null
          location?: string | null
          memory_date?: string | null
          memory_type?: 'memory' | 'place' | 'recipe' | 'trip' | 'gift' | 'other'
          notes?: string | null
          rating?: number | null
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          created_by?: string
          id?: string
          image_path?: string | null
          location?: string | null
          memory_date?: string | null
          memory_type?: 'memory' | 'place' | 'recipe' | 'trip' | 'gift' | 'other'
          notes?: string | null
          rating?: number | null
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          couple_id: string
          created_at: string
          created_by: string
          dismissed_at: string | null
          id: string
          occasion_id: string | null
          remind_at: string
          snoozed_until: string | null
          title: string
          updated_at: string
        }
        Insert: {
          couple_id: string
          created_at?: string
          created_by?: string
          dismissed_at?: string | null
          id?: string
          occasion_id?: string | null
          remind_at: string
          snoozed_until?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          couple_id?: string
          created_at?: string
          created_by?: string
          dismissed_at?: string | null
          id?: string
          occasion_id?: string | null
          remind_at?: string
          snoozed_until?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_couple: {
        Args: {
          p_name: string
        }
        Returns: string
      }
      is_couple_member: {
        Args: {
          target_couple_id: string
        }
        Returns: boolean
      }
      create_couple_invite: {
        Args: Record<PropertyKey, never>
        Returns: {
          expires_at: string
          invite_code: string
        }[]
      }
      accept_couple_invite: {
        Args: {
          p_invite_code: string
        }
        Returns: string
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
