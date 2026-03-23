/**
 * Database types for Supabase.
 *
 * For production, generate with:
 * npx supabase gen types typescript --project-id <id> > types/supabase.ts
 */

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
      organizations: {
        Row: {
          id: string
          name: string
          industry: string | null
          twilio_number: string | null
          forwarding_number: string | null
          elevenlabs_agent_id: string | null
          timezone: string
          google_refresh_token: string | null
          google_connected: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          industry?: string | null
          twilio_number?: string | null
          forwarding_number?: string | null
          elevenlabs_agent_id?: string | null
          timezone?: string
          google_refresh_token?: string | null
          google_connected?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          industry?: string | null
          twilio_number?: string | null
          forwarding_number?: string | null
          elevenlabs_agent_id?: string | null
          timezone?: string
          google_refresh_token?: string | null
          google_connected?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'admin' | 'client'
          organization_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'admin' | 'client'
          organization_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'admin' | 'client'
          organization_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      agents: {
        Row: {
          id: string
          organization_id: string
          name: string
          elevenlabs_agent_id: string | null
          voice_id: string
          greeting: string
          system_prompt: string
          faqs: Json
          escalation_number: string | null
          business_hours: Json | null
          is_active: boolean
          language: string
          max_call_duration: number
          webhook_url: string | null
          call_recording: boolean
          voice_settings: Json | null
          knowledge_items: Json | null
          interruptible: boolean
          timezone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name?: string
          elevenlabs_agent_id?: string | null
          voice_id: string
          greeting: string
          system_prompt: string
          faqs?: Json
          escalation_number?: string | null
          business_hours?: Json | null
          is_active?: boolean
          language?: string
          max_call_duration?: number
          webhook_url?: string | null
          call_recording?: boolean
          voice_settings?: Json | null
          knowledge_items?: Json | null
          interruptible?: boolean
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          elevenlabs_agent_id?: string | null
          voice_id?: string
          greeting?: string
          system_prompt?: string
          faqs?: Json
          escalation_number?: string | null
          business_hours?: Json | null
          is_active?: boolean
          language?: string
          max_call_duration?: number
          webhook_url?: string | null
          call_recording?: boolean
          voice_settings?: Json | null
          knowledge_items?: Json | null
          interruptible?: boolean
          timezone?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      calls: {
        Row: {
          id: string
          organization_id: string
          agent_id: string
          twilio_call_sid: string
          elevenlabs_conversation_id: string | null
          caller_number: string
          status: 'ringing' | 'in_progress' | 'completed' | 'failed' | 'transferred'
          duration: number
          transcript: Json | null
          summary: string | null
          recording_url: string | null
          lead_data: Json | null
          appointment_booked: boolean
          lead_score: number | null
          intent: string | null
          sentiment: string | null
          follow_up_required: boolean
          ai_summary: string | null
          suggested_action: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          agent_id: string
          twilio_call_sid: string
          elevenlabs_conversation_id?: string | null
          caller_number: string
          status?: 'ringing' | 'in_progress' | 'completed' | 'failed' | 'transferred'
          duration?: number
          transcript?: Json | null
          summary?: string | null
          recording_url?: string | null
          lead_data?: Json | null
          appointment_booked?: boolean
          lead_score?: number | null
          intent?: string | null
          sentiment?: string | null
          follow_up_required?: boolean
          ai_summary?: string | null
          suggested_action?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          agent_id?: string
          twilio_call_sid?: string
          elevenlabs_conversation_id?: string | null
          caller_number?: string
          status?: 'ringing' | 'in_progress' | 'completed' | 'failed' | 'transferred'
          duration?: number
          transcript?: Json | null
          summary?: string | null
          recording_url?: string | null
          lead_data?: Json | null
          appointment_booked?: boolean
          lead_score?: number | null
          intent?: string | null
          sentiment?: string | null
          follow_up_required?: boolean
          ai_summary?: string | null
          suggested_action?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_agent_id_fkey"
            columns: ["agent_id"]
            referencedRelation: "agents"
            referencedColumns: ["id"]
          }
        ]
      }
      subscriptions: {
        Row: {
          id: string
          organization_id: string
          stripe_customer_id: string
          stripe_subscription_id: string | null
          plan: 'essential' | 'complete' | 'enterprise'
          status: 'trialing' | 'active' | 'past_due' | 'canceled'
          minutes_included: number
          minutes_used: number
          current_period_start: string | null
          current_period_end: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          stripe_customer_id: string
          stripe_subscription_id?: string | null
          plan?: 'essential' | 'complete' | 'enterprise'
          status?: 'trialing' | 'active' | 'past_due' | 'canceled'
          minutes_included: number
          minutes_used?: number
          current_period_start?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string | null
          plan?: 'essential' | 'complete' | 'enterprise'
          status?: 'trialing' | 'active' | 'past_due' | 'canceled'
          minutes_included?: number
          minutes_used?: number
          current_period_start?: string | null
          current_period_end?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      }
      campaigns: {
        Row: {
          id: string
          organization_id: string
          agent_id: string
          name: string
          type: string
          status: string
          contacts: Json
          script_context: string | null
          schedule_time: string | null
          max_concurrent: number
          stats: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          agent_id: string
          name: string
          type?: string
          status?: string
          contacts?: Json
          script_context?: string | null
          schedule_time?: string | null
          max_concurrent?: number
          stats?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          agent_id?: string
          name?: string
          type?: string
          status?: string
          contacts?: Json
          script_context?: string | null
          schedule_time?: string | null
          max_concurrent?: number
          stats?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaign_calls: {
        Row: {
          id: string
          campaign_id: string
          contact_phone: string
          contact_name: string | null
          contact_context: Json | null
          status: string
          duration: number
          transcript: Json | null
          outcome: string | null
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          contact_phone: string
          contact_name?: string | null
          contact_context?: Json | null
          status?: string
          duration?: number
          transcript?: Json | null
          outcome?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          contact_phone?: string
          contact_name?: string | null
          contact_context?: Json | null
          status?: string
          duration?: number
          transcript?: Json | null
          outcome?: string | null
          created_at?: string
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

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Convenience aliases
export type Organization = Tables<'organizations'>
export type Profile = Tables<'profiles'>
export type Agent = Tables<'agents'>
export type Call = Tables<'calls'>
export type Subscription = Tables<'subscriptions'>
