export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      ai_processing_attempts: {
        Row: {
          candidate_id: string;
          company_id: string | null;
          cost_usd: number | null;
          created_at: string;
          duration_ms: number | null;
          error: string | null;
          id: string;
          model: string;
          output_tokens: number | null;
          prompt_tokens: number | null;
          status: Database["public"]["Enums"]["ai_attempt_status"];
        };
        Insert: {
          candidate_id: string;
          company_id?: string | null;
          cost_usd?: number | null;
          created_at?: string;
          duration_ms?: number | null;
          error?: string | null;
          id?: string;
          model: string;
          output_tokens?: number | null;
          prompt_tokens?: number | null;
          status: Database["public"]["Enums"]["ai_attempt_status"];
        };
        Update: {
          candidate_id?: string;
          company_id?: string | null;
          cost_usd?: number | null;
          created_at?: string;
          duration_ms?: number | null;
          error?: string | null;
          id?: string;
          model?: string;
          output_tokens?: number | null;
          prompt_tokens?: number | null;
          status?: Database["public"]["Enums"]["ai_attempt_status"];
        };
        Relationships: [
          {
            foreignKeyName: "ai_processing_attempts_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: false;
            referencedRelation: "candidates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_processing_attempts_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: false;
            referencedRelation: "candidates_ranked";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_processing_attempts_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_processing_attempts_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "company_usage_30d";
            referencedColumns: ["company_id"];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor: string;
          actor_user_id: string | null;
          company_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: number;
          metadata: Json | null;
        };
        Insert: {
          action: string;
          actor: string;
          actor_user_id?: string | null;
          company_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: number;
          metadata?: Json | null;
        };
        Update: {
          action?: string;
          actor?: string;
          actor_user_id?: string | null;
          company_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: number;
          metadata?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_user_id_fkey";
            columns: ["actor_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_log_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_log_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "company_usage_30d";
            referencedColumns: ["company_id"];
          },
        ];
      };
      candidates: {
        Row: {
          ai_error: string | null;
          ai_interview_questions: Json | null;
          created_at: string;
          cv_storage_path: string | null;
          full_name: string;
          gaps: string[] | null;
          gaps_en: string[] | null;
          gaps_uz: string[] | null;
          hr_notes: string | null;
          id: string;
          invited_at: string | null;
          job_posting_id: string;
          language_detected: Database["public"]["Enums"]["detected_language"] | null;
          match_score: number | null;
          one_line_summary: string | null;
          one_line_summary_en: string | null;
          one_line_summary_uz: string | null;
          meets_requirements: boolean | null;
          phone_number: string;
          requirements_responses: Json | null;
          requirements_snapshot: Json | null;
          retry_count: number;
          status: Database["public"]["Enums"]["candidate_status"];
          strengths: string[] | null;
          strengths_en: string[] | null;
          strengths_uz: string[] | null;
          updated_at: string;
        };
        Insert: {
          ai_error?: string | null;
          ai_interview_questions?: Json | null;
          created_at?: string;
          cv_storage_path?: string | null;
          full_name: string;
          gaps?: string[] | null;
          gaps_en?: string[] | null;
          gaps_uz?: string[] | null;
          hr_notes?: string | null;
          id?: string;
          invited_at?: string | null;
          job_posting_id: string;
          language_detected?: Database["public"]["Enums"]["detected_language"] | null;
          match_score?: number | null;
          one_line_summary?: string | null;
          one_line_summary_en?: string | null;
          one_line_summary_uz?: string | null;
          meets_requirements?: boolean | null;
          phone_number: string;
          requirements_responses?: Json | null;
          requirements_snapshot?: Json | null;
          retry_count?: number;
          status?: Database["public"]["Enums"]["candidate_status"];
          strengths?: string[] | null;
          strengths_en?: string[] | null;
          strengths_uz?: string[] | null;
          updated_at?: string;
        };
        Update: {
          ai_error?: string | null;
          ai_interview_questions?: Json | null;
          created_at?: string;
          cv_storage_path?: string | null;
          full_name?: string;
          gaps?: string[] | null;
          gaps_en?: string[] | null;
          gaps_uz?: string[] | null;
          hr_notes?: string | null;
          id?: string;
          invited_at?: string | null;
          job_posting_id?: string;
          language_detected?: Database["public"]["Enums"]["detected_language"] | null;
          match_score?: number | null;
          one_line_summary?: string | null;
          one_line_summary_en?: string | null;
          one_line_summary_uz?: string | null;
          meets_requirements?: boolean | null;
          phone_number?: string;
          requirements_responses?: Json | null;
          requirements_snapshot?: Json | null;
          retry_count?: number;
          status?: Database["public"]["Enums"]["candidate_status"];
          strengths?: string[] | null;
          strengths_en?: string[] | null;
          strengths_uz?: string[] | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "candidates_job_posting_id_fkey";
            columns: ["job_posting_id"];
            isOneToOne: false;
            referencedRelation: "job_postings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "candidates_job_posting_id_fkey";
            columns: ["job_posting_id"];
            isOneToOne: false;
            referencedRelation: "job_postings_with_counts";
            referencedColumns: ["id"];
          },
        ];
      };
      companies: {
        Row: {
          created_at: string;
          default_locale: string;
          deleted_at: string | null;
          id: string;
          logo_url: string | null;
          name: string;
          slug: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          default_locale?: string;
          deleted_at?: string | null;
          id?: string;
          logo_url?: string | null;
          name: string;
          slug: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          default_locale?: string;
          deleted_at?: string | null;
          id?: string;
          logo_url?: string | null;
          name?: string;
          slug?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      company_invites: {
        Row: {
          accepted_at: string | null;
          company_id: string;
          created_at: string;
          email: string;
          expires_at: string;
          id: string;
          invited_by: string;
          role: Database["public"]["Enums"]["company_role"];
          token: string;
        };
        Insert: {
          accepted_at?: string | null;
          company_id: string;
          created_at?: string;
          email: string;
          expires_at?: string;
          id?: string;
          invited_by: string;
          role: Database["public"]["Enums"]["company_role"];
          token?: string;
        };
        Update: {
          accepted_at?: string | null;
          company_id?: string;
          created_at?: string;
          email?: string;
          expires_at?: string;
          id?: string;
          invited_by?: string;
          role?: Database["public"]["Enums"]["company_role"];
          token?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_invites_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_invites_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "company_usage_30d";
            referencedColumns: ["company_id"];
          },
          {
            foreignKeyName: "company_invites_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      company_members: {
        Row: {
          company_id: string;
          joined_at: string;
          role: Database["public"]["Enums"]["company_role"];
          user_id: string;
        };
        Insert: {
          company_id: string;
          joined_at?: string;
          role: Database["public"]["Enums"]["company_role"];
          user_id: string;
        };
        Update: {
          company_id?: string;
          joined_at?: string;
          role?: Database["public"]["Enums"]["company_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_members_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "company_usage_30d";
            referencedColumns: ["company_id"];
          },
          {
            foreignKeyName: "company_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      company_settings: {
        Row: {
          company_id: string;
          key: string;
          updated_at: string;
          value: string;
        };
        Insert: {
          company_id: string;
          key: string;
          updated_at?: string;
          value: string;
        };
        Update: {
          company_id?: string;
          key?: string;
          updated_at?: string;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_settings_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_settings_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "company_usage_30d";
            referencedColumns: ["company_id"];
          },
        ];
      };
      impersonation_sessions: {
        Row: {
          ended_at: string | null;
          id: string;
          operator_id: string;
          reason: string;
          started_at: string;
          target_user_id: string;
        };
        Insert: {
          ended_at?: string | null;
          id?: string;
          operator_id: string;
          reason: string;
          started_at?: string;
          target_user_id: string;
        };
        Update: {
          ended_at?: string | null;
          id?: string;
          operator_id?: string;
          reason?: string;
          started_at?: string;
          target_user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "impersonation_sessions_operator_id_fkey";
            columns: ["operator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "impersonation_sessions_target_user_id_fkey";
            columns: ["target_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      job_postings: {
        Row: {
          company_id: string;
          created_at: string;
          created_by: string | null;
          description: string;
          description_ru: string | null;
          description_uz: string | null;
          description_en: string | null;
          hard_requirements: Json;
          id: string;
          public_token: string;
          required_skills: string[];
          status: Database["public"]["Enums"]["job_status"];
          title: string;
          title_ru: string | null;
          title_uz: string | null;
          title_en: string | null;
          updated_at: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          created_by?: string | null;
          description: string;
          description_ru?: string | null;
          description_uz?: string | null;
          description_en?: string | null;
          hard_requirements?: Json;
          id?: string;
          public_token?: string;
          required_skills?: string[];
          status?: Database["public"]["Enums"]["job_status"];
          title: string;
          title_ru?: string | null;
          title_uz?: string | null;
          title_en?: string | null;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          description_ru?: string | null;
          description_uz?: string | null;
          description_en?: string | null;
          hard_requirements?: Json;
          id?: string;
          public_token?: string;
          required_skills?: string[];
          status?: Database["public"]["Enums"]["job_status"];
          title?: string;
          title_ru?: string | null;
          title_uz?: string | null;
          title_en?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_postings_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_postings_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "company_usage_30d";
            referencedColumns: ["company_id"];
          },
          {
            foreignKeyName: "job_postings_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          company_id: string;
          created_at: string;
          entity_id: string | null;
          entity_type: string | null;
          event: Database["public"]["Enums"]["notification_event_kind"];
          id: string;
          metadata: Json | null;
          read_at: string | null;
          title: string;
          user_id: string | null;
        };
        Insert: {
          body?: string | null;
          company_id: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          event: Database["public"]["Enums"]["notification_event_kind"];
          id?: string;
          metadata?: Json | null;
          read_at?: string | null;
          title: string;
          user_id?: string | null;
        };
        Update: {
          body?: string | null;
          company_id?: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          event?: Database["public"]["Enums"]["notification_event_kind"];
          id?: string;
          metadata?: Json | null;
          read_at?: string | null;
          title?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          company_id: string;
          created_at: string;
          digest_hour: number;
          email_interview_booked: boolean;
          email_interview_declined: boolean;
          email_new_application: boolean;
          email_quota_warning: boolean;
          email_sourcing_complete: boolean;
          email_sourcing_failed: boolean;
          email_top_pick: boolean;
          email_weekly_digest: boolean;
          id: string;
          inapp_ai_failed: boolean;
          inapp_interview_booked: boolean;
          inapp_interview_declined: boolean;
          inapp_new_application: boolean;
          inapp_sourcing_complete: boolean;
          inapp_sourcing_failed: boolean;
          inapp_top_pick: boolean;
          quiet_hours_end: number | null;
          quiet_hours_start: number | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          company_id: string;
          created_at?: string;
          digest_hour?: number;
          email_interview_booked?: boolean;
          email_interview_declined?: boolean;
          email_new_application?: boolean;
          email_quota_warning?: boolean;
          email_sourcing_complete?: boolean;
          email_sourcing_failed?: boolean;
          email_top_pick?: boolean;
          email_weekly_digest?: boolean;
          id?: string;
          inapp_ai_failed?: boolean;
          inapp_interview_booked?: boolean;
          inapp_interview_declined?: boolean;
          inapp_new_application?: boolean;
          inapp_sourcing_complete?: boolean;
          inapp_sourcing_failed?: boolean;
          inapp_top_pick?: boolean;
          quiet_hours_end?: number | null;
          quiet_hours_start?: number | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          company_id?: string;
          created_at?: string;
          digest_hour?: number;
          email_interview_booked?: boolean;
          email_interview_declined?: boolean;
          email_new_application?: boolean;
          email_quota_warning?: boolean;
          email_sourcing_complete?: boolean;
          email_sourcing_failed?: boolean;
          email_top_pick?: boolean;
          email_weekly_digest?: boolean;
          id?: string;
          inapp_ai_failed?: boolean;
          inapp_interview_booked?: boolean;
          inapp_interview_declined?: boolean;
          inapp_new_application?: boolean;
          inapp_sourcing_complete?: boolean;
          inapp_sourcing_failed?: boolean;
          inapp_top_pick?: boolean;
          quiet_hours_end?: number | null;
          quiet_hours_start?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      pending_operators: {
        Row: {
          added_at: string;
          email: string;
          reason: string | null;
        };
        Insert: {
          added_at?: string;
          email: string;
          reason?: string | null;
        };
        Update: {
          added_at?: string;
          email?: string;
          reason?: string | null;
        };
        Relationships: [];
      };
      phone_otp_attempts: {
        Row: {
          attempts: number;
          code_hash: string;
          consumed_at: string | null;
          created_at: string;
          expires_at: string;
          id: string;
          phone: string;
        };
        Insert: {
          attempts?: number;
          code_hash: string;
          consumed_at?: string | null;
          created_at?: string;
          expires_at: string;
          id?: string;
          phone: string;
        };
        Update: {
          attempts?: number;
          code_hash?: string;
          consumed_at?: string | null;
          created_at?: string;
          expires_at?: string;
          id?: string;
          phone?: string;
        };
        Relationships: [];
      };
      platform_settings: {
        Row: {
          key: string;
          updated_at: string;
          value: string;
        };
        Insert: {
          key: string;
          updated_at?: string;
          value: string;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          current_company_id: string | null;
          email: string;
          full_name: string;
          id: string;
          is_operator: boolean;
          locale: string;
          phone: string | null;
          phone_verified_at: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          current_company_id?: string | null;
          email: string;
          full_name: string;
          id: string;
          is_operator?: boolean;
          locale?: string;
          phone?: string | null;
          phone_verified_at?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          current_company_id?: string | null;
          email?: string;
          full_name?: string;
          id?: string;
          is_operator?: boolean;
          locale?: string;
          phone?: string | null;
          phone_verified_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_current_company_id_fkey";
            columns: ["current_company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_current_company_id_fkey";
            columns: ["current_company_id"];
            isOneToOne: false;
            referencedRelation: "company_usage_30d";
            referencedColumns: ["company_id"];
          },
        ];
      };
      rate_limits: {
        Row: {
          count: number;
          expires_at: string;
          key: string;
          window_start: string;
        };
        Insert: {
          count?: number;
          expires_at: string;
          key: string;
          window_start?: string;
        };
        Update: {
          count?: number;
          expires_at?: string;
          key?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      sourced_candidates: {
        Row: {
          company_id: string;
          contact: Json | null;
          created_at: string;
          expires_at: string;
          id: string;
          identity_key: string;
          meets_all_requirements: boolean;
          profile: Json;
          promoted_candidate_id: string | null;
          rank: number | null;
          requirement_results: Json;
          score: number | null;
          score_breakdown: Json | null;
          source: Database["public"]["Enums"]["source_kind"];
          source_ref: string | null;
          sourcing_search_id: string;
          verified: boolean;
        };
        Insert: {
          company_id: string;
          contact?: Json | null;
          created_at?: string;
          expires_at?: string;
          id?: string;
          identity_key: string;
          meets_all_requirements?: boolean;
          profile: Json;
          promoted_candidate_id?: string | null;
          rank?: number | null;
          requirement_results?: Json;
          score?: number | null;
          score_breakdown?: Json | null;
          source: Database["public"]["Enums"]["source_kind"];
          source_ref?: string | null;
          sourcing_search_id: string;
          verified?: boolean;
        };
        Update: {
          company_id?: string;
          contact?: Json | null;
          created_at?: string;
          expires_at?: string;
          id?: string;
          identity_key?: string;
          meets_all_requirements?: boolean;
          profile?: Json;
          promoted_candidate_id?: string | null;
          rank?: number | null;
          requirement_results?: Json;
          score?: number | null;
          score_breakdown?: Json | null;
          source?: Database["public"]["Enums"]["source_kind"];
          source_ref?: string | null;
          sourcing_search_id?: string;
          verified?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "sourced_candidates_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sourced_candidates_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "company_health";
            referencedColumns: ["company_id"];
          },
          {
            foreignKeyName: "sourced_candidates_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "company_usage_30d";
            referencedColumns: ["company_id"];
          },
          {
            foreignKeyName: "sourced_candidates_promoted_candidate_id_fkey";
            columns: ["promoted_candidate_id"];
            isOneToOne: false;
            referencedRelation: "candidate_latest_ai_cost";
            referencedColumns: ["candidate_id"];
          },
          {
            foreignKeyName: "sourced_candidates_promoted_candidate_id_fkey";
            columns: ["promoted_candidate_id"];
            isOneToOne: false;
            referencedRelation: "candidates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sourced_candidates_promoted_candidate_id_fkey";
            columns: ["promoted_candidate_id"];
            isOneToOne: false;
            referencedRelation: "candidates_ranked";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sourced_candidates_sourcing_search_id_fkey";
            columns: ["sourcing_search_id"];
            isOneToOne: false;
            referencedRelation: "sourcing_searches";
            referencedColumns: ["id"];
          },
        ];
      };
      sourcing_searches: {
        Row: {
          attempts: number;
          company_id: string;
          completed_at: string | null;
          cost_usd: number;
          created_at: string;
          error: string | null;
          id: string;
          input_tokens: number;
          job_posting_id: string;
          output_tokens: number;
          requested_by: string | null;
          requirement_profile: Json | null;
          sources: Database["public"]["Enums"]["source_kind"][];
          started_at: string | null;
          stats: Json;
          status: Database["public"]["Enums"]["sourcing_status"];
          updated_at: string;
        };
        Insert: {
          attempts?: number;
          company_id: string;
          completed_at?: string | null;
          cost_usd?: number;
          created_at?: string;
          error?: string | null;
          id?: string;
          input_tokens?: number;
          job_posting_id: string;
          output_tokens?: number;
          requested_by?: string | null;
          requirement_profile?: Json | null;
          sources: Database["public"]["Enums"]["source_kind"][];
          started_at?: string | null;
          stats?: Json;
          status?: Database["public"]["Enums"]["sourcing_status"];
          updated_at?: string;
        };
        Update: {
          attempts?: number;
          company_id?: string;
          completed_at?: string | null;
          cost_usd?: number;
          created_at?: string;
          error?: string | null;
          id?: string;
          input_tokens?: number;
          job_posting_id?: string;
          output_tokens?: number;
          requested_by?: string | null;
          requirement_profile?: Json | null;
          sources?: Database["public"]["Enums"]["source_kind"][];
          started_at?: string | null;
          stats?: Json;
          status?: Database["public"]["Enums"]["sourcing_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sourcing_searches_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sourcing_searches_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "company_health";
            referencedColumns: ["company_id"];
          },
          {
            foreignKeyName: "sourcing_searches_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "company_usage_30d";
            referencedColumns: ["company_id"];
          },
          {
            foreignKeyName: "sourcing_searches_job_posting_id_fkey";
            columns: ["job_posting_id"];
            isOneToOne: false;
            referencedRelation: "job_postings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sourcing_searches_job_posting_id_fkey";
            columns: ["job_posting_id"];
            isOneToOne: false;
            referencedRelation: "job_postings_with_counts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sourcing_searches_requested_by_fkey";
            columns: ["requested_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          company_id: string;
          cv_quota_limit: number;
          cv_quota_used: number;
          job_quota_limit: number;
          pro_renews_at: string | null;
          pro_started_at: string | null;
          sourcing_quota_limit: number;
          sourcing_quota_used: number;
          status: Database["public"]["Enums"]["subscription_status"];
          trial_ends_at: string;
          updated_at: string;
        };
        Insert: {
          company_id: string;
          cv_quota_limit?: number;
          cv_quota_used?: number;
          job_quota_limit?: number;
          pro_renews_at?: string | null;
          pro_started_at?: string | null;
          sourcing_quota_limit?: number;
          sourcing_quota_used?: number;
          status?: Database["public"]["Enums"]["subscription_status"];
          trial_ends_at?: string;
          updated_at?: string;
        };
        Update: {
          company_id?: string;
          cv_quota_limit?: number;
          cv_quota_used?: number;
          job_quota_limit?: number;
          pro_renews_at?: string | null;
          pro_started_at?: string | null;
          sourcing_quota_limit?: number;
          sourcing_quota_used?: number;
          status?: Database["public"]["Enums"]["subscription_status"];
          trial_ends_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: true;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: true;
            referencedRelation: "company_usage_30d";
            referencedColumns: ["company_id"];
          },
        ];
      };
    };
    Views: {
      candidates_ranked: {
        Row: {
          ai_error: string | null;
          created_at: string | null;
          cv_storage_path: string | null;
          full_name: string | null;
          gaps: string[] | null;
          hr_notes: string | null;
          id: string | null;
          invited_at: string | null;
          job_posting_id: string | null;
          language_detected: Database["public"]["Enums"]["detected_language"] | null;
          match_score: number | null;
          one_line_summary: string | null;
          phone_number: string | null;
          retry_count: number | null;
          status: Database["public"]["Enums"]["candidate_status"] | null;
          status_rank: number | null;
          strengths: string[] | null;
          updated_at: string | null;
        };
        Insert: {
          ai_error?: string | null;
          created_at?: string | null;
          cv_storage_path?: string | null;
          full_name?: string | null;
          gaps?: string[] | null;
          hr_notes?: string | null;
          id?: string | null;
          invited_at?: string | null;
          job_posting_id?: string | null;
          language_detected?: Database["public"]["Enums"]["detected_language"] | null;
          match_score?: number | null;
          one_line_summary?: string | null;
          phone_number?: string | null;
          retry_count?: number | null;
          status?: Database["public"]["Enums"]["candidate_status"] | null;
          status_rank?: never;
          strengths?: string[] | null;
          updated_at?: string | null;
        };
        Update: {
          ai_error?: string | null;
          created_at?: string | null;
          cv_storage_path?: string | null;
          full_name?: string | null;
          gaps?: string[] | null;
          hr_notes?: string | null;
          id?: string | null;
          invited_at?: string | null;
          job_posting_id?: string | null;
          language_detected?: Database["public"]["Enums"]["detected_language"] | null;
          match_score?: number | null;
          one_line_summary?: string | null;
          phone_number?: string | null;
          retry_count?: number | null;
          status?: Database["public"]["Enums"]["candidate_status"] | null;
          status_rank?: never;
          strengths?: string[] | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "candidates_job_posting_id_fkey";
            columns: ["job_posting_id"];
            isOneToOne: false;
            referencedRelation: "job_postings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "candidates_job_posting_id_fkey";
            columns: ["job_posting_id"];
            isOneToOne: false;
            referencedRelation: "job_postings_with_counts";
            referencedColumns: ["id"];
          },
        ];
      };
      company_usage_30d: {
        Row: {
          ai_cost_usd_30d: number | null;
          candidate_count_30d: number | null;
          company_id: string | null;
          name: string | null;
          storage_bytes: number | null;
        };
        Relationships: [];
      };
      job_postings_with_counts: {
        Row: {
          company_id: string | null;
          created_at: string | null;
          created_by: string | null;
          description: string | null;
          description_ru: string | null;
          description_uz: string | null;
          description_en: string | null;
          failed_count: number | null;
          hard_requirements: Json | null;
          id: string | null;
          invited_count: number | null;
          public_token: string | null;
          qualified_count: number | null;
          required_skills: string[] | null;
          screened_out_count: number | null;
          status: Database["public"]["Enums"]["job_status"] | null;
          title: string | null;
          title_ru: string | null;
          title_uz: string | null;
          title_en: string | null;
          total_count: number | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "job_postings_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_postings_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "company_usage_30d";
            referencedColumns: ["company_id"];
          },
          {
            foreignKeyName: "job_postings_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      storage_usage: {
        Row: {
          file_count: number | null;
          total_bytes: number | null;
        };
        Relationships: [];
      };
      interview_requests: {
        Row: {
          booked_at: string | null;
          booked_slot_id: string | null;
          candidate_id: string;
          candidate_note: string | null;
          company_id: string;
          created_at: string;
          created_by: string;
          duration_minutes: number;
          expires_at: string;
          hr_message: string | null;
          id: string;
          job_posting_id: string;
          location_detail: string | null;
          location_kind: Database["public"]["Enums"]["interview_location_kind"];
          public_token: string;
          status: Database["public"]["Enums"]["interview_request_status"];
          updated_at: string;
        };
        Insert: {
          booked_at?: string | null;
          booked_slot_id?: string | null;
          candidate_id: string;
          candidate_note?: string | null;
          company_id: string;
          created_at?: string;
          created_by: string;
          duration_minutes: number;
          expires_at?: string;
          hr_message?: string | null;
          id?: string;
          job_posting_id: string;
          location_detail?: string | null;
          location_kind: Database["public"]["Enums"]["interview_location_kind"];
          public_token?: string;
          status?: Database["public"]["Enums"]["interview_request_status"];
          updated_at?: string;
        };
        Update: {
          booked_at?: string | null;
          booked_slot_id?: string | null;
          candidate_id?: string;
          candidate_note?: string | null;
          company_id?: string;
          created_at?: string;
          created_by?: string;
          duration_minutes?: number;
          expires_at?: string;
          hr_message?: string | null;
          id?: string;
          job_posting_id?: string;
          location_detail?: string | null;
          location_kind?: Database["public"]["Enums"]["interview_location_kind"];
          public_token?: string;
          status?: Database["public"]["Enums"]["interview_request_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      interview_slots: {
        Row: {
          created_at: string;
          id: string;
          position: number;
          request_id: string;
          start_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          position: number;
          request_id: string;
          start_at: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          position?: number;
          request_id?: string;
          start_at?: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      consume_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number };
        Returns: {
          allowed: boolean;
          remaining: number;
          retry_after: number;
        }[];
      };
      get_storage_usage: {
        Args: never;
        Returns: {
          file_count: number;
          total_bytes: number;
        }[];
      };
      get_landing_metrics: {
        Args: never;
        Returns: {
          total_companies: number | null;
          total_cvs_processed_lifetime: number | null;
          cvs_processed_today: number | null;
          avg_screening_seconds: number | null;
          refreshed_at: string | null;
        }[];
      };
      increment_cv_quota: { Args: { p_company_id: string }; Returns: undefined };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { "": string }; Returns: string[] };
      try_consume_cv_quota: { Args: { p_company_id: string }; Returns: boolean };
      try_consume_sourcing_quota: {
        Args: { p_company_id: string; p_units?: number };
        Returns: Json;
      };
      refund_sourcing_quota: {
        Args: { p_company_id: string; p_units?: number };
        Returns: undefined;
      };
      claim_sourcing_search: {
        Args: { p_id: string; p_stale_minutes?: number };
        Returns: Database["public"]["Tables"]["sourcing_searches"]["Row"];
      };
      purge_expired_sourcing: { Args: never; Returns: undefined };
      user_companies: { Args: never; Returns: string[] };
      get_interview_request_by_token: { Args: { p_token: string }; Returns: Json };
      book_interview_slot: {
        Args: { p_token: string; p_slot_id: string };
        Returns: Json;
      };
      decline_interview_request: {
        Args: { p_token: string; p_reason: string };
        Returns: Json;
      };
    };
    Enums: {
      ai_attempt_status: "success" | "failed" | "timeout" | "rate_limited";
      candidate_status:
        | "pending_analysis"
        | "analyzing"
        | "analyzed"
        | "analysis_failed"
        | "invited"
        | "rejected"
        | "rejected_screening"
        | "unscored";
      company_role: "owner" | "admin" | "recruiter";
      detected_language: "uz" | "ru" | "en" | "other";
      job_status: "active" | "closed";
      subscription_status: "trialing" | "active" | "expired" | "cancelled";
      interview_request_status:
        | "pending"
        | "booked"
        | "declined"
        | "cancelled"
        | "expired";
      interview_location_kind:
        | "google_meet"
        | "telegram"
        | "phone"
        | "office"
        | "custom";
      notification_event_kind:
        | "new_application"
        | "top_pick"
        | "interview_booked"
        | "interview_declined"
        | "ai_failed"
        | "quota_warning"
        | "sourcing_complete"
        | "sourcing_failed";
      source_kind: "internal_pool" | "hh" | "telegram" | "linkedin_url";
      sourcing_status: "queued" | "running" | "completed" | "partial" | "failed";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ai_attempt_status: ["success", "failed", "timeout", "rate_limited"],
      candidate_status: [
        "pending_analysis",
        "analyzing",
        "analyzed",
        "analysis_failed",
        "invited",
        "rejected",
        "rejected_screening",
        "unscored",
      ],
      company_role: ["owner", "admin", "recruiter"],
      detected_language: ["uz", "ru", "en", "other"],
      job_status: ["active", "closed"],
      subscription_status: ["trialing", "active", "expired", "cancelled"],
      notification_event_kind: [
        "new_application",
        "top_pick",
        "interview_booked",
        "interview_declined",
        "ai_failed",
        "quota_warning",
        "sourcing_complete",
        "sourcing_failed",
      ],
      source_kind: ["internal_pool", "hh", "telegram", "linkedin_url"],
      sourcing_status: ["queued", "running", "completed", "partial", "failed"],
    },
  },
} as const;
