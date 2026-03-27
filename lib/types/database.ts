export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'student' | 'admin'
export type UserStatus = 'active' | 'blocked'
export type UserLanguage = 'ru' | 'kz'
export type Difficulty = 'beginner' | 'intermediate' | 'advanced'
export type SourceType = 'youtube' | 'upload'
export type ProcessingStatus = 'pending' | 'processing' | 'ready' | 'error'
export type JobType = 'transcode' | 'thumbnail'
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          password_hash: string | null
          first_name: string
          last_name: string
          phone: string | null
          avatar_url: string | null
          bio: string | null
          role: UserRole
          status: UserStatus
          language: UserLanguage
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          password_hash?: string | null
          first_name: string
          last_name: string
          phone?: string | null
          avatar_url?: string | null
          bio?: string | null
          role?: UserRole
          status?: UserStatus
          language?: UserLanguage
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string | null
          first_name?: string
          last_name?: string
          phone?: string | null
          avatar_url?: string | null
          bio?: string | null
          role?: UserRole
          status?: UserStatus
          language?: UserLanguage
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          id: string
          title_ru: string
          title_kz: string
          description_ru: string | null
          description_kz: string | null
          cover_url: string | null
          category: string | null
          difficulty: Difficulty
          sort_order: number
          is_published: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title_ru: string
          title_kz: string
          description_ru?: string | null
          description_kz?: string | null
          cover_url?: string | null
          category?: string | null
          difficulty?: Difficulty
          sort_order?: number
          is_published?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title_ru?: string
          title_kz?: string
          description_ru?: string | null
          description_kz?: string | null
          cover_url?: string | null
          category?: string | null
          difficulty?: Difficulty
          sort_order?: number
          is_published?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          id: string
          course_id: string
          title_ru: string
          title_kz: string
          description_ru: string | null
          description_kz: string | null
          duration_seconds: number
          source_type: SourceType
          original_url: string | null
          hls_url: string | null
          thumbnail_url: string | null
          order_index: number
          processing_status: ProcessingStatus
          processing_error: string | null
          created_at: string
        }
        Insert: {
          id?: string
          course_id: string
          title_ru: string
          title_kz: string
          description_ru?: string | null
          description_kz?: string | null
          duration_seconds?: number
          source_type?: SourceType
          original_url?: string | null
          hls_url?: string | null
          thumbnail_url?: string | null
          order_index?: number
          processing_status?: ProcessingStatus
          processing_error?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          title_ru?: string
          title_kz?: string
          description_ru?: string | null
          description_kz?: string | null
          duration_seconds?: number
          source_type?: SourceType
          original_url?: string | null
          hls_url?: string | null
          thumbnail_url?: string | null
          order_index?: number
          processing_status?: ProcessingStatus
          processing_error?: string | null
          created_at?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          id: string
          user_id: string
          video_id: string
          current_time_seconds: number
          completion_percentage: number
          is_completed: boolean
          last_watched_at: string
        }
        Insert: {
          id?: string
          user_id: string
          video_id: string
          current_time_seconds?: number
          completion_percentage?: number
          is_completed?: boolean
          last_watched_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          video_id?: string
          current_time_seconds?: number
          completion_percentage?: number
          is_completed?: boolean
          last_watched_at?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          id: string
          user_id: string
          course_id: string
          certificate_number: string
          issued_at: string
          pdf_url: string | null
          is_revoked: boolean
          revoked_at: string | null
          revoke_reason: string | null
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          certificate_number?: string
          issued_at?: string
          pdf_url?: string | null
          is_revoked?: boolean
          revoked_at?: string | null
          revoke_reason?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          certificate_number?: string
          issued_at?: string
          pdf_url?: string | null
          is_revoked?: boolean
          revoked_at?: string | null
          revoke_reason?: string | null
        }
        Relationships: []
      }
      video_processing_jobs: {
        Row: {
          id: string
          video_id: string
          job_type: JobType
          status: JobStatus
          input_url: string | null
          output_hls_url: string | null
          error_message: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          video_id: string
          job_type: JobType
          status?: JobStatus
          input_url?: string | null
          output_hls_url?: string | null
          error_message?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          video_id?: string
          job_type?: JobType
          status?: JobStatus
          input_url?: string | null
          output_hls_url?: string | null
          error_message?: string | null
          created_at?: string
          completed_at?: string | null
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
      user_role: UserRole
      user_status: UserStatus
      user_language: UserLanguage
      difficulty: Difficulty
      source_type: SourceType
      processing_status: ProcessingStatus
      job_type: JobType
      job_status: JobStatus
    }
  }
}

// Convenience row types
export type User = Database['public']['Tables']['users']['Row']
export type Course = Database['public']['Tables']['courses']['Row']
export type Video = Database['public']['Tables']['videos']['Row']
export type UserProgress = Database['public']['Tables']['user_progress']['Row']
export type Certificate = Database['public']['Tables']['certificates']['Row']
export type VideoProcessingJob = Database['public']['Tables']['video_processing_jobs']['Row']
