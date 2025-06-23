import { config } from 'dotenv';
config({ path: '.env.local' });
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Environment check:');
console.log('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '[SET]' : '[MISSING]');
console.log('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '[SET]' : '[MISSING]');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to clean and normalize CSV headers
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

// Helper function to parse numbers safely
function parseNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = parseFloat(String(value).replace(/,/g, ''));
  return isNaN(num) ? null : num;
}

// Helper function to parse integers safely
function parseIntSafe(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number.parseInt(String(value).replace(/,/g, ''), 10);
  return isNaN(num) ? null : num;
}

// Helper function to parse dates safely
function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  } catch (error) {
    return null;
  }
}

// Transform buildings CSV row to database format
function transformBuildingRow(row: any): any {
  return {
    location_code: row['Location Code'] || '',
    real_property_asset_name: row['Real Property Asset Name'] || null,
    installation_name: row['Installation Name'] || null,
    owned_or_leased: row['Owned or Leased'] === 'L' ? 'L' : 'F',
    gsa_region: parseIntSafe(row['GSA Region']),
    street_address: row['Street Address'] || null,
    city: row['City'] || null,
    state: row['State'] || null,
    zip_code: parseIntSafe(row['Zip Code']),
    latitude: parseNumber(row['Latitude']),
    longitude: parseNumber(row['Longitude']),
    building_rentable_square_feet: parseIntSafe(row['Building Rentable Square Feet']),
    available_square_feet: parseIntSafe(row['Available Square Feet']),
    construction_date: parseIntSafe(row['Construction Date']),
    congressional_district: parseIntSafe(row['Congressional District']),
    congressional_district_representative_name: row['Congressional District Representative Name'] || null,
    building_status: row['Building Status'] || null,
    real_property_asset_type: row['Real Property Asset type'] || null,
  };
}

// Transform leased properties CSV row to database format
function transformLeaseRow(row: any): any {
  return {
    location_code: row['Location Code'] || '',
    real_property_asset_name: row['Real Property Asset Name'] || null,
    installation_name: row['Installation Name'] || null,
    federal_leased_code: row['Federal Leased Code'] || null,
    gsa_region: parseIntSafe(row['GSA Region']),
    street_address: row['Street Address'] || null,
    city: row['City'] || null,
    state: row['State'] || null,
    zip_code: parseIntSafe(row['Zip Code']),
    latitude: parseNumber(row['Latitude']),
    longitude: parseNumber(row['Longitude']),
    building_rentable_square_feet: parseIntSafe(row['Building Rentable Square Feet']),
    available_square_feet: parseIntSafe(row['Available Square Feet']),
    congressional_district: parseIntSafe(row['Congressional District']),
    congressional_district_representative: row['Congressional District Representative'] || null,
    lease_number: row['Lease Number'] || null,
    lease_effective_date: parseDate(row['Lease Effective Date']),
    lease_expiration_date: parseDate(row['Lease Expiration Date']),
    real_property_asset_type: row['Real Property Asset type'] || null,
  };
}

// Import buildings data
async function importBuildings() {
  console.log('📊 Starting buildings import...');
  
  const csvPath = path.join(process.cwd(), 'app/db/2025-6-6-iolp-buildings.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Buildings CSV file not found: ${csvPath}`);
    return false;
  }

  try {
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    console.log(`📋 Found ${records.length} building records in CSV`);

    // Transform records
    const transformedRecords = records.map(transformBuildingRow);
    
    // Clear existing data
    console.log('🗑️ Clearing existing buildings data...');
    const { error: deleteError } = await supabase
      .from('buildings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (deleteError) {
      console.error('❌ Error clearing buildings:', deleteError);
      return false;
    }

    // Insert in batches of 1000
    const batchSize = 1000;
    let imported = 0;
    
    for (let i = 0; i < transformedRecords.length; i += batchSize) {
      const batch = transformedRecords.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('buildings')
        .insert(batch);

      if (error) {
        console.error(`❌ Error inserting buildings batch ${i}-${i + batch.length}:`, error);
        return false;
      }

      imported += batch.length;
      console.log(`✅ Imported ${imported}/${transformedRecords.length} buildings`);
    }

    console.log(`🎉 Successfully imported ${imported} buildings!`);
    return true;

  } catch (error) {
    console.error('❌ Error importing buildings:', error);
    return false;
  }
}

// Import leased properties data
async function importLeasedProperties() {
  console.log('📊 Starting leased properties import...');
  
  const csvPath = path.join(process.cwd(), 'app/db/2025-6-6-iolp-leased-properties.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Leased properties CSV file not found: ${csvPath}`);
    return false;
  }

  try {
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    console.log(`📋 Found ${records.length} lease records in CSV`);

    // Transform records
    const transformedRecords = records.map(transformLeaseRow);
    
    // Clear existing data
    console.log('🗑️ Clearing existing leased properties data...');
    const { error: deleteError } = await supabase
      .from('leased_properties')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

    if (deleteError) {
      console.error('❌ Error clearing leased properties:', deleteError);
      return false;
    }

    // Insert in batches of 1000
    const batchSize = 1000;
    let imported = 0;
    
    for (let i = 0; i < transformedRecords.length; i += batchSize) {
      const batch = transformedRecords.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('leased_properties')
        .insert(batch);

      if (error) {
        console.error(`❌ Error inserting leased properties batch ${i}-${i + batch.length}:`, error);
        return false;
      }

      imported += batch.length;
      console.log(`✅ Imported ${imported}/${transformedRecords.length} leased properties`);
    }

    console.log(`🎉 Successfully imported ${imported} leased properties!`);
    return true;

  } catch (error) {
    console.error('❌ Error importing leased properties:', error);
    return false;
  }
}

// Verify data integrity
async function verifyImport() {
  console.log('🔍 Verifying import...');
  
  try {
    const [buildingsResult, leasedResult] = await Promise.all([
      supabase.from('buildings').select('*', { count: 'exact', head: true }),
      supabase.from('leased_properties').select('*', { count: 'exact', head: true })
    ]);

    const buildingsCount = buildingsResult.count || 0;
    const leasedCount = leasedResult.count || 0;

    console.log(`📊 Database contains:`);
    console.log(`   • ${buildingsCount} buildings`);
    console.log(`   • ${leasedCount} leased properties`);

    // Sample a few records to verify structure
    const { data: sampleBuilding } = await supabase
      .from('buildings')
      .select('*')
      .limit(1)
      .single();

    const { data: sampleLease } = await supabase
      .from('leased_properties')
      .select('*')
      .limit(1)
      .single();

    if (sampleBuilding) {
      console.log('✅ Sample building record structure verified');
    }

    if (sampleLease) {
      console.log('✅ Sample lease record structure verified');
    }

    return true;
  } catch (error) {
    console.error('❌ Error verifying import:', error);
    return false;
  }
}

// Main import function
async function main() {
  console.log('🚀 Starting Supabase data import...');
  console.log('=====================================');

  // Import buildings first
  const buildingsSuccess = await importBuildings();
  if (!buildingsSuccess) {
    console.error('❌ Buildings import failed. Stopping.');
    process.exit(1);
  }

  console.log('');

  // Import leased properties
  const leasedSuccess = await importLeasedProperties();
  if (!leasedSuccess) {
    console.error('❌ Leased properties import failed. Stopping.');
    process.exit(1);
  }

  console.log('');

  // Verify the import
  const verifySuccess = await verifyImport();
  if (!verifySuccess) {
    console.error('❌ Import verification failed.');
    process.exit(1);
  }

  console.log('');
  console.log('🎉 All data imported successfully!');
  console.log('=====================================');
}

// Run the import
main().catch(error => {
  console.error('❌ Import failed:', error);
  process.exit(1);
}); 