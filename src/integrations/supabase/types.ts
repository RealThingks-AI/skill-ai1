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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          action_type: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          module: string
          record_reference: string | null
          user_id: string
          username: string
        }
        Insert: {
          action_type: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          module: string
          record_reference?: string | null
          user_id: string
          username: string
        }
        Update: {
          action_type?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          module?: string
          record_reference?: string | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      approval_audit_logs: {
        Row: {
          action: string
          approver_comment: string | null
          approver_id: string
          created_at: string
          employee_comment: string | null
          id: string
          metadata: Json | null
          new_status: string | null
          previous_status: string | null
          rating_id: string
        }
        Insert: {
          action: string
          approver_comment?: string | null
          approver_id: string
          created_at?: string
          employee_comment?: string | null
          id?: string
          metadata?: Json | null
          new_status?: string | null
          previous_status?: string | null
          rating_id: string
        }
        Update: {
          action?: string
          approver_comment?: string | null
          approver_id?: string
          created_at?: string
          employee_comment?: string | null
          id?: string
          metadata?: Json | null
          new_status?: string | null
          previous_status?: string | null
          rating_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_audit_logs_rating_id_fkey"
            columns: ["rating_id"]
            isOneToOne: false
            referencedRelation: "employee_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_history: {
        Row: {
          action: string
          approver_id: string
          comment: string | null
          created_at: string
          id: string
          new_rating: string | null
          previous_rating: string | null
          rating_history_id: string
        }
        Insert: {
          action: string
          approver_id: string
          comment?: string | null
          created_at?: string
          id?: string
          new_rating?: string | null
          previous_rating?: string | null
          rating_history_id: string
        }
        Update: {
          action?: string
          approver_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          new_rating?: string | null
          previous_rating?: string | null
          rating_history_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_history_rating_history_id_fkey"
            columns: ["rating_history_id"]
            isOneToOne: false
            referencedRelation: "skill_rating_history"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_logs: {
        Row: {
          action: string
          approver_comment: string | null
          approver_id: string
          created_at: string | null
          employee_comment: string | null
          id: string
          new_rating: string | null
          previous_rating: string | null
          rating_id: string
        }
        Insert: {
          action: string
          approver_comment?: string | null
          approver_id: string
          created_at?: string | null
          employee_comment?: string | null
          id?: string
          new_rating?: string | null
          previous_rating?: string | null
          rating_id: string
        }
        Update: {
          action?: string
          approver_comment?: string | null
          approver_id?: string
          created_at?: string | null
          employee_comment?: string | null
          id?: string
          new_rating?: string | null
          previous_rating?: string | null
          rating_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_logs_rating_id_fkey"
            columns: ["rating_id"]
            isOneToOne: false
            referencedRelation: "employee_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      backup_history: {
        Row: {
          backup_name: string
          backup_type: string
          created_at: string
          created_by: string
          file_size: number
          id: string
          metadata: Json | null
          record_count: number
          storage_path: string | null
          table_count: number
        }
        Insert: {
          backup_name: string
          backup_type: string
          created_at?: string
          created_by: string
          file_size: number
          id?: string
          metadata?: Json | null
          record_count: number
          storage_path?: string | null
          table_count: number
        }
        Update: {
          backup_name?: string
          backup_type?: string
          created_at?: string
          created_by?: string
          file_size?: number
          id?: string
          metadata?: Json | null
          record_count?: number
          storage_path?: string | null
          table_count?: number
        }
        Relationships: []
      }
      classification_rules: {
        Row: {
          conditions: Json
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          is_active: boolean
          level: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          conditions?: Json
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          level: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          conditions?: Json
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          level?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      employee_ratings: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approver_comment: string | null
          created_at: string
          id: string
          na_status: boolean | null
          next_upgrade_date: string | null
          rating: string
          self_comment: string | null
          skill_id: string
          status: string
          submitted_at: string | null
          subskill_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approver_comment?: string | null
          created_at?: string
          id?: string
          na_status?: boolean | null
          next_upgrade_date?: string | null
          rating: string
          self_comment?: string | null
          skill_id: string
          status?: string
          submitted_at?: string | null
          subskill_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approver_comment?: string | null
          created_at?: string
          id?: string
          na_status?: boolean | null
          next_upgrade_date?: string | null
          rating?: string
          self_comment?: string | null
          skill_id?: string
          status?: string
          submitted_at?: string | null
          subskill_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_ratings_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_ratings_subskill_id_fkey"
            columns: ["subskill_id"]
            isOneToOne: false
            referencedRelation: "subskills"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_progress_history: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          milestone_reached: string | null
          new_rating: string
          notes: string | null
          previous_rating: string | null
          progress_percentage: number
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          milestone_reached?: string | null
          new_rating: string
          notes?: string | null
          previous_rating?: string | null
          progress_percentage: number
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          milestone_reached?: string | null
          new_rating?: string
          notes?: string | null
          previous_rating?: string | null
          progress_percentage?: number
        }
        Relationships: []
      }
      import_export_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_name: string
          entity_type: string
          id: string
          log_level: string
          operation_type: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_name: string
          entity_type: string
          id?: string
          log_level: string
          operation_type: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_name?: string
          entity_type?: string
          id?: string
          log_level?: string
          operation_type?: string
          user_id?: string
        }
        Relationships: []
      }
      leaderboard_history: {
        Row: {
          created_at: string
          id: string
          rank_position: number
          total_xp: number
          user_id: string
          week_start_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          rank_position: number
          total_xp: number
          user_id: string
          week_start_date: string
        }
        Update: {
          created_at?: string
          id?: string
          rank_position?: number
          total_xp?: number
          user_id?: string
          week_start_date?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          performed_by: string | null
          read: boolean
          related_record_id: string | null
          related_record_route: string | null
          related_record_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          performed_by?: string | null
          read?: boolean
          related_record_id?: string | null
          related_record_route?: string | null
          related_record_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          performed_by?: string | null
          read?: boolean
          related_record_id?: string | null
          related_record_route?: string | null
          related_record_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      page_access: {
        Row: {
          has_access: boolean
          id: string
          page_id: string
          role_name: string
          updated_at: string | null
        }
        Insert: {
          has_access?: boolean
          id?: string
          page_id: string
          role_name: string
          updated_at?: string | null
        }
        Update: {
          has_access?: boolean
          id?: string
          page_id?: string
          role_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_access_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          route: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          route: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          route?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      password_change_logs: {
        Row: {
          changed_by_id: string
          changed_by_username: string
          created_at: string
          id: string
          trigger_type: string
          user_id: string
          username: string
        }
        Insert: {
          changed_by_id: string
          changed_by_username: string
          created_at?: string
          id?: string
          trigger_type: string
          user_id: string
          username: string
        }
        Update: {
          changed_by_id?: string
          changed_by_username?: string
          created_at?: string
          id?: string
          trigger_type?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      personal_goals: {
        Row: {
          completed_at: string | null
          created_at: string
          current_rating: string | null
          id: string
          motivation_notes: string | null
          progress_percentage: number | null
          skill_id: string
          status: string
          target_date: string
          target_rating: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_rating?: string | null
          id?: string
          motivation_notes?: string | null
          progress_percentage?: number | null
          skill_id: string
          status?: string
          target_date: string
          target_rating: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_rating?: string | null
          id?: string
          motivation_notes?: string | null
          progress_percentage?: number | null
          skill_id?: string
          status?: string
          target_date?: string
          target_rating?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          last_login: string | null
          role: string
          status: string | null
          tech_lead_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email: string
          full_name: string
          id?: string
          last_login?: string | null
          role?: string
          status?: string | null
          tech_lead_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          last_login?: string | null
          role?: string
          status?: string | null
          tech_lead_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tech_lead_id_fkey"
            columns: ["tech_lead_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      project_allocation_history: {
        Row: {
          change_reason: string | null
          changed_by: string
          created_at: string
          id: string
          new_allocation: number
          previous_allocation: number | null
          project_id: string
          user_id: string
        }
        Insert: {
          change_reason?: string | null
          changed_by: string
          created_at?: string
          id?: string
          new_allocation: number
          previous_allocation?: number | null
          project_id: string
          user_id: string
        }
        Update: {
          change_reason?: string | null
          changed_by?: string
          created_at?: string
          id?: string
          new_allocation?: number
          previous_allocation?: number | null
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_allocation_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_assignments: {
        Row: {
          allocation_percentage: number
          assigned_by: string
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          allocation_percentage?: number
          assigned_by: string
          created_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          allocation_percentage?: number
          assigned_by?: string
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_member_monthly_allocations: {
        Row: {
          allocation_percentage: number
          created_at: string
          id: string
          month: string
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allocation_percentage: number
          created_at?: string
          id?: string
          month: string
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allocation_percentage?: number
          created_at?: string
          id?: string
          month?: string
          project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_member_monthly_allocations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_reminders: {
        Row: {
          created_at: string
          due_date: string
          id: string
          project_id: string
          reminder_type: string
          sent_at: string
          sent_to: string
        }
        Insert: {
          created_at?: string
          due_date: string
          id?: string
          project_id: string
          reminder_type?: string
          sent_at?: string
          sent_to: string
        }
        Update: {
          created_at?: string
          due_date?: string
          id?: string
          project_id?: string
          reminder_type?: string
          sent_at?: string
          sent_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_reminders_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_required_skills: {
        Row: {
          created_at: string
          id: string
          project_id: string
          required_rating: string
          skill_id: string
          subskill_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          required_rating?: string
          skill_id: string
          subskill_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          required_rating?: string
          skill_id?: string
          subskill_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_required_skills_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_required_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_required_skills_subskill_id_fkey"
            columns: ["subskill_id"]
            isOneToOne: false
            referencedRelation: "subskills"
            referencedColumns: ["id"]
          },
        ]
      }
      project_skill_validations: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          project_id: string
          skill_id: string
          subskill_id: string | null
          user_id: string
          validated_at: string
          validated_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          project_id: string
          skill_id: string
          subskill_id?: string | null
          user_id: string
          validated_at?: string
          validated_by: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          project_id?: string
          skill_id?: string
          subskill_id?: string | null
          user_id?: string
          validated_at?: string
          validated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_skill_validations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_skill_validations_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_skill_validations_subskill_id_fkey"
            columns: ["subskill_id"]
            isOneToOne: false
            referencedRelation: "subskills"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string
          customer_name: string | null
          description: string | null
          end_date: string | null
          id: string
          manpower_limit: number | null
          month_wise_manpower: Json | null
          name: string
          pending_changes: Json | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requested_status: string | null
          start_date: string | null
          status: string
          tech_lead_id: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by: string
          customer_name?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          manpower_limit?: number | null
          month_wise_manpower?: Json | null
          name: string
          pending_changes?: Json | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requested_status?: string | null
          start_date?: string | null
          status?: string
          tech_lead_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string
          customer_name?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          manpower_limit?: number | null
          month_wise_manpower?: Json | null
          name?: string
          pending_changes?: Json | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requested_status?: string | null
          start_date?: string | null
          status?: string
          tech_lead_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      report_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          file_path: string | null
          filters: Json | null
          generated_by: string
          id: string
          records_processed: number | null
          report_name: string
          report_type: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          file_path?: string | null
          filters?: Json | null
          generated_by: string
          id?: string
          records_processed?: number | null
          report_name: string
          report_type: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          file_path?: string | null
          filters?: Json | null
          generated_by?: string
          id?: string
          records_processed?: number | null
          report_name?: string
          report_type?: string
          status?: string
        }
        Relationships: []
      }
      skill_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      skill_explorer_presets: {
        Row: {
          created_at: string
          id: string
          preset_name: string
          selections: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          preset_name: string
          selections: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          preset_name?: string
          selections?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      skill_rating_history: {
        Row: {
          created_at: string
          id: string
          rated_by: string | null
          rating: string
          rating_comment: string | null
          rating_type: string
          skill_id: string
          status: string
          subskill_id: string | null
          superseded_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          rated_by?: string | null
          rating: string
          rating_comment?: string | null
          rating_type: string
          skill_id: string
          status?: string
          subskill_id?: string | null
          superseded_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          rated_by?: string | null
          rating?: string
          rating_comment?: string | null
          rating_type?: string
          skill_id?: string
          status?: string
          subskill_id?: string | null
          superseded_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      skills: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "skill_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      subskill_rating_history: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approver_comment: string | null
          archived_at: string
          created_at: string
          id: string
          rating: string
          self_comment: string | null
          skill_id: string
          status: string
          subskill_id: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approver_comment?: string | null
          archived_at?: string
          created_at?: string
          id?: string
          rating: string
          self_comment?: string | null
          skill_id: string
          status: string
          subskill_id: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approver_comment?: string | null
          archived_at?: string
          created_at?: string
          id?: string
          rating?: string
          self_comment?: string | null
          skill_id?: string
          status?: string
          subskill_id?: string
          user_id?: string
        }
        Relationships: []
      }
      subskills: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          skill_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          skill_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          skill_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subskills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      training_budgets: {
        Row: {
          allocated_budget: number
          created_at: string
          department: string | null
          fiscal_year: number
          id: string
          updated_at: string
          used_budget: number
        }
        Insert: {
          allocated_budget?: number
          created_at?: string
          department?: string | null
          fiscal_year: number
          id?: string
          updated_at?: string
          used_budget?: number
        }
        Update: {
          allocated_budget?: number
          created_at?: string
          department?: string | null
          fiscal_year?: number
          id?: string
          updated_at?: string
          used_budget?: number
        }
        Relationships: []
      }
      training_participation: {
        Row: {
          completion_date: string | null
          cost: number | null
          created_at: string
          id: string
          skill_category_id: string | null
          start_date: string | null
          status: string
          training_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completion_date?: string | null
          cost?: number | null
          created_at?: string
          id?: string
          skill_category_id?: string | null
          start_date?: string | null
          status?: string
          training_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completion_date?: string | null
          cost?: number | null
          created_at?: string
          id?: string
          skill_category_id?: string | null
          start_date?: string | null
          status?: string
          training_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_participation_skill_category_id_fkey"
            columns: ["skill_category_id"]
            isOneToOne: false
            referencedRelation: "skill_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_name: string
          achievement_type: string
          badge_icon: string | null
          description: string | null
          earned_at: string
          goal_id: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          achievement_name: string
          achievement_type: string
          badge_icon?: string | null
          description?: string | null
          earned_at?: string
          goal_id?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          achievement_name?: string
          achievement_type?: string
          badge_icon?: string | null
          description?: string | null
          earned_at?: string
          goal_id?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_category_preferences: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
          visible_category_ids: string[]
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          visible_category_ids?: string[]
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          visible_category_ids?: string[]
        }
        Relationships: []
      }
      user_gamification: {
        Row: {
          best_streak: number | null
          created_at: string
          current_streak: number | null
          goals_achieved_count: number | null
          goals_set_count: number | null
          id: string
          last_goal_achieved_date: string | null
          level: number | null
          total_xp: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          best_streak?: number | null
          created_at?: string
          current_streak?: number | null
          goals_achieved_count?: number | null
          goals_set_count?: number | null
          id?: string
          last_goal_achieved_date?: string | null
          level?: number | null
          total_xp?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          best_streak?: number | null
          created_at?: string
          current_streak?: number | null
          goals_achieved_count?: number | null
          goals_set_count?: number | null
          id?: string
          last_goal_achieved_date?: string | null
          level?: number | null
          total_xp?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_skills: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          approver_comment: string | null
          created_at: string
          id: string
          rating: string
          self_comment: string | null
          skill_id: string
          status: string
          submitted_at: string | null
          subskill_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          approver_comment?: string | null
          created_at?: string
          id?: string
          rating: string
          self_comment?: string | null
          skill_id: string
          status?: string
          submitted_at?: string | null
          subskill_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          approver_comment?: string | null
          created_at?: string
          id?: string
          rating?: string
          self_comment?: string | null
          skill_id?: string
          status?: string
          submitted_at?: string | null
          subskill_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_skills_subskill_id_fkey"
            columns: ["subskill_id"]
            isOneToOne: false
            referencedRelation: "subskills"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_goal_progress: {
        Args: { current_rating_param: string; target_rating_param: string }
        Returns: number
      }
      calculate_next_upgrade_date: {
        Args: { approved_at_param: string }
        Returns: string
      }
      can_upgrade_rating: {
        Args: {
          approved_at_param: string
          current_rating_param: string
          current_status_param: string
          target_rating_param: string
        }
        Returns: boolean
      }
      cleanup_old_notifications: { Args: never; Returns: undefined }
      delete_member_monthly_allocation: {
        Args: { p_month: string; p_project_id: string; p_user_id: string }
        Returns: undefined
      }
      delete_project_member_allocations: {
        Args: { p_project_id: string }
        Returns: undefined
      }
      delete_user_project_allocations: {
        Args: { p_project_id: string; p_user_id: string }
        Returns: undefined
      }
      get_current_user_role: { Args: never; Returns: string }
      get_my_tech_lead_id: { Args: never; Returns: string }
      get_project_member_allocations: {
        Args: { p_project_id: string }
        Returns: {
          allocation_percentage: number
          month: string
          user_id: string
        }[]
      }
      get_user_available_capacity: {
        Args: { user_id_param: string }
        Returns: number
      }
      get_user_monthly_allocation: {
        Args: { month_param: string; user_id_param: string }
        Returns: number
      }
      get_user_monthly_available_capacity: {
        Args: { month_param: string; user_id_param: string }
        Returns: number
      }
      get_user_total_allocation: {
        Args: { user_id_param: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_project_teammate: {
        Args: { _target_user_id: string }
        Returns: boolean
      }
      send_goal_reminders: { Args: never; Returns: undefined }
      test_employee_rating_insert: {
        Args: {
          p_rating: string
          p_skill_id: string
          p_subskill_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      update_leaderboard_history: { Args: never; Returns: undefined }
      upsert_member_monthly_allocation: {
        Args: {
          p_allocation_percentage: number
          p_month: string
          p_project_id: string
          p_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "employee" | "tech_lead" | "management" | "admin"
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
    Enums: {
      app_role: ["employee", "tech_lead", "management", "admin"],
    },
  },
} as const
