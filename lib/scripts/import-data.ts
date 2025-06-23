#!/usr/bin/env node

// Load environment variables from .env.local
import { config } from 'dotenv';
import { join } from 'path';

// Load .env.local file
config({ path: join(process.cwd(), '.env.local') });

import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, writeBatch, doc } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Improved CSV parsing function that handles quoted fields properly
function parseCSV(csvContent: string): any[] {
  const lines = csvContent.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  
  // Define which fields should be treated as numbers
  const numericFields = new Set([
    'gsa_region', 'zip_code', 'latitude', 'longitude', 'building_rentable_square_feet', 
    'available_square_feet',  'construction_date', 'congressional_district'
  ]);
  
  // Define which fields should be treated as dates (yyyy-mm-dd format)
  const dateFields = new Set([
    'lease_effective_date', 'lease_expiration_date'
  ]);
  
  return lines.slice(1).map((line, index) => {
    try {
      const values = parseCSVLine(line);
      const obj: any = {};
      
      headers.forEach((header, headerIndex) => {
        // Clean header name - remove quotes and special characters
        const cleanHeader = header.replace(/['"]/g, '').trim().replace(/[^\w\s]/g, '_');
        let value = values[headerIndex] || '';
        
        // Clean value - remove quotes and trim
        value = value.replace(/['"]/g, '').trim();
        
        // Convert to appropriate type
        if (value === '' || value === 'NA' || value === 'N/A' || value === 'null') {
          obj[cleanHeader] = null;
        } else if (dateFields.has(cleanHeader.toLowerCase()) && value !== '') {
          // Parse date from yyyy-mm-dd format
          const parsedDate = parseDate(value);
          obj[cleanHeader] = parsedDate;
        } else if (numericFields.has(cleanHeader.toLowerCase()) && !isNaN(Number(value)) && value !== '' && !isNaN(parseFloat(value))) {
          // Only convert to number if field is in our numeric whitelist
          obj[cleanHeader] = Number(value);
        } else {
          // Clean string values - remove problematic characters
          obj[cleanHeader] = value.replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
        }
      });
      
      return obj;
    } catch (error) {
      console.warn(`Warning: Skipping line ${index + 2} due to parsing error:`, error);
      return null;
    }
  }).filter(row => row !== null);
}

// Parse a single CSV line handling quoted fields with commas
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

// Parse date from yyyy-mm-dd format to JavaScript Date object
function parseDate(dateString: string): Date | null {
  if (!dateString || dateString.trim() === '') {
    return null;
  }
  
  // Validate yyyy-mm-dd format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    console.warn(`Invalid date format: ${dateString}. Expected yyyy-mm-dd format.`);
    return null;
  }
  
  const date = new Date(dateString + 'T00:00:00.000Z'); // Add time to ensure UTC
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    console.warn(`Invalid date: ${dateString}`);
    return null;
  }
  
  return date;
}

// Clean field names for Firestore (no dots, slashes, etc.)
function cleanFieldName(name: string): string {
  return name
    .replace(/['"]/g, '') // Remove quotes
    .trim()
    .replace(/[^\w\s]/g, '_') // Replace special chars with underscores
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .toLowerCase();
}

// Transform buildings data to TBuilding objects for the buildings collection
// This handles both owned (F) and leased (L) properties from the buildings CSV
function transformBuilding(row: any) {
  // Helper function to clean string values
  const cleanString = (value: any): string => {
    if (!value) return '';
    return String(value)
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\0/g, '') // Remove null bytes
      .trim();
  };

  // Helper function to clean and validate numbers
  const cleanNumber = (value: any): number => {
    if (!value || value === '' || value === 'N/A' || value === 'NA') return 0;
    const num = Number(value);
    return isNaN(num) || !isFinite(num) ? 0 : num;
  };

  return {
    locationCode: cleanString(row['Location_Code'] || row['Location Code']),
    realPropertyAssetName: cleanString(row['Real_Property_Asset_Name'] || row['Real Property Asset Name']),
    installationName: cleanString(row['Installation_Name'] || row['Installation Name']),
    ownedOrLeased: cleanString(row['Owned_or_Leased'] || row['Owned or Leased']),
    gsaRegion: cleanNumber(row['GSA_Region'] || row['GSA Region']),
    streetAddress: cleanString(row['Street_Address'] || row['Street Address']),
    city: cleanString(row['City']),
    state: cleanString(row['State']),
    zipCode: cleanNumber(row['Zip_Code'] || row['Zip Code']),
    latitude: cleanNumber(row['Latitude']),
    longitude: cleanNumber(row['Longitude']),
    buildingRentableSquareFeet: cleanNumber(row['Building_Rentable_Square_Feet'] || row['Building Rentable Square Feet']),
    availableSquareFeet: cleanNumber(row['Available_Square_Feet'] || row['Available Square Feet']),
    constructionDate: cleanNumber(row['Construction_Date'] || row['Construction Date']),
    congressionalDistrict: cleanNumber(row['Congressional_District'] || row['Congressional District']),
    congressionalDistrictRepresentativeName: cleanString(row['Congressional_District_Representative_Name'] || row['Congressional District Representative Name']),
    buildingStatus: cleanString(row['Building_Status'] || row['Building Status']),
    realPropertyAssetType: cleanString(row['Real_Property_Asset_Type'] || row['Real Property Asset Type']),
  };
}

// Transform leased properties data with additional lease-specific fields
function transformLeasedProperty(row: any) {
  // Helper function to clean string values
  const cleanString = (value: any): string => {
    if (!value) return '';
    return String(value)
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\0/g, '') // Remove null bytes
      .trim();
  };

  // Helper function to clean and validate numbers
  const cleanNumber = (value: any): number => {
    if (!value || value === '' || value === 'N/A' || value === 'NA') return 0;
    const num = Number(value);
    return isNaN(num) || !isFinite(num) ? 0 : num;
  };

  return {
    locationCode: cleanString(row['Location_Code'] || row['Location Code']),
    realPropertyAssetName: cleanString(row['Real_Property_Asset_Name'] || row['Real Property Asset Name']),
    installationName: cleanString(row['Installation_Name'] || row['Installation Name']),
    federalLeasedCode: cleanString(row['Federal_Leased_Code'] || row['Federal Leased Code']),
    gsaRegion: cleanNumber(row['GSA_Region'] || row['GSA Region']),
    streetAddress: cleanString(row['Street_Address'] || row['Street Address']),
    city: cleanString(row['City']),
    state: cleanString(row['State']),
    zipCode: cleanNumber(row['Zip_Code'] || row['Zip Code']),
    latitude: cleanNumber(row['Latitude']),
    longitude: cleanNumber(row['Longitude']),
    buildingRentableSquareFeet: cleanNumber(row['Building_Rentable_Square_Feet'] || row['Building Rentable Square Feet']),
    availableSquareFeet: cleanNumber(row['Available_Square_Feet'] || row['Available Square Feet']),
    congressionalDistrict: cleanNumber(row['Congressional_District'] || row['Congressional District']),
    congressionalDistrictRepresentative: cleanString(row['Congressional_District_Representative'] || row['Congressional District Representative']),
    leaseNumber: cleanString(row['Lease_Number'] || row['Lease Number']),
    leaseEffectiveDate: row['Lease_Effective_Date'] || row['Lease Effective Date'] || null,
    leaseExpirationDate: row['Lease_Expiration_Date'] || row['Lease Expiration Date'] || null,
    realPropertyAssetType: cleanString(row['Real_Property_Asset_type'] || row['Real Property Asset Type']),
  };
}

// Batch upload function with better error handling and validation
async function uploadInBatches(collectionName: string, data: any[], batchSize = 100) {
  console.log(`Starting upload of ${data.length} documents to ${collectionName}...`);
  
  // Validate data before uploading
  const validData = data.filter((item, index) => {
    try {
      // Check for required fields
      if (!item.locationCode || typeof item.locationCode !== 'string') {
        console.warn(`Skipping document ${index}: missing or invalid locationCode`);
        return false;
      }
      
      // Check for invalid field names (Firestore restrictions)
      for (const key of Object.keys(item)) {
        if (key.startsWith('__') || key.includes('.') || key.includes('/')) {
          console.warn(`Skipping document ${index}: invalid field name "${key}"`);
          return false;
        }
      }
      
      // Check for invalid values
      for (const [key, value] of Object.entries(item)) {
        if (typeof value === 'string') {
          // Check for null bytes or other problematic characters
          if (value.includes('\0') || /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(value)) {
            console.warn(`Skipping document ${index}: invalid characters in field "${key}"`);
            return false;
          }
        } else if (typeof value === 'number') {
          // Check for NaN or Infinity
          if (!isFinite(value)) {
            console.warn(`Skipping document ${index}: invalid number in field "${key}": ${value}`);
            return false;
          }
        }
      }
      
      return true;
    } catch (error) {
      console.warn(`Skipping document ${index}: validation error:`, error);
      return false;
    }
  });
  
  console.log(`Validated ${validData.length} out of ${data.length} documents`);
  
  for (let i = 0; i < validData.length; i += batchSize) {
    const batch = writeBatch(db);
    const batchData = validData.slice(i, i + batchSize);
    
    batchData.forEach((item, index) => {
      try {
        const docRef = doc(collection(db, collectionName));
        batch.set(docRef, item);
      } catch (error) {
        console.error(`Error preparing document ${i + index}:`, error);
        console.error('Problematic data:', JSON.stringify(item, null, 2));
      }
    });
    
    try {
      await batch.commit();
      console.log(`✅ Uploaded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(validData.length / batchSize)} to ${collectionName} (${batchData.length} docs)`);
    } catch (error) {
      console.error(`❌ Error uploading batch to ${collectionName}:`, error);
      // Log the first few items in the problematic batch for debugging
      console.error('Problematic batch sample:', JSON.stringify(batchData.slice(0, 3), null, 2));
      // Continue with next batch instead of failing completely
      continue;
    }
  }
  
  console.log(`🎉 Successfully uploaded ${validData.length} documents to ${collectionName}`);
}

// Main import function
async function importData() {
  try {
    console.log('🚀 Starting data import...\n');
    
    // Read and parse buildings CSV (contains both owned and leased properties)
    console.log('📖 Reading buildings CSV...');
    const buildingsCsvPath = join(process.cwd(), 'app', 'db', '2025-6-6-iolp-buildings.csv');
    const buildingsCsvContent = readFileSync(buildingsCsvPath, 'utf-8');
    const buildingsRawData = parseCSV(buildingsCsvContent);
    const buildingsData = buildingsRawData.map(transformBuilding).filter(item => item.locationCode); // Filter out empty records
    
    // Read and parse leased properties CSV (lease-specific details)
    console.log('📖 Reading leased properties CSV...');
    const leasedCsvPath = join(process.cwd(), 'app', 'db', '2025-6-6-iolp-leased-properties.csv');
    const leasedCsvContent = readFileSync(leasedCsvPath, 'utf-8');
    const leasedRawData = parseCSV(leasedCsvContent);
    const leasedData = leasedRawData.map(transformLeasedProperty).filter(item => item.locationCode); // Filter out empty records
    
    // Count owned vs leased in buildings data
    const ownedCount = buildingsData.filter(building => building.ownedOrLeased === 'F').length;
    const leasedCount = buildingsData.filter(building => building.ownedOrLeased === 'L').length;
    
    console.log(`\n📊 Data Summary:`);
    console.log(`   Buildings (Total): ${buildingsData.length}`);
    console.log(`     - Federal Owned: ${ownedCount}`);
    console.log(`     - Leased: ${leasedCount}`);
    console.log(`   Lease Details: ${leasedData.length}`);
    console.log(`   Total Records: ${buildingsData.length + leasedData.length}\n`);
    
    // Upload buildings (both owned and leased)
    if (buildingsData.length > 0) {
      await uploadInBatches('buildings', buildingsData);
    }
    
    // Upload leased properties with additional lease details
    if (leasedData.length > 0) {
      await uploadInBatches('leasedProperties', leasedData);
    }
    
    console.log('\n🎉 Data import completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run "npm run dev" to start the development server');
    console.log('2. Visit http://localhost:3000 to view your application');
    
  } catch (error) {
    console.error('❌ Error importing data:', error);
    process.exit(1);
  }
}

// Run import if executed directly
if (require.main === module) {
  importData();
}

export { importData }; 