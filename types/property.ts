export interface TOwnedProperty {
  locationCode: string;
  realPropertyAssetName: string;
  installationName: string;
  ownedOrLeased: 'F' | 'L'; // F = Federal/Owned, L = Leased
  gsaRegion: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  buildingRentableSquareFeet: number;
  availableSquareFeet: number;
  constructionDate: string;
  congressionalDistrict: string;
  congressionalDistrictRepresentativeName: string;
  buildingStatus: string;
  realPropertyAssetType: string;
}

export interface TLeasedProperty {
  locationCode: string;
  realPropertyAssetName: string;
  installationName: string;
  federalLeasedCode: string;
  gsaRegion: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  buildingRentableSquareFeet: number;
  availableSquareFeet: number;
  congressionalDistrict: string;
  congressionalDistrictRepresentative: string;
  leaseNumber: string;
  leaseEffectiveDate: string;
  leaseExpirationDate: string;
  realPropertyAssetType: string;
}

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