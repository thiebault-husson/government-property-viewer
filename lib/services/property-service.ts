import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { TBuilding, TLeasedProperty, TPropertyForTable, TMapMarker } from '@/types/property';

// Collection names
const COLLECTIONS = {
  BUILDINGS: 'buildings',
  LEASED_PROPERTIES: 'leasedProperties',
};

// Generic function to get all documents from a collection
async function getCollection<T>(collectionName: string): Promise<T[]> {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  } catch (error) {
    console.error(`❌ Error fetching ${collectionName}:`, error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    }
    throw error; // Re-throw to handle in calling function
  }
}

// Get all buildings (owned properties)
export async function getAllBuildings(): Promise<TBuilding[]> {
  return getCollection<TBuilding>(COLLECTIONS.BUILDINGS);
}

// Get all leased properties
export async function getAllLeasedProperties(): Promise<TLeasedProperty[]> {
  return getCollection<TLeasedProperty>(COLLECTIONS.LEASED_PROPERTIES);
}

// Get all properties for table display with progress tracking
export async function getAllPropertiesForTable(
  onProgress?: (progress: number, message: string) => void
): Promise<TPropertyForTable[]> {
  try {
    onProgress?.(0, 'Connecting to database...');
    
    // The buildings collection contains BOTH owned and leased properties
    // We don't need to merge with leasedProperties collection for the table view
    onProgress?.(20, 'Fetching buildings data...');
    
    const buildings = await getAllBuildings();
    
    onProgress?.(60, 'Processing property data...');
    
    const propertiesForTable: TPropertyForTable[] = buildings.map((prop, index) => {
      // Update progress during processing for large datasets
      if (index % 1000 === 0) {
        const processingProgress = 60 + (index / buildings.length) * 30;
        onProgress?.(processingProgress, `Processing ${index + 1} of ${buildings.length} properties...`);
      }
      
      return {
        realPropertyAssetName: prop.realPropertyAssetName,
        streetAddress: prop.streetAddress,
        city: prop.city,
        state: prop.state,
        zipCode: String(prop.zipCode),
        constructionDate: prop.constructionDate ? String(prop.constructionDate) : undefined,
        ownedOrLeased: prop.ownedOrLeased,
      };
    });

    onProgress?.(95, 'Finalizing data...');
    
    // Small delay to show final progress
    await new Promise(resolve => setTimeout(resolve, 200));
    
    onProgress?.(100, 'Data loaded successfully!');

    return propertiesForTable;
  } catch (error) {
    console.error('Error fetching properties for table:', error);
    onProgress?.(0, 'Error loading data');
    return [];
  }
}

// Get properties for map display with limit (optimized for initial load)
export async function getAllPropertiesForMapWithLimit(limitCount: number): Promise<TMapMarker[]> {
  try {
    
    // Use Firebase query with limit for better performance
    const q = query(
      collection(db, COLLECTIONS.BUILDINGS),
      limit(limitCount * 2) // Fetch 2x the limit to account for properties without coordinates
    );
    
    const querySnapshot = await getDocs(q);
    const buildings = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as TBuilding));
    

    // Filter for valid coordinates and apply final limit
    const validBuildings = buildings.filter(prop => 
      prop.latitude && prop.longitude && 
      prop.latitude !== 0 && prop.longitude !== 0
    );


    // Apply the final limit to valid properties
    const limitedBuildings = validBuildings.slice(0, limitCount);

    const markers: TMapMarker[] = limitedBuildings.map(prop => ({
      id: prop.locationCode,
      name: prop.realPropertyAssetName,
      address: `${prop.streetAddress}, ${prop.city}, ${prop.state} ${prop.zipCode}`,
      squareFootage: prop.buildingRentableSquareFeet || 0,
      assetType: prop.realPropertyAssetType,
      ownedOrLeased: prop.ownedOrLeased,
      lat: prop.latitude,
      lng: prop.longitude,
    }));

    return markers;
  } catch (error) {
    console.error('Error fetching limited properties for map:', error);
    return [];
  }
}

// Get all properties for map display (fallback for "All" option)
export async function getAllPropertiesForMap(): Promise<TMapMarker[]> {
  try {
    
    // The buildings collection contains BOTH owned and leased properties
    const buildings = await getAllBuildings();

    // Analyze coordinate data
    let hasLatLng = 0;
    let missingLat = 0;
    let missingLng = 0;
    let missingBoth = 0;
    let zeroCoords = 0;
    let validCoords = 0;

    buildings.forEach(prop => {
      if (prop.latitude && prop.longitude) {
        hasLatLng++;
        if (prop.latitude === 0 || prop.longitude === 0) {
          zeroCoords++;
        } else {
          validCoords++;
        }
      } else {
        if (!prop.latitude && !prop.longitude) missingBoth++;
        else if (!prop.latitude) missingLat++;
        else if (!prop.longitude) missingLng++;
      }
    });


    // Sample some coordinate data
    const sampleWithCoords = buildings.filter(p => p.latitude && p.longitude).slice(0, 5);
    const sampleWithoutCoords = buildings.filter(p => !p.latitude || !p.longitude).slice(0, 5);
    
    sampleWithCoords.forEach((prop, i) => {
    });

    sampleWithoutCoords.forEach((prop, i) => {
    });

    const markers: TMapMarker[] = buildings
      .filter(prop => prop.latitude && prop.longitude && prop.latitude !== 0 && prop.longitude !== 0)
      .map(prop => ({
        id: prop.locationCode,
        name: prop.realPropertyAssetName,
        address: `${prop.streetAddress}, ${prop.city}, ${prop.state} ${prop.zipCode}`,
        squareFootage: prop.buildingRentableSquareFeet || 0,
        assetType: prop.realPropertyAssetType,
        ownedOrLeased: prop.ownedOrLeased,
        lat: prop.latitude,
        lng: prop.longitude,
      }));

    return markers;
  } catch (error) {
    console.error('Error fetching properties for map:', error);
    return [];
  }
}

// Get owned properties for dashboard with progress tracking
export async function getOwnedPropertiesForDashboard(
  onProgress?: (progress: number, message: string) => void
): Promise<TBuilding[]> {
  try {
    onProgress?.(0, 'Connecting to database...');
    
    onProgress?.(10, 'Querying owned properties...');
    const q = query(
      collection(db, COLLECTIONS.BUILDINGS),
      where('ownedOrLeased', '==', 'F'),
      orderBy('constructionDate', 'asc')
    );
    
    onProgress?.(30, 'Fetching owned properties data...');
    const querySnapshot = await getDocs(q);
    
    onProgress?.(60, 'Processing owned properties...');
    const buildings = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as TBuilding));
    
    onProgress?.(95, 'Finalizing owned properties data...');
    
    // Small delay to show final progress
    await new Promise(resolve => setTimeout(resolve, 200));
    
    onProgress?.(100, 'Owned properties loaded successfully!');
    
    return buildings;
  } catch (error) {
    console.error('Error fetching owned properties for dashboard:', error);
    onProgress?.(0, 'Error loading owned properties');
    return [];
  }
}

// Get leased properties for dashboard
export async function getLeasedPropertiesForDashboard(): Promise<TLeasedProperty[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.LEASED_PROPERTIES),
      orderBy('leaseExpirationDate', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as TLeasedProperty));
  } catch (error) {
    console.error('Error fetching leased properties for dashboard:', error);
    return [];
  }
} 