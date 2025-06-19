import { z } from 'zod';

export const OwnedPropertySchema = z.object({
  locationCode: z.string(),
  realPropertyAssetName: z.string(),
  installationName: z.string(),
  ownedOrLeased: z.enum(['F', 'L']),
  gsaRegion: z.string(),
  streetAddress: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  buildingRentableSquareFeet: z.number(),
  availableSquareFeet: z.number(),
  constructionDate: z.string(),
  congressionalDistrict: z.string(),
  congressionalDistrictRepresentativeName: z.string(),
  buildingStatus: z.string(),
  realPropertyAssetType: z.string(),
});

export const LeasedPropertySchema = z.object({
  locationCode: z.string(),
  realPropertyAssetName: z.string(),
  installationName: z.string(),
  federalLeasedCode: z.string(),
  gsaRegion: z.string(),
  streetAddress: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  buildingRentableSquareFeet: z.number(),
  availableSquareFeet: z.number(),
  congressionalDistrict: z.string(),
  congressionalDistrictRepresentative: z.string(),
  leaseNumber: z.string(),
  leaseEffectiveDate: z.string(),
  leaseExpirationDate: z.string(),
  realPropertyAssetType: z.string(),
});

export const PropertyForTableSchema = z.object({
  realPropertyAssetName: z.string(),
  streetAddress: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  constructionDate: z.string().optional(),
  ownedOrLeased: z.enum(['F', 'L']),
});

export const MapMarkerSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  squareFootage: z.number(),
  assetType: z.string(),
  ownedOrLeased: z.enum(['F', 'L']),
  lat: z.number(),
  lng: z.number(),
});

// Validation functions
export function validateOwnedProperty(data: unknown) {
  return OwnedPropertySchema.safeParse(data);
}

export function validateLeasedProperty(data: unknown) {
  return LeasedPropertySchema.safeParse(data);
}

export function validatePropertyForTable(data: unknown) {
  return PropertyForTableSchema.safeParse(data);
}

export function validateMapMarker(data: unknown) {
  return MapMarkerSchema.safeParse(data);
} 