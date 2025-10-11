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
      animes: {
        Row: {
          ano: string | null
          atualizado_em: string | null
          criado_em: string | null
          dublado: boolean | null
          id: number
          link_original: string
          slug: string | null
          status: string | null
          thumb: string | null
          titulo: string
        }
        Insert: {
          ano?: string | null
          atualizado_em?: string | null
          criado_em?: string | null
          dublado?: boolean | null
          id?: number
          link_original: string
          slug?: string | null
          status?: string | null
          thumb?: string | null
          titulo: string
        }
        Update: {
          ano?: string | null
          atualizado_em?: string | null
          criado_em?: string | null
          dublado?: boolean | null
          id?: number
          link_original?: string
          slug?: string | null
          status?: string | null
          thumb?: string | null
          titulo?: string
        }
        Relationships: []
      }
      animes_generos: {
        Row: {
          anime_id: number
          genero_id: number
        }
        Insert: {
          anime_id: number
          genero_id: number
        }
        Update: {
          anime_id?: number
          genero_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "animes_generos_anime_id_fkey"
            columns: ["anime_id"]
            isOneToOne: false
            referencedRelation: "animes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animes_generos_anime_id_fkey"
            columns: ["anime_id"]
            isOneToOne: false
            referencedRelation: "animes_complete"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "animes_generos_genero_id_fkey"
            columns: ["genero_id"]
            isOneToOne: false
            referencedRelation: "generos"
            referencedColumns: ["id"]
          },
        ]
      }
      episodios: {
        Row: {
          anime_id: number
          criado_em: string | null
          id: number
          link_original: string | null
          link_video: string | null
          numero: number
        }
        Insert: {
          anime_id: number
          criado_em?: string | null
          id?: number
          link_original?: string | null
          link_video?: string | null
          numero: number
        }
        Update: {
          anime_id?: number
          criado_em?: string | null
          id?: number
          link_original?: string | null
          link_video?: string | null
          numero?: number
        }
        Relationships: [
          {
            foreignKeyName: "episodios_anime_id_fkey"
            columns: ["anime_id"]
            isOneToOne: false
            referencedRelation: "animes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episodios_anime_id_fkey"
            columns: ["anime_id"]
            isOneToOne: false
            referencedRelation: "animes_complete"
            referencedColumns: ["id"]
          },
        ]
      }
      generos: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          id: number
          nome: string
        }
        Insert: {
          atualizado_em?: string | null
          criado_em?: string | null
          id?: number
          nome: string
        }
        Update: {
          atualizado_em?: string | null
          criado_em?: string | null
          id?: number
          nome?: string
        }
        Relationships: []
      }
    }
    Views: {
      animes_complete: {
        Row: {
          atualizado_em: string | null
          criado_em: string | null
          dublado: boolean | null
          episodios: Json | null
          id: number | null
          link_original: string | null
          slug: string | null
          status: string | null
          thumb: string | null
          titulo: string | null
          total_episodios: number | null
          ultimo_episodio_criado_em: string | null
        }
        Relationships: []
      }
      animes_with_latest_episode: {
        Row: {
          dublado: boolean | null
          generos: Json | null
          id: number | null
          link_original: string | null
          slug: string | null
          thumb: string | null
          titulo: string | null
          total_episodios: number | null
          ultimo_episodio_criado_em: string | null
        }
        Relationships: []
      }
      episodios_por_titulo: {
        Row: {
          anime_id: number | null
          criado_em: string | null
          id: number | null
          link_original: string | null
          link_video: string | null
          numero: number | null
          titulo: string | null
        }
        Relationships: [
          {
            foreignKeyName: "episodios_anime_id_fkey"
            columns: ["anime_id"]
            isOneToOne: false
            referencedRelation: "animes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episodios_anime_id_fkey"
            columns: ["anime_id"]
            isOneToOne: false
            referencedRelation: "animes_complete"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
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
