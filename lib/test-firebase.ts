import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from './firebase/config';

export async function testFirebaseConnection() {
  console.log('🧪 Testing Firebase connection...');
  
  try {
    // Test buildings collection
    console.log('📊 Testing buildings collection...');
    const buildingsQuery = query(collection(db, 'buildings'), limit(5));
    const buildingsSnapshot = await getDocs(buildingsQuery);
    console.log(`✅ Buildings collection: ${buildingsSnapshot.size} documents (sample)`);
    
    if (buildingsSnapshot.size > 0) {
      const sampleBuilding = buildingsSnapshot.docs[0].data();
      console.log('📋 Sample building data:', {
        locationCode: sampleBuilding.locationCode,
        realPropertyAssetName: sampleBuilding.realPropertyAssetName,
        city: sampleBuilding.city,
        state: sampleBuilding.state,
        ownedOrLeased: sampleBuilding.ownedOrLeased
      });
    }
    
    // Test leased properties collection
    console.log('📊 Testing leasedProperties collection...');
    const leasedQuery = query(collection(db, 'leasedProperties'), limit(5));
    const leasedSnapshot = await getDocs(leasedQuery);
    console.log(`✅ Leased properties collection: ${leasedSnapshot.size} documents (sample)`);
    
    if (leasedSnapshot.size > 0) {
      const sampleLeased = leasedSnapshot.docs[0].data();
      console.log('📋 Sample leased property data:', {
        locationCode: sampleLeased.locationCode,
        realPropertyAssetName: sampleLeased.realPropertyAssetName,
        city: sampleLeased.city,
        state: sampleLeased.state,
        leaseNumber: sampleLeased.leaseNumber
      });
    }
    
    return {
      success: true,
      buildingsCount: buildingsSnapshot.size,
      leasedCount: leasedSnapshot.size
    };
    
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 