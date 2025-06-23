export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      buildings: {
        Row: {
          id: string
          location_code: string
          real_property_asset_name: string | null
          installation_name: string | null
          owned_or_leased: 'F' | 'L' | null
          gsa_region: number | null
          street_address: string | null
          city: string | null
          state: string | null
          zip_code: number | null
          latitude: number | null
          longitude: number | null
          building_rentable_square_feet: number | null
          available_square_feet: number | null
          construction_date: number | null
          congressional_district: number | null
          congressional_district_representative_name: string | null
          building_status: string | null
          real_property_asset_type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          location_code: string
          real_property_asset_name?: string | null
          installation_name?: string | null
          owned_or_leased?: 'F' | 'L' | null
          gsa_region?: number | null
          street_address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: number | null
          latitude?: number | null
          longitude?: number | null
          building_rentable_square_feet?: number | null
          available_square_feet?: number | null
          construction_date?: number | null
          congressional_district?: number | null
          congressional_district_representative_name?: string | null
          building_status?: string | null
          real_property_asset_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          location_code?: string
          real_property_asset_name?: string | null
          installation_name?: string | null
          owned_or_leased?: 'F' | 'L' | null
          gsa_region?: number | null
          street_address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: number | null
          latitude?: number | null
          longitude?: number | null
          building_rentable_square_feet?: number | null
          available_square_feet?: number | null
          construction_date?: number | null
          congressional_district?: number | null
          congressional_district_representative_name?: string | null
          building_status?: string | null
          real_property_asset_type?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      leased_properties: {
        Row: {
          id: string
          location_code: string
          real_property_asset_name: string | null
          installation_name: string | null
          federal_leased_code: string | null
          gsa_region: number | null
          street_address: string | null
          city: string | null
          state: string | null
          zip_code: number | null
          latitude: number | null
          longitude: number | null
          building_rentable_square_feet: number | null
          available_square_feet: number | null
          congressional_district: number | null
          congressional_district_representative: string | null
          lease_number: string | null
          lease_effective_date: string | null
          lease_expiration_date: string | null
          real_property_asset_type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          location_code: string
          real_property_asset_name?: string | null
          installation_name?: string | null
          federal_leased_code?: string | null
          gsa_region?: number | null
          street_address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: number | null
          latitude?: number | null
          longitude?: number | null
          building_rentable_square_feet?: number | null
          available_square_feet?: number | null
          congressional_district?: number | null
          congressional_district_representative?: string | null
          lease_number?: string | null
          lease_effective_date?: string | null
          lease_expiration_date?: string | null
          real_property_asset_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          location_code?: string
          real_property_asset_name?: string | null
          installation_name?: string | null
          federal_leased_code?: string | null
          gsa_region?: number | null
          street_address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: number | null
          latitude?: number | null
          longitude?: number | null
          building_rentable_square_feet?: number | null
          available_square_feet?: number | null
          congressional_district?: number | null
          congressional_district_representative?: string | null
          lease_number?: string | null
          lease_effective_date?: string | null
          lease_expiration_date?: string | null
          real_property_asset_type?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
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
