import { TBuilding } from '@/types/property';
import { DATA_SOURCE } from '@/lib/config/data-source';

// Firebase service imports (only imported when needed)
let firebaseService: any = null;

// Lazy load Firebase service only when needed
async function getFirebaseService() {
  if (!firebaseService) {
    const { getAllPropertiesForTable, getAllPropertiesForMap } = await import('./property-service');
    firebaseService = {
      getAllPropertiesForTable,
      getAllPropertiesForMap
    };
  }
  return firebaseService;
}

// CSV service functions using API calls
async function fetchBuildingsFromAPI(limit?: number): Promise<TBuilding[]> {
  try {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    params.append('mapData', 'true'); // Filter for valid coordinates
    
    const response = await fetch(`/api/buildings?${params}`);
    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.buildings || [];
  } catch (error) {
    console.error('Error fetching buildings from API:', error);
    return [];
  }
}

async function getAllBuildingsFromAPI(
  page: number = 1,
  limit: number = 25,
  filters: {
    search?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    constructionDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<{ buildings: TBuilding[]; total: number; hasMore: boolean }> {
  try {
    // For CSV, we'll fetch all data and handle pagination/filtering on client
    // This is acceptable since CSV files are local and fast
    const allBuildings = await fetchBuildingsFromAPI();
    
    let filtered = allBuildings;

    // Apply filters
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(building =>
        building.realPropertyAssetName.toLowerCase().includes(searchTerm) ||
        building.streetAddress.toLowerCase().includes(searchTerm) ||
        building.city.toLowerCase().includes(searchTerm) ||
        building.state.toLowerCase().includes(searchTerm) ||
        building.installationName.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.city) {
      filtered = filtered.filter(building => building.city === filters.city);
    }

    if (filters.state) {
      filtered = filtered.filter(building => building.state === filters.state);
    }

    if (filters.zipCode) {
      filtered = filtered.filter(building => building.zipCode.toString() === filters.zipCode);
    }

    if (filters.constructionDate && filters.constructionDate !== 'all') {
      if (filters.constructionDate === 'unknown') {
        filtered = filtered.filter(building => !building.constructionDate || building.constructionDate === 0);
      } else {
        const decade = parseInt(filters.constructionDate);
        filtered = filtered.filter(building => {
          if (!building.constructionDate || building.constructionDate === 0) return false;
          return building.constructionDate >= decade && building.constructionDate < decade + 10;
        });
      }
    }

    // Apply sorting
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        let aValue: any = a[filters.sortBy as keyof TBuilding];
        let bValue: any = b[filters.sortBy as keyof TBuilding];

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return filters.sortOrder === 'asc' ? 1 : -1;
        if (bValue == null) return filters.sortOrder === 'asc' ? -1 : 1;

        if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedBuildings = filtered.slice(startIndex, endIndex);
    const hasMore = endIndex < total;

    return {
      buildings: paginatedBuildings,
      total,
      hasMore
    };
  } catch (error) {
    console.error('Error in getAllBuildingsFromAPI:', error);
    return { buildings: [], total: 0, hasMore: false };
  }
}

async function getUniqueFilterValuesFromAPI(): Promise<{
  cities: string[];
  states: string[];
  zipCodes: string[];
  constructionDecades: string[];
}> {
  try {
    const buildings = await fetchBuildingsFromAPI();
    
    const cities = Array.from(new Set(buildings.map(b => b.city).filter(Boolean))).sort();
    const states = Array.from(new Set(buildings.map(b => b.state).filter(Boolean))).sort();
    const zipCodes = Array.from(new Set(buildings.map(b => b.zipCode.toString()).filter(z => z !== '0'))).sort();
    
    const decades = new Set<string>();
    buildings.forEach(building => {
      if (building.constructionDate && building.constructionDate > 0) {
        const decade = Math.floor(building.constructionDate / 10) * 10;
        decades.add(decade.toString());
      }
    });
    const constructionDecades = Array.from(decades).sort();

    return { cities, states, zipCodes, constructionDecades };
  } catch (error) {
    console.error('Error getting filter values from API:', error);
    return { cities: [], states: [], zipCodes: [], constructionDecades: [] };
  }
}

async function getBuildingStatsFromAPI(): Promise<{
  total: number;
  owned: number;
  leased: number;
  withCoordinates: number;
}> {
  try {
    const buildings = await fetchBuildingsFromAPI();
    
    return {
      total: buildings.length,
      owned: buildings.filter(b => b.ownedOrLeased === 'F').length,
      leased: buildings.filter(b => b.ownedOrLeased === 'L').length,
      withCoordinates: buildings.filter(b => b.latitude && b.longitude && b.latitude !== 0 && b.longitude !== 0).length
    };
  } catch (error) {
    console.error('Error getting building stats from API:', error);
    return { total: 0, owned: 0, leased: 0, withCoordinates: 0 };
  }
}

// Unified interface for getting all buildings with pagination and filters
export async function getAllBuildings(
  page: number = 1,
  limit: number = 25,
  filters: {
    search?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    constructionDate?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}
): Promise<{ buildings: TBuilding[]; total: number; hasMore: boolean }> {
  
  if (DATA_SOURCE === 'csv') {
    return getAllBuildingsFromAPI(page, limit, filters);
  } else {
    const firebase = await getFirebaseService();
    return await firebase.getAllPropertiesForTable(page, limit, filters);
  }
}

// Unified interface for getting buildings for map
export async function getAllBuildingsForMap(limit?: number): Promise<TBuilding[]> {
  
  if (DATA_SOURCE === 'csv') {
    return fetchBuildingsFromAPI(limit);
  } else {
    const firebase = await getFirebaseService();
    return await firebase.getAllPropertiesForMap(limit);
  }
}

// Unified interface for getting unique filter values
export async function getUniqueFilterValues(): Promise<{
  cities: string[];
  states: string[];
  zipCodes: string[];
  constructionDecades: string[];
}> {
  
  if (DATA_SOURCE === 'csv') {
    return getUniqueFilterValuesFromAPI();
  } else {
    const firebase = await getFirebaseService();
    return await firebase.getUniqueFilterValues();
  }
}

// Unified interface for getting building statistics
export async function getBuildingStats(): Promise<{
  total: number;
  owned: number;
  leased: number;
  withCoordinates: number;
}> {
  
  if (DATA_SOURCE === 'csv') {
    return getBuildingStatsFromAPI();
  } else {
    const firebase = await getFirebaseService();
    return await firebase.getBuildingStats();
  }
}

// Helper function to get data source info
export function getDataSourceInfo(): {
  source: 'firebase' | 'csv';
  description: string;
} {
  return {
    source: DATA_SOURCE,
    description: DATA_SOURCE === 'csv' 
      ? 'Reading data from local CSV files' 
      : 'Reading data from Firebase Firestore'
  };
} 