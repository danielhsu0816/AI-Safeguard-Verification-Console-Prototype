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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: number
          model_version: string
          source_bundle_version: string
          updated_at: string
          verifier_available: boolean
        }
        Insert: {
          id?: number
          model_version?: string
          source_bundle_version?: string
          updated_at?: string
          verifier_available?: boolean
        }
        Update: {
          id?: number
          model_version?: string
          source_bundle_version?: string
          updated_at?: string
          verifier_available?: boolean
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          actor_id: string
          evaluation_id: string | null
          event_id: string
          event_type: string
          failure_reason: string | null
          guardrail_decision: string | null
          model_version: string | null
          note_version: number | null
          reviewer_action: string | null
          rule_id: string | null
          source_bundle_version: string | null
          test_case_id: string | null
          timestamp: string
        }
        Insert: {
          actor_id: string
          evaluation_id?: string | null
          event_id?: string
          event_type: string
          failure_reason?: string | null
          guardrail_decision?: string | null
          model_version?: string | null
          note_version?: number | null
          reviewer_action?: string | null
          rule_id?: string | null
          source_bundle_version?: string | null
          test_case_id?: string | null
          timestamp?: string
        }
        Update: {
          actor_id?: string
          evaluation_id?: string | null
          event_id?: string
          event_type?: string
          failure_reason?: string | null
          guardrail_decision?: string | null
          model_version?: string | null
          note_version?: number | null
          reviewer_action?: string | null
          rule_id?: string | null
          source_bundle_version?: string | null
          test_case_id?: string | null
          timestamp?: string
        }
        Relationships: []
      }
      evaluations: {
        Row: {
          candidate_finding: Json | null
          checks: Json
          created_at: string
          decision: string
          evaluated_by: string
          execution_kind: string
          execution_trace: Json
          expected_decision_snapshot: string | null
          id: string
          model_version: string | null
          note_id: string | null
          note_version: number | null
          reason_codes: string[]
          registry_snapshot: Json
          rule_id: string | null
          safe_revision_prompt: string | null
          source_bundle_version: string | null
          test_case_id: string | null
        }
        Insert: {
          candidate_finding?: Json | null
          checks?: Json
          created_at?: string
          decision: string
          evaluated_by: string
          execution_kind?: string
          execution_trace?: Json
          expected_decision_snapshot?: string | null
          id?: string
          model_version?: string | null
          note_id?: string | null
          note_version?: number | null
          reason_codes?: string[]
          registry_snapshot?: Json
          rule_id?: string | null
          safe_revision_prompt?: string | null
          source_bundle_version?: string | null
          test_case_id?: string | null
        }
        Update: {
          candidate_finding?: Json | null
          checks?: Json
          created_at?: string
          decision?: string
          evaluated_by?: string
          execution_kind?: string
          execution_trace?: Json
          expected_decision_snapshot?: string | null
          id?: string
          model_version?: string | null
          note_id?: string | null
          note_version?: number | null
          reason_codes?: string[]
          registry_snapshot?: Json
          rule_id?: string | null
          safe_revision_prompt?: string | null
          source_bundle_version?: string | null
          test_case_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["case_id"]
          },
        ]
      }
      group2_acceptance_tests: {
        Row: {
          criterion: string
          execution_status: string
          expected: string
          original_record: Json
          owner: string
          review_status: string
          test_id: string
        }
        Insert: {
          criterion: string
          execution_status?: string
          expected: string
          original_record: Json
          owner: string
          review_status: string
          test_id: string
        }
        Update: {
          criterion?: string
          execution_status?: string
          expected?: string
          original_record?: Json
          owner?: string
          review_status?: string
          test_id?: string
        }
        Relationships: []
      }
      group2_decision_map: {
        Row: {
          decision: string
          group3_processing: string
          next_action: string
          original_record: Json
          show_explanation: string
          ui_label: string
        }
        Insert: {
          decision: string
          group3_processing: string
          next_action: string
          original_record: Json
          show_explanation: string
          ui_label: string
        }
        Update: {
          decision?: string
          group3_processing?: string
          next_action?: string
          original_record?: Json
          show_explanation?: string
          ui_label?: string
        }
        Relationships: []
      }
      group2_interface_fields: {
        Row: {
          field_key: string
          field_name: string
          group2_use: string
          layer: string
          original_record: Json
          position: number
          type_values: string
        }
        Insert: {
          field_key: string
          field_name: string
          group2_use: string
          layer: string
          original_record: Json
          position: number
          type_values: string
        }
        Update: {
          field_key?: string
          field_name?: string
          group2_use?: string
          layer?: string
          original_record?: Json
          position?: number
          type_values?: string
        }
        Relationships: []
      }
      group2_rule_map: {
        Row: {
          default_priority: string
          method: string
          original_record: Json
          original_wording: string
          rule_id: string
          validation_boundary: string
        }
        Insert: {
          default_priority: string
          method: string
          original_record: Json
          original_wording: string
          rule_id: string
          validation_boundary: string
        }
        Update: {
          default_priority?: string
          method?: string
          original_record?: Json
          original_wording?: string
          rule_id?: string
          validation_boundary?: string
        }
        Relationships: []
      }
      note_versions: {
        Row: {
          content: string
          created_at: string
          id: string
          note_id: string
          version: number
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          note_id: string
          version: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          note_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "note_versions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["note_id"]
          },
        ]
      }
      notes: {
        Row: {
          client_alias: string
          created_at: string
          note_id: string
          title: string
        }
        Insert: {
          client_alias: string
          created_at?: string
          note_id: string
          title: string
        }
        Update: {
          client_alias?: string
          created_at?: string
          note_id?: string
          title?: string
        }
        Relationships: []
      }
      review_actions: {
        Row: {
          action: string
          created_at: string
          evaluation_id: string
          id: string
          rationale: string
          reviewer_id: string
        }
        Insert: {
          action: string
          created_at?: string
          evaluation_id: string
          id?: string
          rationale: string
          reviewer_id: string
        }
        Update: {
          action?: string
          created_at?: string
          evaluation_id?: string
          id?: string
          rationale?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_actions_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      rules: {
        Row: {
          applicability: Json | null
          approved_by: string | null
          category: string
          check_type: string
          created_at: string
          effective_from: string | null
          effective_to: string | null
          required_pattern: string | null
          rule_id: string
          severity: string
          source_id: string | null
          status: string
          title: string
          version: number
        }
        Insert: {
          applicability?: Json | null
          approved_by?: string | null
          category: string
          check_type: string
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          required_pattern?: string | null
          rule_id: string
          severity: string
          source_id?: string | null
          status?: string
          title: string
          version?: number
        }
        Update: {
          applicability?: Json | null
          approved_by?: string | null
          category?: string
          check_type?: string
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          required_pattern?: string | null
          rule_id?: string
          severity?: string
          source_id?: string | null
          status?: string
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "rules_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["source_id"]
          },
        ]
      }
      sources: {
        Row: {
          approval_status: string
          approved_passage: string | null
          content_hash: string | null
          created_at: string
          document_version: string
          effective_date: string | null
          issuing_organization: string
          jurisdiction: string | null
          passage_hash: string | null
          payer: string | null
          retrieved_date: string | null
          service_type: string | null
          source_id: string
          source_type: string
          title: string
          verified_url: string | null
        }
        Insert: {
          approval_status?: string
          approved_passage?: string | null
          content_hash?: string | null
          created_at?: string
          document_version?: string
          effective_date?: string | null
          issuing_organization: string
          jurisdiction?: string | null
          passage_hash?: string | null
          payer?: string | null
          retrieved_date?: string | null
          service_type?: string | null
          source_id: string
          source_type: string
          title: string
          verified_url?: string | null
        }
        Update: {
          approval_status?: string
          approved_passage?: string | null
          content_hash?: string | null
          created_at?: string
          document_version?: string
          effective_date?: string | null
          issuing_organization?: string
          jurisdiction?: string | null
          passage_hash?: string | null
          payer?: string | null
          retrieved_date?: string | null
          service_type?: string | null
          source_id?: string
          source_type?: string
          title?: string
          verified_url?: string | null
        }
        Relationships: []
      }
      test_cases: {
        Row: {
          actual_decision: string | null
          candidate_finding: Json
          case_id: string
          created_at: string
          evidence_check: string | null
          execution_status: string
          expected_guardrail_decision: string
          expected_safe_feedback: string | null
          failure_mode: string
          forbidden_output: string | null
          import_bundle: string | null
          last_run_at: string | null
          note_id: string | null
          note_version: number | null
          original_record: Json | null
          payer: string | null
          profile_id: string | null
          proposed_priority: string
          review_status: string
          service_type: string | null
          synthetic_input: string
          target_rule_ids: string[]
          title: string
        }
        Insert: {
          actual_decision?: string | null
          candidate_finding?: Json
          case_id: string
          created_at?: string
          evidence_check?: string | null
          execution_status?: string
          expected_guardrail_decision: string
          expected_safe_feedback?: string | null
          failure_mode: string
          forbidden_output?: string | null
          import_bundle?: string | null
          last_run_at?: string | null
          note_id?: string | null
          note_version?: number | null
          original_record?: Json | null
          payer?: string | null
          profile_id?: string | null
          proposed_priority?: string
          review_status?: string
          service_type?: string | null
          synthetic_input: string
          target_rule_ids?: string[]
          title: string
        }
        Update: {
          actual_decision?: string | null
          candidate_finding?: Json
          case_id?: string
          created_at?: string
          evidence_check?: string | null
          execution_status?: string
          expected_guardrail_decision?: string
          expected_safe_feedback?: string | null
          failure_mode?: string
          forbidden_output?: string | null
          import_bundle?: string | null
          last_run_at?: string | null
          note_id?: string | null
          note_version?: number | null
          original_record?: Json | null
          payer?: string | null
          profile_id?: string | null
          proposed_priority?: string
          review_status?: string
          service_type?: string | null
          synthetic_input?: string
          target_rule_ids?: string[]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_cases_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["note_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "reviewer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "reviewer"],
    },
  },
} as const
