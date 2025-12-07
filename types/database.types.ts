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
    }
  }
}
