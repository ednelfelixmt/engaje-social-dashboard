// GERADO de supabase/schema.sql pelo catálogo PostgreSQL. Não editar manualmente.
// Datas e UUIDs: string. numeric/int8: number (contrato Supabase JS).
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type Database = {
  public: {
    Tables: {
      ad_campaigns: {
        Row: {
          id: string;
          organization_id: string;
          integration_id: string;
          platform: Database['public']['Enums']['integration_provider'];
          account_id: string;
          external_id: string;
          name: string;
          status: string | null;
          last_seen_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          integration_id: string;
          platform: Database['public']['Enums']['integration_provider'];
          account_id: string;
          external_id: string;
          name: string;
          status?: string | null;
          last_seen_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          integration_id?: string;
          platform?: Database['public']['Enums']['integration_provider'];
          account_id?: string;
          external_id?: string;
          name?: string;
          status?: string | null;
          last_seen_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "ad_campaigns_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"]; },
          { foreignKeyName: "ad_campaigns_organization_id_integration_id_fkey"; columns: ["organization_id","integration_id"]; isOneToOne: false; referencedRelation: "integrations"; referencedColumns: ["organization_id","id"]; }
        ];
      };
      branding: {
        Row: {
          organization_id: string;
          platform_name: string;
          logo_path: string | null;
          favicon_path: string | null;
          login_background_path: string | null;
          dashboard_background_path: string | null;
          primary_color: string;
          secondary_color: string;
          background_color: string;
          login_background_color: string;
          background_position: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          platform_name?: string;
          logo_path?: string | null;
          favicon_path?: string | null;
          login_background_path?: string | null;
          dashboard_background_path?: string | null;
          primary_color?: string;
          secondary_color?: string;
          background_color?: string;
          login_background_color?: string;
          background_position?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          organization_id?: string;
          platform_name?: string;
          logo_path?: string | null;
          favicon_path?: string | null;
          login_background_path?: string | null;
          dashboard_background_path?: string | null;
          primary_color?: string;
          secondary_color?: string;
          background_color?: string;
          login_background_color?: string;
          background_position?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "branding_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: true; referencedRelation: "organizations"; referencedColumns: ["id"]; }
        ];
      };
      client_asset_assignments: {
        Row: {
          id: string;
          organization_id: string;
          asset_id: string;
          integration_id: string | null;
          assignment_status: string;
          sync_enabled: boolean;
          assigned_by: string | null;
          assigned_at: string;
          removed_at: string | null;
          config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          asset_id: string;
          integration_id?: string | null;
          assignment_status?: string;
          sync_enabled?: boolean;
          assigned_by?: string | null;
          assigned_at?: string;
          removed_at?: string | null;
          config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          asset_id?: string;
          integration_id?: string | null;
          assignment_status?: string;
          sync_enabled?: boolean;
          assigned_by?: string | null;
          assigned_at?: string;
          removed_at?: string | null;
          config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "client_asset_assignments_asset_id_fkey"; columns: ["asset_id"]; isOneToOne: false; referencedRelation: "platform_assets"; referencedColumns: ["id"]; },
          { foreignKeyName: "client_asset_assignments_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"]; },
          { foreignKeyName: "client_asset_assignments_organization_id_integration_id_fkey"; columns: ["organization_id","integration_id"]; isOneToOne: false; referencedRelation: "integrations"; referencedColumns: ["organization_id","id"]; }
        ];
      };
      creatives: {
        Row: {
          id: string;
          organization_id: string;
          integration_id: string;
          platform: Database['public']['Enums']['integration_provider'];
          account_id: string;
          external_id: string;
          campaign_id: string | null;
          ad_id: string | null;
          kind: Database['public']['Enums']['creative_kind'];
          caption: string | null;
          media_url: string | null;
          thumbnail_url: string | null;
          storage_path: string | null;
          permalink: string | null;
          published_at: string | null;
          url_expires_at: string | null;
          lifetime_metrics: Json;
          synced_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          integration_id: string;
          platform: Database['public']['Enums']['integration_provider'];
          account_id: string;
          external_id: string;
          campaign_id?: string | null;
          ad_id?: string | null;
          kind: Database['public']['Enums']['creative_kind'];
          caption?: string | null;
          media_url?: string | null;
          thumbnail_url?: string | null;
          storage_path?: string | null;
          permalink?: string | null;
          published_at?: string | null;
          url_expires_at?: string | null;
          lifetime_metrics?: Json;
          synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          integration_id?: string;
          platform?: Database['public']['Enums']['integration_provider'];
          account_id?: string;
          external_id?: string;
          campaign_id?: string | null;
          ad_id?: string | null;
          kind?: Database['public']['Enums']['creative_kind'];
          caption?: string | null;
          media_url?: string | null;
          thumbnail_url?: string | null;
          storage_path?: string | null;
          permalink?: string | null;
          published_at?: string | null;
          url_expires_at?: string | null;
          lifetime_metrics?: Json;
          synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "creatives_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"]; },
          { foreignKeyName: "creatives_organization_id_integration_id_fkey"; columns: ["organization_id","integration_id"]; isOneToOne: false; referencedRelation: "integrations"; referencedColumns: ["organization_id","id"]; }
        ];
      };
      dashboard_configs: {
        Row: {
          organization_id: string;
          enabled_pages: (string)[];
          enabled_metrics: (string)[];
          widget_order: (string)[];
          only_platforms_with_data: boolean;
          comparison_enabled: boolean;
          preferred_revenue_source: Database['public']['Enums']['revenue_source'];
          target_roas: number | null;
          target_roi: number | null;
          target_cpa: number | null;
          target_revenue: number | null;
          target_purchases: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          enabled_pages?: (string)[];
          enabled_metrics?: (string)[];
          widget_order?: (string)[];
          only_platforms_with_data?: boolean;
          comparison_enabled?: boolean;
          preferred_revenue_source?: Database['public']['Enums']['revenue_source'];
          target_roas?: number | null;
          target_roi?: number | null;
          target_cpa?: number | null;
          target_revenue?: number | null;
          target_purchases?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          organization_id?: string;
          enabled_pages?: (string)[];
          enabled_metrics?: (string)[];
          widget_order?: (string)[];
          only_platforms_with_data?: boolean;
          comparison_enabled?: boolean;
          preferred_revenue_source?: Database['public']['Enums']['revenue_source'];
          target_roas?: number | null;
          target_roi?: number | null;
          target_cpa?: number | null;
          target_revenue?: number | null;
          target_purchases?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "dashboard_configs_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: true; referencedRelation: "organizations"; referencedColumns: ["id"]; }
        ];
      };
      integration_alerts: {
        Row: {
          id: string;
          organization_id: string;
          integration_id: string | null;
          connection_id: string | null;
          sync_job_id: string | null;
          alert_key: string;
          code: string;
          severity: string;
          status: string;
          title: string;
          detail: string | null;
          detected_at: string;
          last_seen_at: string;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          integration_id?: string | null;
          connection_id?: string | null;
          sync_job_id?: string | null;
          alert_key: string;
          code: string;
          severity: string;
          status?: string;
          title: string;
          detail?: string | null;
          detected_at?: string;
          last_seen_at?: string;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          integration_id?: string | null;
          connection_id?: string | null;
          sync_job_id?: string | null;
          alert_key?: string;
          code?: string;
          severity?: string;
          status?: string;
          title?: string;
          detail?: string | null;
          detected_at?: string;
          last_seen_at?: string;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "integration_alerts_connection_id_fkey"; columns: ["connection_id"]; isOneToOne: false; referencedRelation: "platform_connections"; referencedColumns: ["id"]; },
          { foreignKeyName: "integration_alerts_integration_id_fkey"; columns: ["integration_id"]; isOneToOne: false; referencedRelation: "integrations"; referencedColumns: ["id"]; },
          { foreignKeyName: "integration_alerts_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"]; },
          { foreignKeyName: "integration_alerts_sync_job_id_fkey"; columns: ["sync_job_id"]; isOneToOne: false; referencedRelation: "sync_jobs"; referencedColumns: ["id"]; }
        ];
      };
      integrations: {
        Row: {
          id: string;
          organization_id: string;
          provider: Database['public']['Enums']['integration_provider'];
          external_account_id: string;
          account_name: string;
          status: Database['public']['Enums']['integration_status'];
          is_enabled: boolean;
          credential_secret_id: string | null;
          scopes: (string)[];
          config: Json;
          last_sync_started_at: string | null;
          last_synced_at: string | null;
          last_error: string | null;
          token_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          provider: Database['public']['Enums']['integration_provider'];
          external_account_id: string;
          account_name: string;
          status?: Database['public']['Enums']['integration_status'];
          is_enabled?: boolean;
          credential_secret_id?: string | null;
          scopes?: (string)[];
          config?: Json;
          last_sync_started_at?: string | null;
          last_synced_at?: string | null;
          last_error?: string | null;
          token_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          provider?: Database['public']['Enums']['integration_provider'];
          external_account_id?: string;
          account_name?: string;
          status?: Database['public']['Enums']['integration_status'];
          is_enabled?: boolean;
          credential_secret_id?: string | null;
          scopes?: (string)[];
          config?: Json;
          last_sync_started_at?: string | null;
          last_synced_at?: string | null;
          last_error?: string | null;
          token_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "integrations_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"]; }
        ];
      };
      metrics_ads: {
        Row: {
          id: string;
          organization_id: string;
          integration_id: string;
          metric_date: string;
          platform: Database['public']['Enums']['integration_provider'];
          account_id: string;
          campaign_id: string;
          campaign_name: string;
          campaign_status: string | null;
          adset_id: string | null;
          ad_id: string;
          currency: string;
          spend: number;
          revenue: number | null;
          impressions: number | null;
          clicks: number | null;
          page_views: number | null;
          leads: number | null;
          message_leads: number | null;
          checkouts: number | null;
          purchases: number | null;
          attribution_window: string;
          synced_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          integration_id: string;
          metric_date: string;
          platform: Database['public']['Enums']['integration_provider'];
          account_id: string;
          campaign_id: string;
          campaign_name: string;
          campaign_status?: string | null;
          adset_id?: string | null;
          ad_id: string;
          currency: string;
          spend: number;
          revenue?: number | null;
          impressions?: number | null;
          clicks?: number | null;
          page_views?: number | null;
          leads?: number | null;
          message_leads?: number | null;
          checkouts?: number | null;
          purchases?: number | null;
          attribution_window: string;
          synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          integration_id?: string;
          metric_date?: string;
          platform?: Database['public']['Enums']['integration_provider'];
          account_id?: string;
          campaign_id?: string;
          campaign_name?: string;
          campaign_status?: string | null;
          adset_id?: string | null;
          ad_id?: string;
          currency?: string;
          spend?: number;
          revenue?: number | null;
          impressions?: number | null;
          clicks?: number | null;
          page_views?: number | null;
          leads?: number | null;
          message_leads?: number | null;
          checkouts?: number | null;
          purchases?: number | null;
          attribution_window?: string;
          synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "metrics_ads_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"]; },
          { foreignKeyName: "metrics_ads_organization_id_integration_id_fkey"; columns: ["organization_id","integration_id"]; isOneToOne: false; referencedRelation: "integrations"; referencedColumns: ["organization_id","id"]; }
        ];
      };
      metrics_ads_breakdowns: {
        Row: {
          id: string;
          organization_id: string;
          integration_id: string;
          metric_date: string;
          platform: Database['public']['Enums']['integration_provider'];
          account_id: string;
          campaign_id: string;
          campaign_name: string;
          dimension_type: 'audience' | 'creative' | 'gender' | 'age' | 'device' | 'state' | 'city';
          dimension_value: string;
          dimension_label: string;
          currency: string;
          spend: number;
          revenue: number | null;
          impressions: number | null;
          clicks: number | null;
          leads: number | null;
          message_leads: number | null;
          checkouts: number | null;
          purchases: number | null;
          attribution_window: string;
          synced_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          integration_id: string;
          metric_date: string;
          platform: Database['public']['Enums']['integration_provider'];
          account_id: string;
          campaign_id: string;
          campaign_name: string;
          dimension_type: 'audience' | 'creative' | 'gender' | 'age' | 'device' | 'state' | 'city';
          dimension_value: string;
          dimension_label: string;
          currency: string;
          spend: number;
          revenue?: number | null;
          impressions?: number | null;
          clicks?: number | null;
          leads?: number | null;
          message_leads?: number | null;
          checkouts?: number | null;
          purchases?: number | null;
          attribution_window: string;
          synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          integration_id?: string;
          metric_date?: string;
          platform?: Database['public']['Enums']['integration_provider'];
          account_id?: string;
          campaign_id?: string;
          campaign_name?: string;
          dimension_type?: 'audience' | 'creative' | 'gender' | 'age' | 'device' | 'state' | 'city';
          dimension_value?: string;
          dimension_label?: string;
          currency?: string;
          spend?: number;
          revenue?: number | null;
          impressions?: number | null;
          clicks?: number | null;
          leads?: number | null;
          message_leads?: number | null;
          checkouts?: number | null;
          purchases?: number | null;
          attribution_window?: string;
          synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "metrics_ads_breakdowns_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"]; },
          { foreignKeyName: "metrics_ads_breakdowns_organization_id_integration_id_fkey"; columns: ["organization_id","integration_id"]; isOneToOne: false; referencedRelation: "integrations"; referencedColumns: ["organization_id","id"]; }
        ];
      };
      metrics_crm: {
        Row: {
          id: string;
          organization_id: string;
          integration_id: string | null;
          spreadsheet_upload_id: string | null;
          source: Database['public']['Enums']['revenue_source'];
          metric_date: string;
          currency: string;
          channel: string;
          account_id: string;
          campaign_id: string;
          revenue: number | null;
          purchases: number | null;
          leads: number | null;
          checkouts: number | null;
          is_complete: boolean;
          synced_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          integration_id?: string | null;
          spreadsheet_upload_id?: string | null;
          source: Database['public']['Enums']['revenue_source'];
          metric_date: string;
          currency: string;
          channel?: string;
          account_id?: string;
          campaign_id?: string;
          revenue?: number | null;
          purchases?: number | null;
          leads?: number | null;
          checkouts?: number | null;
          is_complete?: boolean;
          synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          integration_id?: string | null;
          spreadsheet_upload_id?: string | null;
          source?: Database['public']['Enums']['revenue_source'];
          metric_date?: string;
          currency?: string;
          channel?: string;
          account_id?: string;
          campaign_id?: string;
          revenue?: number | null;
          purchases?: number | null;
          leads?: number | null;
          checkouts?: number | null;
          is_complete?: boolean;
          synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "metrics_crm_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"]; },
          { foreignKeyName: "metrics_crm_organization_id_integration_id_fkey"; columns: ["organization_id","integration_id"]; isOneToOne: false; referencedRelation: "integrations"; referencedColumns: ["organization_id","id"]; },
          { foreignKeyName: "metrics_crm_organization_id_spreadsheet_upload_id_fkey"; columns: ["organization_id","spreadsheet_upload_id"]; isOneToOne: false; referencedRelation: "spreadsheet_uploads"; referencedColumns: ["organization_id","id"]; }
        ];
      };
      metrics_organic: {
        Row: {
          id: string;
          organization_id: string;
          integration_id: string;
          creative_id: string;
          metric_date: string;
          platform: Database['public']['Enums']['integration_provider'];
          impressions: number | null;
          reach: number | null;
          clicks: number | null;
          page_views: number | null;
          likes: number | null;
          comments: number | null;
          shares: number | null;
          saves: number | null;
          video_views: number | null;
          synced_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          integration_id: string;
          creative_id: string;
          metric_date: string;
          platform: Database['public']['Enums']['integration_provider'];
          impressions?: number | null;
          reach?: number | null;
          clicks?: number | null;
          page_views?: number | null;
          likes?: number | null;
          comments?: number | null;
          shares?: number | null;
          saves?: number | null;
          video_views?: number | null;
          synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          integration_id?: string;
          creative_id?: string;
          metric_date?: string;
          platform?: Database['public']['Enums']['integration_provider'];
          impressions?: number | null;
          reach?: number | null;
          clicks?: number | null;
          page_views?: number | null;
          likes?: number | null;
          comments?: number | null;
          shares?: number | null;
          saves?: number | null;
          video_views?: number | null;
          synced_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "metrics_organic_organization_id_creative_id_fkey"; columns: ["organization_id","creative_id"]; isOneToOne: false; referencedRelation: "creatives"; referencedColumns: ["organization_id","id"]; },
          { foreignKeyName: "metrics_organic_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"]; },
          { foreignKeyName: "metrics_organic_organization_id_integration_id_fkey"; columns: ["organization_id","integration_id"]; isOneToOne: false; referencedRelation: "integrations"; referencedColumns: ["organization_id","id"]; }
        ];
      };
      organization_members: {
        Row: {
          organization_id: string;
          user_id: string;
          role: Database['public']['Enums']['member_role'];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          user_id: string;
          role?: Database['public']['Enums']['member_role'];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          organization_id?: string;
          user_id?: string;
          role?: Database['public']['Enums']['member_role'];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "organization_members_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"]; }
        ];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          is_agency: boolean;
          status: Database['public']['Enums']['organization_status'];
          currency: string;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          is_agency?: boolean;
          status?: Database['public']['Enums']['organization_status'];
          currency?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          is_agency?: boolean;
          status?: Database['public']['Enums']['organization_status'];
          currency?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [

        ];
      };
      platform_assets: {
        Row: {
          id: string;
          connection_id: string;
          platform_organization_id: string | null;
          provider: Database['public']['Enums']['integration_provider'];
          asset_type: string;
          external_id: string;
          name: string;
          asset_status: string;
          parent_external_id: string | null;
          metadata: Json;
          recommended: boolean;
          last_seen_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          connection_id: string;
          platform_organization_id?: string | null;
          provider: Database['public']['Enums']['integration_provider'];
          asset_type: string;
          external_id: string;
          name: string;
          asset_status?: string;
          parent_external_id?: string | null;
          metadata?: Json;
          recommended?: boolean;
          last_seen_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          connection_id?: string;
          platform_organization_id?: string | null;
          provider?: Database['public']['Enums']['integration_provider'];
          asset_type?: string;
          external_id?: string;
          name?: string;
          asset_status?: string;
          parent_external_id?: string | null;
          metadata?: Json;
          recommended?: boolean;
          last_seen_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "platform_assets_connection_id_fkey"; columns: ["connection_id"]; isOneToOne: false; referencedRelation: "platform_connections"; referencedColumns: ["id"]; },
          { foreignKeyName: "platform_assets_platform_organization_id_fkey"; columns: ["platform_organization_id"]; isOneToOne: false; referencedRelation: "platform_organizations"; referencedColumns: ["id"]; }
        ];
      };
      platform_connections: {
        Row: {
          id: string;
          agency_organization_id: string;
          target_organization_id: string | null;
          provider: Database['public']['Enums']['integration_provider'];
          external_user_id: string;
          account_name: string;
          status: Database['public']['Enums']['integration_status'];
          credential_secret_id: string | null;
          scopes: (string)[];
          config: Json;
          last_discovered_at: string | null;
          last_error: string | null;
          token_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agency_organization_id: string;
          target_organization_id?: string | null;
          provider: Database['public']['Enums']['integration_provider'];
          external_user_id: string;
          account_name: string;
          status?: Database['public']['Enums']['integration_status'];
          credential_secret_id?: string | null;
          scopes?: (string)[];
          config?: Json;
          last_discovered_at?: string | null;
          last_error?: string | null;
          token_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agency_organization_id?: string;
          target_organization_id?: string | null;
          provider?: Database['public']['Enums']['integration_provider'];
          external_user_id?: string;
          account_name?: string;
          status?: Database['public']['Enums']['integration_status'];
          credential_secret_id?: string | null;
          scopes?: (string)[];
          config?: Json;
          last_discovered_at?: string | null;
          last_error?: string | null;
          token_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "platform_connections_agency_organization_id_fkey"; columns: ["agency_organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"]; },
          { foreignKeyName: "platform_connections_target_organization_id_fkey"; columns: ["target_organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"]; }
        ];
      };
      platform_organizations: {
        Row: {
          id: string;
          connection_id: string;
          provider: Database['public']['Enums']['integration_provider'];
          external_id: string;
          name: string;
          organization_type: string;
          status: string;
          metadata: Json;
          last_seen_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          connection_id: string;
          provider: Database['public']['Enums']['integration_provider'];
          external_id: string;
          name: string;
          organization_type: string;
          status?: string;
          metadata?: Json;
          last_seen_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          connection_id?: string;
          provider?: Database['public']['Enums']['integration_provider'];
          external_id?: string;
          name?: string;
          organization_type?: string;
          status?: string;
          metadata?: Json;
          last_seen_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "platform_organizations_connection_id_fkey"; columns: ["connection_id"]; isOneToOne: false; referencedRelation: "platform_connections"; referencedColumns: ["id"]; }
        ];
      };
      profiles: {
        Row: {
          organization_id: string;
          user_id: string;
          display_name: string;
          avatar_path: string | null;
          locale: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          user_id: string;
          display_name?: string;
          avatar_path?: string | null;
          locale?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          organization_id?: string;
          user_id?: string;
          display_name?: string;
          avatar_path?: string | null;
          locale?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "profiles_organization_id_user_id_fkey"; columns: ["organization_id","user_id"]; isOneToOne: true; referencedRelation: "organization_members"; referencedColumns: ["organization_id","user_id"]; }
        ];
      };
      spreadsheet_uploads: {
        Row: {
          id: string;
          organization_id: string;
          uploaded_by: string;
          file_path: string;
          file_name: string;
          sha256: string;
          status: Database['public']['Enums']['upload_status'];
          rows_received: number;
          rows_imported: number;
          error_summary: string | null;
          processed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          uploaded_by: string;
          file_path: string;
          file_name: string;
          sha256: string;
          status?: Database['public']['Enums']['upload_status'];
          rows_received?: number;
          rows_imported?: number;
          error_summary?: string | null;
          processed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          uploaded_by?: string;
          file_path?: string;
          file_name?: string;
          sha256?: string;
          status?: Database['public']['Enums']['upload_status'];
          rows_received?: number;
          rows_imported?: number;
          error_summary?: string | null;
          processed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "spreadsheet_uploads_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"]; }
        ];
      };
      sync_configs: {
        Row: {
          id: string;
          assignment_id: string;
          enabled: boolean;
          metric_family: string | null;
          config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          enabled?: boolean;
          metric_family?: string | null;
          config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          assignment_id?: string;
          enabled?: boolean;
          metric_family?: string | null;
          config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "sync_configs_assignment_id_fkey"; columns: ["assignment_id"]; isOneToOne: true; referencedRelation: "client_asset_assignments"; referencedColumns: ["id"]; }
        ];
      };
      sync_jobs: {
        Row: {
          id: string;
          organization_id: string;
          connection_id: string | null;
          assignment_id: string | null;
          status: string;
          rows_processed: number;
          error_summary: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          connection_id?: string | null;
          assignment_id?: string | null;
          status?: string;
          rows_processed?: number;
          error_summary?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          connection_id?: string | null;
          assignment_id?: string | null;
          status?: string;
          rows_processed?: number;
          error_summary?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          { foreignKeyName: "sync_jobs_assignment_id_fkey"; columns: ["assignment_id"]; isOneToOne: false; referencedRelation: "client_asset_assignments"; referencedColumns: ["id"]; },
          { foreignKeyName: "sync_jobs_connection_id_fkey"; columns: ["connection_id"]; isOneToOne: false; referencedRelation: "platform_connections"; referencedColumns: ["id"]; },
          { foreignKeyName: "sync_jobs_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"]; }
        ];
      };
    };
    Views: {
      daily_performance: {
        Row: {
          organization_id: string | null;
          metric_date: string | null;
          currency: string | null;
          spend: number | null;
          ad_revenue: number | null;
          real_revenue: number | null;
          revenue: number | null;
          revenue_source: string | null;
          purchases: number | null;
          impressions: number | null;
          clicks: number | null;
          page_views: number | null;
          message_leads: number | null;
          leads: number | null;
          checkouts: number | null;
          ads_synced_at: string | null;
          real_synced_at: string | null;
          roas: number | null;
          roi: number | null;
          cpa: number | null;
          ctr: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      import_spreadsheet: { Args: { p_organization_id: string; p_file_path: string; p_file_name: string; p_sha256: string; p_rows: Json }; Returns: Json };
      is_super_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      login_branding: { Args: { p_slug: string }; Returns: Json };
      user_belongs_to_org: { Args: { p_organization_id: string }; Returns: boolean };
    };
    Enums: {
      creative_kind: "image" | "video" | "carousel" | "text";
      integration_provider: "meta_ads" | "facebook_organic" | "instagram_organic" | "google_ads" | "google_business" | "youtube" | "tiktok_ads" | "tiktok_organic" | "hubspot" | "rd_station" | "generic_crm" | "windsor" | "stract";
      integration_status: "disconnected" | "pending" | "connected" | "syncing" | "error" | "expired";
      member_role: "super_admin" | "client_admin" | "editor" | "viewer";
      organization_status: "active" | "paused";
      revenue_source: "crm" | "spreadsheet";
      upload_status: "pending" | "processing" | "completed" | "failed";
    };
    CompositeTypes: Record<never, never>;
  };
};
export type TableName = keyof Database['public']['Tables'];
export type Row<T extends TableName> = Database['public']['Tables'][T]['Row'];
export type Insert<T extends TableName> = Database['public']['Tables'][T]['Insert'];
export type Update<T extends TableName> = Database['public']['Tables'][T]['Update'];
export type DailyPerformance = Database['public']['Views']['daily_performance']['Row'];
export type MemberRole = Database['public']['Enums']['member_role'];
