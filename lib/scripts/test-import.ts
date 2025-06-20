#!/usr/bin/env node

// Load environment variables from .env.local
import { config } from 'dotenv';
import { join } from 'path';

// Load .env.local file
config({ path: join(process.cwd(), '.env.local') });

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

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

async function testSingleUpload() {
  try {
    console.log('🧪 Testing single document upload...');
    
    // Simple test document
    const testDoc = {
      locationCode: 'TEST001',
      realPropertyAssetName: 'Test Building',
      installationName: 'Test Installation',
      ownedOrLeased: 'F',
      gsaRegion: 1,
      streetAddress: '123 Test St',
      city: 'Test City',
      state: 'TS',
      zipCode: 12345,
      latitude: 40.7128,
      longitude: -74.0060,
      buildingRentableSquareFeet: 10000,
      availableSquareFeet: 1000,
      constructionDate: 2000,
      congressionalDistrict: 1,
      congressionalDistrictRepresentativeName: 'Test Representative',
      buildingStatus: 'Active',
      realPropertyAssetType: 'Office Building',
    };
    
    console.log('Test document:', JSON.stringify(testDoc, null, 2));
    
    const docRef = await addDoc(collection(db, 'buildings'), testDoc);
    console.log('✅ Document written with ID: ', docRef.id);
    
  } catch (error) {
    console.error('❌ Error adding document: ', error);
  }
}

testSingleUpload(); 