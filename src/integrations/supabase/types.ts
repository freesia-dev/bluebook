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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agenda_kredit_entry: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          keterangan: string | null
          kode_surat: string
          nama_pengirim: string
          nomor: number
          nomor_agenda: string
          nomor_surat_masuk: string
          perihal: string
          status: string
          tanggal_masuk: string | null
          tujuan_disposisi: string
          user_input: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          keterangan?: string | null
          kode_surat: string
          nama_pengirim: string
          nomor: number
          nomor_agenda: string
          nomor_surat_masuk: string
          perihal: string
          status?: string
          tanggal_masuk?: string | null
          tujuan_disposisi: string
          user_input: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          keterangan?: string | null
          kode_surat?: string
          nama_pengirim?: string
          nomor?: number
          nomor_agenda?: string
          nomor_surat_masuk?: string
          perihal?: string
          status?: string
          tanggal_masuk?: string | null
          tujuan_disposisi?: string
          user_input?: string
        }
        Relationships: []
      }
      jenis_debitur: {
        Row: {
          id: string
          keterangan: string
          kode: string
        }
        Insert: {
          id?: string
          keterangan: string
          kode: string
        }
        Update: {
          id?: string
          keterangan?: string
          kode?: string
        }
        Relationships: []
      }
      jenis_kredit: {
        Row: {
          id: string
          nama: string
          produk_kredit: string
        }
        Insert: {
          id?: string
          nama: string
          produk_kredit: string
        }
        Update: {
          id?: string
          nama?: string
          produk_kredit?: string
        }
        Relationships: []
      }
      jenis_penggunaan: {
        Row: {
          id: string
          keterangan: string
          kode: string
        }
        Insert: {
          id?: string
          keterangan: string
          kode: string
        }
        Update: {
          id?: string
          keterangan?: string
          kode?: string
        }
        Relationships: []
      }
      kkmpak: {
        Row: {
          created_at: string
          id: string
          jangka_waktu: string
          jenis_debitur: string
          jenis_kredit: string
          kode_fasilitas: string
          nama_debitur: string
          nomor: number
          nomor_kk: string
          nomor_mpak: string
          plafon: number
          sektor_ekonomi: string
          tanggal: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          jangka_waktu: string
          jenis_debitur: string
          jenis_kredit: string
          kode_fasilitas: string
          nama_debitur: string
          nomor: number
          nomor_kk: string
          nomor_mpak: string
          plafon: number
          sektor_ekonomi: string
          tanggal?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          jangka_waktu?: string
          jenis_debitur?: string
          jenis_kredit?: string
          kode_fasilitas?: string
          nama_debitur?: string
          nomor?: number
          nomor_kk?: string
          nomor_mpak?: string
          plafon?: number
          sektor_ekonomi?: string
          tanggal?: string | null
          type?: string
        }
        Relationships: []
      }
      kode_fasilitas: {
        Row: {
          id: string
          keterangan: string
          kode: string
        }
        Insert: {
          id?: string
          keterangan: string
          kode: string
        }
        Update: {
          id?: string
          keterangan?: string
          kode?: string
        }
        Relationships: []
      }
      nomor_loan: {
        Row: {
          created_at: string
          id: string
          jangka_waktu: string
          jenis_kredit: string
          nama_debitur: string
          nomor: number
          nomor_loan: string
          nomor_pk: string
          pk_id: string | null
          plafon: number
          produk_kredit: string
          skema: string
          tanggal: string | null
          unit_kerja: string
        }
        Insert: {
          created_at?: string
          id?: string
          jangka_waktu: string
          jenis_kredit: string
          nama_debitur: string
          nomor: number
          nomor_loan: string
          nomor_pk: string
          pk_id?: string | null
          plafon: number
          produk_kredit: string
          skema: string
          tanggal?: string | null
          unit_kerja: string
        }
        Update: {
          created_at?: string
          id?: string
          jangka_waktu?: string
          jenis_kredit?: string
          nama_debitur?: string
          nomor?: number
          nomor_loan?: string
          nomor_pk?: string
          pk_id?: string | null
          plafon?: number
          produk_kredit?: string
          skema?: string
          tanggal?: string | null
          unit_kerja?: string
        }
        Relationships: [
          {
            foreignKeyName: "nomor_loan_pk_id_fkey"
            columns: ["pk_id"]
            isOneToOne: false
            referencedRelation: "pk"
            referencedColumns: ["id"]
          },
        ]
      }
      pk: {
        Row: {
          created_at: string
          id: string
          jangka_waktu: string
          jenis_debitur: string
          jenis_kredit: string
          jenis_penggunaan: string
          nama_debitur: string
          nomor: number
          nomor_pk: string
          plafon: number
          sektor_ekonomi: string
          tanggal: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          jangka_waktu: string
          jenis_debitur: string
          jenis_kredit: string
          jenis_penggunaan: string
          nama_debitur: string
          nomor: number
          nomor_pk: string
          plafon: number
          sektor_ekonomi: string
          tanggal?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          jangka_waktu?: string
          jenis_debitur?: string
          jenis_kredit?: string
          jenis_penggunaan?: string
          nama_debitur?: string
          nomor?: number
          nomor_pk?: string
          plafon?: number
          sektor_ekonomi?: string
          tanggal?: string | null
          type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nama: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nama?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nama?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sektor_ekonomi: {
        Row: {
          id: string
          keterangan: string
          kode: string
        }
        Insert: {
          id?: string
          keterangan: string
          kode: string
        }
        Update: {
          id?: string
          keterangan?: string
          kode?: string
        }
        Relationships: []
      }
      sppk: {
        Row: {
          created_at: string
          id: string
          jangka_waktu: string
          jenis_kredit: string
          marketing: string
          nama_debitur: string
          nomor: number
          nomor_sppk: string
          plafon: number
          tanggal: string | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          jangka_waktu: string
          jenis_kredit: string
          marketing: string
          nama_debitur: string
          nomor: number
          nomor_sppk: string
          plafon: number
          tanggal?: string | null
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          jangka_waktu?: string
          jenis_kredit?: string
          marketing?: string
          nama_debitur?: string
          nomor?: number
          nomor_sppk?: string
          plafon?: number
          tanggal?: string | null
          type?: string
        }
        Relationships: []
      }
      surat_keluar: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          keterangan: string | null
          kode_surat: string
          nama_penerima: string
          nomor: number
          nomor_agenda: string
          perihal: string
          status: string
          tanggal: string | null
          tujuan_surat: string
          user_input: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          keterangan?: string | null
          kode_surat: string
          nama_penerima: string
          nomor: number
          nomor_agenda: string
          perihal: string
          status?: string
          tanggal?: string | null
          tujuan_surat: string
          user_input: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          keterangan?: string | null
          kode_surat?: string
          nama_penerima?: string
          nomor?: number
          nomor_agenda?: string
          perihal?: string
          status?: string
          tanggal?: string | null
          tujuan_surat?: string
          user_input?: string
        }
        Relationships: []
      }
      surat_masuk: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          keterangan: string | null
          kode_surat: string
          nama_pengirim: string
          nomor: number
          nomor_agenda: string
          nomor_surat_masuk: string
          perihal: string
          status: string
          tanggal_masuk: string | null
          tujuan_disposisi: string
          user_input: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          keterangan?: string | null
          kode_surat: string
          nama_pengirim: string
          nomor: number
          nomor_agenda: string
          nomor_surat_masuk: string
          perihal: string
          status?: string
          tanggal_masuk?: string | null
          tujuan_disposisi: string
          user_input: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          keterangan?: string | null
          kode_surat?: string
          nama_pengirim?: string
          nomor?: number
          nomor_agenda?: string
          nomor_surat_masuk?: string
          perihal?: string
          status?: string
          tanggal_masuk?: string | null
          tujuan_disposisi?: string
          user_input?: string
        }
        Relationships: []
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
      is_authenticated: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "demo"
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
      app_role: ["admin", "user", "demo"],
    },
  },
} as const
