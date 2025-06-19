import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { TOwnedProperty, TLeasedProperty, TPropertyForTable, TMapMarker } from '@/types/property';

export const COLLECTIONS = {
  OWNED_PROPERTIES: 'ownedProperties',
  LEASED_PROPERTIES: 'leasedProperties',
} as const;

// Generic function to get all documents from a collection
async function getCollection<T>(collectionName: string): Promise<T[]> {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  } catch (error) {
    console.error(`Error fetching ${collectionName}:`, error);
    return [];
  }
}

// Get all owned properties
export async function getAllOwnedProperties(): Promise<TOwnedProperty[]> {
  return getCollection<TOwnedProperty>(COLLECTIONS.OWNED_PROPERTIES);
}

// Get all leased properties
export async function getAllLeasedProperties(): Promise<TLeasedProperty[]> {
  return getCollection<TLeasedProperty>(COLLECTIONS.LEASED_PROPERTIES);
}

// Get all properties for table display
export async function getAllPropertiesForTable(): Promise<TPropertyForTable[]> {
  try {
    const [ownedProperties, leasedProperties] = await Promise.all([
      getAllOwnedProperties(),
      getAllLeasedProperties(),
    ]);

    const ownedForTable: TPropertyForTable[] = ownedProperties.map(prop => ({
      realPropertyAssetName: prop.realPropertyAssetName,
      streetAddress: prop.streetAddress,
      city: prop.city,
      state: prop.state,
      zipCode: prop.zipCode,
      constructionDate: prop.constructionDate,
      ownedOrLeased: prop.ownedOrLeased,
    }));

    const leasedForTable: TPropertyForTable[] = leasedProperties.map(prop => ({
      realPropertyAssetName: prop.realPropertyAssetName,
      streetAddress: prop.streetAddress,
      city: prop.city,
      state: prop.state,
      zipCode: prop.zipCode,
      ownedOrLeased: 'L' as const,
    }));

    return [...ownedForTable, ...leasedForTable];
  } catch (error) {
    console.error('Error fetching properties for table:', error);
    return [];
  }
}

// Get all properties for map display
export async function getAllPropertiesForMap(): Promise<TMapMarker[]> {
  try {
    const [ownedProperties, leasedProperties] = await Promise.all([
      getAllOwnedProperties(),
      getAllLeasedProperties(),
    ]);

    const ownedMarkers: TMapMarker[] = ownedProperties
      .filter(prop => prop.latitude && prop.longitude)
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

    const leasedMarkers: TMapMarker[] = leasedProperties
      .filter(prop => prop.latitude && prop.longitude)
      .map(prop => ({
        id: prop.locationCode,
        name: prop.realPropertyAssetName,
        address: `${prop.streetAddress}, ${prop.city}, ${prop.state} ${prop.zipCode}`,
        squareFootage: prop.buildingRentableSquareFeet || 0,
        assetType: prop.realPropertyAssetType,
        ownedOrLeased: 'L' as const,
        lat: prop.latitude,
        lng: prop.longitude,
      }));

    return [...ownedMarkers, ...leasedMarkers];
  } catch (error) {
    console.error('Error fetching properties for map:', error);
    return [];
  }
}

// Get owned properties for dashboard
export async function getOwnedPropertiesForDashboard(): Promise<TOwnedProperty[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.OWNED_PROPERTIES),
      where('ownedOrLeased', '==', 'F'),
      orderBy('constructionDate', 'asc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TOwnedProperty));
  } catch (error) {
    console.error('Error fetching owned properties for dashboard:', error);
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
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TLeasedProperty));
  } catch (error) {
    console.error('Error fetching leased properties for dashboard:', error);
    return [];
  }
} 