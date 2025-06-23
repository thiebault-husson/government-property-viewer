import { supabase } from '../supabaseClient';

// Types that match your existing interfaces
export interface TBuilding {
  locationCode: string;
  realPropertyAssetName: string;
  installationName: string;
  ownedOrLeased: 'F' | 'L';
  gsaRegion: number;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: number;
  latitude: number;
  longitude: number;
  buildingRentableSquareFeet: number;
  availableSquareFeet: number;
  constructionDate?: number;
  congressionalDistrict: number;
  congressionalDistrictRepresentativeName: string;
  buildingStatus: string;
  realPropertyAssetType: string;
}

export interface LeaseData {
  locationCode: string;
  realPropertyAssetName: string;
  installationName: string;
  federalLeasedCode: string;
  gsaRegion: number;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: number;
  latitude: number;
  longitude: number;
  buildingRentableSquareFeet: number;
  availableSquareFeet: number;
  congressionalDistrict: number;
  congressionalDistrictRepresentative: string;
  leaseNumber: string;
  leaseEffectiveDate: string;
  leaseExpirationDate: string;
  realPropertyAssetType: string;
  leaseStatus: 'active' | 'expired' | 'upcoming';
}

// Helper function to calculate lease status
function calculateLeaseStatus(effectiveDate: string, expirationDate: string): 'active' | 'expired' | 'upcoming' {
  if (!effectiveDate || !expirationDate) {
    return 'active';
  }
  
  const now = new Date();
  const startDate = new Date(effectiveDate);
  const endDate = new Date(expirationDate);
  
  if (now < startDate) {
    return 'upcoming';
  } else if (now > endDate) {
    return 'expired';
  } else {
    return 'active';
  }
}

// Convert Supabase row to TBuilding format
function convertToTBuilding(row: any): TBuilding {
  return {
    locationCode: row.location_code || '',
    realPropertyAssetName: row.real_property_asset_name || '',
    installationName: row.installation_name || '',
    ownedOrLeased: row.owned_or_leased || 'F',
    gsaRegion: row.gsa_region || 0,
    streetAddress: row.street_address || '',
    city: row.city || '',
    state: row.state || '',
    zipCode: row.zip_code || 0,
    latitude: row.latitude || 0,
    longitude: row.longitude || 0,
    buildingRentableSquareFeet: row.building_rentable_square_feet || 0,
    availableSquareFeet: row.available_square_feet || 0,
    constructionDate: row.construction_date || undefined,
    congressionalDistrict: row.congressional_district || 0,
    congressionalDistrictRepresentativeName: row.congressional_district_representative_name || '',
    buildingStatus: row.building_status || '',
    realPropertyAssetType: row.real_property_asset_type || '',
  };
}

// Convert Supabase row to LeaseData format
function convertToLeaseData(row: any): LeaseData {
  const effectiveDate = row.lease_effective_date || '';
  const expirationDate = row.lease_expiration_date || '';
  
  return {
    locationCode: row.location_code || '',
    realPropertyAssetName: row.real_property_asset_name || '',
    installationName: row.installation_name || '',
    federalLeasedCode: row.federal_leased_code || '',
    gsaRegion: row.gsa_region || 0,
    streetAddress: row.street_address || '',
    city: row.city || '',
    state: row.state || '',
    zipCode: row.zip_code || 0,
    latitude: row.latitude || 0,
    longitude: row.longitude || 0,
    buildingRentableSquareFeet: row.building_rentable_square_feet || 0,
    availableSquareFeet: row.available_square_feet || 0,
    congressionalDistrict: row.congressional_district || 0,
    congressionalDistrictRepresentative: row.congressional_district_representative || '',
    leaseNumber: row.lease_number || '',
    leaseEffectiveDate: effectiveDate,
    leaseExpirationDate: expirationDate,
    realPropertyAssetType: row.real_property_asset_type || '',
    leaseStatus: calculateLeaseStatus(effectiveDate, expirationDate),
  };
}

// Get all buildings from Supabase
export async function getAllBuildings(): Promise<TBuilding[]> {
  try {
    const { data, error } = await supabase
      .from('buildings')
      .select('*')
      .order('location_code');

    if (error) {
      console.error('Error fetching buildings from Supabase:', error);
      throw error;
    }

    return data.map(convertToTBuilding);
  } catch (error) {
    console.error('Error in getAllBuildings:', error);
    return [];
  }
}

// Get leased buildings only
export async function getLeasedBuildings(): Promise<TBuilding[]> {
  try {
    const { data, error } = await supabase
      .from('buildings')
      .select('*')
      .eq('owned_or_leased', 'L')
      .order('location_code');

    if (error) {
      console.error('Error fetching leased buildings from Supabase:', error);
      throw error;
    }

    return data.map(convertToTBuilding);
  } catch (error) {
    console.error('Error in getLeasedBuildings:', error);
    return [];
  }
}

// Get owned buildings only
export async function getOwnedBuildings(): Promise<TBuilding[]> {
  try {
    const { data, error } = await supabase
      .from('buildings')
      .select('*')
      .eq('owned_or_leased', 'F')
      .order('location_code');

    if (error) {
      console.error('Error fetching owned buildings from Supabase:', error);
      throw error;
    }

    return data.map(convertToTBuilding);
  } catch (error) {
    console.error('Error in getOwnedBuildings:', error);
    return [];
  }
}

// Get all lease data
export async function getAllLeaseData(): Promise<LeaseData[]> {
  try {
    const { data, error } = await supabase
      .from('leased_properties')
      .select('*')
      .order('location_code');

    if (error) {
      console.error('Error fetching lease data from Supabase:', error);
      throw error;
    }

    return data.map(convertToLeaseData);
  } catch (error) {
    console.error('Error in getAllLeaseData:', error);
    return [];
  }
}

// Get buildings with pagination (for map view)
export async function getBuildingsForMap(limit?: number): Promise<TBuilding[]> {
  try {
    let query = supabase
      .from('buildings')
      .select('*')
      .order('location_code');

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching buildings for map from Supabase:', error);
      throw error;
    }

    return data.map(convertToTBuilding);
  } catch (error) {
    console.error('Error in getBuildingsForMap:', error);
    return [];
  }
}

// Get building statistics
export async function getBuildingStatistics() {
  try {
    const [buildingsResult, leasedResult] = await Promise.all([
      supabase.from('buildings').select('*', { count: 'exact', head: true }),
      supabase.from('buildings').select('*', { count: 'exact', head: true }).eq('owned_or_leased', 'L')
    ]);

    const totalBuildings = buildingsResult.count || 0;
    const totalLeased = leasedResult.count || 0;
    const totalOwned = totalBuildings - totalLeased;

    return {
      totalBuildings,
      totalOwned,
      totalLeased,
      ownedPercentage: totalBuildings > 0 ? Math.round((totalOwned / totalBuildings) * 100) : 0,
      leasedPercentage: totalBuildings > 0 ? Math.round((totalLeased / totalBuildings) * 100) : 0,
    };
  } catch (error) {
    console.error('Error getting building statistics:', error);
    return {
      totalBuildings: 0,
      totalOwned: 0,
      totalLeased: 0,
      ownedPercentage: 0,
      leasedPercentage: 0,
    };
  }
}

// Get lease statistics
export async function getLeaseStatistics() {
  try {
    const { data, error } = await supabase
      .from('leased_properties')
      .select('lease_effective_date, lease_expiration_date');

    if (error) {
      console.error('Error fetching lease statistics from Supabase:', error);
      throw error;
    }

    const now = new Date();
    let activeLeases = 0;
    let expiredLeases = 0;
    let upcomingLeases = 0;
    let expiringSoon = 0;

    data.forEach(lease => {
      if (lease.lease_effective_date && lease.lease_expiration_date) {
        const startDate = new Date(lease.lease_effective_date);
        const endDate = new Date(lease.lease_expiration_date);
        const monthsToExpiry = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);

        if (now < startDate) {
          upcomingLeases++;
        } else if (now > endDate) {
          expiredLeases++;
        } else {
          activeLeases++;
          if (monthsToExpiry <= 12 && monthsToExpiry > 0) {
            expiringSoon++;
          }
        }
      }
    });

    return {
      totalLeases: data.length,
      activeLeases,
      expiredLeases,
      upcomingLeases,
      expiringSoon,
      leaseDataCoverage: 100, // Since we're pulling from structured DB
    };
  } catch (error) {
    console.error('Error getting lease statistics:', error);
    return {
      totalLeases: 0,
      activeLeases: 0,
      expiredLeases: 0,
      upcomingLeases: 0,
      expiringSoon: 0,
      leaseDataCoverage: 0,
    };
  }
} 