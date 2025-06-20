#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join } from 'path';
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
    'latitude', 'longitude', 'building_rentable_square_feet', 
    'available_square_feet', 'zip_code', 'gsa_region', 'construction_date', 'congressional_district'
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

// Transform owned properties data with better field names
function transformOwnedProperty(row: any) {
  return {
    locationCode: String(row['Location_Code'] || row['Location Code'] || ''),
    realPropertyAssetName: String(row['Real_Property_Asset_Name'] || row['Real Property Asset Name'] || ''),
    installationName: String(row['Installation_Name'] || row['Installation Name'] || ''),
    ownedOrLeased: String(row['Owned_or_Leased'] || row['Owned or Leased'] || ''),
    gsaRegion: row['GSA_Region'] || row['GSA Region'] || null,
    streetAddress: String(row['Street_Address'] || row['Street Address'] || ''),
    city: String(row['City'] || ''),
    state: String(row['State'] || ''),
    zipCode: String(row['Zip_Code'] || row['Zip Code'] || ''),
    latitude: Number(row['Latitude'] || 0),
    longitude: Number(row['Longitude'] || 0),
    buildingRentableSquareFeet: Number(row['Building_Rentable_Square_Feet'] || row['Building Rentable Square Feet'] || 0),
    availableSquareFeet: Number(row['Available_Square_Feet'] || row['Available Square Feet'] || 0),
    constructionDate: row['Construction_Date'] || row['Construction Date'] || null,
    congressionalDistrict: row['Congressional_District'] || row['Congressional District'] || null,
    congressionalDistrictRepresentativeName: String(row['Congressional_District_Representative_Name'] || row['Congressional District Representative Name'] || ''),
    buildingStatus: String(row['Building_Status'] || row['Building Status'] || ''),
    realPropertyAssetType: String(row['Real_Property_Asset_Type'] || row['Real Property Asset Type'] || ''),
  };
}

// Transform leased properties data with better field names
function transformLeasedProperty(row: any) {
  return {
    locationCode: String(row['Location_Code'] || row['Location Code'] || ''),
    realPropertyAssetName: String(row['Real_Property_Asset_Name'] || row['Real Property Asset Name'] || ''),
    installationName: String(row['Installation_Name'] || row['Installation Name'] || ''),
    federalLeasedCode: String(row['Federal_Leased_Code'] || row['Federal Leased Code'] || ''),
    gsaRegion: row['GSA_Region'] || row['GSA Region'] || null,
    streetAddress: String(row['Street_Address'] || row['Street Address'] || ''),
    city: String(row['City'] || ''),
    state: String(row['State'] || ''),
    zipCode: String(row['Zip_Code'] || row['Zip Code'] || ''),
    latitude: Number(row['Latitude'] || 0),
    longitude: Number(row['Longitude'] || 0),
    buildingRentableSquareFeet: Number(row['Building_Rentable_Square_Feet'] || row['Building Rentable Square Feet'] || 0),
    availableSquareFeet: Number(row['Available_Square_Feet'] || row['Available Square Feet'] || 0),
    congressionalDistrict: row['Congressional_District'] || row['Congressional District'] || null,
    congressionalDistrictRepresentative: String(row['Congressional_District_Representative'] || row['Congressional District Representative'] || ''),
    leaseNumber: String(row['Lease_Number'] || row['Lease Number'] || ''),
    leaseEffectiveDate: String(row['Lease_Effective_Date'] || row['Lease Effective Date'] || ''),
    leaseExpirationDate: String(row['Lease_Expiration_Date'] || row['Lease Expiration Date'] || ''),
    realPropertyAssetType: String(row['Real_Property_Asset_type'] || row['Real Property Asset Type'] || ''),
  };
}

// Batch upload function with better error handling
async function uploadInBatches(collectionName: string, data: any[], batchSize = 100) {
  console.log(`Starting upload of ${data.length} documents to ${collectionName}...`);
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = writeBatch(db);
    const batchData = data.slice(i, i + batchSize);
    
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
      console.log(`✅ Uploaded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(data.length / batchSize)} to ${collectionName} (${batchData.length} docs)`);
    } catch (error) {
      console.error(`❌ Error uploading batch to ${collectionName}:`, error);
      // Continue with next batch instead of failing completely
      continue;
    }
  }
  
  console.log(`🎉 Successfully uploaded ${data.length} documents to ${collectionName}`);
}

// Main import function
async function importData() {
  try {
    console.log('🚀 Starting data import...\n');
    
    // Read and parse owned properties CSV
    console.log('📖 Reading owned properties CSV...');
    const ownedCsvPath = join(process.cwd(), '.cursor', '2025-6-6-iolp-buildings.csv');
    const ownedCsvContent = readFileSync(ownedCsvPath, 'utf-8');
    const ownedRawData = parseCSV(ownedCsvContent);
    const ownedData = ownedRawData.map(transformOwnedProperty).filter(item => item.locationCode); // Filter out empty records
    
    // Read and parse leased properties CSV
    console.log('📖 Reading leased properties CSV...');
    const leasedCsvPath = join(process.cwd(), '.cursor', '2025-6-6-iolp-leased-properties.csv');
    const leasedCsvContent = readFileSync(leasedCsvPath, 'utf-8');
    const leasedRawData = parseCSV(leasedCsvContent);
    const leasedData = leasedRawData.map(transformLeasedProperty).filter(item => item.locationCode); // Filter out empty records
    
    console.log(`\n📊 Data Summary:`);
    console.log(`   Owned Properties: ${ownedData.length}`);
    console.log(`   Leased Properties: ${leasedData.length}`);
    console.log(`   Total Properties: ${ownedData.length + leasedData.length}\n`);
    
    // Upload owned properties
    if (ownedData.length > 0) {
      await uploadInBatches('buildings', ownedData);
    }
    
    // Upload leased properties
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