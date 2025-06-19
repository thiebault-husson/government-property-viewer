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

// CSV parsing function
function parseCSV(csvContent: string): any[] {
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj: any = {};
    
    headers.forEach((header, index) => {
      // Clean header name
      const cleanHeader = header.replace(/"/g, '').trim();
      let value = values[index] || '';
      
      // Clean value
      value = value.replace(/"/g, '').trim();
      
      // Convert to appropriate type
      if (value === '' || value === 'NA' || value === 'N/A') {
        obj[cleanHeader] = null;
      } else if (!isNaN(Number(value)) && value !== '') {
        obj[cleanHeader] = Number(value);
      } else {
        obj[cleanHeader] = value;
      }
    });
    
    return obj;
  });
}

// Transform owned properties data
function transformOwnedProperty(row: any) {
  return {
    locationCode: row['Location Code'] || '',
    realPropertyAssetName: row['Real Property Asset Name'] || '',
    installationName: row['Installation Name'] || '',
    ownedOrLeased: row['Owned or Leased'] || '',
    gsaRegion: row['GSA Region'] || '',
    streetAddress: row['Street Address'] || '',
    city: row['City'] || '',
    state: row['State'] || '',
    zipCode: row['Zip Code'] || '',
    latitude: row['Latitude'] || 0,
    longitude: row['Longitude'] || 0,
    buildingRentableSquareFeet: row['Building Rentable Square Feet'] || 0,
    availableSquareFeet: row['Available Square Feet'] || 0,
    constructionDate: row['Construction Date'] || '',
    congressionalDistrict: row['Congressional District'] || '',
    congressionalDistrictRepresentativeName: row['Congressional District Representative Name'] || '',
    buildingStatus: row['Building Status'] || '',
    realPropertyAssetType: row['Real Property Asset Type'] || '',
  };
}

// Transform leased properties data
function transformLeasedProperty(row: any) {
  return {
    locationCode: row['Location Code'] || '',
    realPropertyAssetName: row['Real Property Asset Name'] || '',
    installationName: row['Installation Name'] || '',
    federalLeasedCode: row['Federal Leased Code'] || '',
    gsaRegion: row['GSA Region'] || '',
    streetAddress: row['Street Address'] || '',
    city: row['City'] || '',
    state: row['State'] || '',
    zipCode: row['Zip Code'] || '',
    latitude: row['Latitude'] || 0,
    longitude: row['Longitude'] || 0,
    buildingRentableSquareFeet: row['Building Rentable Square Feet'] || 0,
    availableSquareFeet: row['Available Square Feet'] || 0,
    congressionalDistrict: row['Congressional District'] || '',
    congressionalDistrictRepresentative: row['Congressional District Representative'] || '',
    leaseNumber: row['Lease Number'] || '',
    leaseEffectiveDate: row['Lease Effective Date'] || '',
    leaseExpirationDate: row['Lease Expiration Date'] || '',
    realPropertyAssetType: row['Real Property Asset type'] || '',
  };
}

// Batch upload function
async function uploadInBatches(collectionName: string, data: any[], batchSize = 500) {
  console.log(`Starting upload of ${data.length} documents to ${collectionName}...`);
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = writeBatch(db);
    const batchData = data.slice(i, i + batchSize);
    
    batchData.forEach((item) => {
      const docRef = doc(collection(db, collectionName));
      batch.set(docRef, item);
    });
    
    try {
      await batch.commit();
      console.log(`Uploaded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(data.length / batchSize)} to ${collectionName}`);
    } catch (error) {
      console.error(`Error uploading batch to ${collectionName}:`, error);
      throw error;
    }
  }
  
  console.log(`✅ Successfully uploaded ${data.length} documents to ${collectionName}`);
}

// Main import function
async function importData() {
  try {
    // Read and parse owned properties CSV
    const ownedCsvPath = join(process.cwd(), '.cursor', '2025-6-6-iolp-buildings.csv');
    const ownedCsvContent = readFileSync(ownedCsvPath, 'utf-8');
    const ownedRawData = parseCSV(ownedCsvContent);
    const ownedData = ownedRawData.map(transformOwnedProperty);
    
    // Read and parse leased properties CSV
    const leasedCsvPath = join(process.cwd(), '.cursor', '2025-6-6-IOLP-Leased-Properties.csv');
    const leasedCsvContent = readFileSync(leasedCsvPath, 'utf-8');
    const leasedRawData = parseCSV(leasedCsvContent);
    const leasedData = leasedRawData.map(transformLeasedProperty);
    
    console.log(`📊 Data Summary:`);
    console.log(`   Owned Properties: ${ownedData.length}`);
    console.log(`   Leased Properties: ${leasedData.length}`);
    console.log(`   Total Properties: ${ownedData.length + leasedData.length}`);
    
    // Upload owned properties
    await uploadInBatches('ownedProperties', ownedData);
    
    // Upload leased properties
    await uploadInBatches('leasedProperties', leasedData);
    
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