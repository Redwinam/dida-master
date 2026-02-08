export type Json
  = | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
  public: {
    Tables: {
      dida_master_calendar_templates: {
        Row: {
          id: string
          user_id: string
          name: string
          base_event: Json
          rules: Json
          created_at: string | null
          updated_at: string | null
          last_used_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          base_event?: Json
          rules?: Json
          created_at?: string | null
          updated_at?: string | null
          last_used_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          base_event?: Json
          rules?: Json
          created_at?: string | null
          updated_at?: string | null
          last_used_at?: string | null
        }
      }
      dida_master_user_config: {
        Row: {
          user_id: string
          dida_token: string | null
          dida_project_id: string | null
          exclude_project_name: string | null
          llm_api_key: string | null
          llm_model: string | null
          llm_api_url: string | null
          cal_enable: boolean | null
          icloud_username: string | null
          icloud_app_password: string | null
          cal_lookahead_days: number | null
          calendar_target: string | null
          updated_at: string | null
          settings: Json | null
        }
        Insert: {
          user_id: string
          dida_token?: string | null
          dida_project_id?: string | null
          exclude_project_name?: string | null
          llm_api_key?: string | null
          llm_model?: string | null
          llm_api_url?: string | null
          cal_enable?: boolean | null
          icloud_username?: string | null
          icloud_app_password?: string | null
          cal_lookahead_days?: number | null
          calendar_target?: string | null
          updated_at?: string | null
          settings?: Json | null
        }
        Update: {
          user_id?: string
          dida_token?: string | null
          dida_project_id?: string | null
          exclude_project_name?: string | null
          llm_api_key?: string | null
          llm_model?: string | null
          llm_api_url?: string | null
          cal_enable?: boolean | null
          icloud_username?: string | null
          icloud_app_password?: string | null
          cal_lookahead_days?: number | null
          calendar_target?: string | null
          updated_at?: string | null
          settings?: Json | null
        }
      }
      dida_master_daily_notes: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          dida_task_id: string | null
          dida_project_id: string | null
          note_date: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content: string
          dida_task_id?: string | null
          dida_project_id?: string | null
          note_date?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string
          dida_task_id?: string | null
          dida_project_id?: string | null
          note_date?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
      dida_master_weekly_reports: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          dida_task_id: string | null
          dida_project_id: string | null
          period_start: string
          period_end: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content: string
          dida_task_id?: string | null
          dida_project_id?: string | null
          period_start: string
          period_end: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string
          dida_task_id?: string | null
          dida_project_id?: string | null
          period_start?: string
          period_end?: string
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
  }
}
