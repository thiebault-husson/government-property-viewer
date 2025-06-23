-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Buildings table (master table for all properties)
CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_code TEXT UNIQUE NOT NULL,
  real_property_asset_name TEXT,
  installation_name TEXT,
  owned_or_leased TEXT CHECK (owned_or_leased IN ('F', 'L')),
  gsa_region INTEGER,
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip_code INTEGER,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  building_rentable_square_feet INTEGER,
  available_square_feet INTEGER,
  construction_date INTEGER,
  congressional_district INTEGER,
  congressional_district_representative_name TEXT,
  building_status TEXT,
  real_property_asset_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leased properties table (detailed lease information)
CREATE TABLE leased_properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_code TEXT NOT NULL,
  real_property_asset_name TEXT,
  installation_name TEXT,
  federal_leased_code TEXT,
  gsa_region INTEGER,
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip_code INTEGER,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  building_rentable_square_feet INTEGER,
  available_square_feet INTEGER,
  congressional_district INTEGER,
  congressional_district_representative TEXT,
  lease_number TEXT,
  lease_effective_date DATE,
  lease_expiration_date DATE,
  real_property_asset_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key relationship to buildings table
  CONSTRAINT fk_building FOREIGN KEY (location_code) REFERENCES buildings(location_code)
);

-- Indexes for better performance
CREATE INDEX idx_buildings_location_code ON buildings(location_code);
CREATE INDEX idx_buildings_owned_or_leased ON buildings(owned_or_leased);
CREATE INDEX idx_buildings_state ON buildings(state);
CREATE INDEX idx_buildings_gsa_region ON buildings(gsa_region);

CREATE INDEX idx_leased_properties_location_code ON leased_properties(location_code);
CREATE INDEX idx_leased_properties_lease_number ON leased_properties(lease_number);
CREATE INDEX idx_leased_properties_lease_dates ON leased_properties(lease_effective_date, lease_expiration_date);
CREATE INDEX idx_leased_properties_state ON leased_properties(state);

-- Enable Row Level Security (RLS)
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE leased_properties ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (adjust as needed for your security requirements)
CREATE POLICY "Enable read access for all users" ON buildings FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON leased_properties FOR SELECT USING (true);

-- Optional: Create policies for insert/update if needed for data import
CREATE POLICY "Enable insert for authenticated users" ON buildings FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for authenticated users" ON leased_properties FOR INSERT WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_buildings_updated_at BEFORE UPDATE ON buildings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leased_properties_updated_at BEFORE UPDATE ON leased_properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 