// Generated from the self-hosted database by scripts/supabase/gen-types.sh — do not edit.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      account_deletions: {
        Row: {
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      app_errors: {
        Row: {
          app_version: string | null
          build_version: string | null
          component_stack: string | null
          created_at: string
          device_model: string | null
          id: number
          install_id: string
          is_dev: boolean
          is_fatal: boolean
          kind: string
          message: string
          name: string | null
          occurred_at: string
          occurrences: number
          os_version: string | null
          platform: string
          runtime_version: string | null
          screen: string | null
          session_id: string
          stack: string | null
          update_id: string | null
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          build_version?: string | null
          component_stack?: string | null
          created_at?: string
          device_model?: string | null
          id?: never
          install_id: string
          is_dev?: boolean
          is_fatal?: boolean
          kind: string
          message: string
          name?: string | null
          occurred_at?: string
          occurrences?: number
          os_version?: string | null
          platform: string
          runtime_version?: string | null
          screen?: string | null
          session_id: string
          stack?: string | null
          update_id?: string | null
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          build_version?: string | null
          component_stack?: string | null
          created_at?: string
          device_model?: string | null
          id?: never
          install_id?: string
          is_dev?: boolean
          is_fatal?: boolean
          kind?: string
          message?: string
          name?: string | null
          occurred_at?: string
          occurrences?: number
          os_version?: string | null
          platform?: string
          runtime_version?: string | null
          screen?: string | null
          session_id?: string
          stack?: string | null
          update_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_errors_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_events: {
        Row: {
          app_version: string | null
          build_version: string | null
          created_at: string
          device_model: string | null
          id: number
          install_id: string
          is_dev: boolean
          name: string
          occurred_at: string
          os_version: string | null
          platform: string
          props: Json
          runtime_version: string | null
          session_id: string
          update_id: string | null
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          build_version?: string | null
          created_at?: string
          device_model?: string | null
          id?: never
          install_id: string
          is_dev?: boolean
          name: string
          occurred_at?: string
          os_version?: string | null
          platform: string
          props?: Json
          runtime_version?: string | null
          session_id: string
          update_id?: string | null
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          build_version?: string | null
          created_at?: string
          device_model?: string | null
          id?: never
          install_id?: string
          is_dev?: boolean
          name?: string
          occurred_at?: string
          os_version?: string | null
          platform?: string
          props?: Json
          runtime_version?: string | null
          session_id?: string
          update_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_events_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bikes: {
        Row: {
          brand: string
          category: string | null
          created_at: string
          displacement_cc: number | null
          id: string
          is_primary: boolean
          model: string
          model_id: string | null
          owner_id: string
          year: number | null
        }
        Insert: {
          brand: string
          category?: string | null
          created_at?: string
          displacement_cc?: number | null
          id?: string
          is_primary?: boolean
          model: string
          model_id?: string | null
          owner_id?: string
          year?: number | null
        }
        Update: {
          brand?: string
          category?: string | null
          created_at?: string
          displacement_cc?: number | null
          id?: string
          is_primary?: boolean
          model?: string
          model_id?: string | null
          owner_id?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bikes_owner_id_fkey"
            columns: ["owner_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id?: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          joined_at: string
          last_read_at: string | null
          muted: boolean
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          last_read_at?: string | null
          muted?: boolean
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_read_at?: string | null
          muted?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_group: boolean
          last_message_at: string | null
          last_message_preview: string | null
          title: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          last_message_at?: string | null
          last_message_preview?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          last_message_at?: string | null
          last_message_preview?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          context: Json
          created_at: string
          id: string
          message: string
          screenshot_paths: string[]
          topic: string
          user_id: string | null
        }
        Insert: {
          context?: Json
          created_at?: string
          id?: string
          message: string
          screenshot_paths?: string[]
          topic: string
          user_id?: string | null
        }
        Update: {
          context?: Json
          created_at?: string
          id?: string
          message?: string
          screenshot_paths?: string[]
          topic?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          accepted_at: string | null
          created_at: string
          followee_id: string
          follower_id: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          followee_id: string
          follower_id?: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          followee_id?: string
          follower_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_followee_id_fkey"
            columns: ["followee_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json
          body: string | null
          conversation_id: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          sender_id: string
        }
        Insert: {
          attachments?: Json
          body?: string | null
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          sender_id?: string
        }
        Update: {
          attachments?: Json
          body?: string | null
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_count: number
          actor_id: string | null
          body: string
          conversation_id: string | null
          created_at: string
          group_key: string | null
          id: string
          kind: string
          post_id: string | null
          pushed_at: string | null
          read_at: string | null
          recipient_id: string
          ride_id: string | null
          route_id: string | null
          title: string
        }
        Insert: {
          actor_count?: number
          actor_id?: string | null
          body: string
          conversation_id?: string | null
          created_at?: string
          group_key?: string | null
          id?: string
          kind: string
          post_id?: string | null
          pushed_at?: string | null
          read_at?: string | null
          recipient_id: string
          ride_id?: string | null
          route_id?: string | null
          title: string
        }
        Update: {
          actor_count?: number
          actor_id?: string | null
          body?: string
          conversation_id?: string | null
          created_at?: string
          group_key?: string | null
          id?: string
          kind?: string
          post_id?: string | null
          pushed_at?: string | null
          read_at?: string | null
          recipient_id?: string
          ride_id?: string | null
          route_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_ride_id_fkey"
            columns: ["ride_id"]
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_route_id_fkey"
            columns: ["route_id"]
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          centre: unknown
          district: string
          id: string
          name: string
          province: string
          search_text: string | null
        }
        Insert: {
          centre: unknown
          district?: string
          id: string
          name: string
          province: string
          search_text?: string | null
        }
        Update: {
          centre?: unknown
          district?: string
          id?: string
          name?: string
          province?: string
          search_text?: string | null
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          author_id: string
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
          text: string
        }
        Insert: {
          author_id?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
          text: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_author_id_fkey"
            columns: ["author_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          audience: string
          author_id: string
          comment_count: number
          created_at: string
          id: string
          like_count: number
          photo_paths: string[]
          ride_id: string | null
          ride_snapshot: Json | null
          search_text: string | null
          text: string | null
          updated_at: string
        }
        Insert: {
          audience?: string
          author_id?: string
          comment_count?: number
          created_at?: string
          id?: string
          like_count?: number
          photo_paths?: string[]
          ride_id?: string | null
          ride_snapshot?: Json | null
          search_text?: string | null
          text?: string | null
          updated_at?: string
        }
        Update: {
          audience?: string
          author_id?: string
          comment_count?: number
          created_at?: string
          id?: string
          like_count?: number
          photo_paths?: string[]
          ride_id?: string | null
          ride_snapshot?: Json | null
          search_text?: string | null
          text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_ride_id_fkey"
            columns: ["ride_id"]
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          bio: string | null
          city: string | null
          created_at: string
          follower_count: number
          following_count: number
          handle: string | null
          id: string
          is_official: boolean
          is_private: boolean
          name: string
          profile_completed: boolean
          ride_count: number
          ride_distance_m: number
          search_text: string | null
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          follower_count?: number
          following_count?: number
          handle?: string | null
          id: string
          is_official?: boolean
          is_private?: boolean
          name?: string
          profile_completed?: boolean
          ride_count?: number
          ride_distance_m?: number
          search_text?: string | null
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          follower_count?: number
          following_count?: number
          handle?: string | null
          id?: string
          is_official?: boolean
          is_private?: boolean
          name?: string
          profile_completed?: boolean
          ride_count?: number
          ride_distance_m?: number
          search_text?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          device_name: string | null
          platform: string | null
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_name?: string | null
          platform?: string | null
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_name?: string | null
          platform?: string | null
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          reporter_id: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          reporter_id?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_comments: {
        Row: {
          author_id: string
          created_at: string
          id: string
          ride_id: string
          text: string
        }
        Insert: {
          author_id?: string
          created_at?: string
          id?: string
          ride_id: string
          text: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          ride_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_comments_author_id_fkey"
            columns: ["author_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_comments_ride_id_fkey"
            columns: ["ride_id"]
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_likes: {
        Row: {
          created_at: string
          ride_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ride_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          ride_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_likes_ride_id_fkey"
            columns: ["ride_id"]
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_likes_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_saves: {
        Row: {
          created_at: string
          ride_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ride_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          ride_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_saves_ride_id_fkey"
            columns: ["ride_id"]
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_saves_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_tracks: {
        Row: {
          owner_id: string
          ride_id: string
          track: unknown
        }
        Insert: {
          owner_id: string
          ride_id: string
          track: unknown
        }
        Update: {
          owner_id?: string
          ride_id?: string
          track?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "ride_tracks_owner_id_fkey"
            columns: ["owner_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_tracks_ride_id_fkey"
            columns: ["ride_id"]
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      rides: {
        Row: {
          break_count: number
          break_s: number
          city: string | null
          comment_count: number
          created_at: string
          curve_count: number
          difficulty: string
          distance_m: number
          duration_s: number
          ended_at: string | null
          id: string
          like_count: number
          max_lean_left_deg: number | null
          max_lean_right_deg: number | null
          max_speed_mps: number
          notes: string
          owner_id: string
          photo_paths: string[]
          preview_path: unknown
          ride_type: string
          route_id: string | null
          route_name: string | null
          save_count: number
          search_text: string | null
          start_point: unknown
          started_at: string
          surface: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          break_count?: number
          break_s?: number
          city?: string | null
          comment_count?: number
          created_at?: string
          curve_count?: number
          difficulty?: string
          distance_m?: number
          duration_s?: number
          ended_at?: string | null
          id: string
          like_count?: number
          max_lean_left_deg?: number | null
          max_lean_right_deg?: number | null
          max_speed_mps?: number
          notes?: string
          owner_id?: string
          photo_paths?: string[]
          preview_path?: unknown
          ride_type: string
          route_id?: string | null
          route_name?: string | null
          save_count?: number
          search_text?: string | null
          start_point?: unknown
          started_at: string
          surface?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          break_count?: number
          break_s?: number
          city?: string | null
          comment_count?: number
          created_at?: string
          curve_count?: number
          difficulty?: string
          distance_m?: number
          duration_s?: number
          ended_at?: string | null
          id?: string
          like_count?: number
          max_lean_left_deg?: number | null
          max_lean_right_deg?: number | null
          max_speed_mps?: number
          notes?: string
          owner_id?: string
          photo_paths?: string[]
          preview_path?: unknown
          ride_type?: string
          route_id?: string | null
          route_name?: string | null
          save_count?: number
          search_text?: string | null
          start_point?: unknown
          started_at?: string
          surface?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "rides_owner_id_fkey"
            columns: ["owner_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_route_id_fkey"
            columns: ["route_id"]
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      route_suggestions: {
        Row: {
          created_at: string
          description: string
          difficulty: string
          distance_km: number
          duration_minutes: number
          elevation_gain_m: number | null
          id: string
          name: string
          path: unknown
          photo_paths: string[]
          review_note: string | null
          reviewed_at: string | null
          route_id: string | null
          status: string
          tags: string[]
          tracking_id: string
          user_id: string
          waypoints: Json
        }
        Insert: {
          created_at?: string
          description?: string
          difficulty?: string
          distance_km: number
          duration_minutes: number
          elevation_gain_m?: number | null
          id?: string
          name: string
          path: unknown
          photo_paths?: string[]
          review_note?: string | null
          reviewed_at?: string | null
          route_id?: string | null
          status?: string
          tags: string[]
          tracking_id?: string
          user_id?: string
          waypoints: Json
        }
        Update: {
          created_at?: string
          description?: string
          difficulty?: string
          distance_km?: number
          duration_minutes?: number
          elevation_gain_m?: number | null
          id?: string
          name?: string
          path?: unknown
          photo_paths?: string[]
          review_note?: string | null
          reviewed_at?: string | null
          route_id?: string | null
          status?: string
          tags?: string[]
          tracking_id?: string
          user_id?: string
          waypoints?: Json
        }
        Relationships: [
          {
            foreignKeyName: "route_suggestions_route_id_fkey"
            columns: ["route_id"]
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_suggestions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          author_id: string | null
          average_speed_kmh: number
          break_count: number
          city: string
          cover_path: string | null
          created_at: string
          curve_count: number
          difficulty: string
          distance_km: number
          duration_minutes: number
          elevation_gain_m: number
          elevation_loss_m: number
          end_name: string
          featured_rank: number | null
          home_rank: number | null
          id: string
          is_loop: boolean
          max_speed_kmh: number
          name: string
          notes: string | null
          path: unknown
          photo_paths: string[]
          popularity: number
          published_at: string
          rating: number
          rating_count: number
          ride_count: number
          save_count: number
          search_text: string | null
          source_suggestion_id: string | null
          start_name: string
          start_point: unknown
          status: string
          stops: Json | null
          summary: string
          surface: string
          tag: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          average_speed_kmh?: number
          break_count?: number
          city: string
          cover_path?: string | null
          created_at?: string
          curve_count?: number
          difficulty?: string
          distance_km: number
          duration_minutes: number
          elevation_gain_m?: number
          elevation_loss_m?: number
          end_name: string
          featured_rank?: number | null
          home_rank?: number | null
          id?: string
          is_loop?: boolean
          max_speed_kmh?: number
          name: string
          notes?: string | null
          path: unknown
          photo_paths?: string[]
          popularity?: number
          published_at?: string
          rating?: number
          rating_count?: number
          ride_count?: number
          save_count?: number
          search_text?: string | null
          source_suggestion_id?: string | null
          start_name: string
          start_point?: unknown
          status?: string
          stops?: Json | null
          summary?: string
          surface?: string
          tag: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          average_speed_kmh?: number
          break_count?: number
          city?: string
          cover_path?: string | null
          created_at?: string
          curve_count?: number
          difficulty?: string
          distance_km?: number
          duration_minutes?: number
          elevation_gain_m?: number
          elevation_loss_m?: number
          end_name?: string
          featured_rank?: number | null
          home_rank?: number | null
          id?: string
          is_loop?: boolean
          max_speed_kmh?: number
          name?: string
          notes?: string | null
          path?: unknown
          photo_paths?: string[]
          popularity?: number
          published_at?: string
          rating?: number
          rating_count?: number
          ride_count?: number
          save_count?: number
          search_text?: string | null
          source_suggestion_id?: string | null
          start_name?: string
          start_point?: unknown
          status?: string
          stops?: Json | null
          summary?: string
          surface?: string
          tag?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_author_id_fkey"
            columns: ["author_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_routes: {
        Row: {
          created_at: string
          route_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          route_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          route_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_routes_route_id_fkey"
            columns: ["route_id"]
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_routes_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          default_ride_visibility: string
          email_marketing: boolean
          email_marketing_updated_at: string | null
          endpoint_distance_m: number
          hide_endpoints: boolean
          home_location: unknown
          home_place: Json | null
          locale: string
          notify_comments: boolean
          notify_followers: boolean
          notify_likes: boolean
          notify_messages: boolean
          notify_product_updates: boolean
          notify_route_suggestions: boolean
          password_changed_at: string | null
          updated_at: string
          user_id: string
          welcome_email_sent_at: string | null
        }
        Insert: {
          created_at?: string
          default_ride_visibility?: string
          email_marketing?: boolean
          email_marketing_updated_at?: string | null
          endpoint_distance_m?: number
          hide_endpoints?: boolean
          home_location?: unknown
          home_place?: Json | null
          locale?: string
          notify_comments?: boolean
          notify_followers?: boolean
          notify_likes?: boolean
          notify_messages?: boolean
          notify_product_updates?: boolean
          notify_route_suggestions?: boolean
          password_changed_at?: string | null
          updated_at?: string
          user_id: string
          welcome_email_sent_at?: string | null
        }
        Update: {
          created_at?: string
          default_ride_visibility?: string
          email_marketing?: boolean
          email_marketing_updated_at?: string | null
          endpoint_distance_m?: number
          hide_endpoints?: boolean
          home_location?: unknown
          home_place?: Json | null
          locale?: string
          notify_comments?: boolean
          notify_followers?: boolean
          notify_likes?: boolean
          notify_messages?: boolean
          notify_product_updates?: boolean
          notify_route_suggestions?: boolean
          password_changed_at?: string | null
          updated_at?: string
          user_id?: string
          welcome_email_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: number
          source: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: never
          source?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: never
          source?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_comment: {
        Args: { p_id: string; p_target: string; p_text: string }
        Returns: Json
      }
      approve_route_suggestion: {
        Args: { p_id: string; p_overrides?: Json }
        Returns: string
      }
      author_json: {
        Args: { p: Database["public"]["Tables"]["profiles"]["Row"] }
        Returns: Json
      }
      broadcast_product_update: {
        Args: {
          p_body_en: string
          p_body_tr: string
          p_title_en: string
          p_title_tr: string
        }
        Returns: number
      }
      can_view_post: {
        Args: { p_audience: string; p_author: string }
        Returns: boolean
      }
      can_view_ride: {
        Args: { p_owner: string; p_visibility: string }
        Returns: boolean
      }
      community_feed: {
        Args: { p_before?: string; p_filter?: string; p_limit?: number }
        Returns: Json[]
      }
      community_post: { Args: { p_id: string }; Returns: Json }
      community_search: {
        Args: { p_limit?: number; p_query: string }
        Returns: Json
      }
      complete_registration: { Args: { p: Json }; Returns: Json }
      follows_accepted: {
        Args: { target: string; viewer: string }
        Returns: boolean
      }
      forget_push_token: { Args: { p_token: string }; Returns: undefined }
      free_usernames: { Args: { p_candidates: string[] }; Returns: string[] }
      get_ride: { Args: { p_id: string }; Returns: Json }
      get_rider: { Args: { p_id: string }; Returns: Json }
      hook_password_verification_attempt: {
        Args: { event: Json }
        Returns: Json
      }
      is_blocked_between: { Args: { a: string; b: string }; Returns: boolean }
      is_conversation_member: {
        Args: { p_conversation: string }
        Returns: boolean
      }
      is_verified: { Args: never; Returns: boolean }
      list_blocked: { Args: never; Returns: Json[] }
      list_comments: {
        Args: { p_id: string; p_target: string }
        Returns: Json[]
      }
      list_conversations: { Args: never; Returns: Json[] }
      list_follows: {
        Args: {
          p_direction: string
          p_limit?: number
          p_offset?: number
          p_user: string
        }
        Returns: Json[]
      }
      lookup_email: { Args: { p_email: string }; Returns: Json }
      mark_all_notifications_read: { Args: never; Returns: undefined }
      own_profile: { Args: never; Returns: Json }
      own_rides_for_restore: {
        Args: { p_known_ids?: string[] }
        Returns: Json[]
      }
      post_json: {
        Args: { p: Database["public"]["Tables"]["posts"]["Row"] }
        Returns: Json
      }
      push_payload: { Args: { p_notification: string }; Returns: Json }
      register_push_token: {
        Args: { p_device_name?: string; p_platform: string; p_token: string }
        Returns: undefined
      }
      reject_route_suggestion: {
        Args: { p_id: string; p_note?: string }
        Returns: undefined
      }
      ride_summary_json: {
        Args: { r: Database["public"]["Tables"]["rides"]["Row"] }
        Returns: Json
      }
      rider_id_by_handle: { Args: { p_handle: string }; Returns: string }
      rider_match: { Args: { p_id: string }; Returns: Json }
      rider_rides: {
        Args: { p_before?: string; p_limit?: number; p_rider: string }
        Returns: Json[]
      }
      route_by_id: { Args: { p_id: string }; Returns: Json }
      route_json: {
        Args: { r: Database["public"]["Tables"]["routes"]["Row"] }
        Returns: Json
      }
      routes_by_author: { Args: { p_author: string }; Returns: Json[] }
      routes_by_ids: { Args: { p_ids: string[] }; Returns: Json[] }
      routes_in_area: {
        Args: {
          p_east: number
          p_north: number
          p_query?: string
          p_south: number
          p_west: number
        }
        Returns: Json[]
      }
      routes_near: {
        Args: { p_lat: number; p_lng: number; p_radius_km: number }
        Returns: Json[]
      }
      routes_recommended: { Args: { p_list?: string }; Returns: Json[] }
      routes_search: {
        Args: { p_limit?: number; p_query: string }
        Returns: Json[]
      }
      routes_suggest: {
        Args: { p_limit?: number; p_query: string }
        Returns: Json
      }
      saved_rides: { Args: { p_limit?: number }; Returns: Json[] }
      saved_route_ids: { Args: never; Returns: string[] }
      search_norm: { Args: { value: string }; Returns: string }
      set_primary_bike: { Args: { p_bike: Json }; Returns: Json }
      start_direct_conversation: { Args: { p_other: string }; Returns: string }
      submit_route_suggestion: {
        Args: {
          p_description: string
          p_difficulty: string
          p_distance_km: number
          p_duration_minutes: number
          p_elevation_gain_m: number
          p_name: string
          p_path: Json
          p_photo_paths: string[]
          p_tags: string[]
          p_waypoints: Json
        }
        Returns: Json
      }
      update_own_profile: { Args: { p: Json }; Returns: Json }
      upsert_ride: { Args: { p_ride: Json }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
