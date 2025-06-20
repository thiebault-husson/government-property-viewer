export interface TBuilding {
  locationCode: string;
  realPropertyAssetName: string;
  installationName: string;
  ownedOrLeased: 'F' | 'L'; // F = Federal/Owned, L = Leased
  gsaRegion: number;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: number;
  latitude: number;
  longitude: number;
  buildingRentableSquareFeet: number;
  availableSquareFeet: number;
  constructionDate: number;
  congressionalDistrict: number;
  congressionalDistrictRepresentativeName: string;
  buildingStatus: string;
  realPropertyAssetType: string;
}

export interface TLeasedProperty {
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
}

// Legacy alias for backward compatibility during transition
export type TOwnedProperty = TBuilding;

export interface TPropertyForTable {
  realPropertyAssetName: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  constructionDate?: string;
  ownedOrLeased: 'F' | 'L';
}

export interface TMapMarker {
  id: string;
  name: string;
  address: string;
  squareFootage: number;
  assetType: string;
  ownedOrLeased: 'F' | 'L';
  lat: number;
  lng: number;
}

export interface TChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface TDashboardStats {
  totalProperties: number;
  totalSquareFootage: number;
  averageSquareFootage: number;
  oldestBuilding: string;
  newestBuilding: string;
} 