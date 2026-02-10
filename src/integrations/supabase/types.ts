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
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_name: string | null
          entity_type: string
          id: string
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_name?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      csm_customer_feature_scores: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          feature_id: string
          id: string
          indicator_id: string
          period: string
          updated_at: string
          value: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          feature_id: string
          id?: string
          indicator_id: string
          period: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          feature_id?: string
          id?: string
          indicator_id?: string
          period?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "csm_customer_feature_scores_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csm_customer_feature_scores_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csm_customer_feature_scores_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      csm_feature_scores: {
        Row: {
          created_at: string
          created_by: string | null
          feature_id: string
          id: string
          indicator_id: string
          period: string
          rag_value: number | null
          score_band: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          feature_id: string
          id?: string
          indicator_id: string
          period: string
          rag_value?: number | null
          score_band?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          feature_id?: string
          id?: string
          indicator_id?: string
          period?: string
          rag_value?: number | null
          score_band?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "csm_feature_scores_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csm_feature_scores_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      csms: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      customer_feature_adoption: {
        Row: {
          adoption_score: number | null
          customer_id: string
          feature_id: string
          id: string
          last_updated: string | null
        }
        Insert: {
          adoption_score?: number | null
          customer_id: string
          feature_id: string
          id?: string
          last_updated?: string | null
        }
        Update: {
          adoption_score?: number | null
          customer_id?: string
          feature_id?: string
          id?: string
          last_updated?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_feature_adoption_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_feature_adoption_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_features: {
        Row: {
          created_at: string | null
          customer_id: string
          feature_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          feature_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          feature_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_features_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_features_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_indicator_values: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          indicator_id: string
          notes: string | null
          period: string
          rag_status: string | null
          updated_at: string | null
          value: number | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          indicator_id: string
          notes?: string | null
          period: string
          rag_status?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          indicator_id?: string
          notes?: string | null
          period?: string
          rag_status?: string | null
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_indicator_values_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_indicator_values_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          additional_features: string | null
          contact_person: string | null
          created_at: string
          csm_id: string | null
          deployment_type: string | null
          email: string | null
          id: string
          industry: string | null
          industry_id: string | null
          logo_url: string | null
          managed_services: boolean | null
          metadata: Json | null
          name: string
          region: string | null
          status: string
          tier: string
          updated_at: string
        }
        Insert: {
          additional_features?: string | null
          contact_person?: string | null
          created_at?: string
          csm_id?: string | null
          deployment_type?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          industry_id?: string | null
          logo_url?: string | null
          managed_services?: boolean | null
          metadata?: Json | null
          name: string
          region?: string | null
          status?: string
          tier?: string
          updated_at?: string
        }
        Update: {
          additional_features?: string | null
          contact_person?: string | null
          created_at?: string
          csm_id?: string | null
          deployment_type?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          industry_id?: string | null
          logo_url?: string | null
          managed_services?: boolean | null
          metadata?: Json | null
          name?: string
          region?: string | null
          status?: string
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_csm_id_fkey"
            columns: ["csm_id"]
            isOneToOne: false
            referencedRelation: "csms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_industry_id_fkey"
            columns: ["industry_id"]
            isOneToOne: false
            referencedRelation: "industries"
            referencedColumns: ["id"]
          },
        ]
      }
      department_access: {
        Row: {
          created_at: string | null
          department_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          department_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          department_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_access_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          org_objective_id: string | null
          owner: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          org_objective_id?: string | null
          owner?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          org_objective_id?: string | null
          owner?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_org_objective_id_fkey"
            columns: ["org_objective_id"]
            isOneToOne: false
            referencedRelation: "org_objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      features: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      formula_versions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          formula_expression: string
          formula_type: string
          id: string
          indicator_id: string | null
          is_active: boolean
          variables: Json | null
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          formula_expression: string
          formula_type?: string
          id?: string
          indicator_id?: string | null
          is_active?: boolean
          variables?: Json | null
          version_number?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          formula_expression?: string
          formula_type?: string
          id?: string
          indicator_id?: string | null
          is_active?: boolean
          variables?: Json | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "formula_versions_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      functional_objectives: {
        Row: {
          created_at: string | null
          department_id: string | null
          formula: string | null
          id: string
          name: string
          owner: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          formula?: string | null
          id?: string
          name: string
          owner?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          formula?: string | null
          id?: string
          name?: string
          owner?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "functional_objectives_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      indicator_config: {
        Row: {
          aggregation_method: string | null
          allowed_feature_categories: string[] | null
          allowed_industries: string[] | null
          allowed_regions: string[] | null
          allowed_statuses: string[] | null
          allowed_tiers: string[] | null
          created_at: string
          data_source: string | null
          id: string
          indicator_id: string
          time_window_days: number | null
          updated_at: string
        }
        Insert: {
          aggregation_method?: string | null
          allowed_feature_categories?: string[] | null
          allowed_industries?: string[] | null
          allowed_regions?: string[] | null
          allowed_statuses?: string[] | null
          allowed_tiers?: string[] | null
          created_at?: string
          data_source?: string | null
          id?: string
          indicator_id: string
          time_window_days?: number | null
          updated_at?: string
        }
        Update: {
          aggregation_method?: string | null
          allowed_feature_categories?: string[] | null
          allowed_industries?: string[] | null
          allowed_regions?: string[] | null
          allowed_statuses?: string[] | null
          allowed_tiers?: string[] | null
          created_at?: string
          data_source?: string | null
          id?: string
          indicator_id?: string
          time_window_days?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "indicator_config_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: true
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      indicator_customer_links: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string
          id: string
          impact_weight: number | null
          indicator_id: string
          notes: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          id?: string
          impact_weight?: number | null
          indicator_id: string
          notes?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          id?: string
          impact_weight?: number | null
          indicator_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indicator_customer_links_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_customer_links_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      indicator_feature_links: {
        Row: {
          created_at: string | null
          created_by: string | null
          feature_id: string
          id: string
          impact_weight: number | null
          indicator_id: string
          notes: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          feature_id: string
          id?: string
          impact_weight?: number | null
          indicator_id: string
          notes?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          feature_id?: string
          id?: string
          impact_weight?: number | null
          indicator_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indicator_feature_links_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_feature_links_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      indicator_history: {
        Row: {
          created_at: string | null
          created_by: string | null
          evidence_url: string | null
          id: string
          indicator_id: string | null
          no_evidence_reason: string | null
          notes: string | null
          period: string
          value: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          evidence_url?: string | null
          id?: string
          indicator_id?: string | null
          no_evidence_reason?: string | null
          notes?: string | null
          period: string
          value: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          evidence_url?: string | null
          id?: string
          indicator_id?: string | null
          no_evidence_reason?: string | null
          notes?: string | null
          period?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "indicator_history_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      indicator_snapshots: {
        Row: {
          calculated_at: string
          calculated_by: string | null
          calculated_value: number | null
          calculation_metadata: Json | null
          formula_version_id: string | null
          id: string
          indicator_id: string
          period: string
          rag_status: string | null
          rag_version_id: string | null
          rejected_records: number | null
          total_records_processed: number | null
          valid_records: number | null
        }
        Insert: {
          calculated_at?: string
          calculated_by?: string | null
          calculated_value?: number | null
          calculation_metadata?: Json | null
          formula_version_id?: string | null
          id?: string
          indicator_id: string
          period: string
          rag_status?: string | null
          rag_version_id?: string | null
          rejected_records?: number | null
          total_records_processed?: number | null
          valid_records?: number | null
        }
        Update: {
          calculated_at?: string
          calculated_by?: string | null
          calculated_value?: number | null
          calculation_metadata?: Json | null
          formula_version_id?: string | null
          id?: string
          indicator_id?: string
          period?: string
          rag_status?: string | null
          rag_version_id?: string | null
          rejected_records?: number | null
          total_records_processed?: number | null
          valid_records?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "indicator_snapshots_formula_version_id_fkey"
            columns: ["formula_version_id"]
            isOneToOne: false
            referencedRelation: "formula_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_snapshots_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicator_snapshots_rag_version_id_fkey"
            columns: ["rag_version_id"]
            isOneToOne: false
            referencedRelation: "rag_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      indicators: {
        Row: {
          created_at: string | null
          current_value: number | null
          data_source: string | null
          description: string | null
          evidence_type: string | null
          evidence_url: string | null
          formula: string | null
          frequency: string | null
          id: string
          indicator_type: string | null
          is_active: boolean | null
          key_result_id: string | null
          name: string
          no_evidence_reason: string | null
          rag_status: string | null
          target_value: number | null
          tier: string
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_value?: number | null
          data_source?: string | null
          description?: string | null
          evidence_type?: string | null
          evidence_url?: string | null
          formula?: string | null
          frequency?: string | null
          id?: string
          indicator_type?: string | null
          is_active?: boolean | null
          key_result_id?: string | null
          name: string
          no_evidence_reason?: string | null
          rag_status?: string | null
          target_value?: number | null
          tier?: string
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_value?: number | null
          data_source?: string | null
          description?: string | null
          evidence_type?: string | null
          evidence_url?: string | null
          formula?: string | null
          frequency?: string | null
          id?: string
          indicator_type?: string | null
          is_active?: boolean | null
          key_result_id?: string | null
          name?: string
          no_evidence_reason?: string | null
          rag_status?: string | null
          target_value?: number | null
          tier?: string
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indicators_key_result_id_fkey"
            columns: ["key_result_id"]
            isOneToOne: false
            referencedRelation: "key_results"
            referencedColumns: ["id"]
          },
        ]
      }
      industries: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      key_results: {
        Row: {
          created_at: string | null
          current_value: number | null
          end_date: string | null
          formula: string | null
          functional_objective_id: string | null
          id: string
          name: string
          owner: string | null
          start_date: string | null
          target_value: number | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_value?: number | null
          end_date?: string | null
          formula?: string | null
          functional_objective_id?: string | null
          id?: string
          name: string
          owner?: string | null
          start_date?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_value?: number | null
          end_date?: string | null
          formula?: string | null
          functional_objective_id?: string | null
          id?: string
          name?: string
          owner?: string | null
          start_date?: string | null
          target_value?: number | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "key_results_functional_objective_id_fkey"
            columns: ["functional_objective_id"]
            isOneToOne: false
            referencedRelation: "functional_objectives"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_rag_bands: {
        Row: {
          band_label: string
          id: string
          indicator_id: string
          rag_color: string
          rag_numeric: number
          sort_order: number
        }
        Insert: {
          band_label: string
          id?: string
          indicator_id: string
          rag_color: string
          rag_numeric: number
          sort_order?: number
        }
        Update: {
          band_label?: string
          id?: string
          indicator_id?: string
          rag_color?: string
          rag_numeric?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpi_rag_bands_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      org_objectives: {
        Row: {
          business_outcome: string | null
          classification: string
          color: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
          venture_id: string | null
        }
        Insert: {
          business_outcome?: string | null
          classification?: string
          color?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
          venture_id?: string | null
        }
        Update: {
          business_outcome?: string | null
          classification?: string
          color?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          venture_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_objectives_venture_id_fkey"
            columns: ["venture_id"]
            isOneToOne: false
            referencedRelation: "ventures"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rag_versions: {
        Row: {
          amber_threshold: number
          created_at: string
          created_by: string | null
          description: string | null
          green_threshold: number
          id: string
          indicator_id: string | null
          is_active: boolean
          rag_logic: string | null
          red_threshold: number
          version_number: number
        }
        Insert: {
          amber_threshold?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          green_threshold?: number
          id?: string
          indicator_id?: string | null
          is_active?: boolean
          rag_logic?: string | null
          red_threshold?: number
          version_number?: number
        }
        Update: {
          amber_threshold?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          green_threshold?: number
          id?: string
          indicator_id?: string | null
          is_active?: boolean
          rag_logic?: string | null
          red_threshold?: number
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "rag_versions_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_data_inputs: {
        Row: {
          created_at: string
          customer_id: string | null
          data_type: string
          data_value: number | null
          id: string
          indicator_id: string | null
          period: string
          record_date: string
          source_file: string | null
          validation_errors: Json | null
          validation_status: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          data_type: string
          data_value?: number | null
          id?: string
          indicator_id?: string | null
          period: string
          record_date: string
          source_file?: string | null
          validation_errors?: Json | null
          validation_status?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          data_type?: string
          data_value?: number | null
          id?: string
          indicator_id?: string | null
          period?: string
          record_date?: string
          source_file?: string | null
          validation_errors?: Json | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raw_data_inputs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raw_data_inputs_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      snapshot_explainability: {
        Row: {
          count_amber: number | null
          count_green: number | null
          count_red: number | null
          created_at: string
          data_breakdown: Json | null
          filters_applied: Json | null
          id: string
          rejection_reasons: Json | null
          snapshot_id: string
          total_customers: number | null
        }
        Insert: {
          count_amber?: number | null
          count_green?: number | null
          count_red?: number | null
          created_at?: string
          data_breakdown?: Json | null
          filters_applied?: Json | null
          id?: string
          rejection_reasons?: Json | null
          snapshot_id: string
          total_customers?: number | null
        }
        Update: {
          count_amber?: number | null
          count_green?: number | null
          count_red?: number | null
          created_at?: string
          data_breakdown?: Json | null
          filters_applied?: Json | null
          id?: string
          rejection_reasons?: Json | null
          snapshot_id?: string
          total_customers?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "snapshot_explainability_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: true
            referencedRelation: "indicator_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      ventures: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bulk_reset_indicators: {
        Args: { p_department_id: string }
        Returns: number
      }
      has_department_access: {
        Args: { _dept_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_department_head: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "viewer" | "department_head" | "csm"
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
      app_role: ["admin", "viewer", "department_head", "csm"],
    },
  },
} as const
