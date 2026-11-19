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
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
