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
      community_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          is_visible: boolean
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          is_visible?: boolean
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          is_visible?: boolean
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          instagram_username: string | null
          is_visible: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          instagram_username?: string | null
          is_visible?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          instagram_username?: string | null
          is_visible?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          category: string
          created_at: string
          email: string
          error: string | null
          id: string
          message: string
          name: string
          send_status: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          email: string
          error?: string | null
          id?: string
          message: string
          name: string
          send_status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          email?: string
          error?: string | null
          id?: string
          message?: string
          name?: string
          send_status?: string
          updated_at?: string
        }
        Relationships: []
      }
      global_timer: {
        Row: {
          action_link: string | null
          created_at: string
          id: string
          is_active: boolean
          target_date: string | null
          timer_type: string
          title: string
          updated_at: string
        }
        Insert: {
          action_link?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          target_date?: string | null
          timer_type?: string
          title?: string
          updated_at?: string
        }
        Update: {
          action_link?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          target_date?: string | null
          timer_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          cancelled_at: string | null
          cancelled_reason: string | null
          city: string
          completed_at: string | null
          country_code: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          id: string
          latitude: number | null
          longitude: number | null
          order_number: string
          order_status: Database["public"]["Enums"]["order_status"] | null
          paid_at: string | null
          payment_method: string
          payment_status: string
          postal_code: string
          product_id: string
          product_image: string
          product_name: string
          product_price: string
          quantity: number
          return_reason: string | null
          shipping_address: string
          size: string
          total_amount: number
          tracking_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_reason?: string | null
          city: string
          completed_at?: string | null
          country_code?: string | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          order_number: string
          order_status?: Database["public"]["Enums"]["order_status"] | null
          paid_at?: string | null
          payment_method: string
          payment_status?: string
          postal_code: string
          product_id: string
          product_image: string
          product_name: string
          product_price: string
          quantity?: number
          return_reason?: string | null
          shipping_address: string
          size: string
          total_amount: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cancelled_at?: string | null
          cancelled_reason?: string | null
          city?: string
          completed_at?: string | null
          country_code?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          order_number?: string
          order_status?: Database["public"]["Enums"]["order_status"] | null
          paid_at?: string | null
          payment_method?: string
          payment_status?: string
          postal_code?: string
          product_id?: string
          product_image?: string
          product_name?: string
          product_price?: string
          quantity?: number
          return_reason?: string | null
          shipping_address?: string
          size?: string
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      password_reset_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          used: boolean
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          used?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          used?: boolean
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_type: string | null
          image_url: string
          is_primary: boolean
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_type?: string | null
          image_url: string
          is_primary?: boolean
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_type?: string | null
          image_url?: string
          is_primary?: boolean
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          comment: string
          created_at: string
          id: string
          is_moderated: boolean
          is_verified_buyer: boolean
          product_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          is_moderated?: boolean
          is_verified_buyer?: boolean
          product_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          is_moderated?: boolean
          is_verified_buyer?: boolean
          product_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string | null
          id: string
          image: string
          name: string
          price: string
          stock_status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          image: string
          name: string
          price: string
          stock_status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image?: string
          name?: string
          price?: string
          stock_status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birthday: string | null
          created_at: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          birthday?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          birthday?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_addresses: {
        Row: {
          city: string
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          phone: string
          postal_code: string
          street: string
          updated_at: string
          user_id: string
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          phone: string
          postal_code: string
          street: string
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          phone?: string
          postal_code?: string
          street?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
      visitor_sessions: {
        Row: {
          city: string | null
          country_code: string | null
          country_name: string | null
          created_at: string
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_activity_at: string | null
          latitude: number | null
          longitude: number | null
          page_path: string | null
          referrer: string | null
          session_id: string
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          city?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity_at?: string | null
          latitude?: number | null
          longitude?: number | null
          page_path?: string | null
          referrer?: string | null
          session_id: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity_at?: string | null
          latitude?: number | null
          longitude?: number | null
          page_path?: string | null
          referrer?: string | null
          session_id?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
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
      app_role: "admin" | "moderator" | "user"
      order_status:
        | "pending_payment"
        | "processing"
        | "in_transit"
        | "completed"
        | "return_requested"
        | "cancelled"
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
      app_role: ["admin", "moderator", "user"],
      order_status: [
        "pending_payment",
        "processing",
        "in_transit",
        "completed",
        "return_requested",
        "cancelled",
      ],
    },
  },
} as const
